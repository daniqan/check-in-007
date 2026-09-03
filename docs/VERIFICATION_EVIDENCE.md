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

Cycle 11 targets the installed iOS 26.4 simulator runtime and the linked
`daniqan/check-in-007` GitHub repository. The immutable target SHA is this commit; native and CI
results are intentionally finalized only after both external executions pass against it.
