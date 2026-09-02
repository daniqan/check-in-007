# Check-In 007 — Implementation Plan v4

> Cycle 2 backlog plan. Source item: `BACKLOG.md` Deferred Features item
> "Roster windowing/virtualization for lists >500 rows (§2, §5 Phase 2 threshold)",
> now marked in progress as `- [/]`.

## 1. Overview

This cycle adds roster windowing for large attendee lists while preserving the current
007 kiosk flow, offline file build, privacy stance, and no-framework architecture. The
existing roster renders every filtered guest as a DOM node, which is acceptable for the
bundled small list but does not scale to the deferred >500-row target. The new behavior
will render only the visible rows plus overscan, keep the scrollable geometry equivalent
to a full list, and maintain accessible search and selection semantics.

## 2. Scope

### In scope

1. Virtualized roster rendering activates for filtered result sets larger than
   `ROSTER.VIRTUALIZE_THRESHOLD` (default: 500).
2. Non-virtual rendering remains in place for small result sets and zero-result states.
3. Search, count text, guest selection, admin import/reset, and cleanup behavior continue
   to work without API changes to `mountRoster`.
4. Accessibility is preserved with `role="listbox"`, stable button labels, `aria-setsize`,
   `aria-posinset`, and a live result count.
5. Unit tests cover the virtual window calculations, boundary clamping, overscan, and
   small-list bypass behavior.
6. End-to-end tests import a large CSV, verify bounded DOM rows, scroll to/select a late
   guest, and confirm search narrows to the expected guest.

### Out of scope

- Multi-device check-in log consolidation.
- Optional scan audio.
- Native SwiftUI iPad build.
- Offline static-HTTPS helper.
- Node 24 LTS toolchain bump.
- Variable-height row measurement. Rows are treated as fixed-height for this cycle.

## 3. Architecture

The app remains a zero-runtime-dependency single-page application. Virtualization is
implemented with a pure windowing helper in `src/lib/virtual-list.mjs` and thin DOM
integration inside `src/screens/roster.mjs`.

Data flow:

```text
guests -> filterGuests(query) -> filteredGuests
  -> shouldVirtualize(filteredGuests.length, threshold)
  -> computeVirtualWindow(scrollTop, viewportHeight, rowHeight, overscan, total)
  -> render only [startIndex, endIndex) as absolute-positioned rows
  -> delegated click emits selected guest id to existing FSM
```

Ownership boundaries:

- `src/lib/virtual-list.mjs` owns deterministic math only. It has no DOM dependency.
- `src/screens/roster.mjs` owns DOM measurement, scroll/resize listeners, rAF throttling,
  and list rendering.
- `src/config.mjs` owns all tunable constants, keeping the prior no-magic-number rule.
- `src/styles.css` owns fixed virtual row geometry and scroll container layout.

Failure domains:

- If measurement is unavailable or reports a zero viewport during first paint, the roster
  falls back to a conservative viewport height and schedules one rAF render.
- If a filtered set is at or below threshold, the existing full render path is used.
- If a scroll event fires after unmount, cleanup cancels pending rAF work and removes
  listeners so state transitions remain leak-free.

## 4. Technical Decisions & Rationale

1. **Native fixed-row virtualization instead of adding `react-window` or another UI
   dependency.** The project has no framework and packages to one self-contained HTML
   file. A small fixed-row helper fits the existing architecture better than adding React
   solely for list windowing. The accepted tradeoff is no variable-height rows in this
   cycle.

2. **Scroll events throttled through `requestAnimationFrame`.** MDN documents
   `requestAnimationFrame()` as scheduling work before the next repaint, which matches
   the need to coalesce high-frequency scroll events. Direct rendering in every scroll
   handler is rejected because it can produce redundant DOM work.
   Reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

3. **Manual math instead of IntersectionObserver sentinels.** MDN describes
   IntersectionObserver as asynchronous visibility observation, useful for threshold
   crossing. For a fixed-height list, direct `scrollTop / rowHeight` math is simpler,
   deterministic, and easier to unit-test. IntersectionObserver remains unnecessary
   because this plan is not lazy-loading remote resources.
   Reference: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

4. **Render visible rows plus overscan.** Established virtualization practice renders a
   small moving window rather than every item; web.dev's large-list virtualization guide
   describes keeping the DOM small for large lists. This plan applies the same pattern
   without introducing React.
   Reference: https://web.dev/articles/virtualize-long-lists-react-window

5. **Threshold at `>500`, not `>=500`.** The backlog item states "lists >500 rows"; 500
   rows stays on the existing full render path, and 501 rows activates virtualization.

## 5. File Manifest

```text
BACKLOG.md                         (MOD) — Mark the selected roster virtualization item in progress.
IMPLEMENTATION_PLAN.md             (MOD) — Replace completed cycle plan with this cycle-2 plan.
src/config.mjs                     (MOD) — Add roster virtualization constants.
src/lib/virtual-list.mjs           (NEW) — Pure fixed-row windowing math.
src/screens/roster.mjs             (MOD) — Integrate virtual rendering into the roster screen.
src/styles.css                     (MOD) — Add stable virtual list geometry and row positioning styles.
tests/unit/virtual-list.test.mjs   (NEW) — Unit tests for window math and threshold behavior.
tests/e2e/checkin.spec.mjs         (MOD) — Add large-roster virtualization workflow coverage.
```

No production dependencies are added. Existing toolchain remains Node `>=22`,
Playwright `1.62.1`, Prettier `3.9.6`, and `node:test`.

## 6. Implementation Phases

### Phase 1: Configuration and Pure Window Math

Add constants:

```js
export const ROSTER = {
  SEARCH_DEBOUNCE_MS: 120,
  VIRTUALIZE_THRESHOLD: 500,
  VIRTUAL_ROW_HEIGHT_PX: 66,
  VIRTUAL_OVERSCAN_ROWS: 6,
  VIRTUAL_MIN_VIEWPORT_PX: 360,
};
```

Create `src/lib/virtual-list.mjs`:

```js
export function shouldVirtualize(total, threshold) {
  /** Return true only when total > threshold. Invalid totals are treated as zero. */
  ...
}

export function computeVirtualWindow({ total, scrollTop, viewportHeight, rowHeight, overscan }) {
  /**
   * Return { startIndex, endIndex, topPadding, bottomPadding, visibleCount }.
   * Clamp negative scrollTop, zero viewportHeight, zero rowHeight, and overscan bounds.
   * endIndex is exclusive. total=0 returns a fully empty window.
   */
  ...
}
```

Acceptance criteria:

- `total=0` returns `startIndex=0`, `endIndex=0`.
- Negative `scrollTop` clamps to `0`.
- Overscan never creates indexes below `0` or above `total`.
- `topPadding + renderedHeight + bottomPadding` equals `total * rowHeight`.
- `shouldVirtualize(500, 500)` is false and `shouldVirtualize(501, 500)` is true.

### Phase 2: Roster DOM Integration

Modify `mountRoster` so `render(items)` chooses between small-list rendering and
virtualized rendering.

Skeleton:

```js
function createGuestRow(guest, absoluteIndex = null, total = null) {
  /** Build the existing guest button markup and add aria position metadata when virtualized. */
  ...
}

function renderSmallList(items) {
  /** Preserve current full-render behavior for <= threshold items and empty states. */
  ...
}

function renderVirtualList(items) {
  /**
   * Render a spacer with total height and only the computed window rows.
   * Rows are absolutely positioned with transform: translateY(topPadding + offset).
   */
  ...
}

function scheduleVirtualRender() {
  /** Coalesce scroll/resize/search-triggered virtual renders through requestAnimationFrame. */
  ...
}
```

DOM contract:

- The roster `<ul>` remains the scroll container and keeps delegated click handling.
- The virtualized list contains one `.roster-virtual-spacer` child with
  `height: total * rowHeight`.
- Rendered row `<li>` elements receive class `.roster-virtual-row` and an inline
  transform based on the absolute row index.
- Existing `.guest-row[data-guest-id]` click behavior is unchanged.
- The result count continues to report the full filtered count, not only rendered rows.

Acceptance criteria:

- A 501-row list renders at most
  `ceil(viewportHeight / VIRTUAL_ROW_HEIGHT_PX) + 2 * VIRTUAL_OVERSCAN_ROWS + 2` guest rows.
- Selecting a virtualized late-list guest calls the same `onSelect(guestId)` path as a
  non-virtual guest.
- Search resets `scrollTop` to `0` and recomputes the window against filtered results.
- Cleanup removes scroll/resize listeners and cancels pending rAF.

### Phase 3: Styling and Accessibility

Update roster CSS:

```css
.roster-list.is-virtualized {
  position: relative;
  display: block;
}

.roster-virtual-spacer {
  position: relative;
  width: 100%;
}

.roster-virtual-row {
  position: absolute;
  left: 0;
  right: 4px;
  height: var(--roster-virtual-row-height);
}
```

Accessibility contract:

- `.roster-list` keeps `aria-label="Ticketed guests"` and adds `role="listbox"`.
- Guest buttons remain focusable native buttons with the current descriptive
  `aria-label`.
- Virtual rows add `aria-setsize` and `aria-posinset` so assistive technology receives
  full-list context.
- Empty results continue to render `NO MATCHING AGENTS` and do not expose stale rows.

Acceptance criteria:

- Visual row height matches `ROSTER.VIRTUAL_ROW_HEIGHT_PX`, including the existing 8 px
  inter-row gap.
- No text overlap or horizontal overflow is introduced at 768x1024 and 1024x768.
- Momentum scrolling stays enabled through the existing `-webkit-overflow-scrolling:
  touch`.

### Phase 4: Tests and Verification

Add `tests/unit/virtual-list.test.mjs` for:

- Empty list.
- Below/equal/above threshold.
- First viewport window.
- Middle scroll window.
- End-of-list clamping.
- Negative and zero measurement inputs.

Extend `tests/e2e/checkin.spec.mjs` with one focused large-roster test:

```js
test('large imported rosters virtualize while preserving search and selection', async ({ page }) => {
  /**
   * Import a 620-row CSV through admin.
   * Assert DOM guest-row count is bounded.
   * Scroll roster list near the bottom.
   * Select Agent 619 and complete the check-in.
   * Return to roster, search Agent 012, and assert the filtered result is visible.
   */
  ...
});
```

Required verification commands:

```bash
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

## 7. Integration Points

1. **`mountRoster(root, { guests, onSelect, onAdminHold, store })`**
   - Contract: caller still passes a search-indexed guest array and receives selected
     guest ids through `onSelect`.
   - Failure mode: unknown guest ids remain handled by existing downstream lookup
     behavior; virtualization must not synthesize ids.
   - Migration path: no caller changes.

2. **Admin CSV import**
   - Contract: `onRosterChanged(nextGuests)` rebuilds the indexed array in `app.mjs`;
     reopening ROSTER passes the full array to `mountRoster`.
   - Failure mode: malformed CSV remains handled by existing admin/import code.
   - Migration path: large imported rosters automatically virtualize on the next roster
     render.

3. **Check-in log**
   - Contract: selecting a virtualized guest flows through SCAN and RESULT exactly like
     a small-list guest; logging remains in RESULT.
   - Failure mode: double-click protection via `navigating` still prevents duplicate
     navigation.
   - Migration path: no storage schema change.

4. **Build artifact**
   - Contract: `scripts/build.mjs` inlines module code into `dist/index.html`.
   - Failure mode: a new module import must remain static and relative so the current
     acorn-based build transform can include it.
   - Migration path: adding `src/lib/virtual-list.mjs` follows the existing ES module
     pattern and requires no build-script change.

## 8. Error Handling & Edge Cases

- **Empty filtered list:** render the existing empty message, clear virtual state, count
  says `0 agents visible`.
- **Exactly 500 results:** use full render path because the backlog threshold is `>500`.
- **501+ results:** use virtual render path.
- **Search after deep scroll:** reset `scrollTop` to `0`, recompute against filtered
  results, and avoid blank windows.
- **Viewport height temporarily zero:** use `ROSTER.VIRTUAL_MIN_VIEWPORT_PX` for one
  render and schedule a later render through rAF.
- **Rapid scroll events:** coalesce with one pending rAF id; cleanup cancels the id.
- **Unmount during pending rAF:** cleanup sets a local `mounted=false`, cancels rAF, and
  prevents DOM writes after the screen is gone.
- **Late-list selection:** delegated click reads `data-guest-id` from the row button, not
  from the displayed index, so filtering and scroll position do not corrupt ids.
- **Imported duplicate names:** existing `normalizeGuests` behavior still dedupes before
  virtualization sees the array.
- **Reduced motion:** no new animation is added; reduced-motion timing path is unchanged.

## 9. Stability & Performance

Time complexity:

- Filtering remains `O(n)` over the indexed roster. With 620 to 2,000 guests, this is a
  small string-contains pass already covered by the existing debounce.
- Virtual window calculation is `O(1)`.
- Rendering is `O(v + overscan)`, where `v = ceil(viewportHeight / rowHeight)`. On a
  1024 px iPad viewport with 66 px rows and 6-row overscan, the expected render count is
  about 28 rows instead of 620+.

Memory profile:

- The guest array remains in memory once, as today.
- DOM nodes are bounded to visible plus overscan rows for virtualized lists.
- Pending scheduler state is one rAF id and a few scalar measurements.

Latency targets:

- Search input remains debounced at 120 ms.
- Scroll updates should perform one DOM replacement per animation frame at most.
- Large-roster initial render target is under 50 visible row nodes.

Resource cleanup:

- Remove `scroll` and `resize` listeners during roster unmount.
- Cancel pending debounce, admin hold timeout, and rAF.
- Do not create timers or observers that survive state transitions.

## 10. Testing Strategy

Unit tests:

- `computeVirtualWindow` returns deterministic ranges at top, middle, and bottom scroll
  offsets.
- Clamping handles negative scroll, zero/negative row height, zero viewport, and overscan
  larger than total.
- `shouldVirtualize` enforces the strict `>500` rule.

End-to-end tests:

- Import 620 guests through the existing admin file input.
- Assert the visible DOM row count is bounded and substantially below 620.
- Scroll to the bottom of `.roster-list` and select a late guest by accessible name.
- Confirm the usual SCAN/RESULT/log path works for that selected guest.
- Search after returning to ROSTER and verify the list resets to the first matching row.
- Keep the existing axe, privacy, leak, reduced-motion, file-artifact, and admin export
  tests passing.

Regression risks covered:

- Small bundled roster still renders with the existing markup.
- Empty search results still show `NO MATCHING AGENTS`.
- Event delegation still works after rows are replaced.
- Cleanup does not regress the existing 20-cycle leak test.

## 11. Environment & Toolchain

Fresh clone setup is unchanged:

```bash
npm ci
npm run build
npm run test
```

The implementation must not add runtime dependencies or require a network at runtime.
The app must continue to run from `file://dist/index.html` and through `npm run serve`.

## 12. Deployment & Distribution

Distribution remains the existing single-file artifact:

1. Build with `npm run build`.
2. Use `dist/index.html` for file deployment or `npm run serve` / `npm run serve:https`
   for local serving.
3. Rollback is the prior committed artifact/source state; no data migration is needed
   because roster/log storage schemas are unchanged.

## 13. Open Questions

1. **Should virtualization support variable-height names later?**
   Proposed resolution: no for this cycle. Existing CSS clamps names to two lines and
   fixed-height rows are sufficient for event rosters. Revisit only if real guest data
   requires unbounded display names.

2. **Should the threshold be configurable by users?**
   Proposed resolution: no. Keep it in `src/config.mjs` for developer tuning and avoid
   admin-panel complexity.

3. **Should virtualization use IntersectionObserver sentinels?**
   Proposed resolution: no for fixed rows. Revisit only if future lazy media or grouped
   headers make direct scroll math insufficient.
