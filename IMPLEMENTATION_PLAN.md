# Check-In 007 - iPad Roster Scroll Repair Plan v32 (Cycle 18)

## 1. Overview

Cycle 18 is re-scoped to the audit-assigned P0/P1 findings from `CONSOLIDATED_AUDIT.md`
v66 and `IMPLEMENTATION_PLAN_CRITIQUE.md` Cycle 18 Rev 1. The current web app is healthy
on desktop gates, but the newly working iOS lane produced device evidence that the roster
does not scroll on an iOS 26.4 Simulator (`scrollTop` stayed `0` after the drag), and a
second run exposed nondeterministic Mobile Safari address-entry automation. This plan
fixes the XCUITest harness first, isolates the iPad touch-scroll root cause with the
installed `iPad (A16)` simulator, lands the smallest verified scroll fix, and records a
required `status: "passed"` JSON result before RA #14 can close.

Source trace:

- RA #14 (P0/HIGH): iPadOS roster touch-scroll is device-evidenced failing after the
  Cycle 15 CSS transform fix; Cycle 18 must root-cause and fix it.
- RA #19 (P1/HIGH): `WebRosterScrollUITests.open()` can bind Safari's inactive
  `TabBarItemTitleContainer` text field and fail because the element lacks keyboard focus.
- Local environment verified for this revision: `xcrun simctl list runtimes` reports
  `iOS 26.4 (26.4 - 23E244)`, and `xcrun simctl list devices available` reports
  `iPad (A16)` booted.
- `docs/IPAD_SCROLL_BUG.md` records prior iPad-specific hypotheses and warns not to repeat
  bundled CSS experiments without isolation.

## 2. Scope

### In scope

1. Harden `native/CheckIn007UITests/WebRosterScrollUITests.swift` so Mobile Safari URL
   entry deterministically targets a keyboard-focused address field with bounded settle
   and retry behavior.
2. Refresh the iOS scroll smoke default device from stale `iPad Pro 13-inch (M4)` to an
   installed simulator line, `iPad (A16)`, while keeping environment overrides intact.
3. Add unit coverage for the default-device contract and keep the test-runner environment
   forwarding regression covered.
4. Root-cause the on-device non-scroll with isolated CSS/DOM experiments against
   `.roster-screen` and `.roster-list`; land only the smallest experiment that produces a
   required PASS on the installed iOS 26.4 Simulator.
5. Update runbook, bug note, README, and verification evidence with the new default
   device, the harness hardening, the selected scroll fix, and the real required PASS JSON.

### Out of scope

- Editing `IMPLEMENTATION_PLAN_CRITIQUE.md`, `CONSOLIDATED_AUDIT.md`, or `BACKLOG.md`.
- Implementing the cycle-artifact guard CI reconciliation from v31; that backlog polish
  item is deferred until RA #14 and RA #19 are closed. When it returns, it must address the
  v31 critique about real multi-file planning commits and commit-time enforcement.
- Changing check-in data contracts, camera behavior, audio behavior, admin/import/export
  flows, native SwiftUI app behavior, HTTPS certificate generation, or CI billing.
- Claiming RA #14 resolved from desktop Chromium/WebKit, unit tests, or a non-required
  skipped iOS smoke result.

## 3. Architecture

```text
scripts/ios-scroll-smoke.mjs
  DEFAULT_IOS_SCROLL_DEVICE = "iPad (A16)"
  preflightIosRunner()
  runIosScrollSmoke()
    |
    +-- native/CheckIn007UITests/WebRosterScrollUITests.swift
          open(url)
          focusedAddressField()
          tapAddressFieldCandidate()
          testRosterScrollsInMobileSafari()
    |
    +-- dist/check-in-007.<hash>.html?scrollProbe=1
          |
          +-- src/app.mjs readRuntimeFlags()
          +-- src/screens/roster.mjs createScrollProbe()
          +-- src/styles.css .roster-screen / .roster-list scroll fix
```

The iOS smoke script remains the Node orchestrator: it builds the current hashed kiosk
artifact, serves it over the existing HTTPS helper unless an external base URL is supplied,
passes the probe URL into XCUITest through both plain and `TEST_RUNNER_` environment keys,
and writes `test-results/ios-scroll-result.json`. The Swift UI test owns only Mobile
Safari automation and the touch-drag oracle. The web app owns the actual scroll container
contract and the query-gated probe.

Failure domains stay separated:

- If simulator prerequisites are absent, `preflightIosRunner()` produces a skipped or
  failed preflight result according to required mode.
- If Mobile Safari URL entry is flaky, the Swift test fails before the scroll oracle with
  an explicit address-field message.
- If the page loads but iPadOS still does not move the scroll layer, the probe remains
  `scroll-probe:0` and RA #14 stays open.
- If the smoke test passes in required mode, the JSON evidence becomes the closure artifact
  for RA #14.

## 4. Technical Decisions and Rationale

### 4.1 Fix the XCUITest harness before changing scroll CSS

Chosen: update `WebRosterScrollUITests.open()` to retry Mobile Safari address entry until
an address/search field exists, has focus after a tap, and accepts the URL. Use a bounded
loop and predicate-based focus checks instead of `safari.textFields.firstMatch`.

Why: RA #19 currently makes the lane nondeterministic; without a reliable harness, a
scroll PASS or FAIL cannot be trusted. Fixing the harness first distinguishes genuine
scroll failures from Safari automation failures.

Rejected alternatives:

- Keep `textFields.firstMatch` and add a longer timeout: the audit already shows this can
  bind the wrong inactive field, so more waiting does not change the target.
- Paste through the system pasteboard: it adds privacy prompts and host-state coupling.
- Use Safari deep links from the test host: still needs Safari readiness and is less
  representative of the URL-entry path already installed.

Tradeoff: the Swift test grows a few helpers, but the helpers are bounded to this one
UI-test file and do not affect app runtime code.

Skeletal contract:

```swift
private func open(_ url: String) {
    /// Opens `url` in Mobile Safari.
    /// Retries bounded address-field focus attempts before falling back to direct typeText.
    /// Fails the XCTest with a message naming address focus if no focused field can type.
    ...
}

private func focusedAddressField(timeout: TimeInterval) -> XCUIElement? {
    /// Returns the keyboard-focused Safari address/search field when available.
    /// Does not return inactive TabBarItemTitleContainer fields.
    ...
}

private func tapAddressFieldCandidate(timeout: TimeInterval) -> XCUIElement? {
    /// Finds hittable text-field/search-field candidates, taps them, and waits for focus.
    /// Returns nil after the bounded retry window.
    ...
}
```

### 4.2 Default to an installed iPad simulator, not a stale model

Chosen: export and use `DEFAULT_IOS_SCROLL_DEVICE = 'iPad (A16)'` from
`scripts/ios-scroll-smoke.mjs`, replacing both hard-coded default occurrences. Keep
`CHECKIN007_IOS_DEVICE` as the first-class override.

Why: the local environment contains `iPad (A16)` on iOS 26.4 and does not contain
`iPad Pro 13-inch (M4)`. A stale default causes required mode to fail in preflight before
it can exercise RA #14 or RA #19.

Rejected alternatives:

- Auto-select the first available iPad every run: it hides environment drift and makes
  evidence harder to compare across cycles.
- Require callers to always set `CHECKIN007_IOS_DEVICE`: valid for CI, but this cycle needs
  a working default for local verification and docs.

Tradeoff: future Xcode simulator catalogs may rename defaults again; the override and
preflight diagnostics remain the stable escape hatch.

Skeletal contract:

```js
export const DEFAULT_IOS_SCROLL_DEVICE = 'iPad (A16)';
export const DEFAULT_IOS_SCROLL_RUNTIME = 'iOS';

export async function preflightIosRunner({
  device = process.env.CHECKIN007_IOS_DEVICE || DEFAULT_IOS_SCROLL_DEVICE,
  runtime = process.env.CHECKIN007_IOS_RUNTIME || DEFAULT_IOS_SCROLL_RUNTIME,
  runCommand = run,
} = {}) {
  /** Verifies xcrun, xcodebuild, runtime, and the configured device.
      Returns strict unavailable codes on missing prerequisites. */
  ...
}
```

### 4.3 Use an isolated iPad-scroll fix sequence with one selected production change

Chosen: run and document isolated on-device experiments, then commit only the winning
production CSS/DOM change. The planned sequence is:

1. Baseline after RA #19 and default-device fixes, proving the harness reliably reaches the
   scroll oracle.
2. First candidate: keep the existing fade-only roster transform behavior and change the
   roster from a fixed-position internal scroller to a document-backed roster screen:
   `body` can scroll only while the active screen is roster, `.roster-screen` is the normal
   document-height host, and `.roster-list` remains the only semantic list with
   `-webkit-overflow-scrolling: touch`.
3. If candidate 1 fails, revert it and try the smallest layer-promotion candidate on
   `.roster-list` (`transform: translateZ(0)` and/or `will-change: scroll-position`) with
   no display/grid change.
4. If both fail, stop and record the failing JSON rather than stacking speculative fixes.

Why: `docs/IPAD_SCROLL_BUG.md` says the prior bundled block/kick/touch-action experiment
made scrolling worse. The new device evidence also shows transform removal alone is
insufficient. A document-backed roster path is the next strongest WebKit-specific
hypothesis because it avoids a fixed full-screen ancestor plus internal flex scroller for
the primary iPad screen while preserving fixed overlays for loading/scan/result.

Rejected alternatives:

- Reapply the previous bundled block/kick/touch-action change: already recorded as worse.
- Change virtualization logic first: the default 40-guest failing path is not virtualized.
- Replace the web roster with native SwiftUI for this defect: too broad and bypasses the
  deployed web kiosk path RA #14 is about.

Tradeoff: document-backed roster scrolling changes page-level overflow while on the roster
screen. The implementation must prove other screens still keep their fixed centered
layout, the admin overlay remains reachable, search resets scroll, and the virtualized
large-roster path still works.

Skeletal contract:

```css
body {
  /* Default remains no document scroll for overlay screens. */
  overflow: hidden;
}

body.is-roster-scroll-mode {
  /* Enabled only while the roster screen is mounted. Lets iOS use the document scroll path. */
  overflow-y: auto;
}

.roster-screen {
  /* Candidate 1 production target: no transformed/fixed ancestor for the roster scroller. */
  position: relative;
  min-height: 100dvh;
  transform: none;
}

.roster-list {
  /* Preserve semantic list, row sizing, scroll probe target, and iOS momentum behavior. */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  ...
}
```

```js
export function mountRoster(root, options) {
  /** Mounts the roster screen, enables body roster-scroll mode while mounted,
      renders either small or virtualized roster rows, installs the scroll probe,
      and removes body mode during cleanup. */
  ...
}
```

### 4.4 Keep the probe and evidence contract strict

Chosen: keep `createScrollProbe()` and `normalizeIosScrollResult()` strict: a closing PASS
requires `status: "passed"`, `required: true`, the hashed artifact URL with
`?scrollProbe=1`, and a result bundle path.

Why: RA #14 has been incorrectly treated as fixed from desktop/web gates before. The audit
requires a real required-mode iOS JSON result to close it.

Rejected alternative: mark the bug fixed after desktop WebKit or e2e evidence. That is
explicitly invalid for this WebKit-touch defect.

## 5. File Manifest

```text
IMPLEMENTATION_PLAN.md                               (MOD) - replace v31 guard-polish scope with this RA #14/#19 repair plan
src/styles.css                                       (MOD) - selected isolated iPad roster scroll CSS fix; preserve overlay screens
src/screens/roster.mjs                               (MOD) - enable/cleanup roster-specific body scroll mode if candidate 1 is selected
native/CheckIn007UITests/WebRosterScrollUITests.swift (MOD) - deterministic Safari URL-entry focus/retry helpers
scripts/ios-scroll-smoke.mjs                         (MOD) - installed default iPad simulator constants and unchanged override support
tests/unit/ios-scroll-smoke.test.mjs                 (MOD) - default-device and env-forwarding regression coverage
tests/unit/roster.test.mjs                           (MOD) - body scroll-mode setup/cleanup regression coverage if roster body mode lands
tests/e2e/checkin.spec.mjs                           (MOD) - preserve desktop layout, probe, search reset, large-roster virtualization, and transform assertions under the selected fix
README.md                                            (MOD) - update iOS scroll default device and evidence guidance
docs/IOS_SCROLL_RUNBOOK.md                           (MOD) - update commands/evidence examples for iPad (A16) and harness behavior
docs/IPAD_SCROLL_BUG.md                              (MOD) - record Cycle 18 root-cause result, selected fix, and PASS/FAIL disposition
docs/VERIFICATION_EVIDENCE.md                        (MOD) - record commands, simulator environment, and required ios-scroll-result JSON outcome
```

No `dist/` artifacts are committed unless an existing project convention requires
regenerating tracked build output; current source-of-truth changes are in `src/`, `native/`,
`scripts/`, tests, and docs.

## 6. Implementation Phases

### Phase 1 - Harness and simulator-default repair

1. Add `DEFAULT_IOS_SCROLL_DEVICE` and `DEFAULT_IOS_SCROLL_RUNTIME` constants to
   `scripts/ios-scroll-smoke.mjs`; use them in `preflightIosRunner()` and
   `runIosScrollSmoke()` defaults.
2. Update `tests/unit/ios-scroll-smoke.test.mjs` fixtures from `iPad Pro 13-inch (M4)` to
   `iPad (A16)` where they assert default behavior, while retaining an override test for a
   caller-supplied device.
3. Replace `WebRosterScrollUITests.open()` with bounded address-field focus helpers:
   identify hittable text/search fields, tap, wait for `hasKeyboardFocus == true`, type the
   URL only into the focused field, press return, and wait for a web view.
4. Keep `dismissSafariPrompts()` and self-signed-warning handling in the same order after
   navigation begins.

Acceptance criteria:

- Unit tests prove default device is `iPad (A16)` and env overrides still win.
- XCUITest no longer uses `safari.textFields.firstMatch` as the sole address target.
- A required smoke run reaches either the scroll oracle or a page-load/certificate failure;
  it must not fail with the RA #19 keyboard-focus error.

### Phase 2 - Baseline root-cause run

1. Run:

   ```bash
   CHECKIN007_IOS_DEVICE='iPad (A16)' CHECKIN007_IOS_RUNTIME='iOS' CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll
   ```

2. Record the JSON result, `stage`, `reason/error`, artifact name, and result bundle path
   in `docs/VERIFICATION_EVIDENCE.md`.
3. If the baseline unexpectedly passes after the harness/default repair alone, do not add a
   CSS fix; update docs to say RA #19/default-device repair made the existing Cycle 15 CSS
   verifiable, and keep production scroll CSS unchanged.
4. If the baseline still reports `scroll-probe:0`, continue to Phase 3.

Acceptance criteria:

- The baseline result is generated by required mode, not inferred from console text.
- The plan implementation records whether the failure is harness/page-load/cert-related or
  a genuine `scrollTop` non-movement.

### Phase 3 - Isolated iPad scroll fix

1. Apply candidate 1 only: document-backed roster scroll mode.
   - `mountRoster()` adds `document.body.classList.add('is-roster-scroll-mode')` after
     mounting and removes it during cleanup.
   - `.roster-screen` becomes a non-fixed full-viewport document host.
   - Loading, scan, and result screens remain fixed and preserve their current transition
     transform behavior.
   - `.roster-list` keeps row rendering, gap, semantics, probe target, and
     `-webkit-overflow-scrolling: touch`.
2. Run desktop regression gates listed in Section 10.
3. Run the required iOS smoke. If it passes, keep candidate 1 and document it as the
   selected fix.
4. If candidate 1 fails, revert only candidate 1 changes and try candidate 2: roster-list
   layer promotion without display or touch-action changes. Keep candidate 2 only if
   required iOS smoke passes.
5. If no isolated candidate passes, commit the harness/default/docs work plus the failing
   evidence and leave the production scroll fix unlanded; do not stack unproven CSS.

Acceptance criteria:

- A kept production scroll fix has required-mode iOS JSON evidence with `status: "passed"`.
- If no fix passes, docs explicitly leave RA #14 open and describe the next candidate.
- Desktop e2e still proves the roster has no transform ancestor, the scroll probe updates,
  search resets list scroll, and large-roster virtualization remains functional.

### Phase 4 - Documentation and evidence

1. Update README and `docs/IOS_SCROLL_RUNBOOK.md` command examples to use `iPad (A16)` as
   the default installed simulator for this repo state, while documenting
   `CHECKIN007_IOS_DEVICE` overrides.
2. Update `docs/IPAD_SCROLL_BUG.md` with:
   - the Cycle 18 baseline result after RA #19/default repair;
   - the exact isolated candidate kept or rejected;
   - the final required JSON status;
   - the condition under which RA #14 is resolved or remains open.
3. Update `docs/VERIFICATION_EVIDENCE.md` with actual command outputs and the
   `test-results/ios-scroll-result.json` contents or a concise excerpt with all required
   PASS fields.
4. Mark implementation phases complete in this plan only after code and docs are actually
   implemented in the later implementation case.

Acceptance criteria:

- Docs no longer instruct the default local path to use unavailable `iPad Pro 13-inch (M4)`.
- Evidence is truthful: no PASS claim without `status: "passed"` and `required: true`.
- The guard-polish backlog item is mentioned only as deferred; it is not implemented in this
  cycle.

## 7. Integration Points

1. `scripts/ios-scroll-smoke.mjs` to Xcode/XCUITest:
   - Contract: defaults select `iPad (A16)`/`iOS`; environment overrides may select any
     installed device/runtime; both plain and `TEST_RUNNER_` probe env keys are passed.
   - Failure mode: missing runtime/device returns structured preflight failure; required
     mode exits nonzero and writes JSON.
   - Migration path: existing CI/device-farm callers can keep their explicit env vars.

2. XCUITest to Mobile Safari:
   - Contract: `open(url)` must target a keyboard-focused URL/search field or fail with a
     focused diagnostic before the scroll oracle.
   - Failure mode: prompt/certificate/page-load issues are distinct from scrollTop failures
     in result-bundle logs and JSON `stage`.
   - Migration path: helper changes are limited to `WebRosterScrollUITests.swift`; native
     app UI tests are untouched.

3. Web roster to page layout:
   - Contract: while roster is mounted, the selected scroll container must be reachable by
     iPad touch and by the existing `createScrollProbe(list)` oracle; when roster unmounts,
     body/document overflow state must return to the overlay-screen default.
   - Failure mode: leaked body class could make scan/result screens document-scrollable;
     unit/e2e tests must catch setup/cleanup leaks.
   - Migration path: if candidate 1 is kept, desktop e2e and unit tests pin body class
     cleanup and screen transforms.

4. Documentation to audit:
   - Contract: `docs/IPAD_SCROLL_BUG.md` and `docs/VERIFICATION_EVIDENCE.md` must trace the
     exact selected candidate and JSON result to RA #14/#19.
   - Failure mode: a skipped/failed/non-required JSON cannot close RA #14.
   - Migration path: if the first candidate fails, docs record it as evidence and the next
     cycle can start from a clear candidate list.

## 8. Error Handling and Edge Cases

- Safari field exists but is inactive: `open(url)` must not type into it; retry until a
  focused address/search field is found or fail with an explicit focus message.
- Safari first-run prompts: keep bounded dismissal for "Continue", "Not Now", "Close", and
  "Done"; do not loop indefinitely.
- Self-signed warning: continue only when `CHECKIN007_ALLOW_SELF_SIGNED_HTTPS=1` is present
  in the forwarded test-runner environment.
- Missing simulator runtime/device: preflight writes failed/skipped JSON according to
  `CHECKIN007_IOS_SCROLL_REQUIRED`; no PASS is inferred.
- Baseline passes without CSS changes: do not add production scroll changes; update docs and
  evidence only.
- Candidate fix fails: revert that isolated candidate before trying the next; never stack
  unrelated CSS changes to chase a PASS.
- Roster cleanup: body scroll-mode class must be removed on every roster unmount, including
  admin close, scan transition, and test-driven `setState()` changes.
- Search update: search still sets `list.scrollTop = 0`; if body/document scroll is
  selected, implementation must also reset the relevant document scroll position.
- Virtualized roster: spacer height and absolute row positioning must still allow scrolling
  to row 619 in desktop e2e and not break the probe target.
- Reduced motion: transition timing changes must not reintroduce a transform ancestor for
  `.roster-screen`.
- Build/cache: required iOS verification must use the current hashed artifact with
  `?scrollProbe=1`, not a stale `index.html`.

## 9. Stability and Performance

Runtime complexity remains unchanged for normal roster rendering:

- Non-virtualized default roster: rendering remains `O(n)` for the filtered 40-row list,
  with one scroll listener for the probe only when `?scrollProbe=1` is present.
- Virtualized roster: scroll handling remains bounded by `O(v + overscan)`, where `v` is
  visible rows; candidate 1 must not change `computeVirtualWindow()` or row-height
  constants.
- Harness changes add at most a small bounded retry loop in one XCUITest path and no app
  runtime cost.
- The smoke script still performs one build, one local HTTPS server startup unless
  `CHECKIN007_IOS_BASE_URL` is supplied, one Xcode test invocation, and one JSON write.

Memory impact is negligible: any added body-class state is a string token, Swift helpers
hold only transient `XCUIElement` references, and JSON evidence stays under the existing
bounded error text limit (`IOS_SCROLL_ERROR_LIMIT = 2000`). Cleanup requirements prevent
document overflow/class leaks across state transitions.

Stability targets:

- Required iOS smoke should complete within the existing `120_000 ms` default timeout.
- Desktop unit/e2e/build gates must remain green.
- A failed iOS smoke must produce a structured JSON result with enough stage/error context
  to continue diagnosis.

## 10. Testing Strategy

Unit tests:

- `tests/unit/ios-scroll-smoke.test.mjs`: assert exported defaults are `iPad (A16)` and
  `iOS`; preflight passes with those defaults when stubs include them; explicit
  `CHECKIN007_IOS_DEVICE`/function arguments override the default; existing
  `TEST_RUNNER_` env forwarding stays covered.
- `tests/unit/roster.test.mjs`: if candidate 1 lands, assert `mountRoster()` adds body
  scroll mode, cleanup removes it, and cleanup is idempotent.
- Existing `roster.test.mjs` probe tests continue asserting `scroll-probe` starts at 0,
  updates from real `list.scrollTop`, and disposes.

E2E tests:

- Existing `roster has no transform ancestor while other screens keep scale entrance`
  remains green and is updated only if candidate 1 changes the expected position/overflow
  details.
- Existing `scroll probe is hidden in normal mode and reflects real roster scroll when
  enabled` remains green.
- Existing large-roster virtualization test still scrolls to Agent 619 and confirms search
  resets scroll.
- Existing boot/search/scan/result/privacy flow remains green.

Required iOS verification:

```bash
CHECKIN007_IOS_DEVICE='iPad (A16)' CHECKIN007_IOS_RUNTIME='iOS' CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll
```

Valid closure requires `test-results/ios-scroll-result.json` with:

```json
{
  "status": "passed",
  "required": true,
  "device": "iPad (A16)",
  "runtime": "iOS",
  "url": "...?scrollProbe=1",
  "artifact": "check-in-007.<hash>.html",
  "resultBundle": ".../test-results/ios-scroll.xcresult"
}
```

Full verification commands for the implementation case:

```bash
node --test tests/unit/*.test.mjs
npx playwright test
node scripts/build.mjs
npx prettier --check src/styles.css src/screens/roster.mjs scripts/ios-scroll-smoke.mjs tests/unit/ios-scroll-smoke.test.mjs tests/unit/roster.test.mjs tests/e2e/checkin.spec.mjs README.md docs/IOS_SCROLL_RUNBOOK.md docs/IPAD_SCROLL_BUG.md docs/VERIFICATION_EVIDENCE.md IMPLEMENTATION_PLAN.md
CHECKIN007_IOS_DEVICE='iPad (A16)' CHECKIN007_IOS_RUNTIME='iOS' CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll
```

## 11. Environment and Toolchain

- Node target remains the existing project pin: Node `24.20.0`, `engines.node >=24 <25`.
- No new npm dependencies.
- Xcode command-line tools and `xcodebuild` are required for the iOS smoke lane.
- Verified local simulator target for this plan: `iOS 26.4 (26.4 - 23E244)` with
  `iPad (A16)` available/booted.
- `CHECKIN007_IOS_DEVICE`, `CHECKIN007_IOS_RUNTIME`, `CHECKIN007_IOS_BASE_URL`,
  `CHECKIN007_IOS_SCROLL_REQUIRED`, `CHECKIN007_IOS_SCROLL_RESULT`, and
  `CHECKIN007_ALLOW_SELF_SIGNED_HTTPS` keep their existing roles.

Fresh clone setup for non-iOS gates remains:

```bash
npm ci
node --test tests/unit/*.test.mjs
npx playwright test
node scripts/build.mjs
```

## 12. Deployment and Distribution

This cycle changes source, tests, and documentation for the web kiosk and iOS verification
lane. Deployment remains the existing static `dist/` workflow:

1. Run `npm run build`.
2. Serve the full `dist/` directory over trusted HTTPS for iPad Safari or Add-to-Home-Screen.
3. Use the hashed `dist/check-in-007.<hash>.html?scrollProbe=1` URL for verification.
4. Recreate stale Home Screen icons if iPadOS keeps older manifest launch metadata.

Rollback procedure:

1. Revert the implementation commit for this plan.
2. The iOS smoke default returns to the previous device name and the roster CSS/DOM returns
   to the prior Cycle 17 state.
3. RA #14 remains open with the last recorded failing JSON; RA #19 reopens if the Swift
   harness regression returns.

## 13. Open Questions

1. If the harness/default-device repair alone produces a required PASS, should the cycle
   still alter roster CSS?
   - Proposed resolution: no. The implementation should record the PASS and leave
     production scroll CSS unchanged because the audit asks for the smallest verified fix,
     not speculative churn.
   - Confirmation needed: discriminator review of this plan.

2. If candidate 1 fails but candidate 2 passes, should docs remove the document-scroll
   candidate?
   - Proposed resolution: keep a concise failed-candidate note in `docs/IPAD_SCROLL_BUG.md`
     so future cycles do not repeat it.
   - Confirmation needed: actual required-mode result.

3. Should the v31 guard-polish item be folded into this cycle after RA #14/#19 pass?
   - Proposed resolution: no. This run executes one case and this plan targets the audit
     P0/P1 only. Guard polish should return in a later plan with the critique corrections
     applied.
   - Confirmation needed: none; this follows the Cycle 18 critique.
