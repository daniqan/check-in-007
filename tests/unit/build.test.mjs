import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build, transformModule } from '../../scripts/build.mjs';

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
  await build();
  const html = await readFile(new URL('../../dist/index.html', import.meta.url), 'utf8');
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
