# Verification Evidence

This document was initialized in the target commit and finalized in the immediately following local
evidence commit. External results remain blocked unless a later operator-approved run supplies the
required success evidence.

## Target

- Commit: `628a4be100015e2d302609316d1c9cdd45a26cb0`
- Branch: `master`
- Recorded at: `2026-09-03T02:01:09Z`

## Local Web Gates

- Status: `PASS`
- Environment: Node `v26.3.0`; npm `11.16.0`
- Guard status: sanctioned direct-tool path; only `scripts/check-node-version.mjs` was bypassed.
  `npm ci` is unguarded and ran on the current interpreter.
- Commands/results: `npm ci` (exit 0, 0 vulnerabilities), `npx prettier --check .` (exit 0),
  `node --test tests/unit/*.test.mjs` (78/78 passed), `npx playwright test` (13/13 passed), and
  `node scripts/build.mjs` (exit 0; 26,315 gzip bytes).
- Local artifact: `dist/index.html`; 70,584 bytes;
  SHA-256 `8d5a9c65f83ed417acdd48cc367ce3663e60ff35a64008c0c5687cb7b2d9a744`.
- Notes: Node 24.20.0 installation was not authorized. The direct commands isolate each gate's result;
  an exact-SHA CI run remains the definitive pinned-Node-24 check.

## Native iOS Simulator

- Status: `BLOCKED`
- Environment: Xcode 26.4 (`17E192`); no installed iOS runtimes; no available simulator UDID.
- Command/result: read-only `xcodebuild -version`, `xcrun simctl list runtimes --json`,
  `xcodebuild -project native/CheckIn007.xcodeproj -scheme CheckIn007 -showdestinations`, and
  `xcodebuild -list -json -project native/CheckIn007.xcodeproj` preflight completed. The shared
  `CheckIn007` scheme and app, `CheckIn007Tests`, and `CheckIn007UITests` targets are present; tests
  were not run.
- Notes: iOS 26.4 is not installed. The host reported 61 GiB available before installation.
  `xcodebuild -downloadPlatform iOS` changes host state and requires explicit operator approval.
  Recovery: approve the download, select an available iOS 26+ iPad UDID, and run the isolated
  scheme-level test command. Six unit suites (32 methods) and four UI tests remain unverified.

## GitHub Actions CI

- Status: `BLOCKED`
- Repository/run: no Git remote is configured; no run URL or ID exists.
- Identity/result: intended workflow `CI`, push event, branch `master`, exact target SHA
  `628a4be100015e2d302609316d1c9cdd45a26cb0`. No workflow job or step conclusions are available.
- Artifact: expected `dist-index-html`; CI bytes/hash and local parity are unavailable.
- Notes: GitHub CLI authentication is present, but repository selection, remote creation/addition,
  and publication were not authorized. Recovery: approve an exact owner/repository and normal push,
  then inspect the `CI` run whose `headSha` equals the target SHA and compare its artifact byte-for-byte
  with a fresh same-SHA local build.

## Cycle 11 — External Execution Closure

- Target commit: `845116d41375cd6422f49bb2a53f23bcec3109e9`
- Branch/repository: `master`; `daniqan/check-in-007`
- Recorded at: `2026-09-03T03:50:37Z`

### Local Web Gates — PASS

- Environment: Node `v26.3.0`; npm `11.16.0`.
- Guard status: sanctioned direct-tool path; only the Node 24 version guard was bypassed. The
  exact-SHA CI run remains the authoritative pinned-Node-24 gate.
- Commands/results: `npm ci` (exit 0, 0 vulnerabilities), `npx prettier --check .` (exit 0),
  `node --test tests/unit/*.test.mjs` (78/78 passed), `npx playwright test` (13/13 passed), and
  `node scripts/build.mjs` (exit 0; 26,315 gzip bytes).
- Local artifact: `dist/index.html`; 70,584 bytes; SHA-256
  `8d5a9c65f83ed417acdd48cc367ce3663e60ff35a64008c0c5687cb7b2d9a744`.

### Native iOS Simulator — FAIL

- Environment: Xcode 26.4 (`17E192`); iOS 26.4; iPad (A16)
  `A155995F-EC83-41BE-95B2-1A5F390ABF59`.
- Command/result: the isolated scheme-level `xcodebuild test` command started both
  `CheckIn007Tests` and `CheckIn007UITests`, but the unit target failed before completion.
  `CSVCodecTests.testParsesBomCrlfQuotedCommasAndDoubledQuotes` expected two parsed rows and received
  one, after which the test process crashed on an out-of-range array access. The runner restarted,
  but was terminated after it subsequently stalled in
  `CameraPrivacyTests.testStartOnSimulatorDoesNotCrashAndStaysNonRunning`; no valid result bundle was
  produced.
- Disposition: the plan's native success gate is not met. No source or test was changed to bypass
  the failure, and the required six suites/32 unit methods/four UI tests/zero failures cannot be
  claimed.

### GitHub Actions CI — FAIL

- Run: `https://github.com/daniqan/check-in-007/actions/runs/33711898714`; workflow `CI`; push event;
  branch `master`; exact head SHA `845116d41375cd6422f49bb2a53f23bcec3109e9`.
- Result: the workflow concluded `failure`; its `Web gate (Node 24 LTS)` job did not start because
  the account was locked due to a billing issue. No required step succeeded.
- Artifact: `dist-index-html` was not produced, so CI hash/size and exact local parity remain
  unavailable.

Cycle 11 remains incomplete. Neither failed external run is represented as `PASS`, and all §14
completion boxes remain open pending a code-fix/re-audit cycle and a successful exact-SHA CI run.

## Cycle 12 — Native CSV Parity Repair

- Fix commit: `b0bdf118c08be821e426b60eab7cd1ef5fe3c839`
- Environment: Xcode 26.4 (`17E192`); iOS 26.4 (`23E244`); iPad (A16)
  `A155995F-EC83-41BE-95B2-1A5F390ABF59`; Node `v26.3.0`; npm `11.16.0`.

### CSV regression — PASS

- Before the fix, the isolated `CSVCodecTests` run reproduced the audit defect: the BOM/CRLF fixture
  returned one row instead of two, then crashed on the unconditional second-row subscript.
- The parser now treats Swift's combined `Character("\r\n")` grapheme as one record delimiter while
  retaining standalone LF handling, standalone CR suppression, and quoted-newline preservation.
- The assertion is count-guarded and the additive table-driven method covers LF, CRLF, terminal CRLF,
  quoted LF/CRLF, blank records, and doubled quotes. The isolated native suite passed all 7 methods;
  the audit fixture returned exactly `[["name", "table"], ["Vale, Bianca", "Table \"3\""]]`.
- The unchanged web CSV contract passed 4/4 tests.

### Camera characterization — PASS

- The first bounded isolated run reproduced the stall and hit its 120-second ceiling. The blocking
  path combined real simulator authorization with `AVCaptureSession` lifecycle work on `MainActor`.
- `CameraPreviewModel` now owns configuration/start/stop work in one private serial worker and
  publishes the awaited result on `MainActor`. Authorization providers are injectable, so the
  simulator test exercises authorized/no-camera behavior without waiting on a system prompt.
- Privacy remains preview-only: no audio inputs and no capture outputs. Two fresh isolated runs of
  all 3 `CameraPrivacyTests` passed, each completing its test phase in about 1.7 seconds.

### Full native result — FAIL

- Command: `xcodebuild test -quiet -project native/CheckIn007.xcodeproj -scheme CheckIn007`
  with the iPad UDID above plus fresh temporary DerivedData and result-bundle paths.
- Both test targets and all expected suites ran. All six unit suites passed: 33/33 methods (the 32
  baseline methods plus one table-driven CSV regression). The four expected UI methods ran but all
  failed initial element lookup, so the full result was 33 passed, 4 failed, 0 skipped.
- A single qualified infrastructure retry after simulator shutdown, boot, and `bootstatus -b`
  produced the same 33-pass/4-fail split. Failure attachments show the roster controls present but
  exposed under element types different from the existing queries (for example `roster.mark007` is
  a Button while the test queries `otherElements`). `CheckIn007UITests.swift` is outside the approved
  Cycle 12 manifest, so this deterministic harness defect was not hidden or changed in this cycle.

### Web result — PASS

- Sanctioned direct Node path: `npm ci` (exit 0, 0 vulnerabilities), `npx prettier --check .` (exit 0),
  `node --test tests/unit/*.test.mjs` (78/78 passed), `npx playwright test` (13/13 passed), and
  `node scripts/build.mjs` (exit 0; 26,315 gzip bytes).
- `dist/index.html`: 70,584 bytes; SHA-256
  `8d5a9c65f83ed417acdd48cc367ce3663e60ff35a64008c0c5687cb7b2d9a744` (unchanged and untracked).

### CI disposition — BLOCKED (external billing)

- Run: `https://github.com/daniqan/check-in-007/actions/runs/33711898714`; workflow `CI`; push event;
  branch `master`; exact Cycle 11 head SHA `845116d41375cd6422f49bb2a53f23bcec3109e9`.
- The job did not start because the account was locked for billing. No step passed and no
  `dist-index-html` artifact exists. This is a terminal external block for Cycle 12; it is not a PASS.

## Cycle 13 — Native UI Interaction and Accessibility Repair

- Tested source commit: `5e80c8bf7721d31c96dfac081f86399e8c531dfc`
- Branch: `master`
- Environment: Xcode 26.4 (`17E192`); iOS 26.4 (`23E244`); iPad (A16)
  `A155995F-EC83-41BE-95B2-1A5F390ABF59`; Node `v26.3.0`; npm `11.16.0`.

### Focused native UI methods — PASS

- `testFirstCheckInFlow`, `testRepeatGuestDoesNotDuplicateOneScan`, and
  `testAdminOpensToggleAudioAndCloses` each passed independently. The initially masked
  `testClearLogRequiresTwoConfirmations` path opened `admin.sheet`, then its retained failure
  hierarchy showed the lazy `Form` had not instantiated the below-viewport `admin.clearLog` button;
  after adding one sheet scroll, the method passed independently.
- The two check-in methods passed together, and the two admin methods passed together. The complete
  `CheckIn007UITests` target then passed 4/4, with zero failures or skips.
- The repaired hierarchy exposes full-width roster buttons, `scan.status` and the combined
  `result.title` as `StaticText`, and `roster.mark007` as the intentionally button-typed element.
  Required-element failures retain `app.debugDescription` without changing waits or outcomes.

### Full native scheme — PASS

- Command: `xcodebuild test -quiet -project native/CheckIn007.xcodeproj -scheme CheckIn007` with the
  iPad UDID above and fresh temporary DerivedData/result-bundle paths; exit 0.
- Structured `.xcresult` inventory: both `CheckIn007Tests` and `CheckIn007UITests`; six unit suites
  (`CSVCodecTests`, `CameraPrivacyTests`, `CheckInStoreTests`, `GuestCatalogTests`, `LogMergerTests`,
  `ScanAudioPlayerTests`); exactly 33 unit + four UI methods = 37/37 passed, zero failures or skips.

### Web regression — PASS

- Sanctioned direct Node path: `npm ci` (exit 0, 0 vulnerabilities),
  `npx prettier --check .` (exit 0), `node --test tests/unit/*.test.mjs` (78/78 passed),
  `npx playwright test` (13/13 passed), and `node scripts/build.mjs` (exit 0; 26,315 gzip bytes).
- `dist/index.html`: 70,584 bytes; SHA-256
  `8d5a9c65f83ed417acdd48cc367ce3663e60ff35a64008c0c5687cb7b2d9a744`; remains untracked.

### CI disposition — BLOCKED (external billing)

- Run `33711898714` remains `BLOCKED (external billing)`; no steps ran and no artifact exists.

## Cycle 14 — Evidence and Plan-Consistency Closure

- Tested current source: `6c10875faaf21a088f2e9ca238f0d9b5025ac724` (documentation-only Cycle 14
  implementation follows this runtime-identical source).
- Historical source: exact detached commit `50b435766f805cd86186a598c6534f667f9a5221`,
  immediately before repair commit `5e80c8bf7721d31c96dfac081f86399e8c531dfc`.
- Environment: Xcode 26.4 (`17E192`); iOS 26.4 (`23E244`); iPad (A16). Volatile paths,
  process identifiers, timestamps, coordinates, simulator/container identifiers, and fixture display
  names are intentionally omitted.

### Pre-fix first-check-in reproduction — EXPECTED FAIL

- In a temporary detached worktree at `50b4357`, a failure-only test hook attached
  `app.debugDescription` as `pre-fix-first-check-in-hierarchy.txt` with `.keepAlways`; the existing row
  tap, five-second wait, and `XCTAssertTrue` outcome were preserved. The focused
  `CheckIn007UITests/testFirstCheckInFlow` run exited 65 and failed at the unchanged missing
  `scan.status` assertion.
- Xcode's `--only-failures` export skipped the custom attachment because its manifest marked the named
  activity `isAssociatedWithFailure: false`, despite `.keepAlways`. The attachment was therefore
  exported from that same failed method by its exact test identifier. This tool-level export deviation
  did not change the run, payload, or validation invariants.
- Machine checks over the complete 12,831-byte attachment found 12 occurrences of `roster.row.` and
  zero occurrences of `scan.status`. The excerpt below is documentary only; the complete attachment,
  not this selected line, was used for both counts.

```text
Button, identifier: 'roster.row.<redacted>', label: <redacted>
```

- This establishes the pre-fix state: roster rows remained exposed after the attempted tap while the
  scan screen did not appear. Repair commit `5e80c8b` added the full-width row hit region and preserved
  the now-passing workflow. The temporary worktree, instrumentation, DerivedData, result bundles, and
  exported attachments were deleted after validation; none is committed.

### Lazy admin Form navigation — REQUIRED CONTRACT

- After `admin.sheet` exists, `testClearLogRequiresTwoConfirmations` must call `sheet.swipeUp()` so the
  below-viewport lazy `Form` danger section materializes. It must then require and tap
  `admin.clearLog`, re-identify and require `admin.clearLog.confirm`, and tap the confirmation, in that
  order with the existing three-second waits. The scroll navigates to the controls; it does not bypass
  either mandatory assertion.

### Current native and web health — PASS

- Both focused current-tree UI methods passed independently: `testFirstCheckInFlow` and
  `testClearLogRequiresTwoConfirmations`.
- The complete `CheckIn007` scheme exited 0. Its structured `.xcresult` contains both targets, all six
  unit suites, and exactly 33 unit + four UI methods = 37/37 passed, zero failed or skipped.
- Sanctioned direct Node path: `npm ci` (exit 0, 0 vulnerabilities),
  `npx prettier --check .` (exit 0), `node --test tests/unit/*.test.mjs` (78/78 passed),
  `npx playwright test` (13/13 passed), and `node scripts/build.mjs` (exit 0; 26,315 gzip bytes).
  `dist/` remains untracked.

### CI disposition — BLOCKED (external billing)

- Run `33711898714` remains `BLOCKED (external billing)`; no steps ran and no artifact exists. The
  historical expected failure and current local PASS results above do not change that disposition.

## Cycle 16 — Web App Manifest / Standalone Start URL

- Implementation source: Cycle 16 implementation commit.
- Scope: source `manifest.webmanifest`, install icons, generated `dist/check-in-007.webmanifest`,
  static MIME handling, metadata tests, and operator documentation. RA #14 iPad touch-scroll
  verification remains separate and is not claimed resolved here.

### Local web gates

- Status: `PASS` for direct local gates under available Node `v26.3.0`; guarded `npm run lint` and
  `npm run build` stop at `scripts/check-node-version.mjs` because Node 24 is not exposed in this
  shell.
- Formatting: `npx prettier --check README.md docs/VERIFICATION_EVIDENCE.md index.html
manifest.webmanifest scripts/build.mjs scripts/lib/static-server.mjs tests/unit/build.test.mjs
tests/unit/static-server.test.mjs tests/e2e/checkin.spec.mjs` passed. A full
  `npx prettier --check .` now reports only the pre-existing untracked
  `Claude outputs/check-in-007-fresh.html` scratch file in this worktree; tracked Cycle 16 files are
  formatted.
- Unit: `node --test tests/unit/*.test.mjs` passed 85/85.
- E2E: `npx playwright test` passed 15/15.
- Build: `node scripts/build.mjs` emitted `dist/check-in-007.15d6647afdf4.html` at 26,898 gzip bytes.
- Generated machine manifest:

```json
{
  "artifact": "check-in-007.15d6647afdf4.html",
  "sha256": "15d6647afdf4d6a6d2b5dbc0f63e3cab56bbb0f96c5be740a536cf9e1e5fb810",
  "gzipSize": 26898,
  "byteSize": 72872
}
```

- Generated web app manifest excerpt:

```json
{
  "display": "standalone",
  "id": "./",
  "scope": "./",
  "start_url": "./check-in-007.15d6647afdf4.html"
}
```

- The generated `start_url` equals `"./" + dist/check-in-007.manifest.json.artifact`; source and
  generated manifests intentionally keep browser install metadata separate from the machine build
  manifest. Icon entries use `purpose: "any"` to avoid claiming maskable safe-zone compliance without
  a dedicated padded maskable asset.
