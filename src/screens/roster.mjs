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
  // The non-virtualized roster scrolls the DOCUMENT (root scroller); the
  // virtualized roster scrolls the list itself. Report whichever is active.
  const win = documentRef.defaultView;
  const readDocumentScroll = () => {
    if (!win) return 0;
    const fromWindow = Number(win.scrollY);
    if (Number.isFinite(fromWindow)) return fromWindow;
    return Number(documentRef.scrollingElement?.scrollTop) || 0;
  };
  const update = () => {
    const listTop = Number(list.scrollTop) || 0;
    const value = Math.max(0, Math.round(Math.max(listTop, readDocumentScroll())));
    const text = `scroll-probe:${value}`;
    status.textContent = text;
    status.setAttribute('aria-label', text);
  };
  update();
  host.append(status);
  list.addEventListener('scroll', update, { passive: true });
  if (win && typeof win.addEventListener === 'function') {
    win.addEventListener('scroll', update, { passive: true });
  }
  return {
    dispose() {
      list.removeEventListener('scroll', update);
      if (win && typeof win.removeEventListener === 'function') {
        win.removeEventListener('scroll', update);
      }
      status.remove();
    },
  };
}

export function mountRoster(root, { guests, onSelect, onAdminHold, store, runtimeFlags = {} }) {
  root.innerHTML = `
    <section class="screen roster-screen" aria-labelledby="roster-title">
      <div class="roster-header">
        <header class="topbar">
          <span class="logo-slot">
            <span class="logo-mark" aria-hidden="true"></span>
            <span class="logo-mark-art" aria-hidden="true"></span>
            <button class="logo-hit" type="button" aria-label="Open admin controls"></button>
          </span>
          <div>
            <p>EVENT OPERATIONS</p>
            <h1 id="roster-title">AGENT ROSTER</h1>
          </div>
        </header>
        <label class="search-label" for="guest-search">Search guest roster</label>
        <input id="guest-search" class="search" type="search" autocomplete="off" placeholder="Search agents" />
        <p id="result-count" class="status" role="status" aria-live="polite"></p>
      </div>
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
  let holdOrigin = null;
  let tapTimes = [];
  const HOLD_SLOP_PX = 40;

  /* Pointer events expose clientX directly; touch events nest it in touches. */
  function readPoint(event) {
    if (!event) return null;
    const touch = event.touches?.[0] ?? event.changedTouches?.[0];
    if (touch) return { x: touch.clientX, y: touch.clientY };
    if (typeof event.clientX === 'number') return { x: event.clientX, y: event.clientY };
    return null;
  }
  let mounted = true;
  let virtualItems = [];
  let virtualFrame = 0;
  let pendingZeroViewportRemeasure = false;
  let probe = { dispose() {} };
  let checkedIn = new Set();

  /* Gold spy pen, marking a guest who has already been checked in. Inline so
     it needs no asset and inherits the row's colour. */
  const PEN_ICON = `<svg class="pen-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3.4 20.6l1.2-4.2 3 3z" />
      <path d="M6.4 15.4l9-9 2.2 2.2-9 9z" />
      <path d="M16.1 5.7l1.6-1.6 2.2 2.2-1.6 1.6z" />
      <path d="M18.6 2.6l1.1-1.1 2.8 2.8-1.1 1.1z" />
    </svg>`;

  function refreshCheckedIn() {
    checkedIn = new Set(
      store
        .loadLog()
        .map((entry) => entry?.guestId)
        .filter(Boolean),
    );
  }

  function createGuestRow(guest, absoluteIndex = null, total = null) {
    const item = document.createElement('li');
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'guest-row';
    row.dataset.guestId = guest.id;
    const isCheckedIn = checkedIn.has(guest.id);
    row.setAttribute(
      'aria-label',
      isCheckedIn ? `${guest.name}, already checked in` : `${guest.name}, tap to verify`,
    );
    if (absoluteIndex !== null && total !== null) {
      item.className = 'roster-virtual-row';
      item.style.transform = `translateY(${absoluteIndex * ROSTER.VIRTUAL_ROW_HEIGHT_PX}px)`;
      item.setAttribute('aria-setsize', String(total));
      item.setAttribute('aria-posinset', String(absoluteIndex + 1));
    }
    // The table assignment is deliberately withheld here: a guest must select
    // their name and complete the scan before the dossier screen reveals it.
    row.innerHTML = `<span>${guest.name}</span>${
      isCheckedIn
        ? `<small class="row-status is-checked-in">${PEN_ICON}Checked In</small>`
        : '<small class="row-status">TAP TO VERIFY</small>'
    }`;
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
    refreshCheckedIn();
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
    window.scrollTo(0, 0);
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

  /* Getting a long-press to survive iOS on a scrolling view took several
     attempts. What this does now:
     - The hit target is a plain static transparent button (.logo-hit) layered
       over the artwork (.logo-mark). Nothing about the target animates, so
       hit-testing can't land on a stale position.
     - pointerdown takes pointer capture, so once the press starts, Safari
       cannot reassign the gesture to the scroller mid-hold.
     - touchstart is non-passive and calls preventDefault, which stops the
       press being consumed to halt momentum scrolling.
     - Movement tolerance is deliberately loose (40px); a stationary finger on
       glass still drifts.
     - Triple-tap is a fallback route in, in case a device still fights the
       hold. Three taps inside 1.2s opens admin. */
  const startHold = (event) => {
    window.clearTimeout(hold);
    holdOrigin = readPoint(event);
    if (event?.pointerId !== undefined && logo.setPointerCapture) {
      try {
        logo.setPointerCapture(event.pointerId);
      } catch {
        /* capture is a nice-to-have */
      }
    }
    hold = window.setTimeout(() => {
      hold = 0;
      tapTimes = [];
      onAdminHold();
    }, ADMIN.HOLD_MS);
  };
  const cancelHold = () => {
    holdOrigin = null;
    window.clearTimeout(hold);
    hold = 0;
  };
  const moveHold = (event) => {
    if (!holdOrigin || !hold) return;
    const point = readPoint(event);
    if (!point) return;
    if (Math.hypot(point.x - holdOrigin.x, point.y - holdOrigin.y) > HOLD_SLOP_PX) cancelHold();
  };
  const blockTouchDefault = (event) => {
    event.preventDefault();
    startHold(event);
  };
  const countTap = () => {
    const now = Date.now();
    tapTimes = [...tapTimes, now].filter((time) => now - time < 1200);
    if (tapTimes.length >= 3) {
      tapTimes = [];
      cancelHold();
      onAdminHold();
    }
  };
  const releaseHold = (event) => {
    const wasHolding = hold !== 0;
    cancelHold();
    if (wasHolding) countTap();
    if (event?.pointerId !== undefined && logo.releasePointerCapture) {
      try {
        logo.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
    }
  };
  const preventLogoClick = (event) => event.preventDefault();

  logo.addEventListener('pointerdown', startHold);
  logo.addEventListener('pointermove', moveHold);
  logo.addEventListener('pointerup', releaseHold);
  logo.addEventListener('pointercancel', cancelHold);
  logo.addEventListener('touchstart', blockTouchDefault, { passive: false });
  logo.addEventListener('touchmove', moveHold, { passive: true });
  logo.addEventListener('touchend', releaseHold);
  logo.addEventListener('touchcancel', cancelHold);
  logo.addEventListener('click', preventLogoClick);

  render(guests);
  probe = createScrollProbe(list, { enabled: runtimeFlags.scrollProbe });

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
    logo.removeEventListener('pointermove', moveHold);
    logo.removeEventListener('pointerup', releaseHold);
    logo.removeEventListener('pointercancel', cancelHold);
    logo.removeEventListener('touchstart', blockTouchDefault);
    logo.removeEventListener('touchmove', moveHold);
    logo.removeEventListener('touchend', releaseHold);
    logo.removeEventListener('touchcancel', cancelHold);
    logo.removeEventListener('click', preventLogoClick);
  };
}
