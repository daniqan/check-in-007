import test from 'node:test';
import assert from 'node:assert/strict';
import { displayTable, formatLocalIso, truncateDisplay } from '../../src/lib/format.mjs';

test('formats ISO-8601 with local offset', () => {
  const formatted = formatLocalIso(new Date(2026, 8, 2, 20, 14, 33));
  assert.match(formatted, /^2026-09-02T20:14:33[+-]\d\d:\d\d$/);
});

test('formats fallback table and truncation', () => {
  assert.equal(displayTable(''), 'PROCEED TO THE CHECK-IN DESK');
  assert.equal(truncateDisplay('abcdef', 4), 'abc...');
});
