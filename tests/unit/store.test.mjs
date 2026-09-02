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

test('previews log merges without persisting', () => {
  const store = createStore(memoryStorage(), []);
  const row = {
    visitId: 'visit-1',
    guestId: 'ava',
    name: 'Ava',
    table: 'One',
    timestamp: '2026-09-02T09:00:00-04:00',
  };
  const preview = store.previewLogMerge([row]);
  assert.equal(preview.summary.acceptedCount, 1);
  assert.equal(store.loadLog().length, 0);
});

test('persists accepted merge rows and remains idempotent', () => {
  const store = createStore(memoryStorage(), []);
  const row = {
    visitId: 'visit-1',
    guestId: 'ava',
    name: 'Ava',
    table: 'One',
    timestamp: '2026-09-02T09:00:00-04:00',
  };
  assert.equal(store.mergeLogEntries([row]).summary.acceptedCount, 1);
  assert.equal(store.mergeLogEntries([row]).summary.duplicateCount, 1);
  assert.equal(store.loadLog().length, 1);
});

test('volatile storage fallback still merges entries', () => {
  const store = createStore(memoryStorage(true), []);
  store.mergeLogEntries([
    {
      visitId: 'visit-1',
      guestId: 'ava',
      name: 'Ava',
      table: 'One',
      timestamp: '2026-09-02T09:00:00-04:00',
    },
  ]);
  assert.equal(store.isVolatile(), true);
  assert.equal(store.loadLog().length, 1);
});

test('merged log CSV keeps the existing export column order', () => {
  const store = createStore(memoryStorage(), []);
  store.mergeLogEntries([
    {
      visitId: 'visit-1',
      guestId: 'ava',
      name: 'Ava',
      table: 'One',
      timestamp: '2026-09-02T09:00:00-04:00',
    },
  ]);
  assert.equal(
    store.exportLogCsv(),
    'visitId,guestId,name,table,timestamp\nvisit-1,ava,Ava,One,2026-09-02T09:00:00-04:00',
  );
});

test('audio settings default off and malformed settings normalize off', () => {
  const storage = memoryStorage();
  const store = createStore(storage, []);
  assert.deepEqual(store.loadAudioSettings(), { scanBlipEnabled: false });
  storage.setItem('checkin007.audio.v1', '{not-json');
  assert.deepEqual(store.loadAudioSettings(), { scanBlipEnabled: false });
  storage.setItem('checkin007.audio.v1', JSON.stringify({ scanBlipEnabled: 'yes' }));
  assert.deepEqual(store.loadAudioSettings(), { scanBlipEnabled: false });
});

test('audio settings round-trip under the versioned key', () => {
  const storage = memoryStorage();
  const store = createStore(storage, []);
  assert.deepEqual(store.saveAudioSettings({ scanBlipEnabled: true }), {
    scanBlipEnabled: true,
  });
  assert.equal(storage.getItem('checkin007.audio.v1'), '{"scanBlipEnabled":true}');
  assert.deepEqual(store.loadAudioSettings(), { scanBlipEnabled: true });
  assert.deepEqual(store.saveAudioSettings({ scanBlipEnabled: false }), {
    scanBlipEnabled: false,
  });
  assert.deepEqual(store.loadAudioSettings(), { scanBlipEnabled: false });
});

test('volatile fallback can read saved audio settings during the session', () => {
  const store = createStore(memoryStorage(true), []);
  assert.deepEqual(store.saveAudioSettings({ scanBlipEnabled: true }), {
    scanBlipEnabled: true,
  });
  assert.equal(store.isVolatile(), true);
  assert.deepEqual(store.loadAudioSettings(), { scanBlipEnabled: true });
});
