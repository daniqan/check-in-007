# Consolidated Audit — Check-In 007

<!-- score:plan 96 -->
<!-- score:implementation 91 -->
<!-- score:current 78 -->

**Current Score**: 78/100
**Audit Version:** v58
**Audited:** HEAD `85854be` on 2026-09-03. **CYCLE 15 IMPLEMENTED — plan v28 landed in `85854be` ("feat(§6): implement iPad scroll robustness"). Implementation Verification v19 = 91/100 → below the ≥95 gate → State 3 (fix the implementation).** The generator implemented all five phases of approved plan v28: the isolated roster transform fix (`src/styles.css`), the query-gated scroll probe (`src/app.mjs` + `src/screens/roster.mjs`), cache-busted build artifacts (`scripts/build.mjs`), and the fail-closed iOS CI lane (`scripts/ios-scroll-smoke.mjs`, `native/CheckIn007UITests/WebRosterScrollUITests.swift`, `.github/workflows/ios-scroll.yml`). The implementation is faithful and addresses all five critique Path-to-100 items (probe host contract, `dispose()` wiring, `docs/IPAD_SCROLL_BUG.md` git-add [F-16 resolved], XCUITest read path, drag-off-row region). **One blocking defect (RA #15, NEW):** the added e2e test `roster has no transform ancestor while other screens keep scale entrance` is **nondeterministic** — on a clean full-suite run the discriminator observed 1 failed / 14 passed (`tests/e2e/checkin.spec.mjs:179`), passing on re-run/isolation. Root cause verified in `src/styles.css:66-82`: the non-roster `transform` transition is declared only under `#app:not(.is-ready) .screen:not(.roster-screen)`, so in the ready state the entrance transform snaps (minor regression vs Phase 1.2) and the `transitionProperty` assertion races the rAF `is-ready` toggle. `npm run test:e2e` (the Phase 5.1 gate) is therefore intermittently red. The iPad touch fix itself is **correctly unverified** pending a real iPad / iOS-Simulator runner (honest, plan-mandated — not a defect). Score **rises 75 → 78**: base 78 (code landed, faithful implementation, but a flaky web gate and device-unverified fix); RA −0 (RA #14 in progress staleness 2; RA #15 new staleness 0); backlog −0 (1 unchecked item); inactivity decay **−0 (reset — code landed, was −5)**. The +5 decay reset is tempered by the honest cost of a new flaky-gate defect and a still-device-unverified fix, netting +3.

**Stage:** Cycle 15 **State 3 — FIX THE IMPLEMENTATION** (Plan v28 = 96 ≥ 95; Implementation = 91 < 95). Next action for the generator: **fix RA #15** — make `npm run test:e2e` reliably green by declaring the non-roster `transform` transition in a ready-state selector (so the entrance animates) and hardening the test to sample a deterministic state; do **not** revise the plan. Then verify the iPad fix on a **real iPad / iOS Simulator** (headless/desktop CI cannot see the touch bug) before RA #14 can be marked RESOLVED.

**Plan Score:** 96/100 (v28 — Cycle 15, APPROVED; unchanged — implementation must match this contract, not revise it)
**Implementation Score:** 91/100 (v19 — plan v28 landed in `85854be`; below ≥95 gate on the flaky e2e gate / non-roster transition regression, RA #15)
**Current Score**: 78/100

## Score Breakdown

**Base Score:** 78/100
- Code correctness: 7/10 — plan v28 implemented faithfully, but a nondeterministic e2e gate (RA #15) fails `npm run test:e2e` intermittently; the underlying non-roster transform-transition is absent from the ready-state style (minor entrance regression).
- Plan compliance: 8/10 — all five phases implemented, no out-of-manifest drift; one DEVIATION (the non-roster transition handling causing RA #15) violates Phase 1.2 / Phase 5.1.
- Document coherence: 9/10 — README + `docs/IPAD_SCROLL_BUG.md` updated and honest; the bug doc is now git-tracked (F-16 resolved).
- Testing rigor: 6/10 — strong new unit coverage (84/84) and e2e additions, but one e2e test is flaky → the suite is not reliably green; the iOS touch gate cannot run without a matching simulator/runner here.
- Safety architecture: 9/10 — fail-closed iOS lane; probe inert by default and query-gated.
- Monitoring & observability: 8/10.
- **Feature completeness: 6/10 — the roster fix is implemented but NOT verified on the real iPad (the whole point); RA #14 stays live-but-in-progress until a real iOS touch PASS exists.**
- Risk management: 7/10 — a flaky gate risks masking future regressions; the iPad fix is code-complete but unproven on device.
- Sum 60/80 → base **78** (rounded up from 75, crediting the fully-built app, faithful five-phase implementation, and honest verification stance).

**Deductions:**
- Required Actions: **−0** — RA #14 (P0/HIGH) is **in progress** (code landed this cycle; staleness 2, below the 3+ stale threshold; active progress → no stall deduction). RA #15 (P1, flaky e2e gate) is **new** (staleness 0 → no stall deduction yet). RA #10 external/`BLOCKED` (−0).
- Backlog: **−0** — 1 unchecked `- [ ]` item (web app manifest / `start_url`, deferred per plan §13 Q4) → 1 pt per 2 items, round down → 0. Both iPad-robustness items marked `[x]` by the implementation (cache-busting done; iOS regression test wired into CI, device-verification pending).
- Inactivity decay: **−0** — **reset** from −5: `85854be` touches `src/`/`scripts/`/`native/`/`tests/`, ending the 5-cycle idle streak.
- **Final: 78 − 0 − 0 − 0 = 78/100.**

## Findings

- **MODERATE / F-17 (NEW):** The e2e test `roster has no transform ancestor while other screens keep scale entrance` (`tests/e2e/checkin.spec.mjs:154-179`, added by `85854be`) is **nondeterministic**. On a clean full-suite run the discriminator observed **1 failed / 14 passed** at line 179 (`expect(scanTransform.transition).toContain('transform')`); the same suite passed on subsequent runs, and the test passes in isolation. Root cause (verified in `src/styles.css:66-82`): the non-roster `transform` transition is declared only in `#app:not(.is-ready) .screen:not(.roster-screen)`; the ready-state selector `#app.is-ready .screen:not(.roster-screen)` sets `transform: scale(1)` with **no** transition, so non-roster screens inherit `transition: opacity` from base `.screen`. The test reads `getComputedStyle(...).transitionProperty` immediately after `setState('LOADING')`, which toggles `is-ready` off→on via rAF (`src/app.mjs:43-44`), so the observed property races the toggle. This also means the non-roster scale entrance transform **snaps** rather than animates — a minor regression vs Phase 1.2 / §4.1 ("other screens retain the visual scale entrance"). `npm run test:e2e` (Phase 5.1 gate) is intermittently red. Tracked as **RA #15**.
- **RESOLVED / F-16 (was INFO):** `docs/IPAD_SCROLL_BUG.md` is now **git-tracked** — `85854be` added it and the Cycle-15 note (`git ls-files docs/IPAD_SCROLL_BUG.md` hits; working tree clean). The critique's Path-to-100 issue #4 is closed.
- **RESOLVED / F-15:** `IMPLEMENTATION_PLAN_CRITIQUE.md` carries the full Cycle-15 plan critique (96/100) plus Implementation Verification v19 (91/100); no longer empty. (Watch for recurrence on the next new-cycle commit.)
- **HIGH / F-14 (carried, IN PROGRESS):** iPadOS roster touch-momentum scroll. The plan v28 fix landed in code (`.roster-screen { transform: none }`, base `.screen` no longer transforms — `src/styles.css:66-82,156`), but per plan Phase 5.2 and `docs/IPAD_SCROLL_BUG.md` the fix may NOT be marked verified on desktop/CI alone. **Still unverified on a real iPad / iOS Simulator** (the local runner lacks a matching device → `npm run test:ios-scroll` skips honestly). Tracked as **RA #14, IN PROGRESS** until a real iOS touch PASS exists.

## Required Actions

| # | Priority | Status | Raised | Staleness | Score Impact | Directive |
|---|----------|--------|--------|-----------|--------------|-----------|
| 15 | **P1 / MODERATE** | **OPEN (new)** | v58 | 0 | −0 (new, not stalled) | **Fix the flaky e2e gate (do NOT revise the plan).** Make `npm run test:e2e` reliably green: declare the non-roster `transform` transition in a selector present in the **ready** state — e.g. add `transition: opacity, transform` to a base `.screen:not(.roster-screen)` rule (or to `#app.is-ready .screen:not(.roster-screen)`) so the entrance transform actually animates (restoring Phase 1.2 / §4.1). Then harden `tests/e2e/checkin.spec.mjs:154-179` to sample a deterministic state (await stable `is-ready`, or assert the resting `transform` rather than the transient `transitionProperty`). Re-run `npx playwright test` several times to confirm 0 flakes. Keep `.roster-screen` at `transform: none`. |
| 14 | **P0 / HIGH** | **IN PROGRESS** (code landed `85854be`; device-unverified) | v56 | 2 | −0 (in progress, not stalled) | Plan v28 fix is implemented. **Verify on a real iPad / iOS Simulator** — provision a matching `CHECKIN007_IOS_DEVICE`/`CHECKIN007_IOS_RUNTIME` and run `CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll`, or run the manual real-iPad fallback and record the result in `docs/IPAD_SCROLL_BUG.md`. The fix may NOT be marked RESOLVED on desktop/CI evidence alone (per the bug doc / Phase 5.2). Do NOT bundle further changes (fade+block+kick+touch-action already regressed to "no scroll at all") unless the isolated transform removal is proven insufficient on device. |
| 10 | P2 / MODERATE | `BLOCKED (external billing)` | v37 | — | −0 (external / non-code-actionable) | Operator must clear GitHub billing, then push/rerun CI `33711898714`. Outside the code loop. |

**DONE / RESOLVED (not re-opened):** RA #11 (CSV data-loss) DONE; camera DONE; RA #12 (`mark007` query) RESOLVED & verified; RA #13 (check-in flow hit region) RESOLVED & verified; RA #1–#9 DONE.

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

<!-- audit-entry v57 -->
> **CYCLE 15 OPENED — plan v28 drafted & APPROVED at 96/100 (State 2 — implement the approved plan). NOT YET IMPLEMENTED → Implementation Score N/A. Empty critique (F-15) restored again. Score holds 75 (backlog −1 recovered by `[/]`, offset by 5th idle-code decay tick).**
> `282b164` ("plan: v28 — iPad scroll robustness cycle") replaced the completed Cycle-14 plan with a fresh Cycle-15 plan for **RA #14** (iPad roster touch-scroll) plus both open backlog items. Per the staleness rule the newer plan is reviewed fresh: **Plan Critique Cycle 15 Rev 1 = 96/100 — APPROVED** (`IMPLEMENTATION_PLAN_CRITIQUE.md`).
>
> **Nothing is implemented yet (trust nothing — verified against the tree):**
> - `git diff --name-only acaeeb1..HEAD -- src/ scripts/ native/ .github/ tests/ package.json` is **empty** — zero code drift since the v56 audit.
> - `git show --stat 282b164` = **2 files** (`IMPLEMENTATION_PLAN.md` +411/−144, `BACKLOG.md` +4/−4) — a plan/backlog commit only.
> - The plan's NEW files do not exist: `ls scripts/ios-scroll-smoke.mjs .github/workflows/ios-scroll.yml` → "No such file or directory". `grep -rn "scrollProbe|createScrollProbe|readRuntimeFlags" src/` → 0 hits.
> - The Cycle-14 code tree is byte-identical; all automated gates remain green (37/37 native, 78/13 web) — but RA #14 (P0/HIGH) is still live on the primary device.
>
> **Plan v28 factual claims independently verified against source (all accurate):**
> - `.screen` carries `transform: scale(0.985)` at rest with `#app.is-ready .screen { transform: scale(1) }` (`src/styles.css:66-76`); `.roster-screen` is `position:fixed` (`:148-150`); `.roster-list` is the touch scroller `overflow:auto; -webkit-overflow-scrolling:touch` (`:164-176`) — the transformed-fixed-ancestor root cause.
> - `src/app.mjs:43-44` toggles `is-ready` off then on via rAF each mount → the entrance transform re-runs at roster first paint.
> - `scripts/build.mjs:147-155` runs the size-budget check *before* `writeFile('dist/index.html')` — Phase 3's "keep budget checks before writing" is accurate.
> - `src/screens/roster.mjs:5,23,153,171-184` — `mountRoster` exports, `list = querySelector('.roster-list')`, scroll listener add/remove, and the cleanup return that the probe `dispose()` must be wired into.
> - `scripts/lib/static-server.mjs:103` emits `Cache-Control: no-store`; `.github/workflows/ci.yml:57-58` uploads `dist/index.html` (Phase 3.6 correctly widens to `dist/`).
> - `.prettierignore` already excludes `dist/` and `native/` → the generated manifest and Swift files won't trip `prettier --check` (a recurring prior-cycle concern that does NOT apply here).
>
> **Plan held at 96 (not higher):** the XCUITest→mobile-Safari WebView drive/read mechanism — the single hardest deliverable — is left as a conditional branch (read path, Safari-launch approach, and drag-start region unpinned), plus a `createScrollProbe` host-element contract wrinkle and a missing drag-vs-click edge case in §8. None blocking; the iOS lane fails closed and cannot emit a false pass. See `IMPLEMENTATION_PLAN_CRITIQUE.md` Cycle 15 Rev 1.
>
> **Score computation.**
> - **Base Score: 80/100.** Unchanged from v56 — all automated gates green, but feature completeness on the primary device stays broken until the fix lands (8-criteria sum 62/80).
> - **Required Actions: −0.** RA #14 (P0/HIGH) is **in progress** — plan v28 drafted & approved this cycle; staleness 1 (below the 3+ stale threshold) with active progress → no stall deduction. RA #10 external/`BLOCKED` (−0).
> - **Backlog: −0.** Both iPad-robustness items are now `[/]` (in progress, driven by approved plan v28) → strict-unchecked `- [ ]` = 0 (project precedent: `[/]` is not counted). Recovers the v56 −1.
> - **Inactivity decay: −5.** 5th consecutive audit with no `src/`/`scripts/`/`native/`/`tests/` commit (v53 −1 → v54 −2 → v55 −3 → v56 −4 → v57 −5, cap reached). Resets the moment plan v28's code lands.
> - **Final: 80 − 0 − 0 − 5 = 75/100.** Net-flat vs v56: the backlog recovery is exactly offset by the decay tick — "plan approved on paper, code still idle, defect still live."
>
> **F-15 recurred — empty critique restored again.** The `282b164` plan-v28 commit landed without a paired critique, leaving `IMPLEMENTATION_PLAN_CRITIQUE.md` at 0 bytes. Re-authored this cycle (v28 APPROVED 96/100 + State-2 disposition). **F-16 — `docs/IPAD_SCROLL_BUG.md` is untracked**; plan §5 must `git add` it on implementation.
>
> **Disposition — Cycle 15, State 2 (implement approved plan v28).** Next action: land Phases 1–5 — the isolated roster transform fix, the probe oracle (with `dispose()` wired into `mountRoster` cleanup), cache-busted artifacts, and the fail-closed iOS CI lane — then verify the iPad fix on a **real iPad / iOS Simulator** (never desktop/CI alone). Landing code resets the −5 decay and recovers feature completeness. RA #10 stays outside the code loop.
>
> **Required Actions status.** **#14** (P0/HIGH, iPad roster scroll) — **IN PROGRESS** (plan v28 approved, not implemented), staleness 1, **−0**; drives Cycle 15 implementation. **#10** (P2/MODERATE, CI external billing) — `BLOCKED`, external, **−0**. **#11** (CSV) DONE. **#12** (`mark007`) RESOLVED. **#13** (check-in flow) RESOLVED. Camera DONE.

<!-- audit-entry v56 -->
> **NEW HIGH DEFECT (RA #14) — iPad roster does not reliably touch-scroll on iPadOS Safari/standalone (the primary kiosk device's main screen). Cycle 14 stays COMPLETE & VERIFIED, but system health drops 94 → 75; a NEW CYCLE (15) must open to fix it. Empty critique file (F-15) restored.**
> The user reported that on a physical iPad (M4) the roster list scrolls inconsistently — "sometimes works, sometimes not; a reload breaks it; opening the search keyboard temporarily fixes it." Documented in `docs/IPAD_SCROLL_BUG.md`.
>
> **Independent verification against source (trust nothing — the doc's claims all check out):**
> - `.roster-list` **is** the scroller and **is** a descendant of a transformed fixed ancestor: `src/styles.css:164-176` (`flex:1; min-height:0; overflow:auto; -webkit-overflow-scrolling:touch; display:grid`) inside `.screen` `src/styles.css:55-76` (`position:fixed; inset:0`, resting `transform:scale(1)`, `scale(0.985)→scale(1)` over `--transition-ms`) and `.roster-screen` `:148-150` (`position:fixed`).
> - The entrance transform **re-runs on every mount**: `src/app.mjs:43-44` `setState()` removes `is-ready` then re-adds it on `requestAnimationFrame` — so the ancestor is actively transformed exactly when the roster list first paints.
> - The list is the **non-virtualized plain path** at 40 samples: `src/config.mjs:30` `VIRTUALIZE_THRESHOLD: 500` (40 < 500) — so this is not a virtual-list bug.
> - Platform matrix is consistent with an **iOS-WebKit-touch-momentum-init** defect: desktop Chrome/Blink wheel ✅, macOS Safari/WebKit trackpad ✅ (no touch-momentum layer), Android Chrome/Blink touch ✅, iPadOS WebKit touch ❌ — and the "tab-switch fixes / reload breaks" behavior is the classic relayout-reinitializes-the-scroll-layer signature.
> - **Cannot be reproduced in headless Chromium or desktop WebKit** (both scroll fine) — a genuine fix must be verified on a real iPad / iOS Simulator with touch and a cache-busted load. Any "fixed" claim from desktop/CI evidence alone is invalid for this bug (per `docs/IPAD_SCROLL_BUG.md`).
>
> **Cycle 14 (plan v27) is untouched and still COMPLETE & VERIFIED.** No code has changed since; `git diff --name-only 7e02de5..HEAD -- native/ src/ tests/` is empty (only the `acaeeb1` archive + untracked docs). Implementation Verification v18 = 98/100 stands for the doc-only cycle-14 scope. The scroll defect is **out of scope for v27** (it predates neither the report nor a covering plan) → this is a **new-cycle** trigger, not a cycle-14 fix.
>
> **F-15 — empty critique restored.** `acaeeb1` ("Archive cycle 9") archived the full critique history to `archive/cycle-9/IMPLEMENTATION_PLAN_CRITIQUE.md` and left the root `IMPLEMENTATION_PLAN_CRITIQUE.md` at **0 bytes**, so the canonical approval/verification record for plan v27 was missing. Reconstructed this cycle (v27 APPROVED 97/100 + Implementation Verification v18 = 98/100 VERIFIED + new-cycle disposition for RA #14).
>
> **Score computation.**
> - **Base Score: 80/100.** All automated gates remain green, but feature completeness on the primary device is broken (roster scroll) — 8-criteria sum 62/80 (see Score Breakdown), rounded to 80 crediting the fully-built app and the precise, fix-ready diagnosis.
> - **Required Actions: −0.** RA #14 (P0/HIGH) is new this version (staleness 0 — no stall deduction yet). RA #10 external/`BLOCKED` (−0).
> - **Backlog: −1.** 2 newly-added unchecked items (real-device touch-scroll CI test; iOS standalone cache-busting) → 1 pt / 2.
> - **Inactivity decay: −4.** 4th consecutive audit with no `native/`/`src/`/`tests/` commit. Now aligned with a real mandate — it resets when the scroll fix lands.
> - **Final: 80 − 0 − 1 − 4 = 75/100.**
>
> **Disposition — NEW CYCLE 15 REQUIRED (State 1, draft plan).** The generator must write a plan for RA #14: fix the iPadOS momentum-scroll defect, isolating one variable at a time, verified on a real iPad / iOS Simulator (headless/desktop CI cannot see this bug). Leading candidate: remove the transform from the roster's fixed ancestor permanently (fade-only entrance, `transform:none` at rest and during entrance) and change nothing else. Do not repeat the already-tried bundles listed in `docs/IPAD_SCROLL_BUG.md` (fade+block+kick+touch-action regressed to "no scroll at all"). Landing the fix resets the −4 decay and recovers feature completeness.
>
> **Required Actions status.** **#14** (P0/HIGH, iPad roster scroll) — OPEN, new, staleness 0, **−0**; drives Cycle 15. **#10** (P2/MODERATE, CI external billing) — `BLOCKED`, external, **−0**. **#11** (CSV) DONE. **#12** (`mark007`) RESOLVED. **#13** (check-in flow) RESOLVED. Camera DONE.

<!-- audit-entry v55 -->
> **CYCLE 14 IMPLEMENTED & VERIFIED (State 4 — COMPLETE). Implementation Verification v18 = 98/100 (≥95 gate cleared). Backlog fully CLOSED (2 → 0). Score holds 94 (backlog −1 recovered, offset by 3rd idle-code decay tick).**
> Commit `7e02de5` ("docs(§6): close Cycle 14 evidence gaps") implements approved plan v27. It is a
> **documentation-only** cycle and lands **exactly** the two §5 manifest files: `IMPLEMENTATION_PLAN.md` (§14
> completion boxes marked, plan-sanctioned by Phase 4) and `docs/VERIFICATION_EVIDENCE.md` (append-only
> Cycle-14 subsection). `git show 7e02de5 -- docs/VERIFICATION_EVIDENCE.md` = 58 insertions / 0 deletions.
>
> **Independent verification (trust nothing):**
> - **§5 manifest exact / zero code drift.** `git diff --name-only 53a9c48..HEAD -- native/ src/ tests/
>   scripts/ .github/ package.json` is **empty**; `git show --stat 7e02de5` = the two §5 files only.
> - **Code tree byte-identical to the reproduced 37/37 tree.** `git diff --name-only 8db9fd6..HEAD -- native/
>   src/ tests/` empty → v15/v52 native (37/37) + v53 web (78/13, build 26,315 gzip, `dist/index.html` 70,584
>   bytes SHA-256 `8d5a9c65…`) stand byte-for-byte. No runtime behavior changed.
> - **Backlog item 1 (swipeUp back-port) — closed.** Plan §4.3 (71–75) + §7.3 (150–155) and evidence
>   "Lazy admin Form navigation — REQUIRED CONTRACT" record the required `sheet.swipeUp()` → `admin.clearLog`
>   → `admin.clearLog.confirm` order; byte-accurate to shipped `CheckIn007UITests.swift:106`.
> - **Backlog item 2 (§4.1 diagnostic capture) — closed.** Evidence reproduces the pre-fix failure at detached
>   `50b4357` (independently confirmed to lack `.frame(maxWidth: .infinity)` — only the unrelated inner
>   `.contentShape` at `:42`; current HEAD carries `:68`/`:69`): exit 65 at unchanged missing `scan.status`;
>   machine counts over the **complete** 12,831-byte attachment = roster.row=12 / scan.status=0 (§4.1 invariant
>   over the whole payload); one sanitized redacted excerpt; temp worktree/instrumentation/DerivedData/bundles
>   deleted, none committed.
> - **Honest, plan-anticipated tool deviation.** `xcresulttool export --only-failures` skipped the custom
>   attachment (manifest `isAssociatedWithFailure: false` despite `.keepAlways`); it was exported by exact test
>   ID instead — the §7.2 recovery path, "did not change the run, payload, or validation invariants." Not a
>   defect; strengthens credibility.
> - **Current health separated from historical FAIL (§7.4).** Evidence labels `50b4357` run `EXPECTED FAIL`
>   and current-tree runs `PASS` (37/37 native, 78/13 web, `dist/` untracked), distinct SHAs; CI
>   `33711898714` kept `BLOCKED (external billing)`.
>
> **Score computation.**
> - **Base Score: 97/100.** Fully-green, independently-verified Cycle-13 health + a clean, plan-compliant,
>   now-implemented Cycle-14 that closed both open evidence gaps. The −3 from 100 is the intrinsic **external
>   CI verification gap** (RA #10): the deployment path cannot be confirmed end-to-end while billing is locked.
> - **Required Actions: −0.** RA #12 + RA #13 RESOLVED & verified; RA #11 + camera DONE. RA #10 is MODERATE,
>   **external (billing) / non-code-actionable** — honestly `BLOCKED`, not a stalled code P0/P1 (precedent
>   v45–v54).
> - **Backlog: −0.** Both Cycle-13 follow-ups now `[x]` → **0 unchecked / 17 `[x]`** → backlog fully closed.
>   (Recovers the v54 −1.)
> - **Inactivity decay: −3.** 3rd consecutive audit with **no** `native/`/`src/`/`tests/` change. Cycle 14 was
>   documentation-only **by design**, so — as the v54 audit and Plan Rev 1 both foretold — landing it recovers
>   the backlog point but does **not** reset the code-movement decay. v53 −1 → v54 −2 → v55 −3.
> - **Final: 97 − 0 − 0 − 3 = 94/100.** (Net-flat vs v54: the backlog recovery is exactly offset by the decay
>   tick — an honest signal that the cycle did real, complete work while the *code* remained idle.)
>
> **Implementation Verification v18 = 98/100 (VERIFIED).** Only reason it is not 100: the pre-fix reproduction's
> specific artifact metrics (12,831 bytes, 12 `roster.row.`) were not independently *re-run* by the
> discriminator this cycle (a full native re-run of the detached tree); the diagnosis itself was independently
> confirmed at source level and at Plan Rev 1, and current-tree 37/37 rests on a byte-identical, previously
> reproduced tree. Non-blocking.
>
> **Disposition — Cycle 14 COMPLETE (State 4).** Plan approved (97) and implemented at 98/100 (≥95 cleared);
> both backlog items closed. No fix cycle required. The project is healthy and essentially feature-complete;
> the only remaining runtime residual is RA #10 (external CI billing), which is **not code-actionable** —
> an operator must clear billing, then push/rerun `33711898714`. With the backlog closed and no code changes
> possible without new scope, the score is now pinned at the decay floor: to lift it, the team either resolves
> RA #10 externally or opens a new cycle with genuine `native/`/`src/`/`tests/` work (which resets decay).
> Manufacturing churn is not warranted; the honest state is "complete and idle."
>
> **Required Actions status.** **#10** (P2/MODERATE, CI external billing) — external / non-code-actionable;
> honestly `BLOCKED`, **−0**. **#11** (P1, CSV) — DONE. **#12** (P1, `mark007` query) — RESOLVED & verified.
> **#13** (P1, check-in flow) — RESOLVED & verified. Camera — DONE.

<!-- audit-entry v54 -->
> **CYCLE 14 OPENED — PLAN v27 APPROVED (97/100), NOT YET IMPLEMENTED (State 2). Implementation Score N/A. Score 95 → 94 (2nd idle code cycle; backlog still 2 open).**
> `53a9c48` ("plan: v27 — close Cycle 13 evidence gaps") replaced the completed Cycle-13 plan (v26) with a new,
> documentation-only Cycle-14 plan targeting the two `BACKLOG.md` follow-ups Audit v53 tracked. Per the
> staleness rule the newer plan is reviewed fresh: **Plan Critique Cycle 14 Rev 1 = 97/100 — APPROVED**
> (`IMPLEMENTATION_PLAN_CRITIQUE.md`). `git show --stat 53a9c48` = **1 file** (`IMPLEMENTATION_PLAN.md`); the
> second §5 deliverable `docs/VERIFICATION_EVIDENCE.md` has **no Cycle-14 subsection** (`grep "Cycle-14"` = 0)
> and the tree is clean → **nothing is implemented yet.**
>
> **v27 factual claims independently verified against git (trust nothing):**
> - **Pre-fix commit correct.** `git log 7c51af4..8db9fd6`: `50b4357` → `5e80c8b` → `8db9fd6`, so `50b4357`
>   is the approved-plan commit immediately before implementation `5e80c8b`. At `50b4357` `RosterView.swift`
>   has **no** `.frame(maxWidth: .infinity …)` (the full-width hit target now at current `:68`) and
>   `CheckIn007UITests.swift:61,80` still query `app.otherElements[A11yId.mark007]` — genuinely pre-fix.
> - **Reproduction premise holds.** At `50b4357` `testFirstCheckInFlow` taps `firstRow` (`:27`) then asserts
>   `scan.waitForExistence(timeout: 5)` (`:29–30`); with the pre-fix dead hit region that assertion fails —
>   exactly the target §4.1 names.
> - **Back-port is byte-accurate.** Current `CheckIn007UITests.swift:106` `sheet.swipeUp()` precedes required
>   `admin.clearLog` (`:108`) and `admin.clearLog.confirm` (`:112–113`); current `RosterView.swift:68–69`
>   carries the full-width fix. The §4.3/§7.3 contract v27 back-ports matches shipped code.
> - **Inventory/env consistent.** 33 unit + 4 UI = 37; 78 web unit / 13 Playwright; Node 24.20.0; Xcode 26.4
>   (`17E192`), iOS 26.4 (`23E244`), iPad `A155995F-…` — all agree with v52/v53.
>
> **Prior Cycle-13 implementation unchanged & still VERIFIED.** `git diff --name-only 8db9fd6..HEAD --
> native/ src/ tests/` is **empty**; the v52-reproduced 37/37 native and v53-reproduced 78/13 web
> (build 26,315 gzip bytes; `dist/index.html` 70,584 bytes, SHA-256 `8d5a9c65…`) stand byte-for-byte.
> Implementation Verification v16 = 97/100 (Cycle 13) remains VERIFIED. Cycle 14 does not touch code.
>
> **Score computation.**
> - **Base Score: 97/100.** Fully-green, independently-verified Cycle-13 health + a clean, accurate,
>   approved Cycle-14 plan. The −3 from 100 is the intrinsic **external CI verification gap** (RA #10):
>   the deployment path cannot be confirmed end-to-end while billing is locked.
> - **Required Actions: −0.** RA #12 + RA #13 RESOLVED & verified; RA #11 + camera DONE. RA #10 is MODERATE,
>   **external (billing) / non-code-actionable** — honestly `BLOCKED`, not a stalled code P0/P1, so no stall
>   deduction (precedent-consistent v45–v53).
> - **Backlog: −1.** 2 unchecked `[ ]` (swipeUp plan back-port + §4.1 diagnostic capture) / 15 `[x]` →
>   1 point per 2 items → −1. These are still open; plan v27 is approved to close them but **not yet
>   implemented**, so the deduction stands.
> - **Inactivity decay: −2.** Second consecutive audit cycle with **no** `native/`/`src/`/`tests/` change
>   (only audit + plan commits since v52's code landed). v53 was −1; this increments to −2. Note: because
>   the remaining Cycle-14 work is documentation-only, implementing v27 will close the backlog (recovering
>   −1) but will **not** reset this code-movement decay.
> - **Final: 97 − 0 − 1 − 2 = 94/100.**
>
> **Disposition — Cycle 14, State 2 (implement approved plan v27).** The loop advanced State 4 (Cycle 13
> complete) → new cycle → plan approved → **implement**. Next action: land the two §5 manifest files
> (documentation only) — back-port the swipeUp scroll into the plan/evidence and capture the sanitized
> pre-fix hierarchy at `50b4357`, then re-verify current native/web gates and mark §14. Closing both backlog
> items recovers the −1; the −2 decay persists until a `native/`/`src/`/`tests/` commit lands (none is
> planned this cycle, by design). RA #10 remains outside the code loop (operator must clear billing, then
> push/rerun `33711898714`).
>
> **Required Actions status.** **#10** (P2/MODERATE, CI external billing) — external / non-code-actionable;
> honestly `BLOCKED`, **−0**. **#11** (P1, CSV) — DONE. **#12** (P1, `mark007` query) — RESOLVED & verified.
> **#13** (P1, check-in flow) — RESOLVED & verified. Camera — DONE.

<!-- audit-entry v53 -->
> **STATE 4 — CYCLE-13 RE-AUDIT: STILL COMPLETE & VERIFIED (Implementation Score 97/100). Web gates re-reproduced, source re-verified. Score 96 → 95 (onset of inactivity decay + 2 newly-tracked backlog items).**
> This is a re-audit of the already-complete Cycle 13. No code has landed since the v52 audit: HEAD is still
> `0f8a230` (the v52 audit commit), and `git diff --name-only 8db9fd6..HEAD -- native/ src/ tests/` is **empty**.
> The working tree is clean.
>
> **Independent re-verification this cycle (trust nothing / re-check, not re-cite):**
> - **Source re-read — all four plan edits present & correct:**
>   - **§4.1** `RosterView.swift:68–69` — `.frame(maxWidth: .infinity, alignment: .leading)` + `.contentShape(Rectangle())` after the row-label padding; `.buttonStyle(.plain)`, `.isButton`, 44-pt `minHeight` preserved. **COMPLIANT.**
>   - **§4.2** `ResultView.swift` — child `Text(displayName)` (`:19`) carries no identifier; VStack applies
>     `.accessibilityElement(children: .combine)` (`:34`) → label (`:35–37`) → `.accessibilityIdentifier(A11y.resultTitle)` (`:38`). Combined `StaticText` queryable; label byte-for-byte. **COMPLIANT.**
>   - **§4.3** `CheckIn007UITests.swift:81,101` — both `app.buttons[A11yId.mark007]`; **0** `otherElements[…mark007]`. **COMPLIANT.**
>   - **§4.4** `requireExists` (`:22–38`) matches the plan spec verbatim; applied to `scan.status`, `result.title`,
>     `mark007`, admin-sheet, roster-return; audio-toggle branch kept optional. **COMPLIANT.**
> - **Web gates re-run on the discriminator's own hardware, this cycle:** `node --test tests/unit/*.test.mjs`
>   = **78/78 pass, 0 fail**; `npx prettier --check .` clean; `npx playwright test` = **13/13**;
>   `node scripts/build.mjs` = **26,315 gzip bytes**; `dist/index.html` = **70,584 bytes**, SHA-256
>   `8d5a9c65f83ed417acdd48cc367ce3663e60ff35a64008c0c5687cb7b2d9a744`, untracked — **byte-for-byte vs
>   `docs/VERIFICATION_EVIDENCE.md`.**
> - **Native suite (37/37):** not re-run this cycle — the Swift tree is byte-identical to `8db9fd6`, which the
>   discriminator independently reproduced at 37/37 (0 fail / 0 skip, exit 0) in v52. Re-running identical code
>   would reproduce the identical `.xcresult`; the prior independent reproduction stands.
>
> **Implementation Verification v16 = 97/100 (VERIFIED, re-audit).** Unchanged from v15 — cycle remains complete.
> The one non-blocking DEVIATION (`testClearLogRequiresTwoConfirmations` `sheet.swipeUp()` to reach the
> below-viewport `dangerSection`) still weakens no assertion (both confirm identifiers required in order) and is
> still absent from the plan text — now tracked in `BACKLOG.md` so it cannot rot.
>
> **Score computation (restructured vs v52 to avoid double-counting the swipeUp drift, now a backlog line item).**
> - **Base Score: 97/100.** Fully-green native (37/37, reproduced v52) + web (re-reproduced v53) + clean,
>   plan-compliant source. The −3 from 100 is the intrinsic **external CI verification gap** (RA #10): the
>   deployment path cannot be confirmed end-to-end while billing is locked. (The swipeUp plan↔code drift and the
>   §4.1 diagnostic-capture gap are no longer folded into base — they are the two backlog items below.)
> - **Required Actions: −0.** RA #12 + RA #13 ADDRESSED & verified. RA #10 is MODERATE **and external
>   (billing) / non-code-actionable** — honestly `BLOCKED`, not a stalled code P0/P1, so no stall deduction
>   (precedent-consistent with v45–v52). RA #11 + camera DONE.
> - **Backlog: −1.** 2 unchecked `[ ]` (swipeUp plan back-port + §4.1 diagnostic capture) / 15 `[x]`
>   → 1 point per 2 items → −1.
> - **Inactivity decay: −1.** First audit cycle with **no code change** since the code landed in v52
>   (`git diff native/ src/ tests/` empty). The code cycle is complete, but the mechanical decay tracks code
>   movement; a −1 nudge is honest now that the project sits idle with two small doc/evidence items open.
> - **Final: 97 − 0 − 1 − 1 = 95/100.**
>
> **Disposition — Cycle 13 remains COMPLETE (State 4).** Plan v26 approved (96) and implemented at 97/100
> (≥95 gate cleared), re-verified. No fix cycle required. To recover to ≥96 and toward 100, the generator can
> close the two `BACKLOG.md` items (back-port the swipeUp scroll into the plan text; archive the §4.1 post-tap
> hierarchy capture) — both are pure documentation/evidence work, no product-code change. The only runtime
> residual is RA #10 (external CI billing), which requires operator action (clear billing, then push/rerun
> `33711898714`) and is outside the code loop.
>
> **Required Actions status.** **#10** (P2/MODERATE, CI external billing) — external / non-code-actionable;
> honestly `BLOCKED`, **−0**. **#11** (P1, CSV) — DONE. **#12** (P1, `mark007` query) — **RESOLVED & verified**
> (0 old queries, 2 button queries). **#13** (P1, check-in flow) — **RESOLVED & verified** (methods 1–2 reach
> `scan.status`/`result.title`). Camera — DONE.

<!-- audit-entry v52 -->
> **STATE 4 — CYCLE-13 IMPLEMENTATION VERIFIED & COMPLETE: FULL NATIVE SUITE GREEN (independently reproduced). Implementation Score 97/100. Score 87 → 96.**
> Commits `5e80c8b` (`feat(§6): repair native UI interaction paths`) + `8db9fd6` (`docs(§6): record Cycle 13
> verification results`) landed plan v26. `git diff --name-only 50b4357..8db9fd6` shows exactly the six
> manifest files (`RosterView.swift`, `ResultView.swift`, `CheckIn007UITests.swift`, `IMPLEMENTATION_PLAN.md`,
> `README.md`, `docs/VERIFICATION_EVIDENCE.md`) — **no out-of-manifest drift**.
>
> **Independent verification by the discriminator (not trusting the generator's evidence):**
> - **Native scheme re-run.** `xcodebuild test -project native/CheckIn007.xcodeproj -scheme CheckIn007` on iPad
>   (A16) `A155995F-EC83-41BE-95B2-1A5F390ABF59`, fresh temp DerivedData + result bundle, **exit 0**.
>   `xcresulttool` inventory: **37 total / 37 passed / 0 failed / 0 skipped**, `result: Passed`. Both bundles
>   green: `CheckIn007Tests` (33 unit across 6 suites — `CSVCodecTests`, `CameraPrivacyTests`,
>   `CheckInStoreTests`, `GuestCatalogTests`, `LogMergerTests`, `ScanAudioPlayerTests`) and `CheckIn007UITests`
>   (4/4: `testFirstCheckInFlow`, `testRepeatGuestDoesNotDuplicateOneScan`, `testAdminOpensToggleAudioAndCloses`,
>   `testClearLogRequiresTwoConfirmations`). **This is the first fully-green native gate across the entire
>   13-cycle saga, reproduced on the discriminator's own hardware.**
> - **Web gates re-run.** `node --test tests/unit/*.test.mjs` = 78/78; `npx prettier --check .` clean;
>   `npx playwright test` = 13/13; `node scripts/build.mjs` = 26,315 gzip bytes; `dist/index.html` = 70,584 bytes,
>   SHA-256 `8d5a9c65f83ed417acdd48cc367ce3663e60ff35a64008c0c5687cb7b2d9a744`, untracked. **All match
>   `docs/VERIFICATION_EVIDENCE.md` byte-for-byte** — the recorded evidence is accurate, not optimistic.
>
> **Plan compliance (source-verified):**
> - **§4.1 RA #13 activation — COMPLIANT.** `RosterView.swift` adds `.frame(maxWidth: .infinity, alignment:
>   .leading)` + `.contentShape(Rectangle())` after `.padding(.vertical, …)` on the row label. Full-width
>   rectangular hit region; `.buttonStyle(.plain)`, `.isButton`, and 44-pt minimum preserved.
> - **§4.2 RA #13 identity — COMPLIANT.** `ResultView.swift` removes `.accessibilityIdentifier(A11y.resultTitle)`
>   from the child `Text` and reapplies it on the VStack **after** `.accessibilityElement(children: .combine)`
>   (`:34`) and `.accessibilityLabel` (`:35–37`) → `:38`. Combined element stays a queryable `StaticText`; label
>   byte-for-byte unchanged.
> - **§4.3 RA #12 query — COMPLIANT.** Both `mark007` call sites changed `app.otherElements[…]` →
>   `app.buttons[…]`; product identifier, label, `.isButton`, and 2.2 s press unchanged.
> - **§4.4 diagnostics — COMPLIANT.** `requireExists` helper added verbatim to §4.4 spec (failure-only
>   `app.debugDescription` attachment, same timeout, caller attribution via `#filePath`/`#line`, no retry/tap).
>   Applied to `scan.status`, `result.title`, `mark007`, admin-sheet, and roster-return; audio-toggle branch
>   kept optional.
> - **§4.5 CI truth — COMPLIANT.** README + evidence retain `BLOCKED (external billing)` for run
>   `33711898714`; no artifact claimed, no PASS inferred.
>
> **One DEVIATION (improvement — back-port to plan, not a defect):** `testClearLogRequiresTwoConfirmations`
> adds `sheet.swipeUp()` after opening the admin sheet. The clear-log control sits in the 5th of 6 `Form`
> sections (`AdminSheet.swift:97` `dangerSection`) and was below the viewport in the lazy `Form`; the scroll
> brings it into the hittable region. This is **not** an assertion weakening/skip/lengthen (§2 out-of-scope) —
> both confirmation identifiers (`admin.clearLog` → `admin.clearLog.confirm`) remain required in order — and it
> is transparently documented in the evidence. It diverges from the plan's literal "clear-log gesture unchanged"
> wording and should be back-ported into the plan text next revision. Minor.
>
> **Score computation.**
> - **Base Score: 96/100.** Excellent, independently-verified health. −4 reflects the single open external CI
>   verification gap (RA #10 — the deployment path cannot be confirmed via CI while billing is locked) and the
>   minor plan↔code drift (swipeUp not yet in the plan text).
> - **Required Actions: −0.** RA #12 + RA #13 now **ADDRESSED & verified** (37/37 green). RA #10 is MODERATE and
>   external (billing) — not a code-actionable stalled P0/P1, honestly dispositioned as `BLOCKED`, so no stalled
>   deduction applies. RA #11 + camera remain DONE.
> - **Backlog: −0.** 0 unchecked `[ ]` / 15 `[x]`.
> - **Inactivity decay: −0 (reset from −1).** Code landed this cycle (`5e80c8b` touches `native/`), resetting the
>   two-cycle idle decay.
> - **Final: 96/100.**
>
> **Disposition — Cycle 13 COMPLETE (State 4).** Plan v26 approved (96) and implemented at 97/100 (≥95 gate
> cleared), independently verified. No fix cycle required. The only residual is RA #10 (external CI billing),
> which requires operator action (clear billing, then push/rerun `33711898714`) — outside the code loop. If a
> new cycle opens, its sole candidate is verifying the CI path once billing clears; there is no open code work.
>
> **Required Actions status.** **#10** (P2/MODERATE, CI external billing) — staleness carried, but external and
> non-code-actionable; honestly `BLOCKED`, **−0**. **#11** (P1, CSV) — DONE. **#12** (P1, `mark007` query) —
> **RESOLVED & verified this cycle** (0/0 old queries, 2 button queries, 4/4 admin+flow green). **#13** (P1,
> check-in flow) — **RESOLVED & verified this cycle** (methods 1–2 reach `scan.status`/`result.title`). Camera —
> DONE.

