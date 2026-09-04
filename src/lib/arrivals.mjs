/* Pure arrivals maths — no DOM, no storage. Everything the dashboard shows is
   derived from (roster, log) so it stays correct after an undo or a re-import. */

export function normalizeTableLabel(table) {
  const text = String(table ?? '').trim();
  return text || 'Unassigned';
}

/* "Table 3 - GoldenEye" → 3, for numeric ordering; non-numbered tables sort last. */
export function tableSortKey(label) {
  const match = String(label).match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

/* Sort key for the not-yet-arrived list: surname first, then given name.
   Takes the last whitespace-separated token, ignoring trailing suffixes so
   "Iris Calder Jr." files under Calder rather than Jr. */
const NAME_SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v', 'md', 'phd']);

export function surnameKey(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  let index = parts.length - 1;
  while (index > 0 && NAME_SUFFIXES.has(parts[index].toLowerCase())) index -= 1;
  const surname = parts[index];
  const rest = parts.slice(0, index).join(' ');
  return `${surname} ${rest}`.trim().toLowerCase();
}

/* Compact label for narrow panes: "Table 10 - Live and Let Die" -> "Table 10".
   The pending list shows this so the guest's NAME always fits in full — the
   full string was taking the row's auto column and truncating names. */
export function shortTableLabel(table) {
  const text = String(table ?? '').trim();
  if (!text) return '—';
  const match = text.match(/\d+/);
  return match ? `Table ${match[0]}` : text;
}

export function computeArrivals(guests = [], log = []) {
  const arrivedByGuestId = new Map();
  for (const entry of log) {
    if (!entry || !entry.guestId) continue;
    const existing = arrivedByGuestId.get(entry.guestId);
    // keep the earliest check-in per guest
    if (!existing || String(entry.timestamp) < String(existing.timestamp)) {
      arrivedByGuestId.set(entry.guestId, entry);
    }
  }

  const arrived = [];
  const pending = [];
  const tables = new Map();

  for (const guest of guests) {
    const label = normalizeTableLabel(guest.table);
    if (!tables.has(label)) {
      tables.set(label, { label, total: 0, arrived: 0, pending: [] });
    }
    const table = tables.get(label);
    table.total += 1;

    const entry = arrivedByGuestId.get(guest.id);
    if (entry) {
      table.arrived += 1;
      arrived.push({ ...guest, visitId: entry.visitId, timestamp: entry.timestamp });
    } else {
      table.pending.push(guest);
      pending.push(guest);
    }
  }

  const tableList = [...tables.values()].sort(
    (a, b) => tableSortKey(a.label) - tableSortKey(b.label) || a.label.localeCompare(b.label),
  );

  // most recent arrival first; still-out list alphabetical by last name
  arrived.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  pending.sort((a, b) => surnameKey(a.name).localeCompare(surnameKey(b.name)));

  const total = guests.length;
  const arrivedCount = arrived.length;

  return {
    total,
    arrivedCount,
    pendingCount: total - arrivedCount,
    percent: total === 0 ? 0 : Math.round((arrivedCount / total) * 100),
    arrived,
    pending,
    tables: tableList,
  };
}
