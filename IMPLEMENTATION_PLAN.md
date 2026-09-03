# Check-In 007 — External Verification Closure Plan v21 (Cycle 10)

## 1. Overview

Consolidated Audit v34 scores the shipped system at 94/100 and identifies exactly two remaining
findings: the native SwiftUI suite has never run because this Mac has no iOS/iPadOS runtime, and the
committed GitHub Actions workflow has never been observed on GitHub. Both are evidence gaps rather
than product defects. This cycle creates durable, reproducible evidence for those two checks without
changing application behavior.

Traceability:

- Audit v34 **Next Step #1**: install an iOS/iPadOS runtime and run native `xcodebuild ... test`.
- Audit v34 **Next Step #2**: observe the first live GitHub Actions CI run after a push.
- Audit v34 has no open Required Actions and `BACKLOG.md` has no unchecked items. This plan does not
  reopen completed product work or invent a feature.

## 2. Scope

### In scope

1. Add a checked-in record containing the environment, immutable commit SHA, commands, exit status,
   native test counts, CI run URL/ID, conclusion, and artifact result for both findings.
2. Install the matching iOS simulator platform only after explicit operator approval, select an
   available iPad simulator deterministically, and run the shared `CheckIn007` scheme from a clean
   temporary derived-data directory.
3. Establish or confirm the GitHub repository/remote only after explicit operator approval, push
   the reviewed Cycle-10 implementation commit normally, and inspect the `CI` run for that exact SHA.
4. Download the CI artifact into a temporary directory, verify metadata and byte parity with a local
   same-SHA build, and record stable URLs and SHA-256 evidence. Do not commit downloads/build output.
5. Update README verification status to link to the durable record.
6. Run existing web/parity gates first so external failures are not confused with local regressions.

### Out of scope

- Changes to product source/tests, Xcode project/scheme, CI jobs, dependencies, lockfiles,
  certificates, roster data, or generated `dist/` output.
- Weakening tests or workflow gates to make a failure pass.
- Creating a public repository, force-pushing, rewriting history, merging, opening a PR, changing
  protection/settings/secrets/permissions/billing, or deleting host tooling.
- Committing runtimes, DerivedData, `.xcresult`, Playwright reports, CI logs, or CI artifacts.
- Editing discriminator-owned `BACKLOG.md`, `CONSOLIDATED_AUDIT.md`, or
  `IMPLEMENTATION_PLAN_CRITIQUE.md`.
- Claiming either finding closed when success evidence is unavailable.

## 3. Architecture and Evidence Flow

```text
immutable implementation commit SHA
       |
       +--> local web/parity gates ------------------------+
       +--> approved iOS runtime -> xcodebuild + xcresult -+--> docs/VERIFICATION_EVIDENCE.md
       +--> approved remote/push -> exact-SHA CI run -------+            |
                                -> artifact byte/hash check |            +--> README link
                                                            +------------+
```

The commit SHA is the join key. Native evidence names the checked-out SHA. CI evidence must come
from a run whose `headSha` equals it; branch name or “latest run” alone is insufficient. Local web
failure stops all external work. Missing simulator support blocks only native verification;
missing remote/auth/permission blocks only CI verification; failed gates are recorded as failed.

## 4. Technical Decisions and Rationale

### 4.1 Evidence document instead of code changes

The audit identifies unobserved execution, not missing behavior. Versioned Markdown is reviewable
and can cite immutable SHAs/run URLs. Wrappers or workflow edits would add implementation surface
without making the existing workflow more trustworthy. Terminal-only evidence is rejected as
ephemeral.

### 4.2 Explicit approval for external mutations

`xcodebuild -downloadPlatform iOS` changes the host and may consume substantial disk/network. Adding
a remote and pushing changes publishes state to collaborators. The implementer performs read-only
preflight, presents the resolved target/impact, and pauses for specific approval before each action.

### 4.3 Machine-readable simulator destination

After installation, parse available devices, choose an available iPad, and call `xcodebuild` with
`platform=iOS Simulator,id=<UDID>`. UDID avoids ambiguous names and the README's named model not
existing on every runtime. Require iOS 26+ because the project deployment target is 26.0.

### 4.4 Isolated native results

Use temporary `-derivedDataPath` and `-resultBundlePath`; inspect `.xcresult` with the installed
`xcrun xcresulttool`. Record command, Xcode build, runtime, destination, exit code, and unit/UI test
totals. Do not delete global caches or commit the large, machine-specific bundle.

### 4.5 Exact-SHA CI selection

This repository currently has no Git remote, while `gh` is authenticated. Resolve the intended
owner/repository and branch with the operator; never guess. After a normal push, query the workflow
and select by exact `headSha`, then require `conclusion == success`. “Newest run” is race-prone.

### 4.6 Artifact parity

Download the exact run's `dist-index-html` into a temporary directory. Require one
`dist/index.html`, compute byte count/SHA-256, and compare exact bytes with a fresh local build from
the same SHA. Mismatch fails verification; only hashes and sizes are committed.

## 5. File Manifest

```text
docs/
  VERIFICATION_EVIDENCE.md       (NEW) — immutable-SHA native and live-CI execution evidence
README.md                        (MOD) — link/status summary for external verification gates
IMPLEMENTATION_PLAN.md           (MOD) — completion checkboxes after verified implementation
```

No product, test, workflow, package, Xcode-project, generated artifact, audit, critique, or backlog
file changes during implementation.

## 6. Implementation Phases

### Phase 0 — Freeze target and local preflight

1. Require a clean tracked worktree; capture HEAD, branch, Xcode/runtime/destination inventory,
   Node version, remotes, and read-only GitHub authentication status.
2. On pinned Node 24.20.0 run `npm ci`, `npm run lint`, `npm run test:unit`,
   `npm run test:e2e`, and `npm run build`.
3. Run `xcodebuild -list -json -project native/CheckIn007.xcodeproj`; confirm the shared scheme
   exposes app, unit-test, and UI-test targets.
4. Create evidence and README files, initially marking external results `BLOCKED`, and commit them.
   This commit becomes the immutable target SHA.

Acceptance: local gates pass; target commit changes only manifest files; no placeholder is reported
as success. Any local failure stops work before install or push.

### Phase 1 — Native simulator verification

Preflight:

```bash
xcodebuild -version
xcrun simctl list runtimes --json
xcodebuild -project native/CheckIn007.xcodeproj -scheme CheckIn007 -showdestinations
```

If no eligible runtime exists, report free disk space/platform and request explicit approval for:

```bash
xcodebuild -downloadPlatform iOS
```

Then choose an available iPad UDID from JSON, boot if required, wait with
`xcrun simctl bootstatus <UDID> -b`, and run:

```bash
xcodebuild -project native/CheckIn007.xcodeproj -scheme CheckIn007 \
  -destination 'platform=iOS Simulator,id=<UDID>' \
  -derivedDataPath '<TEMP>/DerivedData' \
  -resultBundlePath '<TEMP>/CheckIn007.xcresult' test
```

Record target SHA, environment/destination, exact redacted command, exit, unit/UI totals, discovery
of all five unit suites and four UI tests, and `PASS`, `FAIL`, or `BLOCKED` with recovery detail.

Acceptance: exit 0, zero failures, both `CheckIn007Tests` and `CheckIn007UITests` execute, and all
temporary outputs remain outside the repository.

### Phase 2 — First live GitHub Actions verification

1. Read-only preflight auth/remotes and resolve whether an existing repository matches this project.
2. If none, present exact `owner/repository`, visibility, branch, and whether creation is required;
   request approval. Repository creation requires separate approval and defaults private.
3. Add only the approved remote if needed and normally push the target branch; never force/delete.
4. Select the `CI` run whose `headSha` equals target SHA. Poll no faster than every 15 seconds with a
   30-minute ceiling.
5. Require the `web` job and every non-conditional gate step to succeed. Cancelled/timed-out/skipped
   required steps and neutral conclusions do not close the finding.
6. Download `dist-index-html`; assert one expected file and compare byte/hash with local same-SHA
   `dist/index.html`.

Acceptance: stable run URL/ID, workflow/event/branch/exact SHA, timestamps, job/step conclusions,
artifact name/size/hash, and local parity are recorded; overall conclusion is `success`.

### Phase 3 — Finalize durable evidence

Use this contract:

```markdown
# Verification Evidence
## Target
- Commit: `<40-hex SHA>`
- Branch: `<branch>`
- Recorded at: `<UTC ISO-8601>`
## Native iOS Simulator
- Status: `PASS | FAIL | BLOCKED`
- Environment: `<Xcode build; runtime; device name + UDID>`
- Command/result: `<redacted command; exit; unit/UI totals>`
- Notes: `<none or blocker>`
## GitHub Actions CI
- Status: `PASS | FAIL | BLOCKED`
- Repository/run: `<owner/repo; stable URL and ID>`
- Identity/result: `<workflow; event; branch; head SHA; required steps>`
- Artifact: `<name; bytes; SHA-256; local parity>`
- Notes: `<none or blocker>`
```

README links the record and calls only `PASS` results verified. Commit finalized evidence normally;
do not amend the pushed target commit. If a gate blocks/fails, preserve that status and do not claim
audit closure. Scan the final diff for secrets, absolute user paths, temporary paths, and mismatched
SHAs.

## 7. Integration Contracts

### 7.1 Repository state → verification identity

- **Contract:** one 40-character target SHA identifies the tree tested locally, natively, and in CI.
- **Failure:** a later commit changes executable inputs or workflow config.
- **Recovery:** create a new target SHA and rerun both gates; never relabel old results.

### 7.2 Xcode project → simulator

- **Contract:** shared scheme builds app/unit/UI targets on an available iOS 26+ iPad simulator.
- **Failure:** runtime/device absent, boot timeout, build/test failure, unreadable result bundle.
- **Recovery:** install approved platform, re-enumerate UDID, retry once after shutdown/boot; code
  repair requires a separate audited cycle.

### 7.3 Git → GitHub Actions

- **Contract:** approved remote receives target SHA on `main`/`master`, matching the push trigger.
- **Failure:** missing repo/permission, protection, disabled workflow, YAML error, quota, no run.
- **Recovery:** record `BLOCKED` and obtain operator/admin resolution; do not bypass policy.

### 7.4 CI → artifact parity

- **Contract:** exact run uploads one artifact byte-identical to local Node-24 same-SHA output.
- **Failure:** missing/duplicate/download-denied artifact or hash mismatch.
- **Recovery:** mark `FAIL`; diagnose nondeterminism in a later plan.

## 8. Error Handling and Edge Cases

| Condition | Detection | Response/recovery |
| --- | --- | --- |
| Dirty tracked worktree | `git status --porcelain` | Stop; preserve unrelated work |
| No runtime | runtime/destination inventory | Ask before download; else `BLOCKED` |
| Download/disk failure | command diagnostic | Stop; report space/network, do not clean globally |
| No iPad device | parsed JSON inventory | Use installed iPad only; no iPhone substitute |
| Boot timeout | `bootstatus` | One shutdown/boot retry, then `BLOCKED` |
| Native test failure | exit + xcresult | Record `FAIL`; do not edit tests/source |
| No remote/repository | preflight | Ask exact target and creation permission |
| Auth/permission failure | `gh`/push | Stop; never expose token or alter scopes |
| Concurrent push | `headSha` mismatch | Ignore unmatched run |
| CI exceeds 30 minutes | bounded polling | Record `BLOCKED`; retain run URL |
| Required step skipped | step inspection | Treat as failure unless explicitly failure-only |
| Artifact absent/multiple | listing/content check | `FAIL`; do not guess canonical file |
| Hash mismatch | SHA-256 | `FAIL`; defer diagnosis |
| Secret/path in evidence | final diff scan | Redact before commit |

Retries are bounded/idempotent. Cleanup never targets repository roots, global Xcode state, or user
data; temporary directories may be discarded after summary.

## 9. Stability and Performance

- Existing local budgets remain. CI observation is capped at 30 minutes.
- Simulator download dominates resources and is operator-approved after a free-space check; Apple
  controls package size, so this plan promises no fixed size.
- Native output is bounded by one scheme/device, one attempt plus one boot-only retry, and one temp
  DerivedData/result bundle.
- CI polling is read-only, at least 15 seconds apart, and bounded.
- Evidence is O(test suites + CI steps), expected under 20 KB. Logs/artifacts do not enter history.
- Interruption recovery uses immutable SHA/run ID; simulator tests and ephemeral CI do not mutate
  production data.

## 10. Testing Strategy

- **Local:** pinned Node lint, all unit tests (including native roster parity), all Playwright e2e,
  build-size gate.
- **Native:** scheme-level `xcodebuild test` proves compile/link, five unit suites, four UI flows,
  persistence/privacy/accessibility contracts on a simulator.
- **CI:** exact-SHA run, all required steps, artifact availability, local byte parity.
- **Evidence:** validate URLs, SHA consistency, counts, no secrets/absolute paths, no false `PASS`.
- **Scope:** final implementation diff contains only the three manifest files.

## 11. Environment and Toolchain

- Xcode 26.4 (`17E192`) is installed. Current preflight has no iOS runtime and destinations report
  iOS 26.4 absent, so Phase 1 needs operator-approved installation.
- Node 24.20.0, npm lockfile, Playwright 1.62.1, Prettier 3.9.6.
- GitHub CLI is installed/authenticated, but no Git remote is configured. Phase 2 needs operator
  confirmation of repository and push.
- No new dependency, secret, signing identity, paid service, or production credential.

Fresh local setup remains `nvm install && nvm use && npm ci`; external phases additionally require
approved Xcode platform availability and GitHub repository access.

## 12. Deployment, Distribution, and Rollback

No application code deploys. Publication is the normal Git push required to run existing CI and the
follow-up evidence commit. Native binaries remain local; kiosk output remains a CI artifact.

Rollback repository docs with `git revert <evidence-commit>`. Do not automatically remove an Apple
platform or rewrite pushed history; use normal revert. GitHub run history remains external evidence.

## 13. Open Questions and Decision Gates

1. **Which GitHub repository?** No remote exists. Operator must confirm exact owner/repo, visibility,
   and branch; nothing is guessed or created implicitly.
2. **May iOS platform be downloaded?** Operator approves after platform/free-space report; otherwise
   native remains `BLOCKED`.
3. **Protected branch?** Do not bypass. Ask whether to use normal PR flow; that requires explicit
   execution authority.
4. **External failure?** Record and stop. Product/test/workflow remediation requires another plan.

## 14. Completion Checklist

- [ ] Local Node 24 gates pass at immutable target SHA.
- [ ] Approved native unit/UI tests pass on identified iPad simulator with durable counts.
- [ ] Operator confirms GitHub repository/branch and approves normal push.
- [ ] Exact-SHA `CI` run and every required step succeed.
- [ ] CI artifact is byte-identical to local same-SHA build.
- [ ] Evidence has stable identifiers/URLs and no secrets/machine paths.
- [ ] Final implementation diff contains only the three manifest files.
