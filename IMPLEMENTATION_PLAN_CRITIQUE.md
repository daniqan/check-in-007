# iPad Scroll Robustness Plan Critique — Cycle 15, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `282b164`
**Plan Under Review:** `IMPLEMENTATION_PLAN.md` v28 (Cycle 15)
**Score:** **96 / 100** (previous: v27 Cycle-14 approved 97 — different scope; this is a fresh plan for RA #14)
**Status:** APPROVED (≥95 gate cleared)

Plan v28 is a strong, source-grounded, single-variable-first plan for the reported iPadOS
touch-scroll defect (RA #14 / F-14). It correctly isolates the leading fix (remove the roster
ancestor transform) from the change-bundles that already regressed to "no scroll at all," adds a
query-gated scroll oracle for real-device verification, wires a fail-closed self-hosted iOS CI
lane, and adds cache-busted artifacts — addressing RA #14 plus both open backlog items. It clears
the gate. What holds it at 96 is the underspecified XCUITest→mobile-Safari WebView drive/read
mechanism (the single hardest deliverable), a small probe-host contract wrinkle, and one missing
touch edge case.

## Scope Check

**Scope is fully adequate — no cap applied.**

- **RA #14 (P0/HIGH, iPad roster scroll)** — ADDRESSED (Phase 1: remove `.roster-screen` ancestor
  transform, `transform:none` at rest and during entrance, other screens' entrance preserved).
- **Backlog item 1 (real-device / iOS-Simulator touch-scroll CI test)** — ADDRESSED (Phase 4:
  `scripts/ios-scroll-smoke.mjs` + `.github/workflows/ios-scroll.yml`, fail-closed when required).
- **Backlog item 2 (iOS standalone / Add-to-Home-Screen cache-busting)** — ADDRESSED (Phase 3:
  content-hashed HTML twin + manifest beside `index.html`, `no-store` asserted for both).
- **RA #10 (external CI billing)** — correctly OUT OF SCOPE (external / operator-actionable; §2).

The plan addresses every applicable open code issue. Alternatives are evaluated for each key
decision (§4.1–4.4 each carry a "Why over alternatives"/"Rejected alternatives" paragraph).
Integration is analyzed (§7, five integration points). No scope adequacy cap.

## Remaining issues (Path to 100 — none blocking)

1. **XCUITest→mobile-Safari WebView drive/read mechanism is underspecified (feasibility /
   specificity — highest-signal gap).** The entire point of the cycle is proving *real iOS touch*
   scroll, and the automation that does so is the hardest technical element, yet the plan leaves
   it as a conditional branch: §4.3 / Phase 4.2 say "add the focused web UI test target/scheme
   *only if* the existing native UI test target cannot launch Safari/WebKit independently." Three
   concrete sub-decisions are not pinned:
   - **How the probe text is read back.** The probe renders `#scroll-probe-status` with an
     "accessibility-friendly label," but the plan never states that XCUITest reads it via, e.g.,
     `safari.webViews.staticTexts[...]` / `descendants(matching: .staticText)` — i.e. that WKWebView
     exposes the probe node to the XCUITest accessibility tree. This is the load-bearing assumption
     of the whole oracle and is left implicit.
   - **How Safari is driven.** Whether the test attaches to `XCUIApplication(bundleIdentifier:
     "com.apple.mobilesafari")`, types the hashed probe URL, and dismisses first-run/keep-tabs
     prompts — vs. hosting a WKWebView in a thin test harness app — is left open.
   - **Coordinate drag target.** The synthesized press-drag must land in the roster list region.
     A drag that begins on a `.guest-row` button and moves only slightly can still fire a click →
     `onSelect` → navigate to SCAN (roster unmounts, probe disappears) — a false failure. The plan
     doesn't state the drag must start in a non-row area or exceed the click-cancel threshold.
   *Fix:* pin the read path (WebView StaticText query), the Safari-launch approach, and the drag
   start region. None of this blocks approval — the lane fails closed and cannot emit a false pass
   — but a competent iOS dev would still have to make these calls during implementation.

2. **`createScrollProbe(list, …)` host-element contract is ambiguous (internal consistency /
   specificity).** The skeletal signature (§4.2) receives only `list` (the `.roster-list`
   scroller), yet Phase 2.3 requires the probe node be rendered *outside* the scrollable content
   but *inside* the roster screen "so it remains visible to XCUITest after dragging." With only
   `list` in scope, the function must derive the host (`list.closest('.roster-screen')` /
   `list.parentElement`) or take an explicit host param. *Fix:* state which — e.g. append to
   `list.parentElement` and assert the node is not a descendant of `list`.

3. **Probe `dispose()` is not explicitly wired into `mountRoster`'s cleanup (omission).**
   `mountRoster` returns a cleanup that removes every listener (`src/screens/roster.mjs:171-184`).
   Phase 2.2 requires the probe remove its listener in `dispose()`, but the plan never states that
   the returned cleanup must call `probe.dispose()`. A reader would infer it, but for full rigor
   the wiring should be named so probe teardown isn't silently dropped on screen transitions.

4. **`docs/IPAD_SCROLL_BUG.md` is untracked in git (process).** §5 lists it `(MOD)` — "append
   Cycle-15 fix/verification result section" — but the file is currently **untracked**
   (`git status` → `?? docs/IPAD_SCROLL_BUG.md`). The Cycle-15 append will not be version-controlled
   unless the generator `git add`s it. *Fix:* note that the file must be added, not just modified.

5. **Drag-vs-click navigation is absent from the §8 error table (omission).** §8 covers
   "Safari first-run UI blocks URL load" but not the failure mode where the verification drag
   itself triggers a row selection. Add a row: *Detection:* probe URL lands on SCAN/RESULT instead
   of ROSTER; *Response:* start the drag off any `.guest-row`, or add a probe-mode inert region.

## Flaws of Commission

No material flaws of commission identified. The isolation discipline is correct (single variable
first, per `docs/IPAD_SCROLL_BUG.md`'s recorded regression); `dist/index.html` is preserved for all
existing consumers; the CI lane is separated from the Linux web gate and fails closed; the probe is
query-gated and inert by default. The only commission-adjacent item is the probe-host contract
ambiguity (Remaining issue #2), which is a specification wrinkle, not a wrong decision.

## Flaws of Omission

1. XCUITest read/drive mechanism not pinned (Remaining issue #1).
2. Probe `dispose()` cleanup wiring not stated (Remaining issue #3).
3. Drag-triggers-navigation edge case missing from §8 (Remaining issue #5).
4. Determinism of the *current* build is assumed but not asserted — §8 handles nondeterministic
   hashes reactively ("remove volatile data"), and prior audits show the build is already
   byte-stable (SHA `8d5a9c65…` across cycles), so this is low-risk; a one-line "current build emits
   no timestamps, so the hash is already deterministic" would close it. Minor.

## Regressions

No regressions identified. `dist/index.html` is retained (README/CI/e2e paths intact); other
screens keep their scale entrance; virtual-list math, guest data, storage keys, camera, audio, and
native contracts are explicitly out of scope; the roster loses only its subtle scale entrance
(fade-in retained) — an intentional, documented tradeoff for reliable primary-device scrolling.
The `.github/workflows/ci.yml` upload path widening from `dist/index.html` to `dist/` (Phase 3.6)
is additive and preserves the existing artifact.

## Why 96 and not 97

The plan's central new capability — verifying *real* iOS touch-momentum scroll — rests on an
XCUITest-drives-mobile-Safari-WebView mechanism whose read path, launch approach, and drag target
are left as an open branch (Remaining issue #1). That is more than cosmetic: it is the hardest and
most failure-prone deliverable, and the plan defers the decision to implementation. Combined with
the probe-host contract wrinkle (#2) and the missing drag-vs-click edge case (#5), this is "minor
gaps in specificity and edge-case coverage" — a solid 96, not a 97+.

## Why 96 and not 95

Everything structural is right: correct root-cause isolation, full scope coverage (RA #14 + both
backlog items), fail-closed CI, additive cache-busting, honest verification stance (no "fixed"
claim permitted from desktop/CI alone), thorough §7 integration analysis and §8 error table, pinned
toolchain, and a real rollback path. Every source claim I checked is accurate to the tree
(`styles.css:55-76,148-150,164-176`; `app.mjs:43-44`; `build.mjs:147-155`; `roster.mjs:5,23,153,177`;
`static-server.mjs:103` `no-store`; `ci.yml:57-58` upload path). This is well above a barely-passing 95.

## Path to ≥95

Already cleared (96). No blocking items.

## Path to 100

Address the five Remaining issues: (1) pin the XCUITest WebView read path, Safari-launch approach,
and drag-start region; (2) resolve the `createScrollProbe` host-element contract; (3) state that
`mountRoster`'s cleanup calls `probe.dispose()`; (4) note `docs/IPAD_SCROLL_BUG.md` must be
`git add`-ed; (5) add the drag-vs-click row to §8. A one-line assertion that the current build is
already deterministic would round it out.

## Summary

Approval-grade at **96/100**. Plan v28 is comprehensive, correctly scoped to RA #14 plus both open
backlog items, source-accurate, and disciplined about single-variable isolation and honest
real-device verification. The gap to a perfect score is concentrated in the one genuinely hard
piece — the XCUITest→mobile-Safari WebView drive/read mechanism — plus a few specificity and
edge-case nits. **Disposition: State 2 — implement the approved plan.** The plan is now the contract;
implementation will be audited against it. Do not revise the plan to pass a later implementation
audit — fix the code to match this spec. Critically: the iPad fix may NOT be marked verified on
desktop/CI evidence alone (per `docs/IPAD_SCROLL_BUG.md` and Phase 5.2) — a real iPad / iOS Simulator
touch result is required, or the gate stays explicitly unverified pending runner provisioning.

---

### Implementation Verification — v19

**Plan:** `IMPLEMENTATION_PLAN.md` v28 (Cycle 15) @ approved commit `282b164` (approved score: 96)
**Code:** `master` @ `85854be` ("feat(§6): implement iPad scroll robustness") audited on 2026-09-03
**Independently reproduced by the discriminator this cycle:** `node scripts/build.mjs` (deterministic
hash), `node --test tests/unit/*.test.mjs` (84/84), `npx playwright test` (full suite), `npx prettier
--check`, `node scripts/ios-scroll-smoke.mjs` (skip path).

| Section | Status | Notes |
|---------|--------|-------|
| §4.1 / Phase 1 — roster transform removed in isolation | **DEVIATED** | `.roster-screen { transform: none }` and base `.screen` no longer transforms; non-roster scale moved to `#app…:not(.is-ready)/.is-ready .screen:not(.roster-screen)` (`src/styles.css:66-82,156`). Roster correctly computes to `transform:none`. **But** the non-roster `transform` transition is declared **only** in the `:not(.is-ready)` selector — see Defect #1: the entrance transform no longer animates in the ready state and the paired e2e assertion is nondeterministic. |
| §4.2 / Phase 2 — probe-only scroll oracle | **COMPLIANT** | `readRuntimeFlags` exact `scrollProbe=1` gate (`src/app.mjs:15-21`); `createScrollProbe(list,{enabled})` no-ops by default, appends `#scroll-probe-status` to `list.parentElement` (outside the scroller), updates from real `scrollTop`, throws `TypeError` on bad list, `dispose()` removes listener+node and is wired into `mountRoster` cleanup (`src/screens/roster.mjs:5-40,205,217`). Resolves critique Path-to-100 issues #2 (host contract) and #3 (dispose wiring). Unit tests cover default/enabled/update/dispose/malformed (`tests/unit/roster.test.mjs`). |
| §4.3 / Phase 4 — iOS touch-scroll CI lane | **COMPLIANT** | `scripts/ios-scroll-smoke.mjs` fails closed when `CHECKIN007_IOS_SCROLL_REQUIRED=1`, skips (exit 0) otherwise — reproduced. `WebRosterScrollUITests.swift` pins the critique's open sub-decisions: reads probe via `safari.webViews.staticTexts` `MATCHES`/`CONTAINS` (issue #1a), drives `com.apple.mobilesafari` (#1b), drags at normalized `(0.92, 0.78)→(0.92, 0.22)` — right-edge, off any `.guest-row` (#1c/#5). `.github/workflows/ios-scroll.yml` on `[self-hosted, macOS, ios-touch]`, `timeout-minutes: 20`, uploads xcresult on failure. |
| §4.3 file placement — Swift target | **DEVIATED (plan-sanctioned, verified)** | File landed at `native/CheckIn007UITests/WebRosterScrollUITests.swift` (existing UI-test target), not the plan's speculative `native/CheckIn007WebUITests/`; `project.pbxproj`/xcscheme untouched. This is allowed by §4.3/Phase 4.2 ("add a separate target *only if* required") — the target uses `PBXFileSystemSynchronizedRootGroup` (`project.pbxproj:39-42`), so the new file is auto-compiled without a pbxproj edit. Correct call. |
| §4.4 / Phase 3 — cache-busted artifacts | **COMPLIANT** | `artifactNameFor` (SHA-256, 12-char) + `writeBuildArtifacts` emit `index.html`, `check-in-007.<hash>.html`, `check-in-007.manifest.json` from one HTML string; byte-identical (verified `diff -q`), deterministic hash across two builds (`9cda955cf0fb`), budget check still precedes writes (`scripts/build.mjs:118-201`). `ci.yml` upload widened to `dist/`. `serve-https` `no-store` covered for both paths (`tests/unit/serve-https.test.mjs`). |
| Phase 5 — verification & honesty | **COMPLIANT** | `docs/IPAD_SCROLL_BUG.md` Cycle-15 note records the iOS touch result as "skipped/unverified, not as a PASS" — honors Phase 5.2 / the critique's non-negotiable. The file is now **git-tracked** (`git ls-files` hit) — resolves audit F-16 / critique issue #4. |
| §5 File Manifest | **COMPLIANT** | All 17 changed files are within the manifest; no out-of-manifest drift (`git diff --name-only c86bf3e..85854be`). `package-lock.json` unchanged (no new deps, as planned). |

**Implementation Score:** 91/100

## Defects

1. **[BLOCKING — red gate] The new e2e test `roster has no transform ancestor while other screens
   keep scale entrance` is nondeterministic and fails `npm run test:e2e` intermittently.** On a clean
   full-suite run the discriminator observed **1 failed / 14 passed** at
   `tests/e2e/checkin.spec.mjs:179` (`expect(scanTransform.transition).toContain('transform')`);
   re-runs and isolated runs pass. Root cause (verified in `src/styles.css:66-82`): the non-roster
   `transform` transition is declared **only** under `#app:not(.is-ready) .screen:not(.roster-screen)`.
   The test calls `setState('LOADING')` (which toggles `is-ready` off→on via rAF, `src/app.mjs:43-44`)
   then reads `getComputedStyle(...).transitionProperty`; whether the read lands before or after the
   rAF decides whether the property is `opacity, transform` or just `opacity` → a race. This is not
   merely a test bug: because the transform transition is absent from the ready-state style, the
   non-roster **scale entrance no longer animates** — the transform snaps from `scale(0.985)` to
   `scale(1)` while only opacity fades — a minor regression against Phase 1.2 ("keep opacity+scale
   transition for non-roster screens") and §4.1 ("other screens retain the visual scale entrance").
   Violated spec: Phase 5.1 ("Run … `npm run test:e2e` … web gates remain green"), Phase 1.2, §4.1.
   *Fix (code, not plan):* declare the transform transition in a selector that is present in the
   ready state — e.g. add `transition: opacity, transform` to a base `.screen:not(.roster-screen)`
   rule (or to `#app.is-ready .screen:not(.roster-screen)`) so the entrance transform actually
   animates; then the assertion is deterministic. Additionally harden the test to sample a defined
   state (await a stable `is-ready` before reading, or assert the resting `transform` rather than the
   transient `transitionProperty`). Re-run `npx playwright test` several times to confirm 0 flakes.

**Disposition — Cycle 15, State 3 (fix the implementation).** The approved plan v28 (96) is the
contract; do **not** revise the plan. Fix Defect #1 in code so `npm run test:e2e` is reliably green,
then resubmit for re-audit. Everything else is compliant and faithful — probe oracle, cache-busted
artifacts, fail-closed iOS lane, honest device-verification stance, and all five critique Path-to-100
items are addressed. The iPad touch fix itself remains **correctly unverified** pending a real iPad /
iOS-Simulator runner (not a defect — the honest, plan-mandated state).

---

### Implementation Verification — v20

**Plan:** `IMPLEMENTATION_PLAN.md` v28 (Cycle 15) @ approved commit `282b164` (approved score: 96)
**Code:** `master` @ `f551d4a` ("fix(audit): stabilize non-roster entrance transition") audited on 2026-09-03
**Re-audit of the v19 State-3 fix.** The generator's fix commit `f551d4a` closes the single blocking
defect (RA #15 / Defect #1 from v19). Independently reproduced this cycle: `node --test tests/unit/*.test.mjs`
(84/84), `npx playwright test` (**two full-suite runs, 15/15 each**), `npx playwright test -g "roster has
no transform ancestor" --repeat-each=12` (**12/12**), `node scripts/build.mjs` (deterministic SHA
`83a98b13250d` across two builds, `index.html` byte-identical to hashed twin), `node scripts/ios-scroll-smoke.mjs`
(exit 1 when required, exit 0 skip otherwise), `npx prettier --check` (clean on both changed files).

| Section | Status | Notes |
|---------|--------|-------|
| §4.1 / Phase 1 — roster transform removed in isolation | **COMPLIANT** (was DEVIATED in v19) | `f551d4a` moves the non-roster `transform` transition out of the `:not(.is-ready)`-only block into `.screen:not(.roster-screen)` (`src/styles.css:70-74`), a selector present in **both** ready and not-ready states → the non-roster scale entrance animates again (restores Phase 1.2 / §4.1). `.roster-screen { transform: none }` preserved (`:158-161`); e2e confirms `.roster-screen` computes to `transform:none` and `.loading-screen` retains a non-none entrance transform + `transform` in `transitionProperty`. The v19 minor entrance regression is repaired. |
| §4.2 / Phase 2 — probe-only scroll oracle | **COMPLIANT** | Unchanged from v19: `readRuntimeFlags` exact `scrollProbe=1`; `createScrollProbe` no-op default, appends `#scroll-probe-status` to `list.parentElement`, updates from real `scrollTop`, throws `TypeError` on bad list, `dispose()` wired into `mountRoster` cleanup. |
| §4.3 / Phase 4 — iOS touch-scroll CI lane | **COMPLIANT** | Unchanged from v19: `scripts/ios-scroll-smoke.mjs` fails closed (exit 1) when required, skips (exit 0) otherwise — reproduced. `WebRosterScrollUITests.swift` reads probe via `safari.webViews.staticTexts`, drives `com.apple.mobilesafari`, drags off-row at `(0.92,0.78)→(0.92,0.22)`. `.github/workflows/ios-scroll.yml` on `[self-hosted, macOS, ios-touch]`, `timeout-minutes: 20`. Lane is installed but **not execution-proven** here (no iOS simulator/device) — source-verified, plan-sanctioned. |
| §4.4 / Phase 3 — cache-busted artifacts | **COMPLIANT** | `index.html`, `check-in-007.<hash>.html`, `check-in-007.manifest.json` from one HTML string; byte-identical twin (verified `diff -q`), deterministic hash across two builds (`83a98b13250d` — changed from v19's `9cda955cf0fb` because the CSS fix changed the emitted bytes, which is correct content-addressing), budget check precedes writes. |
| Phase 5 — verification & honesty | **COMPLIANT** | `docs/IPAD_SCROLL_BUG.md` still records the iOS touch result as skipped/unverified (Phase 5.2 honored), git-tracked. Web gates now reliably green (the v19 blocker is gone). |
| §5 File Manifest | **COMPLIANT** | The fix touches exactly `src/styles.css` + `tests/e2e/checkin.spec.mjs` — both `(MOD)` in the §5 manifest. No out-of-manifest drift (`git show --stat f551d4a`). |

**Implementation Score:** 97/100

## Defects

None blocking. The v19 blocking defect (RA #15 / Defect #1 — flaky e2e gate + non-roster entrance
snap) is **RESOLVED**: the non-roster transform transition now animates in the ready state, and the
test awaits a stable `is-ready` before sampling, so `npm run test:e2e` is reliably green (2× full
suite 15/15 + 12× repeat-each, independently reproduced). The implementation faithfully executes all
five phases of approved plan v28 and addresses all five critique Path-to-100 items.

**Why 97 and not higher:** the iOS touch-scroll lane (`ios-scroll-smoke.mjs`, `WebRosterScrollUITests.swift`,
`ios-scroll.yml`) — the cycle's central real-device deliverable — is **installed and source-verified
but never execution-proven** here, because no iPadOS simulator/device is available in this environment.
Its correctness (XCUITest→mobile-Safari WebView drive/read, the synthesized touch-drag) rests on source
inspection, not a green run. This is the same env-blocked posture that scored prior native cycles 96-97
in this project (Cycle 6/7 precedent). Non-blocking and plan-sanctioned (§4.3 tradeoff, Phase 5.2), but
it is the honest reason this is not ≥98.

**Disposition — Cycle 15, State 4 (implementation VERIFIED, ≥95 gate cleared).** Plan v28 (96) is
implemented at 97/100. The code faithfully matches the approved contract, including the plan's honest
"unverified gate awaiting the provisioned runner" disposition. **Separate open audit action:** RA #14
(the actual iPad touch-scroll fix) stays **IN PROGRESS** at the system-health level until a real iPad /
iOS-Simulator touch **PASS** exists — the implementation-fidelity score being ≥95 does **not** mark the
underlying bug proven-fixed on device. Next real-world step: provision a matching
`CHECKIN007_IOS_DEVICE`/`CHECKIN007_IOS_RUNTIME` and run `CHECKIN007_IOS_SCROLL_REQUIRED=1 npm run
test:ios-scroll`, or run the manual real-iPad fallback and record the result in `docs/IPAD_SCROLL_BUG.md`.
