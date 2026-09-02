# Multi-Device Log Merge Plan Critique — Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `f6e09eb`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v6
**Plan Score:** **93 / 100** (first review)
**Status:** NOT APPROVED (below the ≥95 gate — close; one revision pass)

Plan v6 opens cycle 3 against the `BACKLOG.md` "Multi-device check-in log
consolidation / merge tooling" item. It is a strong, well-structured, correctly-scoped
plan: clean pure-lib / store / UI separation that matches existing conventions, verified-accurate
claims about the current code, good alternatives analysis, and thorough edge-case and testing
sections. It falls three concrete gaps short of the gate — all in specificity/robustness, none
architectural.

## Scope Check

Scope is **adequate and correctly bounded** — no scope cap applies.

- **Audit findings:** `CONSOLIDATED_AUDIT.md` v12 has **zero open defects** and all Required
  Actions #1–#8 DONE. Nothing in scope is ignored.
- **Backlog items:** The plan targets exactly one backlog item (multi-device merge) and
  explicitly defers the other four (scan audio, native SwiftUI, offline-HTTPS helper, Node 24
  bump) in §2 "Out of scope." Each of those is a distinct subsystem, correctly a separate cycle.
  No related in-scope backlog items are left unaddressed.
- **Integration points:** §7 enumerates all five boundaries (input→parser, parser→merge,
  merge→store, store→export, build transform) with contract/failure/migration for each. Good.
- **Alternatives considered:** §4 justifies manual-file vs. WebRTC/cloud, `Blob.text()` vs.
  `FileReader`, `localStorage` vs. IndexedDB, and the last-write-free deterministic merge. Good.

## Remaining issues

1. **Build module-order dependency on `csv.mjs` is under-specified (BLOCKING — moderate).**
   Phase 1 has `log-merge.mjs` import `parseCsv` from `csv.mjs`, and Phase 2 has `store.mjs`
   import `mergeLogEntries` from `log-merge.mjs`. §3, §4.4 wording, §6 Phase 4, and §7.5 all
   state only the constraint "`log-merge.mjs` **before** `store.mjs`." But because the bundler
   resolves named imports into `window.__CHECKIN007.modules.<ns>` aliases *at module-init time*
   (`scripts/build.mjs:106-115`), `log-merge.mjs` must **also** appear **after** `csv.mjs` in the
   `modules` array (`build.mjs:7-20`), or its `parseCsv` alias is undefined when the IIFE runs.
   The one valid slot is between `csv.mjs` (index 4) and `store.mjs` (index 5). State this
   explicitly. This is the exact bug class that blocked the *previous* cycle (Rev-1 §7.4
   build-script claim), so precision here matters. **Fix:** in §5/§6 Phase 4 and §7.5, require
   `log-merge.mjs` inserted *after* `src/lib/csv.mjs` and *before* `src/lib/store.mjs`, and add a
   build-test assertion (or reuse the existing residual-syntax/`build.test.mjs` check) that the
   `log-merge` namespace resolves.

2. **CSV parse-level throw is not in the error taxonomy (BLOCKING — moderate, omission).**
   `parseCsv` *throws* `"CSV has an unterminated quoted field."` on a bad quote
   (`csv.mjs:41`). §8 handles the JSON path ("catch `JSON.parse` errors") but the CSV path lists
   only "missing required columns" as a file-level error — a malformed-quote CSV would throw out
   of `parseLogCsv`/`readMergeFiles` and, per Phase 3's own contract, "file-level parser failures
   … do not throw out of the whole batch" would be violated. **Fix:** §8 and Phase 1
   `parseLogCsv` must wrap `parseCsv` in try/catch and convert the throw into a per-file error
   (same as invalid JSON), and §10 must add a unit test for an unterminated-quote CSV.

3. **Cross-device timestamp ordering (timezone / DST) is unaddressed (BLOCKING — moderate,
   omission).** `formatLocalIso()` emits an offset-bearing local ISO string, e.g.
   `2026-09-02T14:30:00+05:30` (`src/lib/format.mjs:1-11`). For a *multi-device* merge, the two
   iPads may carry different timezone offsets, or one may span a DST change — so a lexicographic
   string sort of `timestamp` is **not** chronological across mixed offsets, yet §2.5 / §6 Phase 1
   / §9 say "sort … by timestamp ascending" without specifying string vs. numeric comparison.
   **Fix:** specify that ordering compares `Date.parse(timestamp)` (numeric, offset-aware) with
   the listed fields as tie-breaks, keep the original string for display/export, and add a §8
   edge case + a unit test covering two rows whose offsets differ but whose absolute instants
   order oppositely to their string order.

## Flaws of Commission

1. **Naming collision risk in the store (minor).** §Phase 2 imports `mergeLogEntries` from
   `log-merge.mjs` *and* exposes a store method literally named `mergeLogEntries`. In an object
   literal the method is a property (no shadow of the imported binding), so it works — but the
   plan should call this out and show the method body calling the *imported* `mergeLogEntries`,
   to prevent an accidental self-recursive call during implementation. Cite §Phase 2 pseudocode.

2. Otherwise no flaws of commission. LOG_COLUMNS (§6 Phase 1) matches `exportLogCsv`'s column
   list exactly (`store.mjs:103`); `Blob.text()`, `URL.revokeObjectURL`, and `localStorage`
   choices are all consistent with the current code (`admin.mjs:20-28`, `store.mjs:16-56`); the
   deterministic last-write-free merge is sound given `visitId = visit-${Date.now}-${random}`
   (`app.mjs:11`) is effectively globally unique.

## Flaws of Omission

1. **CSV parse-throw handling** — see Remaining issue #2.
2. **Mixed-timezone/DST ordering** — see Remaining issue #3.
3. **Apply-time event wiring vs. the existing delegated handler (minor).** The admin dialog
   already runs a single delegated `dialog.addEventListener('click', …)` that recomputes
   `exportLogCsv()`/`exportLogJson()` on *every* `data-action` click and carries `clearArmed`
   state (`admin.mjs:80-102`). The plan (§Phase 3) adds an "Apply Merge" button but does not
   say whether it hangs off that delegated handler (harmless but wasteful, and must be a no-op
   when no preview is active) or a dedicated listener. Specify, so the disabled/guarded state is
   unambiguous and the merge path does not accidentally trip the existing export/clear branches.
4. **"Do not mutate existing entries" vs. "apply cleans malformed existing rows" (minor
   consistency).** §6 Phase 1 acceptance says "Empty imports … do not mutate existing entries,"
   while §8 says applying the merge persists only canonical rows "so future exports are clean" —
   i.e., an apply with a *valid* but no-op import would still silently drop pre-existing
   malformed local rows. Reconcile the wording: state that normalization of existing rows only
   drops rows that fail validation, that this happens *only* on explicit Apply (never on
   preview), and that the "no mutation" guarantee holds precisely when all existing rows are
   already canonical.

## Regressions

No regressions identified. The plan preserves the `checkin007.log.v1` key and row shape (§2, §12),
keeps `appendCheckIn`/`loadLog`/`clearLog`/`exportLogCsv`/`exportLogJson` API-stable (§6 Phase 2
acceptance), reuses the single `csv.mjs` parser (no second CSV parser), adds no runtime deps (§4.6),
and routes new listeners through the dialog lifecycle so teardown removes them (§9). Existing unit
tests (`tests/unit/store.test.mjs`) exercise the unchanged export/idempotency behavior the plan
commits to keeping.

## Why 93 and not 95

Three concrete moderate gaps stand between a competent developer and a question-free start:
the `csv.mjs` build-order dependency (issue #1), the missing CSV parse-throw path (issue #2), and
unspecified cross-device timestamp ordering (issue #3). Each is a real decision the implementer
would otherwise have to improvise — and issue #1 is the same build-ordering class that blocked the
prior cycle. None is architectural, which is why this is 93 (close) and not lower.

## Why 93 and not 92

The architecture, scope discipline, alternatives analysis, integration map, and testing strategy
are all genuinely strong, and every factual claim about the existing code checks out against source.
This is a high-quality plan with narrow, well-bounded gaps — not a structurally weak one.

## Path to ≥95

Address all three BLOCKING items:

1. §5/§6 Phase 4/§7.5: require `log-merge.mjs` **after `csv.mjs` and before `store.mjs`** in the
   `build.mjs` `modules` array, with a build assertion that the `log-merge` namespace resolves.
2. §8 + §6 Phase 1 + §10: wrap `parseCsv` in try/catch inside `parseLogCsv`, convert the
   unterminated-quote throw into a per-file error, and add a unit test for it.
3. §2.5/§6 Phase 1/§8/§9/§10: define ordering as numeric `Date.parse(timestamp)` with the listed
   tie-break fields, keep the original timestamp string for export, and add a mixed-offset unit test.

Addressing these three moves the plan to ~96. The four minor items below are not required for the
gate but close the remaining distance to excellence.

## Path to 100

- Resolve the store method/import naming collision explicitly in §Phase 2 (Commission #1).
- Specify Apply-Merge event wiring and its no-preview no-op guard (Omission #3).
- Reconcile the "no mutation" vs. "clean malformed existing rows" wording (Omission #4).
- Add a concrete expected-output fixture (exact merged CSV bytes) to the §10 e2e so the
  "export exactly matches storage" assertion is pinned to a literal, not recomputed in-test.
- Quantify the "hundreds to low thousands, 10k upper bound" claim (§9) with a single timed
  benchmark target (e.g. merge of 10k rows < N ms) so the performance assertion is testable.

## Summary

Plan v6 is a strong, correctly-scoped, source-accurate cycle-3 plan that scores **93/100 — NOT
APPROVED**, three moderate specificity gaps below the gate: the `csv.mjs` build-order dependency,
the missing CSV parse-throw error path, and unspecified cross-device (timezone/DST) timestamp
ordering. All three are narrow and mechanically fixable; addressing them (plus the four Path-to-100
nits) in one revision should clear ≥95. State 1 — revise the plan; do not begin implementation.
