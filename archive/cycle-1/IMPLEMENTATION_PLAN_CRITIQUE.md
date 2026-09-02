# Check-In 007 Plan Critique

**Plan Score:** 98/100
**Implementation Score:** 96/100
**Status:** Plan APPROVED (≥95 cleared); IMPLEMENTATION **VERIFIED** — 96 ≥ 95 gate → **State 4: cycle complete**
**Latest review:** Implementation Verification v2 — source @ commit `75c8279`, audited 2026-09-02

---

## Implementation Verification — v2

**Plan:** `IMPLEMENTATION_PLAN.md` v3 @ approved score 98/100 (Revision 7)
**Code:** commit `75c8279` ("fix(audit): cover implementation verification gaps"), audited 2026-09-02
**Result:** **Implementation Score 96/100 — VERIFIED (gate ≥95 cleared).** State 4: the plan/
implementation cycle is complete. Defects D1–D6 from Verification v1 are all resolved and
confirmed by execution; the plan remains the authoritative contract and was not altered.

### What was verified by execution (hard evidence)

- **Unit tests:** `node --test tests/unit/*.test.mjs` → **16/16 pass**.
- **E2E tests:** `npx playwright test` → **8/8 pass** (up from 4/4). The four new specs are the
  D1–D5 acceptance assertions.
- **Build:** `node scripts/build.mjs` → `dist/index.html` at **20,858 gzip bytes** (budget ≤750 KB
  gzip / ≤1.2 MB uncompressed), **exactly 1 `<script>`**, **0** `type="module"` tokens.
- **Lint:** `prettier --check .` → clean.
- **§4.1 invariant restored:** `grep -rnE '\b(2000|2600|4500|5000|120|900|2500|4000)\b' src --include='*.mjs'`
  excluding `config.mjs` → **NONE**. The "grep for literal durations and find none outside
  `config.mjs`" claim is true again.

### Defect resolution (D1–D6 from Verification v1)

| Defect | Fix landed in `75c8279` | Verified |
|--------|--------------------------|----------|
| **D1** privacy frame-grab spy + track-ended | e2e test #1 spies `toDataURL`/`captureStream`/`MediaRecorder` (all asserted 0), asserts every video track `ended` and `srcObject` null after SCAN | ✅ test passes |
| **D2** orientation-change idempotency | e2e test #3 drives boot→scan→RESULT, calls `setViewportSize()` twice, asserts exactly 1 log entry for the `visitId` | ✅ test passes |
| **D3** export-equals-stored-log | e2e test #5 grants `clipboard-read/write`, spies `clipboard.writeText`, asserts copied string `=== ` the CSV recomputed from `checkin007.log.v1` | ✅ test passes |
| **D4** 20-cycle timer/listener leak | e2e test #6 instruments `setTimeout`/`addEventListener`, loops the flow 20×, asserts counts equal baseline; backed by `roster.mjs` now delegating one list `click` listener and `removeEventListener`-ing all listeners on unmount | ✅ test passes |
| **D5** reduced-motion e2e | e2e test #7 `emulateMedia({ reducedMotion:'reduce' })`, roster appears in 973 ms — under the 2000 ms cap the normal 2600 ms `LOADING_MS` path would miss, proving `REDUCED` timings are selected | ✅ test passes |
| **D6** §4.1 single-source-of-truth | `config.mjs` adds `ROSTER.SEARCH_DEBOUNCE_MS = 120`; `roster.mjs` imports `ADMIN`/`ROSTER` and uses `ADMIN.HOLD_MS` + `ROSTER.SEARCH_DEBOUNCE_MS`; grep invariant holds | ✅ verified |

### Remaining nits (Path to 100 — not gates)

1. **D5 reduced-motion e2e proves only the LOADING timing.** It asserts LOADING auto-advances
   under `REDUCED.LOADING_MS`, which matches the D5 directive, but does not additionally assert
   the `REDUCED` `SCAN_MS`/`RESULT_MS`/`TRANSITION_MS` values are used. Shallow but acceptance-
   satisfying. Path to 100: assert a reduced SCAN or RESULT duration too.
2. **`window.CheckIn007.setState` is exposed beyond the documented public surface.** §4.4 step 5
   says the bundle "exposes only `window.CheckIn007.start()`". The D4 leak test drives
   `window.CheckIn007.setState('ROSTER')`, so `setState` is now public. A benign test affordance
   and an improvement for testability, but a minor deviation from the §4.4 "only `start()`" wording.
   Path to 100: namespace test hooks (e.g. `window.CheckIn007.__test.setState`) or back-port the
   wider surface into §4.4.

### Why 96 and not higher

The two nits above are the only gap between the delivered code and a flawless 98–100: one e2e
assertion is shallower than it could be, and one extra public method slipped past the §4.4
"only `start()`" contract. Neither affects behavior, correctness, or any acceptance criterion.

### Why 96 and not lower

Every §5 phase acceptance criterion and the full §7.2 e2e enumeration are now implemented and
green under execution — including the flagship privacy proof (§1) that Verification v1 flagged as
honored-in-code-but-untested. Build/budget/lint/artifact-shape/`file://` boot all pass; the §4.1
magic-number regression is gone. This is a comprehensively tested, faithful implementation of the
approved 98/100 plan. **Cycle complete.**

---

## Implementation Verification — v1

**Plan:** `IMPLEMENTATION_PLAN.md` v3 @ approved score 98/100 (Revision 7)
**Code:** commit `07ef178` ("feat: implement approved check-in kiosk plan"), audited 2026-09-02
**Result:** **Implementation Score 91/100 — NOT VERIFIED (gate ≥95).** State 3: fix the listed
defects in code; do **not** revise the plan (it remains the authoritative contract at 98/100).

### What was verified by execution (hard evidence, not code-reading)

- **Unit tests:** `node --test tests/unit/*.test.mjs` → **16/16 pass** (csv, roster, format, store, build).
- **E2E tests:** `npx playwright test` → **4/4 pass** (boot→scan→result→log; covert mode; admin
  import + axe-core zero serious/critical; `file://` artifact boot).
- **Build:** `node scripts/build.mjs` → emits `dist/index.html`, **20,683 gzip bytes** (well under
  the ≤750 KB gzip / ≤1.2 MB uncompressed budget). Artifact has **exactly 1 `<script>`**, **zero**
  `type="module"`, and the AST residual check passes.
- **Lint:** `prettier --check .` → clean.
- **Privacy (code):** `grep -rnE 'drawImage|toDataURL|captureStream|MediaRecorder|getImageData' src/`
  → **no matches.** `scan.mjs` stops every track and nulls `srcObject` on exit and on the
  `stopped`-after-await race. The flagship "theater only" requirement is honored **in code**.

### Section-by-section compliance

| Plan section | Status | Notes |
|--------------|--------|-------|
| §3.2/§3.4 file manifest | COMPLIANT | Every listed file exists (`src/`, `lib/`, `screens/`, `scripts/`, `tests/`, `data/`, `assets/fonts/`). |
| §4 tech decisions & dev-dep pins | COMPLIANT | `package.json` pins `@playwright/test` 1.62.1, `acorn` 8.18.0, `axe-core` 4.13.0, `http-server` 14.1.1, `prettier` 3.9.6; `engines.node >=22`. `package-lock.json` committed. |
| §4.1 config single source of truth | **DEVIATED** | `config.mjs` matches §4.1 exactly, but `roster.mjs:65` hardcodes `2000` for the admin hold instead of importing `ADMIN.HOLD_MS` (=2000), and `roster.mjs:60` hardcodes the `120` ms debounce. §4.1 claims "grep for literal durations and find none outside `config.mjs`" — that claim now fails. Defect D6. |
| §4.4 build transform | COMPLIANT | `scripts/build.mjs` uses `acorn` AST parse, rejects default/namespace/re-export/side-effect imports, wraps each module in a `window.__CHECKIN007.modules.<ns>` IIFE, re-parses the emitted bundle as `sourceType:'script'` and rejects residual module syntax + sourcemap comments. `build.test.mjs` covers alias imports, export-object conversion, string/comment false-positive avoidance, and unsupported-syntax errors. |
| §5 Phase 1 (FSM/timers/cleanup) | PARTIAL | FSM + central `cleanup()` on every `setState` implemented; reduced-motion timing swap present. **Acceptance "no timer/listener leaks across 20 cycles (verified in e2e)" has no test.** Defect D4. |
| §5 Phase 2 (roster) | COMPLIANT | Debounced search, case/diacritic-insensitive filter, ≥44 px rows (`styles.css:45`), momentum scroll (`-webkit-overflow-scrolling: touch`), empty state "NO MATCHING AGENTS", double-tap `navigating` guard, ~40 themed guests. |
| §5 Phase 3 (scan/camera/covert) | PARTIAL (code COMPLIANT) | `isSecureContext`/`getUserMedia` guard, covert fallback, track cleanup, post-await `stopped` race all correct. **But the Phase 3 acceptance "e2e asserts no frame-grab APIs are called and tracks are stopped on exit" is not implemented** — the covert e2e never spies on `toDataURL`/`captureStream`/`MediaRecorder` and never asserts tracks are `ended`. Defect D1. |
| §5 Phase 4 (result/logging) | PARTIAL | Correct table lookup, missing-table → "PROCEED TO THE CHECK-IN DESK", `visitId` idempotency via `loggedVisitIds`, "RE-VERIFYING" repeat note. Unit test proves visitId idempotence. **§7.2 orientation-change re-render e2e asserting exactly one entry is absent.** Defect D2. |
| §5 Phase 5 (admin) | PARTIAL | Long-press → dialog, CSV import (validated), CSV/JSON export via Blob, Copy-to-clipboard with `execCommand` fallback returning the exact string, reset roster, two-step clear-log. **§7.2 "export contents match the stored log exactly (verified in e2e)" is not tested** — the admin e2e imports but never exports/compares, and never grants clipboard permissions/spies. Defect D3. |
| §5 Phase 6 (polish/kiosk/a11y) | COMPLIANT | Kiosk meta (viewport-fit=cover, both `*-web-app-capable`, black status bar), `touch-action: manipulation`, ≥16 px inputs, `gesturestart` preventDefault gated on `navigator.standalone`, ARIA (labeled button rows, search label + `role=status` count, polite scan `aria-live`, assertive result, dialog `aria-modal` + focus return). axe-core e2e passes. |
| §5 Phase 7 (build/tests/docs) | PARTIAL | Build + budget enforcement + unit/e2e harness present and green; README has run/build/deploy + iPad checklist. **But §7.2's enumerated e2e list is only ~half implemented** (see D1–D4 and reduced-motion D5). |
| §7.2 reduced-motion e2e | MISSING | No `emulateMedia({ reducedMotion:'reduce' })` test; the REDUCED path is exercised only via unit-level config, not e2e as §7.2 specifies. Defect D5. |
| §9 deployment (file:// + served) | COMPLIANT | `file://` boot to ROSTER in covert mode is e2e-verified; served path documented. |

### Defects (fix in code — the plan is the spec, do not edit the plan)

1. **D1 — Privacy frame-grab spy + track-ended assertion missing (Phase 3 / §7.2).** The plan's
   most-emphasized requirement (§1: privacy stance "enforced **and tested**") has compliant code
   but no test proving it. **Fix:** in the covert/happy e2e, spy on
   `HTMLCanvasElement.prototype.toDataURL`, `HTMLVideoElement.prototype.captureStream`, and
   `window.MediaRecorder`, assert none were called, and assert every video track is `ended` after
   leaving SCAN (grant `camera`, keep tracks referenced via `getUserMedia` spy). *Highest priority.*
2. **D2 — Orientation-change idempotency e2e missing (Phase 4 / §7.2).** **Fix:** drive boot→scan→
   RESULT, call `page.setViewportSize()` to force a RESULT re-render, then assert the
   `checkin007.log.v1` array still has exactly one entry for that `visitId`.
3. **D3 — Export-equals-stored-log e2e missing (Phase 5 / §7.2).** **Fix:** after a check-in, open
   admin, click Export/Copy CSV with `context.grantPermissions(['clipboard-read','clipboard-write'])`,
   and assert the copied/blob string equals `store.exportLogCsv()` (spy on `clipboard.writeText` or
   the fallback helper for the exact argument).
4. **D4 — 20-cycle timer/listener leak e2e missing (Phase 1 acceptance).** **Fix:** loop the full
   flow (or drive `setState`) ≥20 times and assert no growth in active timers/listeners (e.g. via a
   `setTimeout`/`addEventListener` counter injected in an init script), proving `cleanup()` releases.
5. **D5 — Reduced-motion e2e missing (§7.2).** **Fix:** `test.use({ reducedMotion: 'reduce' })` or
   `emulateMedia`, then assert LOADING auto-advances within `REDUCED.LOADING_MS` (+tolerance),
   confirming the REDUCED timings are actually selected in the browser.
6. **D6 — §4.1 single-source-of-truth violated (minor).** `src/screens/roster.mjs:65` uses literal
   `2000` where `ADMIN.HOLD_MS` exists; `:60` uses literal `120` for the debounce. **Fix:** import
   `ADMIN` and use `ADMIN.HOLD_MS`; add the debounce interval to `config.mjs` (e.g.
   `ROSTER.SEARCH_DEBOUNCE_MS = 120`) and reference it, restoring the §4.1 grep invariant.

### Why 91 and not higher

The application is functionally complete and every **written** test passes — this is a genuinely
strong implementation. But each phase's §5 acceptance criteria are the audit checklist, and **five
explicitly-enumerated e2e acceptance assertions are absent** (D1–D5), the most consequential being
the privacy frame-grab proof the plan singled out as a tested product requirement. Combined with the
§4.1 magic-number regression (D6), that is more than cosmetic — it is a real fidelity gap between the
approved 98/100 spec and the delivered test surface. That places it clearly below the 95 gate.

### Why 91 and not lower

Zero core-feature failures. All 16 unit + 4 e2e tests pass; build, budget, lint, artifact-shape, and
`file://` boot are verified by execution; the build transform (the plan's historically highest-risk
component) is fully compliant and tested; and the privacy requirement is honored **in code** (no
frame-grab APIs exist anywhere in `src/`). The gaps are test-coverage breadth plus one config nit —
all fixable in a single code pass without touching application behavior.

### Path to ≥95 (implementation)

Land D1–D5 (the missing e2e assertions) and D6 (config constants). D1 is mandatory — the privacy
guarantee must be test-enforced, not just code-honored. No plan revision is needed or wanted.

---

## Revision 7 — full re-critique of plan v3 (2026-09-02)

**Result: APPROVED. Score 96 → 98/100. Gate (≥95) cleared.**

The plan header now reads **v3** and `git diff 9a6c2ec 4f079c8 -- IMPLEMENTATION_PLAN.md`
shows a focused revision. Because the plan version is newer than the last-critiqued version
(v2, Revision 6), this is a full re-critique per the version-check rule — not a no-change
re-review. **All three "Remaining nits (Path to 100)" from Revision 6 are resolved, and no
new flaws are introduced.** Verified against the plan text:

1. **Nit #1 (regex/line parsing → AST) — RESOLVED.** §4.4 now specifies an `acorn`-backed
   transform: step 2 parses each module with `acorn.parse(src, { ecmaVersion: 2020,
   sourceType: 'module' })` and inspects the top-level AST body (`ImportDeclaration` shape
   enforced; default/namespace/`ImportExpression`/re-export/side-effect imports are
   build-time errors); step 4 drives textual edits from AST node ranges
   (`ExportNamedDeclaration` unwrapped, `export { … }` → IIFE return object); step 6 re-parses
   the emitted bundle with `sourceType: 'script'` and rejects any residual
   `ImportDeclaration`/`ExportNamedDeclaration`/`ExportDefaultDeclaration`/
   `ExportAllDeclaration`/`ImportExpression` node, with a separate line check for
   `//# sourceMappingURL=`. It states explicitly that `import`/`export` **substrings inside
   string/template literals and comments no longer fail the build** — the exact
   false-positive the nit called out. `acorn` 8.18.0 is added to the dev-dep pins (§4), the
   Build decision row, §7.1, and Phase 7's `build.test.mjs` (which now asserts the
   string/comment false-positive-avoidance and sourcemap-rejection cases).
2. **Nit #2 (unpinned `fonttools`) — RESOLVED.** The font subset tool is now pinned to
   `fonttools==4.64.0`, wrapped by a new `scripts/font-subset.sh` that holds the exact
   `pyftsubset` commands (input paths, Unicode ranges, weights, output names, WOFF2 flavor).
   It is threaded consistently through the §3.2 module table, the §3.4 file manifest, a new
   "Font subset tool" decision row (§4), Phase 0, the §8 `python3 -m pip install --user
   fonttools==4.64.0` step, a `fonts:subset` npm script, and the §8 reproducibility note.
3. **Nit #3 (orphan diagram box) — RESOLVED.** The decorative `┌───┐` top-border rectangle
   was removed from the §3.1 ASCII diagram (verified: lines 71–82 now begin directly at
   `boot ──▶ [LOADING]`). The diagram is unambiguous.

**Why 98 and not higher** — two purely cosmetic items remain (see "Remaining nits" below);
neither is a correctness, completeness, or feasibility gap. **Why 98 and not lower** — every
substantive and testability issue from Revisions 1 and 6 is now closed with concrete,
testable specifications; the scope-adequacy gate still passes cleanly (no open P0/P1 audit
actions, no ignored in-scope backlog item); and the AST-based build transform removes the
last real correctness risk in the highest-risk component.

### Remaining nits (Path to 100)

1. **`scripts/font-subset.sh` is listed inside the §3.2 table titled "Modules (development
   sources, in `src/`)".** It is a `scripts/` shell wrapper, not an `src/` module, so its row
   sits under a heading that doesn't describe it. Cosmetic; the §3.4 manifest already places
   it correctly under `scripts/`. Fix: move the row to a "Scripts" sub-table or retitle the
   §3.2 heading to "Modules & tooling sources."
2. **`acorn` 8.18.0 pin is unverifiable in this sandbox (no network).** Same standing caveat
   as the other four dev-dep pins — plausible and internally consistent, but the committed
   `package-lock.json` will be the ground-truth check at implementation-audit time. Not a
   plan defect; recorded for the auditor.

**Caveat (not scored against the plan):** the five dev-dep pins (`@playwright/test` 1.62.1,
`http-server` 14.1.1, `prettier` 3.9.6, `axe-core` 4.13.0, `acorn` 8.18.0) and
`fonttools` 4.64.0 could not be re-verified against their registries in this sandbox. The
plan states they were verified on 2026-09-02; the committed lockfile is the audit-time check.

**Generator's required action (State 2 — plan ≥95, not yet implemented): IMPLEMENT the
approved plan.** The plan is done at 98/100 — the two remaining nits are cosmetic and are
**not** worth another plan-only revision cycle. Begin at **Phase 0** and proceed by
dependency order; each phase's §5 acceptance criteria are the implementation-audit checklist.
Do **not** spend further cycles polishing the plan; the loop now needs **code** to progress
(see `CONSOLIDATED_AUDIT.md` v7 — a code-idle cycle triggered −1 inactivity decay).

---

## Revision 6 — full re-critique of plan v2 (2026-09-02)

**Result: APPROVED. Score 92 → 96/100. Gate (≥95) cleared.**

The plan is finally revised. `git diff affa721 HEAD -- IMPLEMENTATION_PLAN.md` shows a
substantial v1→v2 rewrite (commit `9a6c2ec`), and the header now reads **v2**. Because the
plan version is newer than the last-critiqued version (v1), this is a full critique, not a
re-review — the six prior "no-change" cycles are closed.

**Every one of the five Path-to-≥95 items from Revision 1 is resolved, and every
Path-to-100 item is also addressed.** Verified against the plan text:

1. **Build transform (blocking #1) — RESOLVED.** New **§4.4 "Build transform contract"**
   gives a concrete, deterministic 6-step spec: hand-declared module order matching the
   import graph; top-level static import/export parsing only (default/dynamic/re-export/
   side-effect imports are build-time errors); each module wrapped in an IIFE assigned to
   `window.__CHECKIN007.modules.<name>`; `export ` stripped and `export { … }` converted to
   the IIFE return object; imported symbols rewritten to namespace aliases; **fail-closed**
   check rejecting any residual `import`/`export`/`import(`/`sourceMappingURL` token. Backed
   by a new `tests/unit/build.test.mjs` (§7.1) exercising both fixture modules and the real
   source graph, plus a `file://` boot smoke (§4.4, §7.2). The highest-risk component is now
   unambiguous and testable from the plan text alone.
2. **Pinch-zoom criterion (blocking #2) — RESOLVED.** Phase 6 now states explicitly that
   iOS Safari ignores `user-scalable=no`/`maximum-scale`, replaces the viewport with
   `width=device-width, initial-scale=1, viewport-fit=cover`, and enumerates the real
   mitigation (standalone mode, `touch-action: manipulation`, ≥16 px inputs, callout/
   selection suppression, optional `gesturestart` preventDefault in standalone). §7.3 and §9
   are corrected to match. No acceptance criterion now depends on an ignored directive.
3. **VoiceOver/ARIA (blocking #3) — RESOLVED.** Phase 6 adds a concrete ARIA pass (labeled
   `<button>` roster rows, search label + result-count status, polite `aria-live` scan
   state, assertive `aria-live` result, admin labels, focus return, ≥44 px targets) with an
   acceptance criterion: axe-core e2e zero serious/critical + a manual VoiceOver checklist.
   §7.2 adds the accessibility e2e; §7.3 adds the manual VoiceOver line.
4. **Idempotent logging (#4) — RESOLVED.** Phase 4 specifies a per-visit `visitId` minted on
   roster acceptance, an in-memory `loggedVisitIds` set, `store.appendCheckIn(guest,
   visitId)` called once with duplicate-`visitId` appends treated as no-ops, and a fresh
   `visitId` for re-check-in. `visitId` is added to the §4.3 schema; §7.1 store tests and a
   §7.2 orientation-change e2e assert exactly one entry per visit.
5. **Clipboard assertion (#5) — RESOLVED.** Phase 5 has the clipboard helper return the exact
   `store.exportLogCsv()`/`exportLogJson()` string on both the `navigator.clipboard` and
   `execCommand` fallback paths; §7.2 grants `clipboard-read`/`clipboard-write` and spies on
   the exact string argument, so the assertion is runnable.

**Path-to-100 items also cleared:** artifact-size budget (Phase 7: ≤750 KB gzip target /
≤1.2 MB hard cap, fonts subset via `pyftsubset`); lint/format gate (Prettier 3.9.6,
`.prettierrc.json`, `npm run lint`, Phase 0 acceptance); §10 open questions promoted to hard
"Defaults & Revisit Triggers"; new **§3.4 file manifest**; Phase 2 complexity budget for the
500-row maximum. The §3.1 diagram was also redrawn so ADMIN's entry/exit edges are now
unambiguous (down on admin gesture, up on dismiss, never interrupting SCAN/RESULT).

**Why 96 and not higher** — three genuine (non-blocking) nits remain, see "Remaining nits"
below. **Why 96 and not lower** — all three blocking issues and both testability gaps are
resolved with concrete, testable specifications, and the scope-adequacy gate passes cleanly
(all four audit Required Actions #1–#4 are addressed; no in-scope backlog item is ignored).

### Remaining nits (Path to 100)

1. **§4.4 transform relies on line/regex-level parsing of JS, not a real parser.** "Parses
   only top-level static imports/exports" and "strip leading `export `" are described as
   textual operations. This is *mostly* safe because step 6 fails closed on residual module
   tokens — but that same token scan can also **false-positive**: the literal substrings
   `import`/`export` appearing inside a string literal, template literal, or comment in app
   code would fail an otherwise-valid build. Mitigation to reach 100: either use a tiny AST
   pass (e.g. `acorn`, already MIT/tiny) for both the transform and the residual-token check,
   or scope the fail-closed scan to statement positions and document the "no `import`/`export`
   substrings in string/comment content" constraint on source authors.
2. **`fonttools pyftsubset` is an unpinned, out-of-toolchain dependency.** Phase 0 subsets
   fonts with `pyftsubset` "or an equivalent documented command," but this pulls in a Python/
   `fonttools` toolchain that is not in `package.json`, not version-pinned, and not part of
   `npm ci`. Because the subset WOFF2 output is committed, this is a one-time prep step and
   not a per-build dependency — acceptable — but pinning the `fonttools` version (or checking
   the subset outputs in with a documented exact command + version) would close the gap.
3. **§3.1 diagram still has a decorative top border box whose meaning is unclear.** The
   `┌───┐` rectangle spanning LOADING→SCAN at the top of the state diagram no longer encodes
   an edge (RESULT now returns to a separate bottom `[ROSTER]` node) and reads as an orphaned
   artifact of the redraw. The ADMIN-edge ambiguity that issue #3 (Path-to-100) targeted is
   resolved; this leftover box is a smaller, purely cosmetic cleanup.

**Caveat (not scored against the plan):** the four dev-dep pins (`@playwright/test` 1.62.1,
`http-server` 14.1.1, `prettier` 3.9.6, `axe-core` 4.13.0) could not be re-verified against
the npm registry in this sandbox (no network). The plan states they were verified on
2026-09-02 and they are plausible; the committed `package-lock.json` (Phase 0) will be the
ground-truth check at implementation-audit time.

**Generator's required action (State 2 — plan ≥95, not yet implemented): implement the
approved plan.** The plan is now the contract. Begin at Phase 0 and proceed by dependency
order; each phase's acceptance criteria are the audit checklist. Do **not** revise the plan
further except to back-port any justified implementation deviations. The three nits above are
optional polish, not gates.

---

## Revision 5 — re-review (2026-09-02)

**Result: no change. Score holds at 92/100. NOT APPROVED.**

The plan is **still byte-identical** to the version critiqued in Revisions 1–4 — verified:
`git diff affa721 HEAD -- IMPLEMENTATION_PLAN.md` is empty, and every commit since the plan
landed (`28afe6f`, `b37fc53`, `8cbe404`, `d7e7619`) is a critique/audit update, not a plan
or source change. The generator has **not revised the plan across four full review cycles**,
and no `src/`, `scripts/`, or `tests/` directory exists yet.

There is no new evidence to move any of the eight dimension scores; re-scoring an unchanged
artifact would be inflation. **The score therefore remains 92**, and the five "Path to ≥95"
items from Revision 1 remain the exact, complete path to approval — three blocking (build
transform #1, iOS zoom criterion #2, VoiceOver/ARIA #3) and two testability (idempotent
logging #4, clipboard assertion #5).

**Generator's required action (State 1 — plan < 95): revise the plan** to address the five
Path-to-≥95 items, then resubmit. Do **not** begin implementation. This is now the **fourth
consecutive stalled cycle**: the audit's inactivity decay has deepened to **−4** and the two
now-P0 required actions have reached **staleness 4 (2 versions stalled as P0)** — they are
flagged **CRITICAL BLOCKER** and deduct **−3 each plus an additional −2 each** (see
`CONSOLIDATED_AUDIT.md` v5, score **42**). The single lever that reverses all of this is one
plan revision. The full Revision 1 analysis below remains the authoritative critique.

---

## Revision 4 — re-review (2026-09-02)

**Result: no change. Score holds at 92/100. NOT APPROVED.**

The plan is **still byte-identical** to the version critiqued in Revisions 1–3 — verified:
`git diff affa721 HEAD -- IMPLEMENTATION_PLAN.md` is empty, and every commit since the plan
landed (`28afe6f`, `b37fc53`, `8cbe404`) is a critique/audit update, not a plan or source
change. The generator has **not revised the plan across three full review cycles**.

There is no new evidence to move any of the eight dimension scores; re-scoring an unchanged
artifact would be inflation. **The score therefore remains 92**, and the five "Path to ≥95"
items from Revision 1 remain the exact, complete path to approval — three blocking (build
transform #1, iOS zoom criterion #2, VoiceOver/ARIA #3) and two testability (idempotent
logging #4, clipboard assertion #5).

**Generator's required action (State 1 — plan < 95): revise the plan** to address the five
Path-to-≥95 items, then resubmit. Do **not** begin implementation. This is now the **third
consecutive stalled cycle**: the audit's inactivity decay has deepened to **−3** and the two
P1 required actions have crossed **staleness 3**, escalating to **P0** (see
`CONSOLIDATED_AUDIT.md` v4). The full Revision 1 analysis below remains the authoritative
critique of the plan text.

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

**Authoritative scores (this file):**
**Plan Score:** 98/100 — APPROVED (v3, Revision 7).
**Implementation Score:** 96/100 — **VERIFIED** (Implementation Verification v2, commit `75c8279`).
Loop is in **State 4: cycle complete.** Defects D1–D6 are resolved and confirmed by execution
(16/16 unit, 8/8 e2e, build within budget, lint clean, §4.1 grep invariant restored). The plan
remains the authoritative spec and was not revised.

_(History retained above. Revision 1 critiqued v1 at 92; Revisions 2–5 were no-change re-reviews;
Revision 6 critiqued v2 at 96; Revision 7 critiqued v3 at 98 (APPROVED). Implementation
Verification v1 scored the first landing at 91 (NOT VERIFIED); Verification v2 scores commit
`75c8279` at 96 (VERIFIED).)_
