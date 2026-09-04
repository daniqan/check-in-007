import { ADMIN, CLOUD, REDUCED, TIMING } from './config.mjs';
import { createScanAudioController } from './lib/audio.mjs';
import { findGuestById, buildSearchIndex } from './lib/roster.mjs';
import { createStore } from './lib/store.mjs';
import { createCloudSync } from './lib/cloud-sync.mjs';
import { mountDevNav } from './lib/dev-nav.mjs';
import { mountArrivals } from './screens/arrivals.mjs';
import { mountAdmin } from './screens/admin.mjs';
import { mountLoading } from './screens/loading.mjs';
import { mountResult } from './screens/result.mjs';
import { mountRoster } from './screens/roster.mjs';
import { mountScan } from './screens/scan.mjs';

export function createVisitId() {
  return `visit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readRuntimeFlags(search = window.location.search) {
  const params = new URLSearchParams(search || '');
  return {
    scrollProbe: params.get('scrollProbe') === '1',
    devNav: params.get('devNav') === '1',
    buildVersion: params.get('buildVersion') || null,
  };
}

export function start(root = document.getElementById('app')) {
  const store = createStore();
  const cloud = createCloudSync({ cloud: CLOUD });
  const audio = createScanAudioController();
  const runtimeFlags = readRuntimeFlags();
  audio.setEnabled(store.loadAudioSettings().scanBlipEnabled);
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

  function updateAudioSettings(nextSettings) {
    const saved = store.saveAudioSettings(nextSettings);
    audio.setEnabled(saved.scanBlipEnabled);
    return saved;
  }

  function downloadCsv() {
    const blob = new Blob([store.exportLogCsv()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `checkin-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function openAdmin() {
    if (adminCleanup) return;
    adminCleanup = mountAdmin(root, {
      store,
      audioSettings: store.loadAudioSettings(),
      onAudioSettingsChanged: updateAudioSettings,
      onRosterChanged: (nextGuests) => {
        guests = buildSearchIndex(nextGuests);
      },
      onViewArrivals: () => setState('ARRIVALS'),
      onClose: () => {
        adminCleanup = null;
        setState('ROSTER');
      },
    });
  }

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
        runtimeFlags,
        onSelect: (guestId) => {
          currentGuestId = guestId;
          currentVisitId = createVisitId();
          audio.unlockFromGesture();
          setState('SCAN');
        },
        onAdminHold: () => {
          if (state !== 'ROSTER') return;
          openAdmin();
        },
      });
    }
    if (state === 'SCAN') {
      const guest = findGuestById(guests, currentGuestId);
      cleanup = mountScan(root, {
        guest,
        timing,
        onDone: () => {
          audio.playScanBlip();
          setState('RESULT', { guest });
        },
      });
    }
    if (state === 'ARRIVALS') {
      cleanup = mountArrivals(root, {
        guests,
        store,
        cloud,
        onClose: () => setState('ROSTER'),
        onExport: downloadCsv,
      });
    }
    if (state === 'RESULT') {
      const guest = payload.guest || findGuestById(guests, currentGuestId);
      const repeat = seenGuestIds.has(guest.id);
      const visitId = currentVisitId;
      cleanup = mountResult(root, {
        guest,
        timing,
        repeat,
        onConfirm: () => {
          seenGuestIds.add(guest.id);
          if (!loggedVisitIds.has(visitId)) {
            const entries = store.appendCheckIn(guest, visitId);
            loggedVisitIds.add(visitId);
            // Local write has already committed; the cloud mirror is
            // best-effort and queues offline. Never blocks the guest.
            const entry = entries.find((item) => item.visitId === visitId);
            if (entry) cloud.recordCheckIn(entry);
          }
          setState('ROSTER');
        },
        onCancel: () => setState('ROSTER'),
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

  // SCAN/RESULT/ADMIN all need a selected guest; jumping straight to them from
  // the dev nav (e.g. on first load) would otherwise hit an undefined guest.
  function jumpTo(screen) {
    if (adminCleanup) {
      adminCleanup();
      adminCleanup = null;
    }
    if (screen === 'SCAN' || screen === 'RESULT') {
      if (!findGuestById(guests, currentGuestId)) {
        currentGuestId = guests[0]?.id ?? null;
        currentVisitId = createVisitId();
      }
      if (!currentGuestId) return;
    }
    if (screen === 'ADMIN') {
      setState('ROSTER');
      openAdmin();
      return;
    }
    setState(screen);
  }

  if (runtimeFlags.devNav) mountDevNav({ onJump: jumpTo });

  setState('LOADING');
  window.CheckIn007 = { start, setState, jumpTo, cloud };
  return { setState, store, jumpTo, cloud };
}
