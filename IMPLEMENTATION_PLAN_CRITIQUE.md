# Check-In 007 Plan Critique

**Plan Score:** 92/100
**Current Score**: 92/100
**Status:** NOT APPROVED (gate is ≥95)
**Latest review:** Revision 3 (re-review) — `IMPLEMENTATION_PLAN.md` v1 @ commit `affa721`, 2026-09-02

---

## Revision 3 — re-review (2026-09-02)

**Result: no change. Score holds at 92/100. NOT APPROVED.**

The plan is **still byte-identical** to the version critiqued in Revisions 1 and 2 —
verified: `git diff affa721 HEAD -- IMPLEMENTATION_PLAN.md` is empty, and the only commits
since the plan landed (`28afe6f`, `b37fc53`) are critique/audit updates, not plan or source
changes. The generator has **not revised the plan** across two full review cycles.

There is no new evidence to move any of the eight dimension scores; re-scoring an unchanged
artifact would be inflation. **The score therefore remains 92**, and the five "Path to ≥95"
items from Revision 1 (three blocking: build transform #1, iOS zoom criterion #2,
VoiceOver/ARIA #3; two testability: idempotent logging #4, clipboard assertion #5) remain
the exact, complete path to approval.

**Generator's required action (State 1 — plan < 95): revise the plan** to address the five
Path-to-≥95 items, then resubmit. Do **not** begin implementation. Note: the loop is now two
cycles stalled; the audit's inactivity decay has deepened to −2 (see `CONSOLIDATED_AUDIT.md`
v3). The full Revision 1 analysis below remains the authoritative critique of the plan text.

---

## Revision 2 — re-review (2026-09-02)

**Result: no change. Score holds at 92/100. NOT APPROVED.**

The plan under review (`IMPLEMENTATION_PLAN.md`, header "v1") is **byte-identical** to the
version critiqued in Revision 1 — verified: `git diff affa721 HEAD -- IMPLEMENTATION_PLAN.md`
is empty, and there are **no commits** between the baseline critique (`28afe6f`) and now.
The generator has not yet revised the plan in response to Revision 1.

Because nothing in the plan changed, there is no new evidence on which to move any of the
eight dimension scores. Re-scoring an unchanged artifact to a different number would be
inflation, not judgement. **The score therefore remains 92**, and the three blocking issues
plus two testability gaps from Revision 1 (below) are still the exact, complete path to ≥95.

**Generator's required action (State 1 — plan < 95): revise the plan**, addressing the five
"Path to ≥95" items below, then resubmit for re-critique. Do not begin implementation.

The full Revision 1 analysis is retained verbatim below — it remains the authoritative
critique of the current plan text.

---

# Check-In 007 Plan Critique — Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `affa721`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v1
**Score:** **92 / 100** (first review)
**Status:** NOT APPROVED (gate is ≥95)

An unusually thorough, specific, and internally consistent greenfield plan. The FSM
architecture, pure-logic/screen split, error-handling catalogue, and testing strategy are
all strong. It falls short of the ≥95 approval gate on three substantive points: the
highest-risk component (the ES-module → classic-script build transform) is described in a
single hand-waved sentence; a stated kiosk requirement (disable pinch-zoom via
`user-scalable=no`) rests on a viewport directive that iOS Safari deliberately ignores; and
accessibility (VoiceOver/ARIA), though declared in scope, is assigned to no phase and has no
acceptance criterion.

## Remaining issues

1. **Build transform (ES modules → one classic script) is under-specified.** §4 ("Build")
   and §5 Phase 7 both say `scripts/build.mjs` "inlines … JS modules (as one classic
   script)", but the *mechanism* is absent. ES modules use `import`/`export`, which are
   syntax errors in a classic `<script>`. Turning `src/*.mjs` into one classic script
   requires: (a) resolving the import graph into a correct topological order, (b) stripping
   or rewriting every `import`/`export` statement, (c) avoiding identifier collisions across
   modules (likely an IIFE or namespace per module), and (d) preserving `data/guests.default.js`
   which is already a classic script. This is the single highest-correctness-risk part of
   the project and it is the least specified. **Fix:** add a Phase-7 subsection specifying
   the transform strategy — e.g. "regex-strip leading `export ` keywords; remove `import`
   lines; concatenate modules in hand-declared dependency order inside one IIFE that
   assigns the app entry to `window`", *or* commit to a tiny vetted inliner — plus a unit/smoke
   test that the emitted `dist/index.html` has zero `import`/`export` tokens and boots.

2. **`user-scalable=no` does not disable pinch-zoom on iOS Safari.** §5 Phase 6 sets
   `viewport … user-scalable=no` and §7.3 lists "pinch-zoom … disabled" as a pass criterion.
   Since iOS 10, Mobile Safari **ignores** `user-scalable=no`/`maximum-scale` in the viewport
   meta for accessibility reasons. As written, this acceptance criterion cannot pass on the
   supported target. **Fix:** either (a) drop the "zoom disabled" claim and rely on the
   standalone Home-Screen mode (which does suppress double-tap zoom) plus `touch-action`
   CSS, and add `gesturestart`/`gesturechange` `preventDefault` handlers if hard-blocking is
   truly required; or (b) restate the criterion as "double-tap zoom and text callout
   suppressed" and verify only that.

3. **Accessibility is in scope but unassigned and untested.** §2 item 7 promises "VoiceOver
   labels" and reduced-motion; reduced-motion is well covered (Phase 1, config `REDUCED`,
   e2e), but VoiceOver/ARIA labeling appears in no phase task and no acceptance criterion.
   **Fix:** add ARIA/VoiceOver work to a phase (roster rows as a labeled list/buttons, scan
   status as `aria-live`, result announcement, admin controls) with a concrete acceptance
   check (e.g. an axe-core pass in e2e, or an explicit VoiceOver line on the manual iPad
   checklist).

4. **"Idempotent per visit" logging has no stated mechanism.** §5 Phase 4 appends a log
   entry "on RESULT entry (idempotent per visit)". If RESULT re-renders (orientation change,
   §6 item 15) or the FSM re-enters the state, a double append is possible. The plan does not
   say *how* once-per-visit is guaranteed. **Fix:** specify a per-visit latch (append on the
   SCAN→RESULT transition exactly once, guarded by the same navigation flag as §6 item 12),
   and add an e2e assertion that one visit produces exactly one log entry.

5. **Clipboard-content assertion in e2e is not obviously runnable.** §7.2 asserts
   "clipboard content equals the stored log". Reading the clipboard in Playwright/Chromium
   requires granting `clipboard-read` and, for the fake path, may need `--enable-features`.
   **Fix:** note the required Playwright `context.grantPermissions(['clipboard-read',
   'clipboard-write'])` (or assert on the Blob/text passed to the copy call rather than the
   OS clipboard) so the test is actually implementable.

6. **Single-file artifact size from base64 fonts is unaddressed.** §4/§9 inline three
   families (Oswald 600/700, Playfair 700, JetBrains Mono 500) as base64 WOFF2. Base64 adds
   ~33%; several weights can push `dist/index.html` past ~1 MB, which affects first-paint and
   Files-app handling on iPad. **Fix:** state a target budget and either subset the fonts
   (Latin + needed glyphs) or reduce weights, and note the expected artifact size.

## Scope Check

This is a greenfield v1 with **no prior audit findings and no backlog** (both created by
this review). There are therefore no pre-existing P0/P1 findings or backlog items the plan
ignores — the scope-adequacy caps do not apply. The plan's own scope is broad and internally
coherent: it covers setup → deploy, error handling, and testing. Deferred items (roster
windowing >500 rows, multi-device log merge, native build, sound) are explicitly listed as
out of scope with rationale, and are now tracked in `BACKLOG.md`.

Alternatives *are* considered for the key decisions (framework-less vs React/Vue; web app vs
native SwiftUI in §10 Q1; CSV-override vs fetch-JSON under `file://`; Node 22 vs 24). Good.

## Flaws of Commission

1. `user-scalable=no` relied upon to disable zoom on a platform (iOS Safari) that ignores it
   (issue #2). This is a factual error in a stated acceptance criterion.
2. Minor: `apple-mobile-web-app-capable` is the deprecated spelling (superseded by
   `mobile-web-app-capable`); still honored by iOS, so keep it but consider adding both.
   No other flaws of commission identified — versions, config values, and API choices are
   consistent and defensible.

## Flaws of Omission

1. Build-transform mechanism absent (issue #1).
2. VoiceOver/ARIA unassigned to any phase (issue #3).
3. Per-visit logging idempotency mechanism unspecified (issue #4).
4. No linting/formatting step in the toolchain (§8) — minor; not required for v1 but would
   raise engineering rigor and is easy to add (e.g. `prettier --check`).
5. No stated artifact-size budget for the single inlined file (issue #6).

## Regressions

None identified — this is a greenfield v1 with no prior working system to regress against.

## Why 92 and not 93

The build transform (issue #1) is load-bearing and genuinely under-specified — a competent
developer *would* have an architectural question here ("how do the .mjs sources become one
classic script?"), which is exactly what a ≥95 plan must preempt. Combined with a factually
incorrect zoom criterion (#2) and an in-scope-but-unassigned accessibility deliverable (#3),
three real gaps remain, not one. That's a 92, not a near-approval 94.

## Path to ≥95

Address all of the following in one revision pass:
1. Specify the ES-module → classic-script build transform and add a smoke test for it
   (issue #1). **[blocking]**
2. Correct the pinch-zoom claim/criterion for iOS Safari reality (issue #2). **[blocking]**
3. Assign VoiceOver/ARIA to a phase with an acceptance criterion (issue #3). **[blocking]**
4. State the per-visit logging idempotency mechanism + an e2e count assertion (issue #4).
5. Make the clipboard e2e assertion concretely runnable (issue #5).

## Path to 100

Beyond the ≥95 items:
- Add an artifact-size budget and font subsetting note (issue #6).
- Add a lint/format check to `package.json` scripts and Phase 0 acceptance.
- Tighten the §3.1 ASCII diagram: ADMIN's entry/exit edges are muddled relative to the prose
  (ADMIN is modal-from-ROSTER, dismiss-to-ROSTER); redraw so the diagram alone is
  unambiguous.
- Resolve or hard-default the six §10 open questions inline so the plan reads as fully
  self-contained (each already has an assumed default; promote them from "open" to "decided,
  revisit if organizer objects").
- Specify the debounce/search-index rebuild cost for the largest supported roster (500 rows)
  to prove the 60 fps claim under load.

## Summary

A high-quality, specific plan that is close to approval. It is held below the gate by one
genuinely risky under-specified component (the module-inlining build step), one factually
wrong platform assumption (zoom disabling on iOS Safari), and one in-scope-but-unplanned
deliverable (VoiceOver/ARIA). Fix the three blocking items plus the two minor testability
gaps and this comfortably clears 95.

---

**Authoritative score (this file): Plan Score 92/100 — NOT APPROVED. Plan unchanged since
Revision 1; generator must revise, not implement.**
