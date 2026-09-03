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
