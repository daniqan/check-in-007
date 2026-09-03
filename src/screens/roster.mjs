import { ADMIN, ROSTER } from '../config.mjs';
import { filterGuests } from '../lib/roster.mjs';
import { computeVirtualWindow, shouldVirtualize } from '../lib/virtual-list.mjs';

export function createScrollProbe(list, { enabled, documentRef = document } = {}) {
  if (!enabled) return { dispose() {} };
  if (
    !list ||
    typeof list.addEventListener !== 'function' ||
    typeof list.removeEventListener !== 'function'
  ) {
    throw new TypeError('createScrollProbe requires a scrollable list element');
  }
  const host = list.parentElement;
  if (!host || typeof host.append !== 'function') {
    throw new TypeError('createScrollProbe requires a list with an appendable parent');
  }
  const status = documentRef.createElement('p');
  status.id = 'scroll-probe-status';
  status.className = 'scroll-probe-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-label', 'scroll-probe:0');
  const update = () => {
    const value = Math.max(0, Math.round(Number(list.scrollTop) || 0));
    const text = `scroll-probe:${value}`;
    status.textContent = text;
    status.setAttribute('aria-label', text);
  };
  update();
  host.append(status);
  list.addEventListener('scroll', update, { passive: true });
  return {
    dispose() {
      list.removeEventListener('scroll', update);
      status.remove();
    },
  };
}

export function mountRoster(root, { guests, onSelect, onAdminHold, store, runtimeFlags = {} }) {
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
  let mounted = true;
  let virtualItems = [];
  let virtualFrame = 0;
  let pendingZeroViewportRemeasure = false;
  let probe = { dispose() {} };

  function createGuestRow(guest, absoluteIndex = null, total = null) {
    const item = document.createElement('li');
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'guest-row';
    row.dataset.guestId = guest.id;
    row.setAttribute('aria-label', `${guest.name}, ${guest.table || 'table pending'}`);
    if (absoluteIndex !== null && total !== null) {
      item.className = 'roster-virtual-row';
      item.style.transform = `translateY(${absoluteIndex * ROSTER.VIRTUAL_ROW_HEIGHT_PX}px)`;
      item.setAttribute('aria-setsize', String(total));
      item.setAttribute('aria-posinset', String(absoluteIndex + 1));
    }
    row.innerHTML = `<span>${guest.name}</span><small>${guest.table || 'CHECK-IN DESK'}</small>`;
    item.append(row);
    return item;
  }

  function renderEmptyList() {
    list.classList.remove('is-virtualized');
    list.style.removeProperty('--roster-virtual-row-height');
    list.innerHTML = '<p class="empty">NO MATCHING AGENTS</p>';
  }

  function renderSmallList(items) {
    list.classList.remove('is-virtualized');
    list.style.removeProperty('--roster-virtual-row-height');
    list.innerHTML = '';
    if (items.length === 0) {
      renderEmptyList();
      return;
    }
    for (const guest of items) {
      list.append(createGuestRow(guest));
    }
  }

  function measureVirtualViewport(allowRemeasure = true) {
    if (list.clientHeight > 0) return list.clientHeight;
    if (allowRemeasure && !pendingZeroViewportRemeasure) {
      pendingZeroViewportRemeasure = true;
      scheduleVirtualRender({ allowZeroRemeasure: false });
    }
    return ROSTER.VIRTUAL_MIN_VIEWPORT_PX;
  }

  function renderVirtualList(items, options = {}) {
    virtualItems = items;
    pendingZeroViewportRemeasure = false;
    list.classList.add('is-virtualized');
    list.style.setProperty(
      '--roster-virtual-row-height',
      `${ROSTER.VIRTUAL_VISIBLE_ROW_HEIGHT_PX}px`,
    );
    const viewportHeight = measureVirtualViewport(options.allowZeroRemeasure !== false);
    const windowState = computeVirtualWindow({
      total: items.length,
      scrollTop: list.scrollTop,
      viewportHeight,
      rowHeight: ROSTER.VIRTUAL_ROW_HEIGHT_PX,
      overscan: ROSTER.VIRTUAL_OVERSCAN_ROWS,
    });
    const spacer = document.createElement('li');
    spacer.className = 'roster-virtual-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.height = `${items.length * ROSTER.VIRTUAL_ROW_HEIGHT_PX}px`;
    const rows = [spacer];

    for (let index = windowState.startIndex; index < windowState.endIndex; index += 1) {
      rows.push(createGuestRow(items[index], index, items.length));
    }
    list.replaceChildren(...rows);
  }

  function scheduleVirtualRender(options = {}) {
    if (virtualFrame) return;
    virtualFrame = window.requestAnimationFrame(() => {
      virtualFrame = 0;
      if (!mounted || !shouldVirtualize(virtualItems.length, ROSTER.VIRTUALIZE_THRESHOLD)) return;
      renderVirtualList(virtualItems, options);
    });
  }

  function render(items) {
    count.textContent = `${items.length} agent${items.length === 1 ? '' : 's'} visible`;
    if (store.isVolatile()) {
      storageNote.textContent = 'LOG NOT PERSISTED (private mode?)';
    }
    if (shouldVirtualize(items.length, ROSTER.VIRTUALIZE_THRESHOLD)) {
      renderVirtualList(items);
      return;
    }
    virtualItems = [];
    renderSmallList(items);
  }

  const update = () => {
    list.scrollTop = 0;
    render(filterGuests(guests, search.value));
  };
  const handleSearchInput = () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(update, ROSTER.SEARCH_DEBOUNCE_MS);
  };
  const handleVirtualScroll = () => {
    if (shouldVirtualize(virtualItems.length, ROSTER.VIRTUALIZE_THRESHOLD)) scheduleVirtualRender();
  };
  const handleResize = () => {
    if (shouldVirtualize(virtualItems.length, ROSTER.VIRTUALIZE_THRESHOLD)) scheduleVirtualRender();
  };
  const handleListClick = (event) => {
    const row = event.target.closest('.guest-row');
    if (!row || !list.contains(row) || navigating) return;
    navigating = true;
    onSelect(row.dataset.guestId);
  };
  search.addEventListener('input', handleSearchInput);
  list.addEventListener('scroll', handleVirtualScroll);
  list.addEventListener('click', handleListClick);
  window.addEventListener('resize', handleResize);

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
  probe = createScrollProbe(list, { enabled: runtimeFlags.scrollProbe });
  search.focus({ preventScroll: true });

  return () => {
    mounted = false;
    window.clearTimeout(debounce);
    window.clearTimeout(hold);
    if (virtualFrame) window.cancelAnimationFrame(virtualFrame);
    search.removeEventListener('input', handleSearchInput);
    list.removeEventListener('scroll', handleVirtualScroll);
    list.removeEventListener('click', handleListClick);
    probe.dispose();
    window.removeEventListener('resize', handleResize);
    logo.removeEventListener('pointerdown', startHold);
    logo.removeEventListener('pointerup', cancelHold);
    logo.removeEventListener('pointercancel', cancelHold);
    logo.removeEventListener('click', preventLogoClick);
  };
}
