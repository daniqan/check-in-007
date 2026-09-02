# Check-In 007 — Implementation Plan Critique (Cycle 4: Scan Blip Audio)

**Plan Score:** **93/100**
**Implementation Score:** N/A (plan not yet approved)
**Status:** **NOT APPROVED** (≥95 gate not cleared — State 1, revise plan)

---

## Plan Critique — Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `c6c9151`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v8
**Score:** **93 / 100** (first review of the cycle-4 plan)
**Status:** NOT APPROVED — three mechanically-fixable gaps below the gate.

Plan v8 is a strong, well-scoped opening draft for the optional scan "blip" audio cue.
It correctly isolates Web Audio behind a pure adapter (`src/lib/audio.mjs`), keeps the
feature dependency-free and default-off, gates unlock on the existing trusted
roster-selection gesture, and preserves the flagship camera-privacy posture
(`{ audio: false }`, no `MediaRecorder`/`captureStream`). Scope is correct — it addresses
the one in-progress backlog item and defers the three unrelated subsystems. It falls just
short of the ≥95 gate on one genuine feasibility/testability gap in the core module plus
two smaller specificity gaps in the app/admin wiring.

Every factual claim about the current code was verified against source:
- `mountRoster` invokes `onSelect` synchronously from a trusted `click` listener
  (`src/screens/roster.mjs:146-151`) — the §4.2/§7.3 gesture-unlock path is valid.
- `mountScan`'s `onDone` fires from a `setTimeout` (`src/screens/scan.mjs:62`), **not** a
  gesture — so playback-after-unlock (§4.2) is the correct model.
- `mountAdmin` currently takes `{ store, onRosterChanged, onClose }`
  (`src/screens/admin.mjs:34`); the plan's added params are net-new.
- The build transform only supports **named** imports and rejects side-effect imports
  (`scripts/build.mjs:64-76`); `audio.mjs` imports `{ AUDIO }` only — compatible.
- `namespaceFor('src/lib/audio.mjs')` = `src_lib_audio` and `namespaceFor('src/app.mjs')`
  = `src_app` — the Phase-4 build-test alias assertions name the right namespaces.
- Placing `src/lib/audio.mjs` immediately after `src/config.mjs` in the `modules` array
  (`scripts/build.mjs:7-21`) satisfies its only dependency (config) before it runs.

## Remaining issues

1. **Availability detection vs. the injected `audioContextFactory` is ambiguous and
   internally inconsistent (BLOCKING).**
   Phase 2 documents `audioContextFactory` as the test-injection seam
   (`IMPLEMENTATION_PLAN.md:236`), yet §8 (line 448) and the Phase-2 contract (lines
   262-264) say `createScanAudioController()` "detects no `AudioContext` or
   `webkitAudioContext`, marks unavailable" — i.e. detection keys off `globalThis`. If
   availability is derived from `globalThis`, then a unit test that injects a mock
   `audioContextFactory` **without** also stubbing `globalThis.AudioContext` is marked
   unavailable and the injected factory is never called — which makes the documented seam
   non-functional and directly breaks the Phase-2 / §10 unit tests ("enabled controller
   unlocks a running context", "suspended context calls `resume()`", "unavailable
   constructor returns false"). The two mechanisms as written conflict.
   *Fix:* Pick one detection model and state it explicitly. Cleanest: availability is a
   property of the **factory** — `available` is true when `audioContextFactory` is a
   function (the default factory internally resolves `globalThis.AudioContext ||
   webkitAudioContext` and the controller marks unavailable if construction throws on
   first use inside try/catch). Then the "unavailable" unit test injects a factory that
   throws (or a default factory with both globals deleted), and the "running/suspended"
   tests inject a working mock factory — no `globalThis` stubbing required. Update §8's
   "detects no `AudioContext`" wording to match.

2. **The app→admin wiring for audio settings is defined but never shown being connected
   (specificity).**
   Phase 3 defines `updateAudioSettings` (lines 298-305) and an admin signature that takes
   `audioSettings` + `onAudioSettingsChanged` (lines 334-340), but the app.mjs snippet
   (lines 288-329) does not show the `mountAdmin(...)` call — currently
   `{ store, onRosterChanged, onClose }` at `src/screens/admin.mjs:34` / `src/app.mjs:47`
   — being updated to pass `audioSettings: store.loadAudioSettings()` and
   `onAudioSettingsChanged: updateAudioSettings`. As written, an implementer following the
   literal snippet would wire `updateAudioSettings` to nothing. Show the updated
   `mountAdmin` call inside `onAdminHold`.

3. **`mountAdmin` gains parameters with no specified default/guard (omission).**
   The new signature (lines 334-340) reads `audioSettings` and dereferences
   `audioSettings.scanBlipEnabled`. If `audioSettings` is ever `undefined` (a direct
   mount, or a future call site that forgets it) this throws and takes down the admin
   dialog. Specify a default — `audioSettings = { scanBlipEnabled: false }` — or normalize
   it through the store's `normalizeAudioSettings` at the top of `mountAdmin`.

4. **No re-`resume()` attempt in the playback path; likely silent on the primary target
   (omission / effectiveness).**
   The controller deliberately skips playback when the context is `suspended`/`interrupted`
   (lines 268-269, 453-457). But there is a ~4.5 s gap between the unlock gesture
   (`SCAN_MS`, `src/config.mjs:3`) and the `playScanBlip()` call, and iOS/iPadOS Safari —
   the stated kiosk target — routinely transitions an unlocked context to
   `interrupted`/`suspended` during that window. With skip-only behavior the cue will
   frequently never fire on exactly the device this feature targets. Since the context was
   already user-unlocked earlier in the session, a **non-awaited** `context.resume()`
   inside `playScanBlip()` before scheduling (still wrapped in try/catch, still
   degrading silently if it rejects) is generally permitted post-unlock and would make the
   cue reliable. At minimum, acknowledge the tradeoff explicitly; preferably add the guarded
   resume attempt.

5. **§3 flow diagram and §6 `onSelect` disagree on ordering (cosmetic).**
   The §3 diagram (lines 64-71) shows `unlockFromGesture()` → `create visit id` →
   `mountScan()`, while the §6 `onSelect` comment (lines 307-316) preserves visit-id
   creation and only requires the unlock call "before `setState('SCAN')`" without pinning
   its position relative to visit-id creation. Harmless, but state one canonical order.

## Scope Check

- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` (v15)
  reports all Required Actions #1–#8 DONE and **zero open defects**. Nothing is left
  unaddressed for this plan to pick up.
- **Backlog items in scope but not addressed:** None mis-scoped. This plan addresses the
  in-progress item ("Optional subtle scan blip audio", `BACKLOG.md:9`, `[/]`). The three
  remaining `- [ ]` items — native SwiftUI, offline-static-HTTPS helper, Node 24 bump —
  are independent subsystems correctly deferred (§2 Out of scope, lines 48-49).
- **Integration points analyzed:** Yes — §7 enumerates six contracts (admin→store,
  store→controller, selection→unlock, scan→result, build transform, privacy surface) each
  with failure mode and migration path.
- **Alternatives considered:** Yes — §4 justifies oscillator-synthesis over an `<audio>`
  asset, boolean-only persistence over a settings object, and no runtime deps over
  Tone.js/Howler.js.
- **Score cap applied:** None. Scope is adequate; the score reflects execution
  specificity, not scope.

## Flaws of Commission

1. The availability-detection / factory-injection conflict (Remaining issue #1) is the one
   true commission flaw — as written the two mechanisms contradict, and the described unit
   tests cannot be authored against the literal contract without resolving it.

No other flaws of commission identified: the config constants, storage-key versioning
(`checkin007.audio.v1`), per-cue node creation (one-shot sources), `dispose()` ownership
(close only self-created contexts), and the build-order placement are all correct.

## Flaws of Omission

1. Admin `audioSettings` default/guard missing (Remaining issue #3).
2. No playback-path re-`resume()` for the auto-suspend case on the target device
   (Remaining issue #4).
3. The plan does not state where in the admin panel the checkbox is inserted relative to
   the existing `.merge-panel` / `.admin-grid` DOM (`src/screens/admin.mjs:40-64`) — "near
   operational controls" (line 357) is directionally clear but not a concrete insertion
   point. Minor.

## Regressions

No regressions identified. Verified:
- Artifact-size budget: the added module is expected < 3 KB gzip (§9), well within the
  ≤750 KB gzip / ≤1.2 MB budget already enforced at `scripts/build.mjs:135-140`.
- `onSelect` gains `audio.unlockFromGesture()` but unlock failure is caught internally and
  must not block scan (§7.3) — selection/visit-id semantics preserved.
- `mountScan` `onDone` gains `audio.playScanBlip()` before `setState('RESULT')`; all
  public audio methods catch and return booleans (lines 274-275), so the RESULT
  transition and idempotent logging (`src/app.mjs:66-75`) are unaffected.
- Camera privacy: §2/§6/§7.6 keep `{ audio: false }` and extend (not replace) the existing
  privacy probes.

## Why 93 and not 94

The availability-detection ambiguity (#1) is not cosmetic — it sits in the core new module
and, as written, blocks the very unit tests the plan enumerates. Combined with the
unconnected app→admin wiring (#2) it means a competent developer following the literal
plan would produce a controller whose test seam does not work and an admin control wired to
nothing. Those two require a decision, not just judgment, which is what keeps this out of
the ≥95 band.

## Path to ≥95

Address all of the following in one revision pass:

1. **Resolve the availability/factory detection model (Remaining issue #1)** — pick the
   factory-based model, update the Phase-2 contract and §8 wording so the unit tests are
   authorable as described.
2. **Show the updated `mountAdmin(...)` call (Remaining issue #2)** passing `audioSettings`
   and `onAudioSettingsChanged` from within `onAdminHold`.
3. **Specify the `audioSettings` default/guard in `mountAdmin` (Remaining issue #3).**

Doing 1–3 clears the gate (expected ~96). Also folding in #4 and #5 would land 97–98.

## Path to 100

- Add the guarded non-awaited `resume()` in `playScanBlip()` for the iOS auto-suspend case,
  or explicitly document why skip-only is acceptable on the kiosk target (#4).
- Pin the checkbox's exact DOM insertion point in the admin panel (Omission #3).
- Reconcile the §3-diagram vs §6 unlock/visit-id ordering (#5).
- Specify the exact `AudioParam` automation for the 90 ms envelope (attack at
  `setValueAtTime`, release via `setTargetAtTime` with `SCAN_BLIP_RELEASE_SECONDS`, and the
  880→1320 Hz sweep via `setValueAtTime`/`linearRampToValueAtTime`) so the "sets configured
  frequencies/gain … schedules start/stop exactly once" unit assertion (§10, lines 504-506)
  has an unambiguous target — the plan names the config values but not the exact call
  sequence.
- State how the e2e mock distinguishes an "unlock/resume attempt" from later calls so the
  "one unlock/resume attempt" assertion (§6 Phase 4, line 396) is precise.

## Summary

A genuinely strong first-draft plan — correct scope, clean adapter isolation, privacy
posture intact, alternatives and integration well documented. It is three
mechanically-fixable changes away from approval: resolve the availability-vs-factory
detection model, connect the app→admin audio-settings wiring in the snippet, and give
`mountAdmin`'s new `audioSettings` param a default. Not approved at 93; a single focused
revision should clear ≥95.
