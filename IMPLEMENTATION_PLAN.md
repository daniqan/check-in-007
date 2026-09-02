# Check-In 007 — Implementation Plan v2

> Event check-in kiosk for a black-tie gala, styled as an MI6 "agent identification"
> terminal. Runs on an Apple iPad in Safari (served) or as a self-contained file.
> This document is the contract reviewed by `project-discriminator`; it is written to be
> implementable without follow-up questions.

---

## 1. Overview

Guests arriving at a 007-themed ball check themselves in on an iPad kiosk. The app boots
with a cinematic gun-barrel loading animation, presents a searchable roster of ticketed
attendees, and — when a guest taps their name — plays a **spoof** biometric "face scan"
over the live front-camera feed for a fixed duration. It then reveals the guest's table
assignment ("AGENT IDENTIFIED — PROCEED TO YOUR ASSIGNMENT: <TABLE>") and, after a few
seconds, returns to the roster for the next guest.

The problem it solves: replace a paper guest list / harried door staff with a fast,
self-service, on-brand experience that also produces a check-in log (who arrived, when)
for the event organizer.

**Explicit privacy stance:** the "face scan" is theater. No camera frame is ever read,
captured, encoded, transmitted, or stored. The camera stream is used only as a live
backdrop for an overlay animation and is stopped the instant the scan screen is left.
This is a stated product requirement, not an implementation detail, and is enforced and
tested (§6 items 1–4, §7).

## 2. Scope

### In scope

1. Four-state guest flow: **Loading → Roster → Scan → Result**, auto-looping back to
   Roster.
2. 007 visual identity: black / gold / off-white palette, gun-barrel loading sequence,
   dossier/terminal typography, animated biometric HUD overlay. Crisp, modern, 60 fps
   target with smooth cross-screen transitions.
3. Roster: bundled default attendee data **plus** optional CSV override loaded on the
   iPad at runtime; instant search/filter; momentum scrolling.
4. Spoof face-scan over the live front camera, fixed duration, with a mandatory graceful
   fallback ("covert mode") when the camera is denied or unavailable.
5. Table-assignment mapping and result screen.
6. Background check-in log persisted to `localStorage`, with a hidden admin panel to
   import a CSV roster, export the log (CSV/JSON), reset the roster, and clear the log.
7. Accessibility (reduced-motion, large tap targets, VoiceOver labels) and iPad kiosk
   packaging (full-screen "Add to Home Screen" standalone, zoom/selection disabled).
8. A zero-runtime-dependency build that inlines everything into one portable
   `dist/index.html`, plus a dev/test toolchain (unit + end-to-end tests).

### Out of scope (v1)

- Any real biometric capture, recognition, liveness detection, or storage. Permanently
  out of scope by design.
- Server/back end, networked sync, multi-device consolidation of check-in logs, or
  authentication of staff beyond the local admin gesture.
- Ticket purchasing, payments, seating optimization, or editing table assignments in-app.
- Roster windowing/virtualization for very large lists (see §5 Phase 2 note; threshold
  documented, implementation deferred).
- Printing badges, QR codes, or email confirmations.
- Android/Chromebook or non-Safari certification (dev-tested on Chromium/Firefox, but the
  supported target is Safari on iPadOS — §4).

## 3. Architecture

Single-page application driven by an explicit finite state machine. No framework. The app
is a small set of ES modules during development; the build step (§9) inlines them into one
classic-script HTML file so the distributed artifact has no module/network dependency.

### 3.1 State machine

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
   boot ──▶ [LOADING] ──auto(2600ms)──▶ [ROSTER] ──select guest──▶ [SCAN]
                                           │  ▲                       │
                                           │  │                       │ scan complete
                              admin gesture│  │dismiss                │ (fixed 4500ms)
                                           ▼  │                       ▼
                                        [ADMIN]                   [RESULT]
                                                                       │
                                                                       │ auto(5000ms)
                                                                       ▼
                                                                    [ROSTER]
```

States: `LOADING`, `ROSTER`, `SCAN`, `RESULT`, `ADMIN`. Exactly one is active. Each
transition is a cross-fade+scale (`TRANSITION_MS`, §4.1; built in §5 Phase 1). ADMIN is a
modal overlay reachable only from ROSTER and dismissible only back to ROSTER; it never
interrupts SCAN or RESULT.

### 3.2 Modules (development sources, in `src/`)

| Module | Responsibility |
|--------|----------------|
| `src/app.mjs` | Controller: owns the FSM, screen mounting/unmounting, central timer registry, and cleanup-on-exit. Entry point. |
| `src/screens/loading.mjs` | Renders + animates the gun-barrel boot sequence; signals completion. |
| `src/screens/roster.mjs` | Renders the searchable attendee list; emits `select(guestId)`. |
| `src/screens/scan.mjs` | Owns camera lifecycle + overlay animation + fallback; emits `done()`. |
| `src/screens/result.mjs` | Renders the assignment message; emits `done()`. |
| `src/screens/admin.mjs` | Admin overlay: CSV import, exports, roster reset, log clear. |
| `src/lib/csv.mjs` | Pure CSV parse + guest-CSV interpretation. No DOM. |
| `src/lib/roster.mjs` | Guest normalization, id/slug generation, dedupe, search index. No DOM. |
| `src/lib/store.mjs` | `localStorage`-backed check-in log + roster override, with in-memory fallback. |
| `src/lib/format.mjs` | Timestamp (ISO-8601 local), name/table display formatting. |
| `src/config.mjs` | All tunable constants (durations, keys, palette echoes, gesture params). |
| `data/guests.default.js` | Classic script assigning `window.CHECKIN007_DEFAULT_GUESTS`. |

Rationale for splitting pure logic (`src/lib/*`) from screens: the CSV parser, roster
normalization, and store logic carry the real correctness risk and are unit-tested in
Node without a DOM (§7). Screens are covered by end-to-end tests.

### 3.3 Data flow

`data/guests.default.js` seeds the roster on boot. If the admin has loaded a CSV override
(persisted under a `localStorage` key), that supersedes the default. Selecting a guest
passes its `id` to SCAN; RESULT looks up the guest by `id`, renders `table`, and appends a
check-in event to the log via `store.mjs`. Nothing leaves the device.

### 3.4 File manifest

Ground-truth files produced by this plan:

```
.
  index.html                 (NEW) — Dev HTML shell that loads ES modules and default data.
  package.json               (NEW) — Pinned scripts and dev dependencies.
  package-lock.json          (NEW) — Exact npm dependency lockfile.
  .gitignore                 (NEW) — Ignore build output, deps, test output, local certs.
  .prettierrc.json           (NEW) — Formatting config used by npm run lint.
  README.md                  (NEW) — Run/build/deploy instructions and iPad checklist.
  data/
    guests.default.js        (NEW) — Bundled default roster on window.
  assets/
    fonts/                   (NEW) — Subset WOFF2 font files and license notes.
  scripts/
    build.mjs                (NEW) — ES-module to classic-script build/inlining pipeline.
  src/
    app.mjs                  (NEW) — FSM controller, timers, cleanup, log-on-transition.
    config.mjs               (NEW) — Timings, storage keys, admin gesture config.
    styles.css               (NEW) — Kiosk layout, palette tokens, responsive states.
    lib/csv.mjs              (NEW) — CSV parser and guest CSV validation.
    lib/format.mjs           (NEW) — Timestamp and display formatting helpers.
    lib/roster.mjs           (NEW) — Guest normalization, dedupe, search indexing.
    lib/store.mjs            (NEW) — localStorage/in-memory persistence and exports.
    screens/loading.mjs      (NEW) — Gun-barrel boot screen.
    screens/roster.mjs       (NEW) — Searchable roster screen.
    screens/scan.mjs         (NEW) — Camera/covert scan screen and cleanup.
    screens/result.mjs       (NEW) — Assignment result screen.
    screens/admin.mjs        (NEW) — CSV import, export, reset, clear-log overlay.
  tests/
    unit/build.test.mjs      (NEW) — Build transform and emitted artifact checks.
    unit/csv.test.mjs        (NEW) — CSV grammar/validation coverage.
    unit/format.test.mjs     (NEW) — Timestamp/display helper coverage.
    unit/roster.test.mjs     (NEW) — Slug, dedupe, search index coverage.
    unit/store.test.mjs      (NEW) — Persistence, visit idempotence, export coverage.
    e2e/checkin.spec.mjs     (NEW) — Kiosk flow, camera fallback, admin, a11y, file smoke.
```

## 4. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| App runtime | HTML5 + CSS3 + vanilla JavaScript (ES2020), **no framework** | Fixed kiosk flow needs no virtual DOM or reactivity layer; avoiding React/Vue keeps the artifact tiny, the animations directly controllable (transform/opacity on the compositor), and the code trivially auditable. |
| Rendering of animations | CSS transitions/animations + Web Animations API; only `transform` and `opacity` animated | GPU-composited properties avoid layout/paint on every frame → smooth 60 fps on iPad. |
| Camera API | `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })` into a muted, `playsinline` `<video>` | Standard, permissioned, front-facing; `playsinline` prevents iOS full-screen takeover. |
| Attendee data | Bundled default (`data/guests.default.js`) **+** optional runtime CSV override via `<input type="file">` + `FileReader` | Works offline and under `file://` (a classic `<script>` and `FileReader` both do; `fetch()` of local JSON is CORS-blocked under `file://`, so JSON-over-fetch is deliberately **not** used). |
| Persistence | `localStorage` (JSON), keys `checkin007.log.v1` and `checkin007.roster.v1`, with `try/catch` in-memory fallback | No server; must survive reloads and offline; graceful under Safari Private mode where `localStorage` throws. |
| Build | Custom Node script (`scripts/build.mjs`) that performs the explicit module-to-classic transform in §4.4, then inlines CSS, JS, subset fonts (base64), and default data into `dist/index.html` | One portable self-contained file for the iPad; no bundler dependency/supply-chain surface; keeps `file://` working (no ES-module fetch). |
| Fonts (self-hosted, OFL) | Display: **Oswald** (600/700); Accent serif: **Playfair Display** (700); HUD mono: **JetBrains Mono** (500). WOFF2 in `assets/fonts/`. System-stack fallbacks specified. | SIL Open Font License permits embedding/self-hosting; delivers the crisp modern + dossier feel with zero network calls. |
| Language runtime for tooling | Node.js >=22 (local dev host verified: v26.3.0 on 2026-09-02; Node 22+ remains supported by the planned script APIs). | Dev/test/build only; **not present on and not required by the iPad** (§4.1a). |
| Package manager | npm >=10 (local dev host verified: 11.16.0 on 2026-09-02) | Lockfile pins exact dev-dependency versions; scripts use stable npm commands available in npm 10+. |
| Dev deps (exact pins) | `@playwright/test` 1.62.1; `http-server` 14.1.1; `prettier` 3.9.6; `axe-core` 4.13.0 | Versions verified against the npm registry on 2026-09-02; pinned exactly in `package.json` + committed `package-lock.json`. |
| Local HTTPS for on-site camera testing | `mkcert` (external binary) to mint a localhost/LAN cert; served via `http-server -S` | `getUserMedia` requires a secure context; `http://localhost` qualifies, but a LAN IP for the iPad does not — HTTPS is required there. |
| Supported target | Safari on iPadOS 16 or later (portrait or landscape) | Conservative baseline for current iPads; Safari supports `getUserMedia`, Web Animations API, ES2020, and `localStorage` on this range (§4.1a). Chromium latest is used only for automated dev tests. |

### 4.1 Tunable constants (`src/config.mjs`) — single source of truth

```js
export const TIMING = {
  LOADING_MS:    2600,   // boot animation, then auto-advance to ROSTER
  SCAN_MS:       4500,   // spoof scan duration
  RESULT_MS:     5000,   // assignment shown, then auto-return to ROSTER
  TRANSITION_MS:  500,   // cross-screen fade+scale
};
export const STORAGE = {
  LOG_KEY:    'checkin007.log.v1',
  ROSTER_KEY: 'checkin007.roster.v1',
};
export const ADMIN = {
  HOLD_MS:     2000,     // long-press duration on the logo to open ADMIN
  HITZONE_PX:  72,       // logo hit target
};
export const REDUCED = {                 // used when prefers-reduced-motion: reduce
  LOADING_MS: 900, SCAN_MS: 2500, RESULT_MS: 4000, TRANSITION_MS: 150,
};
```

All screens read these; no magic numbers inline. The discriminator can grep for literal
durations and find none outside `config.mjs`.

### 4.1a Runtime vs. tooling — the Node/iPad question (verified 2026-09-02)

A deliberate clarification, because it changes what "up to date" means here:

- **The iPad runs Safari (JavaScriptCore), not Node.** Node.js does not ship on iOS/iPadOS
  and is never installed on the kiosk device. There is therefore no "iOS Node version" to
  match. What the iPad needs is a current Safari, which it has.
- **Current iPad target is iPadOS 16 or later.** Its Safari supports `getUserMedia`, the
  Web Animations API, ES2020, and `localStorage`. Our stated minimum is conservative for
  the event hardware unless the organizer supplies an unusually old iPad. **No Node or
  npm install is required on the iPad.**
- **Node is our dev/build/test tool only** (Playwright, `node:test`, `scripts/build.mjs`).
  The local dev host currently runs Node v26.3.0 and npm 11.16.0; `engines` in
  `package.json` will declare `"node": ">=22"` so Node 22 LTS, Node 24 LTS, and newer
  current releases are valid.

Bottom line: nothing needs upgrading to start. If we want a longer tooling-support runway,
bump dev machines to Node 24 LTS — but it is not a prerequisite.

### 4.2 Palette tokens (CSS custom properties in `:root`)

```css
--ink:      #0A0A0A;  /* primary background            */
--ink-2:    #050505;  /* vignette / deepest black      */
--gold:     #D4AF37;  /* primary accent (classic gold) */
--gold-2:   #B8860B;  /* deep gold, gradients/borders  */
--gold-hi:  #F2D479;  /* gold highlight / glow         */
--paper:    #F5F5F0;  /* off-white text                */
--paper-dim:#B9B9B2;  /* secondary text                */
--line:     rgba(212,175,55,0.28); /* hairline gold rules */
```

Strictly black/gold/white per the brief; the scan reticle and HUD are gold, not red, to
stay on-palette.

### 4.3 Data schema

Guest object (canonical in memory):

```js
{ id: string,      // stable slug, e.g. "jane-quill" (collisions handled — §6 item 10)
  name: string,    // display name, trimmed
  table: string }  // e.g. "Table 7 — Casino Royale"; may be "" (§6 item 6)
```

Check-in log entry:

```js
{ visitId: string, guestId: string, name: string, table: string,
  timestamp: string }   // ISO-8601 with local offset, e.g. 2026-09-02T20:14:33-04:00
```

CSV override format: UTF-8, header row required, columns `name` and `table` (case-
insensitive, any order); optional `id` column overrides slug generation. Grammar and edge
handling in §6 (items 7–10).

### 4.4 Build transform contract (`scripts/build.mjs`)

The dev source uses ES modules for testability; the distributed `dist/index.html` must use
one classic `<script>` so it boots from `file://` without module fetches. The transform is
intentionally small and deterministic:

1. `scripts/build.mjs` declares the module order manually, matching the import graph:
   `config.mjs`, `lib/format.mjs`, `lib/csv.mjs`, `lib/roster.mjs`, `lib/store.mjs`,
   `screens/loading.mjs`, `screens/roster.mjs`, `screens/scan.mjs`,
   `screens/result.mjs`, `screens/admin.mjs`, `app.mjs`.
2. For each module, it parses only top-level static imports/exports. Imports must be of
   the form `import { name } from './relative.mjs'` or `import { name as alias } ...`;
   default imports, dynamic `import()`, re-exports, and side-effect imports are build-time
   errors.
3. Each module body is wrapped in an IIFE namespace:

   ```js
   window.__CHECKIN007.modules.roster = (() => {
     // import lines removed; referenced symbols are read from prior namespaces
     function normalizeGuests(...) { ... }
     return { normalizeGuests, buildSearchIndex, findGuestById };
   })();
   ```

4. Leading `export ` is stripped from `export function`, `export class`, and `export const`
   declarations. `export { a, b as c }` is converted into the IIFE return object. Imported
   symbols are rewritten to `window.__CHECKIN007.modules.<module>.<exportName>` aliases at
   the top of the IIFE, preventing global identifier collisions.
5. `data/guests.default.js` remains a classic script and is copied verbatim before the app
   bundle. The generated bundle exposes only `window.CheckIn007.start()` as the public
   entry point.
6. The build fails closed if any emitted classic script still contains top-level
   `import`, `export`, `import(`, or `//# sourceMappingURL=` tokens.

Build smoke tests assert that `dist/index.html` contains exactly one app script, zero
module syntax tokens, `window.CHECKIN007_DEFAULT_GUESTS`, and `window.CheckIn007.start`;
the Playwright `file://` test then boots the artifact to ROSTER in covert mode.

## 5. Implementation Phases

Each phase ends with a commit and the listed acceptance criteria met. Phases are ordered
by dependency.

### Phase 0 — Scaffold & toolchain
- Create `package.json` (pins from §4), `.gitignore` (`node_modules/`, `dist/`,
  `test-results/`, `*.pem`), `README.md` skeleton, folder layout from §3.2.
- Add self-hosted WOFF2 fonts under `assets/fonts/` with an `@font-face` block and the
  system fallback stacks. Font files are subset to Latin/basic punctuation with
  `fonttools pyftsubset` or an equivalent documented command before committing.
- Add `src/config.mjs` and the palette CSS tokens.
- Add Prettier config and `npm run lint` (`prettier --check .`) as the formatting gate.
- **Acceptance:** `npm ci` installs cleanly; `npm run lint` passes; `npm run serve` serves
  the dev tree; `index.html` loads the module graph with no console errors on a blank
  shell.

### Phase 1 — FSM shell & transitions
- Implement `src/app.mjs`: FSM, screen mount/unmount, central timer registry, and
  guaranteed cleanup on state exit (clear timers, stop camera).
- Placeholder screen bodies; wire LOADING→ROSTER→SCAN→RESULT→ROSTER with the cross-fade.
- Honor `prefers-reduced-motion` by switching to `REDUCED` timings/animations.
- **Acceptance:** full loop cycles on timers; no timer or listener leaks across 20 cycles
  (verified in e2e); reduced-motion path uses `REDUCED` values.

### Phase 2 — Roster
- `src/lib/roster.mjs`: normalize/dedupe/slug + build a lowercase search index.
- `src/lib/store.mjs`: load default vs. override roster.
- `src/screens/roster.mjs`: render the list, debounced search (120 ms), momentum scroll
  (`-webkit-overflow-scrolling: touch`), ≥44 px rows, empty-state, selection guard.
- Ship ~40 themed sample guests in `data/guests.default.js`.
- Note: lists ≤500 rows render directly; **>500 rows** would need windowing — documented,
  deferred (§2 out of scope).
- Complexity budget for the supported maximum: normalization/index rebuild is O(n * m)
  for n≤500 guests and m≤80 normalized characters per guest, under ~40k character
  operations; each debounced search is O(n) over precomputed strings and must complete
  within 16 ms on the target iPad.
- **Acceptance:** search filters correctly (case/diacritic-insensitive); tapping a row
  once (double-tap guarded) advances to SCAN with the right `id`.

### Phase 3 — Scan (camera + spoof overlay + fallback)
- `src/screens/scan.mjs`: request camera; on success show live feed + animated gold
  reticle, sweep line, and fake HUD readouts for `SCAN_MS`. On `getUserMedia` rejection or
  insecure context, enter **covert mode**: animated silhouette + reticle, same duration,
  same outcome.
- Enforce privacy: never call `drawImage`/`toDataURL`/`captureStream`/`MediaRecorder`;
  stop every track (`track.stop()`) and null the `srcObject` on exit or interruption.
- **Acceptance:** happy path shows video and completes in `SCAN_MS`±150 ms; denied path
  falls back without a dead-end; e2e asserts no frame-grab APIs are called and tracks are
  stopped on exit.

### Phase 4 — Result & check-in logging
- `src/screens/result.mjs`: look up guest, render "AGENT IDENTIFIED — PROCEED TO YOUR
  ASSIGNMENT: <TABLE>"; missing table → "PROCEED TO THE CHECK-IN DESK".
- Append the log entry on the SCAN→RESULT transition, not on every RESULT render. The FSM
  creates a per-visit `visitId` when a roster row is accepted; `app.mjs` stores
  `loggedVisitIds` in memory and calls `store.appendCheckIn(guest, visitId)` exactly once.
  `store.mjs` treats duplicate `visitId` appends as no-ops. A later roster selection for
  the same guest creates a new `visitId`, so re-check-in is allowed and appended, with a
  subtle "RE-VERIFYING" note.
- Auto-return to ROSTER after `RESULT_MS`.
- **Acceptance:** correct table for a known guest; log entry has all §4.3 fields with a
  valid ISO-8601 local timestamp; one scan-result visit produces exactly one log entry
  across orientation changes/re-renders; `localStorage`-disabled path degrades to
  in-memory.

### Phase 5 — Admin panel
- Long-press (`HOLD_MS`) on the logo hitzone opens ADMIN (pointer + touch events).
- Actions: **Load CSV roster** (via `csv.mjs`, validated), **Export log CSV**, **Export
  log JSON**, **Reset to default roster**, **Clear log** (two-step confirm).
- Exports use a `Blob` + `URL.createObjectURL` download; because iPad Safari download UX
  is limited, also offer **Copy to clipboard** for both formats.
- Clipboard code uses `navigator.clipboard.writeText` when available, then falls back to a
  hidden `<textarea>` + `document.execCommand('copy')`; both paths return the exact string
  generated by `store.exportLogCsv()` / `store.exportLogJson()` so tests can assert before
  OS clipboard handoff.
- **Acceptance:** valid CSV replaces the roster and persists across reload; malformed CSV
  is rejected/repaired per §6 (items 7–10) with a visible summary; export contents match the stored
  log exactly (verified in e2e).

### Phase 6 — Visual polish & kiosk packaging
- Gun-barrel loading sequence, typography scale, gold hairlines/vignette, inline-SVG HUD
  and reticle, subtle grain.
- Kiosk meta: `viewport` with `width=device-width, initial-scale=1, viewport-fit=cover`,
  both `mobile-web-app-capable=yes` and `apple-mobile-web-app-capable=yes`,
  `apple-mobile-web-app-status-bar-style=black`, disabled text selection/callout, both
  orientations.
- iOS Safari intentionally ignores `user-scalable=no` / `maximum-scale` for user zoom, so
  the plan does **not** claim pinch-zoom can be disabled. The kiosk mitigation is:
  Home-Screen standalone mode, `touch-action: manipulation` on controls, ≥16 px form input
  fonts to avoid focus zoom, disabled callout/selection, and optional
  `gesturestart`/`gesturechange` `preventDefault` handlers only when installed in
  standalone kiosk mode.
- Add VoiceOver/ARIA pass: roster is a labeled list of `<button>` rows, search has a
  stable label and result-count status, scan progress/covert-mode state uses polite
  `aria-live`, result assignment uses assertive `aria-live`, admin controls have labels,
  focus returns to the roster after admin/result dismissal, and all interactive targets are
  at least 44 px.
- **Acceptance:** manual iPad checklist (below) passes; axe-core e2e has zero serious or
  critical violations; manual VoiceOver checklist announces roster rows, scan status,
  result assignment, and admin controls correctly; Lighthouse/devtools shows animated
  frames staying on the compositor (no per-frame layout).

### Phase 7 — Build, tests, docs
- `scripts/build.mjs` implements the §4.4 transform and inlines everything into
  `dist/index.html` (self-contained).
- `tests/unit/build.test.mjs` exercises the transform on fixture modules and the real
  source graph: dependency order is honored, import/export syntax is removed, namespaces
  expose expected exports, unsupported module syntax fails closed, and default data stays
  classic.
- Unit tests (`node:test`) for `csv.mjs`, `roster.mjs`, `store.mjs`, `format.mjs`.
- Playwright e2e for the whole flow, camera-denied fallback, admin export, reduced-motion,
  and a `file://` boot of `dist/index.html` (must reach ROSTER in covert mode).
- Enforce artifact budget: `dist/index.html` target ≤750 KB gzip and hard cap ≤1.2 MB
  uncompressed. If exceeded, fail the build and reduce/subset font weights before release.
- README: run/dev/build/deploy/on-site + the manual iPad checklist.
- **Acceptance:** `npm run lint` and `npm test` green; `npm run build` produces a single
  `dist/index.html` with zero `import`/`export` tokens, within the artifact budget, that
  boots from `file://` and, when served over HTTPS, runs the camera path.

## 6. Error Handling & Edge Cases

Each item states the trigger, where it is caught, and the recovery.

1. **Camera permission denied / `NotAllowedError`** — caught in `scan.mjs` around
   `getUserMedia`. Recovery: covert-mode animation for the same duration; a small HUD note
   "OPTICAL SENSOR OFFLINE — COVERT MODE"; flow completes normally.
2. **No camera / `NotFoundError` / `NotReadableError`** — same catch, same covert-mode
   recovery.
3. **Insecure context (`file://` or plain-HTTP LAN)** — detected via
   `window.isSecureContext === false` **before** calling `getUserMedia`; skip the request
   and go straight to covert mode (avoids a hanging prompt).
4. **Camera privacy on exit/interruption** — `scan.mjs` exit handler and the central FSM
   cleanup both call `stopCamera()` (stop all tracks, null `srcObject`). Covers back-
   navigation, admin opening, and reload mid-scan. E2e asserts tracks are `ended`.
5. **Empty roster** (no default and no override) — ROSTER shows an empty state pointing to
   the admin gesture to load a CSV.
6. **Guest missing a table** — RESULT shows "PROCEED TO THE CHECK-IN DESK" instead of a
   blank; logged with `table: ""`.
7. **CSV — missing required column** (`name` or `table`) — reject the whole file; keep the
   current roster; ADMIN shows the reason.
8. **CSV — quoting/commas/CRLF/BOM** — parser handles RFC-4180 quoted fields (embedded
   commas, escaped `""`), strips a leading UTF-8 BOM, accepts `\n` and `\r\n`, and skips
   fully blank lines. Unit-tested (§7).
9. **CSV — duplicate names** — normalized-key dedupe (casefold + collapse whitespace);
   keep first occurrence; report the count of dropped duplicates.
10. **CSV — id/slug collision** — `roster.mjs` appends `-2`, `-3`, … to make ids unique;
    unit-tested.
11. **`localStorage` unavailable/full/Private mode** — every access wrapped in `try/catch`
    in `store.mjs`; on failure, degrade to an in-memory log and set a flag ADMIN surfaces
    as "LOG NOT PERSISTED (private mode?)".
12. **Rapid double-tap on a name / re-entrancy** — selection guarded by an `isNavigating`
    latch cleared on the next screen mount.
13. **Interrupted scan** (navigate away before `SCAN_MS`) — central timer registry cancels
    pending timers on state exit; camera stopped (item 4).
14. **Long names / long table strings** — CSS clamps roster rows to two lines with ellipsis
    and wraps the RESULT table string with a reduced font step; no overflow.
15. **Orientation change mid-animation** — layout uses flexbox/grid with viewport units;
    animations are transform-based so they survive reflow; verified on the manual checklist.
16. **Search with no matches** — explicit "NO MATCHING AGENTS" empty state; no error.
17. **`prefers-reduced-motion: reduce`** — `REDUCED` timings and simplified (fade-only)
    transitions; the gun-barrel sweep becomes a quick fade.

## 7. Testing Strategy

### 7.1 Unit tests (`node:test`, Node 22.x) — `tests/unit/*.test.mjs`
- **`csv.mjs`**: simple rows; quoted field with embedded comma; escaped `""`; CRLF vs LF;
  leading BOM; blank-line skipping; header case/order variance; missing `name` column
  (reject); missing `table` column (reject); Unicode names (e.g. "Renée Aubénas"); trailing
  empty last line.
- **`roster.mjs`**: slug generation from names with spaces/accents/punctuation; duplicate-
  name dedupe (keep first, count dropped); id-collision suffixing; search index matches
  case- and diacritic-insensitively.
- **`store.mjs`**: append + read round-trip; override persistence; `localStorage`-throwing
  stub → in-memory fallback path; duplicate `visitId` append is idempotent while a new
  `visitId` for the same guest appends; export serialization (CSV escaping, JSON shape)
  matches stored entries exactly.
- **`format.mjs`**: ISO-8601-with-offset formatting for a fixed date; display truncation
  helper.
- **`build.mjs`**: real source graph emits no module syntax; fixture modules verify
  namespace rewriting, alias imports, export-object conversion, unsupported syntax errors,
  and classic default data placement.

### 7.2 End-to-end (`@playwright/test` 1.62.1, Chromium) — `tests/e2e/*.spec.mjs`
Launched with `--use-fake-device-for-media-stream` and camera permission pre-granted so
the happy path runs headless.
- Boot → LOADING auto-advances to ROSTER within `LOADING_MS` (+ tolerance).
- Search filters the visible rows.
- Select a known guest → SCAN shows the `<video>` → after `SCAN_MS`, RESULT shows the
  expected table → after `RESULT_MS`, returns to ROSTER.
- A check-in entry with all §4.3 fields is present in `localStorage`.
- Re-render RESULT by changing viewport/orientation during the result state; assert the
  log still contains exactly one entry for that `visitId`.
- **Camera-denied path**: launch with permission denied → covert mode → flow still
  completes; assert no `toDataURL`/`captureStream`/`MediaRecorder` call occurred (spy) and
  video tracks are `ended` after leaving SCAN.
- **Admin**: long-press logo → panel opens; import a fixture CSV → roster updates; export
  CSV → downloaded/clipboard content equals the stored log. The clipboard path runs in a
  browser context with `context.grantPermissions(['clipboard-read', 'clipboard-write'])`;
  when the platform clipboard is unavailable, the test spies on `navigator.clipboard.writeText`
  or the fallback copy helper and asserts the exact string argument.
- **Accessibility**: inject `axe-core` into each screen and require zero serious/critical
  violations; assert key landmarks/labels/live regions are present.
- **Reduced-motion**: emulate `prefers-reduced-motion: reduce` → `REDUCED` timings used.
- **`file://` build smoke**: open `dist/index.html` via `file://` → boots to ROSTER in
  covert mode with no console errors; additionally assert the artifact has zero top-level
  `import`/`export` tokens before opening it.

### 7.3 Manual iPad checklist (in README)
Camera permission prompt + live feed; front camera; both orientations; "Add to Home
Screen" launches full-screen with black status bar; double-tap zoom does not trigger on
controls, form focus does not auto-zoom, text-selection/callout are suppressed, pinch-zoom
is not claimed blocked because Safari may allow it; VoiceOver announces roster rows, scan
status, result assignment, and admin actions; 60 fps during transitions (Safari Web
Inspector timeline); log export via Files / clipboard.

### 7.4 CI-ready commands
`npm test` runs unit + e2e; `npm run test:unit` and `npm run test:e2e` run each;
`npm run lint` runs Prettier. All must be green before a phase is marked complete.

## 8. Environment & Toolchain

Reproducible from a fresh clone:

```bash
# Prerequisites (dev machine only — NOT the iPad, see §4.1a):
#   Node.js >=22, npm >=10
git clone <repo> && cd check-in-007
npm ci                        # installs exact pinned dev deps from package-lock.json
npx playwright install chromium   # one-time browser download for e2e

npm run serve                 # http://localhost:8080  (localhost = secure context; camera works)
npm run lint                  # Prettier check
npm test                      # unit + e2e
npm run build                 # emits dist/index.html (self-contained)
```

`package.json` scripts:

```json
{
  "engines": { "node": ">=22" },
  "scripts": {
    "serve":     "http-server . -p 8080 -c-1",
    "serve:https":"http-server . -S -C localhost.pem -K localhost-key.pem -p 8443 -c-1",
    "build":     "node scripts/build.mjs",
    "lint":      "prettier --check .",
    "test":      "npm run test:unit && npm run test:e2e",
    "test:unit": "node --test tests/unit",
    "test:e2e":  "playwright test"
  }
}
```

On-site iPad camera testing over the LAN needs HTTPS:

```bash
mkcert -install
mkcert localhost 127.0.0.1 <laptop-LAN-IP>   # produces localhost*.pem
npm run serve:https                          # iPad browses https://<laptop-LAN-IP>:8443
```

Pinned versions live in `package.json` and the committed `package-lock.json`. No runtime
dependencies are installed on the iPad.

## 9. Deployment & Distribution

Two supported distribution modes, both producing the same UX (camera requires a secure
context in either case):

1. **Served (recommended for the live camera).** `npm run build`, then host `dist/` on any
   static HTTPS host (e.g. GitHub Pages, Netlify) or an on-site laptop via `serve:https`.
   The iPad opens the URL in Safari and taps **Share → Add to Home Screen** for a full-
   screen kiosk. `getUserMedia` works because the origin is HTTPS.
2. **Local file.** Copy `dist/index.html` to the iPad and open it from Files. The app boots
   fully and runs the entire flow in **covert mode** (no camera, because `file://` is not a
   secure context). This satisfies "usable locally" while making the camera limitation
   explicit rather than a silent failure.

The build artifact is a single `dist/index.html` with all CSS, JS, subset fonts (base64),
and default roster inlined — no external requests at runtime. Kiosk meta tags (§5 Phase 6)
make the Home-Screen launch full-screen and suppress double-tap zoom/text selection where
Safari allows; the plan does not rely on ignored `user-scalable=no` behavior.

The check-in log lives in that device's `localStorage`; export it from the admin panel at
the end of the night (CSV/JSON via download or clipboard). Because storage is per-origin
and per-device, running two check-in iPads means two logs to merge manually (acceptable for
v1; consolidation is out of scope).

## 10. Defaults & Revisit Triggers

These are hard defaults for v1, not open implementation blockers:

1. **Platform:** build the portable web app, not SwiftUI. Revisit only if the organizer
   explicitly prioritizes native fidelity over file portability and zero install.
2. **Offline story:** `file://` runs in covert mode; live camera requires HTTPS from a
   static host or on-site laptop. Revisit only if a fully offline live-camera iPad is a hard
   requirement.
3. **Roster size:** support ≤500 attendees with direct rendering and indexed search. Revisit
   with list windowing only if the real roster exceeds 500 rows.
4. **Re-check-in:** allow and log repeat guest selections as separate visits with a
   "RE-VERIFYING" note. Revisit only if door policy requires blocking repeats.
5. **Sample data:** ship ~40 themed placeholder guests/tables and expect real data via
   admin CSV import. Revisit only if the organizer wants real data bundled into source.
6. **Sound:** ship silent. Revisit only if the organizer wants an optional user-unlocked
   identification blip.
