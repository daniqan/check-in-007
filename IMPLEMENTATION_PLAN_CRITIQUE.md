# Check-In 007 — Implementation Plan Critique (Cycle 4: Scan Blip Audio)

**Plan Score:** **99/100**
**Implementation Score:** **98/100**
**Status:** **VERIFIED** (implementation ≥95 gate cleared — State 4, cycle complete)

---

## Implementation Verification — v5

**Plan:** `IMPLEMENTATION_PLAN.md` v11 @ approved commit `b2178c2` (approved score: 99/100, Rev 4)
**Code:** commit `b63a8ff` ("feat(audio): implement scan blip cue", 13 files) audited on 2026-09-02
**Note:** Plan v11 is unchanged since the Rev-4 approval; per the version-check rule it was **not**
re-critiqued (that would be an empty critique). The generator has implemented the approved plan
(State 2 → verification), so this run performs the Mode-2 implementation audit instead.

Every plan section was walked against the landed code and confirmed by execution — not by reading
comments. All four regression commands were re-run to completion:

- `npm run lint` → **clean** (`prettier --check .`, all files formatted).
- `npm run test:unit` → **52/52 pass** (was 38 pre-cycle; +14 audio/store assertions).
- `npm run test:e2e` → **12/12 pass** (was 10; +2 scan-blip workflows).
- `npm run build` → `dist/index.html` **26,315 gzip bytes** (was 24,660; +~1.65 KB, within the
  §9 "<3 KB gzip" estimate and far under the ≤750 KB gzip / ≤1.2 MB budget).

| Section | Status | Notes |
|---------|--------|-------|
| §Phase 1 — config `AUDIO`/`AUDIO_KEY` | COMPLIANT | `config.mjs:8-21` matches the plan block byte-for-byte (default-off, gain `0.045`, 880→1320 Hz, 90 ms, release `0.035`s; `AUDIO_KEY: 'checkin007.audio.v1'`). |
| §Phase 1 — store settings | COMPLIANT | `store.mjs` adds `normalizeAudioSettings` (JSON-parse-safe, `=== true` coercion, default-off), `loadAudioSettings`, `saveAudioSettings` (compact `{"scanBlipEnabled":true}`), volatile-fallback key seeded. Unit-verified (3 new store tests: default/malformed off, round-trip under versioned key, volatile read). |
| §Phase 2 — `src/lib/audio.mjs` | COMPLIANT | Factory-based availability (`typeof audioContextFactory === 'function'`); lazy single-context `getContext()`; gesture unlock with suspended→`await resume()`→running; **idempotent** repeated unlock (no second context, `resumeCalls === 0` on the second call — the folded Path-to-100 test); guarded **non-awaited** playback resume on `suspended`/`interrupted`; per-cue oscillator/gain; `dispose()` closes owned context. All public methods catch and return booleans. |
| §4.3 exact automation | COMPLIANT | Unit test asserts the literal call order + args: `connect`→`connect`, `frequency.setValueAtTime(880,12)`, `linearRampToValueAtTime(1320,12.045)`, `gain.setValueAtTime(0.045,12)`, `setTargetAtTime(0,12,0.035)`, `start(12)`, `stop(12.09)` (`audio.test.mjs:156-165`). `durationSeconds = 90/1000 = 0.09` confirmed. |
| §Phase 3 — app wiring | COMPLIANT | `app.mjs` constructs the controller, `setEnabled(loadAudioSettings().scanBlipEnabled)` on start; `onSelect` creates the visit id then calls `audio.unlockFromGesture()` (non-awaited) before `setState('SCAN')`; scan `onDone` calls `audio.playScanBlip()` then `setState('RESULT')`; `updateAudioSettings` persists + re-`setEnabled`. Matches §6 snippet + §7 contracts. |
| §Phase 3 — admin UI | COMPLIANT | Checkbox inserted after `.merge-panel` `</section>` and before `.admin-grid` (plan's exact insertion point); inline normalization `audioSettings?.scanBlipEnabled === true` (does not import `store.normalizeAudioSettings`); change handler persists via `onAudioSettingsChanged`, re-syncs `checked` to saved value, announces "Scan blip audio enabled./disabled." in the existing live region. CSS `.audio-setting` added. |
| §Phase 4 — build order | COMPLIANT | `src/lib/audio.mjs` inserted immediately after `src/config.mjs` in `build.mjs` `modules`. Build test asserts `src_config` < `src_lib_audio` < `src_app`, the `const AUDIO = …src_config.AUDIO` alias, and the `src_app` `createScanAudioController` alias. |
| §Phase 4 — e2e | COMPLIANT | Init-script `MockAudioContext` (starts `suspended`, `resume()`→`running`) with unlock/playback-resume counters keyed off first-oscillator creation. Enabled workflow asserts `constructions:1, unlockResume:1, playbackResume:0, oscillators:1, gains:1, starts:1, stops:1, connections:2, checkins:1`. Disabled workflow asserts `constructions:0, starts:0, checkins:1`. Both pass. |
| §Phase 4 — privacy probe | COMPLIANT | Extended probe records every `getUserMedia` `audio` constraint and asserts `audioConstraints.length > 0 && every(=== false)`; `scan.mjs:40` still `audio: false`; `toDataURL`/`captureStream`/`MediaRecorder` all 0; tracks `ended`. Test-enforced. |
| §Phase 4 — README | COMPLIANT | "Optional Scan Audio" section documents admin-enabled, gesture-gated, locally-synthesized, no-microphone behavior. |

### Regression detection

- **Behavioral:** all prior unit + e2e specs still green (52/52, 12/12). No previously-passing test now fails.
- **Performance/artifact:** +~1.65 KB gzip; hot path stays O(1) per cue. No new blocking calls on navigation (playback resume is non-awaited).
- **API/contract:** `mountAdmin`'s new params are additive with safe defaults; `store` gains two methods without changing existing keys/shapes; `onSelect`/visit-id/`RESULT` semantics preserved.
- **Coverage:** test suite grew (38→52 unit, 10→12 e2e). No coverage regression.
- **Privacy invariant:** magic-number grep for audio constants outside `config.mjs`/`audio.mjs` → **none**; camera constraint unchanged. No silent regression.

**Implementation Score:** 98/100

## Defects

No gate-blocking defects. Implementation is COMPLIANT across every section and clears the ≥95 gate → **VERIFIED**. Two non-blocking Path-to-100 nits remain (do not require a fix cycle; fold opportunistically if the file is next touched):

1. **Enabled-audio e2e runs in covert mode.** `installAudioMock` sets `navigator.mediaDevices = undefined`, so the enabled-cue e2e exercises the audio path with the camera absent (covert scan) rather than alongside a live camera stream. The audio flow is independent of camera state and the disabled/enabled cue counters are exact, so coverage is sound — but a maximally thorough test would fire the cue with a granted camera to prove the two subsystems coexist. Cosmetic.
2. **No enable→disable→scan e2e.** The unit suite proves `disabled-after-unlock` suppresses playback and attempts `suspend()`; e2e proves enabled-plays-once and default-off-silent, but not the admin round-trip of enabling, disabling, then scanning silently. The unit coverage makes this low-value, but it is the one behavioral combination not asserted end-to-end.

## Summary

Plan v11 (approved 99/100) is **implemented and VERIFIED at 98/100** in commit `b63a8ff`. Every
plan section is COMPLIANT, confirmed by execution: lint clean, 52/52 unit, 12/12 e2e, build 26,315
gzip bytes within budget with the verified module order `src_config` < `src_lib_audio` < `src_app`
and both namespace aliases wired. The exact §4.3 AudioParam automation is unit-asserted to the
literal call sequence; unlock idempotency (the last Rev-3/Rev-4 Path-to-100 nit) was folded into
`tests/unit/audio.test.mjs` as recommended; camera privacy is preserved and test-enforced. No
regressions. Loop reaches **State 4 — cycle complete**. Two cosmetic e2e-coverage nits remain
(Path-to-100 only). See `CONSOLIDATED_AUDIT.md` v20.

---

## Plan Critique — Revision 4

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `b2178c2`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v11
**Score:** **99 / 100** (previous: 99 — Rev 3)
**Status:** APPROVED — the single Rev-3 Path-to-100 nit (unlock idempotency) is now stated
explicitly; one equally-cosmetic test-coverage nit takes its place, so the score holds at 99.

Plan v11 is a two-hunk, documentation-only follow-up to the already-approved v10. It does not
touch scope, architecture, or any gate-blocking mechanism — it closes the exact Path-to-100
item Rev 3 listed. Re-reviewed under the staleness rule (v11 > the v10 that Rev 3 critiqued).
The plan remains implementation-ready, correctly scoped to the one in-progress backlog item,
dependency-free, default-off, and privacy-preserving (`{ audio: false }`, no
`MediaRecorder`/`captureStream`).

The v10→v11 diff (two hunks) and its correctness:

1. **`unlockFromGesture()` idempotency stated in the Phase-2 contract — RESOLVED (was the sole
   Rev-3 Path-to-100 nit / Omission).** The controller contract now reads: "`unlockFromGesture()`
   is idempotent across repeated roster selections: after the controller is already unlocked and
   the context is `running`, a later call re-marks the controller unlocked and returns `true`
   without creating another context or calling `resume()` again" (lines 293-296). This is exactly
   the one-line statement Rev 3 asked for, and it is consistent with the pre-existing contract "if
   state is `running`, it marks unlocked" (line 292).

2. **§8 "Multiple rapid selections" idempotency footnote — RESOLVED (same nit, second location).**
   §8 now adds: "Repeated eligible selections across a normal session may call
   `unlockFromGesture()` again, but an already-unlocked running context is treated as a safe no-op
   and does not create a second context or churn `resume()` calls" (lines 533-535). The two
   statements agree; the behavior is a safe no-op, so it introduces no logic risk.

Source re-verified for this revision (no source has changed since the v15 landing `3168a28`):
`mountAdmin(root, { store, onRosterChanged, onClose })` (`admin.mjs:31`) confirms
`audioSettings`/`onAudioSettingsChanged` remain net-new; `.merge-panel` (`admin.mjs:43`) and
`.admin-grid` (`admin.mjs:49`) hold the insertion point; `SCAN_MS: 4500` (`config.mjs:3`) confirms
the ~4.5 s unlock→playback gap the guarded playback-path resume targets.

## Issues resolved in revision 4

The single Rev-3 Path-to-100 item (unstated `unlockFromGesture()` idempotency) is closed in two
locations (enumerated above). No new issues introduced; the diff is purely additive clarification.

## Remaining issues

No gate-blocking or specificity issues remain. Only the single cosmetic Path-to-100 nit below.

## Scope Check

Unchanged from Rev 3 and still adequate.
- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` reports all Required
  Actions #1–#8 DONE and zero open defects.
- **Backlog items in scope but not addressed:** None mis-scoped. Addresses the in-progress item
  (`BACKLOG.md:9`, `[/]`); the three `- [ ]` items (native SwiftUI, offline-HTTPS helper, Node 24
  bump) are independent subsystems correctly deferred.
- **Integration points analyzed:** Yes — §7's six contracts are unchanged.
- **Alternatives considered:** Yes — §4 unchanged.
- **Score cap applied:** None.

## Flaws of Commission

No flaws of commission identified. The v11 diff adds no logic — only documentation of an
already-implied safe no-op. The idempotency statement is behaviorally consistent with the existing
`running`→marks-unlocked contract.

## Flaws of Omission

No gate-blocking omissions. One cosmetic residue (Path-to-100): the plan now *specifies*
`unlockFromGesture()` idempotency as a contract (no second context, no repeated `resume()`) but
§10's unit-test enumeration does not list a matching assertion. §10 tests repeated *playback*
("repeated successful playback creates two oscillator instances", line 582) but not repeated
*unlock* on an already-`running` context. A newly-stated behavioral contract ideally gets a test
so a future regression (e.g. calling `resume()` on every selection) would be caught. This is
minor — the behavior is a safe no-op and the e2e single-selection flow exercises the unlock path
once — but it is a concrete, actionable gap.

## Regressions

No regressions identified. The v11 changes are documentation-only relative to v10; artifact-size
budget, `onSelect`/visit-id semantics, the `RESULT` transition, and camera privacy are all
unchanged.

## Why 99 and not 100

The plan closed the exact Rev-3 nit, but in specifying the idempotency contract it created one
equally-cosmetic successor: that contract has no matching §10 unit assertion (Flaws of Omission).
A flawless plan would enumerate a "repeated `unlockFromGesture()` on a running context creates no
second context and calls `resume()` at most once" test alongside the contract. This does not gate
approval or implementation correctness — it is polish only.

**This nit is not worth another plan-revision pass.** The plan has been at the 99 ceiling since v9
cleared the gate (Rev 2 = 97 → Rev 3 = 99 → Rev 4 = 99), and every plan-only commit since the v15
code landing has accrued another −1 inactivity decay (audit 72 → 71 → 70 → 69). Fold the
idempotency unit assertion into `tests/unit/audio.test.mjs` *during implementation*; do not spend
another cycle editing the plan for it.

## Path to 100

- In §10's `tests/unit/audio.test.mjs` list, add one assertion for the now-stated idempotency
  contract: a second `unlockFromGesture()` call on an already-unlocked `running` context returns
  `true`, constructs no second `AudioContext`, and calls `resume()` at most once. (Handle this
  when writing the tests, not via another plan revision.)

## Summary

Plan v11 is approved at 99/100. It folds in the one Rev-3 Path-to-100 nit (unlock idempotency,
now stated in both the Phase-2 contract and §8) with no new logic and no new issues beyond a
single cosmetic test-coverage successor. The plan is the contract against which implementation
will be audited. Loop remains **State 2 — implement the approved plan**. The plan is done; further
plan-only revisions are counterproductive (each is another idle cycle) — **implement now**.

---

## Plan Critique — Revision 3

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `a381a27`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v10
**Score:** **99 / 100** (previous: 97 — Rev 2)
**Status:** APPROVED — all four Rev-2 Path-to-100 nits folded in; only a cosmetic
idempotency-documentation gap separates it from a perfect 100.

Plan v10 is a targeted follow-up to the already-approved v9. It does not touch scope,
architecture, or any gate-blocking mechanism — it closes the exact four Path-to-100 items
Rev 2 listed. Re-reviewed under the staleness rule (v10 > the v9 that Rev 2 critiqued);
the delta is four clarifications, each verified below. The plan remains implementation-ready
and correctly scoped to the one in-progress backlog item, dependency-free, default-off, and
privacy-preserving (`{ audio: false }`, no `MediaRecorder`/`captureStream`).

The v9→v10 diff (four hunks) and its correctness:

1. **e2e mock initial state pinned — RESOLVED (was Rev-2 "Why 97 not 98" + Omission #1).**
   §10 now states "The mock context starts in `suspended`, and its `resume()` implementation
   changes state to `running`, so the unlock-phase resume assertion is load-bearing and
   deterministic" (lines 595-597). This was the *single* reason v9 was held to 97; the
   "one unlock/resume attempt from `unlockFromGesture()`" assertion (line 604) is now
   unambiguous — a suspended→running mock forces exactly one unlock-phase `resume()` and
   zero playback-phase resumes (state is `running` by playback), matching the Phase-2
   contract "if state is `running`, it marks unlocked" (line 291).

2. **ms→seconds conversion stated — RESOLVED (was Path-to-100).** `scheduleBlip`'s comment
   now reads "Convert `config.SCAN_BLIP_DURATION_MS` to durationSeconds with
   `config.SCAN_BLIP_DURATION_MS / 1000`" (lines 266-268), and §10 adds a matching unit
   assertion (lines 570-572). With `SCAN_BLIP_DURATION_MS: 90` (line 193) this pins
   `durationSeconds = 0.09`, so `now + durationSeconds / 2` (the 880→1320 Hz ramp midpoint)
   and `stop(now + durationSeconds)` are computable — the §4.3 automation contract is now
   fully numeric.

3. **Admin normalization mechanism decided — RESOLVED (was Path-to-100 / Omission #2).**
   `mountAdmin` now specifies inline coercion `{ scanBlipEnabled: audioSettings?.scanBlipEnabled
   === true }` and explicitly "Do not import `store.normalizeAudioSettings` into this screen;
   store remains responsible for persisted shape normalization, while admin only needs a
   defensive UI boolean" (lines 391-396). This is the right call — it keeps the persistence-shape
   authority in `store` and the screen's dependency surface minimal, and the optional-chained
   `=== true` cannot throw on `undefined`/`null`/missing params.

4. **Interrupted-cue skip tradeoff documented — RESOLVED (was Path-to-100 #4).** §8's
   interrupted-context bullet now adds "The cue for the scan that encountered `interrupted`
   is intentionally skipped because waiting for resume would delay result navigation and
   could violate autoplay policy on browsers that reject the resume" (lines 514-518). The
   effectiveness footnote Rev 2 asked for is now explicit.

Source re-verified for this revision: `.merge-panel` (`admin.mjs:43`) and `.admin-grid`
(`admin.mjs:49`) both present — the insertion point holds; `mountAdmin(root, { store,
onRosterChanged, onClose })` (`admin.mjs:31`) confirms `audioSettings`/`onAudioSettingsChanged`
are net-new; `SCAN_MS: 4500` (`config.mjs:3`) confirms the ~4.5 s unlock→playback gap the
playback-path resume targets.

## Issues resolved in revision 3

All four Rev-2 Path-to-100 items are closed (enumerated above). No new issues introduced;
the diff is purely additive clarification.

## Remaining issues

No gate-blocking or specificity issues remain. Only the single cosmetic Path-to-100 nit
below.

## Scope Check

Unchanged from Rev 2 and still adequate.
- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` reports all
  Required Actions DONE and zero open defects.
- **Backlog items in scope but not addressed:** None mis-scoped. Addresses the in-progress
  item (`BACKLOG.md:9`, `[/]`); the three `- [ ]` items (native SwiftUI, offline-HTTPS
  helper, Node 24 bump) are independent subsystems correctly deferred.
- **Integration points analyzed:** Yes — §7's six contracts are unchanged.
- **Alternatives considered:** Yes — §4 unchanged.
- **Score cap applied:** None.

## Flaws of Commission

No flaws of commission identified. The v10 diff adds no logic — only documentation of
already-specified behavior. The inline `?.scanBlipEnabled === true` coercion is correct.

## Flaws of Omission

No gate-blocking omissions. One cosmetic residue (Path-to-100): the plan does not explicitly
state that `unlockFromGesture()` is idempotent across the multiple roster selections that
occur in a real session — the Phase-2 contract implies a second call on an already-`running`
context simply re-marks unlocked (a safe no-op), but this is left inferable rather than stated.

## Regressions

No regressions identified. The v10 changes are documentation-only relative to v9; artifact-size
budget, `onSelect`/visit-id semantics, the `RESULT` transition, and camera privacy are all
unchanged from the Rev-2 analysis.

## Why 99 and not 100

The one remaining gap is the unstated idempotency of `unlockFromGesture()` across repeated
selections (Flaws of Omission). It is inferable from the Phase-2 state contract and is
behaviorally safe as written, so it does not affect implementation correctness — but a
flawless plan would state it in one line. Everything the previous revisions flagged is now
resolved.

## Path to 100

- State in the Phase-2 controller contract that `unlockFromGesture()` is idempotent: a call
  on an already-unlocked, `running` context re-marks unlocked without a redundant `resume()`,
  so the multiple selections in a normal session incur at most one context creation and no
  churn (the §8 "Multiple rapid selections" bullet covers cue-node reuse but not unlock
  idempotency).

## Summary

Plan v10 is approved at 99/100. This revision folded in every Rev-2 Path-to-100 item —
e2e mock initial state pinned to `suspended`, the ms→seconds `durationSeconds` conversion
stated, the admin inline-normalization decision made explicit, and the interrupted-cue skip
tradeoff documented — with no new issues. Only a one-line idempotency footnote separates it
from 100. Loop remains **State 2 — implement the approved plan**; the plan is the contract
against which implementation will be audited.

---

## Plan Critique — Revision 2

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `d79f742`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v9
**Score:** **97 / 100** (previous: 93 — Rev 1)
**Status:** APPROVED — all three Rev-1 gate-blockers resolved; all five Rev-1 Path-to-100 items folded in.

Plan v9 clears the ≥95 gate. The single focused revision pass closed every gate-blocking
issue from Rev 1 **and** the entire Path-to-100 list. The plan is now implementation-ready:
a competent developer could author every enumerated unit/e2e test and wire every module
without an architectural question. It stays correctly scoped to the one in-progress backlog
item, keeps the feature dependency-free and default-off, and preserves the flagship
camera-privacy posture (`{ audio: false }`, no `MediaRecorder`/`captureStream`).

Every fix was verified against source:
- `mountAdmin(root, { store, onRosterChanged, onClose })` at `src/screens/admin.mjs:31` —
  the new `audioSettings`/`onAudioSettingsChanged` params are net-new; the v9 `onAdminHold`
  snippet (`IMPLEMENTATION_PLAN.md:349-363`) now shows the updated `mountAdmin(...)` call.
- `.merge-panel` (`admin.mjs:43`) and `.admin-grid` (`admin.mjs:49`) both exist — the v9
  insertion point "after `.merge-panel` and before `.admin-grid`" (line 406) is concrete.
- `handleListClick` → `onSelect(...)` is synchronous from a trusted `click`
  (`roster.mjs:146-150`); `scan.mjs` `onDone` fires from a `setTimeout` timer — unlock-on-
  selection / play-on-scan-complete is the correct model.
- Build transform accepts named imports, rejects side-effect imports (`build.mjs:64-76`);
  `audio.mjs` imports `{ AUDIO }` only. Inserting `src/lib/audio.mjs` immediately after
  `src/config.mjs` in the `modules` array (`build.mjs:7-20`) satisfies its only dependency.
- `SCAN_MS: 4500` (`config.mjs:3`) confirms the ~4.5 s unlock→playback gap that motivated
  the playback-path resume (Rev-1 issue #4).

## Issues resolved in revision 2

1. **Availability detection vs. `audioContextFactory` — RESOLVED (was BLOCKING #1).** Phase 2
   now states one model unambiguously: "Availability is factory-based: the controller is
   potentially available when `audioContextFactory` is a function. The default factory
   resolves `globalThis.AudioContext || globalThis.webkitAudioContext` and throws when
   neither constructor exists; injected mock factories are fully testable without also
   stubbing `globalThis`" (lines 282-286). §8 is reconciled: "the default `audioContextFactory`
   throws on first construction when neither … exists. Injected factories are treated as the
   availability source for tests" (lines 498-501). The Phase-2/§10 unit tests are now
   authorable exactly as enumerated.

2. **app→admin wiring — RESOLVED (was #2).** The `onAdminHold` snippet (lines 349-363) now
   shows `mountAdmin(root, { store, audioSettings: store.loadAudioSettings(),
   onAudioSettingsChanged: updateAudioSettings, onRosterChanged, onClose })` — the settings
   path is connected end-to-end.

3. **`mountAdmin` default/guard — RESOLVED (was #3).** The signature now defaults
   `audioSettings = { scanBlipEnabled: false }` and the body "Normalize the received
   audioSettings to `{ scanBlipEnabled: boolean }` before any dereference so direct mounts
   or omitted params default off instead of throwing" (lines 383-396). Cannot throw on a
   missing param.

4. **Playback-path resume for iOS auto-suspend — RESOLVED (was Path-to-100 #4).** §4.2, the
   Phase-2 controller contract (lines 294-296), and §8 (lines 507-511) now specify a guarded
   **non-awaited** `context.resume()` inside `playScanBlip()` when an already-unlocked context
   is `suspended`/`interrupted`, skipping the current cue and allowing a later scan to play —
   correctly gated on prior trusted unlock so it cannot become autoplay-on-boot.

5. **§3-diagram vs §6 ordering — RESOLVED (was #5).** Both now pin the same canonical order:
   §3 diagram (lines 64-71) shows `create visit id` → `audio.unlockFromGesture()` →
   `mountScan()`, and §6 `onSelect` (lines 337-346) reads "Create the visit id first as today,
   then call `audio.unlockFromGesture()` … before `setState('SCAN')`."

6. **Exact AudioParam automation — RESOLVED (Path-to-100).** §4.3 (lines 132-138) now gives
   the literal call sequence: `frequency.setValueAtTime(880, now)` →
   `linearRampToValueAtTime(1320, now + durationSeconds/2)`, `gain.setValueAtTime(0.045, now)`,
   `gain.setTargetAtTime(0, now, SCAN_BLIP_RELEASE_SECONDS)`, `start(now)`,
   `stop(now + durationSeconds)` — the §10 "exact automation sequence from §4.3" unit assertion
   (line 561) now has an unambiguous target.

7. **e2e unlock-vs-playback resume distinction — RESOLVED (Path-to-100).** §10 (lines 590-593)
   states the mock "distinguishes unlock from playback by counting `resume()` before the first
   oscillator creation as unlock-phase and counting `resume()` after that point as
   playback-phase" — the "one unlock/resume attempt, zero playback-path resume" assertions are
   now precise.

## Remaining issues

All Rev-1 issues are closed. Only the three minor nits in Path to 100 remain — none blocks
approval or implementation.

## Scope Check

- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` reports all
  Required Actions #1–#8 DONE and zero open defects.
- **Backlog items in scope but not addressed:** None mis-scoped. Addresses the in-progress
  item (`BACKLOG.md:9`, `[/]`). The three remaining `- [ ]` items (native SwiftUI,
  offline-static-HTTPS helper, Node 24 bump) are independent subsystems correctly deferred.
- **Integration points analyzed:** Yes — §7 enumerates six contracts, each with failure mode
  and migration path.
- **Alternatives considered:** Yes — §4 justifies oscillator synthesis over `<audio>`,
  boolean-only persistence over a settings object, and no runtime deps over Tone.js/Howler.js.
- **Score cap applied:** None. Scope is adequate.

## Flaws of Commission

No flaws of commission identified. The one true commission flaw from Rev 1 (the
availability/factory conflict) is resolved. Config constants, storage-key versioning,
per-cue node creation, `dispose()` ownership, and build-order placement are all correct.

## Flaws of Omission

Only the two minor omissions below (both Path-to-100), neither gate-blocking:
1. The e2e mock's **initial context state** is not pinned. The "one unlock/resume attempt"
   assertion (§10, line 591; Phase 4 step 6, line 445) is only correct if the mocked
   `AudioContext` starts `suspended` (as real browsers do) so `unlockFromGesture()` calls
   `resume()`; if the mock started `running`, the Phase-2 contract "if state is `running`, it
   marks unlocked" (line 291) means unlock does **not** call `resume()` and the counter stays
   0. A competent implementer will use a suspended mock, but the plan should say so explicitly.
2. Whether `mountAdmin` imports `store.normalizeAudioSettings` or normalizes inline is left
   open (the default param + inline boolean coercion is sufficient, so this is cosmetic).

## Regressions

No regressions identified. Artifact-size budget holds (added module < 3 KB gzip, §9, well
within the ≤750 KB gzip / ≤1.2 MB budget at `build.mjs`); `onSelect`/visit-id semantics and
the `RESULT` transition are preserved because all public audio methods catch and return
booleans; camera privacy (`{ audio: false }`) is kept and the e2e probe is extended, not
replaced.

## Why 97 and not 98

One small specificity gap keeps it out of the 98 band: the e2e mock's initial context state
(`suspended`) is load-bearing for the "one unlock/resume attempt" assertion but is not stated
(Omission #1). It is inferable and mechanically trivial, so it does not block approval — but a
98-grade plan would pin it. Everything else is either resolved or genuinely cosmetic.

## Path to 100

- Pin the e2e mock's initial context state to `suspended` so the unlock-phase `resume()`
  assertion is unambiguous (Omission #1).
- State the ms→seconds conversion for `durationSeconds` (from `SCAN_BLIP_DURATION_MS: 90`)
  used in the `scheduleBlip` `now + durationSeconds/2` / `stop(now + durationSeconds)` math.
- Say whether `mountAdmin` normalizes via `store.normalizeAudioSettings` or inline
  (Omission #2).
- Acknowledge that on a context that is `interrupted` at the moment of a scan completion, the
  cue for *that* scan is skipped (resume is non-awaited) and only a subsequent check-in will
  play — a minor effectiveness footnote, already the documented tradeoff.

## Summary

Plan v9 is approved at 97/100. The revision resolved all three ≥95 gate-blockers and folded
in every Rev-1 Path-to-100 item — factory-based availability, connected app→admin wiring,
guarded `mountAdmin` default, playback-path resume for the iOS auto-suspend case, reconciled
unlock/visit-id ordering, exact AudioParam automation, and a precise e2e unlock-vs-playback
resume distinction. Only three cosmetic nits remain (e2e mock initial state, ms→s conversion,
admin normalization mechanism), none blocking. Loop advances **State 1 → State 2 — implement
the approved plan.** The plan is now the contract against which implementation will be audited.

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
