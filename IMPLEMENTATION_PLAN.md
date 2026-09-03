# Check-In 007 — iPad Scroll Robustness Plan v28 (Cycle 15)

## 1. Overview

Cycle 15 fixes the reported iPadOS WebKit touch-scroll failure on the roster, then adds the next two backlog robustness items opened in Audit v56: an iOS touch-momentum-scroll regression gate wired into CI and cache-busted single-file kiosk artifacts for Safari / Add-to-Home-Screen redeploys. The plan deliberately isolates the runtime scroll change to one CSS variable first, because `docs/IPAD_SCROLL_BUG.md` records that prior bundled attempts made the iPad behavior worse. The output preserves the self-contained `dist/index.html` build, the offline HTTPS helper, existing desktop/web gates, native SwiftUI code, 40-guest sample path, and >500-row virtualization behavior.

Source trace:

- RA #14 in `CONSOLIDATED_AUDIT.md` v56: make the roster reliably touch-scroll on iPadOS Safari / standalone.
- Backlog item 1: "Real-device / iOS-Simulator touch-momentum-scroll regression test wired into CI."
- Backlog item 2: "iOS standalone / Add-to-Home-Screen cache-busting for the single-file build."

## 2. Scope

### In scope

1. Remove transform/scale animation from the roster screen's fixed ancestor at rest and during entrance, while preserving the entrance animation for loading, scan, result, and admin screens.
2. Add a probe-only roster scroll mode, activated only by an explicit query parameter, that exposes scroll state in DOM/accessibility text for real iOS touch verification without changing normal kiosk UX.
3. Add a self-hosted macOS/iOS CI workflow and runner script that boots an iPadOS simulator or uses an attached iPad-capable runner, loads the cache-busted HTTPS kiosk URL, performs a synthesized vertical touch drag, and fails unless the roster's real scroll position changes.
4. Add deterministic cache-busted build output for the single-file artifact, including a content-hashed HTML filename and manifest metadata, while keeping `dist/index.html` for existing workflows.
5. Extend unit/e2e coverage around roster transform contracts, probe mode isolation, build manifest/hash output, and static serving headers.
6. Document the iPad verification workflow, required runner labels/secrets, cache-busted deployment path, and manual fallback when the CI runner is unavailable.

### Out of scope

- Replacing the web app with the native SwiftUI build, altering native app behavior, or changing native guest/log/storage contracts.
- Reworking roster layout from grid to block, adding scroll "kicks", adding `touch-action`/`overscroll-behavior` changes, or promoting layers unless the isolated transform removal fails and a revised plan is approved.
- Changing guest data, check-in persistence, camera capture, audio, admin merge/export behavior, or virtual-list math.
- Making hosted Linux CI depend on Xcode/iOS. The new iOS gate runs only on a macOS/iOS-capable runner label and reports a clear skip/failure reason when that runner is not provisioned.
- Claiming the iPad bug fixed based only on Chromium, desktop WebKit, or Playwright mobile emulation.

## 3. Architecture

```text
src/styles.css
  roster-screen transform contract
    -> normal kiosk on iPad Safari: roster fixed ancestor is never transformed
    -> other screens: existing scale+fade entrance remains

src/app.mjs + src/screens/roster.mjs
  query params
    -> normal mode: unchanged UI
    -> ?scrollProbe=1: adds status node and scroll listener for iOS UI automation

scripts/build.mjs
  app html
    -> dist/index.html
    -> dist/check-in-007.<hash>.html
    -> dist/check-in-007.manifest.json

scripts/ios-scroll-smoke.mjs
  build + HTTPS server + simctl/device orchestration
    -> opens https://<host>:<port>/check-in-007.<hash>.html?scrollProbe=1
    -> invokes Xcode UI test on Safari/WebKit touch path
    -> exits nonzero if scroll probe stays at 0

.github/workflows/ios-scroll.yml
  self-hosted macOS/iOS runner
    -> npm ci
    -> npm run build
    -> npm run test:ios-scroll
```

The normal app remains static and dependency-light. The probe path is owned by the web app but inert unless the query parameter is present. The CI runner owns simulator/device availability; the script fails closed when explicitly enabled and cannot silently pass without proving scroll movement.

## 4. Technical Decisions and Rationale

### 4.1 Isolate the scroll fix to the roster ancestor transform

Chosen: modify `src/styles.css` so `.screen` has no base transform, `#app.is-ready .screen` controls opacity only, and the scale transition applies through a selector that excludes `.roster-screen`, such as `#app:not(.is-ready) .screen:not(.roster-screen)` or a dedicated `.screen-enter-scale` contract. The roster screen must compute to `transform: none` both before and after `is-ready`; other screens retain the visual scale entrance.

Why over alternatives: `docs/IPAD_SCROLL_BUG.md` identifies the transformed fixed ancestor as the best-fitting hypothesis and warns that bundled block-layout/kick/touch-action changes regressed to "no scroll at all." Removing only the roster ancestor transform tests the highest-signal variable without altering scroller display, flex sizing, virtualization, or event handling.

Tradeoff: the roster no longer has the subtle scale entrance on iPad/desktop, but it keeps fade-in and gains reliable primary-device scrolling. Other screens keep the intended transition.

Evidence: the source currently has `.screen { position: fixed; transform: scale(0.985); transition: opacity, transform; }` and `#app.is-ready .screen { transform: scale(1); }`, while `.roster-list` is the touch scroller with `-webkit-overflow-scrolling: touch`. Apple documents Simulator control through `xcrun simctl` in the Xcode command-line reference, and Playwright's own docs describe mobile support as emulation of browser/device parameters, not proof that real iOS Safari touch-momentum internals behaved correctly. See:

- https://developer.apple.com/documentation/xcode/xcode-command-line-tool-reference
- https://playwright.dev/docs/emulation
- https://playwright.dev/docs/browsers

### 4.2 Add a probe-only scroll oracle instead of screenshot/OCR inference

Chosen: add a query-param gated scroll probe to the roster screen. In probe mode, the app renders a small fixed text node with stable text and an accessibility-friendly label, initialized to `scroll-probe:0`, then updates it from the real `.roster-list.scrollTop` inside the list's `scroll` event.

Rejected alternatives: screenshot pixel comparison and OCR are brittle under fonts/safe-area changes; desktop Playwright `hasTouch` emulation cannot validate the iPadOS momentum layer; making the probe visible in normal mode pollutes the kiosk UI.

Tradeoff: test-only code ships inside the self-contained HTML, but it is inert unless a diagnostic query parameter is present and adds only a tiny listener/node on that path.

Skeletal contract:

```js
export function readRuntimeFlags(search = window.location.search) {
  /** Returns { scrollProbe: boolean, buildVersion: string | null }. Invalid params are ignored. */
  ...
}

export function createScrollProbe(list, { enabled, documentRef = document } = {}) {
  /** In normal mode returns { dispose() } without DOM mutation.
      In probe mode appends #scroll-probe-status and updates text from list.scrollTop.
      Throws TypeError when enabled and list is not an Element. */
  ...
}
```

### 4.3 Use a self-hosted macOS/iOS CI lane for real touch, not Linux emulation

Chosen: add `.github/workflows/ios-scroll.yml` targeting explicit labels such as `self-hosted`, `macOS`, and `ios-touch`. The job runs `npm ci`, `npm run build`, and `npm run test:ios-scroll`. The Node script checks `xcrun simctl`, selected runtime/device, and local HTTPS startup, then invokes a focused Xcode UI test that opens the cache-busted URL and performs an actual press-drag on the roster area.

Why over alternatives: GitHub's Ubuntu runners cannot run Xcode/iOS. GitHub-hosted macOS runners are useful but runner availability, Xcode runtime inventory, billing, and hardware/device access are operational variables in this repo already. A self-hosted label makes the dependency explicit and prevents the main web gate from becoming flaky or blocked by missing iOS capacity.

Tradeoff: the gate requires an operator-provisioned runner before it can provide signal. Until then, the workflow file and script are present, and the script fails closed when `CHECKIN007_IOS_SCROLL_REQUIRED=1` is set.

External constraints checked:

- GitHub documents hosted and larger runners separately, with macOS limitations that matter for iOS-capable jobs: https://docs.github.com/en/actions/reference/runners/github-hosted-runners and https://docs.github.com/en/actions/reference/runners/larger-runners
- Apple documents installing additional Xcode components/runtimes separately from the command-line tools: https://developer.apple.com/documentation/xcode/downloading-and-installing-additional-xcode-components

Skeletal contract:

```js
export async function runIosScrollSmoke({
  root = process.cwd(),
  device = process.env.CHECKIN007_IOS_DEVICE || 'iPad',
  runtime = process.env.CHECKIN007_IOS_RUNTIME || 'iOS',
  required = process.env.CHECKIN007_IOS_SCROLL_REQUIRED === '1',
  timeoutMs = 120_000,
} = {}) {
  /** Builds the kiosk, starts HTTPS, opens the hashed probe URL on iOS WebKit,
      runs the focused touch-drag UI test, and returns { status, url, deviceId }.
      Exits/skips only when not required and no iOS runner is available. */
  ...
}
```

### 4.4 Cache-bust with content-hashed HTML while preserving `index.html`

Chosen: after building the self-contained HTML, compute a SHA-256 content hash and write:

- `dist/index.html` for existing users, tests, and upload compatibility.
- `dist/check-in-007.<12-char-hash>.html` for iOS Safari / standalone reloads that need a new URL.
- `dist/check-in-007.manifest.json` with `{ "artifact": "...", "sha256": "...", "gzipSize": ..., "byteSize": ... }`.

The HTTPS helper already sends `Cache-Control: no-store`; tests will assert that header for both `/index.html` and the hashed artifact. The hashed filename handles cases where installed web apps or manual operator flows keep stale URL-level state despite headers.

Rejected alternatives: replacing `index.html` would break existing README/CI/e2e paths; query-only versioning is less durable for Add-to-Home-Screen because operators may bookmark/share a URL without the query; service workers are unnecessary and would add a second cache invalidation layer.

Evidence: MDN documents `Cache-Control` response directives including `no-cache` revalidation and `no-store` non-storage semantics, and the current static server already emits `no-store` for served files. See https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control.

Skeletal contract:

```js
export function artifactNameFor(html) {
  /** Returns { fileName, sha256 } using SHA-256 over the exact emitted HTML bytes. */
  ...
}

export async function writeBuildArtifacts({ html, gzipSize, root }) {
  /** Writes index.html, the hashed HTML twin, and manifest JSON atomically enough
      for local CI; returns { html, gzipSize, byteSize, artifact, sha256 }. */
  ...
}
```

## 5. File Manifest

```text
BACKLOG.md                                      (MOD) — mark the two selected iPad/iOS robustness items in progress
IMPLEMENTATION_PLAN.md                         (MOD) — replace Cycle-14 plan with this Cycle-15 contract
src/styles.css                                 (MOD) — remove roster-screen ancestor transform while preserving other screen entrances
src/app.mjs                                    (MOD) — read runtime flags once and pass them to roster mounting
src/screens/roster.mjs                         (MOD) — add probe-only scroll status node/listener and cleanup
scripts/build.mjs                              (MOD) — emit content-hashed HTML artifact and manifest beside index.html
scripts/ios-scroll-smoke.mjs                   (NEW) — orchestrate build, HTTPS serving, simctl/device checks, and focused iOS scroll verification
package.json                                   (MOD) — add test:ios-scroll script
package-lock.json                              (MOD) — script metadata update only if npm mutates lockfile metadata; no dependency additions expected
.github/workflows/ios-scroll.yml               (NEW) — self-hosted macOS/iOS touch-scroll CI lane
native/CheckIn007WebUITests/WebRosterScrollUITests.swift (NEW) — XCUITest Safari/WebKit touch-drag assertion against the probe URL
native/CheckIn007.xcodeproj/project.pbxproj    (MOD) — add focused web UI test target/file if a separate target is required
native/CheckIn007.xcodeproj/xcshareddata/xcschemes/CheckIn007Web.xcscheme (NEW) — shared scheme for the focused web UI test target if required
tests/unit/build.test.mjs                      (MOD) — assert hashed artifact/manifest content and size invariants
tests/unit/roster.test.mjs                     (MOD) — assert probe helper is inert by default and updates on scroll in probe mode
tests/unit/serve-https.test.mjs                (MOD) — assert no-store for index and hashed artifacts through the HTTPS helper
tests/e2e/checkin.spec.mjs                     (MOD) — assert roster transform contract, normal-mode probe absence, and desktop scroll regression remains green
README.md                                      (MOD) — document iOS scroll runner, cache-busted kiosk URL, and manual verification procedure
docs/IPAD_SCROLL_BUG.md                        (MOD) — append Cycle-15 fix/verification result section after implementation
```

No files outside this manifest may change. `dist/` remains generated/untracked unless already ignored by project policy.

## 6. Implementation Phases

### Phase 1 — Isolated roster transform fix

1. Update `src/styles.css` so `.roster-screen` and its `.roster-list` ancestors compute to `transform: none` before, during, and after `#app.is-ready`.
2. Keep opacity transition for `.roster-screen`; keep opacity+scale transition for non-roster screens.
3. Add e2e assertions that a roster page reports `getComputedStyle(rosterScreen).transform === 'none'`, while a scan/result/admin screen still has the scale entrance contract during transition.
4. Re-run desktop Chromium/Playwright scroll checks to ensure the existing valid scroller geometry is not broken.

Acceptance: normal roster UI still renders 40 rows in the non-virtualized path, virtualized tests remain green, and no layout/display/kick/touch-action changes are introduced.

### Phase 2 — Probe-only scroll oracle

1. Add runtime flag parsing with exact activation only for `scrollProbe=1`.
2. Add `createScrollProbe()` in `src/screens/roster.mjs`; it must be no-op by default and must remove its event listener in `dispose()`.
3. Render probe text outside the list's scrollable content but inside the roster screen so it remains visible to XCUITest after dragging.
4. Add unit tests for default no-op, enabled initial text, scroll update, cleanup, and malformed list handling.
5. Add e2e tests proving normal URLs do not contain probe UI and probe URLs do.

Acceptance: production kiosk DOM is unchanged unless the probe query is present, and probe status reflects actual `scrollTop`, not a synthetic gesture counter.

### Phase 3 — Cache-busted build artifacts

1. Refactor `scripts/build.mjs` to compute SHA-256 over the exact emitted HTML string after CSS/font/data/module inlining.
2. Write `dist/index.html`, `dist/check-in-007.<hash>.html`, and `dist/check-in-007.manifest.json`.
3. Keep existing budget checks before writing outputs.
4. Update build tests for deterministic hash, manifest JSON shape, both files byte-identical, and module-syntax residual checks.
5. Update HTTPS/static server tests to serve both artifact names with `Cache-Control: no-store`.
6. Update `.github/workflows/ci.yml` artifact upload path to `dist/` if necessary so the hashed artifact and manifest are retained with `index.html`.

Acceptance: `npm run build` still prints a concise result, `dist/index.html` remains available for all current tests, and the manifest points to an existing byte-identical hashed HTML file.

### Phase 4 — iOS touch-scroll CI lane

1. Add `scripts/ios-scroll-smoke.mjs` with explicit environment variables:
   - `CHECKIN007_IOS_SCROLL_REQUIRED=1` to fail when no iOS runner/device is present.
   - `CHECKIN007_IOS_DEVICE` for simulator/device selection.
   - `CHECKIN007_IOS_RUNTIME` for runtime matching.
   - `CHECKIN007_IOS_BASE_URL` for externally hosted device-farm runs; otherwise start local `serve-https`.
2. Add the focused web UI test target/scheme only if the existing native UI test target cannot launch Safari/WebKit independently.
3. The UI test opens the hashed probe URL, waits for `scroll-probe:0`, performs a vertical press-drag inside the roster list, and requires probe text to report a positive scroll value within the timeout.
4. Add `.github/workflows/ios-scroll.yml` on the self-hosted macOS/iOS labels. The job is separate from the existing Linux web gate, has `timeout-minutes`, uploads Xcode results on failure, and never hides a required-run failure.
5. Document runner provisioning and the manual real-iPad fallback command.

Acceptance: on an enabled iOS runner the job proves touch-driven scroll movement. On a non-iOS local workstation, the script reports `SKIPPED: iOS runner unavailable` only when `CHECKIN007_IOS_SCROLL_REQUIRED` is not set.

### Phase 5 — Verification and completion notes

1. Run `npm ci`, `npm run lint`, `npm run test:unit`, `npm run test:e2e`, and `npm run build` on Node 24.
2. Run `npm run test:ios-scroll` on the available real iPad/iOS Simulator runner. If unavailable locally, record that the code path is installed but the gate requires the self-hosted runner; do not mark the iPad fix verified until a real iOS result exists.
3. Run existing native tests if Xcode/iPadOS runtime is present; otherwise preserve the previously documented environment limitation.
4. Append the actual Cycle-15 implementation evidence to `docs/IPAD_SCROLL_BUG.md`.
5. Mark implementation checklist items complete in this plan after code lands; leave backlog closure for the discriminator after audit.

Acceptance: web gates remain green, build artifacts are generated, and the iOS scroll result is either a recorded PASS from real iOS touch or an explicitly unverified gate awaiting the provisioned runner.

## 7. Integration Points

### 7.1 CSS transition system ↔ roster scroller

- **Contract:** `.roster-list` stays the only scroll container; `.roster-screen` stays fixed/flex but never transformed.
- **Failure mode:** if any ancestor computes to a transform on iPad first paint, RA #14 may persist.
- **Migration path:** CSS-only visual change to roster entrance; no data or DOM migration.

### 7.2 Runtime flags ↔ normal kiosk mode

- **Contract:** `scrollProbe=1` is the only activation path. Normal routes have no probe node and no extra visible text.
- **Failure mode:** accidental probe display pollutes kiosk UX or false positives test synthetic state.
- **Migration path:** query-gated additive behavior; no stored setting.

### 7.3 Build output ↔ deployment and CI artifacts

- **Contract:** `dist/index.html` remains the compatibility artifact; `dist/check-in-007.<hash>.html` is the cache-busted URL; manifest names the hash artifact.
- **Failure mode:** existing tests/README/CI break if `index.html` disappears; iOS stale-cache workaround fails if hash does not change with content.
- **Migration path:** additive output files, same single-file contents, updated docs.

### 7.4 HTTPS helper ↔ iOS runner

- **Contract:** local iOS smoke uses HTTPS because camera/secure-context behavior and installed web-app flows require it; static server returns `no-store` and serves hashed artifacts.
- **Failure mode:** certificate/SAN trust failure blocks iOS load before scroll can be tested.
- **Migration path:** reuse existing `serve-https` certificate install flow; allow `CHECKIN007_IOS_BASE_URL` for pre-trusted device farm hosting.

### 7.5 GitHub Actions ↔ self-hosted iOS capacity

- **Contract:** Linux web CI remains mandatory and fast; iOS touch CI is a separate job on explicit runner labels.
- **Failure mode:** no matching runner leaves the workflow queued rather than silently passing.
- **Migration path:** document runner labels and make branch protection opt-in once runner capacity exists.

## 8. Error Handling and Edge Cases

| Condition | Detection | Response and recovery |
| --- | --- | --- |
| Roster still does not scroll on iPad after transform fix | probe value remains 0 after real touch drag | Stop; do not add bundled fallback fixes without a revised plan |
| Desktop e2e scroll regresses | Playwright scrollTop/geometry assertion fails | Revert only the CSS/probe change causing the regression and diagnose |
| Probe flag leaks into normal mode | unit/e2e finds `#scroll-probe-status` without query | Fail and keep probe creation behind exact flag |
| Scroll event fires but `scrollTop` remains 0 | probe text unchanged | Treat as failure; the oracle must use real scroll offset |
| Virtualized roster path broken | existing >500-row tests fail | Fix within roster rendering without changing virtual-list math |
| Build hash nondeterministic | repeated build without source changes yields different artifact name | Remove volatile data from emitted HTML/manifest before hashing |
| `dist/index.html` and hashed artifact differ | byte compare fails | Write both from same HTML string |
| Static server caches HTML | header test missing `Cache-Control: no-store` | Restore no-store header for all served HTML artifacts |
| `xcrun simctl` unavailable | child-process exit / command not found | Skip only when not required; fail when required |
| iOS runtime/device missing | simulator list has no match | Clear error naming install/provisioning step; no false pass |
| Safari first-run UI blocks URL load | UI test cannot find probe status | Dismiss known first-run prompts in test setup or fail with screenshot/result bundle |
| Certificate trust blocks local HTTPS | page load does not reach probe | Use documented trusted cert setup or externally hosted `CHECKIN007_IOS_BASE_URL` |
| CI runner queues forever | GitHub workflow shows no matching self-hosted runner | Operator provisions runner or keeps the job out of required checks |

## 9. Stability and Performance

- CSS fix has O(1) runtime cost and removes a compositor transform from the roster screen, reducing rather than increasing roster paint/composition work.
- Probe mode adds one DOM node and one passive scroll listener only when `scrollProbe=1`; normal kiosk mode has no additional listener.
- Build hashing is O(N) over the emitted HTML bytes. Current artifact size is about 70 KB raw / 26 KB gzip, far below the 1.2 MB raw and 750 KB gzip budgets, so SHA-256 cost is negligible.
- Manifest write is O(1) and bounded to one small JSON file. The hashed artifact duplicates one HTML file in `dist/`; generated storage remains well below existing budgets.
- iOS CI lane is isolated from the Linux web gate. A hung simulator/test has explicit timeouts and uploads diagnostics on failure.
- No schema, localStorage, CSV, camera, audio, or native persistence migration is introduced.

## 10. Testing Strategy

- **Unit:** runtime flag parsing, probe creation/update/disposal, build artifact naming/manifest, byte identity between `index.html` and hashed artifact, `no-store` header coverage for both HTML paths.
- **E2E desktop regression:** existing roster scroll geometry and virtualized/non-virtualized tests; normal-mode absence of probe UI; probe-mode status update under programmatic scroll; CSS transform contract for roster vs non-roster screens.
- **iOS touch regression:** `npm run test:ios-scroll` on real iPad/iOS Simulator performs synthesized touch drag and asserts probe `scrollTop > 0`.
- **Build:** `npm run build` emits `index.html`, hashed HTML, manifest, remains within size budget, and preserves residual module-syntax checks.
- **CI:** existing `.github/workflows/ci.yml` remains Linux web gate; new `.github/workflows/ios-scroll.yml` runs only on the iOS-capable self-hosted lane.
- **Manual fallback:** documented real-iPad Safari/standalone fresh hashed URL test when CI runner is unavailable; result must be recorded in `docs/IPAD_SCROLL_BUG.md`.

## 11. Environment and Toolchain

- Node pinned by the repo: `.nvmrc` / `.node-version` `24.20.0`; `engines.node` `>=24 <25`.
- npm dependencies already present: `@playwright/test` 1.62.1, `acorn` 8.18.0, `axe-core` 4.13.0, `http-server` 14.1.1, `prettier` 3.9.6. No new npm dependency is planned.
- Xcode command-line tools with `xcrun simctl`; iPadOS simulator runtime or attached iPad-capable self-hosted runner.
- Existing HTTPS helper: `npm run serve:https`, with trusted certificate flow documented in `README.md`.
- GitHub Actions: existing Ubuntu web workflow plus new self-hosted macOS/iOS workflow. The iOS job depends on runner provisioning, not on GitHub's Linux hosted pool.

Fresh clone path remains:

```sh
npm ci
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

iOS runner path:

```sh
CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll
```

## 12. Deployment, Distribution, and Rollback

Deployment remains static-file based. Operators may continue using `dist/index.html`; iPad kiosk redeploys should use the new `dist/check-in-007.<hash>.html` URL, or the HTTPS server URL pointing to that filename, to force a fresh standalone/Safari load. Rollback is `git revert <cycle-15-implementation-commit>`; local stored check-ins/logs are untouched because no storage keys or schemas change. If the iOS workflow causes operational friction, it can be removed from branch protection without reverting the runtime scroll fix or build artifacts.

## 13. Open Questions and Decision Gates

1. **Is a self-hosted iOS runner already available?** Proposed resolution: implement the workflow against explicit labels and let local runs skip only when not required. Confirmation needed from repository operations before making the iOS job required in branch protection.
2. **Does isolated roster transform removal fix the physical iPad?** Proposed resolution: test this single variable first with the probe. If it fails, stop and draft a revised plan for the next isolated fallback from `docs/IPAD_SCROLL_BUG.md`.
3. **Should the hashed artifact become the primary uploaded artifact?** Proposed resolution: upload the full `dist/` directory so both `index.html` compatibility and hashed deployment are available.
4. **Does Safari standalone require additional manifest/start_url work?** Proposed resolution: start with content-hashed URLs and existing meta tags; add a web app manifest only in a later plan if fresh hashed URLs do not solve stale loads.

## 14. Completion Checklist

- [ ] Phase 1: roster transform removed in isolation and desktop regressions pass.
- [ ] Phase 2: probe-only scroll oracle implemented and hidden in normal mode.
- [ ] Phase 3: content-hashed artifact and manifest emitted beside `index.html`.
- [ ] Phase 4: iOS touch-scroll CI lane and runner script installed.
- [ ] Phase 5: Node/web gates pass and real iOS touch result is recorded or explicitly blocked on runner provisioning.
