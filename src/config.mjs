export const TIMING = {
  LOADING_MS: 2600,
  SCAN_MS: 4500,
  RESULT_MS: 5000,
  TRANSITION_MS: 500,
};

export const STORAGE = {
  LOG_KEY: 'checkin007.log.v1',
  ROSTER_KEY: 'checkin007.roster.v1',
  AUDIO_KEY: 'checkin007.audio.v1',
};

export const AUDIO = {
  SCAN_BLIP_DEFAULT_ENABLED: false,
  SCAN_BLIP_GAIN: 0.045,
  SCAN_BLIP_START_HZ: 880,
  SCAN_BLIP_END_HZ: 1320,
  SCAN_BLIP_DURATION_MS: 90,
  SCAN_BLIP_RELEASE_SECONDS: 0.035,
};

export const ADMIN = {
  HOLD_MS: 2000,
  HITZONE_PX: 84,
};

export const ROSTER = {
  SEARCH_DEBOUNCE_MS: 120,
  VIRTUALIZE_THRESHOLD: 500,
  // Single full-width column: 156px row + 12px grid gap.
  VIRTUAL_ROW_HEIGHT_PX: 168,
  VIRTUAL_VISIBLE_ROW_HEIGHT_PX: 156,
  VIRTUAL_OVERSCAN_ROWS: 6,
  VIRTUAL_MIN_VIEWPORT_PX: 360,
};

export const REDUCED = {
  LOADING_MS: 900,
  SCAN_MS: 2500,
  RESULT_MS: 4000,
  TRANSITION_MS: 150,
};

/* Firestore append-only backup. The kiosk is local-first: every check-in is
   written to localStorage first and mirrored here on a best-effort basis, so
   losing wifi never blocks check-in. Fill PROJECT_ID and API_KEY to enable;
   left blank, the kiosk runs entirely offline and nothing is sent.

   Safe to ship in the bundle: the matching security rules are create-only,
   so this key cannot read, update or delete anything. See docs/CLOUD-SETUP.md. */
export const CLOUD = {
  PROJECT_ID: '',
  API_KEY: '',
  COLLECTION: 'checkins',
  EVENT_ID: 'event-1',
  RETRY_MS: 15000,
  MAX_ATTEMPTS: 6,
};
