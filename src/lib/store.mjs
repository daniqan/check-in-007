import { formatLocalIso } from './format.mjs';
import { normalizeGuests } from './roster.mjs';
import { STORAGE } from '../config.mjs';
import { toCsv } from './csv.mjs';
import { mergeLogEntries as mergeLogEntrySets } from './log-merge.mjs';

export function createStore(
  storage = globalThis.localStorage,
  defaults = globalThis.CHECKIN007_DEFAULT_GUESTS,
) {
  let volatile = false;
  let memory = {
    [STORAGE.LOG_KEY]: '[]',
    [STORAGE.ROSTER_KEY]: '',
  };

  const read = (key) => {
    try {
      if (volatile || !storage) return memory[key] || '';
      return storage.getItem(key) || '';
    } catch {
      volatile = true;
      return memory[key] || '';
    }
  };

  const write = (key, value) => {
    memory[key] = value;
    try {
      if (volatile || !storage) return;
      storage.setItem(key, value);
    } catch {
      volatile = true;
    }
  };

  const remove = (key) => {
    memory[key] = '';
    try {
      if (!volatile && storage) storage.removeItem(key);
    } catch {
      volatile = true;
    }
  };

  function loadLog() {
    try {
      const parsed = JSON.parse(read(STORAGE.LOG_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveLog(entries) {
    write(STORAGE.LOG_KEY, JSON.stringify(entries));
  }

  function replaceLog(entries) {
    saveLog(entries);
  }

  function loadRoster() {
    const override = read(STORAGE.ROSTER_KEY);
    if (override) {
      try {
        const parsed = JSON.parse(override);
        return normalizeGuests(parsed).guests;
      } catch {
        remove(STORAGE.ROSTER_KEY);
      }
    }
    return normalizeGuests(defaults || []).guests;
  }

  return {
    isVolatile() {
      return volatile;
    },
    loadRoster,
    saveRosterOverride(guests) {
      write(STORAGE.ROSTER_KEY, JSON.stringify(guests));
      return loadRoster();
    },
    resetRoster() {
      remove(STORAGE.ROSTER_KEY);
      return loadRoster();
    },
    appendCheckIn(guest, visitId) {
      const entries = loadLog();
      if (entries.some((entry) => entry.visitId === visitId)) return entries;
      const entry = {
        visitId,
        guestId: guest.id,
        name: guest.name,
        table: guest.table || '',
        timestamp: formatLocalIso(),
      };
      entries.push(entry);
      saveLog(entries);
      return entries;
    },
    loadLog,
    previewLogMerge(importedEntries) {
      return mergeLogEntrySets(loadLog(), importedEntries);
    },
    mergeLogEntries(importedEntries) {
      const result = mergeLogEntrySets(loadLog(), importedEntries);
      replaceLog(result.entries);
      return result;
    },
    clearLog() {
      saveLog([]);
    },
    exportLogCsv() {
      return toCsv(loadLog(), ['visitId', 'guestId', 'name', 'table', 'timestamp']);
    },
    exportLogJson() {
      return JSON.stringify(loadLog(), null, 2);
    },
  };
}
