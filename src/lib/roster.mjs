export function foldText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(value) {
  const slug = foldText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'guest';
}

export function normalizeGuests(rows) {
  const seenNames = new Set();
  const usedIds = new Map();
  const guests = [];
  let droppedDuplicates = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    const name = String(row?.name ?? '').trim();
    if (!name) continue;
    const nameKey = foldText(name);
    if (seenNames.has(nameKey)) {
      droppedDuplicates += 1;
      continue;
    }
    seenNames.add(nameKey);

    const requestedId = String(row?.id ?? '').trim();
    const baseId = slugify(requestedId || name);
    const count = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    guests.push({
      id,
      name,
      table: String(row?.table ?? '').trim(),
      searchText: foldText(`${name} ${row?.table ?? ''}`),
    });
  }

  return { guests, droppedDuplicates };
}

export function buildSearchIndex(guests) {
  return guests.map((guest) => ({
    ...guest,
    searchText: guest.searchText || foldText(`${guest.name} ${guest.table}`),
  }));
}

export function filterGuests(guests, query) {
  const term = foldText(query);
  if (!term) return guests;
  return guests.filter((guest) => guest.searchText.includes(term));
}

export function findGuestById(guests, id) {
  return guests.find((guest) => guest.id === id) || null;
}
