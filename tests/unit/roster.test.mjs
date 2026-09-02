import test from 'node:test';
import assert from 'node:assert/strict';
import { filterGuests, normalizeGuests, slugify } from '../../src/lib/roster.mjs';

test('slugifies accents and punctuation', () => {
  assert.equal(slugify(' Renée Aubénas! '), 'renee-aubenas');
});

test('dedupes names and suffixes colliding ids', () => {
  const { guests, droppedDuplicates } = normalizeGuests([
    { id: 'agent', name: 'Ava', table: 'One' },
    { id: 'agent', name: 'Bea', table: 'Two' },
    { name: ' ava ', table: 'Three' },
  ]);
  assert.deepEqual(
    guests.map((guest) => guest.id),
    ['agent', 'agent-2'],
  );
  assert.equal(droppedDuplicates, 1);
});

test('search is case and diacritic insensitive', () => {
  const { guests } = normalizeGuests([{ name: 'Renée Aubénas', table: 'Casino' }]);
  assert.equal(filterGuests(guests, 'renee').length, 1);
  assert.equal(filterGuests(guests, 'casino').length, 1);
});
