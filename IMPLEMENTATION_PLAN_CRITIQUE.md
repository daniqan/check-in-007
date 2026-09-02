# Multi-Device Log Merge Plan Critique — Revision 2

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `b2477f5`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v7
**Plan Score:** **97 / 100** (previous: 93 — Rev 1)
**Status:** APPROVED (≥95 gate cleared)

Plan v7 resolves all three Rev-1 blockers and all five Path-to-100 nits with source-accurate
specificity. The `csv.mjs` build-order dependency, the CSV parse-throw error path, and the
cross-device (timezone/DST) timestamp ordering are each now nailed down with concrete decisions,
edge cases, and tests. Scope remains adequate and correctly bounded. The plan is
implementation-ready; a competent developer could start without architectural questions.

## Issues resolved in revision 2

1. **Build module-order dependency now fully specified (Rev-1 blocker #1 — RESOLVED).** §3
   (lines 81–84) states `log-merge.mjs` must sit **after `src/lib/csv.mjs` and before
   `src/lib/store.mjs`** and explains *why* — the bundler resolves named imports into
   `window.__CHECKIN007.modules.<ns>` aliases at module-init time, so `csv.mjs` (which supplies
   `parseCsv`) must execute first and `store.mjs` (which imports the merge helper) must execute
   last. The same constraint is now carried in §5 manifest (line 144), §6 Phase 4 (lines 343–347),
   and §7.5 (lines 393–398). Verified against source: `scripts/build.mjs:7–20` has `csv.mjs` at
   index 4 and `store.mjs` at index 5, and the alias rewrite at `build.mjs:106–115` confirms
   init-time resolution — the slot between them is indeed the only valid one. Crucially, §6/§10
   add a build-test assertion that `src_lib_log_merge` is emitted **after** `src_lib_csv` and
   **before** `src_lib_store`, *and* that the `src_lib_log_merge` chunk contains a
   `src_lib_csv.parseCsv` alias — so the namespace wiring is proven, not assumed. This is the exact
   bug class that blocked the prior cycle, and it is now closed.

2. **CSV parse-throw folded into the error taxonomy (Rev-1 blocker #2 — RESOLVED).** §6 Phase 1
   `parseLogCsv` (lines 188–192) now wraps `parseCsv()` in try/catch and converts throws —
   including the literal `"CSV has an unterminated quoted field."` — into file-level errors. §8
   (lines 407–409) documents the malformed-CSV-syntax path explicitly, and §10 (line 462) adds a
   unit test converting an unterminated-quote throw into a per-file error. Verified: `csv.mjs:41`
   throws exactly that string on an open quote. Phase 3's "file-level failures do not throw out of
   the whole batch" contract is now honored on the CSV path.

3. **Cross-device timestamp ordering now numeric and offset-aware (Rev-1 blocker #3 — RESOLVED).**
   §2.5 (lines 28–30), §6 Phase 1 (lines 168–170, 203–213), §8 (lines 416–418), §9 (line 439), and
   §10 (lines 467–468) all specify ordering by numeric `Date.parse(timestamp)` with deterministic
   tie-breaks (`guestId`, normalized `name`, `table`, `visitId`), preserving the original
   offset-bearing string for display/export. §8 carries a concrete example (lines 227–229):
   `2026-09-02T09:30:00-04:00` (13:30 UTC) sorts *after* `2026-09-02T14:00:00+01:00` (13:00 UTC)
   even though the strings compare oppositely. Verified: `format.mjs:1–11` emits offset-bearing
   local ISO, so a string sort would indeed be non-chronological across mixed offsets — the numeric
   comparison is the correct fix, and a dedicated mixed-offset unit test guards it.

Path-to-100 nits from Rev 1, all closed:

4. **Store method/import naming collision resolved.** §6 Phase 2 imports the helper as
   `mergeLogEntries as mergeLogEntrySets` (line 237) and the store method body calls
   `mergeLogEntrySets(loadLog(), importedEntries)` (line 251), with an explicit note that the
   public method name stays `mergeLogEntries` "but must not recurse into itself." Correct — in an
   object literal the method property does not shadow the aliased import binding.

5. **Apply-Merge event wiring specified.** §6 Phase 3 (lines 306–314) and the UI contract (lines
   322–325) route Apply Merge through the existing delegated `dialog.addEventListener('click', …)`
   as a new `data-action="apply-merge"` branch that exits before the export/copy/clear logic when
   no active preview exists, and require the export/copy branches to compute CSV/JSON only for
   their own actions. This matches the current delegation at `admin.mjs:80–102` and eliminates the
   ambiguity flagged in Rev-1 Omission #3.

6. **"No mutation" vs. clean-malformed reconciled.** §8 (lines 422–425) states the "no mutation"
   guarantee holds precisely when all existing rows are already canonical, that malformed
   existing-row dropping happens *only* on explicit Apply (never on preview), and that a valid
   no-op import with all-canonical existing rows leaves storage unchanged.

7. **e2e literal fixture pinned.** §10 (lines 494–504) supplies the exact expected merged CSV bytes
   and requires the assertion compare against that literal text rather than re-serializing with the
   production `toCsv()` helper.

8. **Performance target quantified.** §9 (lines 450–452) commits to a 10,000-row `mergeLogEntries()`
   benchmark under 250 ms to guard against accidental quadratic dedupe/comparison.

## Scope Check

Scope remains **adequate and correctly bounded** — no scope cap applies (unchanged from Rev 1).

- **Audit findings:** `CONSOLIDATED_AUDIT.md` v13 has zero open defects; Required Actions #1–#8 all
  DONE. Nothing in scope is ignored.
- **Backlog items:** The plan targets exactly the one in-progress backlog item (multi-device merge)
  and explicitly defers the other four (scan audio, native SwiftUI, offline-HTTPS helper, Node 24
  bump) in §2 "Out of scope" — each a distinct subsystem, correctly a separate cycle.
- **Integration points:** §7 enumerates all five boundaries with contract/failure/migration each.
- **Alternatives considered:** §4 justifies manual-file vs. WebRTC/cloud, `Blob.text()` vs.
  `FileReader`, `localStorage` vs. IndexedDB, and the last-write-free deterministic merge.

## Flaws of Commission

No flaws of commission identified. `LOG_COLUMNS` (§6 Phase 1) matches `exportLogCsv`'s column list
exactly (`store.mjs:103`); the `Blob.text()`, `URL.revokeObjectURL`, and `localStorage` choices are
all consistent with current code (`admin.mjs:20–28`, `store.mjs:16–56`); the deterministic
last-write-free merge is sound given `visitId = visit-${Date.now}-${random}` (`app.mjs:11`) is
effectively globally unique; and the naming-collision risk from Rev 1 is now explicitly disarmed.

## Flaws of Omission

No blocking flaws of omission remain. Two residual, non-blocking specificity gaps (Path-to-100):

1. **e2e narrative vs. literal fixture tension.** §10 line 486 says "create one local check-in,"
   but a live check-in through the SCAN flow generates a dynamic `visitId`
   (`visit-${Date.now}-${random}`) and a live `formatLocalIso()` timestamp — which cannot match the
   fixed fixture row `visit-local-1,alpha,Ada Lovelace,7,2026-09-02T09:00:00-04:00`. Line 502
   hints the test "may compute storage objects from the same expected rows" (i.e. seed storage
   directly), but the two statements aren't reconciled: the plan should say plainly whether the
   local row is seeded into `localStorage` under `checkin007.log.v1` or produced by a live SCAN
   (and if live, the fixture's first row must use the runtime-generated id/timestamp, not the fixed
   literal). Minor — an implementer resolves this in one line, but it's a genuine ambiguity.
2. **Benchmark environment sensitivity (§9, line 450–452).** The 250 ms threshold "on the Node test
   runner environment" can be flaky under loaded CI. The plan could note the assertion is a
   quadratic-guard (generous headroom) and, ideally, gate it behind a scaling check rather than a
   hard wall-clock. Non-blocking.

## Regressions

No regressions identified. The plan preserves the `checkin007.log.v1` key and row shape (§2, §12),
keeps `appendCheckIn`/`loadLog`/`clearLog`/`exportLogCsv`/`exportLogJson` API-stable (§6 Phase 2
acceptance), reuses the single `csv.mjs` parser (no second CSV parser, §3), adds no runtime deps
(§4.6), and routes new listeners through the dialog lifecycle so teardown removes them (§9). The
Apply-Merge integration explicitly does not auto-clear the existing log (§6 Phase 3 UI contract).

## Why 97 and not 98

Two residual specificity nits keep it off 98: the e2e "live check-in vs. fixed fixture" tension
(Omission #1) is a real ambiguity an implementer must resolve rather than a purely cosmetic point,
and the benchmark's hard wall-clock threshold (Omission #2) is a mild CI-flakiness risk. Neither is
architectural or blocking; both are one-line clarifications.

## Why 97 and not 96

All three Rev-1 blockers are resolved with source-verified precision — not hand-waved — and the
build-order fix even adds a namespace-resolution assertion that proves the `parseCsv` alias is
wired through the transform (stronger than Rev-1 asked for). All five Path-to-100 nits are closed,
including a literal e2e fixture whose values genuinely exercise both the `guestId` tie-break (two
rows at 13:00 UTC) and mixed-offset ordering (a 13:30 UTC row). This is more than a bare pass.

## Path to 100 (remaining nits — non-blocking)

1. Reconcile the §10 e2e "create one local check-in" narrative with the fixed literal fixture:
   state explicitly whether the local row is seeded into `localStorage` or generated live, and if
   live, use the runtime id/timestamp for that row rather than the fixed `visit-local-1` literal.
2. Make the §9 10k-row benchmark robust to CI variance (frame it as a quadratic-guard with generous
   headroom, or scale-check rather than hard 250 ms wall-clock).
3. Optional: in `parseLogFile` (§6 Phase 1, lines 195–201), note that a leading `{` routed to
   `parseLogJson` will correctly become a file-level "non-array JSON" error, so the content-sniff
   heuristic degrades gracefully for a stray object.

## Summary

Plan v7 is a strong, correctly-scoped, source-accurate cycle-3 plan that scores **97/100 —
APPROVED**. All three Rev-1 blockers (build `csv.mjs` order dependency, CSV parse-throw path,
cross-device timezone/DST ordering) and all five Path-to-100 nits are resolved, and every factual
claim about the existing code checks out against source. Two minor specificity nits remain
(e2e live-vs-seeded local row; benchmark CI robustness) — Path-to-100 only, no gate impact. The
plan is now the contract for implementation. **State 2 — implement the approved plan.** Do not
revise the plan further; build it and pass implementation verification (≥95).
