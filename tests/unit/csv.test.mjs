import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseGuestCsv, toCsv } from '../../src/lib/csv.mjs';

test('parses quoted CSV, CRLF, BOM, and blank lines', () => {
  assert.deepEqual(parseCsv('\uFEFFname,table\r\n"Renée, A.","Table ""7"""\r\n\r\n'), [
    ['name', 'table'],
    ['Renée, A.', 'Table "7"'],
  ]);
});

test('requires name and table columns', () => {
  assert.throws(() => parseGuestCsv('name\nAva'), /table column/);
  assert.throws(() => parseGuestCsv('table\nOne'), /name column/);
});

test('imports guests with duplicate reporting', () => {
  const result = parseGuestCsv('table,name\nOne,Ava\nTwo, ava ');
  assert.equal(result.guests.length, 1);
  assert.equal(result.droppedDuplicates, 1);
});

test('serializes CSV with escaping', () => {
  assert.equal(
    toCsv([{ name: 'Ava "Q"', table: 'One, Two' }], ['name', 'table']),
    'name,table\n"Ava ""Q""","One, Two"',
  );
});
