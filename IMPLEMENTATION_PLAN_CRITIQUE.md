# Check-In 007 — Implementation Plan Critique

**Plan Score:** 88/100
**Implementation Score:** N/A (no implementation this cycle yet)

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

**Plan Score:** 88/100
