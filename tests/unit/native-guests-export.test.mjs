import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  extractDefaultGuests,
  serializeNativeGuests,
  writeNativeGuests,
} from '../../scripts/export-native-guests.mjs';

const SOURCE_PATH = fileURLToPath(new URL('../../data/guests.default.js', import.meta.url));
const COMMITTED_PATH = fileURLToPath(
  new URL('../../native/CheckIn007/Resources/default-guests.json', import.meta.url),
);

test('extractDefaultGuests reads the 40 web default rows as { name, table }', () => {
  const rows = extractDefaultGuests(readFileSync(SOURCE_PATH, 'utf8'));
  assert.equal(rows.length, 40);
  for (const row of rows) {
    assert.equal(typeof row.name, 'string');
    assert.equal(typeof row.table, 'string');
    // Real web rows carry no id; it is generated downstream by normalizeGuests.
    assert.ok(!('id' in row));
  }
});

test('committed native JSON is byte-identical to a fresh regeneration', () => {
  const committed = readFileSync(COMMITTED_PATH, 'utf8');
  const regenerated = serializeNativeGuests(
    extractDefaultGuests(readFileSync(SOURCE_PATH, 'utf8')),
  );
  assert.equal(
    regenerated,
    committed,
    'native/CheckIn007/Resources/default-guests.json is stale — run `node scripts/export-native-guests.mjs`.',
  );
});

test('generated roster has exactly 40 guests with web-parity id/searchText', () => {
  const guests = JSON.parse(readFileSync(COMMITTED_PATH, 'utf8'));
  assert.equal(guests.length, 40);
  const first = guests[0];
  assert.equal(first.id, 'ava-sterling');
  assert.equal(first.name, 'Ava Sterling');
  assert.equal(first.searchText, 'ava sterling table 1 - casino royale');
  for (const guest of guests) {
    assert.deepEqual(Object.keys(guest), ['id', 'name', 'table', 'searchText']);
  }
});

test('writeNativeGuests round-trips to a temp path and reports count 40', (t) => {
  const outputPath = fileURLToPath(new URL('./native-guests-export.tmp.json', import.meta.url));
  t.after(() => {
    try {
      readFileSync(outputPath); // exists → remove
      import('node:fs').then(({ unlinkSync }) => unlinkSync(outputPath));
    } catch {
      /* nothing written */
    }
  });
  const result = writeNativeGuests({ sourcePath: SOURCE_PATH, outputPath });
  assert.equal(result.count, 40);
  assert.equal(result.content, readFileSync(COMMITTED_PATH, 'utf8'));
});

test('extractDefaultGuests throws on a source with no array assignment', () => {
  assert.throws(() => extractDefaultGuests('const x = 1;'), /array assignment/);
});
