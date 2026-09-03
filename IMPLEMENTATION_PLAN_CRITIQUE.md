# External Execution Closure Plan Critique — Cycle 11, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `d8a9949`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v23 (Cycle 11 — External Execution Closure)
**Score:** **96 / 100** (previous: Cycle 10 plan v22 Rev 2 = 97; this is a new plan → first review of v23)
**Status:** APPROVED (clears the ≥95 gate)

Plan v23 is a tightly-specified execution runbook that converts Audit v37's two standing,
environment-gated Next Steps (native `xcodebuild test` never run; committed `CI` workflow never
observed live) from *documented-as-blocked* into *proven-PASS-or-explicitly-pending*. Every
load-bearing factual claim was re-verified against the live tree and holds. It is
implementation-ready for any operator with the two required authorizations. The single genuine gap
is a process one: the plan defines no bounded terminal disposition if authorization is declined,
leaving the loop in an unbounded "pending" state.

## Issues resolved in revision 1

First review of v23 — no prior revision of this plan. (Plan v22, the previous cycle's artifact,
was a *docs-only* evidence-capture plan; v23 is a distinct execution plan and is critiqued fresh.)

## Ground-truth verification (all claims confirmed)

Every quantitative and environmental claim in the plan was checked against the repository:

1. **Native test inventory exact.** `native/CheckIn007Tests/` = exactly the six named suites
   (`CSVCodecTests`, `CameraPrivacyTests`, `CheckInStoreTests`, `GuestCatalogTests`,
   `LogMergerTests`, `ScanAudioPlayerTests`). `grep -c 'func test'` = 6+3+8+6+5+4 = **32** unit
   methods; `CheckIn007UITests.swift` = **4** UI tests. §6 Phase 1 step 5, §10, §14 all agree.
2. **CI workflow matches.** `.github/workflows/ci.yml` triggers on `push: branches: [main, master]`
   and `pull_request`; the `web` job's artifact step uploads `name: dist-index-html`,
   `path: dist/index.html`, `if-no-files-found: error`. §4.6 / §6 Phase 2 / §7.4 accurate.
3. **Environment §11 accurate.** `git remote -v` = none; branch = `master`; `node --version` =
   v26.3.0; `.nvmrc` = 24.20.0; `xcrun simctl list runtimes` = empty. All match §11 verbatim.
4. **Scripts match §5/§6.** `package.json` scripts confirm the guarded chain
   (`check-node-version.mjs && …`) and the direct-tool bypass commands the plan lists.
5. **Evidence-doc target coherent.** `docs/VERIFICATION_EVIDENCE.md` records Cycle-10 target
   `628a4be…` (Native + CI both `BLOCKED`), so §4.5's decision to mint a *new* Cycle-11 target
   rather than republish the ancestor is justified and consistent.
6. **Perf math checks out.** §9's "at most 121 queries" = 1800s/15s + 1 initial ✓; "36 methods
   total" = 32 unit + 4 UI ✓; artifact "about 71 KB" vs measured `dist/index.html` = 70,584 bytes ✓.

## Remaining issues

1. **No bounded disposition on declined authorization (primary gap).** §4.1 and §13 make operator
   approval of (a) `xcodebuild -downloadPlatform iOS` and (b) the exact GitHub `owner/repo` + push
   hard pre-implementation gates, and §14 states that absent approval "leaves Cycle 11 pending for a
   later authorized attempt." Given the audit history and the recorded environment
   (`native-ios-sdk-not-installed`; no Git remote across every prior cycle), a declined/absent
   approval is the *likely* branch, and the plan leaves the loop in an **unbounded pending State 2**
   with no exit. The plan should specify a terminal disposition for the refusal branch — e.g. "if
   either authorization is declined, this plan is *withdrawn* and the two gaps are re-classified as
   permanently environment-blocked Next Steps (not cycle-blocking), allowing the audit to reach a
   stable state" — so the project is never stuck implementing a plan that cannot be implemented.
   *Why it matters:* without it, an honest implementer who is refused authorization has no
   plan-sanctioned action except to wait indefinitely. (Non-blocking for the execution path; this is
   what holds the score below 98.)

2. **§4.6 vs §6 Phase 2 step 5 required-step list disagree.** §4.6 requires "every non-conditional
   web-gate step to succeed," but the Phase-2 step-5 enumeration (checkout, Node setup, install,
   lint, unit, browser install, e2e, build, artifact-upload) omits the non-conditional
   **"Cache Playwright browsers"** (`actions/cache@v4`) step present in `ci.yml`. The two lists
   should agree — either add the cache step to the enumeration or state that the §4.6 blanket rule
   governs and the enumeration is illustrative. *Why it matters:* a literal implementer following
   step 5 could accept a run where the cache step errored.

3. **Trigger event not pinned in Phase 2 selection.** The workflow fires on both `push` and
   `pull_request`. §6 Phase 2 step 4 selects by "matching repository, event, branch, and headSha"
   and §10 references the "expected event," but neither pins the event to **`push`** for the normal
   target-branch publication. Naming it removes any ambiguity if a `pull_request` run also shares
   the headSha. *Why it matters:* minor, but eliminates a same-SHA cross-event mis-join.

## Scope Check

- **Audit findings:** Audit v37 has **zero open Required Actions** (RA #1–#8 all DONE, none stalled).
  The only open items are two environment-gated **Next Steps**, and v23 targets **exactly** those
  two and only those. No in-scope finding is ignored.
- **Backlog:** `BACKLOG.md` has **0 unchecked `[ ]`** items (all `[x]`). Nothing in scope is skipped.
- **Integration points:** §7 specifies five integration contracts (git tree→evidence,
  Xcode→simulator, local git→GitHub, CI→artifact, evidence→readers) with failure/recovery for each.
  Cross-cutting concerns (branch protection, CI cancel-in-progress per ref, credential redaction) are
  addressed.
- **Alternatives considered:** §4.2 (platform download vs runtime-copy), §4.3 (UDID-addressed vs
  fixed marketing name), §4.5 (new target vs republish ancestor), §4.7 (existing tools vs wrapper),
  §13 (Node-24 host install vs audited direct path). Tradeoffs are stated.

**No score cap applies** — scope is exactly adequate for the phase.

## Flaws of Commission

1. Minor internal-consistency defect between §4.6 and §6 Phase 2 step 5 (see Remaining issue #2).
   No incorrect algorithm, wrong version, broken logic, or antipattern identified. The
   xcodebuild invocation, UDID-selection determinism, poll cadence, and triple byte/size/SHA-256
   parity check are all correct.

## Flaws of Omission

1. No bounded disposition on declined authorization (Remaining issue #1) — the significant omission.
2. Event not pinned to `push` in Phase-2 run selection (Remaining issue #3).
3. The artifact step's `if: always()` semantics are not discussed — the upload runs even after an
   earlier failure. This is *safe* in practice (a failed `build` leaves no `dist/index.html`, so
   `if-no-files-found: error` fails the upload and the gate catches it), but the plan never states
   this reasoning. Cosmetic.

## Regressions

No regressions identified. The manifest (§5) is docs-only — `IMPLEMENTATION_PLAN.md`,
`docs/VERIFICATION_EVIDENCE.md`, `README.md` — and §2 forbids product, test, Xcode-project,
workflow, dependency, lockfile, and `dist/` changes. `BLOCKED`→`PASS` flips happen only after success.
No test coverage shrinks; no API/config/contract changes.

## Why 96 and not 97

The execution path itself is 97–98-grade: exhaustive, source-accurate, well-bounded. The score is
held at 96 by the **process omission** (Remaining issue #1): a plan whose completion is entirely
contingent on external authorization must define what happens when that authorization is *not*
granted, so the loop cannot enter an unbounded pending state. The two consistency nits (#2, #3) are
minor. This is a solid, approvable plan — not an excellent one — because the most probable execution
branch (refusal, per all prior cycles) is the one left undefined.

## Path to ≥95

Already cleared (96). No blocking items.

## Path to 100

1. **Define the refusal disposition (issue #1).** Add to §4.1 / §13 / §14 a bounded terminal state:
   if either authorization is declined or infrastructure is unavailable, *withdraw* this plan and
   re-classify the two gaps as permanently environment-blocked (audit-closeable) rather than leaving
   Cycle 11 pending indefinitely. This is the single highest-value improvement.
2. **Reconcile the required-step lists (issue #2).** Make §6 Phase 2 step 5 enumerate the same set
   as §4.6, including the `actions/cache` "Cache Playwright browsers" step, or explicitly subordinate
   the enumeration to the "every non-conditional step" rule.
3. **Pin the run event to `push` (issue #3)** in Phase 2 step 4's selection predicate.
4. **State the `if: always()` artifact-upload reasoning (omission #3)** so a reader understands why
   an always-run upload is still a valid success gate.
5. **Micro-precision:** express the artifact size as the exact 70,584 bytes rather than "about 71 KB"
   in §9, matching the recorded evidence.

## Summary

Plan v23 is approval-grade (96/100): a precise, ground-truth-accurate, well-bounded execution runbook
that targets exactly the two open external-verification gaps with no scope gaps and no regressions.
It clears the ≥95 gate and becomes the contract for implementation. The loop advances **State 1 →
State 2 — implement approved plan v23**, with the hard understanding that implementation is gated on
two operator authorizations; if those are refused, the plan should be revised to add a bounded
withdrawal disposition (Path-to-100 #1) rather than being left pending indefinitely. Implementation
Score is **N/A** — nothing is built yet (no new Cycle-11 target commit, evidence still `BLOCKED`,
README not yet finalized, §14 boxes unchecked).

---

### Implementation Verification — v2

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` @ HEAD `8f285fc` audited on 2026-09-03

**Verdict: NOT STARTED.** No implementation of approved plan v23 exists. HEAD (`8f285fc`) is the
Rev-1 *critique* commit; the only commits after the plan landed (`d8a9949`) are documentation
(the critique + audit v38). No Cycle-11 target commit was minted, and the three manifest files are
untouched relative to their Cycle-10 state. This is not a defective implementation to be scored —
it is an **unstarted** one. Implementation Score is therefore **N/A**, and the cycle remains in
**State 2 (implement the approved plan)** — but see the disposition below: State 2 cannot be
advanced in the current environment.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **MISSING** | No approval obtained/recorded; no Cycle-11 evidence placeholder appended; no docs-only target commit minted. No Phase-0 preflight/inventory recorded. |
| §6 Phase 1 — Native iPad execution | **MISSING** | `xcodebuild -downloadPlatform iOS` not run; `xcrun simctl list runtimes` still empty (`native-ios-sdk-not-installed`); no `.xcresult`, no recorded counts/exit. |
| §6 Phase 2 — Exact-SHA CI execution | **MISSING** | `git remote -v` = none; no push; no `CI` run selected/observed; no `dist-index-html` artifact parity check. |
| §6 Phase 3 — Finalize evidence | **MISSING** | `docs/VERIFICATION_EVIDENCE.md` unchanged — Native `BLOCKED`, CI `BLOCKED` (Cycle-10 records; **no Cycle-11 section**, `grep -c "Cycle 11"` = 0). README status unchanged. |
| §5 File Manifest | **UNTOUCHED** | `IMPLEMENTATION_PLAN.md` / `docs/VERIFICATION_EVIDENCE.md` / `README.md` all at their Cycle-10 state; no diff. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`. Both blocking authorization gates (§13 Q1–Q2) unsatisfied. |

#### Blocking condition (why State 2 cannot advance here)

Plan v23 makes two operator authorizations **hard pre-implementation gates** (§4.1, §6 Phase 0.2–0.3,
§13 Q1–Q2): (a) `xcodebuild -downloadPlatform iOS`, and (b) an exact GitHub `owner/repo` + push route.
Neither is obtainable in this environment: no iOS runtime is installed (`native-ios-sdk-not-installed`;
`simctl list runtimes` empty), no Git remote exists across every prior cycle, and this is a
non-interactive session that cannot run an approval exchange. Per §14, absent approval "leaves Cycle 11
pending" — which is exactly the **unbounded pending State 2** the Rev-1 critique flagged as its primary
gap (Remaining issue #1 / Path-to-100 #1). No source edit is warranted (§2 forbids weakening the gates
or accepting `BLOCKED` as completion), and the base tree is verified unchanged (native inventory still
six suites / **32** methods / **4** UI, matching §6 Phase 1 step 5).

#### Directive (State 2 → State 1: revise the plan)

This is **not** a "fix your code" situation — there is no code to fix and the plan forbids fabricating a
pass. The single sanctioned action is to **revise plan v23 to add a bounded terminal disposition for
the declined/unavailable-authorization branch** (Path-to-100 #1): if either authorization is declined or
the infrastructure is unavailable, *withdraw* the plan and re-classify the two external gaps as
permanently environment-blocked, audit-closeable Next Steps — rather than leaving the loop implementing a
plan that cannot be implemented in this environment. Reconciling the §4.6 ↔ §6 Phase 2 step-5 required-step
list (Path-to-100 #2) and pinning the run event to `push` (Path-to-100 #3) can fold into the same revision.
Alternatively, if the operator *does* supply both exact authorizations, implement Phases 0–3 verbatim.

**Implementation Score:** N/A

---

### Implementation Verification — v3

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` @ HEAD `736fc85` audited on 2026-09-03

**Verdict: NOT STARTED (unchanged from v2).** No implementation of approved plan v23 exists, and
**nothing has changed since Implementation Verification v2.** HEAD is still `736fc85` — the audit-v39
commit; there are **zero new commits** since that audit. The re-verified tree is byte-for-byte identical
to what v2 audited:

- **No Cycle-11 target commit.** `docs/VERIFICATION_EVIDENCE.md` still carries only the Cycle-10 records
  (Local Web Gates `PASS`, Native `BLOCKED`, CI `BLOCKED`); `grep -c "Cycle 11" docs/VERIFICATION_EVIDENCE.md`
  = **0**. README status unchanged.
- **All 6 §14 completion boxes `[ ]`.** The three manifest files show no diff vs. their Cycle-10 state.
- **Both hard pre-implementation gates still unsatisfiable here.** `xcrun simctl list runtimes` = empty
  (`native-ios-sdk-not-installed`); `git remote -v` = none; this remains a non-interactive session that
  cannot run the two §13 Q1–Q2 authorization exchanges.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **MISSING** | No approval obtained/recorded; no Cycle-11 evidence placeholder; no docs-only target commit; no Phase-0 preflight/inventory. |
| §6 Phase 1 — Native iPad execution | **MISSING** | `xcodebuild -downloadPlatform iOS` not run; `simctl list runtimes` still empty; no `.xcresult`, no recorded counts/exit. |
| §6 Phase 2 — Exact-SHA CI execution | **MISSING** | `git remote -v` = none; no push; no `CI` run observed; no `dist-index-html` parity check. |
| §6 Phase 3 — Finalize evidence | **MISSING** | `docs/VERIFICATION_EVIDENCE.md` unchanged (Native `BLOCKED`, CI `BLOCKED`; no Cycle-11 section). README unchanged. |
| §5 File Manifest | **UNTOUCHED** | All three manifest files at Cycle-10 state; no diff. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`; both §13 Q1–Q2 authorization gates unsatisfied. |

#### Directive (unchanged — State 2 cannot advance here; revise the plan)

This remains a **not-yet-implemented, environment-blocked** cycle, not a defective one — there is no code
to fix, and §2 forbids fabricating a `PASS` or weakening the gates. Implementation Score stays **N/A**.
The single sanctioned lever is still to **revise plan v23 to add a bounded terminal disposition for the
declined/unavailable-authorization branch** (Rev-1 critique Path-to-100 #1): if either authorization is
declined or the infrastructure is unavailable, *withdraw* the plan and re-classify the two external gaps
as permanently environment-blocked, audit-closeable Next Steps — rather than leaving the loop implementing
a plan that cannot be implemented here. Fold in Path-to-100 #2 (§4.6 ↔ §6 Phase 2 step-5 required-step
reconciliation) and #3 (pin the CI run event to `push`) in the same revision. Alternatively, if the
operator supplies both exact authorizations, implement Phases 0–3 verbatim. A **third** consecutive idle
cycle has now elapsed with no work product; the inactivity decay has advanced to −3 (see Audit v40).

**Implementation Score:** N/A
