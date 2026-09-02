# Check-In 007 — Implementation Plan Critique

**Plan Score:** 97/100 — **APPROVED** (Rev 2, plan v5)
**Implementation Score:** 97/100 — **VERIFIED** (Verification v3, commit `21e06f3`; loop State 4 — cycle complete)

---

# Plan Critique — Revision 2 (Cycle 2: roster virtualization)

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `855c436`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v5
**Score:** **97 / 100** (previous: 88, Rev 1)
**Status:** **APPROVED** (gate is ≥95)

v5 closes all four Rev-1 blockers and all five Rev-1 Path-to-100 items with concrete,
source-accurate fixes: the build-script module-ordering constraint is now explicit (§3, §5,
§7.4, new §Phase 2b); `role="listbox"` is deliberately rejected in favour of native
button semantics with `aria-setsize`/`aria-posinset` + an axe-green acceptance; virtualized
names clamp to a single ellipsized line so the fixed 58 px visible row (66 px pitch) cannot
clip or desync; and the row-height/gap wording is reconciled by two named constants. Verified
against ground truth (`build.mjs:7-19`, `roster.mjs`, `styles.css:22-208`, `app.mjs:40-58`).
Approved; the two remaining items below are non-blocking polish.

## Issues resolved in revision 2

1. **Build-script correctness (Rev-1 #1) — RESOLVED.** §5 File Manifest now includes
   `scripts/build.mjs (MOD)`. §3 Architecture, §7.4, and the new **§Phase 2b** state the hard
   ordering constraint: `src/lib/virtual-list.mjs` must precede `src/screens/roster.mjs` in the
   hardcoded `modules` array (verified: `scripts/build.mjs:7-19` has no auto-discovery; the
   transform at `:105-109` emits an eager
   `const shouldVirtualize = window.__CHECKIN007.modules.src_lib_virtual_list.…` alias at
   module-init, so a missing/mis-ordered entry throws at load — a silent break the residual-syntax
   check never catches). The namespace `src_lib_virtual_list` matches `namespaceFor()`
   (`build.mjs:21-23`). §Phase 2b acceptance requires `npm run build` + a browser load of the
   built `dist/index.html` reaching the roster screen. Correct and complete.

2. **`role="listbox"` a11y regression (Rev-1 #2) — RESOLVED.** §2 item 4, §4 decision 6, and
   §Phase 3 now explicitly refuse `role="listbox"`/any composite-widget role and keep the native
   `<ul>` + `<button class="guest-row">` model, adding only `aria-setsize`/`aria-posinset`. This
   avoids the axe `aria-required-children` (serious) regression against the green a11y e2e. §Phase 4
   and §10 add "run the existing axe smoke check after virtualization is active." Correct.

3. **Fixed row height vs. 2-line names (Rev-1 #3) — RESOLVED.** §Phase 3 CSS adds
   `.roster-list.is-virtualized .guest-row span { display:block; white-space:nowrap;
   -webkit-line-clamp:unset }` which — combined with the inherited `overflow:hidden;
   text-overflow:ellipsis` (`styles.css:192-196`) — yields single-line ellipsis in virtual mode
   while the small-list path keeps the two-line clamp (`styles.css:198-203`). §8 and the §Phase 4
   e2e add a deliberately long imported name asserted single-line without overflow. Correct.

4. **Row-height/gap inconsistency (Rev-1 #4) — RESOLVED.** Config adds
   `VIRTUAL_ROW_HEIGHT_PX: 66` (math pitch) and `VIRTUAL_VISIBLE_ROW_HEIGHT_PX: 58`
   (`--roster-virtual-row-height`); §Phase 3 acceptance states the 8 px difference is the
   reintroduced inter-row gap once `.is-virtualized` switches grid→block (removing
   `styles.css:171 gap:8px`). `box-sizing:border-box` is global (`styles.css:22-24`), so a 58 px
   `.roster-virtual-row` fully contains the `min-height:58px` button + padding + border. Correct.

Rev-1 Path-to-100 items also closed: the unexplained `+2` render term is replaced by
`ceil(viewport/rowHeight) + 2*overscan` **plus at most one** transient boundary row, justified by
fractional-scroll rounding (§Phase 2, §9); `viewportHeight` source named as `list.clientHeight`
with `<= 0` zero-detection (§3, §Phase 2); `.roster-virtual-row { right: 0 }` (not `4px`) avoids
double-counting the container's `padding-right:4px` (§Phase 3, `styles.css:173`); search
`scrollTop = 0` reset is deterministic on the reused list element (§Phase 2, §8); and the
last-window spacer invariant is a named unit assertion (§Phase 1, §Phase 4, §10).

## Remaining issues

None blocking. Two non-blocking polish items (see Path to 100):

1. **Virtual→small down-transition class toggle is implicit (minor).** §Phase 2 says `render()`
   chooses `renderSmallList` vs `renderVirtualList`, and §8 says the empty path "clears virtual
   state," but the plan never explicitly states that a filtered result crossing back to ≤ threshold
   must remove `.is-virtualized` from the reused `.roster-list` (restoring `display:grid`/`gap:8px`).
   Intent is covered by §10's "small bundled roster still renders with the existing markup," and a
   competent dev reusing the element would toggle the class, but stating it removes ambiguity.

2. **`topPadding`/`bottomPadding` are computed but the DOM contract lays out via
   `spacer + translateY` (minor).** `computeVirtualWindow` returns padding values used only by the
   invariant unit test; actual positioning uses a full-height spacer plus per-row
   `translateY(absoluteIndex * 66)`. Not contradictory, but the plan could note that padding fields
   are a math/test invariant, not the layout mechanism, so an implementer doesn't wire both.

## Scope Check

- **Audit Required Actions:** none open — actions #1–#8 are all DONE (`CONSOLIDATED_AUDIT.md`).
  No P0/P1 in scope. No cap.
- **Backlog items in scope:** targets exactly the one in-progress item (`[/]` roster
  windowing/virtualization >500 rows). The other five items (multi-device merge, scan audio, native
  SwiftUI, offline-HTTPS, Node 24 bump) are separate subsystems. No cap.
- **Integration analysis:** present and accurate — §7 matches `app.mjs:40-58` (re-mount with
  `buildSearchIndex(guests)` on every ROSTER entry and `onRosterChanged`), the `setState('ROSTER')`
  hook exists (`app.mjs:98`), admin CSV import is already exercised in e2e. No cap.
- **Alternatives considered:** §4 justifies native fixed-row math over `react-window`, rAF over
  per-event render, manual math over IntersectionObserver, and native semantics over listbox — each
  cited. No cap.

No scope cap applied. Correctly-scoped single-backlog-item plan.

## Flaws of Commission

No flaws of commission identified. The former §7.4 falsehood and the invalid `role="listbox"`
composition are both removed; all config/CSS/build claims check out against source.

## Flaws of Omission

1. Virtual→small class-toggle on the reused element is implicit, not stated (Remaining #1) — minor.
2. No other omissions: error paths (empty filter, zero viewport, rapid scroll, unmount-during-rAF,
   late-list selection, duplicate names, reduced motion) are all enumerated in §8; cleanup of
   scroll/resize listeners + rAF is added to the returned teardown (§Phase 2, §9).

## Regressions

No regressions identified. The small-list markup, empty-state message, event delegation on
`data-guest-id` (`roster.mjs:59-64`), the 20-cycle leak test, and the reduced-motion path are all
explicitly preserved (§10), and the native list/button model keeps the axe e2e green.

## Why 97 and not 98

The two non-blocking polish items are genuine, if small, specificity gaps: the down-transition
class toggle is only implied, and the computed padding fields overlap the translateY layout
mechanism without a note on which is authoritative. Either could cause a momentary implementer
misstep (a small list rendered in block layout without gaps, or double-applied offsets). Neither
threatens the artifact or the acceptance gates, so they hold the score one point below 98 rather
than blocking approval.

## Path to ≥95

Met — plan is APPROVED at 97. No blocking work remains.

## Path to 100

1. State that `renderSmallList` (and the empty path) removes `.is-virtualized` from the reused
   `.roster-list` so grid layout and the 8 px gap are restored when a filter drops the count back to
   ≤ threshold.
2. Note that `topPadding`/`bottomPadding` from `computeVirtualWindow` are a math/test invariant, and
   that DOM layout is driven by the full-height spacer + per-row `translateY`, so both mechanisms are
   not wired simultaneously.
3. Specify `measureVirtualViewport` behavior if `list.clientHeight` is still `<= 0` after the single
   scheduled rAF re-read (it keeps the `VIRTUAL_MIN_VIEWPORT_PX` fallback and does not re-loop) so
   the "schedule one rAF" wording is unambiguous about the no-progress case.

## Summary

Approval-grade. v5 resolves every Rev-1 blocker and Path-to-100 item with fixes verified against
the actual `build.mjs`, `roster.mjs`, `styles.css`, and `app.mjs`, and introduces no new defects.
Two minor polish items remain (implicit down-transition class toggle; padding-vs-translateY note),
which is why it lands at 97 rather than 98–100. The loop advances to **State 2 — implement the
approved plan** (do not revise further; the plan is now the contract for the implementation audit).

**Plan Score:** 97/100

---

# Plan Critique — Revision 1 (Cycle 2: roster virtualization)

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `107eea6`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v4
**Score:** **88 / 100** (first review of this cycle's plan)
**Status:** NOT APPROVED (gate is ≥95)

A well-structured, accurately-scoped windowing plan whose architecture (pure math in
`src/lib/virtual-list.mjs` + thin DOM integration) fits the no-framework codebase, and whose
integration analysis matches the real `app.mjs` wiring. It is held below approval by one
build-breaking factual error, one accessibility regression risk, one fixed-height/2-line-name
gap, and an internal inconsistency about row height vs. gap — all concrete and fixable in a
single revision pass.

## Remaining issues

1. **§7.4 build-script claim is false — the artifact would break at load.** §7.4 (item 4,
   "Migration path") asserts: *"adding `src/lib/virtual-list.mjs` follows the existing ES module
   pattern and requires no build-script change."* This is incorrect. `scripts/build.mjs` lines
   7–19 define a **hardcoded** `modules` array; there is no auto-discovery. The transform
   (`scripts/build.mjs:105-109`) emits, at the top of the roster IIFE,
   `const shouldVirtualize = window.__CHECKIN007.modules.src_lib_virtual_list.shouldVirtualize;`
   which is evaluated **eagerly at module-init time**. If `virtual-list.mjs` is not added to the
   array, `window.__CHECKIN007.modules.src_lib_virtual_list` is `undefined` → `TypeError` when the
   bundle runs → blank app. Note the build command itself will **not** error (it only reads the
   files listed in the array and the residual-syntax check never sees the missing module), so this
   is a *silent* runtime break caught only by e2e. **Fix:** (a) add `scripts/build.mjs (MOD)` to
   the §5 File Manifest; (b) require `'src/lib/virtual-list.mjs'` to be inserted in the array
   **before** `'src/screens/roster.mjs'` (line 12), and state that ordering constraint explicitly
   (IIFEs execute in array order; an importee must run before its importer).

2. **`role="listbox"` without `role="option"` children — axe regression risk (§Phase 3).** The
   accessibility contract adds `role="listbox"` to `.roster-list` but keeps children as
   `<li><button class="guest-row">` and only adds `aria-setsize`/`aria-posinset`. A WAI-ARIA
   listbox requires owned children with `role="option"` (axe rule `aria-required-children`,
   severity *serious*). The existing e2e (`tests/e2e/checkin.spec.mjs`, the "accessibility smoke"
   test asserting zero serious/critical `axe.run` violations) would then **fail** — a regression.
   A listbox role also implies arrow-key option navigation that the plan does not design. **Fix:**
   choose one and state it: either (a) drop `role="listbox"` and keep the current native-button
   list (aria-setsize/posinset are still valid on the buttons to convey full-list context), or
   (b) fully adopt listbox + `role="option"` + roving-tabindex arrow-key navigation. Add a §Phase 4
   assertion that the axe pass stays green on a virtualized list.

3. **Fixed row height collides with 2-line clamped names (§Phase 3 / §8).** The current
   `.guest-row` uses `min-height: 58px` (`styles.css:180`) and `span { -webkit-line-clamp: 2 }`
   at `1.1rem` (`styles.css:198-203`), so a long name grows the row to two lines today. The
   virtual path pins `.roster-virtual-row { height: var(--roster-virtual-row-height) }`
   (§Phase 3) and `computeVirtualWindow` assumes a **uniform** 66 px pitch. A wrapped 2-line name
   would overflow/clip the fixed height and desync the translateY offsets — a visual regression vs.
   today's growable rows. The plan lists variable-height as out of scope (§2, §13 Q1) but never
   reconciles that *two clamped lines already exceed the fixed single-row height*. **Fix:** either
   clamp virtualized names to a single line (`-webkit-line-clamp: 1`) and say so, or size the fixed
   row to fit two lines; and add a §Phase 4 e2e/unit assertion for a deliberately long guest name.

4. **Row-height vs. gap internal inconsistency (§Phase 3 acceptance).** §Phase 3 acceptance says
   *"Visual row height matches `ROSTER.VIRTUAL_ROW_HEIGHT_PX` (66), including the existing 8 px
   inter-row gap."* A row cannot simultaneously be 66 px tall **and** leave an 8 px gap. In virtual
   mode `.roster-list.is-virtualized { display: block }` removes the grid `gap: 8px`
   (`styles.css:171`), so the 8 px must live inside the 66 px **pitch** (visible row = 58 px, slot
   pitch = 66 px). The plan never states the value of `--roster-virtual-row-height` (should be 58)
   versus the 66 px `rowHeight` passed to `computeVirtualWindow`. **Fix:** state explicitly that
   `rowHeight`/pitch = 66 for the math, the visible `.roster-virtual-row` height = 58, and the 8 px
   difference is the reintroduced visual gap; align the acceptance wording accordingly.

## Scope Check

- **Audit Required Actions:** none open — actions #1–#8 in `CONSOLIDATED_AUDIT.md` are all DONE.
  No P0/P1 in scope to ignore. No cap.
- **Backlog items in scope:** the plan targets exactly the one in-progress item ("Roster
  windowing/virtualization for lists >500 rows", now `[/]`). The remaining backlog items
  (multi-device merge, scan-blip audio, native SwiftUI, offline-HTTPS helper, Node 24 bump) are
  separate subsystems and do not belong in this plan's phase. No cap.
- **Integration analysis:** present and **accurate** — §7 matches real wiring: `app.mjs:41-58`
  re-mounts `mountRoster` with the full `buildSearchIndex(guests)` array on every ROSTER entry and
  on `onRosterChanged`; the `window.CheckIn007.setState('ROSTER')` test hook the §Phase 4 e2e
  relies on exists (`app.mjs:98`); admin CSV import via `setInputFiles('.csv-input', …)` is already
  exercised at `tests/e2e/checkin.spec.mjs:112`. No cap.
- **Alternatives considered:** yes — §4 justifies native fixed-row math over `react-window`, rAF
  over per-event render, and manual math over IntersectionObserver, each with a cited rationale.
  No cap.

No scope cap applied. This is a correctly-scoped single-backlog-item plan.

## Flaws of Commission

1. §7.4's "requires no build-script change" is factually wrong given the hardcoded `modules`
   array (issue #1) — the most serious flaw, because following §5's manifest literally ships a
   broken artifact.
2. §Phase 3 assigns `role="listbox"` to a container whose children are not `role="option"`
   (issue #2) — an invalid ARIA composition, not merely incomplete.
3. §Phase 3 acceptance's "66 px row height including 8 px gap" is self-contradictory (issue #4).

## Flaws of Omission

1. No handling for the 2-line-name-vs-fixed-height case (issue #3).
2. §5 manifest omits `scripts/build.mjs` (part of issue #1).
3. Module **ordering** in the build array is never mentioned (part of issue #1).
4. `viewportHeight` measurement source is unspecified — say it reads `list.clientHeight` at mount
   and on resize, and how the §3 "zero viewport on first paint" fallback detects the zero.
5. No acceptance criterion for the axe pass on a *virtualized* list (part of issue #2).

## Regressions

1. Potential axe `aria-required-children` regression from `role="listbox"` (issue #2) —
   would flip the currently-green accessibility e2e to failing.
2. Potential visual regression: long names that render on two lines today would be clipped by the
   fixed virtual row height (issue #3).
3. No other regressions identified — the small-list path, empty-state message, event delegation,
   and the 20-cycle leak test are explicitly preserved (§10 "Regression risks covered"), and the
   `onSelect(guestId)` contract reads `data-guest-id` not display index (§8), which is correct
   against `roster.mjs:59-64`.

## Why 88 and not 89

The build-script falsehood (issue #1) is a correctness/feasibility defect: a competent developer
following the plan's own File Manifest would not touch `build.mjs` and would produce a bundle that
throws at load. That single issue, independent of the two moderate accessibility/layout gaps and
the internal inconsistency, is enough to keep the plan well short of "implementation-ready."

## Path to ≥95

Address all four Remaining Issues:

1. Add `scripts/build.mjs (MOD)` to §5; require `virtual-list.mjs` in the `modules` array **before**
   `src/screens/roster.mjs`; delete/replace the false "no build-script change" sentence in §7.4;
   add a §Phase 4 acceptance that `npm run build` + a browser load of `dist/index.html` succeeds
   (or that the large-roster e2e runs against the built artifact).
2. Resolve the `role="listbox"` decision (drop it, or adopt full option+keyboard semantics) and add
   an axe-green acceptance for the virtualized list.
3. Decide fixed-height behavior for long names (single-line clamp, or a 2-line-capable row height)
   and add a long-name test case.
4. Fix the §Phase 3 row-height/gap wording and pin `--roster-virtual-row-height` (58) vs. the 66 px
   math pitch.

## Path to 100

Beyond the four blockers:

- Justify or remove the unexplained `+2` term in the §Phase 2 render-bound acceptance
  (`ceil(viewportHeight / rowHeight) + 2*overscan + 2`).
- Name the `viewportHeight` source (`list.clientHeight`) and the exact zero-viewport detection.
- Confirm the §Phase 3 `.roster-virtual-row { right: 4px }` gutter does not double-count with the
  container's existing `padding-right: 4px` (`styles.css:173`) once `display: block` is active.
- Specify what `scrollTop` is reset on for search when the container is re-rendered (element
  identity vs. new node) so the "reset to 0" is deterministic.
- Add a unit assertion that `topPadding + renderedHeight + bottomPadding === total * rowHeight`
  holds at the *last* window (bottom clamp), not only mid-list.

## Summary

Strong, honestly-scoped plan with sound architecture and accurate integration analysis, but not
yet approval-grade. One factual build-script error would break the shipped artifact if the plan is
followed literally; a `role="listbox"` composition risks regressing the green axe e2e; and the
fixed row height is unreconciled with today's 2-line names. All four are concrete and closable in
one revision — expect a 96–98 next pass if they are fully addressed.

**Plan Score (Rev 1, superseded by Rev 2 = 97):** 88/100

---

### Implementation Verification — v3 (Cycle 2: roster virtualization)

**Plan:** `IMPLEMENTATION_PLAN.md` v5 @ approved commit `855c436` (approved score: 97)
**Code:** `master` @ commit `21e06f3` ("feat(roster): implement approved virtualization plan"), audited on 2026-09-02
**Verification commands (all green, run this audit):**
`npm run lint` → clean (prettier) · `npm run test:unit` → **22/22** (7 new virtual-list cases) ·
`npm run test:e2e` → **9/9** (new large-roster spec passes) · `npm run build` → `dist/index.html` at
**22,091 gzip bytes** (within ≤750 KB gzip / ≤1.2 MB budget), zero residual `import`/`export` syntax,
`src_lib_virtual_list` namespace present (3 refs) → module ordering correct at runtime.

| Section | Status | Notes |
|---------|--------|-------|
| §Phase 1 — Config constants | COMPLIANT | `src/config.mjs:18-25` — `ROSTER` block matches the plan literal exactly (threshold 500, pitch 66, visible 58, overscan 6, min-viewport 360, debounce 120). |
| §Phase 1 — `shouldVirtualize` | COMPLIANT | `virtual-list.mjs:1-3` — strict `> threshold`, invalid totals coerced to 0; unit-proven (`shouldVirtualize(500,500)=false`, `501=true`, `-1=false`). |
| §Phase 1 — `computeVirtualWindow` | COMPLIANT | `virtual-list.mjs:5-28` — clamps negative scrollTop, zero viewport, zero rowHeight (→ min 1), overscan bounds; `total=0` → empty window; exclusive `endIndex`; spacer invariant `topPadding+rendered+bottomPadding === total*rowHeight` unit-asserted at the bottom-clamped window. |
| §Phase 2 — DOM integration | COMPLIANT | `roster.mjs:36-130` — `createGuestRow`/`renderSmallList`/`renderVirtualList`/`measureVirtualViewport`/`scheduleVirtualRender` all present; `render()` dispatches on `shouldVirtualize`. Full-height `.roster-virtual-spacer` (`aria-hidden`) + `translateY(index*66)` rows; delegated click reads `data-guest-id` (`roster.mjs:146-151`); count reports full filtered length (`:120`); search sets `list.scrollTop = 0` before re-render (`:132-135`). |
| §Phase 2 — viewport measurement | COMPLIANT | `measureVirtualViewport` (`roster.mjs:73-80`) reads `list.clientHeight`, falls back to `VIRTUAL_MIN_VIEWPORT_PX` on `<= 0`, and schedules exactly one rAF remeasure guarded by `pendingZeroViewportRemeasure` + `allowZeroRemeasure:false` — resolves plan-critique Path-to-100 #3 (no re-loop on persistent zero). |
| §Phase 2b — build module order | COMPLIANT | `scripts/build.mjs:11` places `src/lib/virtual-list.mjs` before `src/screens/roster.mjs` (`:14`); built artifact loads clean with the eager alias resolved. |
| §Phase 3 — CSS geometry | COMPLIANT (improved) | `styles.css` adds `.roster-list.is-virtualized` (block, `--roster-virtual-row-height:58px`), `.roster-virtual-spacer`, `.roster-virtual-row` (absolute, `right:0`, height=var), and the single-line `.guest-row span` clamp. **Beneficial deviation:** an added `.roster-list.is-virtualized .guest-row { height/min-height:58px }` rule pins the button to the fixed row so a long name cannot desync the 66/58 pitch — a defensive add beyond the plan literal, consistent with intent. |
| §Phase 3 — accessibility | COMPLIANT | No `role="listbox"`; native `<ul>`+`<button>` kept; `aria-setsize`/`aria-posinset` added on virtual rows (`roster.mjs:46-47`); empty state renders `NO MATCHING AGENTS` and clears virtual state; axe run on the virtualized 620-row list returns zero serious/critical. |
| §Phase 4 — unit tests | COMPLIANT | `tests/unit/virtual-list.test.mjs` — empty, threshold boundary, first/middle/end windows, negative/zero clamp, last-window spacer invariant. 7 cases, all green. |
| §Phase 4 — e2e test | COMPLIANT | `checkin.spec.mjs:129` — imports 620 rows, asserts `is-virtualized`, bounded DOM (`≤40`), long-name single-line (`whiteSpace:nowrap`, `scrollHeight≤clientHeight+1`), axe green, scroll-to-bottom select of Agent 619 → full SCAN/RESULT path, search narrows and reverts to non-virtualized with `scrollTop===0`. |
| §Phase 2 Path-to-100 #1 (down-transition toggle) | COMPLIANT | `renderSmallList`/`renderEmptyList` remove `.is-virtualized` and the CSS var (`roster.mjs:54-62`); e2e asserts the class is gone after the search narrows to ≤ threshold — resolves critique Path-to-100 #1. |
| §7 Integration points | COMPLIANT | `mountRoster` signature unchanged; admin CSV import re-mounts with the full indexed array; selection flows through the existing `onSelect(guestId)` → SCAN/RESULT/log; no storage schema change. |
| §9 Resource cleanup | COMPLIANT | Teardown (`roster.mjs:171-184`) clears debounce + hold timers, cancels pending rAF, removes scroll/resize/click/input/pointer listeners; the existing 20-cycle leak e2e stays green. |

**Implementation Score:** 97/100

## Defects

None blocking — score ≥95, **VERIFIED**, cycle complete. Two tiny, non-blocking specificity gaps
(Path-to-100 for a perfect 100, not defects to fix):

1. **Render-bound assertion is looser than the plan's exact formula.** §Phase 2 acceptance specifies
   at most `ceil(viewportHeight / VIRTUAL_ROW_HEIGHT_PX) + 2*VIRTUAL_OVERSCAN_ROWS` (+1 transient)
   rows; the e2e asserts the weaker `renderedRows ≤ 40` (`checkin.spec.mjs`). The bound holds and the
   intent is met, but the test does not pin the precise formula or exercise the transient-boundary-row
   case. Non-blocking.
2. **`window.CheckIn007.setState` remains exposed** beyond the cycle-1 §4.4 "only `start()`" public
   surface (reused here as the ROSTER-return e2e hook). Pre-existing, benign, carried from audit v9;
   noted only for completeness.

Both are cosmetic/test-precision items; neither affects the shipped artifact or any acceptance gate.
The plan/implementation loop reaches **State 4 — cycle complete**.

**Implementation Score:** 97/100

---

<!-- Authoritative current score (last occurrence wins) -->
**Plan Score:** 97/100
**Implementation Score:** 97/100
