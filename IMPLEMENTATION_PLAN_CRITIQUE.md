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

---

## Implementation Verification — v23

**Plan:** `IMPLEMENTATION_PLAN.md` v30 (Cycle 17) @ approved commit `bd9af4e` (approved score 96/100)
**Code:** `master` @ implementation commit `a845f70` ("feat(cycle-17): add iOS scroll evidence and artifact guard"), audited 2026-09-03
**Implementation Score:** **90 / 100** — **below the ≥95 gate → State 3 (FIX THE IMPLEMENTATION)**

Cycle 17 landed the full §5 file manifest and every _literal_ plan acceptance criterion passes (skip
exits 0, required-without-tooling fails closed, mocked-pass normalizes, guard blocks empty critiques,
docs stay honest). But this is the **first environment with a real iOS 26.4 Simulator**, so for the
first time the automated lane was exercised end-to-end against a device — and it exposed one
**execution-proven blocking defect (D1):** the probe URL never reaches the XCUITest runner, so the
automated iOS lane **cannot produce `status:"passed"`** — the exact deliverable the cycle exists to
enable. The score is 90 (not a clean ≥95 VERIFIED) for that reason, and not lower because everything
else is faithful and green.

### Independently reproduced this cycle (trust nothing)

- `node --test tests/unit/*.test.mjs` → **98/98 pass** (was 85; +13: 8 iOS-smoke preflight/normalize/write, 5 cycle-artifacts guard).
- `npx playwright test` → **15/15 pass**.
- `node scripts/build.mjs` ×2 → deterministic SHA `15d6647afdf4`, **26898 gzip bytes** (well under budget).
- `npx prettier --check` on all git-tracked files → clean (only the untracked `Claude outputs/` scratch dir warns — `git ls-files "Claude outputs/"` = empty).
- `npm run check:cycle-artifacts` → **exit 0** with the (now non-empty) critique; `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1 …` → exit 0 + intentional-window warning; whitespace-only/zero-byte/missing critique → nonzero (unit-proven).
- `node scripts/ios-scroll-smoke.mjs` (non-required, stale default device) → `SKIPPED …`, **exit 0**, writes `status:"skipped"`, `code:"missing_device"`, `stage:"preflight"`.
- `CHECKIN007_IOS_SCROLL_REQUIRED=1 node scripts/ios-scroll-smoke.mjs` (stale default device) → **exit 1**, `status:"failed"`. Fail-closed contract intact.
- **Real simulator run** — `CHECKIN007_IOS_DEVICE='iPad (A16)' CHECKIN007_IOS_RUNTIME='iOS' CHECKIN007_IOS_SCROLL_REQUIRED=1 node scripts/ios-scroll-smoke.mjs`: preflight passed, kiosk built, HTTPS server started (`https://127.0.0.1:58218/check-in-007.15d6647afdf4.html?scrollProbe=1`), `xcodebuild test` launched → **exit 65**, wrapper wrote `status:"failed"`, `stage:"xcodebuild"`, bounded error, and exited nonzero. **The error truncated at exactly the 2000-char `IOS_SCROLL_ERROR_LIMIT` — the redaction cap works in practice.**
- Root cause isolated: `xcodebuild build-for-testing … -destination "…iPad (A16)"` → **`** TEST BUILD SUCCEEDED **`** (native project compiles). The `.xcresult` shows the _test_ failed at `WebRosterScrollUITests.swift:15: XCTUnwrap failed … CHECKIN007_IOS_PROBE_URL must point to the hashed kiosk artifact` — i.e. the probe URL was **nil inside the test runner** (see D1).

### §-by-§ Plan Compliance

| Section | Status | Notes |
|---------|--------|-------|
| §4.1 / Phase 1 — preflight + structured evidence | **PARTIAL (blocking, D1)** | `preflightIosRunner`, `normalizeIosScrollResult`, `writeIosScrollResult` all present and correct; skip/fail/mocked-pass paths work; JSON schema matches §4.2. **But the real pass path is unreachable** — the probe URL is passed only in the `xcodebuild` process env (`ios-scroll-smoke.mjs:246`) and never arrives in the XCUITest runner (needs `TEST_RUNNER_` prefix). Proven by the simulator run. |
| §4.2 — single JSON evidence | COMPLIANT | Writes `test-results/ios-scroll-result.json` with all §4.2 fields; `test-results/` gitignored; trailing newline; parent dirs created. |
| §4.3 — preflight classification | COMPLIANT | Classifies `missing_xcrun` / `missing_xcodebuild` / `missing_runtime` / `missing_device` in order, each with `requiredAction`; 10 s timeouts (§9). Unit-proven and reproduced live. |
| §4.4 — cycle-artifact guard + override | COMPLIANT | `scripts/check-cycle-artifacts.mjs` fails on missing/zero/whitespace plan/audit/backlog, and on empty critique unless `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1` (warns); never writes. Wired to `npm run check:cycle-artifacts`. |
| §5 / Phase 2 — CI wiring | COMPLIANT | `ci.yml:31-32` runs the guard after `npm ci`, before lint/test/build (§6 Phase 2.3). `ios-scroll.yml` uploads both `ios-scroll-result.json` + `ios-scroll.xcresult` with `if: always()`. |
| §5 / Phase 3 — tests | COMPLIANT | `tests/unit/ios-scroll-smoke.test.mjs` (+8) and `tests/unit/cycle-artifacts.test.mjs` (+5); existing suites unchanged; `IOS_SCROLL_ERROR_LIMIT` asserted (Path-to-100 #3 folded in). |
| §5 / Phase 4 — docs & evidence | COMPLIANT | `docs/IOS_SCROLL_RUNBOOK.md` (states the automated lane is simulator-or-external-URL only — Path-to-100 #2 folded in); `docs/IPAD_SCROLL_BUG.md` keeps status OPEN/unverified + runbook link; `docs/VERIFICATION_EVIDENCE.md` Cycle-17 section leaves the device PASS **blank**; README pointer added. |
| §5 — no `src/`/`native/` drift | COMPLIANT | `git show --stat a845f70` touches **0** `src/` and **0** `native/` files. Production kiosk & XCTest unchanged. |
| Phase 5 — verification gates | PARTIAL (env) | Local non-iOS gates green; the composed `npm run lint` chain can't run end-to-end here (Node-24 guard fails closed on Node 26 — same env-blocked precedent as v20/v22); required iOS PASS not produced (see D1). |

### Regression check

No regression in shipped gates: unit **grew** 85→98, e2e 15/15, deterministic build byte-identical, prettier clean, no `src/`/`native/` change. The one benign behavior change (writing `ios-scroll-result.json` on skip) is plan-intended and gitignored. **D1 is a latent defect surfaced, not a fresh regression** — the plain-env probe passing dates to Cycle 15 `85854be` and was simply never exercised until a real simulator existed; Cycle 17 preserved it while re-blessing this lane as the RA #14 evidence mechanism.

### Defects

**D1 (BLOCKING, P1) — the automated iOS lane can never emit `status:"passed"`; the probe URL never reaches the XCUITest runner.**
`runIosScrollSmoke` passes `CHECKIN007_IOS_PROBE_URL` (and `CHECKIN007_ALLOW_SELF_SIGNED_HTTPS`) in the **`xcodebuild` subprocess environment** (`scripts/ios-scroll-smoke.mjs:244-252`). Xcode does **not** forward a plain command-process env var into the test-runner process; `WebRosterScrollUITests.swift:16` reads `ProcessInfo.processInfo.environment["CHECKIN007_IOS_PROBE_URL"]` inside the runner, gets **nil**, and `XCTUnwrap` fails (`WebRosterScrollUITests.swift:15`) → `xcodebuild test` exit 65 → `status:"failed"`, `stage:"xcodebuild"`. **Consequence:** the plan's headline command (`CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll`, §11 / Phase 5.7) fails at unwrap **regardless of scroll behavior**, so a real PASS — the artifact §4.1 promises to "convert a future device run into" — is unreachable. This violates the plan's core intent (§1, §4.1) even though every _literal_ Phase-1 acceptance bullet (which only exercises skip/fail/**mocked**-pass) still passes.
**Fix (code, wrapper-only — do NOT revise the plan, do NOT edit the XCTest):** inject the vars through Xcode's test-runner mechanism, e.g. pass `TEST_RUNNER_CHECKIN007_IOS_PROBE_URL` / `TEST_RUNNER_CHECKIN007_ALLOW_SELF_SIGNED_HTTPS` (Xcode strips the `TEST_RUNNER_` prefix inside the runner's `ProcessInfo.environment`), or add a test plan / `-testLaunchEnvironmentVariable` entry. Then add a focused assertion that the launch env actually carries the probe URL so the mocked-pass test stops masking the gap.
**Acceptance:** on a machine with the iOS 26.4 Simulator, `CHECKIN007_IOS_DEVICE='iPad (A16)' CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll` reaches the drag/oracle assertion (no XCTUnwrap-nil), and either writes `status:"passed"` or fails on the _scroll_ oracle — not on a missing env var.

**N1 (non-blocking nit) — stale default device.** The hardcoded default `iPad Pro 13-inch (M4)` (`ios-scroll-smoke.mjs:122,166`) matches the plan's §13 Q1 default, but no `M4` 13-inch iPad is installed here (the runtime ships `M5`); out-of-box `npm run test:ios-scroll` skips even on a machine that _has_ iPad simulators. Spec-faithful, overridable via `CHECKIN007_IOS_DEVICE`, so not a defect — but worth refreshing the default (or documenting device discovery) when D1 is fixed.

### Why 90 and not ≥95

Everything the plan _literally_ enumerated is implemented and green (that floor is why it's 90, not lower). It sits below the gate because the cycle titled "iPad Scroll Verification" ships a verification lane that, when finally run against a real simulator, **cannot verify** — D1 makes the automated PASS path unreachable. That is a "fix your code" item, not a plan revision.

### Path to ≥95 (State 3 — fix the implementation)

1. Fix **D1**: route `CHECKIN007_IOS_PROBE_URL` / `CHECKIN007_ALLOW_SELF_SIGNED_HTTPS` into the test-runner process (`TEST_RUNNER_` prefix or test plan) and add a launch-env assertion so the gap can't reappear unnoticed.

### Path to 100 (after D1)

2. Refresh the stale default device (N1) or add `xcrun simctl`-based device discovery so the default resolves to an installed iPad.
3. Reconcile the CI guard vs. the pre-critique plan commit (plan Path-to-100 #1 / open backlog item): scope `check:cycle-artifacts` in CI to PRs / default-branch pushes, or exempt commits whose only change is `IMPLEMENTATION_PLAN.md`.
4. Once a real `status:"passed"` JSON exists from an iPad/iOS Simulator, record it in `docs/IPAD_SCROLL_BUG.md` + `docs/VERIFICATION_EVIDENCE.md` to move RA #14 toward RESOLVED.

### Summary

Faithful, well-tested execution of the plan's letter — 98/98 unit, 15/15 e2e, deterministic build,
working guard (RA #16 durably fixed), honest docs, zero `src/`/`native/` drift. But the first real
simulator run proved the automated iOS lane can never emit a PASS (D1: probe URL never reaches the
XCUITest runner). **Implementation Score 90/100 — below the ≥95 gate → State 3.** Fix D1 in the
wrapper (not the plan, not the XCTest), then resubmit. RA #14 stays unresolved; RA #10 stays external.
