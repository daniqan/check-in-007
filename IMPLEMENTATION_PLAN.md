# Check-In 007 — Cycle 13 Evidence and Plan-Consistency Closure Plan v27 (Cycle 14)

## 1. Overview

Cycle 14 closes the two documentation-only follow-ups created by Audit v53: back-port the already-verified `sheet.swipeUp()` admin navigation into the authoritative plan contract, and durably prove the Cycle-13 roster hit-region diagnosis with a sanitized, reproducible pre-fix accessibility hierarchy. No shipped source, test assertion, dependency, build setting, generated artifact, or runtime behavior changes. The evidence workflow reproduces the failure at pre-implementation commit `50b4357` in an isolated detached worktree, preserves the current working tree, and then re-verifies the current native and web gates.

## 2. Scope

### In scope

1. Replace completed plan v26 with this Cycle-14 plan, retaining the Cycle-13 behavioral contract and explicitly documenting why `testClearLogRequiresTwoConfirmations` must scroll the lazy admin `Form` before querying `admin.clearLog`.
2. Reproduce `testFirstCheckInFlow` against exact pre-fix commit `50b4357` on the pinned iPad simulator with failure-only `app.debugDescription` instrumentation confined to a temporary detached worktree.
3. Export the hierarchy attachment from the failing `.xcresult`, verify that it simultaneously contains roster-row identifiers and lacks `scan.status`, redact volatile or local-only values, and add a concise excerpt plus provenance to `docs/VERIFICATION_EVIDENCE.md`.
4. Re-run the focused current-tree UI paths, the complete native scheme, and all web gates so the historical reproduction cannot be confused with current health.

### Out of scope

- Any committed change under `native/`, `src/`, `tests/`, `scripts/`, `.github/`, `package.json`, lockfiles, Xcode project settings, or `dist/`.
- Changing the existing `sheet.swipeUp()`, `requireExists`, hit target, accessibility roles/identifiers, assertions, timeouts, gestures, state logic, camera, persistence, audio, or visible styling.
- Committing raw `.xcresult` bundles, full device hierarchies, absolute paths, simulator/container UUID paths, guest data beyond the checked-in fixture, secrets, or temporary instrumentation.
- Editing discriminator-owned `IMPLEMENTATION_PLAN_CRITIQUE.md`, `CONSOLIDATED_AUDIT.md`, or `BACKLOG.md`.
- Clearing billing, pushing/rerunning GitHub Actions, or changing CI run `33711898714` from `BLOCKED (external billing)`.

## 3. Architecture and Evidence Flow

```text
main worktree @ approved Cycle-14 plan
  |-- read-only current source ---------------------------> current gate verification
  |
  `-- mktemp -d -> detached git worktree @ 50b4357
                    -> temporary failure-only XCTest hook
                    -> focused pre-fix UI run (expected FAIL)
                    -> .xcresult failure attachment
                    -> validate roster IDs present + scan.status absent
                    -> sanitize decisive excerpt
                    -> docs/VERIFICATION_EVIDENCE.md
                    -> remove detached worktree/temp directory

current source: admin sheet -> swipeUp -> lazy dangerSection materializes
                              -> clear -> confirm clear
```

Git owns source identity; XCTest owns the captured hierarchy; `xcresulttool` owns attachment export; the evidence document owns only the sanitized, reviewable conclusion. A failing historical run is evidence of the old defect, never a regression result for HEAD.

## 4. Technical Decisions and Rationale

### 4.1 Reproduce the historical hierarchy from an exact commit

Use a detached temporary worktree at `50b4357`, the discriminator's approved-plan commit immediately before implementation commit `5e80c8b`. Add an uncommitted, temporary helper to `testFirstCheckInFlow` that waits for missing `scan.status`, attaches `app.debugDescription` with `.keepAlways`, and then preserves the original failing assertion. Run only that method with a fresh DerivedData directory and `.xcresult` on iPad (A16) UDID `A155995F-EC83-41BE-95B2-1A5F390ABF59`.

The reproduction is accepted only when all of these hold together:

- the test fails at the unchanged `scan.status` expectation after `firstRow.tap()`;
- the exported failure attachment contains at least one `roster.row.` identifier from the checked-in fixture;
- the same attachment contains no `scan.status` identifier;
- source identity is recorded as `50b4357`, and the temp worktree has no commit.

Rejected alternatives: describing the cause from memory leaves the audit gap open; reverting files in the main worktree risks user changes; capturing only current HEAD proves the repair, not the pre-fix state; committing the full hierarchy leaks volatile device details and produces noisy evidence.

### 4.2 Export, validate, and minimize the evidence

Use Xcode 26.4's supported result APIs: `xcresulttool get test-results tests` to identify the test ID, then `xcresulttool export attachments --only-failures` into the temporary directory. Inspect `manifest.json` and the exported text attachment before quoting it. The committed evidence contains:

- exact source commit, Xcode/runtime/device model, focused command shape, expected nonzero result, and attachment name;
- a short fenced excerpt sufficient to show a `roster.row.` element remains after the tap;
- an explicit machine-checked statement that `scan.status` had zero matches in that same attachment;
- a note that paths, PIDs, timestamps, coordinates, and simulator/container identifiers were omitted as irrelevant/volatile.

Do not claim absence from a hand-selected excerpt: compute it over the complete exported attachment. If XCTest does not retain the custom attachment or the invariants do not hold, stop with the completion item open; do not substitute inference.

### 4.3 Back-port the lazy-Form navigation contract

The Cycle-13 implementation correctly performs `sheet.swipeUp()` after `admin.sheet` exists and before querying `admin.clearLog`. `dangerSection` is the fifth logical section in `AdminSheet` and is below the initial iPad viewport; SwiftUI's lazy `Form` does not guarantee that its button exists or is hittable before scrolling. The scroll is therefore navigation to the existing control, not an assertion bypass: both `admin.clearLog` and the re-identified `admin.clearLog.confirm` remain required in order with unchanged three-second waits.

Rejected alternatives: increasing timeouts cannot materialize an off-screen lazy row; coordinate taps are layout-coupled; moving the danger section changes product UI; making the clear assertion optional weakens the workflow.

### 4.4 Separate historical failure from present health

After the pre-fix capture is validated, remove the detached worktree and all temporary result data. On the clean current tree, run the focused `testFirstCheckInFlow` and `testClearLogRequiresTwoConfirmations` methods, then the full native scheme. Run the pinned web gates via the sanctioned direct Node path. Evidence labels the historical run `EXPECTED FAIL (pre-fix reproduction)` and current runs `PASS`; these statuses must never be merged into one count.

## 5. File Manifest

```text
IMPLEMENTATION_PLAN.md             (MOD) — Cycle-14 contract and Cycle-13 swipeUp back-port
docs/VERIFICATION_EVIDENCE.md      (MOD) — sanitized pre-fix hierarchy provenance and current verification
```

Temporary detached-worktree edits, DerivedData, result bundles, and exported attachments are verification inputs only and must be absent from the final diff. No other tracked file may change.

## 6. Implementation Phases

### Phase 0 — Baseline and isolation

1. Confirm the main worktree is clean apart from the approved plan commit and record `git rev-parse HEAD`.
2. Confirm `50b4357^{commit}` and `5e80c8b^{commit}` resolve and that their relevant diff contains the Cycle-13 hit-region/test changes.
3. Confirm Xcode 26.4, iOS 26.4, and the pinned iPad (A16) simulator are available.
4. Allocate all reproduction paths with `mktemp -d`; add a detached worktree at exact commit `50b4357`. Never switch or rewrite the main worktree.

Acceptance: exact commits and runtime resolve, the detached source lacks the full-width frame/content shape, and no tracked main-tree file is touched.

### Phase 1 — Capture the pre-fix failure

1. In the detached worktree only, add a test-local failure attachment immediately after the existing wait for `scan.status` fails. Preserve the original tap, five-second wait, and assertion outcome.
2. Boot/confirm the pinned simulator and run only `CheckIn007UITests/testFirstCheckInFlow` with fresh temporary DerivedData and result-bundle paths.
3. Require a nonzero test result caused by missing `scan.status`; infrastructure/compile/boot failures do not count and permit one clean infrastructure-only retry.
4. Resolve the failed test ID using `xcresulttool get test-results tests`, export only failure attachments, and inspect the manifest plus hierarchy text.
5. Assert over the complete attachment: `roster.row.` count is at least one and `scan.status` count is zero. Record counts and a minimal roster-bearing excerpt.

Acceptance: the exact pre-fix tree produces the expected assertion failure and a retained attachment satisfying both hierarchy invariants. Any different failure or missing evidence stops the phase.

### Phase 2 — Document both follow-ups

1. Add a Cycle-14 subsection to `docs/VERIFICATION_EVIDENCE.md` naming the historical commit and environment, expected failure, attachment extraction method/name, invariant counts, sanitized excerpt, and the `5e80c8b` repair relationship.
2. State explicitly that the excerpt is documentary evidence only, while the complete attachment was used for presence/absence checks and was deleted after validation.
3. Record the already-landed `sheet.swipeUp()` as required lazy-Form navigation between `admin.sheet` existence and the two mandatory clear-log confirmations.
4. Preserve all prior evidence verbatim, especially current native PASS and CI `BLOCKED (external billing)`.

Acceptance: a reviewer can distinguish source versions and reproduce the capture without relying on an uncommitted artifact; no secret, absolute path, PID, timestamp, coordinate dump, or raw personal/container identifier is committed.

### Phase 3 — Verify current health and cleanup

1. Remove the detached worktree and its temporary directory; verify no registered temporary worktree remains.
2. Run current-tree focused methods `testFirstCheckInFlow` and `testClearLogRequiresTwoConfirmations` independently. Both must pass with their existing assertions and timeouts.
3. Run the complete `CheckIn007` native scheme with fresh temporary DerivedData/result bundle; require two targets, six unit suites, 33 unit + 4 UI = 37 passed, zero failed/skipped, exit 0.
4. Run `npm ci`, `npx prettier --check .`, `node --test tests/unit/*.test.mjs`, `npx playwright test`, and `node scripts/build.mjs` through the sanctioned direct Node path.
5. Confirm `dist/` remains untracked, only the two manifest files differ from the approved-plan commit, and the evidence has no placeholders or false CI-PASS wording.

Acceptance: focused and full current-tree gates pass, web gates pass, temporary artifacts are gone, and the final tracked diff matches §5 exactly.

### Phase 4 — Completion recording

After every acceptance above succeeds, mark §14 complete and append the current tested source identity and result counts to the Cycle-14 evidence subsection. Do not edit the backlog; the discriminator owns closure of its two items after audit.

## 7. Integration Points

### 7.1 Git identity ↔ historical reproduction

- **Contract:** reproduction executes detached commit `50b4357`; current verification executes the post-repair HEAD.
- **Failure:** ambiguous SHA, dirty main tree, or reproduction from repaired source invalidates the evidence.
- **Recovery:** discard the temp worktree and restart from exact commits; never reset the main tree.
- **Migration:** none; all reproduction mutations remain outside committed history.

### 7.2 XCTest attachment ↔ durable evidence

- **Contract:** the complete attachment supports both positive roster presence and negative `scan.status` absence; docs retain only a sanitized excerpt and counts.
- **Failure:** attachment missing, wrong test/run, invariant mismatch, or only an excerpt checked.
- **Recovery:** inspect test ID/manifest, rerun once only for infrastructure loss; otherwise stop for a new diagnosis.
- **Migration:** existing Cycle-13 evidence remains append-only.

### 7.3 Lazy admin Form ↔ clear-log UI test

- **Contract:** find `admin.sheet`, scroll it once, require `admin.clearLog`, tap, require `admin.clearLog.confirm`, tap.
- **Failure:** control remains absent or confirmation identity does not change.
- **Recovery:** retain failure hierarchy and fail; no optional assertion, coordinate tap, or timeout inflation.
- **Migration:** documentation catches up to existing verified code; runtime is unchanged.

### 7.4 Evidence status ↔ audit consumers

- **Contract:** historical expected failure and current PASS have separate source identities and labels; CI remains externally blocked.
- **Failure:** a reader could interpret the historical red run as HEAD health or CI as passed.
- **Recovery:** correct status labels before commit.
- **Migration:** additive Cycle-14 subsection; old raw history remains intact.

## 8. Error Handling and Edge Cases

| Condition | Detection | Response and recovery |
| --- | --- | --- |
| Main tree becomes dirty unexpectedly | porcelain/diff before each phase | Preserve user work and stop; do not clean/reset it |
| Historical commit unavailable | `rev-parse` failure | Stop; do not reproduce from an approximate revision |
| Simulator boot/runner interruption | xcodebuild diagnostics, no product assertion | One clean infrastructure-only retry, then stop |
| Pre-fix method unexpectedly passes | exit/result summary | Reject the capture; do not fabricate evidence |
| Failure is compile/setup rather than `scan.status` | xcresult test details | Reject and fix only temporary instrumentation |
| Attachment not retained/exported | manifest and export output | Check test ID/API, retry once; otherwise leave open |
| Roster marker absent | full-attachment count = 0 | Stop; hierarchy does not prove the stated state |
| `scan.status` present | full-attachment count > 0 | Stop; hit-region diagnosis is contradicted |
| Sensitive/volatile data in hierarchy | final text scan/review | Quote only the minimum sanitized structural lines |
| Temp cleanup fails | worktree list/path check | Remove only the exact validated temp target; stop if uncertain |
| Current native/web regression | nonzero result or inventory mismatch | Do not mark complete; diagnose in a later approved case |
| CI billing remains locked | existing run metadata | Keep `BLOCKED`; no push/poll/claim |

## 9. Stability and Performance

- Committed changes are documentation-only and add zero runtime CPU, memory, storage, startup, or latency cost.
- Historical reproduction runs one UI method, O(1) in suite size; hierarchy inspection is O(H) time and memory for attachment length H, expected well below 1 MB. Only a short excerpt is committed.
- Full verification retains existing bounded waits and suite sizes. Temporary DerivedData/result bundles may consume several GB, but live only under one validated `mktemp` root and are deleted after extraction.
- Exactly one detached worktree is created. Cleanup targets its explicit path; no broad glob, repository-root deletion, or unresolved environment variable is permitted.
- Failure is fail-closed: missing/contradictory evidence leaves completion unchecked and does not alter current source.

## 10. Testing Strategy

- **Historical focused UI:** `testFirstCheckInFlow` at `50b4357` must fail specifically after row tap on absent `scan.status` and emit the diagnostic attachment.
- **Evidence assertions:** full attachment has `roster.row.` ≥ 1 and `scan.status` = 0; manifest associates it with the failed method.
- **Current focused UI:** first check-in and clear-log methods pass independently, proving the hit repair and required scroll respectively.
- **Native integration:** complete scheme reports exactly 37/37 across both targets, six unit suites, four UI methods, zero skips/failures.
- **Web regression:** clean install, Prettier, 78 unit tests, 13 Playwright tests, deterministic build within the existing budget; counts may increase only if unrelated upstream work already changed them, in which case stop and reconcile rather than silently rewrite evidence.
- **Documentation:** prior PASS/BLOCKED history unchanged, source identities unambiguous, excerpt sanitized, final diff limited to §5.

## 11. Environment and Toolchain

- Xcode 26.4 (`17E192`), iOS 26.4 (`23E244`), iPad (A16) `A155995F-EC83-41BE-95B2-1A5F390ABF59`.
- Scheme `CheckIn007`; native targets `CheckIn007Tests` and `CheckIn007UITests`.
- `xcresulttool get test-results tests` and `xcresulttool export attachments --only-failures` from Xcode 26.4.
- Node 24.20.0 is the project pin. The documented sanctioned local direct-tool verification may use installed Node 26.3.0/npm 11.16.0 without weakening the checked-in Node guard.
- Fresh clone setup remains `npm ci`; no new package, formatter, or generator is introduced.

## 12. Deployment, Distribution, and Rollback

There is no deployment or external mutation. The committed output is an implementation plan plus durable evidence. Roll back the later implementation commit with `git revert <cycle-14-implementation-commit>`; no schema, stored data, binary, or generated artifact is affected. Temporary reproduction data is intentionally non-distributed.

## 13. Open Questions and Decision Gates

1. **Will exact pre-fix code still reproduce on iOS 26.4?** The prior run says yes, but Phase 1 decides. An unexpected pass or different failure blocks documentation rather than authorizing a rewritten conclusion.
2. **Will the custom hierarchy attachment export as text?** Xcode 26.4 supports failure attachment export. If the payload format differs, inspect the manifest and use the exported file without changing the required full-payload invariants.
3. **Does the hierarchy contain fixture names that should not be quoted?** Even though fixtures are checked in, prefer identifiers/roles only; redact display names and all volatile values.
4. **Will billing clear?** External and irrelevant to this cycle; CI stays `BLOCKED (external billing)`.

None permits product-code edits, assertion weakening, approximate evidence, or scope expansion.

## 14. Completion Checklist

- [ ] Exact `50b4357` reproduction fails at missing `scan.status` and retains the expected hierarchy attachment.
- [ ] Full attachment validation proves `roster.row.` present and `scan.status` absent; committed excerpt is minimal and sanitized.
- [ ] Plan contract explicitly requires `sheet.swipeUp()` before both unchanged clear-log confirmations.
- [ ] Current focused first-check-in and clear-log methods pass independently.
- [ ] Current full native scheme passes 37/37 with zero failures/skips, and all web gates pass.
- [ ] Temporary worktree/results are removed; final tracked diff contains only the two §5 files.
- [ ] Evidence distinguishes pre-fix expected failure, current native/web PASS, and CI `BLOCKED (external billing)`.

Every checkbox is required. This plan addresses only the two Audit-v53 backlog follow-ups; the discriminator decides backlog closure after implementation audit.
