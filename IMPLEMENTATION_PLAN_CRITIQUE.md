# Check-In 007 — Plan v17 Critique (Cycle 7) — Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `5efd0ce`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v17 (Cycle 7 — Node 24 LTS pin + GitHub Actions CI)
**Score:** **97 / 100** (previous: first review of v17 | Cycle-5 v14 Node-24 core scored 98)
**Status:** APPROVED

Plan v17 is a fresh Cycle-7 plan that bundles the two remaining tightly-coupled backlog
items (Node 24 LTS toolchain pin + a CI workflow that runs on that pin), reusing the
previously-APPROVED (98/100, Cycle-5 Rev 3) v14 Node-24 material and adding a net-new,
fully-specified GitHub Actions web gate. Every load-bearing claim was verified against the
live tree. It clears the ≥95 gate on the first review; the three items below are
non-blocking robustness/polish nits (all in Path to 100), not gate blockers.

## Remaining issues

All non-blocking. Carry into implementation if convenient; none holds the gate.

1. **`dist` artifact upload can emit a spurious second failure.** (§6 Phase 4, workflow
   `Upload built kiosk` step.) The step is `if: always()` with `if-no-files-found: error`.
   If any earlier step fails (lint, unit, e2e) the `build` step — which has no `if:` — is
   skipped, so `dist/index.html` never exists on the fresh runner, and the `always()`
   upload then fails a *second* time on `if-no-files-found: error`. The job already fails
   correctly from the real error; this just adds a red herring step. Consider `if:
   success()` for the dist upload (keep the report upload on `if: failure()`), or accept
   the extra red X as harmless. Cosmetic, not a correctness defect.

2. **No `timeout-minutes` on the `web` job.** (§6 Phase 4.) A hung e2e/webServer or a
   stalled browser download can consume the default 6-hour runner ceiling before
   `cancel-in-progress` (which only fires on a *new* run of the same ref) reclaims it.
   A `timeout-minutes: 15` (or similar) bounds a wedged run. Best-practice hardening, not
   a defect.

3. **YAML validated only by Prettier parse + GitHub's own parse.** (§10 Workflow
   validation.) There is no local *schema* validation of `ci.yml` (key correctness,
   `runs-on`, action pins) before push — the first real structural check is GitHub
   parsing it on push. This is a reasonable consequence of the zero-new-dependency
   constraint (well-argued in §4.2), and the Phase-5 structural read + Prettier parse
   mitigate it, but it is a genuine specificity gap versus a plan that pinned, e.g., a
   schema check. Acknowledged, not blocking.

## Scope Check

**Scope is adequate — no cap applied.**

- **Audit findings:** Required Actions #1–#8 are all **DONE** (verified `CONSOLIDATED_AUDIT.md`
  §Required Actions table, lines 855–862); none stalled. No open P0/P1/P2 in scope.
- **Backlog items:** Three items were unchecked entering this cycle. The plan addresses
  the **two tightly-coupled** ones (Node 24 pin + CI-on-Node-24, `BACKLOG.md:16-17`) — they
  are genuinely coupled (§Overview: CI "runs on the pinned Node 24 line"). The **third**
  (on-device static-HTTPS helper, `BACKLOG.md:11`) is correctly deferred (§2 Out of scope):
  it is an unrelated **native** subsystem, not the same subsystem/phase/logical group, so
  the "don't demand unrelated work" rule applies. Deferral is justified, not evasive.
- **Integration points:** §7 enumerates seven contracts (npm engines, dev scripts, test
  runner, Actions↔version-files, Actions↔Playwright, static build, operator docs) each with
  contract/failure-mode/migration. Cross-cutting analysis is present.
- **Alternatives considered:** §4 gives explicit alternatives+rejections for all key
  decisions (engine range, dependency-free guard vs npm package, `pathToFileURL` vs
  `import.meta.url === file://`, Ubuntu vs macOS runner, major-tag vs SHA action pins,
  chromium-only vs all engines). Tradeoffs are stated.

## Flaws of Commission

No gate-blocking flaws of commission identified. Verified against source:

- Engine range `>=24 <25` correctly targets only Node 24 LTS; rejects un-audited 25/26.
  `package.json:6-8` and lockfile `packages[""].engines` (`package-lock.json:17-18`) both
  currently read `>=22` — the plan's edit target is precise and does not touch the
  transitive `>=20`/`>=8` dep floors.
- `pathToFileURL(process.argv[1]).href` executable-tail idiom is the *correct* fix for the
  Cycle-5 Rev-2 fails-open bug — it runs on every Node major the guard must reject, so the
  CLI fails **closed** (exit 1) on Node 20/22-pre-22.18/23 where `import.meta.main` is
  `undefined`. This was the specific defect that held v13 at 93; v14/v17 resolve it.
- Guard wired into `lint`/`test`/`build` but not `test:unit`/`test:e2e` is **intentional**
  (§4.9) so CI can install browsers between unit and e2e; both still run on Node 24 in CI.
- Prettier surface is correctly reasoned: `.prettierignore` already contains `native/`
  (verified) and `.github/` is absent, so `ci.yml` **is** checked (§8) — the plan requires
  it be authored Prettier-clean and Phase 5 verifies. The hand-edited lockfile string change
  (`>=22`→`>=24 <25`) does not alter Prettier formatting, so `prettier --check .` stays clean.

## Flaws of Omission

No gate-blocking omissions. Minor gaps noted in Remaining issues #1–#3 (spurious dist-upload
failure, no job timeout, no local YAML schema check). Beyond those:

- Error/edge coverage (§8) is thorough: unsupported major, malformed/empty version,
  `import.meta.main` unavailability, Node-26-this-machine, patch drift, CI cache miss, fork
  PR (`permissions: contents: read`, no secrets), concurrent pushes, npm-without-engine-strict,
  `.github/` Prettier inclusion. All named with a handling.
- Rollback is designed (§12): revert commit, re-run gate on prior runtime, delete `ci.yml`
  to withdraw CI, restore backlog `[/]`→`[ ]` only if abandoned.
- Verification-on-this-machine (Node 26) is explicitly handled with the direct-tool
  diagnostic bypass (§5, §11) — the guard's Node-26 rejection is pre-declared expected, so
  the eventual implementation audit is not blocked by the absence of a Node-24 runtime.

## Regressions

No unintended regressions identified.

- No `src/`, `data/`, `assets/`, `vendor/`, `native/`, or `build.mjs`-internal changes
  (§5 File Manifest); the browser artifact and its ≤750 KB gzip / ≤1.2 MB raw budget
  (verified `scripts/build.mjs:148`) are untouched.
- The one **intentional** behavioral change — guarded `lint`/`test`/`build` now fail on
  non-24 runtimes (including this Node-26 machine) — is a *designed* gate, thoroughly
  documented with a diagnostic bypass, not an accidental regression. `serve`/`serve:https`/
  `test:unit`/`test:e2e`/`fonts:subset` stay unguarded so dev servers still start.
- Test coverage strictly increases (new `tests/unit/node-version.test.mjs` incl. a
  child-process smoke test); no existing suite is weakened; no camera/audio privacy
  assertion is touched.

## Why 97 and not 98

The Cycle-5 v14 Node-24 *core* earned 98 as a standalone plan. v17 re-uses that vetted
material and adds a genuinely new, well-specified CI component — but the CI addition carries
its own small surface (Remaining issues #1 spurious dist-upload failure, #2 no job timeout,
#3 no local YAML schema validation). None blocks the gate, but a 98–99 CI plan would not
have the `if: always()` upload interacting badly with `if-no-files-found: error`, and would
bound the job with `timeout-minutes`. Two concrete robustness nits + one specificity nit =
97, not 98.

## Path to ≥95

Already ≥95 (97). Approved. No required changes.

## Path to 100

1. Change the `dist/index.html` upload to `if: success()` (or drop `if-no-files-found:
   error` on the `always()` variant) so a lint/test/e2e failure produces exactly one red
   step, not two (Remaining issue #1).
2. Add `timeout-minutes` to the `web` job to bound a wedged run independently of
   `cancel-in-progress` (Remaining issue #2).
3. Note that `github.ref` in the `concurrency` group lets a branch push and its PR run as
   two groups (`refs/heads/…` vs `refs/pull/N/merge`); if double-runs are undesirable,
   key concurrency on `github.workflow`-plus-head-ref instead. Purely optional.
4. State the expected `.nvmrc` resolution fallback more concretely — §4.6/§6.6 mention a
   fuzzy `24` if a pinned patch outpaces the `setup-node` index; a one-line "how we'd know"
   (setup-node step errors "not found in version index") would make the escape hatch fully
   turn-key.
5. Optionally record the observed steady-state CI wall-clock target (§9 says "a few
   minutes") as a concrete budget once the first run lands, to catch e2e drift.

## Summary

Approval-grade on the first review. The plan is implementation-ready: a competent developer
could execute all five phases without an architectural question, every version/config value
was verified against the live tree, scope is adequate (both coupled backlog items addressed,
the unrelated native item justifiably deferred, zero open in-scope audit findings), and the
CI workflow is fully written out with caching, least-privilege permissions, fork-PR safety,
and concurrency control. Three small robustness/polish nits (dist-upload failure semantics,
missing job timeout, no local YAML schema check) separate it from a 98–99. **Score 97/100 —
APPROVED. Loop advances to State 2: implement the approved plan.** The plan is now the
contract — do not revise it to chase points; land the code, then it will be audited against
this spec.

---

### Implementation Verification — v7 (Cycle 7)

**Plan:** `IMPLEMENTATION_PLAN.md` v17 @ commit `5efd0ce` (approved score: 97, Cycle 7 Rev 1)
**Code:** commit `61c456b` ("feat(cycle7): implement Node 24 LTS pin + GitHub Actions CI"),
9 files, audited on `master` on 2026-09-02 (runtime: Node v26.3.0 — the §5/§11 direct-tool
diagnostic path; the guarded npm scripts run this same chain on Node 24 in CI).

**Plan Score:** 97/100
**Implementation Score:** 97/100

| Section | Status | Notes |
|---------|--------|-------|
| §6.1 Version metadata (`.nvmrc`, `.node-version`) | COMPLIANT | Both files byte-exact `24.20.0\n` (verified via `xxd`: `32 34 2e 32 30 2e 30 0a`). |
| §6.1 `engines` tighten (`package.json` + lockfile root) | COMPLIANT | `package.json:6-8` reads `">=24 <25"`; lockfile diff is a **single line** — `packages[""].engines.node` `">=22"`→`">=24 <25"` (verified `git show`), no dep versions/integrity hashes touched. `npm ci` validates (build/tests ran off it). |
| §6.2 Guard `scripts/check-node-version.mjs` | COMPLIANT | Byte-matches the plan's Phase-2 spec: `parseNodeMajor`/`isSupportedNodeVersion`/`formatUnsupportedNodeMessage`/`main` + the version-agnostic `import.meta.url === pathToFileURL(process.argv[1]).href` executable tail. Direct run on Node 26 → **exit 1** with the one-line hint naming `26.3.0`, `Node 24 LTS`, `nvm install && nvm use` (fails **closed** as designed). |
| §6.3 Script wiring (`package.json`) | COMPLIANT | `check:node` added; `lint`/`test`/`build` guard-prefixed (`node scripts/check-node-version.mjs && …`); `serve`/`serve:https`/`test:unit`/`test:e2e`/`fonts:subset` left unguarded exactly as specified. |
| §6.3 README | COMPLIANT | Node 24 prereq + `nvm install && nvm use` setup path, fail-fast note, `check:node` mention, and a "Continuous Integration" section pointing at `ci.yml`. Existing iPad-HTTPS/privacy/build wording preserved; `prettier --check .` clean. |
| §6.4 `.github/workflows/ci.yml` | COMPLIANT | Byte-matches the Phase-4 spec: `on` push(main/master)+PR, `permissions: contents: read`, `concurrency`+`cancel-in-progress`, `ubuntu-latest`, `setup-node@v4` `node-version-file: '.nvmrc'` + `cache: 'npm'`, `npm ci`→lint→test:unit→cache/install chromium→test:e2e→build, dist upload `if: always()`, report upload `if: failure()`. All `actions/*` pinned `@v4` (major-tag, §4.7). Web-only; no `xcodebuild`/`native/`. |
| §6.5 Unit tests `tests/unit/node-version.test.mjs` | COMPLIANT | 6 test funcs incl. the child-process smoke test `spawnSync(process.execPath, [scriptPath])` asserting `status === (isSupportedNodeVersion(...) ? 0 : 1)`, path resolved via `fileURLToPath(new URL(...))` (cwd-independent). |
| §6 Phase 5 gates (executed) | COMPLIANT | `prettier --check .` **clean** (incl. `ci.yml`, README, guard — `.github/` absent from `.prettierignore`, verified); **63/63** unit pass (+6 guard tests, was 57); **12/12** e2e pass; `node scripts/build.mjs` → `dist/index.html` **26315 gzip bytes** (≤750 KB budget). |

**Regression check (Step 3.5):** none. Unit suite grew 57→63; e2e held 12/12; build byte-size
unchanged (26315). No `src/`/`data/`/`assets/`/`vendor/`/`native/`/`build.mjs`-internal change
(commit touches only the 9 manifest files). The one intentional behavioral change — guarded
`lint`/`test`/`build` now fail closed on non-24 runtimes — is the designed gate, not an
accidental regression (`serve`/`test:unit`/`test:e2e`/`fonts:subset` still start on Node 26).

**Deviations:** one, plan-sanctioned. The guarded npm scripts were verified via the §5/§11
**direct-tool bypass on Node 26**, not executed on an actual Node 24 runtime, and the
`ci.yml` workflow has **not yet had its first real run** (no `git push`/PR observed) — so the
workflow is verified structurally (Prettier YAML parse + a key-by-key structural read: `on`,
`permissions`, `concurrency`, `runs-on`, `node-version-file`, `cache`, action `@v4` pins,
`if-no-files-found`) and by the plan's own acknowledgement (§10) that "GitHub itself parses
and runs it on the first push, which is the definitive check." This is the §5/§11 pre-declared
accepted audit path, not a spec violation.

## Defects

None gate-blocking. The three critique nits (dist upload `if: always()`+`if-no-files-found:
error` double-failure; no `timeout-minutes`; no local YAML schema check) are **plan-level
Path-to-100 items** the approved v17 spec deliberately kept — the implementation matches the
contract verbatim, so they are not implementation defects. Carry them into a future CI-hardening
cycle if desired; do **not** reopen this cycle for them.

**Why 97 and not ≥98:** parity with the Cycle-6 precedent — the actual **Node-24 execution of
the guarded chain** and the **first live CI run** are deferred to first-push (verification
environment is Node 26; no GitHub run observed in-audit). Everything reproducible here is green
and every file byte-matches the spec, so this is a small, plan-sanctioned gap, not a code fault.

**Implementation Score: 97/100 — VERIFIED** (≥95 gate cleared). Cycle 7 complete. Both coupled
backlog items (Node 24 pin + CI-on-Node-24) close `[/]` → `[x]`.
