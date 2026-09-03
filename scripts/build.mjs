import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import * as acorn from 'acorn';

const root = new URL('..', import.meta.url).pathname;
const modules = [
  'src/config.mjs',
  'src/lib/audio.mjs',
  'src/lib/format.mjs',
  'src/lib/roster.mjs',
  'src/lib/virtual-list.mjs',
  'src/lib/csv.mjs',
  'src/lib/log-merge.mjs',
  'src/lib/store.mjs',
  'src/screens/loading.mjs',
  'src/screens/roster.mjs',
  'src/screens/scan.mjs',
  'src/screens/result.mjs',
  'src/screens/admin.mjs',
  'src/app.mjs',
];

function namespaceFor(file) {
  return file.replace(/\.mjs$/, '').replace(/[^a-z0-9]/gi, '_');
}

function resolveImport(fromFile, specifier) {
  const resolved = join(dirname(fromFile), specifier);
  return resolved.endsWith('.mjs') ? resolved : `${resolved}.mjs`;
}

function collectModuleSyntax(ast) {
  const found = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (
      [
        'ImportDeclaration',
        'ImportExpression',
        'ExportNamedDeclaration',
        'ExportDefaultDeclaration',
        'ExportAllDeclaration',
      ].includes(node.type)
    ) {
      found.push(node.type);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast);
  return found;
}

export function transformModule(file, source) {
  const ast = acorn.parse(source, { ecmaVersion: 2020, sourceType: 'module' });
  const removals = [];
  const replacements = [];
  const imports = [];
  const exports = new Map();

  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      if (node.specifiers.length === 0)
        throw new Error(`${file}: side-effect imports are unsupported`);
      for (const specifier of node.specifiers) {
        if (specifier.type !== 'ImportSpecifier') {
          throw new Error(`${file}: only named imports are supported`);
        }
        imports.push({
          local: specifier.local.name,
          imported: specifier.imported.name,
          from: namespaceFor(resolveImport(file, node.source.value)),
        });
      }
      removals.push([node.start, node.end]);
      continue;
    }
    if (node.type === 'ExportAllDeclaration' || node.type === 'ExportDefaultDeclaration') {
      throw new Error(`${file}: default and re-export syntax is unsupported`);
    }
    if (node.type === 'ExportNamedDeclaration') {
      if (node.source) throw new Error(`${file}: re-exports are unsupported`);
      if (node.declaration) {
        const declaration = node.declaration;
        replacements.push([node.start, declaration.start, '']);
        if (declaration.id?.name) exports.set(declaration.id.name, declaration.id.name);
        if (declaration.declarations) {
          for (const item of declaration.declarations) exports.set(item.id.name, item.id.name);
        }
      } else {
        removals.push([node.start, node.end]);
        for (const specifier of node.specifiers) {
          exports.set(specifier.exported.name, specifier.local.name);
        }
      }
    }
  }

  const edits = [...removals.map(([start, end]) => [start, end, '']), ...replacements].sort(
    (a, b) => b[0] - a[0],
  );
  let body = source;
  for (const [start, end, text] of edits) body = `${body.slice(0, start)}${text}${body.slice(end)}`;

  const aliases = imports
    .map(
      (item) => `const ${item.local} = window.__CHECKIN007.modules.${item.from}.${item.imported};`,
    )
    .join('\n');
  const returned = [...exports.entries()]
    .map(([exported, local]) => (exported === local ? exported : `${exported}: ${local}`))
    .join(', ');

  return `window.__CHECKIN007.modules.${namespaceFor(file)} = (() => {\n${aliases}\n${body}\nreturn { ${returned} };\n})();`;
}

export function artifactNameFor(html) {
  const sha256 = createHash('sha256').update(html).digest('hex');
  return { fileName: `check-in-007.${sha256.slice(0, 12)}.html`, sha256 };
}

const requiredManifestMembers = [
  'id',
  'name',
  'short_name',
  'start_url',
  'scope',
  'display',
  'theme_color',
  'background_color',
  'icons',
];

function assertSafeIconSrc(src) {
  if (
    typeof src !== 'string' ||
    src.length === 0 ||
    src.startsWith('/') ||
    /^[a-z][a-z0-9+.-]*:/i.test(src) ||
    src.includes('..') ||
    src.includes('\\')
  ) {
    throw new Error(`Manifest icon src must be a relative asset path: ${src}`);
  }
}

export function createWebAppManifest({
  sourceManifest,
  artifact,
  distIconBase = './assets/icons/',
}) {
  for (const member of requiredManifestMembers) {
    if (!sourceManifest[member]) throw new Error(`manifest.webmanifest missing ${member}`);
  }
  if (!Array.isArray(sourceManifest.icons) || sourceManifest.icons.length === 0) {
    throw new Error('manifest.webmanifest icons must be a non-empty array');
  }
  if (!/^check-in-007\.[a-f0-9]{12}\.html$/.test(artifact)) {
    throw new Error(`Invalid build artifact for web app manifest: ${artifact}`);
  }
  const icons = sourceManifest.icons.map((icon) => {
    for (const member of ['src', 'sizes', 'type']) {
      if (!icon[member]) throw new Error(`manifest.webmanifest icon missing ${member}`);
    }
    assertSafeIconSrc(icon.src);
    return { ...icon, src: `${distIconBase}${basename(icon.src)}` };
  });
  return {
    ...sourceManifest,
    start_url: `./${artifact}`,
    icons,
  };
}

export async function writeWebAppManifestArtifacts({
  sourceManifestPath,
  dist,
  artifact,
  root: sourceRoot = root,
}) {
  const sourceManifest = JSON.parse(await readFile(sourceManifestPath, 'utf8'));
  const manifest = createWebAppManifest({ sourceManifest, artifact });
  await mkdir(join(dist, 'assets/icons'), { recursive: true });
  for (const icon of sourceManifest.icons) {
    assertSafeIconSrc(icon.src);
    const sourceIcon = join(sourceRoot, icon.src.replace(/^\.\//, ''));
    await copyFile(sourceIcon, join(dist, 'assets/icons', basename(icon.src)));
  }
  await writeFile(join(dist, 'check-in-007.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function writeBuildArtifacts({ html, gzipSize, root: outputRoot = root }) {
  const byteSize = Buffer.byteLength(html);
  const { fileName, sha256 } = artifactNameFor(html);
  const manifest = {
    artifact: fileName,
    sha256,
    gzipSize,
    byteSize,
  };
  const dist = join(outputRoot, 'dist');
  await mkdir(dist, { recursive: true });
  await writeFile(join(dist, 'index.html'), html);
  await writeFile(join(dist, fileName), html);
  await writeFile(
    join(dist, 'check-in-007.manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeWebAppManifestArtifacts({
    sourceManifestPath: join(outputRoot, 'manifest.webmanifest'),
    dist,
    artifact: fileName,
    root: outputRoot,
  });
  return { html, gzipSize, byteSize, artifact: fileName, sha256 };
}

export async function build() {
  const chunks = ['window.__CHECKIN007 = { modules: {} };'];
  for (const file of modules) {
    const source = await readFile(join(root, file), 'utf8');
    chunks.push(transformModule(file, source));
  }
  chunks.push(`window.CheckIn007 = window.__CHECKIN007.modules.${namespaceFor('src/app.mjs')};`);
  const appBundle = chunks.join('\n');
  const residual = collectModuleSyntax(
    acorn.parse(appBundle, { ecmaVersion: 2020, sourceType: 'script' }),
  );
  if (residual.length) throw new Error(`Residual module syntax: ${residual.join(', ')}`);
  if (appBundle.split('\n').some((line) => line.trim().startsWith('//# sourceMappingURL='))) {
    throw new Error('Sourcemap comments are not allowed in the artifact');
  }

  let css = await readFile(join(root, 'src/styles.css'), 'utf8');
  const fontUrls = [...css.matchAll(/url\('?(\.\.\/assets\/fonts\/[^)'"]+)'?\)/g)];
  for (const match of fontUrls) {
    const fontPath = match[1].replace('../', '');
    const font = await readFile(join(root, fontPath));
    const mime = extname(fontPath) === '.woff2' ? 'font/woff2' : 'application/octet-stream';
    css = css.replace(match[0], `url('data:${mime};base64,${font.toString('base64')}')`);
  }
  const data = await readFile(join(root, 'data/guests.default.js'), 'utf8');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black"><meta name="theme-color" content="#050505"><link rel="manifest" href="./check-in-007.webmanifest"><title>Check-In 007</title><style>${css}</style></head><body><div id="app" aria-live="off"></div><script>${data}\n${appBundle}\nwindow.CheckIn007.start(document.getElementById('app'));</script></body></html>`;
  const gzipSize = gzipSync(html).byteLength;
  if (gzipSize > 750 * 1024 || Buffer.byteLength(html) > 1.2 * 1024 * 1024) {
    throw new Error(
      `Artifact exceeds budget: ${Buffer.byteLength(html)} bytes, ${gzipSize} gzip bytes`,
    );
  }
  return writeBuildArtifacts({ html, gzipSize, root });
}

if (process.argv[1] && relative(process.cwd(), process.argv[1]).endsWith('scripts/build.mjs')) {
  build().then(({ artifact, gzipSize }) =>
    console.log(`Built dist/index.html and dist/${artifact} (${gzipSize} gzip bytes)`),
  );
}
