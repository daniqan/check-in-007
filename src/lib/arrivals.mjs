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

  // most recent arrival first
  arrived.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  pending.sort((a, b) => a.name.localeCompare(b.name));

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
