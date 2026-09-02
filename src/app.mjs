import { ADMIN, REDUCED, TIMING } from './config.mjs';
import { findGuestById, buildSearchIndex } from './lib/roster.mjs';
import { createStore } from './lib/store.mjs';
import { mountAdmin } from './screens/admin.mjs';
import { mountLoading } from './screens/loading.mjs';
import { mountResult } from './screens/result.mjs';
import { mountRoster } from './screens/roster.mjs';
import { mountScan } from './screens/scan.mjs';

export function createVisitId() {
  return `visit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function start(root = document.getElementById('app')) {
  const store = createStore();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const timing = reduced ? REDUCED : TIMING;
  let guests = buildSearchIndex(store.loadRoster());
  let cleanup = () => {};
  let state = 'LOADING';
  let currentGuestId = null;
  let currentVisitId = null;
  let adminCleanup = null;
  const loggedVisitIds = new Set();
  const seenGuestIds = new Set();

  document.documentElement.style.setProperty('--transition-ms', `${timing.TRANSITION_MS}ms`);
  document.documentElement.style.setProperty('--admin-hitzone', `${ADMIN.HITZONE_PX}px`);

  function setState(next, payload = {}) {
    cleanup();
    cleanup = () => {};
    state = next;
    root.classList.remove('is-ready');
    window.requestAnimationFrame(() => root.classList.add('is-ready'));

    if (state === 'LOADING') {
      cleanup = mountLoading(root, { timing, onDone: () => setState('ROSTER') });
    }
    if (state === 'ROSTER') {
      cleanup = mountRoster(root, {
        guests,
        store,
        onSelect: (guestId) => {
          currentGuestId = guestId;
          currentVisitId = createVisitId();
          setState('SCAN');
        },
        onAdminHold: () => {
          if (state !== 'ROSTER' || adminCleanup) return;
          adminCleanup = mountAdmin(root, {
            store,
            onRosterChanged: (nextGuests) => {
              guests = buildSearchIndex(nextGuests);
            },
            onClose: () => {
              adminCleanup = null;
              setState('ROSTER');
            },
          });
        },
      });
    }
    if (state === 'SCAN') {
      const guest = findGuestById(guests, currentGuestId);
      cleanup = mountScan(root, {
        guest,
        timing,
        onDone: () => setState('RESULT', { guest }),
      });
    }
    if (state === 'RESULT') {
      const guest = payload.guest || findGuestById(guests, currentGuestId);
      const repeat = seenGuestIds.has(guest.id);
      seenGuestIds.add(guest.id);
      if (!loggedVisitIds.has(currentVisitId)) {
        store.appendCheckIn(guest, currentVisitId);
        loggedVisitIds.add(currentVisitId);
      }
      cleanup = mountResult(root, {
        guest,
        timing,
        repeat,
        onDone: () => setState('ROSTER'),
      });
    }
  }

  window.addEventListener(
    'gesturestart',
    (event) => {
      if (window.navigator.standalone) event.preventDefault();
    },
    { passive: false },
  );

  setState('LOADING');
  window.CheckIn007 = { start, setState };
  return { setState, store };
}
