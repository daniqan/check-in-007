import { parseCsv } from './csv.mjs';

export const LOG_COLUMNS = ['visitId', 'guestId', 'name', 'table', 'timestamp'];

function clean(value) {
  return String(value ?? '').trim();
}

function rowError(context, message) {
  return {
    sourceName: context.sourceName || 'log',
    rowNumber: context.rowNumber ?? 0,
    message,
  };
}

export function normalizeLogEntry(raw, context = {}) {
  const entry = {
    visitId: clean(raw?.visitId),
    guestId: clean(raw?.guestId),
    name: clean(raw?.name),
    table: clean(raw?.table),
    timestamp: clean(raw?.timestamp),
  };

  if (!entry.guestId) return { entry: null, error: rowError(context, 'Missing guestId.') };
  if (!entry.name) return { entry: null, error: rowError(context, 'Missing name.') };
  if (!entry.timestamp) return { entry: null, error: rowError(context, 'Missing timestamp.') };

  const sortTime = Date.parse(entry.timestamp);
  if (!Number.isFinite(sortTime)) {
    return { entry: null, error: rowError(context, 'Invalid timestamp.') };
  }

  return { entry, sortTime, error: null };
}

export function parseLogJson(text, sourceName = 'log.json') {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${sourceName}: Invalid JSON (${error.message}).`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${sourceName}: JSON log export must be an array.`);

  const entries = [];
  const invalidRows = [];
  parsed.forEach((row, index) => {
    const normalized = normalizeLogEntry(row, { sourceName, rowNumber: index + 1 });
    if (normalized.error) invalidRows.push(normalized.error);
    else entries.push(normalized.entry);
  });
  return { entries, invalidRows, errors: [] };
}

export function parseLogCsv(text, sourceName = 'log.csv') {
  let rows;
  try {
    rows = parseCsv(text);
  } catch (error) {
    return { entries: [], invalidRows: [], errors: [`${sourceName}: ${error.message}`] };
  }

  const headers = rows[0]?.map((cell) => clean(cell));
  if (!headers?.length) {
    return { entries: [], invalidRows: [], errors: [`${sourceName}: CSV is empty.`] };
  }
  const missing = LOG_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) {
    return {
      entries: [],
      invalidRows: [],
      errors: [`${sourceName}: CSV is missing required columns: ${missing.join(', ')}.`],
    };
  }

  const indexes = Object.fromEntries(
    LOG_COLUMNS.map((column) => [column, headers.indexOf(column)]),
  );
  const entries = [];
  const invalidRows = [];
  rows.slice(1).forEach((cells, index) => {
    const raw = Object.fromEntries(LOG_COLUMNS.map((column) => [column, cells[indexes[column]]]));
    const normalized = normalizeLogEntry(raw, { sourceName, rowNumber: index + 2 });
    if (normalized.error) invalidRows.push(normalized.error);
    else entries.push(normalized.entry);
  });
  return { entries, invalidRows, errors: [] };
}

export function parseLogFile(sourceName, text) {
  const lower = clean(sourceName).toLowerCase();
  try {
    if (lower.endsWith('.json')) return parseLogJson(text, sourceName);
    if (lower.endsWith('.csv')) return parseLogCsv(text, sourceName);
    if (clean(text).startsWith('[') || clean(text).startsWith('{')) {
      return parseLogJson(text, sourceName);
    }
    return parseLogCsv(text, sourceName);
  } catch (error) {
    return { entries: [], invalidRows: [], errors: [error.message] };
  }
}

function dedupeKey(entry) {
  return entry.visitId ? `visit:${entry.visitId}` : `fallback:${entry.guestId}|${entry.timestamp}`;
}

function compareDecoratedEntries(left, right) {
  if (left.sortTime !== right.sortTime) return left.sortTime - right.sortTime;
  return (
    left.entry.guestId.localeCompare(right.entry.guestId) ||
    left.entry.name.toLowerCase().localeCompare(right.entry.name.toLowerCase()) ||
    left.entry.table.localeCompare(right.entry.table) ||
    left.entry.visitId.localeCompare(right.entry.visitId)
  );
}

export function mergeLogEntries(existingEntries, importedEntries) {
  const existing = Array.isArray(existingEntries) ? existingEntries : [];
  const imported = Array.isArray(importedEntries) ? importedEntries : [];
  const seen = new Set();
  const entries = [];
  const summary = {
    currentCount: existing.length,
    importedCount: imported.length,
    acceptedCount: 0,
    duplicateCount: 0,
    invalidImportedCount: 0,
    invalidExistingCount: 0,
  };

  existing.forEach((row, index) => {
    const normalized = normalizeLogEntry(row, {
      sourceName: 'local storage',
      rowNumber: index + 1,
    });
    if (normalized.error) {
      summary.invalidExistingCount += 1;
      return;
    }
    const key = dedupeKey(normalized.entry);
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ entry: normalized.entry, sortTime: normalized.sortTime });
  });

  imported.forEach((row, index) => {
    const normalized = normalizeLogEntry(row, { sourceName: 'import', rowNumber: index + 1 });
    if (normalized.error) {
      summary.invalidImportedCount += 1;
      return;
    }
    const key = dedupeKey(normalized.entry);
    if (seen.has(key)) {
      summary.duplicateCount += 1;
      return;
    }
    seen.add(key);
    summary.acceptedCount += 1;
    entries.push({ entry: normalized.entry, sortTime: normalized.sortTime });
  });

  entries.sort(compareDecoratedEntries);
  return { entries: entries.map((item) => item.entry), summary };
}
