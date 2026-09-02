# Check-In 007 — Implementation Plan v11

> Cycle 4 backlog plan. Source item: `BACKLOG.md` Deferred Features item
> "Optional subtle scan \"blip\" audio on identification, gated on a user-gesture unlock
> (§10 Q6)", now marked in progress as `- [/]`.

## 1. Overview

This cycle adds an optional, quiet scan-complete audio cue for event operators using the
kiosk in noisy rooms where the visual result transition can be missed. The sound must
never autoplay on page load, must never request microphone access, and must only play
after the operator has unlocked audio through a trusted gesture. The feature stays
dependency-free and keeps the existing theatrical camera privacy posture intact.

## 2. Scope

### In scope

1. Add a small Web Audio helper that can be constructed lazily, unlocked from a trusted
   user gesture, and asked to play one short scan-identification "blip".
2. Add explicit configuration for audio duration, gain, frequencies, and disabled/default
   state in `src/config.mjs`.
3. Add an admin control to enable or disable the scan blip, persist that preference in
   local storage through the existing store abstraction, and default the preference to
   off for existing installs.
4. Route the first eligible roster selection gesture through audio unlock before entering
   `SCAN`, then trigger playback exactly once when the scan completes and the result is
   about to be shown.
5. Degrade silently when Web Audio is unavailable, blocked, interrupted, suspended, or
   disabled by preference.
6. Preserve the existing camera constraint `{ audio: false }`, avoid media recording, and
   extend privacy probes to prove the feature does not request capture audio.
7. Add unit tests for audio controller state, user-gesture gating, playback scheduling,
   disabled/unavailable behavior, and settings persistence.
8. Add end-to-end coverage that enables the cue, verifies a trusted selection unlock path,
   verifies one scan-complete playback scheduling event, verifies no playback when
   disabled, and keeps the existing axe and privacy expectations green.
9. Document the optional audio setting in the operator README without changing deployment
   requirements.

### Out of scope

- Custom uploaded sounds, volume sliders, multiple cue themes, waveform editors, or
  per-guest audio.
- Autoplay on boot, loading-screen sound, roster hover sound, or admin button sound.
- Microphone access, audio recording, camera-frame capture, `MediaRecorder`, or
  `captureStream`.
- Native SwiftUI iPad build, offline static-HTTPS helper, Node 24 LTS toolchain bump, and
  any network sync.
- A new settings database or schema migration beyond one localStorage preference key.

## 3. Architecture

The app remains a zero-runtime-dependency web app that builds into a single static
artifact. Audio is isolated behind a pure browser adapter so application flow can call
small methods without knowing Web Audio node details.

```text
Admin Controls
  -> Scan blip checkbox
  -> store.saveAudioSettings({ scanBlipEnabled })
  -> localStorage checkin007.audio.v1

Roster guest button trusted click/tap
  -> create visit id
  -> audio.unlockFromGesture()
  -> mountScan()
  -> scan timer completes
  -> audio.playScanBlip()
  -> mountResult()
```

Ownership boundaries:

- `src/lib/audio.mjs` owns Web Audio feature detection, lazy `AudioContext` creation,
  gesture unlock, state tracking, oscillator/gain scheduling, failure suppression, and
  cleanup.
- `src/config.mjs` owns all audio constants; production code must not hard-code cue
  durations, gain, or frequencies outside this file.
- `src/lib/store.mjs` owns persistent audio preference load/save behavior using a new
  `checkin007.audio.v1` key and the existing volatile-memory fallback.
- `src/app.mjs` owns lifecycle wiring: constructing the audio controller, unlocking it
  from the roster selection event, passing settings into admin, and calling playback
  during the scan-complete transition.
- `src/screens/admin.mjs` owns the checkbox UI and status text, but does not instantiate
  Web Audio directly.
- `src/screens/scan.mjs` stays focused on camera display and scan timing. It must keep
  `getUserMedia({ video: { facingMode: 'user' }, audio: false })`.
- `scripts/build.mjs` owns module order. `src/lib/audio.mjs` imports config only and must
  execute after `src/config.mjs` and before `src/app.mjs`; `src/lib/store.mjs` must remain
  before admin/app as it is today.

Failure domains:

- If AudioContext construction or resume fails, the audio controller records
  `available:false`/`unlocked:false`, returns `false`, and the scan flow continues.
- If playback scheduling throws, the error is swallowed by the controller and the app
  proceeds to `RESULT`.
- If storage throws, the existing volatile fallback preserves the setting for the current
  session only.
- If the admin dialog is closed without changing the checkbox, no setting write occurs.

## 4. Technical Decisions & Rationale

1. **Use Web Audio oscillator synthesis instead of an audio file.** MDN documents Web
   Audio as an audio graph built from nodes inside an `AudioContext`
   (https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), and
   `OscillatorNode` is a baseline API for generated periodic waveforms
   (https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode). A synthesized
   two-tone cue adds no asset bytes, no decode latency, and no file-loading failure mode.
   An `<audio>` asset was considered, but it increases the single-file artifact and still
   faces autoplay gating.

2. **Unlock only from a trusted user gesture.** MDN's Web Audio best practices summarize
   modern autoplay policy as creating or resuming an audio context from inside a user
   gesture (https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).
   The roster guest button click/tap is already the operator's intentional check-in
   action, so the app will call `unlockFromGesture()` there before changing state.
   Page-load unlock is explicitly rejected. A later playback-path `resume()` is allowed
   only after the controller has already been unlocked by a trusted roster-selection
   gesture; it is non-awaited and failure-suppressed so it cannot become autoplay on boot
   or block navigation.

3. **Schedule a short envelope with oscillator and gain nodes.** MDN documents
   `createGain()` for controlling gain
   (https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createGain),
   `AudioParam.setValueAtTime()` for precise parameter changes
   (https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setValueAtTime), and
   `setTargetAtTime()` for gradual changes
   (https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime). The
   cue will use one oscillator at 880 Hz, ramp to 1320 Hz halfway through, peak at gain
   `0.045`, and release to silence over 90 ms. The exact automation contract is:
   oscillator frequency `setValueAtTime(880, now)` then
   `linearRampToValueAtTime(1320, now + durationSeconds / 2)`, gain
   `setValueAtTime(0.045, now)`, gain release
   `setTargetAtTime(0, now, SCAN_BLIP_RELEASE_SECONDS)`, oscillator `start(now)`, and
   oscillator `stop(now + durationSeconds)`. This is audible enough for feedback but
   less intrusive than a long chime.

4. **Persist only a boolean preference.** The existing store already handles
   localStorage failures and has no settings subsystem. A single versioned key
   `checkin007.audio.v1` keeps the feature reversible and avoids coupling audio settings
   to roster/log data. A broader settings object was considered, but only one setting is
   in scope and unnecessary expansion would complicate audit.

5. **Keep audio disabled by default.** Browser autoplay rules, event etiquette, and the
   backlog wording "optional" all point to opt-in behavior. Existing installs continue
   silently until an admin enables the cue.

6. **No runtime dependencies.** Web Audio is built into target browsers, and tests can
   mock `AudioContext` in `node:test` and Playwright init scripts. Adding Tone.js or
   Howler.js would increase bundle size and solve problems this cue does not have.

## 5. File Manifest

```text
BACKLOG.md                     (MOD) — Mark the selected scan-audio backlog item in progress.
IMPLEMENTATION_PLAN.md         (MOD) — Replace completed cycle-3 plan with this cycle-4 plan.
src/config.mjs                 (MOD) — Add AUDIO and audio storage-key constants.
src/lib/audio.mjs              (NEW) — Web Audio detection, gesture unlock, playback scheduling, and cleanup.
src/lib/store.mjs              (MOD) — Add load/save audio settings with volatile fallback support.
src/app.mjs                    (MOD) — Wire audio controller into roster selection, scan completion, and admin settings.
src/screens/admin.mjs          (MOD) — Add an opt-in scan-blip checkbox and status handling.
scripts/build.mjs              (MOD) — Include `src/lib/audio.mjs` in the static module list after config.
tests/unit/audio.test.mjs      (NEW) — Unit coverage for unlock, disabled/unavailable states, scheduling, and cleanup.
tests/unit/store.test.mjs      (MOD) — Verify audio settings persistence, default-off behavior, and volatile fallback.
tests/unit/build.test.mjs      (MOD) — Assert the built artifact contains the audio module in a valid dependency order.
tests/e2e/checkin.spec.mjs     (MOD) — Add audio opt-in/disabled workflow coverage and extend privacy probes.
README.md                      (MOD) — Document optional scan audio and its gesture-gated behavior.
```

No production dependency, camera-capture, log-schema, or roster-format changes are
planned.

## 6. Implementation Phases

### Phase 1: Audio Configuration And Store Settings [COMPLETE]

Modify `src/config.mjs`:

```js
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
```

Modify `src/lib/store.mjs`:

```js
export function normalizeAudioSettings(raw) {
  /**
   * Return { scanBlipEnabled: boolean }.
   * Unknown, null, malformed JSON, or missing values return the default-off setting.
   */
  ...
}

return {
  ...
  loadAudioSettings() {
    /**
     * Read STORAGE.AUDIO_KEY from the same active storage backend as roster/log data.
     * Return default-off settings when storage is absent, malformed, or volatile.
     */
    ...
  },
  saveAudioSettings(nextSettings) {
    /**
     * Normalize and persist the boolean audio setting.
     * Return the normalized saved settings.
     */
    ...
  },
};
```

Acceptance criteria:

- Fresh installs and malformed stored settings load `{ scanBlipEnabled: false }`.
- Saving `{ scanBlipEnabled: true }` persists a compact JSON object under
  `checkin007.audio.v1`.
- Existing roster/log storage keys and APIs behave exactly as before.
- Volatile storage mode can save and read the setting during the current session.

### Phase 2: Web Audio Helper [COMPLETE]

Create `src/lib/audio.mjs`:

```js
import { AUDIO } from '../config.mjs';

function defaultAudioContextFactory() {
  const AudioContextConstructor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (typeof AudioContextConstructor !== 'function') {
    throw new Error('Web Audio unavailable');
  }
  return new AudioContextConstructor();
}

export function createScanAudioController({
  audioContextFactory = defaultAudioContextFactory,
  config = AUDIO,
} = {}) {
  /**
   * Return an object with unlockFromGesture(), playScanBlip(), setEnabled(),
   * isEnabled(), getState(), and dispose().
   * The controller lazily creates one AudioContext only after enabled audio receives
   * an unlock attempt from a trusted interaction path.
   */
  ...
}

function scheduleBlip(context, config) {
  /**
   * Create a fresh OscillatorNode and GainNode for each cue.
   * Connect oscillator -> gain -> destination. Convert
   * config.SCAN_BLIP_DURATION_MS to durationSeconds with
   * config.SCAN_BLIP_DURATION_MS / 1000. At context.currentTime, call
   * oscillator.frequency.setValueAtTime(config.SCAN_BLIP_START_HZ, now), then
   * oscillator.frequency.linearRampToValueAtTime(config.SCAN_BLIP_END_HZ,
   * now + durationSeconds / 2). Call gain.gain.setValueAtTime(config.SCAN_BLIP_GAIN,
   * now), then gain.gain.setTargetAtTime(0, now, config.SCAN_BLIP_RELEASE_SECONDS).
   * Start at now and stop at now + durationSeconds.
   * Disconnect nodes on oscillator ended when supported.
   */
  ...
}
```

Controller contract:

- `setEnabled(false)` prevents future context creation and playback.
- Availability is factory-based: the controller is potentially available when
  `audioContextFactory` is a function. The default factory resolves
  `globalThis.AudioContext || globalThis.webkitAudioContext` and throws when neither
  constructor exists; injected mock factories are fully testable without also stubbing
  `globalThis`.
- `unlockFromGesture()` returns `false` without side effects when disabled or when
  `audioContextFactory` is not a function.
- `unlockFromGesture()` creates/resumes the context only when enabled. If context state is
  `suspended`, it awaits `context.resume()`. If state is `running`, it marks unlocked.
- `unlockFromGesture()` is idempotent across repeated roster selections: after the
  controller is already unlocked and the context is `running`, a later call re-marks the
  controller unlocked and returns `true` without creating another context or calling
  `resume()` again.
- Constructor failure marks the controller unavailable for the session and returns
  `false` from future unlock/play calls.
- `playScanBlip()` returns `false` when disabled, unavailable, not unlocked, closed, or
  disposed. When an already-unlocked context is `suspended` or `interrupted`, it starts a
  guarded non-awaited `context.resume()` attempt, skips the current cue, and allows a
  later scan-complete call to play if the browser resumes the context.
- `playScanBlip()` creates new oscillator/gain nodes for each successful cue because
  scheduled source nodes are one-shot.
- `dispose()` disconnects known nodes, closes the context when it was created by this
  controller and `close()` exists, and makes later calls no-ops.
- All public methods catch Web Audio exceptions and return boolean state instead of
  throwing into UI flow.

Acceptance criteria:

- A mocked running AudioContext records exactly one oscillator start/stop pair per
  successful scan-complete call.
- A mocked suspended context receives `resume()` during unlock.
- Disabled, unavailable, closed, not-unlocked, suspended, and interrupted states schedule
  no nodes.
- A mocked suspended/interrupted context after prior unlock records one non-awaited
  resume attempt during `playScanBlip()` and schedules no cue for that call.
- Repeated successful scan completions create separate oscillator instances and do not
  reuse a stopped source node.

### Phase 3: App And Admin Integration [COMPLETE]

Modify `src/app.mjs`:

```js
import { createScanAudioController } from './lib/audio.mjs';

export function start(root = document.getElementById('app')) {
  const store = createStore();
  const audio = createScanAudioController();
  audio.setEnabled(store.loadAudioSettings().scanBlipEnabled);

  function updateAudioSettings(nextSettings) {
    /**
     * Persist normalized settings through store.saveAudioSettings(), update the audio
     * controller enabled flag, and return saved settings for admin status rendering.
     */
    ...
  }

  ...
  onSelect: (guestId) => {
    /**
     * Preserve visit-id creation and state transition semantics.
     * Create the visit id first as today, then call audio.unlockFromGesture()
     * synchronously from this trusted click path before setState('SCAN'). Do not await it
     * before navigation because mountRoster does not await onSelect; the audio helper
     * handles any resume promise internally.
     * Unlock failure must not block scan.
     */
    ...
  }
  ...
  onAdminHold: () => {
    if (state !== 'ROSTER' || adminCleanup) return;
    adminCleanup = mountAdmin(root, {
      store,
      audioSettings: store.loadAudioSettings(),
      onAudioSettingsChanged: updateAudioSettings,
      onRosterChanged: (nextGuests) => {
        guests = buildSearchIndex(nextGuests);
      },
      onClose: () => {
        adminCleanup = null;
        setState('ROSTER');
      },
    });
  },
  ...
  if (state === 'SCAN') {
    cleanup = mountScan(root, {
      guest,
      timing,
      onDone: () => {
        audio.playScanBlip();
        setState('RESULT', { guest });
      },
    });
  }
}
```

Modify `src/screens/admin.mjs`:

```js
export function mountAdmin(root, {
  store,
  audioSettings = { scanBlipEnabled: false },
  onAudioSettingsChanged = (settings) => settings,
  onRosterChanged,
  onClose,
}) {
  /**
   * Render a checkbox labeled "Scan blip audio".
   * Normalize the received audioSettings inline with
   * `{ scanBlipEnabled: audioSettings?.scanBlipEnabled === true }` before any dereference
   * so direct mounts or omitted params default off instead of throwing. Do not import
   * store.normalizeAudioSettings into this screen; store remains responsible for
   * persisted shape normalization, while admin only needs a defensive UI boolean.
   * Initialize checked from normalizedAudioSettings.scanBlipEnabled.
   * On change, call onAudioSettingsChanged({ scanBlipEnabled: checked }) and announce
   * "Scan blip audio enabled." or "Scan blip audio disabled." in the existing status
   * live region.
   */
  ...
}
```

Admin UI contract:

- Add one checkbox, not a button-only toggle, because this is a persistent binary
  setting.
- The checkbox appears in the existing admin panel after the existing `.merge-panel` and
  before the `.admin-grid` action buttons, keeping it near operational controls without
  moving roster import/export/reset actions.
- No visible instructional paragraph is added; the label is enough for the control.
- Closing admin preserves focus restoration and does not alter the audio setting.
- Existing roster import, log merge, export/copy, reset, and clear-log actions are
  unchanged.

Acceptance criteria:

- Enabling audio in admin persists the setting and updates the live controller without
  reloading.
- Disabling audio prevents later scan-complete playback even if a context was previously
  unlocked.
- Selecting a guest still creates exactly one visit id and logs exactly once.
- Scan completion still transitions to result when audio unlock or playback fails.

### Phase 4: Build, Tests, Documentation [COMPLETE]

Modify `scripts/build.mjs` by inserting `src/lib/audio.mjs` immediately after
`src/config.mjs`. This ensures `AUDIO` is available before the audio module runs, while
keeping store, screens, and app after their dependencies.

Modify `tests/unit/build.test.mjs` to assert:

- `window.__CHECKIN007.modules.src_lib_audio` appears after
  `window.__CHECKIN007.modules.src_config`.
- `src_app` aliases `window.__CHECKIN007.modules.src_lib_audio.createScanAudioController`.
- no residual module syntax remains in the generated artifact.

Modify `tests/e2e/checkin.spec.mjs`:

- Extend the existing privacy probe to count `getUserMedia` audio constraints and assert
  every request keeps `audio === false`.
- Add a test with mocked `AudioContext`:
  1. boot to roster,
  2. open admin,
  3. check "Scan blip audio",
  4. close admin,
  5. select a guest,
  6. verify one unlock/resume attempt happened from the selection flow,
  7. verify one oscillator start/stop pair after scan completes,
  8. verify the check-in log still has one row.
- Add a disabled-path test with the same mock proving a normal scan schedules no audio
  when the setting remains default-off.

Modify `README.md` with a concise note that scan audio is optional, admin-enabled,
gesture-gated by the first guest selection, synthesized locally with Web Audio, and does
not request microphone access.

## 7. Integration Points

1. **Admin checkbox -> store**
   - Contract: checkbox state maps to `{ scanBlipEnabled: boolean }`.
   - Failure mode: storage exceptions fall back to volatile memory; status still reports
     the normalized setting.
   - Migration path: missing `checkin007.audio.v1` defaults off, so existing events are
     unchanged.

2. **Store -> app audio controller**
   - Contract: app reads settings on start and calls `audio.setEnabled(boolean)`.
   - Failure mode: malformed settings normalize to off; audio controller remains idle.
   - Migration path: roster/log keys and exported data are untouched.

3. **Roster selection -> audio unlock**
   - Contract: `mountRoster` invokes `onSelect` directly from a trusted button event; app
     creates the visit id as it does today, then calls `audio.unlockFromGesture()`
     synchronously in that same call stack before moving to scan. The helper may continue
     an internal resume promise without blocking navigation.
   - Failure mode: unlock returns false or throws internally; app still enters scan.
   - Migration path: existing selection behavior and visit-id generation are preserved.

4. **Scan completion -> result**
   - Contract: scan timer calls `onDone`; app calls `audio.playScanBlip()` immediately
     before `setState('RESULT')`.
   - Failure mode: playback returns false; result screen still appears and logging remains
     idempotent in the `RESULT` state.
   - Migration path: `mountScan` timing API remains compatible.

5. **Build transform**
   - Contract: imported modules are listed earlier in `scripts/build.mjs`; audio imports
     only `config`.
   - Failure mode: wrong order produces undefined namespace aliases in `dist/index.html`.
   - Migration path: build unit assertions catch ordering regressions.

6. **Privacy surface**
   - Contract: camera access remains video-only and no audio capture APIs are used.
   - Failure mode: a regression that requests `getUserMedia({ audio: true })`, calls
     `captureStream`, or constructs `MediaRecorder` fails e2e privacy tests.
   - Migration path: existing privacy probes are extended rather than replaced.

## 8. Error Handling & Edge Cases

- **Web Audio unavailable:** the default `audioContextFactory` throws on first
  construction when neither `AudioContext` nor `webkitAudioContext` exists. Injected
  factories are treated as the availability source for tests. Constructor failure marks
  the controller unavailable for the session and returns false from unlock/play.
- **Audio disabled:** controller does not create a context, unlock, or schedule nodes.
- **AudioContext constructor throws:** unlock catches the error, marks unavailable for the
  session, and scan continues.
- **Suspended context:** unlock awaits `resume()`; if resume rejects, unlocked remains
  false and later playback is skipped. If a previously unlocked context becomes suspended
  before playback, `playScanBlip()` starts a guarded non-awaited `resume()` and skips that
  cue instead of blocking result navigation.
- **Interrupted context:** playback checks `context.state`; if it is `interrupted`, it
  starts the same guarded non-awaited `resume()` attempt when available, skips scheduling,
  and lets a future scan play after recovery. The cue for the scan that encountered
  `interrupted` is intentionally skipped because waiting for resume would delay result
  navigation and could violate autoplay policy on browsers that reject the resume.
- **Closed context:** playback skips, and repeated calls do not try to use closed nodes.
- **Repeated scans:** each successful playback creates new oscillator/gain nodes and
  disconnects them on end when possible.
- **Admin toggled off after unlock:** `setEnabled(false)` suppresses future playback and
  may suspend the context when `suspend()` is available; failure to suspend is ignored.
- **Admin toggled on but no scan yet:** no sound plays until the next scan completion.
- **Reduced motion:** reduced timing shortens screen durations as today; audio duration is
  unchanged because it is already 90 ms and not a visual animation.
- **Multiple rapid selections:** existing state gating prevents roster interaction while
  in scan; audio controller also avoids parallel cue reuse by creating per-cue nodes.
  Repeated eligible selections across a normal session may call `unlockFromGesture()`
  again, but an already-unlocked running context is treated as a safe no-op and does not
  create a second context or churn `resume()` calls.
- **Storage malformed:** settings normalize to default off and overwrite only when admin
  explicitly changes the checkbox.
- **File URL build:** Web Audio may be available from `file://`; camera may not be. The
  audio feature must not depend on secure camera context and must still degrade if blocked.

## 9. Stability & Performance

The hot path is constant-time. Unlock creates at most one `AudioContext` for the app
session. Each successful cue creates one oscillator and one gain node, schedules a handful
of AudioParam events, starts immediately, and stops after 90 ms.

- Time complexity per cue: `O(1)`.
- Memory growth: `O(1)` steady state. The controller keeps only the context, enabled
  state, and a small set of active nodes until they end.
- Artifact size impact: expected below 3 KB gzip because no binary audio asset or runtime
  dependency is added. `npm run build` must remain under the existing 750 KB gzip and
  1.2 MB uncompressed budgets.
- Startup impact: zero AudioContext construction on boot when default off; when enabled,
  the context still waits for the first selection gesture.
- Latency target: playback scheduling must occur synchronously during scan completion and
  add less than one animation frame of JavaScript work before `RESULT`.
- Cleanup: `dispose()` closes or suspends owned context where supported; per-cue nodes
  disconnect on end. App-level cleanup does not need to dispose the global controller
  between screens.
- Degradation: any audio failure is non-fatal and never blocks camera startup, scan
  timing, result display, check-in logging, or admin operations.

## 10. Testing Strategy

Unit tests:

- `tests/unit/audio.test.mjs`
  - default controller is disabled and does not construct AudioContext.
  - enabled controller unlocks a running context from `unlockFromGesture()`.
  - suspended context calls and awaits `resume()`.
  - unavailable constructor/default factory returns false and schedules no nodes; injected
    mock factories work without stubbing `globalThis.AudioContext`.
  - `playScanBlip()` before unlock returns false.
  - successful playback creates oscillator/gain, connects oscillator -> gain ->
    destination, calls the exact frequency/gain automation sequence from §4.3, and
    schedules start/stop exactly once.
  - successful playback converts `SCAN_BLIP_DURATION_MS` to seconds with
    `SCAN_BLIP_DURATION_MS / 1000`, then uses that value for
    `now + durationSeconds / 2` and `now + durationSeconds`.
  - suspended/interrupted state after unlock starts one non-awaited resume attempt during
    playback and schedules no oscillator for that skipped cue.
  - repeated successful playback creates two oscillator instances.
  - disabled-after-unlock suppresses playback.
  - thrown constructor/resume/scheduling errors are caught.
  - `dispose()` prevents future playback and calls `close()` when available.
- `tests/unit/store.test.mjs`
  - fresh settings load default off.
  - malformed settings load default off.
  - saving true and false round-trips under `checkin007.audio.v1`.
  - volatile fallback can still read the saved setting.
  - existing roster/log tests continue to pass.
- `tests/unit/build.test.mjs`
  - audio module ordering and app alias assertions described in Phase 4.

End-to-end tests:

- Existing boot/search/scan/result/privacy test additionally asserts `getUserMedia` was
  never called with `audio: true`.
- New enabled-audio workflow:
  - install an init-script mocked `AudioContext` with counters for constructor,
    unlock-phase resume, playback-phase resume, oscillator creation, gain creation,
    start, stop, and connection calls. The mock context starts in `suspended`, and its
    `resume()` implementation changes state to `running`, so the unlock-phase resume
    assertion is load-bearing and deterministic.
  - open admin, enable "Scan blip audio", close admin.
  - select a guest and wait for result.
  - assert one context construction, one unlock/resume-attempt counter increment from
    `unlockFromGesture()` during the roster selection path, zero playback-path resume
    attempts while the mock remains running, one oscillator start, one oscillator stop,
    and one stored check-in. The test mock distinguishes unlock from playback by counting
    `resume()` before the first oscillator creation as unlock-phase and counting
    `resume()` after that point as playback-phase.
- New disabled-audio workflow:
  - use the same mock with default settings.
  - select a guest and wait for result.
  - assert zero context constructions and zero oscillator starts.
- Existing admin accessibility smoke remains axe-green with the new checkbox visible.

Regression commands:

```bash
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

## 11. Environment & Toolchain

Fresh clone setup remains unchanged:

```bash
npm ci
npm run build
npm run test
```

Toolchain remains `node >=22` as declared in `package.json`, with current dev
dependencies `@playwright/test`, `acorn`, `axe-core`, `http-server`, and `prettier`.
No new npm packages or browser permissions are required.

Browser APIs used:

- `AudioContext` / `webkitAudioContext`
- `AudioContext.resume()`, `suspend()`, `close()`, `currentTime`, and `state`
- `createOscillator()`, `createGain()`
- `AudioParam.setValueAtTime()` and `setTargetAtTime()`

## 12. Deployment & Distribution

Distribution remains the existing static artifact:

```bash
npm run build
```

The generated `dist/index.html` continues to run from HTTPS for live camera access and
from `file://` for non-camera fallback. The optional audio cue uses only local browser
APIs and does not require a server, network, microphone permission, or additional
assets.

Rollback procedure:

1. Revert the implementation commit for this cycle.
2. Rebuild with `npm run build`.
3. Existing `checkin007.audio.v1` settings become unused data and do not affect older
   code. Roster and log storage remain valid because their keys and formats are unchanged.

## 13. Open Questions

1. **Should the cue be enabled by default for new events?** Proposed resolution: no.
   Default-off matches the backlog's "optional" wording and browser/user expectations.
   Confirmation would require operator usability feedback after this cycle ships.
2. **Should volume be user-adjustable?** Proposed resolution: no for this cycle. A single
   conservative gain avoids UI scope creep. Add a future backlog item only if operators
   report the cue is too quiet or too loud in real venues.
3. **Should the audio context be closed when disabled or only suspended?** Proposed
   resolution: disable suppresses playback and attempts `suspend()`; `dispose()` closes
   on app teardown/test cleanup. This avoids re-unlock churn during one session while
   still making tests deterministic.
