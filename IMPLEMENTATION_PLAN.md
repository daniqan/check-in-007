# Check-In 007 — Cycle Artifact Guard CI Reconciliation Plan v31 (Cycle 18)

## 1. Overview

Cycle 18 addresses the next unchecked backlog item: reconciling the `check-cycle-artifacts` guard with the normal pre-critique planning window. The current guard correctly prevents silent loss of `IMPLEMENTATION_PLAN_CRITIQUE.md`, but the CI step runs without the planning override, so a legitimate generator plan-only commit can fail before the discriminator has written a fresh critique. This plan keeps the fail-closed protection for real artifact drift while allowing only the narrow, auditable plan-only transition used to open a new cycle.

Source trace:

- `BACKLOG.md` item "Cycle-artifact guard polish (opened audit v63)": reconcile CI `check-cycle-artifacts` with plan-only generator commits whose only substantive change is `IMPLEMENTATION_PLAN.md`.
- Existing guard: `scripts/check-cycle-artifacts.mjs` fails when a non-empty plan has a missing, zero-byte, or whitespace-only critique unless `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1`.
- Existing CI: `.github/workflows/ci.yml` runs `npm run check:cycle-artifacts` on `push` to `main`/`master` and all pull requests, with no event-aware exception.

## 2. Scope

### In scope

1. Extend `scripts/check-cycle-artifacts.mjs` with an event-independent, git-backed "plan-only planning commit" allowance for empty critiques.
2. Keep the current manual override, `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1`, but make the CI reconciliation use a separate explicit flag so routine local validation remains strict by default.
3. Update `package.json` with a CI-facing script that enables only the plan-only allowance.
4. Update `.github/workflows/ci.yml` to call the CI-facing guard script.
5. Add focused unit tests for changed-file classification, including allowed plan-only changes and rejected mixed or non-plan changes.
6. Update README and verification evidence docs so operators know which guard mode belongs in CI and which belongs only to the one generator planning commit.

### Out of scope

- Editing `IMPLEMENTATION_PLAN_CRITIQUE.md` or `CONSOLIDATED_AUDIT.md`.
- Implementing RA #14 iPad roster scroll fixes or RA #19 XCUITest harness hardening; those are audit findings, not the selected backlog item for this cycle.
- Changing app runtime behavior, build artifacts, source assets, guest data, or iOS smoke-test behavior.
- Adding git hooks, branch protection rules, or GitHub repository settings.
- Weakening the guard for pull requests or pushes that include code, docs, workflow, audit, backlog, or critique changes.

## 3. Architecture

```text
.github/workflows/ci.yml
  Check cycle artifacts
    |
    +--> npm run check:cycle-artifacts:ci
          |
          +--> scripts/check-cycle-artifacts.mjs
                |
                +--> readCycleArtifactSizes(root)
                +--> changedFilesForGitRange({ baseRef, headRef })
                +--> isPlanOnlyPlanningChange(changedFiles)
                +--> checkCycleArtifacts({
                      files,
                      allowEmptyCritique,
                      allowEmptyCritiqueForPlanOnlyChange,
                      changedFiles
                    })

tests/unit/cycle-artifacts.test.mjs
  Unit-level proof for all guard modes without requiring GitHub Actions
```

The guard remains a local Node module with no external dependencies. CI supplies the plan-only allowance through script wiring, not a broad environment override. The script determines whether the commit under test changed only `IMPLEMENTATION_PLAN.md`; if any other tracked path changed, an empty critique remains a failure. For local tests and direct function tests, callers can pass `changedFiles` explicitly so the classifier is deterministic and does not depend on a live git repository.

## 4. Technical Decisions and Rationale

### 4.1 Add a narrow plan-only allowance instead of disabling the guard in CI

Chosen: add `allowEmptyCritiqueForPlanOnlyChange` to `checkCycleArtifacts()` and enable it only from the CI-facing npm script.

Why: the backlog item identifies one valid false positive: a generator opening a new cycle replaces `IMPLEMENTATION_PLAN.md` before the discriminator writes a fresh critique. That does not justify disabling the guard for workflow, source, test, documentation, audit, backlog, or critique changes. The narrow allowance preserves RA #16's protection while unblocking the intended plan-review sequence.

Rejected alternatives:

- Remove the CI guard: would reopen the empty-critique recurrence RA #16 was created to prevent.
- Use `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1` in CI: too broad, because any CI commit with an empty critique would pass.
- Scope the workflow only to pull requests or only default-branch pushes: current CI already targets `main`/`master` plus pull requests, and event scoping alone cannot distinguish a legitimate plan-only planning commit from a code commit with a missing critique.

Tradeoff: the script needs a small amount of git awareness. The implementation keeps this bounded by accepting explicit `changedFiles` for tests and treating unknown git range information as strict failure rather than permissive success.

Skeletal contract:

```js
export function isPlanOnlyPlanningChange(changedFiles) {
  /** Returns true only when changedFiles is a non-empty array containing exactly
      IMPLEMENTATION_PLAN.md after normalization. Throws no errors; invalid,
      empty, absolute, or non-root paths return false. */
  ...
}

export function checkCycleArtifacts({
  files,
  allowEmptyCritique = false,
  allowEmptyCritiqueForPlanOnlyChange = false,
  changedFiles = null,
}) {
  /** Preserves existing missing/empty plan, audit, and backlog failures.
      Allows an empty critique when allowEmptyCritique is true, or when the
      plan-only allowance is true and changedFiles proves only IMPLEMENTATION_PLAN.md
      changed. Returns { ok, checked, errors, warnings? }. */
  ...
}
```

### 4.2 Resolve changed files through git with explicit CI inputs and strict fallback

Chosen: add a helper that runs `git diff --name-only <base>...<head>` when a base/head range is available, with a fallback to `git diff --name-only HEAD^ HEAD` for single-commit local validation.

Why: GitHub pull_request and push events expose different ranges, but the guard script should stay usable outside GitHub Actions. The file classifier only needs path names, so standard git diff output is enough and avoids adding dependencies.

Rejected alternatives:

- Parse GitHub event JSON directly in the script: couples repo validation to GitHub-specific payload shape and makes unit tests more brittle.
- Use shell-only workflow conditions: hard to test locally and easy to drift from the Node guard semantics.
- Inspect commit messages such as `plan:`: commit messages are not a reliable safety boundary.

Tradeoff: shallow checkouts may not have the base commit. The CI plan includes `actions/checkout` with enough fetch depth for the guard range; if git still cannot resolve the range, required empty-critique validation fails closed.

Skeletal contract:

```js
export async function changedFilesForGitRange({
  root = process.cwd(),
  baseRef = process.env.CHECKIN007_CYCLE_ARTIFACT_BASE_REF,
  headRef = process.env.CHECKIN007_CYCLE_ARTIFACT_HEAD_REF || 'HEAD',
  runCommand = run,
} = {}) {
  /** Returns { ok:true, files:[...] } when git diff succeeds.
      Returns { ok:false, files:null, reason } when no range is available or git
      fails. The caller must not treat ok:false as permission to ignore an empty
      critique. */
  ...
}
```

### 4.3 Keep canonical file emptiness checks unchanged

Chosen: preserve the current checks that `IMPLEMENTATION_PLAN.md`, `CONSOLIDATED_AUDIT.md`, and `BACKLOG.md` must exist and be non-empty, and that whitespace-only canonical files count as empty.

Why: the backlog item is only about empty critique timing. Loosening any other canonical artifact check would expand the blast radius and make process drift harder to detect.

Rejected alternative: apply the plan-only allowance to all canonical files. That would allow a plan commit to hide a missing audit or backlog, which is unrelated to the planning-window problem.

### 4.4 Document two separate escape hatches

Chosen: document:

- `npm run check:cycle-artifacts` for strict local/default validation.
- `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1 npm run check:cycle-artifacts` only for the one intentional generator planning commit before discriminator review.
- `npm run check:cycle-artifacts:ci` for CI, where an empty critique is allowed only if git proves the change set is exactly `IMPLEMENTATION_PLAN.md`.

Why: having separate names makes misuse visible in command history and CI logs.

Rejected alternative: overload one command with hidden GitHub Actions detection. Hidden mode changes make local reproduction harder.

## 5. File Manifest

```text
IMPLEMENTATION_PLAN.md               (MOD) — replace Cycle 17 plan with this Cycle 18 backlog plan
BACKLOG.md                           (MOD) — mark the selected cycle-artifact guard polish item in progress
package.json                         (MOD) — add check:cycle-artifacts:ci script
.github/workflows/ci.yml             (MOD) — call the CI guard script and fetch enough history for diffing
scripts/check-cycle-artifacts.mjs    (MOD) — add plan-only changed-file allowance and git range helper
tests/unit/cycle-artifacts.test.mjs  (MOD) — cover strict, manual-override, plan-only, mixed-change, and git-helper behavior
README.md                            (MOD) — document strict vs planning vs CI guard usage
docs/VERIFICATION_EVIDENCE.md        (MOD) — record Cycle 18 guard reconciliation expectations and evidence commands
```

No `src/`, `dist/`, `assets/`, `native/`, guest CSV/data, iOS smoke-test, or app behavior files are part of this plan.

## 6. Implementation Phases

### Phase 1 — Guard classifier and strict empty-critique behavior

1. Add path normalization internal to `scripts/check-cycle-artifacts.mjs`.
2. Add `isPlanOnlyPlanningChange(changedFiles)`.
3. Extend `checkCycleArtifacts()` with `allowEmptyCritiqueForPlanOnlyChange` and `changedFiles`.
4. Preserve all existing strict failures when:
   - plan, audit, or backlog is missing, zero-byte, or whitespace-only;
   - critique is empty and neither escape hatch applies;
   - critique is empty, plan-only mode is enabled, but changed files are missing, empty, or include any path besides `IMPLEMENTATION_PLAN.md`.

Acceptance criteria:

- Existing unit tests still pass without behavior changes.
- New direct tests prove `['IMPLEMENTATION_PLAN.md']` is allowed only when the new plan-only flag is true.
- New direct tests prove `['IMPLEMENTATION_PLAN.md', 'README.md']`, `['BACKLOG.md']`, `[]`, `null`, and nested/absolute variants do not activate the plan-only allowance.

### Phase 2 — Git changed-file range helper and CLI wiring

1. Add a small injectable `run()` helper using `node:child_process/promises`.
2. Implement `changedFilesForGitRange()` with:
   - explicit env support for `CHECKIN007_CYCLE_ARTIFACT_BASE_REF`;
   - explicit env support for `CHECKIN007_CYCLE_ARTIFACT_HEAD_REF`;
   - `HEAD` as the default head;
   - `HEAD^ HEAD` fallback only when no base ref is supplied;
   - strict `{ ok:false }` result on git errors.
3. Extend `main()` with `allowEmptyCritiqueForPlanOnlyChange` and optional `changedFiles`.
4. When plan-only allowance is enabled and critique is empty:
   - if git proves plan-only, pass and print a warning naming the narrow allowance;
   - if git cannot prove plan-only, fail with a message that names the changed-file requirement.

Acceptance criteria:

- Tests use injected `runCommand` stubs; no unit test requires a real git repository.
- CLI failure messages remain actionable and include `IMPLEMENTATION_PLAN_CRITIQUE.md`.
- Manual `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1` behavior remains unchanged and still prints the existing planning-window warning.

### Phase 3 — CI and package script reconciliation

1. Add `"check:cycle-artifacts:ci": "node scripts/check-cycle-artifacts.mjs --allow-plan-only-empty-critique"` or equivalent CLI flag wiring.
2. Update `.github/workflows/ci.yml`:
   - set `fetch-depth: 2` or otherwise ensure the previous commit is available for push diffing;
   - pass `CHECKIN007_CYCLE_ARTIFACT_BASE_REF` and `CHECKIN007_CYCLE_ARTIFACT_HEAD_REF` from GitHub context when available;
   - run `npm run check:cycle-artifacts:ci` before lint/test/build.
3. Keep CI strict for pull requests or pushes with any non-plan file in the diff.

Acceptance criteria:

- The workflow remains least-privilege (`contents: read`) and keeps existing Node/cache/test/build behavior.
- A plan-only commit with an empty critique is the only CI empty-critique pass case.
- A code or docs commit with an empty critique still fails before lint/test/build.

### Phase 4 — Documentation and verification evidence

1. Update README guard usage to distinguish strict local, one-off planning override, and CI plan-only allowance.
2. Update `docs/VERIFICATION_EVIDENCE.md` with Cycle 18 evidence expectations:
   - unit test command;
   - direct strict guard command;
   - manual override command;
   - CI-mode dry-run scenario using injected or temporary git fixtures if implemented.
3. Do not claim the implementation is verified until tests and formatting run in the implementation case.

Acceptance criteria:

- Documentation does not instruct operators to use the broad override in CI.
- Evidence text remains truthful about what has and has not run.
- Prettier remains clean on touched Markdown and workflow files.

## 7. Integration Points

1. `package.json` to CI:
   - Contract: `check:cycle-artifacts:ci` invokes the same Node script with only the plan-only empty-critique allowance.
   - Failure mode: if the script exits nonzero, CI stops before lint/test/build and surfaces the canonical artifact error.
   - Migration path: existing `check:cycle-artifacts` remains available for strict local use, so existing operator commands continue working.

2. `.github/workflows/ci.yml` to git history:
   - Contract: checkout must provide enough history for the guard to diff the current change set.
   - Failure mode: unavailable diff data with an empty critique fails closed; unavailable diff data with a non-empty critique is harmless because no allowance is needed.
   - Migration path: add checkout fetch-depth/range environment in the same commit as the script support.

3. Guard script to tests:
   - Contract: exported pure functions accept injected file metadata and changed-file lists.
   - Failure mode: invalid test fixture paths must not accidentally return plan-only success.
   - Migration path: existing tests continue importing `checkCycleArtifacts`, `main`, and `readCycleArtifactSizes`.

4. Guard script to discriminator workflow:
   - Contract: root critique content is still required after discriminator review; only the temporary plan-only commit can pass without it.
   - Failure mode: if a later implementation or documentation commit has an empty critique, CI fails as before.
   - Migration path: backlog item flips to `[x]` only after this plan is implemented and receives ≥95 implementation verification in a later case.

## 8. Error Handling and Edge Cases

- Empty or whitespace-only plan/audit/backlog: always fail; no escape hatch applies.
- Empty or whitespace-only critique with manual override: pass with the existing warning, because this is the explicitly requested one-off planning window.
- Empty critique with CI plan-only allowance and exactly `IMPLEMENTATION_PLAN.md` changed: pass with a distinct warning naming the plan-only allowance.
- Empty critique with CI plan-only allowance and no changed-file data: fail closed.
- Empty critique with mixed changes such as `IMPLEMENTATION_PLAN.md` plus `README.md`: fail closed.
- Empty critique with only `BACKLOG.md` changed: fail closed; backlog updates are not a substitute for discriminator review.
- Path tricks such as `./IMPLEMENTATION_PLAN.md`, `subdir/../IMPLEMENTATION_PLAN.md`, absolute paths, empty strings, or directory paths: normalize root-relative safe paths and accept only the canonical root file.
- Git command unavailable or range missing: report a clear error and fail only when the empty-critique allowance would be needed.
- Non-empty critique: changed-file discovery failure must not fail the guard, because the core artifact integrity contract is already satisfied.
- Pull request with many commits: CI must use the GitHub-provided base/head range rather than assuming `HEAD^`.
- Push with first commit on a branch and unavailable `before`: strict fallback applies; the guard must not silently allow an empty critique.

## 9. Stability and Performance

The guard reads four small Markdown files and, in CI mode, runs one git diff. Time complexity is `O(F + P)`, where `F` is the total bytes in the four canonical files and `P` is the number of changed paths returned by git. Expected `F` is under a few megabytes and `P` is usually under a few dozen paths; runtime should stay below 100 ms locally, excluding process startup and git overhead.

Memory usage is bounded by the canonical file contents and changed-path list. No long-running resources, watchers, sockets, or external services are introduced. Git failures are handled as data, not uncaught process crashes, so CI receives deterministic pass/fail behavior.

## 10. Testing Strategy

Unit tests in `tests/unit/cycle-artifacts.test.mjs`:

- Existing pass case with all canonical files non-empty.
- Existing failure case for missing plan/audit/backlog.
- Existing failure case for missing, zero-byte, and whitespace-only critique.
- Existing manual override case with warning.
- New pass case: empty critique, plan-only allowance enabled, changed files exactly `['IMPLEMENTATION_PLAN.md']`.
- New failure cases: empty critique plus mixed changes, no changes, null changes, only backlog changes, nested paths, and absolute paths.
- New git-helper cases with injected `runCommand`: base/head diff success, fallback diff success, diff command failure, and output trimming/deduping.
- New `main()` cases proving CI mode passes only when changed-file discovery proves plan-only.

Verification commands for the implementation case:

```bash
node --test tests/unit/cycle-artifacts.test.mjs
node --test tests/unit/*.test.mjs
npx prettier --check package.json .github/workflows/ci.yml scripts/check-cycle-artifacts.mjs tests/unit/cycle-artifacts.test.mjs README.md docs/VERIFICATION_EVIDENCE.md
npm run check:cycle-artifacts
```

Full `npm run lint` may fail in this environment when the Node 24 guard is run under a non-24 Node; the implementation evidence must report the actual Node version and, if needed, run the direct Prettier and unit commands used by prior cycles.

## 11. Environment and Toolchain

- Node runtime target remains the existing project pin: Node `24.20.0`, `engines.node >=24 <25`.
- No new npm dependencies.
- Git must be available in CI for the plan-only change classifier. GitHub-hosted runners satisfy this; local strict mode does not require git range discovery unless CI mode is explicitly requested.
- Existing package manager and lockfile behavior remain unchanged.

Fresh clone setup stays:

```bash
npm ci
npm run check:cycle-artifacts
node --test tests/unit/*.test.mjs
```

## 12. Deployment and Distribution

This is a repository process change, not an app runtime deployment. Distribution happens through the committed Node script, package script, CI workflow, tests, and docs.

Rollback procedure:

1. Revert the implementation commit for this plan.
2. CI returns to the current strict `npm run check:cycle-artifacts` behavior.
3. RA #16 protection remains strict, but plan-only new-cycle commits with empty critiques may again fail CI until the discriminator writes the critique.

## 13. Open Questions

1. Should CI allow plan-only empty-critique commits on pull requests as well as default-branch pushes?
   - Proposed resolution: yes, but only when the changed-file classifier proves exactly `IMPLEMENTATION_PLAN.md`; the safety condition is the same across events.
   - Confirmation needed: discriminator review of this plan.

2. Should the implementation include an npm script for simulating CI mode locally?
   - Proposed resolution: the `check:cycle-artifacts:ci` script is sufficient and can be run locally; tests should use injected changed-file data instead of mutating the developer's git history.
   - Confirmation needed: none unless the discriminator requests a dedicated fixture command.

3. Should the broad `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1` override be removed after this plan?
   - Proposed resolution: no. Keep it for the generator's single pre-critique planning commit outside CI, but document that CI uses the narrower plan-only allowance.
   - Confirmation needed: discriminator review.
