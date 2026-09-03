import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  build,
  transformModule,
  artifactNameFor,
  createWebAppManifest,
} from '../../scripts/build.mjs';

function pngSize(buffer) {
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG');
  assert.equal(buffer.toString('ascii', 12, 16), 'IHDR');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('transforms named imports and exports into namespaces', () => {
  const output = transformModule(
    'src/demo.mjs',
    "import { thing as localThing } from './lib/thing.mjs';\nexport const value = localThing;\nexport { value as renamed };",
  );
  assert.match(output, /window\.__CHECKIN007\.modules\.src_demo/);
  assert.match(output, /const localThing = window\.__CHECKIN007\.modules\.src_lib_thing\.thing;/);
  assert.match(output, /return \{ value, renamed: value \}/);
});

test('rejects unsupported module syntax', () => {
  assert.throws(() => transformModule('x.mjs', "import thing from './thing.mjs';"), /only named/);
  assert.throws(
    () => transformModule('x.mjs', "export { thing } from './thing.mjs';"),
    /re-exports/,
  );
});

test('allows import and export words in strings and comments', () => {
  const output = transformModule(
    'src/words.mjs',
    "const text = 'import export';\n// export import\nexport function read() { return text; }",
  );
  assert.match(output, /import export/);
});

test('build emits a self-contained classic artifact', async () => {
  const result = await build();
  const html = await readFile(new URL('../../dist/index.html', import.meta.url), 'utf8');
  const manifest = JSON.parse(
    await readFile(new URL('../../dist/check-in-007.manifest.json', import.meta.url), 'utf8'),
  );
  const hashedHtml = await readFile(
    new URL(`../../dist/${manifest.artifact}`, import.meta.url),
    'utf8',
  );
  const webManifest = JSON.parse(
    await readFile(new URL('../../dist/check-in-007.webmanifest', import.meta.url), 'utf8'),
  );
  assert.equal(hashedHtml, html);
  assert.equal(result.artifact, manifest.artifact);
  assert.equal(manifest.sha256, createHash('sha256').update(html).digest('hex'));
  assert.equal(manifest.artifact, `check-in-007.${manifest.sha256.slice(0, 12)}.html`);
  assert.deepEqual(Object.keys(manifest), ['artifact', 'sha256', 'gzipSize', 'byteSize']);
  assert.equal(manifest.byteSize, Buffer.byteLength(html));
  assert.equal(manifest.gzipSize, result.gzipSize);
  assert.equal(webManifest.start_url, `./${manifest.artifact}`);
  assert.equal(webManifest.display, 'standalone');
  assert.equal(webManifest.id, './');
  assert.equal(webManifest.scope, './');
  assert.equal(
    (html.match(/<link rel="manifest" href=".\/check-in-007\.webmanifest">/g) || []).length,
    1,
  );
  assert.doesNotMatch(html, /manifest\.webmanifest/);
  for (const icon of webManifest.icons) {
    assert.match(
      icon.src,
      /^\.\/assets\/icons\/check-in-007-icon-(192|512)\.png$|^\.\/assets\/icons\/check-in-007-icon\.svg$/,
    );
    await readFile(new URL(`../../dist/${icon.src.replace(/^\.\//, '')}`, import.meta.url));
  }
  for (const size of [192, 512]) {
    const icon = await readFile(
      new URL(`../../dist/assets/icons/check-in-007-icon-${size}.png`, import.meta.url),
    );
    assert.deepEqual(pngSize(icon), { width: size, height: size });
  }
  assert.match(html, /window\.CHECKIN007_DEFAULT_GUESTS/);
  assert.match(html, /window\.CheckIn007\.start/);
  assert.equal((html.match(/<script/g) || []).length, 1);
  assert.doesNotMatch(html, /<script[^>]+type="module"/);
  assert.doesNotMatch(html, /\bimport\s*\{/);
  assert.doesNotMatch(html, /\bexport\s+(function|const|let|var|class|\{)/);

  const csvIndex = html.indexOf('window.__CHECKIN007.modules.src_lib_csv');
  const mergeIndex = html.indexOf('window.__CHECKIN007.modules.src_lib_log_merge');
  const storeIndex = html.indexOf('window.__CHECKIN007.modules.src_lib_store');
  const configIndex = html.indexOf('window.__CHECKIN007.modules.src_config');
  const audioIndex = html.indexOf('window.__CHECKIN007.modules.src_lib_audio');
  const appIndex = html.indexOf('window.__CHECKIN007.modules.src_app');
  assert.ok(configIndex !== -1);
  assert.ok(audioIndex > configIndex);
  assert.ok(appIndex > audioIndex);
  assert.ok(csvIndex !== -1);
  assert.ok(mergeIndex > csvIndex);
  assert.ok(storeIndex > mergeIndex);
  assert.match(
    html.slice(audioIndex, appIndex),
    /const AUDIO = window\.__CHECKIN007\.modules\.src_config\.AUDIO;/,
  );
  assert.match(
    html.slice(appIndex),
    /const createScanAudioController = window\.__CHECKIN007\.modules\.src_lib_audio\.createScanAudioController;/,
  );
  assert.match(
    html.slice(mergeIndex, storeIndex),
    /const parseCsv = window\.__CHECKIN007\.modules\.src_lib_csv\.parseCsv;/,
  );
});

test('artifact names are deterministic content hashes', () => {
  const first = artifactNameFor('<html>same</html>');
  const second = artifactNameFor('<html>same</html>');
  const changed = artifactNameFor('<html>changed</html>');
  assert.deepEqual(first, second);
  assert.match(first.fileName, /^check-in-007\.[a-f0-9]{12}\.html$/);
  assert.notEqual(first.fileName, changed.fileName);
});

test('web app manifest transform validates required fields and rewrites dist paths', () => {
  const sourceManifest = {
    id: './',
    name: 'Check-In 007',
    short_name: 'Check-In 007',
    start_url: './index.html',
    scope: './',
    display: 'standalone',
    theme_color: '#050505',
    background_color: '#050505',
    icons: [
      {
        src: './assets/icons/check-in-007-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
  const manifest = createWebAppManifest({
    sourceManifest,
    artifact: 'check-in-007.0123456789ab.html',
  });
  assert.equal(manifest.start_url, './check-in-007.0123456789ab.html');
  assert.equal(manifest.icons[0].src, './assets/icons/check-in-007-icon-192.png');
  assert.throws(
    () =>
      createWebAppManifest({
        sourceManifest: { ...sourceManifest, display: undefined },
        artifact: 'check-in-007.0123456789ab.html',
      }),
    /missing display/,
  );
  assert.throws(
    () =>
      createWebAppManifest({
        sourceManifest: { ...sourceManifest, icons: [] },
        artifact: 'check-in-007.0123456789ab.html',
      }),
    /non-empty array/,
  );
  assert.throws(
    () =>
      createWebAppManifest({
        sourceManifest: {
          ...sourceManifest,
          icons: [{ ...sourceManifest.icons[0], src: '../secret.png' }],
        },
        artifact: 'check-in-007.0123456789ab.html',
      }),
    /relative asset path/,
  );
});
