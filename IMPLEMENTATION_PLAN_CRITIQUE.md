# iPad Roster Scroll Repair Plan Critique — Cycle 18, Revision 2

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `8d03df0`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v32 (Cycle 18)
**Score:** **93 / 100** (previous: v31 = 74 NOT APPROVED — this is the first review of the re-scoped v32 plan)
**Status:** **NOT APPROVED** — below the ≥95 gate by one blocking, load-bearing feasibility/consistency flaw in the primary candidate fix (the probe oracle and virtualization both key off `.roster-list` scroll, which candidate 1's document-backed body-scroll would starve).

Plan v32 is the correct re-scope the audit demanded: it drops the guard-polish nicety and targets exactly **RA #14 (P0/HIGH, device-evidenced failing)** and **RA #19 (P1/HIGH)**, plus the stale default-device refresh. The scope-adequacy gate now **passes** (no cap). Craft is high — verified environment, isolated-experiment discipline, strict evidence contract, honest "record the failing JSON" path, clean rollback. It is held below 95 by a single but central defect: **candidate 1 (the primary production fix) is internally inconsistent with the very PASS oracle and the virtualization path it must not break** — both read `list.scrollTop` / listen to `.roster-list`'s `scroll` event, which a document-backed body scroll would silence.

## Issues resolved since revision 1 (v31 → v32)

1. **Scope inversion fixed.** v31 was capped at 74 for out-of-scoping RA #14/#19 to polish a P3 guard item. v32 §1–§2 re-targets Cycle 18 at RA #14 + RA #19 and explicitly defers the guard-polish item (§2 "Out of scope", §13 Q3). The scope cap no longer fires.
2. **Stale default device addressed.** §4.2 replaces both hard-coded `'iPad Pro 13-inch (M4)'` defaults (verified at `scripts/ios-scroll-smoke.mjs:137` and `:181`) with `DEFAULT_IOS_SCROLL_DEVICE = 'iPad (A16)'`, keeping `CHECKIN007_IOS_DEVICE` as override. Confirmed grounded: `iPad Pro 13-inch (M4)` is **not** in `simctl list devices available`; `iPad (A16)` is present **and Booted**.
3. **Harness hardening (RA #19) designed.** §4.1/Phase 1 replaces `safari.textFields.firstMatch` (verified at `WebRosterScrollUITests.swift:39`) with bounded keyboard-focused address-field selection + settle/retry, and correctly sequences it *before* any scroll-CSS change so a FAIL is attributable.

## Remaining issues

1. **[BLOCKING — commission/feasibility] Candidate 1's "document-backed body scroll" is incompatible with the plan's own PASS oracle and with roster virtualization; both read `.roster-list` scroll.** §4.3 candidate 1 makes the *document/body* the scroller: "`body` can scroll only while the active screen is roster, `.roster-screen` is the normal document-height host" (`body.is-roster-scroll-mode { overflow-y: auto }`, `.roster-screen { position: relative; min-height: 100dvh }`). But the required PASS oracle reads `list.scrollTop` and listens to `.roster-list`'s `scroll` event — verified at `src/screens/roster.mjs:25` (`Number(list.scrollTop)`), `:32` (`list.addEventListener('scroll', update…)`), surfaced as `scroll-probe:N` and asserted by `WebRosterScrollUITests.swift:35` ("Probe text must report positive scrollTop after a touch drag"). **If the body scrolls and `.roster-list` does not, `list.scrollTop` stays 0 → the probe reports `scroll-probe:0` → the required `status:"passed"` oracle FAILS — the identical symptom RA #14 fails on today.** The same `.roster-list`-scroll dependency drives virtualization: `roster.mjs:190` `list.addEventListener('scroll', handleVirtualScroll)` and `:130` `scrollTop: list.scrollTop`. A document-backed scroll starves `handleVirtualScroll` → the large-roster e2e ("scroll to Agent 619", `tests/e2e/checkin.spec.mjs:377`) breaks. §7 point 3 and §8 *acknowledge* the probe/reset must track "the selected scroll container," and §9 says candidate 1 "must not change `computeVirtualWindow()`," but the plan **never specifies repointing `createScrollProbe` / the virtualization scroll source to the document**, does not list that change in the §5 manifest (roster.mjs is MOD only for "body scroll-mode setup/cleanup"), and adds no test for it. As literally specified, candidate 1 either fails its own oracle or requires unstated code changes. **Fix (pick one and state it):** (a) **Keep `.roster-list` as the bounded internal scroller** — drop the "document-backed"/body-scroll framing, guarantee `.roster-list` retains a bounded height (an explicit height contract, not `min-height:100dvh` on an untransformed ancestor), and land only the ancestor/layer change so the probe and virtualization stay valid (this is essentially candidate 2's shape and needs no probe change); **or** (b) **fully commit to document-backed scroll** — repoint `createScrollProbe` to read `document.scrollingElement.scrollTop` (or `window.scrollY`) and repoint `handleVirtualScroll` to the document/window scroll source while roster is mounted, add these to the §5 roster.mjs manifest entry, and add unit + e2e coverage that the probe and virtualization follow the *document* scroller.

2. **[Minor — commission] Dual nested scroll containers are under-specified.** §4.3 candidate 1 keeps `.roster-list { overflow-y: auto; -webkit-overflow-scrolling: touch }` ("the only semantic list") *while also* enabling `body` scroll. Two nested scrollers leave it ambiguous which one a touch drag actually moves on WebKit (the child list can capture the gesture, again leaving `body`/probe at 0). State explicitly whether the list keeps `overflow:auto` (child scroller) or becomes `overflow:visible` (so the document is the sole scroller). This is the same root as issue #1 and its resolution follows from the choice made there.

3. **[Minor — omission] Search reset for the document scroll path has no concrete contract.** §8 says "if body/document scroll is selected, implementation must also reset the relevant document scroll position," but gives no API (`window.scrollTo(0,0)` / `document.scrollingElement.scrollTop = 0`) and adds no assertion. Today `roster.mjs:170` resets `list.scrollTop = 0`; under a document scroller that reset targets the wrong element. Specify the exact reset call and a unit/e2e assertion.

4. **[Minor — omission] iOS dynamic-viewport (`100dvh`) interaction unaddressed.** Candidate 1 hosts the roster at `min-height: 100dvh`. On Mobile Safari the URL bar show/hide changes `dvh`, which can reflow the document-scroll height mid-drag. Note the expected behavior (or prefer a stable unit) so a transient reflow is not misread as a scroll failure.

## Scope Check

- **Audit findings in scope:** **RA #14 (P0/HIGH)** — addressed (root-cause + isolated fix + required JSON, §4.3–4.4/Phase 2–3). **RA #19 (P1/HIGH)** — addressed (§4.1/Phase 1 harness hardening). Stale default device — addressed (§4.2). **Scope cap does NOT fire.** ✓
- **Backlog items:** the `[/]` guard-polish item is correctly *deferred* (§2, §13 Q3) so it does not preempt the open P0/P1 — exactly what audit v66 directed. The `[ ]` commit-time-hook item is an unrelated subsystem, correctly not folded in. ✓
- **Integration points:** §7 enumerates smoke↔XCUITest, XCUITest↔Safari, roster↔page layout, docs↔audit. Thorough — but the roster↔layout contract (point 3) is the site of issue #1: it names the constraint without resolving it. ⚠
- **Alternatives considered:** §4.1 (Safari entry), §4.2 (device default), §4.3 (scroll candidates + ordering), §4.4 (evidence strictness) genuinely evaluate and reject alternatives. Strong. ✓
- **RA #10** (external CI billing) correctly out of scope. ✓

## Flaws of Commission

1. Candidate 1's document-backed body scroll contradicts the probe oracle and virtualization, both of which read `.roster-list` scroll (issue #1) — as specified it would fail its own required PASS oracle.
2. Two nested scroll containers (list + body) under candidate 1 are ambiguous as to which the touch drag moves (issue #2).
3. No other flaws of commission — the harness-first sequencing, strict evidence contract, isolated single-change discipline, and default-device swap are sound and source-grounded.

## Flaws of Omission

1. No specification (or §5 manifest entry, or test) for repointing `createScrollProbe` / `handleVirtualScroll` to the document scroll source under candidate 1 (issue #1).
2. No concrete search-reset API/assertion for the document scroll path (issue #3).
3. No treatment of iOS `100dvh` dynamic-viewport reflow during a drag (issue #4).
4. Otherwise complete: error-handling table (§8), rollback (§12), toolchain pins (§11), and the "record the failing JSON, do not stack speculative CSS" honest path (§4.3 step 4, Phase 3 step 5) are all present.

## Regressions

1. **Virtualization scroll regression (candidate 1).** `handleVirtualScroll` binds to `.roster-list` scroll (`roster.mjs:190`); a document-backed scroller would stop firing it, breaking the large-roster path (`tests/e2e/checkin.spec.mjs:377`, Agent 619). The plan's Testing section requires that e2e stay green (so it would be *caught*), but the plan does not reconcile *how* virtualization coexists with document scroll — this must be designed, not left to fail during implementation. Detailed under issue #1.
2. No other regressions. The change is otherwise isolated to the roster screen; overlay screens (loading/scan/result) keep their fixed/transform behavior (§4.3, §8), and the harness/default-device changes touch no app runtime code. The existing "roster has no transform ancestor" e2e is only updated if candidate 1 changes position/overflow details (§10) — acknowledged, not a silent regression.

## Why 93 and not 94

The single blocking defect (issue #1) sits in the **load-bearing** part of the plan — the actual production scroll fix and its verification oracle. A ≥95 plan cannot leave its primary candidate in a state where, as written, it would report `scroll-probe:0` and fail the very `status:"passed"` gate the plan makes mandatory. It is one well-contained issue (hence 93, not lower — the scope is right, the harness/device work is solid, and candidate 2 plus the honest-failure path prevent shipping something broken), but it is not a cosmetic nit: it determines whether candidate 1 can ever pass.

## Path to ≥95

Resolve issue #1 by choosing and fully specifying one scroll model:

1. **Preferred: keep `.roster-list` as the bounded internal scroller.** Drop the "document-backed"/`body`-scroll framing; give `.roster-list` an explicit bounded height so `overflow:auto` scrolls the list (not the body); land only the fixed-ancestor removal / layer promotion. The probe (`list.scrollTop`) and virtualization stay valid unchanged. State this as candidate 1 and keep candidate 2 (layer promotion) as the fallback.
2. **Or fully commit to document scroll:** repoint `createScrollProbe` to `document.scrollingElement.scrollTop`/`window.scrollY` and `handleVirtualScroll` to the document/window scroll source while roster is mounted; add both to the §5 roster.mjs manifest entry; specify the search reset as `window.scrollTo(0,0)` (issue #3); add unit + e2e coverage that probe and virtualization follow the document scroller; and note the `100dvh` reflow behavior (issue #4).
3. Either way, resolve the nested-scroller ambiguity (issue #2) by stating the final `overflow` value of `.roster-list`.

Addressing issue #1 (with #2–#4 folded in) lifts this to ≥96 on the first revision — the rest of the plan is already approval-grade.

## Path to 100

Beyond the above:
- Add an explicit acceptance assertion that the probe tracks whichever container is selected (a regression test that would have caught issue #1 automatically).
- Quantify the "smallest experiment" decision criterion (e.g. the exact `.xcresult`/probe signal that distinguishes a genuine `scrollTop` non-movement from a drag-mechanics artifact) so Phase 2's baseline classification is mechanical, not judgment.
- Pin the bounded retry counts/timeouts for the new Safari focus helpers (§4.1) to named constants so the harness behavior is reproducible and unit-assertable.
- Add a CI-mode note for the iOS lane (device-farm/simulator availability) so the required-mode contract is documented beyond the local `iPad (A16)`.

## Summary

Plan v32 fixes the scope problem that sank v31 — it now targets exactly the audit-assigned RA #14 (P0) and RA #19 (P1) plus the stale default device, all verified code-actionable on the installed iOS 26.4 / `iPad (A16)` simulator, and it defers the guard-polish item correctly. The craft is otherwise ≥96. It is held at **93 — NOT APPROVED** by one central, verified feasibility flaw: candidate 1's document-backed body scroll conflicts with the plan's own `list.scrollTop` PASS oracle *and* with `.roster-list`-bound virtualization, and the plan neither repoints them nor manifests/tests that change. Resolve the scroll-model/probe contract (Path to ≥95 option 1 is the clean route) and this plan clears the gate.
