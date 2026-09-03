# Check-In 007 — iPad Scroll Verification and Cycle Artifact Guard Plan v30 (Cycle 17)

## 1. Overview

Cycle 17 addresses the remaining actionable audit findings from `CONSOLIDATED_AUDIT.md` v62. The main system-health cap is RA #14: the iPad roster touch-scroll fix is code-complete but cannot be called resolved until a real iPad or iOS Simulator run proves the touch path. This plan improves the device-verification lane and evidence contract without making speculative scroll changes, and it also addresses RA #16 by adding a repository-local guard that catches empty root critique files before future cycle commits lose the approval record again.

Source trace:

- `CONSOLIDATED_AUDIT.md` v62 RA #14: `BLOCKED (env / device)`, code-complete, requires `CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll` on a provisioned iPad/iOS Simulator or manual real-iPad fallback evidence.
- `CONSOLIDATED_AUDIT.md` v62 RA #16: `OPEN`, P3, repeated empty `IMPLEMENTATION_PLAN_CRITIQUE.md` after new-cycle/archive commits.
- `CONSOLIDATED_AUDIT.md` v62 RA #10: `BLOCKED (external billing)`, explicitly outside the code loop and out of scope for this plan.

## 2. Scope

### In scope

1. Make `scripts/ios-scroll-smoke.mjs` produce machine-readable verification output for `passed`, `skipped`, and `failed` outcomes, including device/runtime/base URL/artifact/result-bundle metadata.
2. Add explicit real-device/simulator preflight diagnostics so operators can tell which prerequisite blocks RA #14: missing `xcrun`, missing `xcodebuild`, unavailable simulator/device name, missing hashed build artifact, HTTPS trust failure, or failed probe movement.
3. Preserve the existing fail-closed behavior: required mode exits nonzero when the iOS runner is unavailable or the scroll assertion fails; non-required mode skips honestly.
4. Add an operator runbook for RA #14 with exact simulator and real-iPad verification paths, evidence requirements, cache-busting expectations, and the rule that desktop/CI evidence cannot resolve the defect.
5. Update `docs/IPAD_SCROLL_BUG.md` and `docs/VERIFICATION_EVIDENCE.md` with the new evidence format and a placeholder/result section that must only be marked PASS after a real iPad/iOS Simulator run.
6. Add a cycle-artifact guard script that fails when `IMPLEMENTATION_PLAN.md` is non-empty but `IMPLEMENTATION_PLAN_CRITIQUE.md` is missing or zero bytes, with an override for the intentional pre-critique planning window.
7. Wire the guard into `package.json` and CI so future commits and pull requests surface RA #16 before the empty-critique recurrence becomes invisible process drift.
8. Add focused unit tests for the iOS smoke result writer/preflight classification and the cycle-artifact guard.

### Out of scope

- Changing the roster scroll CSS, touch handling, DOM structure, virtualization, `scrollProbe` runtime flag, or the already-implemented Cycle 15 scroll fix unless a real-device failure later proves it insufficient.
- Marking RA #14 resolved without a real iPad/iOS Simulator PASS.
- Changing web app manifest/start URL behavior from Cycle 16.
- Solving RA #10 GitHub billing or requiring external account changes.
- Editing `CONSOLIDATED_AUDIT.md`, `IMPLEMENTATION_PLAN_CRITIQUE.md`, or `BACKLOG.md`; those remain discriminator-owned records.
- Adding pre-commit hooks or developer-global Git configuration. The guard is an npm/CI check and can be adopted by the orchestrator without mutating local hooks.

## 3. Architecture

```text
scripts/ios-scroll-smoke.mjs
  runIosScrollSmoke(options)
    |
    +--> preflightIosRunner(options)
    |     classifies xcrun/xcodebuild/device-runtime availability
    |
    +--> build() + static HTTPS helper + xcodebuild UI test
    |
    +--> writeIosScrollResult(result, outputPath)
          emits JSON evidence for pass/skip/fail

docs/IOS_SCROLL_RUNBOOK.md
  operator procedure for simulator and real-device verification

docs/IPAD_SCROLL_BUG.md
  concise status + link to runbook + latest evidence pointer

scripts/check-cycle-artifacts.mjs
  validates canonical plan/critique/audit/backlog files
    |
    +--> package.json check:cycle-artifacts
    +--> .github/workflows/ci.yml
    +--> tests/unit/cycle-artifacts.test.mjs
```

The verification lane remains opt-in for machines with an iOS runner. On a capable runner, the smoke script builds the current hashed kiosk artifact, serves it over HTTPS when `CHECKIN007_IOS_BASE_URL` is absent, opens Mobile Safari with `?scrollProbe=1`, performs the right-edge touch drag, and records the probe movement result. On machines without the runner, non-required mode returns a structured skip; required mode fails closed so CI cannot silently claim RA #14.

The artifact guard is separate from the iPad lane. It makes RA #16 observable by checking canonical workflow files in the repository root. Because a generator new-cycle commit necessarily lands before the discriminator writes a fresh critique, the script supports a narrowly-named override environment variable for intentional planning commits; CI and normal validation run without the override.

## 4. Technical Decisions and Rationale

### 4.1 Preserve the existing iOS XCTest path and add structured evidence around it

Chosen: keep `native/CheckIn007UITests/WebRosterScrollUITests.swift` as the source of truth for the touch assertion and extend the Node wrapper around it.

Why: the current XCTest already drives Mobile Safari instead of desktop WebKit and asserts the real `scrollTop` oracle, matching the audit's requirement. Replacing it with Playwright would not exercise iPadOS touch momentum; replacing it with a manual-only path would reduce repeatability.

Rejected alternatives:

- Desktop Playwright WebKit: already known not to reproduce the bug and explicitly invalid for RA #14 resolution.
- Pure manual checklist with no script output: useful as fallback, but too easy to over-claim and too hard for the discriminator to audit.
- Additional CSS/layout changes before device evidence: violates the v62 directive to avoid speculative scroll changes unless the isolated transform removal is proven insufficient.

Tradeoff: this plan still cannot make an iOS runner appear in the local environment. It makes the blocked state precise and converts a future device run into auditable evidence.

### 4.2 Use single JSON evidence, not prose-only logs

Chosen: `scripts/ios-scroll-smoke.mjs` writes one JSON file at `test-results/ios-scroll-result.json` by default and still prints the existing concise console message.

Why: JSON lets docs, CI artifacts, and later audit checks verify exact fields (`status`, `required`, `device`, `runtime`, `url`, `artifact`, `resultBundle`, `reason`, `startedAt`, `finishedAt`) without parsing prose. A single JSON document is sufficient because each invocation produces one result.

Rejected alternatives:

- Only updating `docs/IPAD_SCROLL_BUG.md`: documentation can drift from reality.
- JUnit XML: useful for CI dashboards, but heavier than needed because `xcodebuild` already produces the `.xcresult` bundle and the repository tests use Node assertions.

Tradeoff: one more generated file under `test-results/`; it should remain ignored/untracked except when evidence is intentionally copied into docs.

Skeletal contract:

```js
export function normalizeIosScrollResult({
  status,
  required,
  device,
  runtime,
  url = null,
  artifact = null,
  resultBundle = null,
  reason = null,
  error = null,
  startedAt,
  finishedAt,
}) {
  /** Returns a stable JSON-serializable result.
      Throws TypeError when status is not passed/skipped/failed or required fields are missing.
      Redacts multiline command output to bounded error strings for docs-safe artifacts. */
  ...
}

export async function writeIosScrollResult(result, outputPath) {
  /** Creates parent directories and writes `${JSON.stringify(result, null, 2)}\n`.
      Returns the written result. */
  ...
}
```

### 4.3 Classify preflight failures before launching the expensive smoke run

Chosen: add `preflightIosRunner()` that checks `xcrun simctl list devices available`, `xcodebuild -version`, and requested device/runtime presence before `build()` or server startup.

Why: v62's remaining blocker is environmental. Operators need to distinguish "no Xcode tools", "wrong simulator name", and "test failed after launch." The current wrapper collapses several unavailable states into skip strings, which is honest but not diagnostic enough for a handoff.

Rejected alternative: let `xcodebuild` fail and inspect stderr. That is less stable across Xcode versions and wastes time when prerequisites are plainly absent.

Skeletal contract:

```js
export async function preflightIosRunner({
  device,
  runtime,
  runCommand = run,
} = {}) {
  /** Returns { ok:true, device, runtime } when xcrun, xcodebuild, and the requested
      device/runtime are available.
      Returns { ok:false, code, reason, requiredAction } for missing_xcrun,
      missing_xcodebuild, missing_runtime, or missing_device. */
  ...
}
```

### 4.4 Guard root critique integrity with an explicit override

Chosen: add `scripts/check-cycle-artifacts.mjs` and `npm run check:cycle-artifacts`. Default behavior fails if:

- `IMPLEMENTATION_PLAN.md` is missing or zero bytes.
- `CONSOLIDATED_AUDIT.md` is missing or zero bytes.
- `BACKLOG.md` is missing or zero bytes.
- `IMPLEMENTATION_PLAN_CRITIQUE.md` is missing or zero bytes while `CHECKIN007_ALLOW_EMPTY_CRITIQUE` is not `1`.

Why: RA #16 is a process bug, not app runtime behavior. A repository-local check is the smallest durable enforcement point and can run anywhere Node 24 runs.

Rejected alternatives:

- Auto-generating critique content: the generator must not write discriminator-owned critique content.
- Failing every new-cycle plan commit with no override: the discriminator necessarily scores after the plan commit, so the planning window needs a deliberate escape hatch.
- Git hooks: not portable in CI and too invasive for a repo-local plan.

Tradeoff: the override can be misused. The script and docs must say it is only valid for the single generator planning commit before discriminator review.

Skeletal contract:

```js
export function checkCycleArtifacts({
  files,
  allowEmptyCritique = false,
}) {
  /** Returns { ok:true, checked:[...] } or { ok:false, errors:[...] }.
      Does not modify files. Treats whitespace-only canonical files as empty. */
  ...
}

export async function readCycleArtifactSizes(root = process.cwd()) {
  /** Reads canonical workflow files and returns byte size plus whitespace-only status
      for plan, critique, audit, and backlog. Missing files are represented explicitly. */
  ...
}
```

## 5. File Manifest

```text
IMPLEMENTATION_PLAN.md                  (MOD) — replace Cycle-16 plan with this Cycle-17 contract
package.json                            (MOD) — add check:cycle-artifacts and include it in CI-facing validation
.github/workflows/ci.yml                (MOD) — run npm run check:cycle-artifacts without the empty-critique override
.github/workflows/ios-scroll.yml        (MOD) — upload ios-scroll-result.json with xcresult and document required-mode evidence
scripts/ios-scroll-smoke.mjs            (MOD) — add preflight classification and JSON result writing while preserving current CLI behavior
scripts/check-cycle-artifacts.mjs       (NEW) — root canonical workflow-file integrity guard for RA #16
tests/unit/ios-scroll-smoke.test.mjs    (NEW) — unit tests for preflight classification and result JSON normalization/writing
tests/unit/cycle-artifacts.test.mjs     (NEW) — unit tests for empty/missing critique guard and intentional override
docs/IOS_SCROLL_RUNBOOK.md              (NEW) — operator runbook for real iPad/iOS Simulator RA #14 verification
docs/IPAD_SCROLL_BUG.md                 (MOD) — point status/evidence rules to the new runbook and keep RA #14 unverified until PASS exists
docs/VERIFICATION_EVIDENCE.md           (MOD) — add Cycle-17 evidence format and results section
README.md                               (MOD) — link the iPad scroll verification runbook from the existing iPad/offline workflow docs
```

No `src/` runtime code, guest data, manifest icon assets, native app production files, or storage keys should change.

## 6. Implementation Phases

### Phase 1 — iOS smoke preflight and structured result output

**Status:** COMPLETE in the Cycle 17 implementation commit.

1. Refactor `scripts/ios-scroll-smoke.mjs` so command execution remains injectable for tests.
2. Add `preflightIosRunner()` before `build()` and server startup.
3. Add `normalizeIosScrollResult()` and `writeIosScrollResult()`.
4. Add an output path option and environment variable:
   - default: `test-results/ios-scroll-result.json`
   - env override: `CHECKIN007_IOS_SCROLL_RESULT`
5. On skip, write a result with `status: "skipped"` and preserve current required/non-required behavior.
6. On pass, include the hashed artifact filename, probe URL, device, runtime, result bundle path, and timestamps.
7. On failure after runner availability, write `status: "failed"` with a bounded error string, then exit nonzero.

Acceptance:

- `npm run test:ios-scroll` on a machine without iOS tooling still exits 0 and prints a skip.
- `CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll` on a machine without iOS tooling exits nonzero and writes `status: "failed"` or an unavailable required-mode result, not a PASS.
- A mocked pass path writes `status: "passed"`, `url` ending in `?scrollProbe=1`, and `artifact` matching `check-in-007.<12 hex>.html`.

### Phase 2 — Cycle artifact guard for RA #16

**Status:** COMPLETE in the Cycle 17 implementation commit.

1. Add `scripts/check-cycle-artifacts.mjs`.
2. Add `npm run check:cycle-artifacts`.
3. Wire the check into `.github/workflows/ci.yml` as a separate step after dependency install and before lint/test/build.
4. Document that the generator planning commit may use `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1 npm run check:cycle-artifacts` until discriminator review restores the critique.
5. Ensure the script never writes or repairs discriminator-owned files.

Acceptance:

- With a non-empty temp critique file, the script exits 0.
- With a missing, zero-byte, or whitespace-only temp critique file, the script exits nonzero.
- With `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1`, the script exits 0 and prints an explicit warning naming the intentional pre-critique planning window.
- CI runs the guard without the override.

### Phase 3 — Tests

**Status:** COMPLETE in the Cycle 17 implementation commit.

1. Add `tests/unit/ios-scroll-smoke.test.mjs` covering:
   - missing `xcrun` classification,
   - missing `xcodebuild` classification,
   - missing requested device/runtime classification,
   - skipped result normalization,
   - passed result normalization,
   - failed result normalization with bounded error text,
   - result file writing.
2. Add `tests/unit/cycle-artifacts.test.mjs` covering:
   - all canonical files present and non-empty,
   - missing plan/audit/backlog failures,
   - empty critique failure,
   - override success and warning,
   - whitespace-only files treated as empty.
3. Keep existing unit/e2e/build tests unchanged except for any import/export adjustments needed by the refactor.

Acceptance:

- `npm run test:unit` passes on Node 24.
- Existing unit count increases by the new focused cases.
- No e2e test becomes dependent on iOS runner availability.

### Phase 4 — Documentation and evidence handoff

**Status:** COMPLETE in the Cycle 17 implementation commit.

1. Add `docs/IOS_SCROLL_RUNBOOK.md` with:
   - prerequisites for Xcode, iOS Simulator, and real-device execution,
   - exact simulator command using `CHECKIN007_IOS_DEVICE`, `CHECKIN007_IOS_RUNTIME`, and `CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll`,
   - exact external-base-URL command using `CHECKIN007_IOS_BASE_URL`,
   - manual real-iPad fallback checklist,
   - required evidence fields and where to copy them,
   - cache-busting instructions using `dist/check-in-007.manifest.json` and `dist/check-in-007.webmanifest`.
2. Update `docs/IPAD_SCROLL_BUG.md` to keep status `OPEN`/unverified until the PASS exists, and link to the runbook.
3. Update `docs/VERIFICATION_EVIDENCE.md` with a Cycle-17 section that records local non-iOS gates and clearly leaves the real-device PASS blank unless it has actually run.
4. Update README with a short pointer to the runbook from the offline iPad/HTTPS section.

Acceptance:

- Docs state that desktop Chromium/WebKit and normal CI cannot resolve RA #14.
- Docs show exactly which JSON fields prove a PASS.
- Docs do not claim RA #14 resolved unless `ios-scroll-result.json.status === "passed"` from an iPad/iOS Simulator run.

### Phase 5 — Verification gates

**Status:** COMPLETE for available local gates in the Cycle 17 implementation commit; required iOS
device PASS remains blocked until a provisioned iPad/iOS Simulator runner is available.

Run and record:

1. `npm run check:cycle-artifacts` after the discriminator restores a non-empty critique, or `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1 npm run check:cycle-artifacts` only for the generator-side planning window.
2. `npm run lint` on Node 24.
3. `npm run test:unit` on Node 24.
4. `npm run test:e2e` on Node 24.
5. `npm run build` on Node 24.
6. `npm run test:ios-scroll` in non-required mode on the local environment to verify honest skip/pass behavior.
7. `CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll` only on a provisioned iPad/iOS Simulator runner.

Acceptance:

- Local non-iOS gates pass.
- Required iOS mode either produces a real PASS on a provisioned runner or remains explicitly blocked/unresolved.
- If required iOS mode passes, the implementation updates `docs/IPAD_SCROLL_BUG.md` and `docs/VERIFICATION_EVIDENCE.md` with the PASS metadata.

## 7. Integration Points

### 7.1 `scripts/ios-scroll-smoke.mjs` CLI contract

Contract: existing `npm run test:ios-scroll` remains the entry point. The script still defaults to the `iPad Pro 13-inch (M4)` / `iOS` simulator naming and still accepts `CHECKIN007_IOS_DEVICE`, `CHECKIN007_IOS_RUNTIME`, `CHECKIN007_IOS_BASE_URL`, and `CHECKIN007_IOS_SCROLL_REQUIRED`.

Failure mode: unavailable tooling in non-required mode returns a skip; unavailable tooling or failed assertion in required mode exits nonzero.

Migration path: additive exports and JSON output only; existing CI continues to call the same npm script.

### 7.2 `.github/workflows/ios-scroll.yml`

Contract: self-hosted `[self-hosted, macOS, ios-touch]` job runs required mode and uploads both `test-results/ios-scroll.xcresult` and `test-results/ios-scroll-result.json` on failure or completion as appropriate.

Failure mode: if the runner label is unavailable, GitHub queues the job; if the device/runtime is unavailable, the script fails closed with structured evidence.

Migration path: no change to trigger events; the artifact upload is additive.

### 7.3 CI workflow and cycle-artifact guard

Contract: `.github/workflows/ci.yml` runs `npm run check:cycle-artifacts` without `CHECKIN007_ALLOW_EMPTY_CRITIQUE`.

Failure mode: if a future new-cycle/archive commit leaves the root critique empty, CI fails and points to RA #16.

Migration path: this Cycle-17 planning commit may still have an empty critique until discriminator review; the implementation must avoid claiming the guard is green until the critique is restored or the override is intentionally used.

### 7.4 Documentation and discriminator-owned files

Contract: generator-owned docs (`README.md`, `docs/*`) may describe evidence and status. Discriminator-owned files (`CONSOLIDATED_AUDIT.md`, `IMPLEMENTATION_PLAN_CRITIQUE.md`, `BACKLOG.md`) are not edited by implementation.

Failure mode: any generated prose that claims a PASS without JSON/result-bundle evidence is a documentation defect.

Migration path: future discriminator runs can consume the evidence and decide whether RA #14 and RA #16 close.

## 8. Error Handling and Edge Cases

- Missing `xcrun`: detected by command error or nonzero `xcrun simctl list devices available`; non-required skip, required failure with `code: "missing_xcrun"`.
- Missing `xcodebuild`: detected by `xcodebuild -version`; non-required skip, required failure with `code: "missing_xcodebuild"`.
- Requested runtime absent: detected by preflight stdout not containing the runtime; result includes requested runtime and available-output excerpt bounded to a small size.
- Requested device absent: detected separately from runtime so operators know whether to install a runtime or change `CHECKIN007_IOS_DEVICE`.
- Build failure: caught after preflight; writes failed JSON with `stage: "build"` and exits nonzero.
- HTTPS server startup failure: writes failed JSON with `stage: "server"` and exits nonzero.
- `xcodebuild` timeout: command result `status: "timeout"` becomes failed JSON with `stage: "xcodebuild"` and bounded stdout/stderr.
- Probe does not move: XCTest failure remains authoritative; Node wrapper records failed status and result bundle path.
- Missing `dist/check-in-007.manifest.json`: default URL construction fails with a clear `stage: "artifact"` error; `npm run build` should normally create it first.
- Result output directory missing: `writeIosScrollResult()` creates it.
- Result output unwritable: CLI still prints the core pass/skip/fail message, then exits nonzero because evidence could not be persisted.
- Empty `IMPLEMENTATION_PLAN_CRITIQUE.md`: guard fails unless `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1`.
- Whitespace-only critique: treated as empty.
- Intentional planning window: override prints a warning and returns success; docs identify it as valid only before discriminator scoring.

## 9. Stability and Performance

The iOS preflight adds two short command invocations before the existing expensive path. Each has a 10 second timeout; normal failure on machines without Xcode should complete in well under 10 seconds. The smoke run retains the existing 120 second default timeout for `xcodebuild`, which bounds CI time and preserves the current `.github/workflows/ios-scroll.yml` 20 minute job timeout.

The JSON result file is small, normally below 5 KB. Error output must be bounded to avoid multi-megabyte CI logs entering docs or artifacts. No browser/runtime path is added to the production kiosk, so runtime performance, bundle size, check-in latency, and local storage behavior are unchanged.

The cycle-artifact guard reads four small markdown files and performs O(n) whitespace checks over their contents. Expected runtime is under 100 ms on local machines and CI. It performs no writes, no network calls, and no Git mutation.

Crash/retry behavior:

- A killed `xcodebuild` process returns a timeout result and leaves any partial `.xcresult` for upload.
- Temporary HTTPS cert directories created by the smoke script continue to be removed in `finally`.
- If result writing fails, the failure is surfaced instead of silently losing evidence.

## 10. Testing Strategy

Unit tests:

- `tests/unit/ios-scroll-smoke.test.mjs` uses injected command runners and temporary directories to test preflight and result serialization without requiring Xcode.
- `tests/unit/cycle-artifacts.test.mjs` uses temporary canonical files to test guard behavior without touching the root plan/critique/audit/backlog.

Integration checks:

- Existing `npm run test:e2e` remains browser-only and should stay at the current coverage level.
- `npm run test:ios-scroll` is the iOS integration check. It is expected to skip on this environment unless an iOS runner is installed.

Regression tests:

- Existing build, static-server, manifest, roster, store, CSV, audio, and native parity unit tests must stay green.
- Existing e2e checks for roster transform removal and scroll probe behavior must stay green.
- The new guard test prevents recurrence of the exact RA #16 empty-root-critique failure mode.

## 11. Environment and Toolchain

Required for normal implementation:

- Node `24.20.0` from `.nvmrc` / `.node-version`
- `npm ci`
- Existing Playwright dependencies for browser e2e

Required only for RA #14 resolution:

- macOS host with Xcode command line tools
- iOS Simulator runtime or a real iPad/device runner compatible with `xcodebuild`
- `CHECKIN007_IOS_DEVICE` and `CHECKIN007_IOS_RUNTIME` matching an available target, or a reachable `CHECKIN007_IOS_BASE_URL` for external device testing
- Trusted HTTPS path for Mobile Safari, using the existing static HTTPS helper or an operator-managed trusted host

Fresh-clone commands:

```sh
npm ci
npm run check:cycle-artifacts
npm run lint
npm run test:unit
npm run test:e2e
npm run build
npm run test:ios-scroll
```

Provisioned iOS runner command:

```sh
CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll
```

## 12. Deployment and Distribution

No production deployment format changes. The kiosk remains a static web app built by `npm run build` and served by the existing HTTP/HTTPS helpers. CI gains one repository-integrity check and the iOS smoke workflow gains a structured result artifact.

Rollback:

- Revert this cycle's implementation commit to remove the new guard, runbook, tests, and iOS smoke wrapper changes.
- Existing kiosk runtime remains unaffected because `src/` production code is out of scope.
- If the guard blocks an urgent discriminator planning commit, use `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1` only for that planning window and immediately request discriminator scoring to restore the critique file.

## 13. Open Questions

1. **Which exact iPad/iOS Simulator target will run RA #14?**
   Proposed resolution: default remains `iPad Pro 13-inch (M4)` / `iOS`; operators override with `CHECKIN007_IOS_DEVICE` and `CHECKIN007_IOS_RUNTIME` after `xcrun simctl list devices available`.

2. **Can RA #14 be closed by this implementation if no device is available here?**
   Proposed resolution: no. The implementation can make the lane auditable and fail-closed, but only a real `status: "passed"` JSON result from iPad/iOS Simulator execution can justify closure.

3. **Should the cycle-artifact guard run inside `npm run lint` or only CI?**
   Proposed resolution: add a separate `check:cycle-artifacts` script and CI step. Include it in local documentation. Avoid folding it into `lint` until the discriminator restores the current empty critique, because this plan commit is intentionally pre-critique.

4. **Should the generator repair `IMPLEMENTATION_PLAN_CRITIQUE.md` directly?**
   Proposed resolution: no. The generator must not author discriminator-owned critique content. The guard detects the recurrence; the discriminator restores the authoritative critique during scoring.
