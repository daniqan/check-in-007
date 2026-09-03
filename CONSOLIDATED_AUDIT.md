# Consolidated Audit — Check-In 007

<!-- score:plan 96 -->
<!-- score:implementation 96 -->
<!-- score:current 84 -->

**Current Score**: 84/100
**Audit Version:** v65
**Audited:** HEAD `c669930` on 2026-09-03. **CYCLE 17 COMPLETE (State 4) — the State-3 blocking defect (D1 / RA #18) is FIXED and execution-proven on a real iOS 26.4 Simulator. Implementation Verification v24 = 96/100 → ≥95 gate CLEARED → plan v30 VERIFIED.** Fix `c669930` injects the probe env via Xcode's `TEST_RUNNER_` mechanism (`testRunnerEnvironment()`), adds a launch-env regression assertion, and touches only `scripts/ios-scroll-smoke.mjs` + its unit test (zero `src/`/`native/` drift). Gates green: **100/100 unit** (+2), 15/15 e2e, deterministic build `15d6647afdf4`, prettier clean on tracked files, guard works, fail-closed proven. **The now-functional lane produced its first real device evidence — and it is that RA #14 does NOT pass on device:** run #1 got past the old line-15 `XCTUnwrap` all the way to `WebRosterScrollUITests.swift:35` (probe loaded reporting `scroll-probe:0`, right-edge drag ran, `scrollTop` **stayed 0** → the Cycle-15 CSS fix is now on-device-evidenced insufficient); run #2 failed differently at line 42 (flaky Safari address-bar automation → the XCUITest harness is itself nondeterministic). **RA #18 (D1) RESOLVED; RA #16 RESOLVED (guard); RA #14 (P0/HIGH) stays OPEN — no longer merely env-blocked but device-evidenced FAILING → drives the next cycle; RA #10 stays external.** Score 83 → 84 (D1 fixed + cycle complete + decay reset, tempered by the confirmed-unfixed flagship feature + newly-surfaced harness flakiness).

**Stage:** Cycle 17 **State 4 — COMPLETE** (Plan = 96 ≥ 95; Implementation = 96 ≥ 95). Next action: **open Cycle 18** to make RA #14 actually pass on device — the plan-v30 trigger ("unless a real-device failure later proves it insufficient") is now active. The next plan must (1) determine whether the roster genuinely doesn't touch-scroll (fix CSS/DOM/overflow) vs. the drag mechanics being wrong, then produce a real `status:"passed"` JSON, and (2) harden `WebRosterScrollUITests.open()` so the Safari address-bar automation is deterministic. Do **not** manufacture churn elsewhere; RA #10 stays outside the code loop.

**Plan Score:** 96/100 (v30 — Cycle 17, APPROVED)
**Implementation Score:** 96/100 (v24 — fixed in `c669930`, ≥95 gate cleared → State 4; D1/RA #18 resolved)
**Current Score**: 84/100

## Score Breakdown

**Base Score:** 84/100
- Code correctness: 9/10 — the shipped web tree is correct and deterministic (rebuild → same hash `15d6647afdf4`), and the iOS wrapper's **D1 defect is now FIXED and execution-proven**: `testRunnerEnvironment()` injects the `TEST_RUNNER_`-prefixed probe vars, so the runner reads the URL (run #1 reached the scroll oracle, not the old unwrap).
- Plan compliance: 9/10 — plan v30 is **fully implemented** across the §5 manifest; the sole State-3 blocking defect (D1) is fixed with a launch-env regression assertion; Implementation Verification v24 = 96 ≥ 95. Required iOS mode "remains explicitly blocked/unresolved," exactly the §6 Phase-5 acceptance.
- Document coherence: 9/10 — runbook + evidence docs honest (device PASS still correctly **blank** — no PASS exists), Prettier-clean on tracked files; **F-15 durably addressed** (guard blocks empty-critique recurrence).
- Testing rigor: 8/10 — 100/100 unit (+2: `testRunnerEnvironment` + a captured-launch-env assertion that closes the D1 coverage gap) + 15/15 e2e green; but the on-device lane is **not deterministic** — run #1 failed the scroll oracle, run #2 failed at flaky Safari address-bar automation (N2). Real evidentiary reliability is still gated on harness hardening.
- Safety architecture: 9/10 — fail-closed contract proven end-to-end twice (required mode exits nonzero, writes structured `failed` JSON with bounded error at the 2000-char cap); cert/traversal guards untouched.
- Monitoring & observability: 8/10 — structured `ios-scroll-result.json` evidence + preflight classification are a genuine improvement; the lane now reaches and reports the real oracle result.
- **Feature completeness: 6/10 — the iPad roster-scroll (RA #14) is STILL unverified, and the now-functional lane produced its first on-device evidence that it does NOT pass (run #1: `scrollTop` stayed 0 after the drag → the Cycle-15 CSS fix is evidenced insufficient). Honest cap — the flagship feature is proven-unfixed, not merely unverified.**
- Risk management: 8/10 — additive, clean file-level rollback; the guard adds durable RA #16 protection; no `src/`/`native/` production drift.
- Sum 66/80 → base **82.5**; credited to **84** for the durable RA #16 fix + the D1 fix that makes the RA #14 verification lane genuinely functional (real device evidence now flows).

**Deductions:**
- Required Actions: **−0** — **RA #18 (P1, D1) RESOLVED** (`c669930`, execution-proven: failure moved from the line-15 unwrap to the line-35 scroll oracle). **RA #16 (P3) RESOLVED** (guard). RA #14 (P0/HIGH) stays **OPEN** — now device-evidenced FAILING rather than merely env-blocked; it is newly actionable this cycle (the D1 fix + a booted iOS 26.4 Simulator unblocked verification), so no stall deduction, but it is the explicit driver for Cycle 18 and will accrue if ignored. RA #10 external/`BLOCKED` (−0).
- Backlog: **−0** — 1 strict-unchecked `- [ ]` item (the CI-guard/plan-commit reconciliation improvement, deferred from plan v30 Path-to-100); 1/2 rounds down → −0.
- Inactivity decay: **−0** — **reset**: `c669930` touches `scripts/`/`tests/`, ending any idle streak.
- **Final: 84 − 0 − 0 − 0 = 84/100.** Net +1 vs v64: D1 fixed + Cycle 17 complete + decay reset, tempered by the confirmed-unfixed flagship feature (RA #14) and the newly-surfaced XCUITest harness flakiness (N2).

## Findings

- **HIGH / F-20 (NEW this cycle, execution-proven — RA #14 device evidence):** the roster **does not touch-scroll on a real iOS 26.4 Simulator**. With D1 fixed, the automated lane finally reached the scroll oracle: run #1 loaded the kiosk (`WebRosterScrollUITests.swift:26` — probe reported `scroll-probe:0`), performed the right-edge press-drag `(0.92,0.78)→(0.92,0.22)`, and failed at `WebRosterScrollUITests.swift:35` because `scrollTop` **stayed 0**. This is the **first on-device evidence** and it indicates the Cycle-15 CSS transform-removal fix is **insufficient** — the plan-v30 trigger ("unless a real-device failure later proves it insufficient") is now active. A second run failed earlier at `:42` on flaky address-bar automation (see N2/F-21), so the harness must also be hardened before the oracle result is fully trustworthy. **Next cycle (Cycle 18) must** (1) determine root cause — genuine non-scroll (fix CSS/DOM/overflow, e.g. `-webkit-overflow-scrolling`, `overflow`, `touch-action`, container height) vs. drag mechanics — then produce a real `status:"passed"` JSON, and (2) fix the harness. Do NOT bundle speculative changes without on-device confirmation.
- **RESOLVED / F-19 (D1 / RA #18) — the iOS probe-env propagation defect is FIXED (execution-proven):** `c669930` adds `testRunnerEnvironment({probeUrl, allowSelfSignedHttps})` (`scripts/ios-scroll-smoke.mjs:52-65`) emitting both plain and `TEST_RUNNER_`-prefixed vars, composed into the `xcodebuild test` env (`:262-266`). Xcode strips the prefix inside the runner, so `WebRosterScrollUITests.swift:16` now reads the URL (no longer nil). Proven: run #1 progressed from the old line-15 `XCTUnwrap` failure to the line-35 scroll oracle. A new `runIosScrollSmoke` unit test captures the launched `xcodebuild test` env and asserts it carries `TEST_RUNNER_CHECKIN007_IOS_PROBE_URL`, so the gap cannot silently reappear. Implementation Verification v24 = 96 ≥ 95 → RA #18 RESOLVED.
- **MODERATE / F-21 (NEW this cycle — N2, XCUITest harness flakiness):** `WebRosterScrollUITests.open()` (`WebRosterScrollUITests.swift:38-46`) uses `safari.textFields.firstMatch`, which can bind the **inactive** `TabBarItemTitleContainer` address field instead of the keyboard-focused one; `address.typeText(url)` then fails with "Neither element nor any descendant has keyboard focus" (`:42`, run #2). The Safari-driving path is nondeterministic run-to-run. This lives in the **Cycle-15** XCTest (out of Cycle-17 scope), so it is a system finding, not a plan-v30 fidelity defect. Fold the fix into Cycle 18 (select the keyboard-focused field / add settle+retry) so the lane can reliably PASS or FAIL.
- **HIGH / F-14 (carried — CSS-fix now on-device-evidenced INSUFFICIENT; see F-20):** iPadOS roster touch-momentum scroll. The Cycle-15 CSS fix is landed (`.roster-screen { transform: none }`, base `.screen` no longer transforms — `src/styles.css:66-86,158-161`), web gates green, but per `docs/IPAD_SCROLL_BUG.md` it may NOT be marked verified on desktop/CI alone. This cycle the lane finally ran on a real iOS 26.4 Simulator and the roster **did not scroll** (F-20). RA #14 stays **OPEN** — it is no longer merely env-blocked; there is now positive device evidence it does not pass, so the fix must be revisited. A real `status:"passed"` JSON is still required to close it. Feature completeness stays 6/10 → this is why system health is 84, not higher.
- **RESOLVED / F-15 (empty-critique recurrence) — durably fixed:** the recurring 0-byte `IMPLEMENTATION_PLAN_CRITIQUE.md` (5×: v53/v56/v57/v60/v63) is now guarded. `scripts/check-cycle-artifacts.mjs` + `npm run check:cycle-artifacts` + the `ci.yml` step (before lint/test/build) fail when the plan is non-empty but the critique is missing/zero/whitespace-only, with the narrow `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1` planning-window escape hatch. Execution-verified this cycle (guard exit 0 on the restored critique; unit-proven failure on empty/whitespace/missing). RA #16 RESOLVED.
- **RESOLVED / F-18 (Cycle 16):** the Cycle-16 Prettier violation in `docs/VERIFICATION_EVIDENCE.md` was fixed by `43663ee`; `prettier --check` is clean on all tracked files (only the untracked `Claude outputs/` scratch dir warns — `git ls-files "Claude outputs/"` = empty). RA #17 closed.
- **RESOLVED / F-17 (Cycle 15):** the flaky e2e test `roster has no transform ancestor…` is deterministic — reproduced green again this cycle (e2e 15/15). RA #15 closed.
- **RESOLVED / F-16 (Cycle 15):** `docs/IPAD_SCROLL_BUG.md` is git-tracked.

## Required Actions

| # | Priority | Status | Raised | Staleness | Score Impact | Directive |
|---|----------|--------|--------|-----------|--------------|-----------|
| 14 | **P0 / HIGH** | **OPEN — device-evidenced FAILING (drives Cycle 18)** | v56 | 8 | −0 (newly actionable this cycle — device evidence + D1 fix just unblocked it) | The lane now runs on a real iOS 26.4 Simulator (D1 fixed) and the roster **does not scroll**: run #1 loaded the kiosk, dragged, and `scrollTop` stayed 0 (`WebRosterScrollUITests.swift:35`). The Cycle-15 CSS fix is on-device-evidenced **insufficient**. **Cycle 18 must** (1) root-cause genuine non-scroll (inspect `overflow`/`-webkit-overflow-scrolling`/`touch-action`/container height on `.roster-screen`/list) vs. drag mechanics, land the fix, and (2) fix the flaky harness (RA #19) so a real `status:"passed"` JSON can be recorded in `docs/IPAD_SCROLL_BUG.md`. Also refresh the stale default device (`iPad Pro 13-inch (M4)` → an installed line, e.g. `iPad (A16)`). Escalate stall deductions if Cycle 18 does not act. |
| 19 | **P1 / HIGH** | **OPEN — new (N2/F-21), harness flakiness** | v65 | 0 | −0 (staleness 0) | `WebRosterScrollUITests.open()` (`:38-46`) binds `safari.textFields.firstMatch`, which can hit the inactive `TabBarItemTitleContainer` field → `typeText` fails "Neither element nor any descendant has keyboard focus" (`:42`, run #2). Make the address entry deterministic — select the keyboard-focused address field (predicate on focus / query the active field), add settle+retry — so the lane reliably reaches the scroll oracle. Bundle with the RA #14 fix in Cycle 18. Escalate to P0 if still open at staleness 2. |
| 10 | P2 / MODERATE | `BLOCKED (external billing)` | v37 | — | −0 (external / non-code-actionable) | Operator must clear GitHub billing, then push/rerun CI `33711898714`. Outside the code loop. |

**DONE / RESOLVED (not re-opened):** **RA #18 (D1, iOS probe-env propagation) RESOLVED (v65** — `c669930`, `TEST_RUNNER_` injection, execution-proven); **RA #16 (empty-critique recurrence) RESOLVED (v64** — `check-cycle-artifacts` guard, execution-verified); RA #17 (red CI lint gate) RESOLVED (v62); RA #15 (flaky e2e gate) RESOLVED; RA #11 (CSV data-loss) DONE; camera DONE; RA #12 (`mark007` query) RESOLVED & verified; RA #13 (check-in flow hit region) RESOLVED & verified; RA #1–#9 DONE.

<!-- audit-entry v65 -->
> **CYCLE 17 COMPLETE (State 4) — the State-3 blocking defect (D1 / F-19 / RA #18) is FIXED and execution-proven on a real iOS 26.4 Simulator. Implementation Verification v24 = 96/100 → ≥95 gate CLEARED → plan v30 VERIFIED. Score 83 → 84.** But the now-functional lane's first real device evidence is that **RA #14 does NOT pass on device** (roster `scrollTop` stayed 0 after a touch drag) → this drives Cycle 18.
> Fix `c669930` ("fix(audit): pass iOS probe env to XCTest runner") touches **exactly two files** — `scripts/ios-scroll-smoke.mjs` (+`testRunnerEnvironment()`, `TEST_RUNNER_`-prefixed injection at `:262-266`) and `tests/unit/ios-scroll-smoke.test.mjs` (+2 tests incl. a captured-launch-env assertion). **Zero `src/`/`native/` drift** (`git show --stat`), so the Cycle-15 XCTest and production kiosk are untouched (Cycle-17 scope honored).
>
> **Independently reproduced this cycle (trust nothing):**
> - `node --test tests/unit/*.test.mjs` → **100/100 pass** (was 98; +2: `testRunnerEnvironment` unit + a `runIosScrollSmoke` launch-env assertion that captures the `xcodebuild test` env and asserts `TEST_RUNNER_CHECKIN007_IOS_PROBE_URL`).
> - `npx playwright test` → **15/15 pass**; `node scripts/build.mjs` ×2 → deterministic SHA `15d6647afdf4`, **26898 gzip bytes**.
> - `npx prettier --check .` on all git-tracked files → clean (only the untracked `Claude outputs/` scratch dir warns — `git ls-files "Claude outputs/"` = empty).
> - Guard/fail-closed unchanged and green: `npm run check:cycle-artifacts` → exit 0; required-without-valid-device → exit 1 + `status:"failed"`. **RA #16 stays RESOLVED.**
>
> **D1 / RA #18 — RESOLVED (execution-proven on `iPad (A16)` / iOS 26.4 Simulator, booted):**
> - **Run #1:** `CHECKIN007_IOS_DEVICE='iPad (A16)' CHECKIN007_IOS_RUNTIME='iOS' CHECKIN007_IOS_SCROLL_REQUIRED=1 node scripts/ios-scroll-smoke.mjs` → preflight passed, kiosk built, HTTPS served (`.../check-in-007.15d6647afdf4.html?scrollProbe=1`), `xcodebuild test` → exit 65, **but the `.xcresult` failure moved from the v23 line-15 `XCTUnwrap` (nil probe URL) to `WebRosterScrollUITests.swift:35: XCTAssertTrue failed - Probe text must report positive scrollTop after a touch drag`.** The test got **past** line 26 (probe loaded reporting `scroll-probe:0` → Safari loaded the kiosk + dismissed the self-signed warning), performed the drag, and the roster's `scrollTop` **stayed 0**. → the `TEST_RUNNER_` env now reaches the runner. **D1 fixed.**
> - Wrapper wrote `status:"failed"`, `stage:"xcodebuild"`, bounded error, nonzero exit — fail-closed contract intact.
>
> **RA #14 — device-evidenced FAILING (F-20):** run #1's line-35 failure is the **first on-device evidence** for the primary iPad roster-scroll defect, and it indicates the Cycle-15 CSS transform-removal fix is **insufficient** (the plan-v30 trigger "unless a real-device failure later proves it insufficient" is now active). **RA #14 stays OPEN** — no longer merely env-blocked; it now has positive device evidence it does not pass. A real `status:"passed"` JSON is still required to close it.
>
> **New: XCUITest harness flakiness (N2 / F-21 / RA #19).** A determinism re-run (run #2) failed **earlier**, at `WebRosterScrollUITests.swift:42: Failed to synthesize event: Neither element nor any descendant has keyboard focus` — `open()`'s `safari.textFields.firstMatch` bound the inactive tab-bar address field instead of the keyboard-focused one. The Safari-driving harness is nondeterministic run-to-run; it must be hardened (Cycle 18) so the scroll oracle result is fully trustworthy. This is in the Cycle-15 XCTest (out of Cycle-17 scope) → a system finding, not a plan-v30 fidelity defect.
>
> **Plan compliance — all §5 files landed; every acceptance bullet passes; §4.1/Phase-1 upgraded PARTIAL→COMPLIANT (D1 fixed).** Full table in Implementation Verification v24. Required iOS mode "remains explicitly blocked/unresolved," exactly the §6 Phase-5 acceptance.
>
> **Score computation.**
> - **Base Score: 82.5/100 → 84.** 8-criteria sum 66/80: code correctness 9 (D1 fixed & proven), plan compliance 9 (v30 fully implemented, impl 96 ≥ 95), doc coherence 9 (honest, device PASS blank), testing rigor 8 (100/100 + launch-env assertion, but on-device lane nondeterministic — N2), safety 9 (fail-closed proven ×2), observability 8, **feature completeness 6 (RA #14 device-evidenced unfixed)**, risk 8. Credited to 84 for the durable RA #16 fix + the D1 fix making the RA #14 lane genuinely functional.
> - **Required Actions: −0.** **RA #18 (P1, D1) RESOLVED** (`c669930`). **RA #16 (P3) RESOLVED** (guard). RA #14 (P0/HIGH) OPEN, newly actionable (device evidence + D1 fix just unblocked it), staleness 8, −0 (not a stall — active progress this cycle). **New RA #19 (P1, N2)** staleness 0 → −0. RA #10 external/`BLOCKED` (−0).
> - **Backlog: −0.** 1 strict-unchecked `- [ ]` (CI-guard/plan-commit reconciliation, Path-to-100); 1/2 rounds down.
> - **Inactivity decay: −0.** Reset — `c669930` touches `scripts/`/`tests/`.
> - **Final: 84 − 0 − 0 − 0 = 84/100.** Net +1 vs v64: D1 fixed + Cycle 17 complete + decay reset, tempered by the confirmed-unfixed flagship feature (RA #14) and the new harness-flakiness finding (N2).
>
> **Disposition — Cycle 17 COMPLETE (State 4).** Plan v30 (96) implemented at 96/100 (≥95 cleared); the sole blocking defect (D1) is fixed and proven. No fix cycle required. Next action: **open Cycle 18** to make RA #14 actually pass on device — root-cause the non-scroll (CSS/DOM/overflow) and/or the drag mechanics, harden the flaky harness (RA #19), refresh the stale default device, then record a real `status:"passed"` JSON. RA #10 stays external.
>
> **Required Actions status.** **#18** (P1, D1 — iOS probe-env propagation) — **RESOLVED** (`c669930`, execution-proven). **#16** (P3, empty-critique recurrence) — **RESOLVED** (guard). **#14** (P0/HIGH, iPad roster scroll) — **OPEN, device-evidenced FAILING**, staleness 8, **−0** (drives Cycle 18). **#19** (P1, XCUITest harness flakiness) — OPEN new, staleness 0, **−0**. **#10** (P2, CI external billing) — `BLOCKED`, external, **−0**. **#17** (red CI lint gate) RESOLVED (v62). **#15** (flaky e2e) RESOLVED. **#11** (CSV) DONE. **#12** (`mark007`) RESOLVED. **#13** (check-in flow) RESOLVED. Camera DONE.

<!-- audit-entry v64 -->
> **CYCLE 17 IMPLEMENTED — plan v30 landed in `a845f70`. Implementation Verification v23 = 90/100 → below the ≥95 gate → State 3 (FIX THE IMPLEMENTATION). One blocking defect (D1/F-19/RA #18): the automated iOS lane can never emit `status:"passed"` because the probe URL never reaches the XCUITest runner. RA #16 durably RESOLVED by the new guard. Score 83 → 83 (flat: decay reset + RA #16 fix offset by the below-gate impl + new D1).**
> `a845f70` ("feat(cycle-17): add iOS scroll evidence and artifact guard") implements approved plan v30 across the full §5 manifest (12 files) with **zero `src/`/`native/` production drift** (`git show --stat` confirms).
>
> **Independently reproduced this cycle (trust nothing):**
> - `node --test tests/unit/*.test.mjs` → **98/98 pass** (+13: 8 iOS-smoke preflight/normalize/write, 5 cycle-artifacts guard).
> - `npx playwright test` → **15/15 pass**; `node scripts/build.mjs` ×2 → deterministic SHA `15d6647afdf4`, **26898 gzip bytes**.
> - `npx prettier --check` on all git-tracked files → clean (only the untracked `Claude outputs/` scratch dir warns — `git ls-files "Claude outputs/"` = empty).
> - Guard: `npm run check:cycle-artifacts` → exit 0 (restored non-empty critique); `CHECKIN007_ALLOW_EMPTY_CRITIQUE=1 …` → exit 0 + warning; empty/whitespace/missing critique → nonzero (unit-proven). **RA #16 durably RESOLVED.**
> - iOS lane fail-closed: non-required skip → exit 0 + `status:"skipped"`; required-without-valid-device → exit 1 + `status:"failed"`.
>
> **First real simulator run (this environment has an iOS 26.4 Simulator — a first) exposed blocking defect D1:**
> - `CHECKIN007_IOS_DEVICE='iPad (A16)' CHECKIN007_IOS_RUNTIME='iOS' CHECKIN007_IOS_SCROLL_REQUIRED=1 node scripts/ios-scroll-smoke.mjs`: preflight passed, kiosk built, HTTPS served (`.../check-in-007.15d6647afdf4.html?scrollProbe=1`), `xcodebuild test` launched → **exit 65**, wrapper wrote `status:"failed"`, `stage:"xcodebuild"`, bounded error truncated at exactly the 2000-char `IOS_SCROLL_ERROR_LIMIT` (redaction cap proven), nonzero exit.
> - `xcodebuild build-for-testing …` → **`** TEST BUILD SUCCEEDED **`** (native compiles fine). The `.xcresult` shows the _test_ failed at `WebRosterScrollUITests.swift:15: XCTUnwrap failed … CHECKIN007_IOS_PROBE_URL …` — **nil inside the runner.**
> - **Root cause (D1):** `runIosScrollSmoke` sets `CHECKIN007_IOS_PROBE_URL` in the `xcodebuild` subprocess env (`ios-scroll-smoke.mjs:244-252`), but Xcode does not forward plain command env vars into the test-runner process; the runner needs the `TEST_RUNNER_` prefix (or a test plan). So the automated PASS path is unreachable — the exact artifact §1/§4.1 promises to "convert a future device run into." Latent since Cycle-15 `85854be`, never exercised until a simulator existed; Cycle 17 re-blessed the lane without fixing it. **Fix in the wrapper only (not the XCTest, not the plan).**
>
> **Plan compliance — all §5 files landed; every _literal_ acceptance bullet passes, but §4.1/Phase-1 is PARTIAL (blocking, D1).** Full table in Implementation Verification v23: §4.2 JSON evidence, §4.3 preflight classification, §4.4 guard + override, §5 CI wiring (`ci.yml:31-32`, `ios-scroll.yml` dual-artifact upload), Phase-3 tests (+13, `IOS_SCROLL_ERROR_LIMIT` asserted — Path-to-100 #3 folded in), Phase-4 docs (runbook says the automated lane is simulator-or-external-URL only — Path-to-100 #2 folded in; evidence device-PASS left blank) all COMPLIANT.
>
> **Score computation.**
> - **Base Score: 80/100 (reported 83).** The web tree is correct/deterministic and the guard + evidence lane are real wins, but D1 makes the headline verification lane non-functional for its purpose and feature completeness on iPad stays 6/10 (8-criteria sum 64/80 → 80); credited to **83** for the durable RA #16 fix and observability landing this cycle.
> - **Required Actions: −0.** RA #14 (P0/HIGH) `BLOCKED` — CSS done, automated PASS path blocked by D1 + no device PASS recorded, staleness 7. **RA #16 (P3) RESOLVED** (guard). **New RA #18 (P1, D1)** staleness 0 → −0 (drives the fix). RA #10 external/`BLOCKED` (−0).
> - **Backlog: −0.** 1 strict-unchecked `- [ ]` (CI-guard/plan-commit reconciliation, Path-to-100); 1/2 rounds down.
> - **Inactivity decay: −0.** Reset — `a845f70` touches `scripts/`/`tests/`/`docs/`/CI.
> - **Final: 83 − 0 − 0 − 0 = 83/100.** Net flat vs v63: decay reset + RA #16 durably fixed, exactly offset by the below-gate impl + newly-surfaced blocking D1.
>
> **Disposition — Cycle 17, State 3 (FIX THE IMPLEMENTATION).** Plan v30 (96) is the contract; the implementation scores 90 < 95. Next action: fix **D1 / RA #18** (route the probe-URL env vars into the test-runner via `TEST_RUNNER_` prefix + add a launch-env assertion), then resubmit for re-verification. Do NOT revise the plan or edit the XCTest. RA #14's real device PASS remains separately required after D1; RA #10 stays external.
>
> **Required Actions status.** **#18** (P1, D1 — iOS lane env propagation) — OPEN new, staleness 0, **−0**; drives the fix. **#16** (P3, empty-critique recurrence) — **RESOLVED** (guard, execution-verified). **#14** (P0/HIGH, iPad roster scroll) — **BLOCKED**, CSS done / lane-blocked by D1, staleness 7, **−0**. **#10** (P2, CI external billing) — `BLOCKED`, external, **−0**. **#17** (red CI lint gate) RESOLVED (v62). **#15** (flaky e2e) RESOLVED. **#11** (CSV) DONE. **#12** (`mark007`) RESOLVED. **#13** (check-in flow) RESOLVED. Camera DONE.

<!-- audit-entry v63 -->
> **CYCLE 17 OPENED — plan v30 (iPad scroll verification lane + cycle-artifact guard) drafted & APPROVED at 96/100 (State 2 — implement the approved plan). NOT YET IMPLEMENTED → Implementation Score N/A. Empty root critique (F-15) recurred a 5th time and was restored. Score 84 → 83 (first idle-code cycle since the Cycle-16 `43663ee` work → decay −1).**
> `bd9af4e` ("plan: v30 — iPad scroll verification cycle") replaced the completed Cycle-16 plan with a Cycle-17 contract targeting the two remaining **code-actionable** audit findings: RA #14 (harden the iPad-scroll verification lane — structured JSON evidence + preflight classification, no speculative scroll changes) and RA #16 (a repo-local `check-cycle-artifacts` guard wired into CI to stop the recurring empty root critique). Per the staleness rule the newer plan is reviewed fresh: **Plan Critique Cycle 17 Rev 1 = 96/100 — APPROVED** (`IMPLEMENTATION_PLAN_CRITIQUE.md`).
>
> **Nothing is implemented yet (trust nothing — verified against the tree):**
> - The plan's NEW files do **not** exist: `scripts/check-cycle-artifacts.mjs`, `tests/unit/ios-scroll-smoke.test.mjs`, `tests/unit/cycle-artifacts.test.mjs`, `docs/IOS_SCROLL_RUNBOOK.md` all report **MISSING**.
> - `grep "check:cycle-artifacts" package.json` → **0 hits**; `scripts/ios-scroll-smoke.mjs` still collapses unavailable states into skip strings (`:67-78`) with **no** `preflightIosRunner`/`normalizeIosScrollResult`/`writeIosScrollResult` exports; `.github/workflows/ios-scroll.yml` uploads only `ios-scroll.xcresult` (no `ios-scroll-result.json`).
> - `git show --stat cfdb0b2` = archive-only (moves Cycle-16 audit/critique/plan into `archive/cycle-16/`, blanks root critique); `git show --stat bd9af4e` = **1 file** (`IMPLEMENTATION_PLAN.md`, +320/−262) — a plan-only commit. Zero code drift.
>
> **Plan v30 factual claims independently verified against source (all accurate):** `runIosScrollSmoke` (`ios-scroll-smoke.mjs:56`) uses module-local `run()` (`:9`, not yet injectable — Phase 1.1 need real), `build()` (`:80`), `startServer(...)` (`:86`); `package.json:14` `lint = check-node-version && prettier --check .` with no `check:cycle-artifacts`; `ci.yml:31-51` runs lint→unit→e2e→build (guard slots in before them); `.prettierignore` already excludes the 4 canonical MD files + `test-results/`; `.gitignore` already ignores `test-results/` (satisfies §4.2's "stays untracked" tradeoff). `destinationFor` (`:46`) is simulator-only → the automated lane is simulator-or-external-URL only (real iPad = manual fallback), noted as a Path-to-100 nit.
>
> **Baseline reproduced this cycle (trust nothing):** `node --test tests/unit/*.test.mjs` → **85/85 pass**; `npx playwright test` → **15/15 pass**; `node scripts/build.mjs` → deterministic SHA `15d6647afdf4`, **26898 gzip bytes** (well under 750 KB); `npx prettier --check .` clean on all tracked files (only the untracked `Claude outputs/` scratch dir warns — not a project file).
>
> **Plan held at 96 (not 97):** one unreconciled commission trade-off — the CI cycle-artifact guard (run without the override) reddens the very new-cycle/plan commit it polices, since the generator's plan commit necessarily lands before the discriminator writes the critique; the plan offers only a local override, not a CI-side reconciliation (§13 Q3 half-acknowledges it). Plus three minor omission nits: real *physical*-iPad automated destination undesigned (simulator-only `destinationFor`); error-redaction cap described ("bounded", "<5 KB") but not pinned to a constant; guard cwd/root resolution implicit. None blocking. See `IMPLEMENTATION_PLAN_CRITIQUE.md` Cycle 17 Rev 1.
>
> **Scope check — passes (no cap).** The plan addresses **both** code-actionable open findings (RA #14 verification-lane hardening at the correct altitude; RA #16 durable guard) and correctly declares RA #10 (external billing) out of scope. Backlog is fully closed (0 unchecked) so there is no backlog item to fold in. Alternatives are genuinely evaluated (§4.1–4.4) and integration points enumerated (§7).
>
> **Score computation.**
> - **Base Score: 84/100.** Unchanged from v62 — the shipped tree is healthy and gates green, but no new code landed this cycle and feature completeness on the primary iPad stays 6/10 until RA #14 is device-verified (8-criteria sum 67/80).
> - **Required Actions: −0.** RA #14 (P0/HIGH) `BLOCKED (env / device)` — code done, device verification impossible here (RA #10 precedent), staleness 6. RA #16 (P3, empty-critique) **recurred a 5th time** (`cfdb0b2`) but staleness 3 (<5) and now actively addressed by approved plan v30 → −0; escalate to P1 at staleness 5 if still unimplemented. RA #10 external/`BLOCKED` (−0).
> - **Backlog: −0.** 1 strict-unchecked `- [ ]` (Cycle-17 CI-guard/plan-commit reconciliation, deferred from plan v30 Path-to-100); 1/2 rounds down → −0.
> - **Inactivity decay: −1.** First idle-code audit since the Cycle-16 `43663ee` work — only the `cfdb0b2` archive + `bd9af4e` plan commit since v62, no `src/`/`scripts/`/`tests/`/`native/` change. Resets when plan v30's code lands.
> - **Final: 84 − 0 − 0 − 1 = 83/100.** Net −1 vs v62: plan approved on paper (96), code idle.
>
> **F-15 recurred (5th time).** The `cfdb0b2` archive commit blanked `IMPLEMENTATION_PLAN_CRITIQUE.md`; re-authored this cycle (v30 APPROVED 96 + State-2 disposition). Approved plan v30's `check-cycle-artifacts` guard is the durable fix for RA #16 — implement it.
>
> **Disposition — Cycle 17, State 2 (implement approved plan v30).** Next action: land Phases 1–5 — preflight/JSON writer in `scripts/ios-scroll-smoke.mjs` (fail-closed contract preserved), `scripts/check-cycle-artifacts.mjs` + `npm run check:cycle-artifacts` + CI wiring, `tests/unit/ios-scroll-smoke.test.mjs` + `tests/unit/cycle-artifacts.test.mjs`, `docs/IOS_SCROLL_RUNBOOK.md`, and doc/README updates — then run Implementation Verification. Landing code resets the −1 decay. RA #14's real-iPad PASS remains separately required and must not be claimed by this cycle; RA #10 stays outside the code loop.
>
> **Required Actions status.** **#16** (P3, empty-critique recurrence) — OPEN, being addressed by plan v30, staleness 3, **−0**. **#14** (P0/HIGH, iPad roster scroll) — **BLOCKED (env / device)**, code-complete, staleness 6, **−0**. **#10** (P2, CI external billing) — `BLOCKED`, external, **−0**. **#17** (red CI lint gate) RESOLVED (v62). **#15** (flaky e2e) RESOLVED. **#11** (CSV) DONE. **#12** (`mark007`) RESOLVED. **#13** (check-in flow) RESOLVED. Camera DONE.

<!-- audit-entry v62 -->
> **CYCLE 16 COMPLETE (State 4) — the State-3 blocking defect (D1 / F-18 / RA #17) is RESOLVED. Implementation Verification v22 = 97/100 → ≥95 gate CLEARED → plan v29 (web app manifest / standalone `start_url`) is implemented and VERIFIED. Score 80 → 84.**
> Fix commit `43663ee` ("fix(audit): format Cycle 16 evidence per RA #17") touches **exactly one file** — `docs/VERIFICATION_EVIDENCE.md` (`git show --stat` = +5/−3). It de-indents the recorded prettier-command continuation lines so `prettier --check` passes, **and** corrects the file's previously-**false** "prettier … passed" claim to a truthful statement (H4). No `src/`/`scripts/`/`tests/`/`native/` code changed, so every §4 compliance verdict from Implementation Verification v21 stands unchanged and the feature remains faithful to approved plan v29.
>
> **Independently reproduced this cycle (trust nothing):**
> - `npx prettier --check docs/VERIFICATION_EVIDENCE.md` → **"All matched files use Prettier code style!"**; `npx prettier --check .` → only the **untracked** `Claude outputs/` scratch dir warns (`git ls-files "Claude outputs/"` = empty → not a project file). The previously-red gate is green.
> - `node --test tests/unit/*.test.mjs` → **85/85 pass**.
> - `npx playwright test` → **15/15 pass**.
> - `node scripts/build.mjs` ×2 → deterministic SHA `15d6647afdf4`, **26898 gzip bytes** (well under 750 KB); `dist/check-in-007.webmanifest.start_url === "./"+manifest.json.artifact` = **true**; `dist/index.html` byte-identical to the hashed twin; built HTML carries exactly one `./check-in-007.webmanifest` link.
> - `.webmanifest` MIME entry present (`static-server.mjs:11` → `application/manifest+json`); icon PNGs at verified `IHDR` 192×192 / 512×512; icons use `purpose:"any"`.
>
> **Plan compliance — all five phases COMPLIANT (full table in Implementation Verification v22):** §4.1/Phase 1 (source manifest + one `rel=manifest` link + preserved meta tags), §4.1/Phase 2 (generated hashed `start_url`, deterministic, byte-identical twin), §4.2 (machine manifest kept separate), §4.3 (icons committed + copied, `purpose:"any"` resolving critique nit #3), §4.5/Phase 3 (MIME + no-store), **Phase 4 (verification coverage — now COMPLIANT: prettier clean → "`npm run lint` … pass" MET)**, Phase 5 (docs truthful, RA #14 not over-claimed).
>
> **Score computation.**
> - **Base Score: 84/100.** D1 fixed → plan-compliance (8→9), doc-coherence (8→9), and testing rigor (8→9) recover from the v61 artificial depression; the web-manifest feature is correct, deterministic, and fully verified. Feature completeness stays **6/10** because the primary iPad roster-scroll (RA #14) is device-unverified (8-criteria sum 67/80).
> - **Required Actions: −0.** RA #17 (P2, red lint gate) **RESOLVED**. RA #14 (P0/HIGH) `BLOCKED (env / device)` — code done, device verification impossible here (RA #10 precedent). RA #16 (P3, empty-critique) staleness 2 → −0 (not recurred; P3 deducts only after 5+). RA #10 external/`BLOCKED` (−0).
> - **Backlog: −0.** The manifest / `start_url` item flips `[/]` → **`[x]`** (impl cleared ≥95). 0 strict-unchecked `- [ ]` → backlog fully closed.
> - **Inactivity decay: −0.** `43663ee` touches `docs/VERIFICATION_EVIDENCE.md` (a non-plan/non-audit file, an active State-3 fix) → no idle accrual.
> - **Final: 84 − 0 − 0 − 0 = 84/100.** Net +4 vs v61.
>
> **Implementation Verification v22 = 97/100 (VERIFIED).** The −3 from 100 is an honest env-blocked execution residual, not a code defect: (1) the composed `npm run lint` chain can't be run green end-to-end here (Node-24 guard fails closed on in-env Node 26; only `prettier --check` is directly proven — same precedent as Cycle 15 v20 = 97); (2) the real iPadOS standalone launch of the hashed `start_url` is validated by deterministic metadata tests, not on a device (plan-sanctioned §7.4).
>
> **Disposition — Cycle 16 COMPLETE (State 4).** Plan v29 (96) implemented at 97/100 (≥95 cleared); the sole blocking defect is fixed and the backlog is fully closed. No fix cycle required. System health holds at 84 because RA #14's real-device verification is not code-actionable here. Next lever: run `CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll` on a provisioned iPad/simulator (or the manual fallback) and record the PASS in `docs/IPAD_SCROLL_BUG.md` — only then can RA #14 be RESOLVED and feature completeness recover — or open a new cycle with genuine code work. Do not manufacture churn.
>
> **Required Actions status.** **#17** (P2, red CI lint gate) — **RESOLVED** (`43663ee`, verified). **#16** (P3, empty-critique recurrence) — OPEN, staleness 2, **−0** (not recurred). **#14** (P0/HIGH, iPad roster scroll) — **BLOCKED (env / device)**, code-complete, staleness 5, **−0**. **#10** (P2, CI external billing) — `BLOCKED`, external, **−0**. **#15** (flaky e2e) RESOLVED. **#11** (CSV) DONE. **#12** (`mark007`) RESOLVED. **#13** (check-in flow) RESOLVED. Camera DONE.

<!-- audit-entry v61 -->
> **CYCLE 16 IMPLEMENTED — plan v29 (web app manifest / standalone `start_url`) landed in `f410d95`. Implementation Verification v21 = 93/100 → below the ≥95 gate → State 3 (FIX THE IMPLEMENTATION). One blocking defect (D1/F-18): a Prettier violation in a tracked doc reddens the `npm run lint` / CI gate. Score 81 → 80 (decay reset −1→0, offset by the new red-lint-gate defect + impl below gate).**
> `f410d95` ("feat(§6): add web app manifest start_url") implements approved plan v29 across **exactly the §5 file manifest** (14 files) plus one documented, justified `.prettierignore` deviation — `git show --stat f410d95` shows no out-of-manifest source drift.
>
> **Independently reproduced this cycle (trust nothing):**
> - `node --test tests/unit/*.test.mjs` → **85/85 pass** (+1: manifest transform validates required members, empty-icons, `../`-traversal reject; build asserts hashed `start_url`, PNG dimensions 192×192/512×512, one dist manifest link, unchanged machine-manifest shape).
> - `npx playwright test` → **15/15 pass** (asserts `link[rel=manifest]` href value **and** count = 1 — critique Path-to-100 #2 satisfied).
> - `node scripts/build.mjs` ×2 → deterministic SHA `15d6647afdf4`, **26898 gzip bytes** (well under 750 KB); `dist/check-in-007.webmanifest.start_url === "./"+manifest.json.artifact` = **true**; `dist/index.html` byte-identical to the hashed twin; built HTML carries exactly one `./check-in-007.webmanifest` link.
> - `npx prettier --check .` → **FAILS on `docs/VERIFICATION_EVIDENCE.md`** (tracked, not ignored). The parent `06d9bc5:docs/VERIFICATION_EVIDENCE.md` was Prettier-clean → **this commit introduced the violation.** The SVG-in-`.prettierignore` deviation is **justified** (prettier errors "No parser could be inferred" on the SVG).
>
> **Plan compliance (source-verified) — see Implementation Verification v21 for the full table:**
> - **§4.1/Phase 1 — COMPLIANT.** `manifest.webmanifest` carries all required members + 192/512/SVG icons; `index.html:10` links exactly one `rel=manifest` → `./manifest.webmanifest`; existing `apple-mobile-web-app-*`/`mobile-web-app-capable` meta tags preserved.
> - **§4.1/Phase 2 — COMPLIANT.** `createWebAppManifest()`/`writeWebAppManifestArtifacts()` (`build.mjs:151-195`); bake-before-hash ordering correct (fixed webmanifest filename → no hash cycle; critique nit #1 satisfied).
> - **§4.2 — COMPLIANT.** machine `check-in-007.manifest.json` kept separate & unchanged in shape (unit-asserted).
> - **§4.3 — COMPLIANT + improved.** icons committed at verified dimensions and copied to `dist/assets/icons/`; **`purpose:"any"`** used instead of `"any maskable"`, resolving critique nit #3 (maskable safe-zone clip).
> - **§4.5/Phase 3 — COMPLIANT.** `static-server.mjs:11` adds `.webmanifest → application/manifest+json`; live-server test confirms 200 + correct content-type + `Cache-Control: no-store` for manifest and icons; cert/traversal guards untouched.
> - **Phase 4 — PARTIAL (blocking).** unit/e2e/build pass, but the "`npm run lint` … pass" acceptance criterion is UNMET (D1).
> - **Phase 5 — PARTIAL.** README A2HS guidance good; `docs/VERIFICATION_EVIDENCE.md` appended but is itself the D1 defect and makes a false "prettier … passed" claim; RA #14 correctly not claimed resolved.
>
> **The one blocking defect (D1 / F-18 / RA #17).** `docs/VERIFICATION_EVIDENCE.md` fails `prettier --check` → `npm run lint` and CI go red. Fix in code (`npx prettier --write` the file + correct the false claim), then resubmit. **Do NOT revise the plan** — the feature is faithful to it.
>
> **Score computation.**
> - **Base Score: 80/100.** The web-manifest feature is correct and well-tested, but a red CI lint gate + impl below the ≥95 gate hold plan-compliance/testing/doc-coherence down, and feature completeness on the primary iPad stays 6/10 until RA #14 is device-verified (8-criteria sum 64/80).
> - **Required Actions: −0.** RA #14 (P0/HIGH) `BLOCKED (env / device)` — code done, device verification impossible here (RA #10 precedent). RA #17 (P2, red lint gate) new, staleness 0 → −0. RA #16 (P3, empty-critique) staleness 1 → −0 (not recurred this cycle). RA #10 external/`BLOCKED` (−0).
> - **Backlog: −0.** 0 strict-unchecked `- [ ]`; the manifest / `start_url` item stays `[/]` (impl landed but has not cleared the ≥95 impl gate; flips to `[x]` only after D1 is fixed and re-verified).
> - **Inactivity decay: −0.** **Reset** — `f410d95` touches `scripts/`/`tests/`/`index.html`/`assets/`, ending the idle streak.
> - **Final: 80 − 0 − 0 − 0 = 80/100.** Net −1 vs v60: code landed (decay reset +1) but the new red-lint-gate defect + impl-below-gate cost 2.
>
> **Disposition — Cycle 16, State 3 (FIX THE IMPLEMENTATION).** Plan v29 (96) is the contract; the implementation scores 93 < 95. Next action: fix RA #17/D1 (`prettier --write docs/VERIFICATION_EVIDENCE.md` + correct the false claim), then resubmit for re-verification. RA #14's real-iPad PASS remains separately required and must not be claimed by this cycle; RA #10 stays outside the code loop.
>
> **Required Actions status.** **#17** (P2, red CI lint gate) — OPEN new, staleness 0, **−0**; drives the fix. **#16** (P3, empty-critique recurrence) — OPEN, staleness 1, **−0** (not recurred this cycle). **#14** (P0/HIGH, iPad roster scroll) — **BLOCKED (env / device)**, code-complete, staleness 4, **−0**. **#10** (P2, CI external billing) — `BLOCKED`, external, **−0**. **#15** (flaky e2e) RESOLVED. **#11** (CSV) DONE. **#12** (`mark007`) RESOLVED. **#13** (check-in flow) RESOLVED. Camera DONE.

<!-- audit-entry v60 -->
> **CYCLE 16 OPENED — plan v29 (web app manifest / standalone `start_url`) drafted & APPROVED at 96/100 (State 2 — implement the approved plan). NOT YET IMPLEMENTED → Implementation Score N/A. Empty critique (F-15) restored again. Score 82 → 81 (first idle-code cycle since the `f551d4a` reset → decay −1).**
> `06d9bc5` ("plan: v29 — web app manifest start url cycle") replaced the completed Cycle-15 plan with a fresh Cycle-16 plan for the **last open backlog item** — a web app manifest with a build-generated, content-hashed `start_url` so iPadOS standalone (Add-to-Home-Screen) installs launch a fresh artifact instead of a stale `index.html`. Per the staleness rule the newer plan is reviewed fresh: **Plan Critique Cycle 16 Rev 1 = 96/100 — APPROVED** (`IMPLEMENTATION_PLAN_CRITIQUE.md`).
>
> **Nothing is implemented yet (trust nothing — verified against the tree):**
> - The plan's NEW files do **not** exist: `manifest.webmanifest`, `assets/icons/check-in-007-icon.svg`, `check-in-007-icon-192.png`, `check-in-007-icon-512.png` all report **MISSING**.
> - `grep -n "manifest" index.html` → **0 hits** (no `<link rel="manifest">` yet); `grep "createWebAppManifest|writeWebAppManifestArtifacts|webmanifest" scripts/build.mjs` → **0 hits**; `.webmanifest` is genuinely absent from the `static-server.mjs` MIME map.
> - `git diff --name-only 06d9bc5..HEAD` is **empty**; `git show --stat 06d9bc5` = **2 files** (`IMPLEMENTATION_PLAN.md` +271/−255, `BACKLOG.md` +2/−2) — a plan/backlog commit only. Zero code drift.
>
> **Plan v29 factual claims independently verified against source (all accurate):**
> - `index.html:6-9` carries the existing `mobile-web-app-capable` / `apple-mobile-web-app-*` / `theme-color` metadata — the manifest link is placeable after it, meta tags stay (§2/§6).
> - `scripts/build.mjs:121-144` emits `dist/index.html` + `dist/check-in-007.<hash>.html` + `dist/check-in-007.manifest.json` `{artifact,sha256,gzipSize,byteSize}`; `artifactNameFor(html)` hashes the HTML (`:122-123`), built HTML is the single `<head>` template at `:172`. §4.2's "keep the machine manifest separate" is correct — tests/README/CI depend on that JSON shape.
> - `static-server.mjs:5-22` already maps `.svg`→`image/svg+xml` and `.png`→`image/png` but **not** `.webmanifest`; Phase 3.1 ("add if not already present") is exactly right. `safeResolve` (`:28-44`) rejects dot-leading segments only — the new served paths contain none, and the cert-cache/realpath guards (`:82-94`) are untouched (§7.3 honored).
>
> **Baseline reproduced this cycle (trust nothing):** `node --test tests/unit/*.test.mjs` → **84/84**; `npx playwright test` → **15/15** (previously-flaky test reliably green — RA #15 fix holds); `node scripts/build.mjs` → deterministic SHA `83a98b13250d`, **26858 gzip bytes** (one extra `<link>` will not threaten the 750 KB budget); `npx prettier --check .` clean on tracked files (only the untracked `Claude outputs/` scratch dir warns).
>
> **Plan held at 96 (not 97):** three minor omission nits — (1) the bake-before-hash ordering and why the *fixed* `check-in-007.webmanifest` filename avoids a hash cycle is not spelled out; (2) icon-generation recipe/dimensions-assertion unspecified for the committed PNGs; (3) `purpose:"any maskable"` on an un-padded icon risks a clipped home-screen mark (safe-zone). None blocking; the install/A2HS lane is validated by deterministic metadata unit/e2e tests rather than a flaky install-UI gate — the right call. See `IMPLEMENTATION_PLAN_CRITIQUE.md` Cycle 16 Rev 1.
>
> **Scope check — passes.** The manifest / `start_url` item is the **only** open backlog line (`BACKLOG.md:19`, `[/]`); the plan addresses exactly it and no other in-scope item → no scope cap. It correctly does **not** touch or over-claim RA #14 (§2 Out of scope). Alternatives (§4.1–4.4) and integration points (§7) are genuinely analyzed.
>
> **Score computation.**
> - **Base Score: 82/100.** Unchanged from v59 — Cycle 15 healthy and gates green, but feature completeness on the primary iPad stays 6/10 until RA #14 is device-verified (8-criteria sum 66/80).
> - **Required Actions: −0.** RA #14 (P0/HIGH) **reclassified `BLOCKED (env / device)`** — code done, device verification impossible here, 4th cycle passing (RA #10 precedent; honors the v59 "consider a bounded disposition" directive). New RA #16 (P3, empty-critique recurrence) staleness 0 → −0. RA #10 external/`BLOCKED` (−0).
> - **Backlog: −0.** 0 strict-unchecked `- [ ]`; the sole remaining item is `[/]` (in progress, driven by approved plan v29).
> - **Inactivity decay: −1.** 1st idle-code audit since the `f551d4a` reset — only the archive + plan/backlog commit since v59, no `src/`/`scripts/`/`native/`/`tests/` change. Resets when plan v29's code lands.
> - **Final: 82 − 0 − 0 − 1 = 81/100.** Net −1 vs v59: plan approved on paper, code idle.
>
> **F-15 recurred (4th time).** The `06d9bc5` new-cycle commit left `IMPLEMENTATION_PLAN_CRITIQUE.md` at 0 bytes; re-authored this cycle (v29 APPROVED 96 + State-2 disposition). Raised as **RA #16 (P3)** to stop the recurrence.
>
> **Disposition — Cycle 16, State 2 (implement approved plan v29).** Next action: land Phases 1–5 — source `manifest.webmanifest` + committed icons, build-generated `dist/check-in-007.webmanifest` with content-hashed `start_url`, `.webmanifest` MIME entry, unit/e2e coverage, README/evidence — then run Implementation Verification. Landing code resets the −1 decay. RA #14's real-iPad PASS remains separately required and must not be claimed by this cycle; RA #10 stays outside the code loop.
>
> **Required Actions status.** **#16** (P3, empty-critique recurrence) — OPEN new, staleness 0, **−0**. **#14** (P0/HIGH, iPad roster scroll) — **BLOCKED (env / device)**, code-complete, staleness 4, **−0**. **#10** (P2, CI external billing) — `BLOCKED`, external, **−0**. **#15** (flaky e2e) RESOLVED. **#11** (CSV) DONE. **#12** (`mark007`) RESOLVED. **#13** (check-in flow) RESOLVED. Camera DONE.

<!-- audit-entry v59 -->
> **CYCLE 15 STATE-3 FIX LANDED & VERIFIED — the blocking defect (RA #15) is RESOLVED. Implementation Verification v20 = 97/100 → ≥95 gate CLEARED → Cycle 15 implementation COMPLETE (State 4). Score 78 → 82.**
> Fix commit `f551d4a` ("fix(audit): stabilize non-roster entrance transition") touches **exactly** `src/styles.css` + `tests/e2e/checkin.spec.mjs` (`git show --stat f551d4a`) — both in the §5 manifest, **no out-of-manifest drift**. It resolves the v19 blocking defect (RA #15 / the flaky e2e gate + the non-roster entrance-snap regression).
>
> **The fix (source-verified):** the non-roster `transform` transition moves out of the `#app:not(.is-ready) .screen:not(.roster-screen)`-only block into `.screen:not(.roster-screen)` (`src/styles.css:70-74`) — a selector present in **both** ready and not-ready states → the non-roster scale entrance animates again (repairs the v19 minor regression vs Phase 1.2 / §4.1). `.roster-screen { transform: none }` preserved (`:158-161`). The e2e test adds `await expect(page.locator('#app')).toHaveClass(/is-ready/)` before sampling (`tests/e2e/checkin.spec.mjs:174`), so `transitionProperty` no longer races the rAF `is-ready` toggle.
>
> **Independently reproduced by the discriminator this cycle (trust nothing):**
> - `node --test tests/unit/*.test.mjs` → **84/84 pass**.
> - `npx playwright test` → **two full-suite runs, 15/15 each**; `npx playwright test -g "roster has no transform ancestor" --repeat-each=12` → **12/12** → the previously-flaky test is now deterministic.
> - `node scripts/build.mjs` (×2) → deterministic SHA `83a98b13250d` (changed from v19's `9cda955cf0fb` because the CSS fix changed the emitted HTML bytes — correct content-addressing); `dist/index.html` byte-identical to the hashed twin (`diff -q`); manifest `{gzipSize:26858, byteSize:72817}` well-formed.
> - `CHECKIN007_IOS_SCROLL_REQUIRED=1 node scripts/ios-scroll-smoke.mjs` → **exit 1** (fails closed); unset → `SKIPPED …` **exit 0**. Fail-closed contract intact.
> - `npx prettier --check src/styles.css tests/e2e/checkin.spec.mjs` → clean.
>
> **Implementation Verification v20 = 97/100 (VERIFIED).** All five phases COMPLIANT (§4.1 upgraded DEVIATED→COMPLIANT). −3: the iOS touch-scroll lane (`ios-scroll-smoke.mjs`, `WebRosterScrollUITests.swift`, `ios-scroll.yml`) — the cycle's central real-device deliverable — is installed and source-verified but **never execution-proven here** (no iPadOS simulator/device), matching the env-blocked 96-97 precedent of prior native cycles. Non-blocking and plan-sanctioned (§4.3, Phase 5.2).
>
> **RA #14 stays IN PROGRESS at the system-health level.** The implementation faithfully executes the plan's honest "unverified gate awaiting the provisioned runner" disposition — but the implementation-fidelity score being ≥95 does **not** mark the underlying iPad bug proven-fixed on device. No real iPad / iOS-Simulator touch PASS exists in this environment. Feature completeness stays 6/10 → this is why system health is 82, not higher.
>
> **Score computation.**
> - **Base Score: 82/100.** Blocking defect fixed, gates reliably green, entrance regression repaired (8-criteria sum 66/80) — but the headline iPad fix is still device-unverified (feature completeness 6/10).
> - **Required Actions: −0.** RA #14 (P0/HIGH) IN PROGRESS — full code fix landed, sole remaining step (device touch verification) env-blocked with active progress each cycle; staleness 3, flagged but not a stall (precedent: RA #10). RA #15 RESOLVED. RA #10 external/`BLOCKED` (−0).
> - **Backlog: −0.** 1 unchecked `- [ ]` (web app manifest / `start_url`, deferred per plan §13 Q4) → round down to 0.
> - **Inactivity decay: −0.** Reset — `f551d4a` touches `src/`+`tests/`.
> - **Final: 82 − 0 − 0 − 0 = 82/100.** Net +4 vs v58: the blocking defect is gone and the gate is stable.
>
> **Disposition — Cycle 15, State 4 (implementation COMPLETE).** Plan v28 (96) implemented at 97/100 (≥95 cleared). The code matches the contract and the only blocking defect is fixed. System health holds at 82 because RA #14's real-device verification is not code-actionable here. Next real-world step: run `CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll` on a provisioned iPad/simulator (or the manual fallback) and record the PASS in `docs/IPAD_SCROLL_BUG.md` — only then can RA #14 be marked RESOLVED. Do not bundle further speculative scroll fixes unless the isolated transform removal is proven insufficient on device.
>
> **Required Actions status.** **#15** (P1, flaky e2e gate) — **RESOLVED** (`f551d4a`, verified). **#14** (P0/HIGH, iPad roster scroll) — IN PROGRESS (full fix landed, env-blocked on device), staleness 3, **−0**. **#10** (P2, CI external billing) — `BLOCKED`, external, **−0**. **#11** (CSV) DONE. **#12** (`mark007`) RESOLVED. **#13** (check-in flow) RESOLVED. Camera DONE.

<!-- audit-entry v58 -->
> **CYCLE 15 IMPLEMENTED — plan v28 landed in `85854be`. Implementation Verification v19 = 91/100 → below the ≥95 gate → State 3 (FIX THE IMPLEMENTATION). One blocking defect: a flaky e2e gate (RA #15). Score 75 → 78 (decay reset −5→0, tempered by a new flaky-gate defect + still-device-unverified fix).**
> `85854be` ("feat(§6): implement iPad scroll robustness") implements approved plan v28 across exactly the §5 manifest files (`git diff --name-only c86bf3e..85854be` = 17 files, **no out-of-manifest drift**). All five phases landed and the implementation is faithful.
>
> **Independently reproduced by the discriminator this cycle (trust nothing):**
> - `node scripts/build.mjs` → emits `dist/index.html`, `dist/check-in-007.9cda955cf0fb.html`, `dist/check-in-007.manifest.json`; `diff -q` confirms `index.html` ≡ hashed twin (byte-identical); a second build reproduces the **same hash** `9cda955cf0fb` (deterministic); manifest `{artifact, sha256, gzipSize:26851, byteSize:72784}` matches §4.4 shape; budget check precedes writes (`scripts/build.mjs:118-201`). **Phase 3 COMPLIANT.**
> - `node --test tests/unit/*.test.mjs` → **84/84 pass** (+6 new: runtime-flag exact activation, probe inert-by-default, probe append/update/dispose, malformed-list `TypeError`, build hash/manifest, `no-store` for both artifacts). **Phases 2/3 unit COMPLIANT.**
> - `npx playwright test` (full suite) → **1 failed / 14 passed on a clean run**, then green on re-runs and in isolation → **flaky** (see RA #15). `npx prettier --check` clean for tracked sources.
> - `node scripts/ios-scroll-smoke.mjs` (not required) → `SKIPPED: iOS runner unavailable …`, **exit 0**; with `CHECKIN007_IOS_SCROLL_REQUIRED=1` it fails closed. **Phase 4 fail-closed/skip contract COMPLIANT.**
>
> **Plan compliance (source-verified) — see Implementation Verification v19 for the full table:**
> - **§4.1/Phase 1 — DEVIATED.** `.roster-screen { transform: none }` and base `.screen` no longer transforms (`src/styles.css:66-82,156`) — roster correctly computes to `transform:none`. But the non-roster `transform` transition is declared only under `:not(.is-ready)` → the ready-state entrance transform snaps and the paired e2e assertion races the rAF toggle (**RA #15**).
> - **§4.2/Phase 2 — COMPLIANT.** `readRuntimeFlags` exact `scrollProbe=1` (`src/app.mjs:15-21`); `createScrollProbe` appends `#scroll-probe-status` to `list.parentElement`, updates from real `scrollTop`, throws on bad list, `dispose()` wired into `mountRoster` cleanup (`src/screens/roster.mjs:5-40,205,217`). Closes critique issues #2/#3.
> - **§4.3/Phase 4 — COMPLIANT.** `WebRosterScrollUITests.swift` pins the critique's open sub-decisions (reads probe via `safari.webViews.staticTexts` `MATCHES`/`CONTAINS`; drives `com.apple.mobilesafari`; drags at right-edge `(0.92,0.78)→(0.92,0.22)`, off any `.guest-row`). File placed in the existing UI-test target (a `PBXFileSystemSynchronizedRootGroup`, `project.pbxproj:39-42`) → auto-compiled without a pbxproj edit (plan-sanctioned §4.3/Phase 4.2). `.github/workflows/ios-scroll.yml` on `[self-hosted, macOS, ios-touch]`, `timeout-minutes: 20`, uploads xcresult on failure. `ci.yml` upload widened to `dist/`.
> - **Phase 5 — COMPLIANT/HONEST.** `docs/IPAD_SCROLL_BUG.md` records the iOS touch result as "skipped/unverified, not as a PASS" (Phase 5.2 honored) and is now **git-tracked** (F-16 resolved).
>
> **The one blocking defect (RA #15).** The e2e test `roster has no transform ancestor while other screens keep scale entrance` is nondeterministic: on a clean full-suite run it failed at `tests/e2e/checkin.spec.mjs:179`, passing on re-run/isolation. Root cause: the non-roster `transform` transition lives only in `#app:not(.is-ready) .screen:not(.roster-screen)`, so in the ready state `transitionProperty` is just `opacity` and the entrance transform snaps (minor regression vs Phase 1.2 / §4.1). `npm run test:e2e` (the Phase 5.1 gate) is therefore intermittently red. Fix in code (declare the transition in a ready-state selector; harden the test) — do NOT revise the plan.
>
> **Score computation.**
> - **Base Score: 78/100.** Code landed and the five-phase implementation is faithful, but a flaky web gate (RA #15) and a device-unverified iPad fix hold code correctness / testing rigor / feature completeness down (8-criteria sum 60/80).
> - **Required Actions: −0.** RA #14 (P0/HIGH) IN PROGRESS — code landed this cycle, staleness 2 (<3), active progress → no stall. RA #15 (P1) new, staleness 0 → no stall yet. RA #10 external/`BLOCKED` (−0).
> - **Backlog: −0.** 1 unchecked `- [ ]` (web app manifest / `start_url`, deferred per plan §13 Q4) → round down to 0. Both iPad items marked `[x]` by the implementation (cache-busting done; iOS regression test wired into CI, device-verification pending).
> - **Inactivity decay: −0.** **Reset** from −5 — `85854be` touches `src/`/`scripts/`/`native/`/`tests/`, ending the 5-cycle idle streak.
> - **Final: 78 − 0 − 0 − 0 = 78/100.** Net +3 vs v57: the +5 decay reset is tempered by the honest cost of a new flaky-gate defect and a still-device-unverified fix.
>
> **Disposition — Cycle 15, State 3 (FIX THE IMPLEMENTATION).** Plan v28 (96) is the contract; the implementation scores 91 < 95. Next action: fix RA #15 (make `npm run test:e2e` reliably green + restore the non-roster entrance animation), then verify RA #14's fix on a real iPad / iOS Simulator. Do NOT revise the plan to pass the audit.
>
> **Required Actions status.** **#15** (P1, flaky e2e gate) — OPEN new, staleness 0, **−0**; drives the fix. **#14** (P0/HIGH, iPad roster scroll) — IN PROGRESS (code landed, device-unverified), staleness 2, **−0**. **#10** (P2, CI external billing) — `BLOCKED`, external, **−0**. **#11** (CSV) DONE. **#12** (`mark007`) RESOLVED. **#13** (check-in flow) RESOLVED. Camera DONE.

