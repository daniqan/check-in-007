import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  mergeLogEntries,
  parseLogCsv,
  parseLogFile,
  parseLogJson,
} from '../../src/lib/log-merge.mjs';

const ada = {
  visitId: 'visit-local-1',
  guestId: 'alpha',
  name: 'Ada Lovelace',
  table: '7',
  timestamp: '2026-09-02T09:00:00-04:00',
};

test('parses app-exported JSON arrays', () => {
  const result = parseLogJson(JSON.stringify([ada]), 'log.json');
  assert.deepEqual(result.entries, [ada]);
  assert.deepEqual(result.invalidRows, []);
  assert.deepEqual(result.errors, []);
});

test('parses app-exported CSV with quoted commas and CRLF', () => {
  const csv =
    'visitId,guestId,name,table,timestamp\r\nvisit-2,bravo,"Grace, Hopper",12,2026-09-02T14:00:00+01:00\r\n';
  const result = parseLogCsv(csv, 'log.csv');
  assert.equal(result.entries[0].name, 'Grace, Hopper');
  assert.equal(result.entries[0].timestamp, '2026-09-02T14:00:00+01:00');
});

test('rejects CSV missing required columns', () => {
  const result = parseLogCsv('guestId,name,timestamp\na,Ada,2026-09-02T09:00:00-04:00\n');
  assert.deepEqual(result.entries, []);
  assert.match(result.errors[0], /missing required columns: visitId, table/);
});

test('converts an unterminated quoted CSV field into a file-level error', () => {
  const result = parseLogCsv('visitId,guestId,name,table,timestamp\nv,a,"Ada,7,2026\n');
  assert.deepEqual(result.entries, []);
  assert.match(result.errors[0], /unterminated quoted field/);
});

test('unknown extensions sniff JSON and report non-array JSON as a file-level error', () => {
  const result = parseLogFile('log.txt', '{"visitId":"v"}');
  assert.deepEqual(result.entries, []);
  assert.match(result.errors[0], /must be an array/);
});

test('skips rows missing required fields or valid timestamps', () => {
  const result = parseLogJson(
    JSON.stringify([
      { ...ada, guestId: '' },
      { ...ada, name: '' },
      { ...ada, timestamp: '' },
      { ...ada, timestamp: 'not-a-date' },
    ]),
  );
  assert.equal(result.entries.length, 0);
  assert.equal(result.invalidRows.length, 4);
});

test('dedupes by visitId before guest and timestamp', () => {
  const result = mergeLogEntries([ada], [{ ...ada, name: 'Edited Name' }]);
  assert.equal(result.entries.length, 1);
  assert.equal(result.summary.duplicateCount, 1);
  assert.equal(result.entries[0].name, 'Ada Lovelace');
});

test('dedupes blank-visit legacy rows by guestId and timestamp', () => {
  const row = { ...ada, visitId: '' };
  const result = mergeLogEntries([row], [{ ...row, table: '99' }]);
  assert.equal(result.entries.length, 1);
  assert.equal(result.summary.duplicateCount, 1);
});

test('sorts deterministically by numeric timestamp and tie-break fields', () => {
  const result = mergeLogEntries(
    [],
    [
      { ...ada, visitId: 'visit-c', guestId: 'charlie', name: 'Zulu' },
      { ...ada, visitId: 'visit-a', guestId: 'alpha', name: 'Ada' },
      { ...ada, visitId: 'visit-b', guestId: 'alpha', name: 'Ada', table: '8' },
    ],
  );
  assert.deepEqual(
    result.entries.map((entry) => entry.visitId),
    ['visit-a', 'visit-b', 'visit-c'],
  );
});

test('sorts mixed-offset timestamps by absolute instant and preserves strings', () => {
  const result = mergeLogEntries(
    [],
    [
      { ...ada, visitId: 'visit-3', guestId: 'charlie', timestamp: '2026-09-02T09:30:00-04:00' },
      { ...ada, visitId: 'visit-2', guestId: 'bravo', timestamp: '2026-09-02T14:00:00+01:00' },
    ],
  );
  assert.deepEqual(
    result.entries.map((entry) => entry.timestamp),
    ['2026-09-02T14:00:00+01:00', '2026-09-02T09:30:00-04:00'],
  );
});

test('returns repeatable summaries for repeated identical imports', () => {
  const imported = [
    { ...ada, visitId: 'visit-2' },
    { ...ada, visitId: 'visit-2' },
  ];
  assert.deepEqual(mergeLogEntries([], imported), mergeLogEntries([], imported));
});

test('merges 10,000 rows under the quadratic guard threshold', () => {
  const imported = Array.from({ length: 10_000 }, (_, index) => ({
    visitId: `visit-${index}`,
    guestId: `guest-${String(index).padStart(5, '0')}`,
    name: `Agent ${index}`,
    table: String(index % 100),
    timestamp: new Date(Date.UTC(2026, 8, 2, 12, 0, index)).toISOString(),
  }));
  const start = performance.now();
  const result = mergeLogEntries([], imported);
  const elapsed = performance.now() - start;
  assert.equal(result.entries.length, 10_000);
  assert.ok(elapsed < 250, `merge took ${elapsed} ms`);
});
