# Check-In 007 — External Execution Closure Plan v23 (Cycle 11)

## 1. Overview

Audit v37 scores the system 94/100 after Cycle 10's plan (97/100) and implementation (98/100).
There are no product defects, open Required Actions, or unchecked backlog items. Two external checks
remain unproven: native SwiftUI tests have never run on an iPad simulator, and the GitHub Actions
workflow has never run for an exact reviewed commit. Cycle 11 closes Audit v37 Next Steps #1–#2 with
successful execution evidence. Unlike Cycle 10, another `BLOCKED` record does not complete this plan.

## 2. Scope

### In scope

1. Obtain explicit approval for the exact host installation and GitHub publication before mutation.
2. Install the Xcode iOS platform, select an iOS 26+ iPad simulator, and run all native tests using
   isolated temporary outputs.
3. Create one immutable Cycle-11 target commit, publish it normally to the approved repository and
   workflow-triggering branch, and inspect only the CI run whose `headSha` equals that commit.
4. Download `dist-index-html` and prove byte parity with a clean local same-SHA build.
5. Change the durable evidence and README from `BLOCKED` to `PASS` only after both gates succeed.
6. Run existing local web gates first and preserve all product behavior.

### Out of scope

- Product, test, Xcode-project, workflow, dependency, lockfile, roster, certificate, or generated
  `dist/` changes; weakening gates; accepting an iPhone; or treating `FAIL`/`BLOCKED` as completion.
- Guessing a GitHub repository, public-by-default creation, force-push/history rewrite, bypassing
  branch protection, merging, or changing secrets, permissions, or billing.
- Committing DerivedData, `.xcresult`, artifacts, logs, credentials, or absolute machine paths.
- Editing discriminator-owned `BACKLOG.md`, `CONSOLIDATED_AUDIT.md`, or
  `IMPLEMENTATION_PLAN_CRITIQUE.md`.

## 3. Architecture and Evidence Flow

```text
approved repository + branch
            |
Cycle-11 target commit SHA
      |             |
      |             +--> normal push --> exact-headSha CI --> dist-index-html
      |                                                        |
      +--> same-SHA local build -------------------------------+ byte equality
      |
      +--> approved iOS platform --> iPad UDID --> xcodebuild test + xcresult
                                                             |
                                                             v
                                      docs/VERIFICATION_EVIDENCE.md --> README
```

The 40-character SHA joins checkout, native run, CI run, and artifact. Each domain fails
independently, but this plan completes only when both external domains pass. The evidence-finalization
commit follows the target and can never substitute for the target-SHA run.

## 4. Technical Decisions and Rationale

### 4.1 Success-only cycle

Cycle 10 made blockers observable; Audit v37 says the findings close only at `PASS`. Therefore
authorization is a pre-implementation gate and all completion gates require success. If permission
or infrastructure remains unavailable, stop with the plan pending instead of producing another
docs-only blocked cycle.

### 4.2 Supported platform installation

Use installed Xcode 26.4's `xcodebuild -downloadPlatform iOS`, after approval and a disk-space check.
This is safer than copying runtimes or editing Xcode internals because Xcode owns compatibility. The
tradeoff is a potentially large host/network mutation.

### 4.3 Discovered, UDID-addressed iPad

Parse `simctl` runtime/device JSON, require iOS 26+, and address an available iPad by UDID. A fixed
marketing name is brittle. If the platform supplies no iPad device, create one only from an installed
iPad device type/runtime after showing the exact `simctl create` command; record created resources.

### 4.4 Isolated native results

Use `mktemp -d` for `-derivedDataPath` and `-resultBundlePath`, then inspect `.xcresult` with installed
`xcresulttool`. Require exit 0, zero failures, and execution of both test targets—not merely a build.

### 4.5 New immutable target

Cycle 10's `628a4be…` predates finalized evidence and archival. Publish a new Cycle-11 target that
contains the approved plan and evidence placeholder. This avoids special publication of an older
ancestor. The target is docs-only, so executable inputs stay unchanged.

### 4.6 Exact-SHA CI and parity

The workflow triggers on pushes to `main`/`master` and pull requests. Select by exact `headSha`, not
recency, and require every non-conditional web-gate step to succeed. `build.mjs` was byte-stable in
Cycle 10 across Nodes 24/26; nevertheless compare exact artifact bytes, SHA-256, and size. A mismatch
fails even when the workflow conclusion is `success`.

### 4.7 Existing tools only

Use Xcode, Git, GitHub CLI, Node, and shell tools already present. A wrapper/library would increase
the surface under verification. Durable evidence records versions, identities, commands, outcomes,
counts, and hashes.

## 5. File Manifest

```text
IMPLEMENTATION_PLAN.md          (MOD) — check completion only after both external PASS gates
docs/VERIFICATION_EVIDENCE.md   (MOD) — append exact-SHA native and CI PASS evidence
README.md                       (MOD) — report verified status and link durable evidence
```

No other tracked file may change. Temporary artifacts remain outside the repository. `BACKLOG.md`
stays unchanged because it has no unchecked item and is discriminator-owned.

## 6. Implementation Phases

### Phase 0 — Authorization, local gates, and target

1. Require a clean tracked worktree while preserving unrelated untracked files. Record HEAD/branch,
   Xcode/runtime/device inventory, free space, remotes, and redacted `gh auth status`.
2. Present two independent approval requests:
   - `xcodebuild -downloadPlatform iOS`, with available space and host impact.
   - Exact GitHub `owner/repository`, visibility if creation is needed, remote URL/name, target branch,
     and normal push refspec.
3. Do not start implementation until both approvals and repository identity are exact. Ambiguity,
   refusal, missing credentials, or an unapproved protected-branch route leaves this plan pending.
4. Use pinned Node 24.20.0 if available. Otherwise use the audited Node 26 direct path without host
   installation: `npm ci`, `npx prettier --check .`, `node --test tests/unit/*.test.mjs`,
   `npx playwright test`, `node scripts/build.mjs`. Record Node/npm and that only the version guard
   was bypassed; CI remains the authoritative pinned-Node-24 gate.
5. Append a Cycle-11 evidence placeholder and create a docs-only target commit. Capture its full SHA;
   never amend it after external execution begins.

Acceptance: local gates pass, both mutations are approved, destination is known, target commit
changes only manifest files, and the SHA is captured before mutation.

### Phase 1 — Native iPad execution

1. Recheck space and run approved `xcodebuild -downloadPlatform iOS` once.
2. Confirm an available iOS 26+ runtime. Choose an available iPad deterministically by highest runtime,
   then device name and UDID. If none exists, enumerate iPad device types and show/create exactly one
   eligible simulator; fail if no eligible type exists.
3. Boot the UDID if needed and wait with `xcrun simctl bootstatus <UDID> -b`. Permit one bounded
   shutdown/boot retry.
4. Create a temporary directory and run:

```bash
xcodebuild -project native/CheckIn007.xcodeproj -scheme CheckIn007 \
  -destination 'platform=iOS Simulator,id=<UDID>' \
  -derivedDataPath '<TEMP>/DerivedData' \
  -resultBundlePath '<TEMP>/CheckIn007.xcresult' test
```

5. Inspect the result bundle. Record Xcode/runtime/device, redacted command, exit, totals, and targets.
   Require `CheckIn007Tests` and `CheckIn007UITests`; six unit suites (`CSVCodecTests`,
   `CameraPrivacyTests`, `CheckInStoreTests`, `GuestCatalogTests`, `LogMergerTests`,
   `ScanAudioPlayerTests`), 32 unit methods, four UI tests, and zero failures.

Acceptance: scheme-level execution exits 0 and structured results prove all expected tests ran at
the target SHA. Any missing count, unavailable destination, timeout, crash, or failure stops; do not
edit source/tests to continue.

### Phase 2 — Exact-SHA CI execution

1. Reconfirm approved remote URL/branch. Add the remote or create a private repository only if that
   exact action was approved.
2. Fetch metadata. If the remote branch cannot accept a normal ancestry-compatible push, stop; never
   force. A protected-branch/PR route needs separate approval and must still yield an exact-SHA run.
3. Push the target SHA normally to approved `main`/`master`; capture output without credentials.
4. Select only workflow `CI` with matching repository, event, branch, and `headSha`. Poll no faster
   than every 15 seconds with a 30-minute ceiling.
5. Require overall and `web` job success plus checkout, Node setup, install, lint, unit, browser
   install, e2e, build, and artifact-upload success. Only the failure-report upload may be skipped.
6. Download only `dist-index-html` to a new temporary directory; require exactly one
   `dist/index.html`. Build from a clean same-SHA worktree with Phase-0's recorded path and compare
   exact bytes, size, and SHA-256.

Acceptance: stable run URL/ID, exact SHA, event/branch, required-step conclusions, artifact identity,
and byte equality exist. No “latest run” or approximate match passes.

### Phase 3 — Finalize evidence

Retain Cycle-10 history and append:

```markdown
## Cycle 11 — External Execution Closure
- Target commit: `<40-hex SHA>`
- Branch/repository: `<branch>; owner/repo>`
- Recorded at: `<UTC ISO-8601>`

### Native iOS Simulator — PASS
- Environment: `<Xcode build; runtime; iPad name + UDID>`
- Result: `<redacted command; exit 0; targets/suites/method totals; zero failures>`
- Bundle inspection: `<command and summary; bundle remains temporary>`

### GitHub Actions CI — PASS
- Run: `<stable URL; ID; workflow; event; branch; exact head SHA>`
- Gates: `<job and required-step conclusions>`
- Artifact: `<name; bytes; SHA-256; exact local parity PASS; local build environment>`
```

Update README to verified, check §14 only after revalidation, scan for credentials and absolute/temp
paths, and commit only the three manifest files. Publishing this later evidence commit is outside
scope and cannot alter the target-SHA result.

## 7. Integration Contracts

### 7.1 Git tree → evidence

- **Contract:** one target SHA identifies local, native, and CI inputs.
- **Failure:** executable/workflow inputs differ or evidence names another SHA.
- **Recovery:** create a new docs-only target and rerun both gates; never relabel results.

### 7.2 Xcode project → simulator

- **Contract:** Xcode resolves the shared scheme to an iOS 26+ iPad and runs app/unit/UI targets.
- **Failure:** platform/device/boot/suite/build/test failure.
- **Recovery:** one boot retry; otherwise stop for a separate environment/code cycle.

### 7.3 Local Git → GitHub

- **Contract:** approved remote accepts a non-force target-SHA publication on a triggered branch.
- **Failure:** identity/auth/ancestry/protection/Actions mismatch.
- **Recovery:** stop for repository-owner direction; never bypass controls.

### 7.4 CI → local artifact

- **Contract:** exact-SHA successful run uploads one file identical to same-SHA local output.
- **Failure:** unmatched run, failed/skipped gate, missing/duplicate artifact, byte mismatch.
- **Recovery:** retain diagnostics and plan remediation separately; do not claim closure.

### 7.5 Evidence → readers

- **Contract:** stable, redacted, independently checkable identifiers; README does not overstate.
- **Failure:** placeholder, wrong/inaccessible URL, leak, inconsistent count/SHA.
- **Recovery:** correct before commit; rerun whenever identity is uncertain.

## 8. Error Handling and Edge Cases

| Condition | Detection | Response/recovery |
| --- | --- | --- |
| Dirty tracked worktree | porcelain status | Stop; preserve user work |
| Approval missing/ambiguous | no exact affirmative scope | Leave plan pending; no mutation |
| Disk/network failure | preflight/download diagnostic | Stop; no global cleanup |
| Runtime absent after install | runtime JSON | Stop with installer diagnostic |
| No eligible iPad/type | device/type JSON | Create one approved device or stop |
| Boot timeout | bounded `bootstatus` | One shutdown/boot retry, then stop |
| Native failure/count mismatch | exit + `.xcresult` | Stop; do not commit PASS |
| Repository uncertain | remote/API metadata | Stop; never infer identity |
| Branch diverged/protected | fetch/push preflight | No force; request direction |
| No run within 30 minutes | exact-SHA query | Stop with pushed SHA; no blind repush |
| Concurrent workflow | `headSha` mismatch | Ignore unmatched run |
| Required step skipped/neutral | job-step result | Fail the gate |
| Artifact absent/duplicate | inventory | Fail; do not guess |
| Hash mismatch | byte compare/SHA-256 | Fail; defer diagnosis |
| Secret/path in evidence | final diff scan | Redact before commit |
| Later finalization run | different `headSha` | Incidental; never substitute |

Retries are bounded. Recovery never deletes repositories, branches, global Xcode data, user files,
or credentials. Remove temp directories only after validating exact paths and capturing summaries.

## 9. Stability and Performance

- One platform download, one selected/created simulator, one scheme run, and one boot retry bound
  native work. Apple controls download size/time, so no fixed promise is made.
- CI polling is read-only, ≥15 seconds apart, ≤30 minutes (at most 121 queries including initial).
- Artifact comparison is O(n) for one HTML file (currently about 71 KB), with two copies plus hashing
  buffers. Result inspection is O(test records), presently 36 methods total.
- Only constant-size summaries enter Git. DerivedData, result bundle, checkout, and artifacts remain
  temporary. Immutable SHA/run ID supports interruption recovery.
- Publication is one normal push. Since CI cancels in-progress runs per ref, make no second target-
  branch push until the target run completes.

## 10. Testing Strategy

- **Local regression:** install, Prettier, unit, Playwright, and build-size gates; record actual
  discovered counts, versions, build size/hash, and version-guard status.
- **Native integration:** one iOS 26+ iPad; both targets, six named suites/32 unit methods, four UI
  tests, zero failures from structured results.
- **CI integration:** exact target SHA and expected event; `web` plus every required step successful
  under pinned Node 24.20.0.
- **Artifact regression:** exactly one CI file byte-identical to fresh same-SHA local build; matching
  size and SHA-256.
- **Documentation:** no placeholder, secret, absolute/temp path, inconsistent SHA/count, false PASS,
  or tracked file outside the manifest.

## 11. Environment and Toolchain

- Verified pre-plan: Xcode 26.4 (`17E192`); empty runtime list; destinations say iOS 26.4 absent.
- GitHub CLI is authenticated as `daniqan`; no remote exists. Authentication neither identifies nor
  authorizes a repository.
- Repository/CI pin Node 24.20.0. Host Node is 26.3.0; Phase 0 records the actual approved path.
- Locked tools remain Playwright 1.62.1, Prettier 3.9.6, acorn 8.18.0, and the npm lockfile.
- No dependency, signing identity, production credential, paid service, or automation is added.

## 12. Deployment, Distribution, and Rollback

No application deploys. One approved normal push exercises existing CI. Prove remote identity and
ancestry before push. Revert documentation with `git revert`; never rewrite a published target. Do
not automatically uninstall iOS. Record an optionally created simulator; delete it only on a later
explicit request. GitHub run history remains evidence.

## 13. Open Questions and Decision Gates

1. Will the operator approve `xcodebuild -downloadPlatform iOS` after reviewing space/impact?
2. What exact `owner/repository`, visibility if creation is required, remote name, and `main`/`master`
   target are approved?
3. If existing history/protection rejects normal push, should a PR route be separately approved?
4. Node 24 host installation is optional; absent approval, use/disclose the audited direct path and
   rely on exact-SHA CI for authoritative Node 24 execution.

Questions 1–2 are blocking authorization gates, not choices the implementer may infer.

## 14. Completion Checklist

- [ ] Both exact external mutations were explicitly approved before implementation.
- [ ] Immutable target SHA passed selected local gates; versions, commands, counts, guard status,
      build size, and hash are recorded.
- [ ] Native command exited 0 on an identified iOS 26+ iPad; both targets, six suites/32 unit methods,
      four UI tests, and zero failures are evidenced.
- [ ] Approved repository's CI run has exact target `headSha`; `web` and all required steps passed
      under pinned Node 24.20.0.
- [ ] `dist-index-html` has exactly one expected file byte-identical to the fresh same-SHA local build,
      with equal size and SHA-256.
- [ ] Evidence/README say `PASS`, retain prior history, use stable identifiers, contain no secret,
      absolute/temp path, or placeholder, and final diff contains only manifest files.

Every checkbox is required. Missing approval, `BLOCKED`, `FAIL`, or partial evidence leaves Cycle 11
pending for a later authorized attempt; it does not complete another evidence-only cycle.
