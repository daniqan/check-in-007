import { ADMIN, ROSTER } from '../config.mjs';
import { filterGuests } from '../lib/roster.mjs';

export function mountRoster(root, { guests, onSelect, onAdminHold, store }) {
  root.innerHTML = `
    <section class="screen roster-screen" aria-labelledby="roster-title">
      <header class="topbar">
        <button class="logo-hit" type="button" aria-label="Open admin controls">007</button>
        <div>
          <p>EVENT OPERATIONS</p>
          <h1 id="roster-title">AGENT ROSTER</h1>
        </div>
      </header>
      <label class="search-label" for="guest-search">Search guest roster</label>
      <input id="guest-search" class="search" type="search" autocomplete="off" placeholder="Search agents" />
      <p id="result-count" class="status" role="status" aria-live="polite"></p>
      <ul class="roster-list" aria-label="Ticketed guests"></ul>
      <p class="storage-note" role="status"></p>
    </section>
  `;

  const list = root.querySelector('.roster-list');
  const search = root.querySelector('.search');
  const count = root.querySelector('#result-count');
  const logo = root.querySelector('.logo-hit');
  const storageNote = root.querySelector('.storage-note');
  let debounce = 0;
  let navigating = false;
  let hold = 0;

  function render(items) {
    list.innerHTML = '';
    count.textContent = `${items.length} agent${items.length === 1 ? '' : 's'} visible`;
    if (store.isVolatile()) {
      storageNote.textContent = 'LOG NOT PERSISTED (private mode?)';
    }
    if (items.length === 0) {
      list.innerHTML = '<p class="empty">NO MATCHING AGENTS</p>';
      return;
    }
    for (const guest of items) {
      const item = document.createElement('li');
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'guest-row';
      row.dataset.guestId = guest.id;
      row.setAttribute('aria-label', `${guest.name}, ${guest.table || 'table pending'}`);
      row.innerHTML = `<span>${guest.name}</span><small>${guest.table || 'CHECK-IN DESK'}</small>`;
      item.append(row);
      list.append(item);
    }
  }

  const update = () => render(filterGuests(guests, search.value));
  const handleSearchInput = () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(update, ROSTER.SEARCH_DEBOUNCE_MS);
  };
  const handleListClick = (event) => {
    const row = event.target.closest('.guest-row');
    if (!row || !list.contains(row) || navigating) return;
    navigating = true;
    onSelect(row.dataset.guestId);
  };
  search.addEventListener('input', handleSearchInput);
  list.addEventListener('click', handleListClick);

  const startHold = () => {
    window.clearTimeout(hold);
    hold = window.setTimeout(onAdminHold, ADMIN.HOLD_MS);
  };
  const cancelHold = () => window.clearTimeout(hold);
  const preventLogoClick = (event) => event.preventDefault();
  logo.addEventListener('pointerdown', startHold);
  logo.addEventListener('pointerup', cancelHold);
  logo.addEventListener('pointercancel', cancelHold);
  logo.addEventListener('click', preventLogoClick);

  render(guests);
  search.focus({ preventScroll: true });

  return () => {
    window.clearTimeout(debounce);
    window.clearTimeout(hold);
    search.removeEventListener('input', handleSearchInput);
    list.removeEventListener('click', handleListClick);
    logo.removeEventListener('pointerdown', startHold);
    logo.removeEventListener('pointerup', cancelHold);
    logo.removeEventListener('pointercancel', cancelHold);
    logo.removeEventListener('click', preventLogoClick);
  };
}
