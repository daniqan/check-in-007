# Consolidated Audit — Check-In 007

<!-- score:plan 96 -->
<!-- score:implementation N/A -->
<!-- score:current 81 -->

**Current Score**: 81/100
**Audit Version:** v60
**Audited:** HEAD `06d9bc5` on 2026-09-03. **CYCLE 16 OPENED — plan v29 (web app manifest / standalone `start_url`) drafted & APPROVED at 96/100 (State 2 — implement the approved plan). NOT YET IMPLEMENTED → Implementation Score N/A. Empty critique (F-15) restored again. Score 82 → 81 (first idle-code cycle since the `f551d4a` reset → decay −1).** `06d9bc5` ("plan: v29 — web app manifest start url cycle") replaced the completed Cycle-15 plan with a fresh Cycle-16 plan for the **last open backlog item** (web app manifest / `start_url`). Per the staleness rule the newer plan is reviewed fresh: **Plan Critique Cycle 16 Rev 1 = 96/100 — APPROVED** (`IMPLEMENTATION_PLAN_CRITIQUE.md`). **Nothing is implemented yet (trust nothing — verified against the tree):** the plan's NEW files are absent (`manifest.webmanifest`, `assets/icons/check-in-007-icon.svg`, `…-192.png`, `…-512.png` → "MISSING"); `grep -n "manifest" index.html` → 0 hits; `grep "createWebAppManifest|writeWebAppManifestArtifacts|webmanifest" scripts/build.mjs` → 0 hits; `git diff --name-only 06d9bc5..HEAD` empty; `git show --stat 06d9bc5` = 2 files only (`IMPLEMENTATION_PLAN.md` +271/−255, `BACKLOG.md` +2/−2). The Cycle-15 code tree is byte-identical and all automated gates remain green. **RA #14 (the iPad touch-scroll fix) is code-complete but device-unverified** — with a 4th cycle now passing and no device/simulator in this environment, it is **reclassified to `BLOCKED (env / device)`** (RA #10 precedent) so it does not rot as a phantom stall; the code fix is done, only a real-iPad PASS remains.

**Stage:** Cycle 16 **State 2 — IMPLEMENT THE APPROVED PLAN** (Plan v29 = 96 ≥ 95; Implementation = N/A, not yet built). Next action: land Phases 1–5 of plan v29 — the source `manifest.webmanifest` + committed icons, the build-generated `dist/check-in-007.webmanifest` with a content-hashed `start_url`, the `.webmanifest` MIME entry in the static helper, unit/e2e coverage, and README/evidence docs — then have the discriminator run Implementation Verification. Landing code resets the −1 decay. Do **not** revise the plan to pass a future audit; the plan is the contract.

**Plan Score:** 96/100 (v29 — Cycle 16, APPROVED; first review)
**Implementation Score:** N/A (plan v29 approved but NOT yet implemented — none of the §5 NEW files exist)
**Current Score**: 81/100

## Score Breakdown

**Base Score:** 82/100
- Code correctness: 9/10 — the Cycle-15 State-3 fix (`f551d4a`) repairs the non-roster entrance transition and stabilizes the e2e gate; reliably green (unit 84/84 + e2e 15/15 reproduced this cycle).
- Plan compliance: 9/10 — Cycle 15 fully faithful; Cycle 16 not yet built (N/A, not a compliance debit — the plan is approved and awaiting implementation).
- Document coherence: 9/10 — README + `docs/IPAD_SCROLL_BUG.md` honest and git-tracked.
- Testing rigor: 8/10 — 84/84 unit + reliably-green e2e. Not 9: the iOS touch gate is installed but cannot execute here (no simulator/device), so the iPad-scroll regression coverage is unexercised.
- Safety architecture: 9/10 — fail-closed iOS lane; probe inert by default and query-gated.
- Monitoring & observability: 8/10.
- **Feature completeness: 6/10 — the roster fix is code-complete but STILL NOT verified on a real iPad; RA #14 remains unproven on device. This is the honest cap.**
- Risk management: 8/10 — the flaky-gate risk is gone; the iPad fix remains code-complete but unproven on device.
- Sum 66/80 → base **82**.

**Deductions:**
- Required Actions: **−0** — RA #14 (P0/HIGH) **reclassified to `BLOCKED (env / device)`** this cycle: the full code fix is implemented and the follow-on gate defect fixed in Cycle 15; the sole remaining step (real-device touch verification) is **environmentally impossible here** (no iPadOS simulator/device), so — per the v59 directive and the RA #10 billing precedent — it is a bounded env-block, not a stalled code action (−0). RA #10 external/`BLOCKED` (−0).
- Backlog: **−0** — 0 strict-unchecked `- [ ]` items. The sole remaining item (web app manifest / `start_url`) is `[/]` (in progress, driven by approved plan v29); project precedent counts only strict `- [ ]` → round down to 0.
- Inactivity decay: **−1** — 1st audit since the `f551d4a` reset with **no** `src/`/`scripts/`/`native/`/`tests/` commit (only the `c5d3049` archive + the `06d9bc5` plan/backlog commit). Resets the moment plan v29's code lands.
- **Final: 82 − 0 − 0 − 1 = 81/100.**

## Findings

- **HIGH / F-14 (carried, code-complete, env-BLOCKED on device):** iPadOS roster touch-momentum scroll. The plan v28 fix is fully landed (`.roster-screen { transform: none }`, base `.screen` no longer transforms; non-roster entrance animates correctly — `src/styles.css:66-86,158-161`), gates reliably green. Per plan Phase 5.2 and `docs/IPAD_SCROLL_BUG.md` the fix may NOT be marked verified on desktop/CI alone, and **no real iPad / iOS Simulator exists in this environment** (`npm run test:ios-scroll` skips honestly, fails closed when required). With a 4th cycle passing and no path to a device here, RA #14 is **reclassified `BLOCKED (env / device)`** (RA #10 precedent) — code done, only a real-iPad PASS remains. Feature completeness stays 6/10 → this is why system health is 81, not higher.
- **RECURRED / F-15:** `IMPLEMENTATION_PLAN_CRITIQUE.md` was **0 bytes** again after the `06d9bc5` plan-v29 commit (the Cycle-9 archive left it empty and the new-cycle commit did not repopulate it). Restored this cycle with the full Cycle-16 plan critique (96/100). This is the **fourth** recurrence of the empty-critique pattern on a new-cycle/archive commit (v53/F-15, v56/F-15, v57/F-15, v60/F-15) — a durable process gap (see Required Action **#16**).
- **RESOLVED / F-17 (Cycle 15):** the flaky e2e test `roster has no transform ancestor…` is deterministic — reproduced green this cycle (unit 84/84, e2e 15/15). RA #15 closed.
- **RESOLVED / F-16 (Cycle 15):** `docs/IPAD_SCROLL_BUG.md` is git-tracked.

## Required Actions

| # | Priority | Status | Raised | Staleness | Score Impact | Directive |
|---|----------|--------|--------|-----------|--------------|-----------|
| 16 | P3 / LOW | **OPEN** (new) | v60 | 0 | −0 | **Stop the empty-critique recurrence (F-15, 4th time).** Each new-cycle/archive commit that replaces `IMPLEMENTATION_PLAN.md` leaves `IMPLEMENTATION_PLAN_CRITIQUE.md` at 0 bytes. When the generator opens a cycle, it should either (a) carry the fresh plan critique in the same commit, or (b) the archive step should not blank the root critique. Low priority (the discriminator restores it each run) but it wastes a cycle's worth of the canonical approval record. |
| 14 | **P0 / HIGH** | **BLOCKED (env / device)** — code-complete, device verification impossible here | v56 | 4 | −0 (env-blocked, code done — not a stall) | Code fix complete and gates green. **Verify on a real iPad / iOS Simulator** — provision a matching `CHECKIN007_IOS_DEVICE`/`CHECKIN007_IOS_RUNTIME` and run `CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run test:ios-scroll`, or run the manual real-iPad fallback and record the PASS in `docs/IPAD_SCROLL_BUG.md`. May NOT be marked RESOLVED on desktop/CI evidence alone (per the bug doc / Phase 5.2). Do NOT bundle further scroll changes unless the isolated transform removal is proven insufficient on device. **Reclassified to `BLOCKED (env)` at v60** (RA #10 precedent) so a device-impossible verification does not accrue phantom stall deductions; revisit when a device/simulator becomes available. |
| 10 | P2 / MODERATE | `BLOCKED (external billing)` | v37 | — | −0 (external / non-code-actionable) | Operator must clear GitHub billing, then push/rerun CI `33711898714`. Outside the code loop. |

**DONE / RESOLVED (not re-opened):** RA #15 (flaky e2e gate) RESOLVED; RA #11 (CSV data-loss) DONE; camera DONE; RA #12 (`mark007` query) RESOLVED & verified; RA #13 (check-in flow hit region) RESOLVED & verified; RA #1–#9 DONE.

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

