import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../src/lib/store.mjs';

function memoryStorage(throws = false) {
  const data = new Map();
  return {
    getItem(key) {
      if (throws) throw new Error('blocked');
      return data.get(key) || null;
    },
    setItem(key, value) {
      if (throws) throw new Error('blocked');
      data.set(key, value);
    },
    removeItem(key) {
      if (throws) throw new Error('blocked');
      data.delete(key);
    },
  };
}

test('loads defaults and persists roster override', () => {
  const store = createStore(memoryStorage(), [{ name: 'Ava', table: 'One' }]);
  assert.equal(store.loadRoster()[0].name, 'Ava');
  store.saveRosterOverride([{ name: 'Bea', table: 'Two' }]);
  assert.equal(store.loadRoster()[0].name, 'Bea');
});

test('appendCheckIn is idempotent by visit id', () => {
  const store = createStore(memoryStorage(), []);
  const guest = { id: 'ava', name: 'Ava', table: 'One' };
  store.appendCheckIn(guest, 'visit-1');
  store.appendCheckIn(guest, 'visit-1');
  store.appendCheckIn(guest, 'visit-2');
  assert.equal(store.loadLog().length, 2);
  assert.match(store.exportLogCsv(), /visitId,guestId,name,table,timestamp/);
  assert.equal(JSON.parse(store.exportLogJson()).length, 2);
});

test('falls back to memory when storage throws', () => {
  const store = createStore(memoryStorage(true), [{ name: 'Ava', table: 'One' }]);
  store.appendCheckIn({ id: 'ava', name: 'Ava', table: 'One' }, 'visit-1');
  assert.equal(store.isVolatile(), true);
  assert.equal(store.loadLog().length, 1);
});
