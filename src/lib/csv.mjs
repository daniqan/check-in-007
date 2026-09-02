import { normalizeGuests } from './roster.mjs';

export function parseCsv(input) {
  const source = String(input ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (quoted) throw new Error('CSV has an unterminated quoted field.');
  row.push(field);
  rows.push(row);

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

export function parseGuestCsv(input) {
  const rows = parseCsv(input);
  if (rows.length === 0) throw new Error('CSV is empty.');

  const headers = rows[0].map((cell) => cell.trim().toLowerCase());
  const nameIndex = headers.indexOf('name');
  const tableIndex = headers.indexOf('table');
  const idIndex = headers.indexOf('id');

  if (nameIndex === -1) throw new Error('CSV must include a name column.');
  if (tableIndex === -1) throw new Error('CSV must include a table column.');

  const rawGuests = rows.slice(1).map((cells) => ({
    id: idIndex === -1 ? '' : cells[idIndex],
    name: cells[nameIndex],
    table: cells[tableIndex],
  }));
  const normalized = normalizeGuests(rawGuests);

  return {
    ...normalized,
    importedRows: rawGuests.length,
  };
}

export function toCsv(rows, columns) {
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(',')),
  ].join('\n');
}
