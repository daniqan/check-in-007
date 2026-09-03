# Cycle Artifact Guard CI Reconciliation Plan Critique — Cycle 18, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `713aac6`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v31 (Cycle 18)
**Score:** **74 / 100** (previous: v30 = 96 APPROVED — this is the first review of the new v31 plan)
**Status:** **NOT APPROVED** — scope-adequacy cap applied (ignores open P0/P1 audit findings)

Plan v31 is a well-constructed, source-grounded process-hardening plan for one backlog item (reconcile the CI `check-cycle-artifacts` guard with the pre-critique planning window). Judged purely on internal quality it would score ~96. But it is **capped at 75** because it explicitly declines the two open findings — **RA #14 (P0/HIGH, device-evidenced FAILING)** and **RA #19 (P1/HIGH)** — that `CONSOLIDATED_AUDIT.md` v65 designated as the mandatory drivers of Cycle 18, both of which are now code-actionable in this environment (an iOS 26.4 Simulator is installed). It is further held down one point by a feasibility flaw: the plan-only allowance is too narrow to match the real new-cycle commit shape it is meant to unblock.

## Remaining issues

1. **[BLOCKING — scope inversion] The plan addresses a P3-grade backlog item while ignoring an open P0 and P1 the audit explicitly assigned to this cycle.** Audit v65 (`CONSOLIDATED_AUDIT.md`, header + RA table) states verbatim: "**Cycle 18 must** (1) root-cause genuine non-scroll … land the fix, and (2) fix the flaky harness (RA #19)." Plan v31 §2 "Out of scope" instead reads: "Implementing RA #14 iPad roster scroll fixes or RA #19 XCUITest harness hardening; those are audit findings, not the selected backlog item for this cycle." RA #14 is **P0/HIGH and device-evidenced FAILING** (run #1 dragged the roster and `scrollTop` stayed 0 at `WebRosterScrollUITests.swift:35`); RA #19 is **P1/HIGH**. Both are code-actionable here — `xcrun simctl list runtimes` shows `iOS 26.4 (26.4 - 23E244)`, the exact runtime that produced the v65 device evidence. Per the scope-adequacy gate, ignoring applicable P0/P1 audit findings caps the score at 75. **Fix:** re-target Cycle 18 at RA #14 (root-cause `.roster-screen`/list `overflow` / `-webkit-overflow-scrolling` / `touch-action` / container-height on device, land the fix, record a real `status:"passed"` JSON in `docs/IPAD_SCROLL_BUG.md`) and RA #19 (make `WebRosterScrollUITests.open()` select the keyboard-focused address field with settle+retry). The guard-polish item is legitimate but must not preempt open P0/P1 work.

2. **[Feasibility / commission] The plan-only allowance cannot unblock the commits it targets.** §4.1 defines `isPlanOnlyPlanningChange(changedFiles)` to "return true only when changedFiles is a non-empty array containing exactly `IMPLEMENTATION_PLAN.md`." But the actual new-cycle commits this plan exists to unblock are **not** plan-only: `git show --stat d8e50fb` (the Cycle-17 archive) touches `CONSOLIDATED_AUDIT.md`, `IMPLEMENTATION_PLAN_CRITIQUE.md`, and three `archive/cycle-17/*` files; `git show --stat 713aac6` (the v31 plan commit itself) touches **`IMPLEMENTATION_PLAN.md` and `BACKLOG.md`** (the generator marks the selected item `[/]` in the same commit, exactly as §5 instructs). Under the proposed classifier, both real commits still fail closed on an empty critique — the allowance never fires for the pattern it was designed for. **Fix:** widen the classifier to the real planning-commit change set (`IMPLEMENTATION_PLAN.md` plus optionally `BACKLOG.md` and `archive/**`), or split the planning commit so the plan lands in a strictly-plan-only commit — and state that split as a required generator convention in §7.4. Verify against `git show --stat` of the last three new-cycle commits.

3. **[Minor / omission] The guard is a CI gate, not a commit-time gate, so F-15 recurs regardless.** The empty-critique recurrence (F-15) just happened a **6th** time: `d8e50fb` blanked the 322-line critique to 0 bytes and it stayed empty through `713aac6`. The CI guard cannot prevent this because it runs in GitHub Actions, not as a local pre-commit hook. The plan reconciles CI's *reaction* to the empty critique but does nothing to stop the empty critique from being committed in the first place. Not blocking for this plan's stated scope, but note it: a local `pre-commit`/`pre-push` hook invoking the same guard would close the loop. (Recorded as a backlog improvement, not a defect in this plan.)

## Scope Check

- **Audit findings in scope but not addressed:** **RA #14 (P0/HIGH)** and **RA #19 (P1/HIGH)** — both explicitly assigned to Cycle 18 by audit v65, both code-actionable (simulator present), both declined in §2. **This triggers the P0/P1 scope cap (≤75).**
- **Backlog items:** the plan correctly selects the one open `[/]` backlog item (cycle-artifact guard polish). No other unchecked backlog item is in scope. ✓
- **Integration points:** §7 enumerates package.json↔CI, CI↔git history, guard↔tests, guard↔discriminator workflow. Thorough. ✓ — but see issue #2: the git-history integration is analyzed for the *wrong* change set.
- **Alternatives considered:** §4.1–4.4 genuinely evaluate and reject alternatives (remove guard, broad env override, event-scoping, commit-message parsing, GitHub-payload parsing). Strong. ✓

## Flaws of Commission

1. The `isPlanOnlyPlanningChange` exact-match-to-one-file contract is wrong for the observed commit shape (issue #2) — it will not fire on real new-cycle commits, so the feature ships inert for its primary use case.
2. No other flaws of commission — the strict-fail-closed defaults, separate CI script name, and preservation of the existing manual override are sound and correctly reasoned.

## Flaws of Omission

1. No commit-time enforcement (issue #3) — the plan hardens CI but leaves the local commit path (where F-15 actually originates) unguarded.
2. §6 Phase 3 says "set `fetch-depth: 2` or otherwise ensure the previous commit is available," but for **pull requests** the meaningful range is `base...head` (potentially many commits), not `HEAD^ HEAD`; §8 acknowledges this ("PR with many commits") yet Phase 3's concrete `fetch-depth: 2` is insufficient for that case. Pin the checkout depth (or `fetch-depth: 0`) to the range the classifier actually needs, and state it in the acceptance criteria.
3. No design for the archive commit (`d8e50fb`-style) that blanks the critique as a **separate** commit from the plan commit — if CI runs per-commit, the archive commit's empty critique is unclassifiable as plan-only. Specify whether CI evaluates the push range as a whole or per-commit.

## Regressions

No regressions identified. The plan is strictly additive to the guard (new optional parameters, new CI-only script, existing `check:cycle-artifacts` unchanged) and touches no `src/`, `dist/`, `native/`, or app-runtime files (§5). The existing 100/100 unit + 15/15 e2e + deterministic build (`15d6647afdf4`) are preserved.

## Why 74 and not 96

Purely on craft this plan is a 96 — clear architecture, honest tradeoffs, exhaustive edge-case table, real alternatives. The 22-point gap is **not** about craft: it is the scope-adequacy gate firing. A plan that polishes a P3 process nicety while two open P0/P1 findings — explicitly assigned to this very cycle and now unblocked by an installed simulator — sit untouched cannot pass, no matter how well it executes the nicety. The one further point below the 75 cap is issue #2: the allowance is inert against the real planning-commit shape, so even within its chosen scope the plan does not fully solve the problem.

## Path to ≥95

This plan cannot reach ≥95 by refining the guard work. It must change scope:

1. **Re-target Cycle 18 at RA #14 (P0) and RA #19 (P1)** — the audit-assigned drivers. Root-cause the on-device non-scroll and land the fix; produce a real `status:"passed"` JSON in `docs/IPAD_SCROLL_BUG.md`; harden `WebRosterScrollUITests.open()` (keyboard-focused field + settle/retry). Refresh the stale default device in `scripts/ios-scroll-smoke.mjs` (`iPad Pro 13-inch (M4)` → an installed line, e.g. `iPad (A16)`).
2. If the guard-polish backlog item is *also* kept in the same cycle, fix issue #2: widen `isPlanOnlyPlanningChange` to the real planning change set (or mandate a strictly-plan-only commit convention) and prove it against `git show --stat` of the last three new-cycle commits.
3. Address the PR-range checkout depth (omission #2) and the separate-archive-commit case (omission #3).

The clean path: make Cycle 18 the RA #14/#19 cycle (scoring on its own merits), and re-file the guard-polish item — corrected per issue #2 — as a later cycle once the P0/P1 are closed.

## Path to 100

If (and only if) the plan is re-scoped to the P0/P1 work and reaches approval, the guard-polish plan — when it returns — reaches 100 by: (a) a classifier proven against real multi-file planning commits; (b) a commit-time hook so F-15 cannot recur locally; (c) explicit PR-range vs per-commit CI semantics with pinned checkout depth; (d) a CI-mode dry-run test using a temporary git fixture (as §13 Q2 half-proposes) rather than injected stubs only.

## Summary

Plan v31 is a technically excellent plan aimed at the wrong target. Audit v65 assigned Cycle 18 to RA #14 (P0, device-evidenced failing, now code-actionable) and RA #19 (P1); v31 explicitly excludes both to polish a process guard, and its central allowance is additionally inert against the real planning-commit shape. **NOT APPROVED — 74/100.** Re-scope to the assigned P0/P1 findings (this environment has the iOS 26.4 Simulator to do it), then, separately, ship the corrected guard-polish item.
