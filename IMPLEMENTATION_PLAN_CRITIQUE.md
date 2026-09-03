# Check-In 007 — Implementation Plan Critique (Cycle 17)

## Plan Critique — Cycle 17, Rev 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `bd9af4e`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v30 (Cycle 17)
**Score:** **96 / 100** (first review this cycle)
**Status:** APPROVED (≥95 gate cleared)

Plan v30 opens Cycle 17 to harden the RA #14 iPad-scroll **verification lane** (structured
JSON evidence + preflight classification) and to durably fix RA #16 (the recurring empty root
critique) with a repo-local `check-cycle-artifacts` guard wired into CI. It deliberately makes
**no** speculative scroll/CSS/DOM changes, honoring the v62 directive. The plan is specific,
source-grounded, correctly scoped to the two code-actionable open findings, and
implementation-ready.

### Factual claims verified against the live tree (trust nothing)

- `scripts/ios-scroll-smoke.mjs:56` `runIosScrollSmoke(...)` exists and today collapses several
  unavailable states into skip strings (`:67-78`) — §4.3's "not diagnostic enough" premise is
  accurate. `run()` is a module-local helper (`:9`), not yet injectable — Phase 1.1's refactor
  need is real. `build()` (`:80`) and `startServer(...)` (`:86`) are used as described.
- `package.json:14` `lint = check-node-version && prettier --check .`; there is **no**
  `check:cycle-artifacts` script yet (§5/§7.3 additions accurate). `.github/workflows/ci.yml`
  runs lint→unit→e2e→build (`:31-51`) — the guard step slots in "after install, before
  lint/test/build" as §6 Phase 2.3 states.
- `.github/workflows/ios-scroll.yml:41-46` uploads **only** `test-results/ios-scroll.xcresult`
  on failure; §7.2's `ios-scroll-result.json` upload is a genuine additive gap.
- `.gitignore` already lists `test-results/` — the §4.2 "should remain ignored/untracked"
  tradeoff is **already satisfied** by existing config (the plan does not cite this, a minor
  specificity miss, not a defect).
- `.prettierignore` already excludes the four canonical MD files and `test-results/`, so the
  guard's own JSON/docs will not trip the lint gate.
- Baseline reproduced green this cycle: `node --test tests/unit/*.test.mjs` → **85/85**;
  `npx playwright test` → **15/15**; `node scripts/build.mjs` ×1 → deterministic
  `15d6647afdf4` (26898 gzip bytes); `npx prettier --check .` clean on all tracked files
  (only the untracked `Claude outputs/` scratch dir warns).

### Scope Check — passes (no cap)

- **RA #14 (P0/HIGH, `BLOCKED env/device`)** — addressed at the correct altitude: the plan
  improves auditability and fail-closed evidence and explicitly refuses to mark it resolved
  without a real `status:"passed"` JSON from an iPad/iOS Simulator (§2 Out of scope; §13 Q2).
- **RA #16 (P3, empty-critique recurrence)** — addressed by the `check-cycle-artifacts` guard +
  CI wiring + unit tests. This is the smallest durable enforcement point.
- **RA #10 (P2, external billing)** — correctly declared out of scope (§2), non-code-actionable.
- **Backlog** — fully closed (0 unchecked `- [ ]`), so there is no backlog item to fold in.
- Alternatives are genuinely evaluated for every non-trivial decision (§4.1–4.4: Playwright-WebKit,
  manual-only, JUnit XML, git hooks, auto-generated critique, all rejected with reasons).
  Integration points enumerated (§7). No scope cap applies.

### Flaws of Commission

1. **CI guard reddens the very new-cycle/plan commit it is meant to police (unreconciled).**
   §7.3 runs `check:cycle-artifacts` in CI **without** the `CHECKIN007_ALLOW_EMPTY_CRITIQUE`
   override, and the generator's new-cycle commit (e.g. this `bd9af4e`) necessarily lands with a
   0-byte critique *before* the discriminator scores. If CI runs on that commit, the guard fails
   — by design it surfaces RA #16, but the plan only offers a **local** override, not a CI-side
   reconciliation, so the normal loop produces a red CI window on every plan commit until the
   critique lands. This is a deliberate trade-off the plan half-acknowledges (§13 Q3) but does
   not fully resolve (e.g. scope the guard to `push`-to-default / PR only, or exempt commits whose
   *sole* change is `IMPLEMENTATION_PLAN.md`). Non-blocking here because (a) RA #10 currently
   blocks live CI anyway and (b) the discriminator restores the critique in the same review that
   approves this plan, so by the time the guard lands the critique is non-empty. Worth resolving
   in implementation or a follow-up. No other flaws of commission identified.

### Flaws of Omission

1. **Real *physical* iPad automated destination is undesigned.** `destinationFor()`
   (`ios-scroll-smoke.mjs:46`) hardcodes `platform=iOS Simulator,name=…`, and §4.3 preflight keys
   on `xcrun simctl list devices available` — both simulator-only. A USB-attached iPad
   (`platform=iOS,id=…`) is not listed by `simctl` and cannot be driven by the automated path;
   the plan routes real devices to the **manual** fallback checklist (§6 Phase 4.1) and the
   external `CHECKIN007_IOS_BASE_URL` path only. Acceptable, but the plan should state explicitly
   that the *automated* lane is simulator-or-external-URL only, so "real iPad" is understood to be
   manual-evidence.
2. **Error-redaction bound is described but not pinned.** §4.2/§9 say error strings are "bounded"
   and the JSON is "normally below 5 KB," but no exact byte/char cap constant is specified for
   `normalizeIosScrollResult`'s redaction. A concrete cap (e.g. 2000 chars) would make the
   docs-safe guarantee testable rather than aspirational.
3. **Guard invocation cwd/root behavior is implicit.** `readCycleArtifactSizes(root = process.cwd())`
   assumes it runs from repo root; the plan does not state behavior when invoked from a
   subdirectory or how CI guarantees the cwd. Minor — CI checks out to the repo root — but worth a
   sentence.

### Regressions

- None identified, **conditional on faithful implementation.** The plan repeatedly pins the
  fail-closed contract (Phase 1.3/1.5, §6 acceptance, §8) and mandates existing unit/e2e/build
  stay green (§10). One benign behavior change: on a machine without iOS tooling,
  `npm run test:ios-scroll` will now *write* `test-results/ios-scroll-result.json` on skip where
  it previously wrote nothing — intended, ignored by `.gitignore`, not a regression. No public
  runtime/kiosk code changes (§5: "No `src/` runtime code … should change").

### Why 96 and not 97

Three minor omission nits (real-device automated destination undesigned; error-bound not pinned
to a constant; guard cwd/root implicit) plus the one unreconciled commission trade-off (CI guard
reddening the plan commit). None blocks implementation — the contracts are concrete, the scope is
correct, and the fail-closed/evidence design is sound — but each is a genuine gap between "ready"
and "airtight."

### Path to ≥95

Already cleared (96). No blocking items.

### Path to 100

1. Reconcile the CI guard vs. the pre-critique plan commit: scope the CI check to PRs / pushes to
   the default branch, or exempt commits whose only change is `IMPLEMENTATION_PLAN.md`, so the guard
   surfaces genuine drift without reddening every routine plan commit.
2. State explicitly that the automated iOS lane is **simulator-or-external-base-URL only**; route
   physical-iPad verification to the manual checklist and say so in §4.3/§6 Phase 4.
3. Pin the error-redaction cap to a named constant and assert it in
   `tests/unit/ios-scroll-smoke.test.mjs`.
4. Specify guard cwd/root resolution (or make `readCycleArtifactSizes` resolve the repo root
   explicitly) and note the CI working directory.
5. Cite the existing `.gitignore` `test-results/` entry in §4.2 so the "stays untracked" tradeoff
   is grounded in current config rather than asserted.

### Summary

Approval-grade on first review. Plan v30 is a disciplined, correctly-scoped verification-and-guard
cycle that improves RA #14 auditability and durably attacks RA #16 without touching production or
scroll code. **APPROVED at 96/100** — implement Phases 1–5, then submit for Implementation
Verification. Do **not** mark RA #14 resolved without a real iPad/iOS Simulator `status:"passed"`
JSON; do not fold the CI guard past the empty-critique window without addressing Path-to-100 #1.
