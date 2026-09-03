# Known Issue — Roster list does not scroll on iPadOS Safari

**Status:** OPEN — code fix is landed, but real iPad/iOS Simulator touch-scroll verification is still required.
**Severity:** HIGH (primary kiosk device is an iPad; the roster is the main screen).
**Scope:** `ROSTER` screen only. The check-in flow, data, camera, admin, and exports are unaffected.

## Symptom

On the `ROSTER` screen the guest list will not scroll by touch. Reported behavior ranged
from "scrolls sometimes / can't grab it from any point" to "does not scroll at all." A
tab-switch-and-return sometimes restores scrolling; a reload loses it again.

## Platform matrix (verified with the user)

| Platform / engine                          | Input          | Scrolls?     |
| ------------------------------------------ | -------------- | ------------ |
| Desktop Chrome (Blink)                     | wheel/trackpad | ✅ works     |
| macOS Safari (WebKit)                      | trackpad       | ✅ works     |
| Android Chrome (Blink)                     | touch          | ✅ works     |
| **iPadOS Safari (WebKit)**                 | **touch**      | ❌ **fails** |
| **iPadOS standalone / Add-to-Home-Screen** | **touch**      | ❌ **fails** |

**Conclusion:** this is specific to **iPadOS WebKit touch momentum scrolling**. It is NOT a
general layout bug (macOS Safari is WebKit and works with a trackpad; the failure only
appears with the iOS touch/momentum-scroll path). Android touch (Blink) works, so it is
WebKit-touch-specific.

## Key diagnostic clues

1. **A tab-switch (which forces a relayout/repaint) can make it start working; a reload
   breaks it again.** → the scroll layer is failing to initialize at first paint, and a
   relayout fixes it. Classic "scroll container initialized while an ancestor is being
   animated/transformed, or before layout/fonts settle."
2. Desktop WebKit (Playwright `webkit`) scrolls the container fine via wheel, and geometry
   is correct there (`clientHeight < scrollHeight`, bounded to viewport, `transform: none`
   at rest after the fix attempt). So the container IS a valid scroller off-iOS. The defect
   lives in the iOS touch-momentum initialization path, which cannot be reproduced in
   headless Chromium or desktop WebKit.

## Relevant code

- `src/styles.css`:
  - `.screen` is `position: fixed; inset: 0; display:flex; flex-direction:column` and, at
    rest, carries `transform: scale(1)` (`#app.is-ready .screen`) plus a
    `transform: scale(0.985) -> scale(1)` entrance over `--transition-ms` (500ms). **The
    roster's scroll list is a descendant of this transformed, fixed ancestor.**
  - `.roster-list` is the scroll container: `flex:1; min-height:0; overflow:auto;
-webkit-overflow-scrolling:touch; display:grid; align-content:start; gap:8px`.
- `src/screens/roster.mjs` mounts the list; for ≤ `ROSTER.VIRTUALIZE_THRESHOLD` guests it
  renders a plain list (default 40 sample guests → non-virtualized path). Virtualization
  (`src/lib/virtual-list.mjs`) is NOT active at 40 rows.
- `src/app.mjs` `setState()` toggles `#app.is-ready` (removed, then re-added on rAF) to
  drive the entrance each time a screen mounts.

## Leading hypothesis (best fit for the platform matrix)

**A transformed/animated ancestor breaks `-webkit-overflow-scrolling` touch momentum on
iPadOS.** The roster's scroll list sits inside `.screen`, which has a `transform` both at
rest (`scale(1)`) and, more importantly, _during_ the 500ms entrance animation that runs
exactly when the list first paints. iOS binds the momentum-scroll layer at first paint under
a transformed containing block and fails to initialize it; a later relayout (tab switch)
re-establishes it. macOS Safari (trackpad, no touch-momentum layer) and Android/Chrome
(different scrolling impl) are unaffected — matching the matrix.

## Hypotheses already tried this session (do NOT just repeat these)

1. **Settle the resting transform to `transform: none`** via a keyframe entrance
   (`#app.is-ready .screen { animation: screen-enter }`, `@keyframes` ending at
   `transform:none`). ⚠️ Note: `animation-fill-mode: both` leaves the computed transform as
   `matrix(1,0,0,1,0,0)` (identity, still a transform) — must use NO fill so it reverts to a
   base `transform:none`. Verified `transform:none` at rest in desktop WebKit, but **did not
   fix the iPad** on its own (the ancestor is still transformed _during_ the entrance).
2. **Fade-only entrance for the roster** (`#app.is-ready .screen:not(.roster-screen)` gets
   the scale; roster never transformed) **+ block scroll container** (grid→block with child
   margins) **+ a post-mount relayout "kick"** (toggle `overflowY` off/on in a double rAF)
   **+ removing `touch-action`/`overscroll-behavior`**. Result on iPad: **"does not scroll at
   all"** — WORSE. This bundle was too many simultaneous changes; the `display:block` flex
   sizing and/or the kick likely regressed it on iOS. **Recommend isolating one variable at
   a time.**
3. `touch-action: pan-y` + `overscroll-behavior: contain` on `.roster-list`: no improvement
   (reverted).

All changes were reverted; the tree is back to the committed baseline that "scrolls
sometimes."

## Candidate fixes for the loop to try (isolated, one at a time, verified on a real iPad)

1. **Remove the transform from the roster's ancestor entirely and permanently** — fade-only
   entrance for the roster screen, `transform: none` at rest AND during entrance, and change
   NOTHING else. This is hypothesis #1+#2's transform half, isolated from the block/kick/
   touch-action changes that caused the regression. Most likely fix per the matrix.
2. If a transform must remain, move the entrance transform to an **inner wrapper** that is
   NOT an ancestor of the scroll list, so the list's containing block is never transformed.
3. Consider not stacking screens with `position: fixed` for the roster — let the roster
   screen scroll the **document** natively (the most reliable iOS scroll), keeping fixed
   positioning only for the animated overlay screens (loading/scan/result).
4. Add `transform: translateZ(0)` / `will-change: transform` **to the `.roster-list` itself**
   (promote the scroller to its own layer) as an alternative iOS momentum fix — test in
   isolation; it can help or hurt.

## Verification note (important)

This defect **cannot be reproduced in headless Chromium or desktop WebKit** — both scroll
fine. Verifying a fix requires a **real iPad / iPadOS Safari** (or an iOS Simulator with
touch), plus a fresh, cache-busted load (iOS Safari and standalone webapps cache the HTML
aggressively — use a new filename or clear Website Data between tests). Any claim of "fixed"
based only on desktop/CI evidence is invalid for this bug.

Use [`docs/IOS_SCROLL_RUNBOOK.md`](IOS_SCROLL_RUNBOOK.md) for the exact simulator, external-URL, and
manual physical-iPad verification procedures. RA #14 remains unresolved until
`test-results/ios-scroll-result.json` records `status: "passed"` with `required: true` from a real
iPad/iOS Simulator run, or equivalent manual physical-iPad evidence is recorded by an operator.

## Constraints

- Keep the single-file self-contained build working (`npm run build` → `dist/index.html`).
- Do not regress the other screens' entrance animation, the flow, tests, or lint.
- Preserve the 40-guest sample data behavior and the virtualization path for large rosters.

## Cycle 15 implementation note

Cycle 15 applies the isolated leading fix only: `.roster-screen` now has a fade-only
entrance and computes to `transform: none`, while non-roster screens keep the scale
entrance. The app also ships a query-gated `?scrollProbe=1` oracle that appends
`#scroll-probe-status` outside `.roster-list` and updates from the list's real `scrollTop`.

`npm run build` now emits `dist/index.html`, `dist/check-in-007.<hash>.html`, and
`dist/check-in-007.manifest.json`; use the hashed filename for fresh iPad Safari /
Add-to-Home-Screen redeploys. The iOS regression gate is installed as
`npm run test:ios-scroll` and `.github/workflows/ios-scroll.yml`. It requires an iPadOS
simulator or real-device runner to prove the touch path; on machines without that runner it
must remain recorded as skipped/unverified, not as a PASS.

Cycle 17 adds structured smoke-test evidence at `test-results/ios-scroll-result.json` and preflight
diagnostics for missing `xcrun`, `xcodebuild`, simulator runtime/device, artifact, HTTPS trust, and
probe failures. This improves auditability only; it does not resolve the bug without a PASS from the
iPadOS touch path.
