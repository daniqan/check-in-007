# Cycle-14 Evidence & Plan-Consistency Closure Plan Critique — Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `53a9c48`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v27 (Cycle 14 — Cycle-13 Evidence and Plan-Consistency Closure)
**Score:** **97 / 100** (previous: v26 Cycle-13 Rev 2 = 96 | this is a NEW plan — v27 supersedes the completed v26 cycle)
**Status:** **APPROVED** (clears the ≥95 gate)

Plan v27 is a fresh, documentation-only plan that opens Cycle 14 to close the two `BACKLOG.md`
follow-ups that Audit v53 tracked out of the completed Cycle-13 cycle: (1) back-port the already-landed
`sheet.swipeUp()` lazy-`Form` navigation into the authoritative plan contract, and (2) durably prove the
Cycle-13 RA #13 hit-region root cause by reproducing `testFirstCheckInFlow` at the exact pre-fix commit and
capturing a sanitized accessibility hierarchy. It ships **zero** source/test/dependency/build/dist changes
(§2). Every factual claim I could check against git is accurate, and the plan is fail-closed throughout.
The loop advances **State 1 → State 2 — implement approved plan v27.**

## Version check

The critique's prior `Plan Under Review` was v26; the plan file is now **v27** (`53a9c48` rewrote
`IMPLEMENTATION_PLAN.md` only). Per the staleness rule a newer plan is reviewed fresh regardless of the
prior score — this is that full critique. v27 is not a revision of v26's subject (native UI repair, now
complete and VERIFIED at Implementation Score 97) but a new, narrower cycle whose only deliverables are the
two manifest files in §5.

## Ground-truth verification (independently confirmed against git)

1. **Pre-fix commit is correct.** `50b4357` is the approved-plan/audit commit immediately before
   implementation `5e80c8b` (`git log 7c51af4..8db9fd6`: `50b4357` → `5e80c8b` → `8db9fd6`). At `50b4357`
   the source is genuinely pre-fix: `RosterView.swift` has **no** `.frame(maxWidth: .infinity …)` (the
   full-width hit target added at current `:68`), and `CheckIn007UITests.swift:61,80` still query
   `app.otherElements[A11yId.mark007]`. §4.1/§6-Phase-0's "detached source lacks the full-width
   frame/content shape" is therefore precise — the inner `.contentShape(Rectangle())` at pre-fix `:42`
   is a different element and does not contradict the claim.
2. **Reproduction premise holds.** At `50b4357`, `testFirstCheckInFlow` already taps `firstRow` (`:27`)
   and then waits on `scan.status` (`:29–30`, `XCTAssertTrue(scan.waitForExistence(timeout: 5))`). With the
   pre-fix dead hit region the tap does not fire `selectGuest`, so `:30` fails — exactly the assertion §4.1
   targets. The plan's temporary attachment hook has a real insertion point.
3. **Current source matches the back-port claim.** `CheckIn007UITests.swift:106` performs `sheet.swipeUp()`
   before requiring `admin.clearLog` (`:108`) and `admin.clearLog.confirm` (`:112–113`) in order — the
   §4.3/§7.3 contract v27 back-ports is byte-accurate to the shipped code. `RosterView.swift:68–69` carries
   the full-width fix v27 references.
4. **Inventory and environment consistent.** §6-Phase-3/§10 "two targets, six unit suites, 33 unit + 4 UI
   = 37" matches the verified Cycle-13 native suite; §10/§11 "78 unit, 13 Playwright", Node 24.20.0 pin,
   Xcode 26.4 (`17E192`), iOS 26.4 (`23E244`), iPad UDID `A155995F-…` all agree with audit v52/v53.
5. **CI disposition honest.** §2/§13-Q4 keep run `33711898714` as terminal `BLOCKED (external billing)`;
   nothing is claimed as PASS.

## Scope Check

- **Audit findings:** the only open items are RA #10 (external CI billing — correctly kept `BLOCKED`,
  non-code-actionable) and the two backlog follow-ups. v27 addresses **both** backlog items and correctly
  leaves RA #10 external. No in-scope finding ignored → **no scope cap.**
- **Backlog:** `BACKLOG.md` = **2 unchecked** (swipeUp back-port + §4.1 diagnostic capture). v27 targets
  **exactly these two** — the plan's scope is the backlog's open surface, no more, no less.
- **Integration points:** §7 gives four contracts (git identity ↔ reproduction; XCTest attachment ↔ durable
  evidence; lazy admin Form ↔ clear-log test; evidence status ↔ audit consumers) covering every seam the
  work touches.
- **Alternatives considered:** §4.1 rejects memory-only description / main-tree reverts / HEAD-only capture /
  full-hierarchy commit; §4.3 rejects timeout inflation / coordinate taps / moving the danger section /
  optional assertions. Tradeoffs stated.

## Flaws of Commission

No flaws of commission identified. The pre-fix commit, the reproduction assertion target, the back-ported
navigation contract, the inventory, and the CI disposition are all verified correct against source. The
evidence invariants are computed over the **complete** exported attachment (roster.row. ≥ 1 **and**
scan.status = 0), not a hand-picked excerpt (§4.2, §6-Phase-1.5) — the right way to avoid selection bias.

## Flaws of Omission

1. **§14 couples the two independent follow-ups into an all-or-nothing completion gate (minor).** The
   swipeUp back-port (item 1) is pure plan text — already present in v27 §4.3/§7.3 — and cannot fail; the
   historical reproduction (item 2) genuinely can STOP if the pre-fix tree no longer reproduces on iOS 26.4
   (§13-Q1). Because "every checkbox is required," a STOP on item 2 blocks recording item 1 as done. A
   sentence permitting the back-port to land independently of the reproduction outcome would decouple a
   trivially-completable item from a risk-bearing one. *Non-blocking.*
2. **Temporary instrumentation is specified in prose only (minor).** §4.1/§6-Phase-1 describe the throwaway
   attachment hook ("immediately after the existing wait for `scan.status` fails … attach
   `app.debugDescription` with `.keepAlways`") without a concrete snippet or exact insertion line. For
   uncommitted, discard-after-use instrumentation this is acceptable, but a named snippet would remove the
   last ambiguity about what runs. *Non-blocking.*
3. **Residual feasibility risk on the historical reproduction (managed, not eliminated).** The whole of
   item 2 depends on the pre-fix method still failing at `scan.status` under the current simulator runtime.
   The plan handles an unexpected pass by STOPping and leaving the item open (§8, §13-Q1) — fail-closed and
   honest — but the risk that Phase 1 cannot complete, leaving one backlog item open after the cycle, is
   real. *Non-blocking; correctly dispositioned.*

## Regressions

No regressions identified. §2 forbids any committed change under `native/`, `src/`, `tests/`, `scripts/`,
`.github/`, `package.json`, lockfiles, Xcode settings, or `dist/`; the two deliverables are additive plan
text and an append-only evidence subsection (§5, §7.2/§7.4 "existing evidence remains append-only"). Test
coverage, runtime behavior, and the byte-for-byte web/native artifacts are untouched. All reproduction
mutations live in a `mktemp` detached worktree that is deleted before the final diff (§3, §9).

## Why 97 and not 99

Every diagnosis and commit reference is verified against source, scope equals the open backlog exactly, and
the plan is fail-closed — that is 97-grade. It is held below 99 by the three omissions above, chiefly the
§14 all-or-nothing coupling (which lets a certain-to-succeed doc edit be blocked by a risk-bearing
reproduction) and the prose-only instrumentation spec. None is a feasibility failure; they are
specificity/decoupling gaps, so 97, not the 72–91 band of prior first-draft plans, and not 99.

## Path to ≥95

Already cleared (97). No blocking items.

## Path to 100

1. **Decouple §14.** State that the swipeUp back-port (item 1) may be recorded complete independently of the
   Phase-1 reproduction outcome, so a fail-closed STOP on item 2 does not strand a trivially-completable item.
2. **Pin the temporary hook.** Give the exact insertion point and a one-line snippet of the uncommitted
   `.keepAlways` attachment helper so the throwaway instrumentation is unambiguous and self-documenting.
3. **Name the reproduction fallback.** If the pre-fix method unexpectedly passes on iOS 26.4, cite the
   already-captured Rev-1 execution (`CheckIn007UITests.swift:30` `scan.status` not found) as the
   documentary fallback rather than only STOPping — so the RA #13 cause is still recorded from the historical
   run even if a fresh capture is not reproducible.

## Summary

Plan v27 is approval-grade (**97/100**). It is a tightly-scoped, documentation-only cycle whose scope equals
the two open backlog items exactly; every commit SHA, source line, and count I checked is accurate; and it is
fail-closed with a thorough error table (§8). Its residual gaps are the §14 completion coupling and the
prose-only instrumentation spec — genuine but non-blocking. The loop advances **State 1 → State 2 — implement
approved plan v27.** Implementation Score is **N/A** — nothing is built yet (`53a9c48` rewrote
`IMPLEMENTATION_PLAN.md` only; `docs/VERIFICATION_EVIDENCE.md` has no Cycle-14 subsection and the working tree
is clean).

**Plan Score:** 97/100

**Implementation Score:** N/A

---

### Implementation Verification — v17

**Plan:** `IMPLEMENTATION_PLAN.md` v27 @ commit `53a9c48` (approved Cycle 14 Rev 1 = 97/100)
**Code:** `master` @ HEAD `53a9c48` audited on 2026-09-03

**Verdict: N/A — approved plan v27 NOT YET IMPLEMENTED (State 2, unstarted).** `53a9c48` changed only
`IMPLEMENTATION_PLAN.md` (`git show --stat`: 1 file); the second manifest deliverable
`docs/VERIFICATION_EVIDENCE.md` has **no Cycle-14 subsection** (`grep -n "Cycle-14" docs/VERIFICATION_EVIDENCE.md`
= 0 hits) and the working tree is clean. No detached-worktree reproduction has been run and no pre-fix
hierarchy has been captured. There is nothing to audit for execution fidelity yet.

The **prior** cycle's implementation remains VERIFIED and unchanged: `git diff --name-only 8db9fd6..HEAD --
native/ src/ tests/` is empty, so the Cycle-13 native (37/37) + web (78/13) result recorded at Implementation
Verification v16 = 97/100 still stands byte-for-byte. Cycle 14 does not touch code.

| Section | Status | Notes |
|---------|--------|-------|
| §4.3/§6-P2 swipeUp back-port | **NOT STARTED** | Plan text present in v27; `docs/VERIFICATION_EVIDENCE.md` not yet updated to record it as required lazy-Form navigation. |
| §4.1/§6-P1 pre-fix hierarchy capture | **NOT STARTED** | No detached-worktree run; no sanitized excerpt in evidence doc. |
| §6-P3 current-tree re-verification | **NOT STARTED** | No fresh native/web re-run recorded for this cycle. |

**Implementation Score:** N/A

## Defects

None to enumerate — implementation has not begun. **Next action: implement approved plan v27** (documentation
only). Landing the two §5 manifest files closes the two `BACKLOG.md` follow-ups (recovering the −1 backlog
deduction); note that because v27 changes no `native/`/`src/`/`tests/` file, it will **not** reset the
mechanical inactivity decay — the residual verification work is inherently documentation-only.

---

# Native UI Interaction & Accessibility Repair Plan Critique — Cycle 13, Revision 2

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `7c51af4`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v26 (Cycle 13 — Native UI Interaction and Accessibility Repair)
**Score:** **96 / 100** (previous: v25 Cycle-13 Rev 1 = 72 | this is the revised plan answering that critique)
**Status:** **APPROVED** (clears the ≥95 gate)

Plan v26 is the correct State-1 response to the Rev-1 (72/100) critique. Rev 1 proved by execution that the
native suite is red for **two independent** reasons — the `mark007` `.isButton`-vs-`otherElements` query
mismatch (methods 3–4, RA #12) **and** the check-in scan→result transition not surfacing
`scan.status`/`result.title` after a roster-row tap (methods 1–2, RA #13). v26 now addresses **both**, and its
RA #13 root-cause is *more accurate than my own Rev-1 critique*: it correctly identifies that `result.title` is
absorbed by `.accessibilityElement(children: .combine)`, which I had hand-waved as "should resolve under
`staticTexts`." The plan is implementation-ready.

## Issues resolved in revision 2 (vs Rev-1 72/100)

1. **Misdiagnosed "shared cause" corrected (Rev-1 Blocking #1 / Commission #1).** §1 no longer claims all four
   UI failures share the `mark007` cause. It explicitly separates methods 3–4 (RA #12, `mark007` query) from
   methods 1–2 (RA #13, check-in flow), matching the executed failure locations (`CheckIn007UITests.swift:30`
   `scan.status`, `:51` `result.title`).
2. **Scope gap closed (Rev-1 Blocking #1/#2).** §4.1 (full-width rectangular hit target) and §4.2 (combined
   result identity) bring the RA #13 surface into scope alongside the retained RA #12 query fix (§4.3). The §6
   Phase 3 / §14 "four UI methods, 37 passes" gate is now backed by a change set that touches all four methods'
   failure causes.
3. **Scan/result failure now diagnosed (Rev-1 Omission #1).** §4.1 attributes methods 1–2 to the synthesized
   center tap landing on dead hit-space of the intrinsic-width `.buttonStyle(.plain)` label; §4.2 attributes
   the `result.title` miss to `.combine` child-absorption. Both are verifiable in the current source
   (RosterView.swift:58–68 has no width/`contentShape`; ResultView.swift:23 identifier is on a `.combine`
   child at line 35).
4. **Diagnostic capture added (Rev-1 Path-to-100).** §4.4 adds `requireExists`, attaching
   `app.debugDescription` only on failure — exactly the "dump the hierarchy on first failure" mechanism Rev 1
   asked for, without weakening or retrying.
5. **Cycle-12 framing correction scheduled (Rev-1 Consequence #2).** §Phase 4 requires recording that methods
   1–2 failed *after* row lookup, retiring the inaccurate "all four failed initial lookup" phrasing.

## Ground-truth verification (independently confirmed against `7c51af4`)

1. **RA #12 fix target exact.** Precisely **two** `app.otherElements[A11yId.mark007]` sites exist
   (`CheckIn007UITests.swift:61,80`); zero `app.buttons[...mark007]`. §4.3/Phase 2 "exactly two button queries"
   is correct. `RosterView.swift:43–46` carries `A11y.mark007`, label `"Admin (long press)"`, `.isButton`,
   2.0 s long-press — so `app.buttons[...]` is the right collection.
2. **RA #13 `result.title` diagnosis is correct and precise.** `ResultView.swift:23` puts
   `.accessibilityIdentifier(A11y.resultTitle)` on the child `Text(displayName)`, inside a VStack that applies
   `.accessibilityElement(children: .combine)` at line 35. Combined children are absorbed → the child
   identifier is unqueryable, so `app.staticTexts[A11yId.resultTitle]` (test lines 32/51) fails even when
   ResultView is on screen. Moving the identifier to the combined VStack (§4.2) makes the combined `StaticText`
   queryable. **This is the decisive RA #13 half and it is right.**
3. **RA #13 hit-region diagnosis is consistent with the evidence.** `scan.status` (ScanView.swift:39) is a
   plain, non-combined `Text` with its identifier → it *would* resolve under `app.staticTexts` if ScanView were
   reached. Rev-1's run showed it is *not* found within 5 s after the tap (`:30`), which implies ScanView is
   never reached → the tap did not fire `selectGuest`. That points to a hit-target problem, and the canonical
   SwiftUI remedy is exactly §4.1's `.frame(maxWidth: .infinity, alignment: .leading)` + `.contentShape(Rectangle())`.
4. **Inventory exact.** Six unit suites = 7+3+8+6+5+4 = **33** unit methods; **4** UI = **37** — matches §6
   Phase 3 / §10 / §14.
5. **Environment §11 accurate.** Xcode 26.4 (`17E192`), iOS 26.4 (`23E244`), iPad (A16)
   `A155995F-EC83-41BE-95B2-1A5F390ABF59` — all as recorded across prior verified cycles.
6. **CI disposition honest (§4.5).** Run `33711898714` retained as terminal `BLOCKED (external billing)`; not
   banked. Consistent with §2/§8.
7. **No assertion weakening; product accessibility preserved.** §2 forbids deleting/skipping/loosening
   assertions and forbids removing `.isButton`; §4.1–§4.4 keep every downstream wait, gesture, and workflow
   assertion. Manifest (§5) is test + two additive SwiftUI hit/identity modifiers + docs — no AppModel, camera,
   timing, or styling change.

## Scope Check

- **Audit findings:** open P1 RAs are **#12** (native `mark007` query) and **#13** (check-in scan→result flow);
  **#10** (CI billing) is external. v26 addresses **#12 and #13** — the full native-red surface — and correctly
  preserves **#10** as external `BLOCKED`. No in-scope finding ignored. **No scope cap applies.**
- **Backlog:** `BACKLOG.md` = **0 unchecked** (15 `[x]`). Nothing skipped.
- **Integration points:** §7 now gives four contracts covering the row-geometry↔activation and
  AppModel-state↔scan/result-accessibility paths that Rev 1 flagged as uncovered — not just `mark007`.
- **Alternatives considered:** §4.1 rejects coordinate taps / test hooks / AppModel edits; §4.2 rejects
  removing `.combine` / querying display text / untyped queries; §4.3 rejects dropping `.isButton`. Tradeoffs
  stated for each key decision.

## Flaws of Commission

No flaws of commission identified. The `result.title` `.combine` diagnosis is provably correct; the `mark007`
query fix is correct; the hit-target remedy is the standard SwiftUI fix; the inventory, environment, and CI
disposition are accurate.

## Flaws of Omission

1. **§4.1's root cause is a strong hypothesis, not a captured-and-recorded fact (minor).** §1/§4.1 assert "a
   fresh failure hierarchy captured after `firstRow.tap()` still shows the complete roster," but no durable
   record of that capture exists (the Rev-1 run recorded only "`scan.status` not found," not a full
   roster-still-present dump). The plan (rightly) demands failure-only hierarchy attachments for the
   *implementation*; its own §4.1 diagnostic evidence should be equally traceable. Mitigated by §13 Q1's honest
   decision-gate (focused methods decide; failure STOPs, no bypass) and by `requireExists` capturing the
   hierarchy on the first failing run. *Non-blocking.*
2. **No explicit branch for "§4.1 fix insufficient" (minor).** If, after full-width `contentShape`, methods 1–2
   still fail at `scan.status`, the plan STOPs (correct) but does not pre-enumerate the next hypothesis
   (timing / `selectGuest` / audio-unlock). §13 Q1 covers this as "failure stops rather than authorizing a
   bypass," which is acceptable, but a named fallback would be stronger. *Non-blocking.*

## Regressions

No regressions identified. §2 forbids product-behavior, web, dependency, workflow, and `dist/` changes; the two
SwiftUI modifiers are additive (row count and 44 pt min height preserved); the identifier move keeps the
combined announcement byte-for-byte (§7.2 "announcement wording remains byte-for-byte"); the query edits do not
weaken the two admin methods. Test coverage does not shrink (37 methods retained).

## Why 96 and not 98

The two diagnoses that can be *proven from source right now* — the `mark007` collection and the `result.title`
`.combine` absorption — are 98-grade and I confirmed both. The score is held at 96 by one real gap: the §4.1
hit-region cause (the load-bearing half of methods 1–2) rests on an asserted-but-unrecorded post-tap hierarchy
rather than a captured artifact in the durable record (Omission #1). The fix is the canonical remedy and the
plan STOPs honestly if it's wrong, so this is a specificity/proof gap, not a feasibility failure — hence 96,
not the low-70s of Rev 1, and not 98+.

## Path to ≥95

Already cleared (96). No blocking items.

## Path to 100

1. **Record the §4.1 diagnostic capture.** Point to (or attach) the actual post-tap `app.debugDescription`
   showing the roster still present and no `scan.status`, so the hit-region cause is proven, not inferred.
2. **Name the §4.1 fallback hypothesis** (timing / `selectGuest` / audio-unlock) to run if full-width
   `contentShape` does not restore activation — so a STOP is followed by a directed next step, not a cold stop.
3. **State the expected combined-element type explicitly for the acceptance** (`app.staticTexts[result.title]`
   is a `StaticText` after `.combine`) — §13 Q2 flags the risk; pinning the expected type in §10 would let a
   type regression be caught the same way the `mark007` one was.

## Summary

Plan v26 is approval-grade (**96/100**). It corrects Rev-1's misdiagnosis, brings the entire native-red surface
into scope (RA #12 + RA #13), and supplies a `result.title` `.combine` root-cause that is more accurate than my
own prior critique and independently confirmed in the source. Its one residual gap — the §4.1 hit-region cause
is asserted rather than captured — is handled honestly via a STOP-on-failure decision gate and the new
failure-only hierarchy helper. The loop advances **State 1 → State 2 — implement approved plan v26.**
Implementation Score is **N/A** — nothing is built yet (the only change since the v50 audit is `7c51af4`, which
rewrites `IMPLEMENTATION_PLAN.md` only; `CheckIn007UITests.swift:61,80` still query `otherElements`,
`ResultView.swift:23` still identifies the `.combine` child, `RosterView.swift:58–68` still lacks the
full-width `contentShape`).

**Plan Score:** 96/100

**Implementation Score:** N/A

---

### Implementation Verification — v16

**Plan:** `IMPLEMENTATION_PLAN.md` v26 @ commit `7c51af4` (approved Cycle 13 Rev 2 = 96/100)
**Code:** `master` @ HEAD `0f8a230` (impl `5e80c8b` + docs `8db9fd6`; no code change since) re-audited on 2026-09-03

**Verdict: VERIFIED (re-audit) — cycle remains complete.** This is a re-audit of the State-4 cycle. `git diff
--name-only 8db9fd6..HEAD -- native/ src/ tests/` is **empty** — the code tree is byte-identical to the commit
`8db9fd6` that Implementation Verification v15 / audit v52 independently reproduced at 37/37. All four plan
edits re-verified in source this cycle; the web half of the gate independently re-reproduced byte-for-byte.

**Independent re-verification this cycle:**
- **Source re-read (all four changes present & correct).**
  - §4.1 — `RosterView.swift:68–69` `.frame(maxWidth: .infinity, alignment: .leading)` + `.contentShape(Rectangle())`
    after `.padding(.vertical, …)` on the row label; `.buttonStyle(.plain)` (`:20`), `.isButton` (`:45`),
    `.frame(minHeight:)` (`:22`) all preserved.
  - §4.2 — `ResultView.swift`: child `Text(displayName)` (`:19`) carries **no** identifier; the VStack applies
    `.accessibilityElement(children: .combine)` (`:34`) → `.accessibilityLabel` (`:35–37`) → `.accessibilityIdentifier(A11y.resultTitle)` (`:38`). Combined `StaticText` queryable; label byte-for-byte.
  - §4.3 — `CheckIn007UITests.swift:81,101` both `app.buttons[A11yId.mark007]`; **zero** `otherElements[…mark007]`
    (the 3 residual `otherElements` uses are unrelated non-`mark007` queries).
  - §4.4 — `requireExists` (`:22–38`) matches the §4.4 spec verbatim (failure-only `app.debugDescription`
    attachment, same timeout, `#filePath`/`#line` caller attribution, no retry/tap); applied to `scan.status`,
    `result.title`, `mark007`, admin-sheet, and roster-return; audio-toggle branch kept optional.
- **Web gates re-run (discriminator's own hardware, this cycle):** `node --test tests/unit/*.test.mjs` = **78/78**;
  `npx prettier --check .` clean; `npx playwright test` = **13/13**; `node scripts/build.mjs` = **26,315 gzip
  bytes**; `dist/index.html` = **70,584 bytes**, SHA-256 `8d5a9c65f83ed417acdd48cc367ce3663e60ff35a64008c0c5687cb7b2d9a744`, untracked — **matches `docs/VERIFICATION_EVIDENCE.md` byte-for-byte.**
- **Native suite:** not re-run this cycle. The Swift tree is identical (`git diff` empty) to `8db9fd6`, which
  the discriminator independently reproduced at **37/37 (0 fail / 0 skip, exit 0)** in v15/v52. Re-running
  byte-identical code would reproduce the identical `.xcresult`; the prior independent reproduction stands.

| Section | Status | Notes |
|---------|--------|-------|
| §4.1 Full-row hit target (RA #13) | **COMPLIANT** | Re-verified `RosterView.swift:68–69`. |
| §4.2 Combined result identity (RA #13) | **COMPLIANT** | Re-verified `ResultView.swift:34→38`; child `Text` unidentified. |
| §4.3 Admin query alignment (RA #12) | **COMPLIANT** | Re-verified 2 `app.buttons[mark007]`, 0 `otherElements[mark007]`. |
| §4.4 Failure-only diagnostics | **COMPLIANT** | Re-verified `requireExists` verbatim + call sites. |
| §4.5 CI truth | **COMPLIANT** | Evidence retains `BLOCKED (external billing)`; no PASS inferred. |
| §6 Phase 3 Native regression | **COMPLIANT** | 37/37 (independently reproduced at identical tree in v15/v52). |
| §6 Phase 3 Web regression | **COMPLIANT** | 78 unit / 13 e2e / prettier clean / deterministic build — **re-reproduced this cycle.** |
| §6 Phase 4 Evidence & status | **COMPLIANT** | Cycle-13 evidence section exact; README PASS; CI `BLOCKED`. |
| Clear-log scroll | **DEVIATED (improvement)** | `sheet.swipeUp()` (`CheckIn007UITests.swift:106`) reaches below-viewport `dangerSection`; weakens no assertion; **still not back-ported to plan text** (now tracked in `BACKLOG.md`). |
| §14 Completion Checklist | **7 / 7 checked** | All re-verified true. |

**Implementation Score:** 97/100

## Defects

None blocking — the ≥95 gate remains cleared; **cycle complete.** Two non-blocking, unchanged notes (both now
tracked as backlog items so they do not rot):

1. **Plan↔code drift (−2, polish).** `sheet.swipeUp()` in `testClearLogRequiresTwoConfirmations` is still absent
   from the plan text (§4.3 / §6 Phase 2 imply the clear-log workflow is "unchanged"). Back-port the scroll into
   the plan. This remains the only reason the score is not 99+.
2. **§4.1 diagnostic capture unrecorded (Path-to-100).** The post-tap `app.debugDescription` proving the
   hit-region cause is still inferred, not archived in the durable evidence. Non-blocking; captured on the next
   failing run by `requireExists`.

---

### Implementation Verification — v15

**Plan:** `IMPLEMENTATION_PLAN.md` v26 @ commit `7c51af4` (approved Cycle 13 Rev 2 = 96/100)
**Code:** `master` @ HEAD `8db9fd6` (impl `5e80c8b` + docs `8db9fd6`) audited on 2026-09-03

**Verdict: VERIFIED — cycle complete.** Plan v26 is fully implemented and the entire native + web gate is green,
**independently reproduced by the discriminator** (not merely trusting the generator's recorded evidence). The
four-red-UI-methods problem that has blocked the last several cycles is resolved for the first time. `git diff
--name-only 50b4357..8db9fd6` is exactly the six manifest files — no out-of-manifest drift.

**Independent re-run (discriminator's own hardware):**
- `xcodebuild test -project native/CheckIn007.xcodeproj -scheme CheckIn007` on iPad (A16)
  `A155995F-EC83-41BE-95B2-1A5F390ABF59`, fresh temp DerivedData + result bundle → **exit 0**.
- `xcresulttool` inventory: **37 total / 37 passed / 0 failed / 0 skipped**, `result: Passed`. `CheckIn007Tests`
  (33 unit, 6 suites) Passed; `CheckIn007UITests` 4/4 Passed (`testFirstCheckInFlow`,
  `testRepeatGuestDoesNotDuplicateOneScan`, `testAdminOpensToggleAudioAndCloses`,
  `testClearLogRequiresTwoConfirmations`).
- Web: `node --test tests/unit/*.test.mjs` 78/78; `prettier --check .` clean; `playwright test` 13/13;
  `build.mjs` 26,315 gzip bytes; `dist/index.html` 70,584 bytes, SHA-256 `8d5a9c65f83ed417acdd48cc367ce3663e60ff35a64008c0c5687cb7b2d9a744`, untracked — **byte-for-byte
  matching `docs/VERIFICATION_EVIDENCE.md`.**

| Section | Status | Notes |
|---------|--------|-------|
| §4.1 Full-row hit target (RA #13) | **COMPLIANT** | `RosterView.swift` adds `.frame(maxWidth: .infinity, alignment: .leading)` + `.contentShape(Rectangle())` after padding; `.buttonStyle(.plain)`, `.isButton`, 44-pt min preserved. |
| §4.2 Combined result identity (RA #13) | **COMPLIANT** | `.accessibilityIdentifier(A11y.resultTitle)` moved off child `Text` onto the VStack after `.accessibilityElement(children: .combine)` (`:34`→`:38`); stays a queryable `StaticText`; label unchanged. |
| §4.3 Admin query alignment (RA #12) | **COMPLIANT** | Both sites `app.otherElements[mark007]` → `app.buttons[mark007]`; identifier/label/`.isButton`/2.2 s press unchanged. |
| §4.4 Failure-only diagnostics | **COMPLIANT** | `requireExists` added verbatim to spec; failure-only attachment, same timeouts, caller attribution, no retry/tap; audio-toggle branch kept optional. |
| §4.5 CI truth | **COMPLIANT** | README + evidence retain `BLOCKED (external billing)`; no artifact/PASS inferred for run `33711898714`. |
| §6 Phase 3 Native regression | **COMPLIANT** | 37/37, both targets, 6 unit suites, 0 skips/failures, exit 0 — reproduced independently. |
| §6 Phase 3 Web regression | **COMPLIANT** | 78 unit / 13 e2e / prettier clean / deterministic build — reproduced independently. |
| §6 Phase 4 Evidence & status | **COMPLIANT** | "Cycle 13" section records exact tree/env/counts; README native status → PASS; CI honestly `BLOCKED`; evidence matches reality byte-for-byte. |
| Clear-log scroll | **DEVIATED (improvement)** | `testClearLogRequiresTwoConfirmations` adds `sheet.swipeUp()` to reach the below-viewport `dangerSection` clear button (`AdminSheet.swift:97`). Not in plan text; weakens no assertion (both confirm identifiers still required in order); transparently documented. **Back-port to plan next revision.** |
| §14 Completion Checklist | **7 / 7 checked** | All verified true. |

**Implementation Score:** 97/100

## Defects

None blocking. The implementation clears the ≥95 gate — **cycle complete.** Two non-blocking notes:

1. **Plan↔code drift (−2, polish).** The `sheet.swipeUp()` in `testClearLogRequiresTwoConfirmations` is a
   legitimate, necessary scroll to reach an off-screen control, but it is absent from the plan text (§4.3 / §6
   Phase 2 imply the clear-log workflow is "unchanged"). Back-port the scroll into the plan so plan and code
   agree. This is the only reason the score is not 99+.
2. **RA #10 remains external (not a code defect).** The exact-SHA CI run `33711898714` is still
   `BLOCKED (external billing)`. The deployment path cannot be end-to-end verified via CI until an operator
   clears billing and re-runs it. Correctly out of this cycle's scope and honestly documented; noted so the
   next cycle (if any) targets it.

### Implementation Verification — v14

**Plan:** `IMPLEMENTATION_PLAN.md` v26 @ commit `7c51af4` (approved Cycle 13 Rev 2 = 96/100)
**Code:** `master` @ HEAD `7c51af4` audited on 2026-09-03

**Verdict: NOT STARTED — plan v26 approved this cycle; no implementation exists yet.** `git diff fa180f4..HEAD`
touches only `IMPLEMENTATION_PLAN.md`; `git diff --name-only fa180f4..HEAD -- native/ src/ tests/` is empty. All
three manifest source edits are unapplied: `CheckIn007UITests.swift:61,80` still query
`app.otherElements[A11yId.mark007]` (no `app.buttons`, no `requireExists`); `ResultView.swift:23` still carries
`.accessibilityIdentifier(A11y.resultTitle)` on the `.combine` child; `RosterView.swift:58–68` `rosterRow` has
no `.frame(maxWidth: .infinity)` / `.contentShape(Rectangle())`. This is an **unstarted** cycle (State 2), not a
defective one — Implementation Score is **N/A**.

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 1 — Roster activation + result identity (RA #13) | **MISSING** | `RosterView`/`ResultView` unchanged; no focused UI run for a v26 fix commit. |
| §6 Phase 2 — Admin queries + diagnostics (RA #12) | **MISSING** | Two `otherElements[mark007]` sites intact (lines 61/80); no `requireExists` helper. |
| §6 Phase 3 — Complete regression verification | **MISSING** | Suite still red (33 unit pass / 4 UI fail from Cycle 12 stands); no fresh native or web run for a v26 commit. |
| §6 Phase 4 — Durable evidence & status | **MISSING** | No "Cycle 13" section in `docs/VERIFICATION_EVIDENCE.md`; README native status unchanged; Cycle-12 framing not yet corrected. |
| §14 Completion Checklist | **0 / 7 checked** | Every box `[ ]`. |

**Directive (State 2 — implement approved plan v26 now):**
1. **RA #13 — repair activation + result identity (Phase 1).** Add `.frame(maxWidth: .infinity, alignment:
   .leading)` then `.contentShape(Rectangle())` to the `rosterRow` label after its padding; move
   `.accessibilityIdentifier(A11y.resultTitle)` off the child `Text` onto the `.combine` VStack in
   `ResultView`. Keep `scan.status` a plain `StaticText`. Run `testFirstCheckInFlow` and
   `testRepeatGuestDoesNotDuplicateOneScan` separately then together per §6 acceptance.
2. **RA #12 — repair admin queries + add diagnostics (Phase 2).** Replace exactly the two
   `app.otherElements[A11yId.mark007]` sites with `app.buttons[A11yId.mark007]`; add `requireExists` (§4.4) for
   required elements; revert any nonexistent-identifier probe before commit. Run the two admin methods.
3. **Full regression (Phase 3).** All four UI methods green, then the shared `CheckIn007` scheme: both targets,
   six suites, **33 unit + 4 UI = 37** passes, exit 0, zero skips/failures, verified via `xcresulttool`; then
   the web gates (`npm ci`, prettier, `node --test`, playwright, build). One infra-only retry maximum.
4. **Durable evidence + status (Phase 4).** Record the tested tree, environment, focused outcomes, full
   inventory, and web counts/build hash; flip README native status to PASS **only** after Phase 3; keep CI
   `BLOCKED (external billing)`, run `33711898714`, no artifact; add the correction that methods 1–2 failed
   *after* row lookup. Do **not** weaken any assertion.

If §4.1's full-width `contentShape` does not restore activation (methods 1–2 still fail at `scan.status`), STOP
and capture the hierarchy (§13 Q1) — do not add coordinate taps or test hooks.

**Implementation Score:** N/A

---

# Native UI Accessibility Query Repair Plan Critique — Cycle 13, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `38263e6`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v25 (Cycle 13 — Native UI Accessibility Query Repair)
**Score:** **72 / 100** (previous: v24 Cycle-12 Rev 1 = 96; this is a **new** plan → first review of v25)
**Status:** **NOT APPROVED** (below the ≥95 gate — the plan's central acceptance is unachievable with its change set)

Plan v25 is clean, honest, and env-accurate about the one thing it looked at — the `roster.mark007`
`.isButton`-vs-`otherElements` mismatch. But its **load-bearing premise is factually wrong**, and I proved
it by running the suite. §1 asserts a single **"shared cause"** for *all four* UI failures
(`roster.mark007` trait/query). Only **two** of the four UI methods touch `mark007`. The other two
(`testFirstCheckInFlow`, `testRepeatGuestDoesNotDuplicateOneScan`) fail **downstream in the check-in flow**,
with no relation to `mark007`. v25 changes only the two `mark007` lookups, so even a perfect execution
leaves the suite red — it cannot reach its own §6 Phase 3 / §14 acceptance ("four UI methods, 37 total
passes, no skips/failures"). This is a misdiagnosis + scope gap, not a polish nit, so the plan is not
approvable as written.

## Ground-truth verification (what I ran, and what it proved)

I ran the two non-`mark007` UI methods on the booted iPad (A16) `A155995F-…` (iOS 26.4 `23E244`, Xcode 26.4
`17E192`), current tree `38263e6` (unchanged from the Cycle-12 code state):

```
xcodebuild test -project native/CheckIn007.xcodeproj -scheme CheckIn007 \
  -destination 'platform=iOS Simulator,id=A155995F-EC83-41BE-95B2-1A5F390ABF59' \
  -only-testing:CheckIn007UITests/CheckIn007UITests/testFirstCheckInFlow \
  -only-testing:CheckIn007UITests/CheckIn007UITests/testRepeatGuestDoesNotDuplicateOneScan
→ ** TEST FAILED **
```

xcresult failure locations (independently extracted, not trusted from prose):
- `testFirstCheckInFlow()` → **`CheckIn007UITests.swift:30` XCTAssertTrue failed** — `scan.status` static text
  not found within 5 s **after** the roster-row tap. The roster-row lookup at line 26
  (`app.buttons.matching(rosterRowPrefix)`) **PASSED** (rows *are* exposed under `app.buttons`).
- `testRepeatGuestDoesNotDuplicateOneScan()` → **`CheckIn007UITests.swift:51` XCTAssertTrue failed** —
  `result.title` static text not found within 10 s **after** the tap. Roster-row lookup at line 48 **PASSED**.

**Consequences for v25:**
1. **The "all four fail on the `mark007` mismatch" story is false.** Two methods clear the roster-row lookup
   and then fail on the scan → result transition (`scan.status` / `result.title`). `mark007` is never queried
   in these two methods. Fixing the two `mark007` lookups does nothing for them.
2. **The Cycle-12 evidence phrase "all four … failed *initial element lookup*" is inaccurate.** Methods 1 & 2
   fail *downstream* (lines 30 / 51), not at initial lookup. RA #12 inherited that imprecise framing, and v25
   built its whole scope on it.
3. **`scan.status` (`ScanView.swift:35-39`) and `result.title` (`ResultView.swift:19-23`) are both on `Text`
   views** → they *should* resolve under `app.staticTexts`. So the failure is most likely a real check-in
   **workflow/navigation** problem (tapping a guest does not surface the scan/result screens in the UI-test
   run) — a second, independent native-UI defect that v25 neither diagnoses nor addresses.

## What v25 gets right (verified)

1. **The `mark007` half is correct.** `RosterView.swift:43-46` assigns `A11y.mark007`, label
   `"Admin (long press)"`, `.accessibilityAddTraits(.isButton)`, and `.onLongPressGesture(minimumDuration: 2.0)`
   exactly as §4.1/Phase 1 claim; the `.isButton` trait means XCUITest exposes the control under `app.buttons`,
   so `app.buttons[A11yId.mark007]` is the right query for `testAdminOpensToggleAudioAndCloses` (line 61) and
   `testClearLogRequiresTwoConfirmations` (line 80). Exactly **two** `app.otherElements[A11yId.mark007]` call
   sites exist — matching Phase 1 step 4 ("exactly two button queries").
2. **Inventory is exact.** Six unit suites = 7+3+8+6+5+4 = **33** unit methods; **4** UI methods — matching §6
   Phase 3 ("33 unit and four UI methods, 37 total passes").
3. **Environment §11 verbatim-accurate.** Xcode 26.4 (`17E192`), iOS 26.4 (`23E244`), iPad (A16)
   `A155995F-EC83-41BE-95B2-1A5F390ABF59` (Booted). All confirmed.
4. **CI disposition honest (§4.4).** Run `33711898714` retained as terminal `BLOCKED (external billing)`, not
   banked. Consistent with §2/§8.
5. **No gate weakening.** §2 forbids deleting/skipping assertions; §4.2 keeps every downstream assertion. The
   plan preserves product accessibility (does not remove `.isButton`).

## Remaining issues (blocking)

1. **BLOCKING — misdiagnosed root cause; fixes only 2 of 4 failing UI methods.** §1/§4.1 treat `mark007` as the
   sole shared cause of all four failures. Empirically, `testFirstCheckInFlow` (line 30, `scan.status`) and
   `testRepeatGuestDoesNotDuplicateOneScan` (line 51, `result.title`) fail in the scan → result flow,
   independent of `mark007`. v25's change set (two query edits) cannot make them pass, so §6 Phase 3 / §14
   box 4 ("four UI methods, 37 total passes") is **unreachable**. *Fix:* expand scope to diagnose and address
   the check-in-flow UI failure (why tapping a roster row does not surface `scan.status`/`result.title` in the
   UI test) in addition to the `mark007` query — or split the native-green target so the plan does not claim a
   result its change set cannot deliver.
2. **BLOCKING — no diagnosis of the scan/result-screen failure.** The plan contains zero analysis of the
   ScanView/ResultView transition, the `model.selectGuest` path, or why `scan.status`/`result.title` do not
   appear post-tap. Since these identifiers sit on `Text` views (should be `staticTexts`), this is likely a
   product-navigation/timing defect, not a query-type mismatch — but the plan neither confirms nor rules that
   out. A plan whose success gate is "the whole UI suite is green" must account for every failing method.
3. **Non-blocking — the completion gate would send the generator back to STOP.** §14 requires "all four UI
   methods pass." If the generator implements v25 verbatim, it will land 2/4 (best case), re-run, and hit the
   same red-suite STOP state Cycle 12 hit — burning a cycle. This is the practical cost of issues #1–#2.

## Scope Check

- **Audit findings:** open RAs are **#12** (P1, native UI red — the target) and **#10** (P1, CI billing,
  external). v25 targets **#12** but addresses only ~half its actual failure surface (the 2 `mark007` methods),
  leaving the other 2 UI failures unaddressed and undiagnosed. **#10** correctly preserved as external. A
  second native-UI defect (check-in scan/result flow) is surfaced by this review → raised as **RA #13 (P1)**;
  v25 does not cover it. **Scope cap applies:** the plan ignores an in-scope, same-subsystem defect (the other
  half of the very native-red gate it exists to close).
- **Backlog:** `BACKLOG.md` = **0** unchecked. Nothing skipped there.
- **Integration points:** §7 gives four contracts (SwiftUI tree ↔ XCUITest, admin affordance ↔ workflows,
  runner ↔ evidence, git ↔ docs) — but all framed around `mark007`; none covers the roster-row → scan → result
  path that actually fails in 2 of 4 methods.
- **Alternatives considered:** §4.1 weighs `app.buttons` vs dropping `.isButton` vs untyped query — good, but
  only for the `mark007` slice.

## Flaws of Commission

1. **§1 states a false "shared cause."** "Required Action #12 identifies the shared cause: `roster.mark007` …
   while two UI-test call sites query it through `otherElements`" — then equates "two call sites" with "all four
   UI methods fail." Two of the four methods never touch `mark007`; the causal claim is disproven by execution.
2. **§6 Phase 3 / §14 assert an outcome the change set cannot produce** ("four UI methods, 37 total passes"),
   because two of the four fail for a cause the plan does not touch.

## Flaws of Omission

1. No diagnosis or handling of the `testFirstCheckInFlow` / `testRepeatGuestDoesNotDuplicateOneScan` failures
   (scan/result flow) — the decisive omission.
2. No branch for "only some UI methods pass after the query fix" — the plan assumes a binary all-green outcome.
3. No verification that the roster-row → scan → result navigation works on the simulator at all (it does not,
   per my run), which is prerequisite to any "4/4 UI green" claim.

## Regressions

No regressions identified. The manifest (§5) touches only `CheckIn007UITests.swift` + docs; §2 forbids product,
web, dependency, workflow, and `dist/` changes. The proposed `otherElements`→`buttons` edit does not weaken the
two admin methods it touches.

## Why 72 and not higher

The `mark007` analysis is genuinely correct and would fix 2 of the 4 methods — that keeps this well above a
fabrication-grade score. But a plan is scored on whether it can meet its own acceptance, and this one cannot:
its headline gate (full native suite green) is unreachable because it misdiagnosed half the failures and
scoped out the check-in-flow defect entirely. That is a completeness + feasibility failure at the level of the
plan's core purpose, not a specificity nit — hence low-70s, not the 90s the prose polish might suggest.

## Path to ≥95

1. **Diagnose the real UI-red surface first, then plan against all of it.** The native suite fails for (a) the
   `mark007` `otherElements`→`buttons` mismatch (methods 3 & 4) AND (b) the check-in scan→result transition not
   surfacing `scan.status`/`result.title` after a roster-row tap (methods 1 & 2, at lines 30 & 51). Address
   **both**, or explicitly re-scope the acceptance so it doesn't claim 4/4 when the change set delivers 2/4.
2. **Root-cause (b).** Both identifiers are on `Text` views → capture the XCUITest hierarchy at failure to
   determine whether it's a navigation/state issue (`selectGuest` not advancing the phase in the test harness),
   a timing issue (scan phase auto-advances before the 5 s query resolves), or a camera-`task` interaction on
   the simulator. Fix the product/test accordingly **without weakening assertions**.
3. **Correct §1's causal claim** to reflect that only two methods depend on `mark007` and two fail downstream.
4. **Keep** the correct `mark007` query fix, the exact inventory, the honest CI `BLOCKED` disposition, and the
   no-assertion-weakening discipline — those are already right.

## Path to 100

Beyond ≥95: pin the exact per-method acceptance (which of the 4 UI methods each change makes green); add a
diagnostic-capture step (dump `app.debugDescription` on first failure) so future runs attribute failures to a
specific element/type; and state the expected element type for `scan.status`/`result.title`
(`staticTexts`) so a type/trait regression there is caught the same way the `mark007` one was.

## Summary

Plan v25 is **NOT APPROVED (72/100).** It correctly fixes the `mark007` `otherElements`→`buttons` mismatch for
2 of the 4 UI methods, but its stated "shared cause" is false: I ran the other two methods and they fail
downstream in the check-in flow (`scan.status` line 30, `result.title` line 51), untouched by the fix. The
plan therefore cannot meet its own "four UI methods, 37 total passes" acceptance. The loop stays in **State 1
— revise the plan**: expand scope to diagnose and address the check-in-flow UI failure (RA #13) alongside the
`mark007` query, or re-scope the acceptance to what the change set can actually deliver. Implementation Score
is **N/A** — v25 is not implemented (the UI test still queries `app.otherElements[A11yId.mark007]` at lines 61
and 80; `git diff b87cfd3..HEAD` touches only `IMPLEMENTATION_PLAN.md`).

**Plan Score:** 72/100

**Implementation Score:** N/A

---

### Implementation Verification — v13

**Plan:** `IMPLEMENTATION_PLAN.md` v25 @ commit `38263e6` (Cycle 13 — NOT APPROVED, 72/100)
**Code:** `master` @ HEAD `38263e6` audited on 2026-09-03

**Verdict: NOT IMPLEMENTED — and the plan is not approved.** The only change since the Cycle-12 audit
(`b87cfd3`) is `38263e6` (`plan: v25`), which rewrites `IMPLEMENTATION_PLAN.md` only. `git diff b87cfd3..HEAD`
touches no source file. The UI test still queries `app.otherElements[A11yId.mark007]` at
`CheckIn007UITests.swift:61` and `:80` — v25's Phase 1 edit is not applied. Implementation Score is **N/A**
(nothing built). Note the loop is in **State 1**, not State 2: plan v25 must be revised to ≥95 before
implementation, because as written its acceptance gate is unreachable (see the Cycle-13 Rev-1 critique above —
2 of the 4 failing UI methods fail downstream in the check-in flow, which v25 does not address).

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 1 — Repair the query | **MISSING** | `CheckIn007UITests.swift:61,80` still `app.otherElements[A11yId.mark007]`; no `app.buttons` edit. |
| §6 Phase 2 — Focused native verification | **MISSING** | No fresh focused UI run recorded for a v25 fix commit. |
| §6 Phase 3 — Complete regression verification | **MISSING** | Suite is still red (I re-confirmed 2 non-`mark007` UI methods FAIL at lines 30/51); web gates not re-run for a v25 commit. |
| §6 Phase 4 — Durable evidence & status | **MISSING** | No "Cycle 13" section in `docs/VERIFICATION_EVIDENCE.md`; README unchanged. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`. |

**Directive (State 1 — revise plan v25 first):** Do **not** implement v25 as written — it fixes only the
`mark007` slice and would land a still-red suite (2/4 UI), re-hitting the STOP state. Revise v25 to (1) keep
the correct `app.buttons[A11yId.mark007]` fix for `testAdminOpensToggleAudioAndCloses` /
`testClearLogRequiresTwoConfirmations`, and (2) diagnose + address why `testFirstCheckInFlow` (`scan.status`,
line 30) and `testRepeatGuestDoesNotDuplicateOneScan` (`result.title`, line 51) fail after the roster-row tap
(RA #13). Both `scan.status` and `result.title` are on `Text` views (should be `staticTexts`), so investigate
the scan→result navigation/timing on the simulator. Do not weaken any assertion; keep CI `BLOCKED (external
billing)`.

**Implementation Score:** N/A

---

# Native CSV Parity Repair Plan Critique — Cycle 12, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `a6ca9b7`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v24 (Cycle 12 — Native CSV Parity and External-Gate Disposition)
**Score:** **96 / 100** (previous: v23 Cycle-11 Rev 1 = 96; this is a **new** plan → first review of v24)
**Status:** APPROVED (clears the ≥95 gate)

Plan v24 is the correct State-1 response to Audit v47 / Implementation Verification v10: it opens a
dedicated fix-cycle for the proven `CSVCodec.parseRows` data-loss defect (RA #11), folds in the camera
characterization and the bounded terminal CI disposition (RA #10), and does so without weakening any web
expectation or laundering the billing-blocked run into a PASS. The root-cause diagnosis is not just
plausible — it is **independently verifiable and exactly correct**. The plan is implementation-ready.

## Issues resolved in revision 1

First review of v24 — no prior revision. v24 supersedes the success-only v23 (which hit its designed STOP
state when the native gate ran and failed) with an actual product fix plus an honest CI disposition,
addressing Implementation Verification v10's two directives and Audit v47 RA #11.

## Ground-truth verification (all load-bearing claims confirmed)

1. **Root cause (§4.1) is exactly right.** `parseRows` builds `let characters = Array(source)` →
   `[Character]`. Swift renders `"\r\n"` as a **single** extended grapheme cluster, so the two delimiter
   tests at `CSVCodec.swift:55` (`character == "\n"`) and `:60` (`character != "\r"`) both miss it and the
   combined CRLF is appended into the field via `field.append(character)` — collapsing the two-row fixture
   into one row, after which the test's unconditional `rows[1]` (`CSVCodecTests.swift:10`) crashes
   index-out-of-range. Traced by hand on `"\u{FEFF}name,table\r\n\"Vale, Bianca\",\"Table \"\"3\"\"\"\r\n"`
   → 1 row, matching the reproduced failure verbatim.
2. **The proposed fix is provably parity-preserving.** Web `src/lib/csv.mjs` indexes UTF-16 code units:
   standalone `\r` is dropped (`char !== '\r'` false → ignored), `\n` breaks the row, and inside quotes both
   are appended. §4.1's rule — "treat standalone LF and combined CRLF as delimiters, ignore standalone CR,
   preserve quoted CR/LF" — yields byte-identical grids for CRLF, lone LF, lone CR, `\r\n\r\n` blank rows
   (both graphemes break; empty row filtered), and quoted embedded newlines (`"\r\n"` grapheme appended =
   web's `"\r" + "\n"`). No case diverges.
3. **Web source-of-truth is protected.** §2/§4.2 forbid changing web behavior or the expected 2-row result;
   `tests/unit/csv.test.mjs:5` (78/78 green) remains the contract. §4.3 fixes the secondary crash by asserting
   row count before conditionally unwrapping `rows[1]`.
4. **Inventory exact.** Six suites (`CSVCodecTests` 6, `CameraPrivacyTests` 3, `CheckInStoreTests` 8,
   `GuestCatalogTests` 6, `LogMergerTests` 5, `ScanAudioPlayerTests` 4) = **32** unit methods; **4** UI —
   matching §6 Phase 3 step 4 ("32 baseline plus new regressions", "four UI methods").
5. **Environment §11 accurate.** `xcrun simctl list runtimes` = iOS 26.4 (23E244) installed; `git remote -v`
   = `origin https://github.com/daniqan/check-in-007.git`; iPad (A16) UDID `A155995F-EC83-41BE-95B2-1A5F390ABF59`.
6. **CI disposition honest (§4.5).** Run `33711898714` (`head_sha 845116d`, `push`, `master`, `failure` on
   billing lock) is recorded as terminal `BLOCKED (external billing)`, not banked as PASS; no repush/poll.

## Remaining issues

1. **Post-fix unit-method count not pre-committed (specificity nit).** §6 Phase 3 step 4 requires "the 32
   baseline unit methods plus new regressions" without stating the exact post-fix total. Phase 1 step 5 adds
   a table-driven regression (LF/CRLF/terminal/quoted-embedded/blank/BOM). Naming the exact expected count
   (e.g. "≥33 unit methods, of which the new CSV cases are N") would let the xcresult inventory gate assert a
   precise number rather than a floor. *Non-blocking.*
2. **Conditional camera-fix branch is under-specified (§4.4 / Phase 2 step 4).** If the stall reproduces, the
   plan prescribes "move session operations to one private serial queue, return state to `MainActor`, make
   stop idempotent" but does not identify which current `CameraPreviewModel` operations block or how state
   republishes — reasonable, since the more-likely branch is non-reproduction after the CSV-crash removal,
   but the reproduce branch would benefit from naming the specific `start()`/authorization/`configureSession`
   calls to relocate. *Non-blocking; conditional.*
3. **"Combined CRLF is the only compound delimiter grapheme" left implicit.** §4.1 is correct but a naive
   implementer could over-generalize. Stating that the ONLY combined-grapheme delimiter is exactly
   `Character("\r\n")` (all other CR/LF permutations remain single graphemes handled by the existing LF/CR
   rules) removes any ambiguity. *Cosmetic.*

## Scope Check

- **Audit findings:** Audit v47 open RAs are **#11** (P1, CSV parity data-loss) and **#10** (CI billing,
  external). v24 addresses **#11** directly (the CSV fix + regression, §4.1–§4.3, Phase 1) and **#10** via
  the §4.5 bounded terminal disposition. RA #9 was discharged (gate run). No in-scope finding is ignored.
- **Backlog:** `BACKLOG.md` has **0 unchecked** items. Nothing in scope skipped.
- **Second v47 issue folded in:** the `CameraPrivacyTests` stall is characterized/bounded in Phase 2.
- **Integration points:** §7 gives four contracts (Swift↔web parser, rows↔normalization, camera↔simulator,
  git-tree↔evidence) with failure/recovery each.
- **Alternatives considered:** §4.1 (grapheme fix vs new CSV library vs line-splitting), §4.4 (fix vs
  characterize camera), §4.5 (BLOCKED disposition vs poll/repush). Tradeoffs stated.

**No score cap applies** — scope is exactly adequate for the phase.

## Flaws of Commission

No flaws of commission identified. The grapheme diagnosis is correct, the fix preserves O(n) single-pass
parsing and full web parity, the crash-safe assertion ordering is right, and the CI disposition does not
convert a failed run into a pass. The one internal-consistency softness is the floor-vs-exact test count
(Remaining issue #1), not an incorrect decision.

## Flaws of Omission

1. Exact post-fix test count not pinned (Remaining issue #1).
2. Reproduce-branch camera design not tied to specific current call sites (Remaining issue #2).
3. The plan does not state what happens if, after the CRLF fix, a *different* parity case is discovered by
   the new table-driven matrix (e.g. a quoted-CRLF cell mismatch) — presumably it fails the regression and
   is fixed in-cycle, but the plan could say so. Minor; the acceptance criteria implicitly cover it.

## Regressions

No regressions identified. The manifest (§5) touches `CSVCodec.swift` (delimiter recognition only),
`CSVCodecTests.swift` (additive regressions + safe assertion), conditional camera files, and docs. §2
forbids changing web behavior, guest normalization/export semantics, dependencies, lockfiles, workflow YAML,
or `dist/`. Quoted-newline preservation, blank-row dropping, and `unterminatedQuote` behavior are retained;
no test coverage shrinks.

## Why 96 and not 97

The diagnosis and fix are 98-grade — correct, verified, parity-proven. The score is held at 96 by two real
specificity gaps: the post-fix inventory gate asserts a floor rather than an exact count (#1), and the
conditional camera-fix branch is described at the design level without binding to the current
`CameraPreviewModel` call sites (#2). Neither blocks implementation; both are the difference between "a
competent developer can execute this" (true now) and "the plan leaves zero micro-decisions" (not quite).

## Path to ≥95

Already cleared (96). No blocking items.

## Path to 100

1. **Pin the exact post-fix unit-method count** in §6 Phase 3 step 4 and §10 (e.g. "33 unit methods; the new
   table-driven CSV regression contributes cases A–F"), so the xcresult inventory gate checks an exact number.
2. **Bind the reproduce-branch camera fix to specific call sites** (§4.4) — name the `start()` /
   authorization / `configureSessionInputs()` operations to relocate onto the serial queue.
3. **State the compound-grapheme invariant explicitly** (§4.1): only `Character("\r\n")` is a combined
   delimiter; all other CR/LF forms are single graphemes handled by the existing rules.
4. **Add a "new parity case discovered mid-cycle" note** — if the table-driven matrix surfaces a second
   divergence, it fails the regression and is fixed in-cycle without scope expansion.
5. **Micro-precision:** restate the expected fixture result inline in the acceptance line of Phase 3 as well
   as Phase 1, so the full-suite gate and the unit gate cite the same literal grid.

## Summary

Plan v24 is approval-grade (96/100): a precise, ground-truth-verified repair whose root-cause analysis I
independently confirmed and whose fix I confirmed preserves exact web parity across every CR/LF permutation.
It addresses the one open in-scope P1 defect (RA #11) plus the camera stall and the bounded CI disposition
(RA #10), with no scope gaps, no regressions, and no laundering of the billing-blocked run. It clears the
≥95 gate and becomes the contract for implementation. The loop advances **State 1 → State 2 — implement
approved plan v24.** Implementation Score is **N/A** — nothing is built yet (`CSVCodec.swift` still carries
the buggy delimiter logic, no commits since the plan landed, §14 boxes all unchecked).

**Plan Score:** 96/100

**Implementation Score:** N/A

---

### Implementation Verification — v12

**Plan:** `IMPLEMENTATION_PLAN.md` v24 @ commit `a6ca9b7` (approved Cycle 12 Rev 1 = 96/100)
**Code:** `master` @ HEAD `9072d5b` (fix `b0bdf11` + evidence `9072d5b`) audited on 2026-09-03

**Verdict: IMPLEMENTED, BUT THE CENTRAL ACCEPTANCE GATE FAILS.** Cycle 12 landed real,
verified, honestly-reported work: the RA #11 `CSVCodec.parseRows` data-loss defect is **fixed**
and the camera stall is **fixed**. But the plan's headline deliverable — **§6 Phase 3 / §14 box 4:
the full native scheme passes on iOS 26.4 iPad with zero failures across both targets** — is **NOT
met**: the recorded (and code-confirmed) result is **33 unit passed, 4 UI failed**. §14 is honestly
**4 / 6** (boxes 4 and 6 correctly left `[ ]`). The implementation is neither a fabrication nor a
weakened gate — it is genuine progress that stops short of the cycle's own success criterion.
Loop is in **State 3 (fix the implementation to meet the approved plan)** — but see the disposition:
the residual failure is an *out-of-manifest* UI-harness defect, so closing it requires a **new plan
cycle**, not an in-place code patch under v24's scope.

#### Ground-truth verification (independently confirmed against the code, not just the evidence)

1. **CSV fix is correct and parity-preserving (§4.1–§4.3, Phase 1) — COMPLIANT.** `CSVCodec.swift:55`
   now reads `character == "\n" || character == "\r\n"`, recognizing Swift's combined-CRLF grapheme
   as one delimiter while `:60` still ignores standalone `"\r"` and the quoted branch still appends
   both. Traced on the audit fixture → exactly `[["name","table"],["Vale, Bianca","Table \"3\""]]`.
   The web source of truth (`src/lib/csv.mjs`, `tests/unit/csv.test.mjs` 78/78) is untouched.
2. **Crash-safe assertion + parity matrix (§4.3, Phase 1 step 5) — COMPLIANT.** `CSVCodecTests.swift`
   now count-guards before unwrapping (`guard rows.count == 2 else { return }`) and adds a
   7-case table-driven method (LF, CRLF, terminal CRLF, quoted LF, quoted CRLF, blank records,
   doubled quote). Confirmed additive.
3. **Camera fix is real (§4.4, Phase 2) — COMPLIANT.** `CameraPreviewModel` now delegates
   configure/start/stop to a private `SessionWorker`, makes authorization providers injectable
   (`authorizationStatus` / `requestAccess`), marks `State: Sendable`, and republishes the awaited
   result on `MainActor`. Privacy remains preview-only (no audio input, no capture output). Evidence
   records reproduction of the stall then two green isolated `CameraPrivacyTests` runs (~1.7 s each).
4. **Web gates — COMPLIANT.** `npm ci` / prettier / 78 unit / 13 e2e / build (26,315 gzip;
   `dist/index.html` 70,584 B, SHA-256 `8d5a9c65…`) all recorded PASS.
5. **CI disposition — COMPLIANT (honest).** Run `33711898714` (`head_sha 845116d`, `failure` on
   billing lock) recorded as terminal `BLOCKED (external billing)`, not banked as PASS.
6. **Full native scheme — FAILED (the gate).** Evidence §"Full native result — FAIL": both targets
   ran, all six unit suites green (**33/33** methods), but **all four UI methods failed** initial
   element lookup, twice (one qualified infra retry gave the same 33-pass/4-fail split).
   **Root cause independently confirmed in the code:** `RosterView.swift:43-45` gives the `roster.mark007`
   admin control `.accessibilityAddTraits(.isButton)`, so XCUITest exposes it under `app.buttons`,
   but `CheckIn007UITests.swift:61,80` query `app.otherElements[A11yId.mark007]` — a genuine
   query/trait mismatch that fails `testAdminOpensToggleAudioAndCloses`,
   `testClearLogRequiresTwoConfirmations`, and the two flows that route through the admin sheet.
   This is a **pre-existing** harness defect that only surfaced now that the CSV crash + camera stall
   no longer abort the run before the UI target reports.

#### Section-by-section compliance (approved plan v24 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 1 — Reproduce & correct CSV parsing | **COMPLIANT** | Delimiter fix correct + parity-preserving; crash-safe assertion + 7-case matrix added; audit fixture → 2 rows. |
| §6 Phase 2 — Characterize camera stall | **COMPLIANT** | Stall reproduced then fixed via serial `SessionWorker` + injectable auth; privacy preserved; two green isolated runs. |
| §6 Phase 3 — Full regression & native verification | **PARTIAL / FAILED** | Web gates green; native unit target green (33/33) but **4 UI methods FAIL** → the "zero failures across both targets" acceptance is UNMET. |
| §6 Phase 4 — Durable evidence & status | **COMPLIANT** | "Cycle 12" evidence section added; honestly records native FAIL + CI `BLOCKED (external billing)`; §14 kept at 4/6; no PASS laundered. |
| §14 Completion Checklist | **4 / 6 checked** | Boxes 1,2,3,5 `[x]`; **box 4 (full native green)** and **box 6 (evidence records native PASS)** correctly `[ ]`. |

#### Defects (fix to meet the approved plan)

1. **Native suite is not green — 4 UI-test failures (violates §6 Phase 3 acceptance + §14 box 4).**
   `CheckIn007UITests` queries `app.otherElements[roster.mark007]` while the element carries the
   `.isButton` trait (exposed under `app.buttons`). **Fix options** (choose one, both currently
   out of v24's manifest §5 — hence a new cycle): (a) query `app.buttons[A11yId.mark007]` in
   `CheckIn007UITests.swift`, or (b) drop `.accessibilityAddTraits(.isButton)` from `RosterView.swift:45`
   (weigh VoiceOver semantics). Acceptance: both targets green — six suites, 33 unit methods, 4 UI
   methods, exit 0, zero failures — on iPad (A16) `A155995F-…`, without weakening any assertion.
2. **§14 box 6 remains open** until box 4 is met and the evidence/README can honestly record native PASS.

#### Disposition — State 3, but the remaining fix is out-of-manifest → open a new cycle

Plan v24 (§5 manifest) deliberately scopes out `CheckIn007UITests.swift` and `RosterView.swift`
(UI redesign out of scope, §2), so the residual UI-harness failure **cannot** be corrected in place
under v24 without violating scope. The generator correctly did **not** touch the out-of-manifest UI
files this cycle and honestly recorded the FAIL. The correct next move is a **new fix-cycle (State 1
→ new plan)** that brings the trait/query mismatch into scope (RA #12), targeting a fully green
native scheme. Do not weaken any UI assertion and do not mark §14 box 4/6 until the suite is green.

**Implementation Score:** 84/100

*(< 95: the CSV data-loss defect that drove this cycle is genuinely fixed and the camera stall
resolved — the score is not low — but the plan's central acceptance gate (full native scheme green,
zero failures) is unmet because of a pre-existing, now-revealed UI-harness defect. Honest reporting
and no gate-weakening keep this well above a fabrication-grade score, but an unmet headline
deliverable keeps it below the ≥95 completion gate.)*

---

### Implementation Verification — v11

**Plan:** `IMPLEMENTATION_PLAN.md` v24 @ commit `a6ca9b7` (approved Cycle 12 Rev 1 = 96/100)
**Code:** `master` @ HEAD `a6ca9b7` audited on 2026-09-03

**Verdict: NOT STARTED.** Plan v24 was approved this cycle; no implementation exists yet. `git log a6ca9b7..HEAD`
is empty (the plan commit is HEAD), and the manifest source files are untouched: `CSVCodec.swift:55/:60` still
test only `"\n"` and `"\r"`, so the combined-CRLF grapheme is still appended into the field and the audit
fixture still returns **1 row instead of 2**. `CSVCodecTests.swift:10` still unconditionally reads `rows[1]`.
This is an **unstarted** cycle, not a defective one — Implementation Score is **N/A**, and the loop is in
**State 2 (implement the approved plan)**.

#### Section-by-section compliance (approved plan v24 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 1 — Reproduce & correct CSV parsing | **MISSING** | `CSVCodec.swift` unchanged (buggy delimiter logic intact); `CSVCodecTests.swift` unchanged (6 methods, unsafe `rows[1]` unfixed). |
| §6 Phase 2 — Characterize camera stall | **MISSING** | No isolated `CameraPrivacyTests` run recorded; conditional files untouched. |
| §6 Phase 3 — Full regression & native verification | **MISSING** | No fresh web-gate or `xcodebuild test` run recorded for a v24 fix commit. |
| §6 Phase 4 — Durable evidence & status | **MISSING** | No "Cycle 12" section in `docs/VERIFICATION_EVIDENCE.md`; README unchanged. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`. |

#### Directive (State 2 — implement plan v24 now)

1. **Fix `CSVCodec.parseRows` (RA #11 — the score driver).** In the non-quoted branch, recognize the combined
   `Character("\r\n")` grapheme as a row delimiter alongside standalone `"\n"`, keep ignoring standalone
   `"\r"`, and keep appending characters (including a quoted `"\r\n"` grapheme) inside quotes. Acceptance:
   the audit fixture yields exactly `[["name","table"],["Vale, Bianca","Table \"3\""]]`.
2. **Make the regression crash-safe (§4.3)** and add the table-driven parity matrix (§6 Phase 1 step 5).
3. **Characterize the camera stall (Phase 2)** on the installed iPad; fix only if it reproduces.
4. **Run the full native scheme + all web gates (Phase 3)** on iPad (A16) `A155995F-…`; require both targets,
   six suites, 32+ unit methods, 4 UI, zero failures, exit 0.
5. **Record durable evidence + README status (Phase 4)**; CI stays `BLOCKED (external billing)`, run
   `33711898714`, no artifact. Do **not** weaken any test or bank the failed run (§2/§8).

**Implementation Score:** N/A

---

### Implementation Verification — v10

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` — target `845116d`; audit HEAD `7b4d681` (`test(§6.1): record native simulator gate failure`) — audited on 2026-09-03

**Verdict: NATIVE GATE FINALLY RUN (RA #9 discharged) — and it GENUINELY FAILS on a REAL product defect;
CI still billing-blocked. Cycle 11 CANNOT complete under v23's success-only scope. Loop → State 1 (revise
v23) + a NEW fix-cycle for the native bug.** The material change since v9 is that commit `7b4d681` records
a **native `xcodebuild test` execution** (evidence `docs/VERIFICATION_EVIDENCE.md` Cycle-11 section) — the
gate that had been un-run for two idle cycles is now run. Crucially, **the recorded failure is TRUE and
HONEST: I reproduced it independently** (`xcodebuild … -only-testing:CheckIn007Tests/CSVCodecTests test`
against booted iPad (A16) `A155995F-…`):

```
CSVCodecTests.swift:9: error: -[…testParsesBomCrlfQuotedCommasAndDoubledQuotes] :
    XCTAssertEqual failed: ("1") is not equal to ("2")
Swift/ContiguousArrayBuffer.swift:692: Fatal error: Index out of range
** TEST FAILED **
```

`CSVCodec.parseRows` returns **1 row instead of 2** for the input
`"\u{FEFF}name,table\r\n\"Vale, Bianca\",\"Table \"\"3\"\"\"\r\n"`, after which the test crashes accessing
`rows[1]`. This is a **genuine correctness defect** — the web reference `src/lib/csv.mjs` (byte-identical
algorithm) PASSES the equivalent case (`tests/unit/csv.test.mjs:5`, part of the 78/78 green suite), so the
Swift port has a **real parity divergence** that silently drops/merges a row on native guest-import for
BOM + CRLF + quoted-comma + doubled-quote CSV. The evidence also records a second issue — a stall in
`CameraPrivacyTests.testStartOnSimulatorDoesNotCrashAndStaysNonRunning` after the runner restart (not
independently reproduced here; flagged lower-confidence).

**The generator behaved correctly under the plan:** §6 Phase 1 acceptance says "Any … crash, or failure
stops; do not edit source/tests to continue," and §2 scopes product/test edits OUT. The generator ran the
gate, recorded `FAIL` honestly, did **not** fabricate a PASS or weaken any gate (§2/§8 honored). But the
consequence is that **plan v23 has hit its designed STOP state and cannot reach completion** — its success
precondition (native tests pass) is false, and the fix it requires (correct `CSVCodec.parseRows`) is
explicitly out of scope. This is no longer a "not started / not run" N/A (v7–v9); it is a **proven
out-of-scope product defect that blocks success-only closure.**

#### Environment (re-verified this cycle)

- **Native — UNBLOCKED, RUN, FAILED.** iOS 26.4 (23E244) installed; iPad (A16) `A155995F-…` booted;
  Xcode 26.4. `xcodebuild … test` executes; `CSVCodecTests` fails as above (**independently reproduced**).
- **Target pushed.** `origin/master == 845116d`. Audit/evidence commit `7b4d681` is 1 ahead (docs-only).
- **CI — exact-SHA run exists, FAILED on billing.** Run `33711898714` (`head_sha 845116d`, `push`,
  `master`, conclusion `failure`; "Web gate" job not started, billing lock). §6 Phase 2 step 5 UNMET.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **COMPLIANT** | Target `845116d` minted (docs-only), local web gates recorded PASS (78/78 unit, 13/13 e2e, build 26,315 gzip / `dist/index.html` 70,584 B SHA `8d5a9c65…`) in the Cycle-11 evidence block. |
| §6 Phase 1 — Native iPad execution | **RUN → FAIL (compliant handling)** | Gate executed on iPad (A16); `CSVCodecTests.testParsesBomCrlfQuotedCommasAndDoubledQuotes` fails (1≠2 rows + index-out-of-range crash); Camera test stalled. **RA #9 discharged** (no longer un-run). No PASS claimed; no source/test edited — §6 Phase 1 acceptance + §2 honored. |
| §6 Phase 2 — Exact-SHA CI execution | **PARTIAL / FAILED** | Push DONE (step 3 ✓); exact-`headSha` run `33711898714` exists (step 4 ✓); run FAILED on billing — step 5 UNMET, no artifact/parity. §2/§8 forbid banking it as PASS. |
| §6 Phase 3 — Finalize evidence | **N/A** | Both externals recorded `FAIL`/`BLOCKED` honestly; no PASS finalization possible. |
| §14 Completion Checklist | **0 / 6 checked** | Correctly all `[ ]` — no gate passed. |

#### Directive (State 1 — plan v23 can no longer complete as written; two actions required)

1. **Open a NEW fix-cycle for the native CSV parity bug (RA #11 — the score-driver).** `CSVCodec.parseRows`
   diverges from `src/lib/csv.mjs` for BOM+CRLF+quoted+doubled-quote input, silently returning the wrong
   row count (data loss on native guest-import). This is a genuine product defect that v23 §2 forbids
   fixing, so it needs its own plan/cycle. Acceptance: `CheckIn007Tests` passes all six suites / 32 unit
   methods / 4 UI, zero failures, on an iOS 26.4 iPad; and re-confirm the `CameraPrivacyTests` stall is
   resolved or characterized. Do **not** "fix" the test by weakening its expectation — the web behavior
   (2 rows) is the source of truth.
2. **Revise v23 to add the bounded terminal disposition for CI (Rev-1 Path-to-100 #1).** The push is done
   and CI fires at the exact SHA; only the billing lock blocks success. If billing cannot be cleared,
   accept native-PASS + CI-permanently-environment-blocked as an explicit terminal state rather than
   leaving the cycle pending indefinitely. Do not bank run `33711898714` as a PASS (§2/§8).

**Implementation Score:** N/A

---

### Implementation Verification — v9

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` — target `845116d` (now on `origin/master`); audit HEAD `b6815f8` — audited on 2026-09-03

**Verdict: STILL NOT COMPLETE — Phase 2 push landed and an exact-SHA CI run now exists, but it FAILED
(billing); the fully-executable native gate is STILL un-run.** Two real advances since v8: (1) the target
commit `845116d` is now **published** — `git rev-parse origin/master` = `845116d41375cd6422f49bb2a53f23bcec3109e9`,
satisfying **§6 Phase 2 step 3 (normal push)**; (2) that push triggered workflow `CI` run **`33711898714`**
whose `head_sha` is the **exact target** `845116d…`, event `push`, branch `master` — satisfying **§6 Phase 2
step 4 (select the exact-`headSha` run)**. But the run's **conclusion is `failure`**: its sole job "Web gate
(Node 24 LTS)" was **not started** — annotation *"The job was not started because your account is locked due
to a billing issue"* (~2 s, zero steps executed). So **§6 Phase 2 step 5 (require `web` + every required step
to succeed) FAILS**, and §2/§8 forbid banking a failed run as a PASS. Meanwhile **§6 Phase 1 (native) is still
un-run** despite the environment being fully executable. Every completion gate remains open: **Native
`BLOCKED`, CI `BLOCKED`, §14 = 0/6.** Implementation Score stays **N/A** — the plan is a binary success-only
cycle and no PASS closure surface exists — but the disposition sharpens: the CI half is now provably
environment-blocked (a Cycle-11-target run exists and failed on billing), while the native half has **no
excuse and is on its second idle cycle.**

#### Environment (re-verified this cycle)

- **Native — UNBLOCKED and still idle.** `xcodebuild … -showdestinations` lists **six iOS 26.4 iPad
  simulators** (`iPad (A16) A155995F-EC83-41BE-95B2-1A5F390ABF59`, iPad Air 11"/13" M4, iPad Pro 11" M5,
  iPad Pro 13" M5, iPad mini A17 Pro); `simctl list runtimes` shows **iOS 26.4 (23E244) available**; 46 GiB
  free; Xcode 26.4. `xcodebuild … test` could run against a UDID immediately. It was **not run** — evidence
  Native section (L29) still reads `BLOCKED`; no `.xcresult`, no counts, no exit code.
- **Target commit PUSHED.** `origin/master == 845116d` (was `1f7d589` at v8). The v45 audit commit `b6815f8`
  remains local-only (1 ahead) — immaterial, docs-only.
- **CI — exact-SHA run now exists, and it FAILED on billing.** `gh api repos/daniqan/check-in-007/actions/
  runs/33711898714 --jq '.head_sha,.conclusion,.event,.head_branch'` → `845116d…` / `failure` / `push` /
  `master`. Annotation confirms the billing lock. This is the **correct target SHA** but a **failed** run, so
  it satisfies §6 Phase 2's identity gate yet **not** its success gate. No `dist-index-html` artifact was
  produced; no byte-parity comparison is possible.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **PARTIAL** | Target commit **minted** (`845116d`, docs-only — COMPLIANT with §4.5/§5). Still no fresh local-gate run recorded **for the target SHA**; the "Local Web Gates" evidence block holds Cycle-10 counts (Node 26; 78 unit / 13 e2e) and the Cycle-11 section is a placeholder. |
| §6 Phase 1 — Native iPad execution | **MISSING** | `xcodebuild … test` **never run**, though six bootable iOS 26.4 iPads are available. **No environment excuse remains — second idle cycle for this gate (RA #9).** |
| §6 Phase 2 — Exact-SHA CI execution | **PARTIAL / FAILED** | Push **DONE** (step 3 ✓, `origin/master == 845116d`); exact-`headSha` run **exists** (step 4 ✓, run `33711898714`). But the run **FAILED** on a billing lock — step 5 (required-step success) **UNMET**; no artifact, no byte parity. §2/§8 forbid banking it as PASS. |
| §6 Phase 3 — Finalize evidence | **MISSING** | Native `BLOCKED` (evidence L29) and CI `BLOCKED` (L43) unchanged; README status unchanged. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]` (`grep -c '^- \[ \]'` = 6). |

Base tree re-verified unchanged: native inventory still six suites / **32** methods / **4** UI — matching §6
Phase 1 step 5. No regressions; backlog 0 unchecked.

#### Directive (State 2 — run the native half NOW; the CI half is environment-blocked)

1. **Run §6 Phase 1 against a booted iPad (RA #9) — the single highest-value action, with zero excuse left.**
   `xcodebuild -project native/CheckIn007.xcodeproj -scheme CheckIn007 -destination
   'platform=iOS Simulator,id=A155995F-EC83-41BE-95B2-1A5F390ABF59' -derivedDataPath <TEMP>
   -resultBundlePath <TEMP>/CheckIn007.xcresult test`. Inspect the `.xcresult` with `xcresulttool`; require
   the exact §6 Phase 1 step-5 counts (six named suites, **32** unit methods, **four** UI tests, exit 0, zero
   failures); flip Native `BLOCKED → PASS`. This gate does not depend on GitHub billing.
2. **Clear the GitHub Actions billing lock, then re-drive the CI gate (RA #10 — push half already done).**
   The target is published and CI already fires at the exact SHA; the *only* remaining obstacle is the billing
   lock. Once cleared, re-run/re-trigger the exact-`headSha` `CI` run to success and prove `dist-index-html`
   byte parity (§6 Phase 2 steps 5–6). **Do not** bank run `33711898714` (or `33710152352`) as CI evidence
   (§2/§8).
3. **If billing cannot be cleared**, the Rev-1 primary gap (Remaining issue #1 / Path-to-100 #1) now has a
   concretely-demonstrated trigger (a Cycle-11-target run that failed only on billing): revise v23 to add a
   **bounded terminal disposition** accepting native-PASS + CI-permanently-environment-blocked, so full
   closure is not held hostage to a billing lock outside the implementer's control.

**Implementation Score:** N/A

---

### Implementation Verification — v8

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` @ HEAD `845116d` audited on 2026-09-03

**Verdict: STILL NOT COMPLETE — one Phase-0 step now done; the now-executable native gate was NOT run.**
Since v7 the generator landed **exactly one** new plan-relevant commit — `845116d` *"chore(§6.0): mint
Cycle 11 verification target"* — which appends a 6-line "Cycle 11 — External Execution Closure" placeholder
to `docs/VERIFICATION_EVIDENCE.md`. That satisfies **§6 Phase 0 step 5 / §4.5 (mint the docs-only target
commit)** and nothing else. Every completion gate is still open: **Native `BLOCKED`, CI `BLOCKED`, §14 =
0/6.** Implementation Score remains **N/A** — no PASS surface exists to verify — but the disposition tightens:
**the native gate is now fully executable with zero environment excuse, and it was still not run.**

#### Environment (re-verified this cycle)

- **Native — UNBLOCKED and idle-ready.** `xcrun simctl list devices available` shows the **six iOS 26.4
  iPad simulators**; the **iPad (A16) `A155995F-EC83-41BE-95B2-1A5F390ABF59` is already Booted**. 48 GiB
  free, Xcode 26.4 (`17E192`). `xcodebuild … test` could run against a UDID immediately.
- **Target commit minted but NOT pushed.** HEAD `845116d` is **2 commits ahead of `origin/master`
  (`1f7d589`)** — the target and the v44 audit commit are local-only. Phase 2 cannot even begin against the
  target until it is pushed.
- **CI — still billing-blocked.** The only run remains `33710152352` (event `push`, branch `master`,
  `headSha 1f7d589`, **conclusion `failure`**, job "Web gate (Node 24 LTS)" completed in ~2 s with **zero
  steps executed** — `--log-failed` returns "log not found", the billing-lock signature). No run exists for
  target `845116d`. Per §2/§8 this failed non-target run is **not** a PASS.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **PARTIAL** | Target commit **minted** (`845116d`, docs-only, changes only `docs/VERIFICATION_EVIDENCE.md` — COMPLIANT with §4.5/§5). But no Phase-0 preflight inventory or **fresh local-gate run recorded for the target SHA** — the "Local Web Gates" evidence block still holds Cycle-10 counts (Node 26; 78 unit / 13 e2e). The new Cycle-11 section is a pure placeholder. |
| §6 Phase 1 — Native iPad execution | **MISSING** | `xcodebuild … test` **never run**, though a booted iOS 26.4 iPad is available. No `.xcresult`, no counts, no exit code. **No environment excuse remains.** |
| §6 Phase 2 — Exact-SHA CI execution | **MISSING / BLOCKED** | Target `845116d` **not pushed**; the only CI run failed on a billing lock against the `ignore` commit. No `dist-index-html` parity. |
| §6 Phase 3 — Finalize evidence | **MISSING** | Native `BLOCKED` (evidence L29) and CI `BLOCKED` (L43) unchanged; README status unchanged. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`. |

Base tree re-verified unchanged: native inventory still six suites / **32** methods (6+3+8+6+5+4) / **4** UI
— matching §6 Phase 1 step 5. No regressions; backlog 0 unchecked.

#### Directive (State 2 — implement the native half NOW; there is no excuse left)

1. **Run §6 Phase 1 against the booted iPad (RA #9) — this is the single highest-value action.** Optionally
   re-run the local web gates for the target SHA first (§6 Phase 0 step 4), then:
   `xcodebuild -project native/CheckIn007.xcodeproj -scheme CheckIn007 -destination
   'platform=iOS Simulator,id=A155995F-EC83-41BE-95B2-1A5F390ABF59' -derivedDataPath <TEMP>
   -resultBundlePath <TEMP>/CheckIn007.xcresult test`. Inspect the `.xcresult` with `xcresulttool`; require
   the exact §6 Phase 1 step-5 counts (six named suites, **32** unit methods, **four** UI tests, exit 0,
   zero failures); flip Native `BLOCKED → PASS` in the evidence file. Minting a placeholder without running
   the tests is **not** progress on this gate.
2. **Push the target `845116d`, then pursue the CI PASS (RA #10).** The target is currently local-only —
   push it so a Cycle-11-target CI run can exist. Then clear the GitHub Actions billing lock, observe the
   exact-`headSha` `CI` run to success, and prove `dist-index-html` byte parity (§6 Phase 2). **Do not** bank
   run `33710152352` as CI evidence (§2/§8).
3. **If billing cannot be cleared**, the Rev-1 primary gap (Remaining issue #1 / Path-to-100 #1) has a live
   trigger: revise v23 to add a **bounded terminal disposition** accepting native-PASS +
   CI-permanently-environment-blocked, so full closure is not held hostage to billing.

**Implementation Score:** N/A

---

### Implementation Verification — v7

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` @ HEAD `1f7d589` audited on 2026-09-03

**Verdict: NOT STARTED — but the environment is now (partly) UNBLOCKED.** No implementation of approved
plan v23 exists. However, unlike v2–v6, the reason is no longer "everything environment-blocked." The
operator has resolved **both** long-standing pre-implementation blockers, and a **new** blocker surfaced on
the CI path only. Implementation Score remains **N/A** (nothing is built), but the disposition changes
fundamentally: **State 2 is now genuinely actionable for the native half.**

#### Environment change (verified this cycle)

- **Native — UNBLOCKED.** `xcrun simctl list runtimes` now reports **iOS 26.4 (23E244)** with **six
  available iPad simulators** (iPad Pro 13-inch M5 `45CAACE4-8B3E-4358-86A8-F0BC7322303E`, iPad Pro
  11-inch M5, iPad mini A17 Pro, iPad Air 13/11-inch M4, iPad A16). Xcode 26.4 (`17E192`), 48 GiB free.
  The `native-ios-sdk-not-installed` condition is **gone**. → §6 Phase 0–1 is **executable now**.
- **Remote — UNBLOCKED.** `git remote -v` = `origin https://github.com/daniqan/check-in-007.git`;
  `gh auth status` = logged in as `daniqan` (scopes `repo`, `workflow`); `origin/master == HEAD == 1f7d589`.
  → the push route works.
- **CI — NEW blocker (billing).** The push triggered workflow `CI` (run `33710152352`, event `push`,
  branch `master`, `headSha 1f7d589`), which **failed in ~2 s**:
  *"The job was not started because your account is locked due to a billing issue."* GitHub Actions cannot
  execute until billing is cleared. Note this run targets the **`ignore` commit, not a Cycle-11 target**,
  and it **FAILED** — per §2/§8 a failed/non-started run is not a PASS. Phase 2's exact-`headSha`-**success**
  gate is still unsatisfiable, now for a *different* reason.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **MISSING** | No Cycle-11 docs-only target commit minted (only commit since v43 is `1f7d589` "ignore" = one-line `.gitignore` edit). No Phase-0 preflight/inventory recorded. Approvals now *available* but not exercised. |
| §6 Phase 1 — Native iPad execution | **MISSING** | `xcodebuild … test` never run despite iOS 26.4 + 6 iPad sims now available. No `.xcresult`, no recorded counts/exit. **This is now fully executable — no environment excuse.** |
| §6 Phase 2 — Exact-SHA CI execution | **MISSING / NEW-BLOCKED** | Remote linked & HEAD pushed, but the resulting `CI` run (`33710152352`) FAILED on a billing lock, and it is against the `ignore` commit — not a Cycle-11 target. No `dist-index-html` parity check. |
| §6 Phase 3 — Finalize evidence | **MISSING** | `docs/VERIFICATION_EVIDENCE.md` unchanged (Native `BLOCKED`, CI `BLOCKED`; no Cycle-11 section, `grep -c "Cycle 11"` = 0). README unchanged. |
| §5 File Manifest | **UNTOUCHED** | `git diff d8a9949..HEAD` over the three manifest files is **empty**. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`. |

Base tree re-verified unchanged: native inventory still six suites / **32** methods (6+3+8+6+5+4) / **4**
UI — matching §6 Phase 1 step 5. No regressions; backlog 0 unchecked / 15 `[x]`.

#### Directive (State 2 — implement; no longer "revise-to-withdraw")

The v2–v6 directive ("State 2 can't advance; revise v23 to add a withdrawal disposition") **no longer
applies to the native half** — the blocker is gone. Do this:

1. **Implement §6 Phase 0–1 now (RA #9).** Mint the Cycle-11 docs-only target commit, run the local web
   gates, then run `xcodebuild -project native/CheckIn007.xcodeproj -scheme CheckIn007 -destination
   'platform=iOS Simulator,id=<iPad-UDID>' -derivedDataPath <TEMP> -resultBundlePath <TEMP>.xcresult test`
   against an available iPad UDID; inspect the `.xcresult` and require the exact §6 Phase 1 step-5 counts
   (six named suites, 32 unit methods, four UI tests, exit 0, zero failures); flip Native `BLOCKED → PASS`.
2. **Clear the GitHub Actions billing lock for the CI PASS (RA #10).** Once Actions can run, re-push the
   Cycle-11 target and observe the exact-`headSha` `CI` run to success + `dist-index-html` byte parity
   (§6 Phase 2). Full §14 completion (both gates PASS) requires this. **Do not** bank the failed run
   `33710152352` as CI evidence (§2/§8).
3. **If billing cannot be cleared**, the Rev-1 primary gap (Remaining issue #1 / Path-to-100 #1) now has a
   concrete trigger: revise v23 to add a **bounded terminal disposition** accepting native-PASS +
   CI-permanently-environment-blocked (folding in Path-to-100 #2 required-step reconciliation and #3
   event-pinning), so the loop is not held hostage to billing.

**Implementation Score:** N/A

---

# External Execution Closure Plan Critique — Cycle 11, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `d8a9949`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v23 (Cycle 11 — External Execution Closure)
**Score:** **96 / 100** (previous: Cycle 10 plan v22 Rev 2 = 97; this is a new plan → first review of v23)
**Status:** APPROVED (clears the ≥95 gate)

Plan v23 is a tightly-specified execution runbook that converts Audit v37's two standing,
environment-gated Next Steps (native `xcodebuild test` never run; committed `CI` workflow never
observed live) from *documented-as-blocked* into *proven-PASS-or-explicitly-pending*. Every
load-bearing factual claim was re-verified against the live tree and holds. It is
implementation-ready for any operator with the two required authorizations. The single genuine gap
is a process one: the plan defines no bounded terminal disposition if authorization is declined,
leaving the loop in an unbounded "pending" state.

## Issues resolved in revision 1

First review of v23 — no prior revision of this plan. (Plan v22, the previous cycle's artifact,
was a *docs-only* evidence-capture plan; v23 is a distinct execution plan and is critiqued fresh.)

## Ground-truth verification (all claims confirmed)

Every quantitative and environmental claim in the plan was checked against the repository:

1. **Native test inventory exact.** `native/CheckIn007Tests/` = exactly the six named suites
   (`CSVCodecTests`, `CameraPrivacyTests`, `CheckInStoreTests`, `GuestCatalogTests`,
   `LogMergerTests`, `ScanAudioPlayerTests`). `grep -c 'func test'` = 6+3+8+6+5+4 = **32** unit
   methods; `CheckIn007UITests.swift` = **4** UI tests. §6 Phase 1 step 5, §10, §14 all agree.
2. **CI workflow matches.** `.github/workflows/ci.yml` triggers on `push: branches: [main, master]`
   and `pull_request`; the `web` job's artifact step uploads `name: dist-index-html`,
   `path: dist/index.html`, `if-no-files-found: error`. §4.6 / §6 Phase 2 / §7.4 accurate.
3. **Environment §11 accurate.** `git remote -v` = none; branch = `master`; `node --version` =
   v26.3.0; `.nvmrc` = 24.20.0; `xcrun simctl list runtimes` = empty. All match §11 verbatim.
4. **Scripts match §5/§6.** `package.json` scripts confirm the guarded chain
   (`check-node-version.mjs && …`) and the direct-tool bypass commands the plan lists.
5. **Evidence-doc target coherent.** `docs/VERIFICATION_EVIDENCE.md` records Cycle-10 target
   `628a4be…` (Native + CI both `BLOCKED`), so §4.5's decision to mint a *new* Cycle-11 target
   rather than republish the ancestor is justified and consistent.
6. **Perf math checks out.** §9's "at most 121 queries" = 1800s/15s + 1 initial ✓; "36 methods
   total" = 32 unit + 4 UI ✓; artifact "about 71 KB" vs measured `dist/index.html` = 70,584 bytes ✓.

## Remaining issues

1. **No bounded disposition on declined authorization (primary gap).** §4.1 and §13 make operator
   approval of (a) `xcodebuild -downloadPlatform iOS` and (b) the exact GitHub `owner/repo` + push
   hard pre-implementation gates, and §14 states that absent approval "leaves Cycle 11 pending for a
   later authorized attempt." Given the audit history and the recorded environment
   (`native-ios-sdk-not-installed`; no Git remote across every prior cycle), a declined/absent
   approval is the *likely* branch, and the plan leaves the loop in an **unbounded pending State 2**
   with no exit. The plan should specify a terminal disposition for the refusal branch — e.g. "if
   either authorization is declined, this plan is *withdrawn* and the two gaps are re-classified as
   permanently environment-blocked Next Steps (not cycle-blocking), allowing the audit to reach a
   stable state" — so the project is never stuck implementing a plan that cannot be implemented.
   *Why it matters:* without it, an honest implementer who is refused authorization has no
   plan-sanctioned action except to wait indefinitely. (Non-blocking for the execution path; this is
   what holds the score below 98.)

2. **§4.6 vs §6 Phase 2 step 5 required-step list disagree.** §4.6 requires "every non-conditional
   web-gate step to succeed," but the Phase-2 step-5 enumeration (checkout, Node setup, install,
   lint, unit, browser install, e2e, build, artifact-upload) omits the non-conditional
   **"Cache Playwright browsers"** (`actions/cache@v4`) step present in `ci.yml`. The two lists
   should agree — either add the cache step to the enumeration or state that the §4.6 blanket rule
   governs and the enumeration is illustrative. *Why it matters:* a literal implementer following
   step 5 could accept a run where the cache step errored.

3. **Trigger event not pinned in Phase 2 selection.** The workflow fires on both `push` and
   `pull_request`. §6 Phase 2 step 4 selects by "matching repository, event, branch, and headSha"
   and §10 references the "expected event," but neither pins the event to **`push`** for the normal
   target-branch publication. Naming it removes any ambiguity if a `pull_request` run also shares
   the headSha. *Why it matters:* minor, but eliminates a same-SHA cross-event mis-join.

## Scope Check

- **Audit findings:** Audit v37 has **zero open Required Actions** (RA #1–#8 all DONE, none stalled).
  The only open items are two environment-gated **Next Steps**, and v23 targets **exactly** those
  two and only those. No in-scope finding is ignored.
- **Backlog:** `BACKLOG.md` has **0 unchecked `[ ]`** items (all `[x]`). Nothing in scope is skipped.
- **Integration points:** §7 specifies five integration contracts (git tree→evidence,
  Xcode→simulator, local git→GitHub, CI→artifact, evidence→readers) with failure/recovery for each.
  Cross-cutting concerns (branch protection, CI cancel-in-progress per ref, credential redaction) are
  addressed.
- **Alternatives considered:** §4.2 (platform download vs runtime-copy), §4.3 (UDID-addressed vs
  fixed marketing name), §4.5 (new target vs republish ancestor), §4.7 (existing tools vs wrapper),
  §13 (Node-24 host install vs audited direct path). Tradeoffs are stated.

**No score cap applies** — scope is exactly adequate for the phase.

## Flaws of Commission

1. Minor internal-consistency defect between §4.6 and §6 Phase 2 step 5 (see Remaining issue #2).
   No incorrect algorithm, wrong version, broken logic, or antipattern identified. The
   xcodebuild invocation, UDID-selection determinism, poll cadence, and triple byte/size/SHA-256
   parity check are all correct.

## Flaws of Omission

1. No bounded disposition on declined authorization (Remaining issue #1) — the significant omission.
2. Event not pinned to `push` in Phase-2 run selection (Remaining issue #3).
3. The artifact step's `if: always()` semantics are not discussed — the upload runs even after an
   earlier failure. This is *safe* in practice (a failed `build` leaves no `dist/index.html`, so
   `if-no-files-found: error` fails the upload and the gate catches it), but the plan never states
   this reasoning. Cosmetic.

## Regressions

No regressions identified. The manifest (§5) is docs-only — `IMPLEMENTATION_PLAN.md`,
`docs/VERIFICATION_EVIDENCE.md`, `README.md` — and §2 forbids product, test, Xcode-project,
workflow, dependency, lockfile, and `dist/` changes. `BLOCKED`→`PASS` flips happen only after success.
No test coverage shrinks; no API/config/contract changes.

## Why 96 and not 97

The execution path itself is 97–98-grade: exhaustive, source-accurate, well-bounded. The score is
held at 96 by the **process omission** (Remaining issue #1): a plan whose completion is entirely
contingent on external authorization must define what happens when that authorization is *not*
granted, so the loop cannot enter an unbounded pending state. The two consistency nits (#2, #3) are
minor. This is a solid, approvable plan — not an excellent one — because the most probable execution
branch (refusal, per all prior cycles) is the one left undefined.

## Path to ≥95

Already cleared (96). No blocking items.

## Path to 100

1. **Define the refusal disposition (issue #1).** Add to §4.1 / §13 / §14 a bounded terminal state:
   if either authorization is declined or infrastructure is unavailable, *withdraw* this plan and
   re-classify the two gaps as permanently environment-blocked (audit-closeable) rather than leaving
   Cycle 11 pending indefinitely. This is the single highest-value improvement.
2. **Reconcile the required-step lists (issue #2).** Make §6 Phase 2 step 5 enumerate the same set
   as §4.6, including the `actions/cache` "Cache Playwright browsers" step, or explicitly subordinate
   the enumeration to the "every non-conditional step" rule.
3. **Pin the run event to `push` (issue #3)** in Phase 2 step 4's selection predicate.
4. **State the `if: always()` artifact-upload reasoning (omission #3)** so a reader understands why
   an always-run upload is still a valid success gate.
5. **Micro-precision:** express the artifact size as the exact 70,584 bytes rather than "about 71 KB"
   in §9, matching the recorded evidence.

## Summary

Plan v23 is approval-grade (96/100): a precise, ground-truth-accurate, well-bounded execution runbook
that targets exactly the two open external-verification gaps with no scope gaps and no regressions.
It clears the ≥95 gate and becomes the contract for implementation. The loop advances **State 1 →
State 2 — implement approved plan v23**, with the hard understanding that implementation is gated on
two operator authorizations; if those are refused, the plan should be revised to add a bounded
withdrawal disposition (Path-to-100 #1) rather than being left pending indefinitely. Implementation
Score is **N/A** — nothing is built yet (no new Cycle-11 target commit, evidence still `BLOCKED`,
README not yet finalized, §14 boxes unchecked).

---

### Implementation Verification — v2

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` @ HEAD `8f285fc` audited on 2026-09-03

**Verdict: NOT STARTED.** No implementation of approved plan v23 exists. HEAD (`8f285fc`) is the
Rev-1 *critique* commit; the only commits after the plan landed (`d8a9949`) are documentation
(the critique + audit v38). No Cycle-11 target commit was minted, and the three manifest files are
untouched relative to their Cycle-10 state. This is not a defective implementation to be scored —
it is an **unstarted** one. Implementation Score is therefore **N/A**, and the cycle remains in
**State 2 (implement the approved plan)** — but see the disposition below: State 2 cannot be
advanced in the current environment.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **MISSING** | No approval obtained/recorded; no Cycle-11 evidence placeholder appended; no docs-only target commit minted. No Phase-0 preflight/inventory recorded. |
| §6 Phase 1 — Native iPad execution | **MISSING** | `xcodebuild -downloadPlatform iOS` not run; `xcrun simctl list runtimes` still empty (`native-ios-sdk-not-installed`); no `.xcresult`, no recorded counts/exit. |
| §6 Phase 2 — Exact-SHA CI execution | **MISSING** | `git remote -v` = none; no push; no `CI` run selected/observed; no `dist-index-html` artifact parity check. |
| §6 Phase 3 — Finalize evidence | **MISSING** | `docs/VERIFICATION_EVIDENCE.md` unchanged — Native `BLOCKED`, CI `BLOCKED` (Cycle-10 records; **no Cycle-11 section**, `grep -c "Cycle 11"` = 0). README status unchanged. |
| §5 File Manifest | **UNTOUCHED** | `IMPLEMENTATION_PLAN.md` / `docs/VERIFICATION_EVIDENCE.md` / `README.md` all at their Cycle-10 state; no diff. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`. Both blocking authorization gates (§13 Q1–Q2) unsatisfied. |

#### Blocking condition (why State 2 cannot advance here)

Plan v23 makes two operator authorizations **hard pre-implementation gates** (§4.1, §6 Phase 0.2–0.3,
§13 Q1–Q2): (a) `xcodebuild -downloadPlatform iOS`, and (b) an exact GitHub `owner/repo` + push route.
Neither is obtainable in this environment: no iOS runtime is installed (`native-ios-sdk-not-installed`;
`simctl list runtimes` empty), no Git remote exists across every prior cycle, and this is a
non-interactive session that cannot run an approval exchange. Per §14, absent approval "leaves Cycle 11
pending" — which is exactly the **unbounded pending State 2** the Rev-1 critique flagged as its primary
gap (Remaining issue #1 / Path-to-100 #1). No source edit is warranted (§2 forbids weakening the gates
or accepting `BLOCKED` as completion), and the base tree is verified unchanged (native inventory still
six suites / **32** methods / **4** UI, matching §6 Phase 1 step 5).

#### Directive (State 2 → State 1: revise the plan)

This is **not** a "fix your code" situation — there is no code to fix and the plan forbids fabricating a
pass. The single sanctioned action is to **revise plan v23 to add a bounded terminal disposition for
the declined/unavailable-authorization branch** (Path-to-100 #1): if either authorization is declined or
the infrastructure is unavailable, *withdraw* the plan and re-classify the two external gaps as
permanently environment-blocked, audit-closeable Next Steps — rather than leaving the loop implementing a
plan that cannot be implemented in this environment. Reconciling the §4.6 ↔ §6 Phase 2 step-5 required-step
list (Path-to-100 #2) and pinning the run event to `push` (Path-to-100 #3) can fold into the same revision.
Alternatively, if the operator *does* supply both exact authorizations, implement Phases 0–3 verbatim.

**Implementation Score:** N/A

---

### Implementation Verification — v3

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` @ HEAD `736fc85` audited on 2026-09-03

**Verdict: NOT STARTED (unchanged from v2).** No implementation of approved plan v23 exists, and
**nothing has changed since Implementation Verification v2.** HEAD is still `736fc85` — the audit-v39
commit; there are **zero new commits** since that audit. The re-verified tree is byte-for-byte identical
to what v2 audited:

- **No Cycle-11 target commit.** `docs/VERIFICATION_EVIDENCE.md` still carries only the Cycle-10 records
  (Local Web Gates `PASS`, Native `BLOCKED`, CI `BLOCKED`); `grep -c "Cycle 11" docs/VERIFICATION_EVIDENCE.md`
  = **0**. README status unchanged.
- **All 6 §14 completion boxes `[ ]`.** The three manifest files show no diff vs. their Cycle-10 state.
- **Both hard pre-implementation gates still unsatisfiable here.** `xcrun simctl list runtimes` = empty
  (`native-ios-sdk-not-installed`); `git remote -v` = none; this remains a non-interactive session that
  cannot run the two §13 Q1–Q2 authorization exchanges.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **MISSING** | No approval obtained/recorded; no Cycle-11 evidence placeholder; no docs-only target commit; no Phase-0 preflight/inventory. |
| §6 Phase 1 — Native iPad execution | **MISSING** | `xcodebuild -downloadPlatform iOS` not run; `simctl list runtimes` still empty; no `.xcresult`, no recorded counts/exit. |
| §6 Phase 2 — Exact-SHA CI execution | **MISSING** | `git remote -v` = none; no push; no `CI` run observed; no `dist-index-html` parity check. |
| §6 Phase 3 — Finalize evidence | **MISSING** | `docs/VERIFICATION_EVIDENCE.md` unchanged (Native `BLOCKED`, CI `BLOCKED`; no Cycle-11 section). README unchanged. |
| §5 File Manifest | **UNTOUCHED** | All three manifest files at Cycle-10 state; no diff. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`; both §13 Q1–Q2 authorization gates unsatisfied. |

#### Directive (unchanged — State 2 cannot advance here; revise the plan)

This remains a **not-yet-implemented, environment-blocked** cycle, not a defective one — there is no code
to fix, and §2 forbids fabricating a `PASS` or weakening the gates. Implementation Score stays **N/A**.
The single sanctioned lever is still to **revise plan v23 to add a bounded terminal disposition for the
declined/unavailable-authorization branch** (Rev-1 critique Path-to-100 #1): if either authorization is
declined or the infrastructure is unavailable, *withdraw* the plan and re-classify the two external gaps
as permanently environment-blocked, audit-closeable Next Steps — rather than leaving the loop implementing
a plan that cannot be implemented here. Fold in Path-to-100 #2 (§4.6 ↔ §6 Phase 2 step-5 required-step
reconciliation) and #3 (pin the CI run event to `push`) in the same revision. Alternatively, if the
operator supplies both exact authorizations, implement Phases 0–3 verbatim. A **third** consecutive idle
cycle has now elapsed with no work product; the inactivity decay has advanced to −3 (see Audit v40).

**Implementation Score:** N/A

---

### Implementation Verification — v5

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` @ HEAD `ab81250` audited on 2026-09-03

**Verdict: NOT STARTED (unchanged from v4).** No implementation of approved plan v23 exists, and
**nothing has changed since Implementation Verification v4.** HEAD is now `ab81250` — the audit-v41
commit — and `git log d8a9949..HEAD` contains **only doc/audit commits** (critique v38, audit v39/v40/v41);
`git diff d8a9949..HEAD` over the three manifest files is **empty**. The working tree is clean except
untracked `.DS_Store` files. The re-verified tree is byte-for-byte identical to what v2/v3/v4 audited:

- **No Cycle-11 target commit.** `docs/VERIFICATION_EVIDENCE.md` still carries only the Cycle-10 records
  (Local Web Gates `PASS`, Native `BLOCKED`, CI `BLOCKED`); `grep -c "Cycle 11" docs/VERIFICATION_EVIDENCE.md`
  = **0**. README status unchanged.
- **All 6 §14 completion boxes `[ ]`.** No diff over the three manifest files vs. their Cycle-10 state.
- **Both hard pre-implementation gates still unsatisfiable here.** `xcrun simctl list runtimes` = empty
  (`native-ios-sdk-not-installed`); `git remote -v` = none; this remains a non-interactive session that
  cannot run the two §13 Q1–Q2 authorization exchanges.
- **Base tree re-verified unchanged.** Native inventory still six suites / **32** methods (6+3+8+6+5+4) /
  **4** UI — matching §6 Phase 1 step 5. No regressions; backlog 0 unchecked / 15 `[x]`.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **MISSING** | No approval obtained/recorded; no Cycle-11 evidence placeholder; no docs-only target commit; no Phase-0 preflight/inventory. |
| §6 Phase 1 — Native iPad execution | **MISSING** | `xcodebuild -downloadPlatform iOS` not run; `simctl list runtimes` still empty; no `.xcresult`, no recorded counts/exit. |
| §6 Phase 2 — Exact-SHA CI execution | **MISSING** | `git remote -v` = none; no push; no `CI` run observed; no `dist-index-html` parity check. |
| §6 Phase 3 — Finalize evidence | **MISSING** | `docs/VERIFICATION_EVIDENCE.md` unchanged (Native `BLOCKED`, CI `BLOCKED`; no Cycle-11 section). README unchanged. |
| §5 File Manifest | **UNTOUCHED** | All three manifest files at Cycle-10 state; no diff. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`; both §13 Q1–Q2 authorization gates unsatisfied. |

#### Directive (unchanged — State 2 cannot advance here; revise the plan)

This remains a **not-yet-implemented, environment-blocked** cycle, not a defective one — there is no code
to fix, and §2 forbids fabricating a `PASS` or weakening the gates. Implementation Score stays **N/A**.
The single sanctioned lever is still to **revise plan v23 to add a bounded terminal disposition for the
declined/unavailable-authorization branch** (Rev-1 critique Path-to-100 #1): if either authorization is
declined or the infrastructure is unavailable, *withdraw* the plan and re-classify the two external gaps
as permanently environment-blocked, audit-closeable Next Steps — rather than leaving the loop implementing
a plan that cannot be implemented here. Fold in Path-to-100 #2 (§4.6 ↔ §6 Phase 2 step-5 required-step
reconciliation) and #3 (pin the CI run event to `push`) in the same revision. Alternatively, if the
operator supplies both exact authorizations, implement Phases 0–3 verbatim. A **fifth** consecutive idle
cycle has now elapsed with no work product; the inactivity decay has reached its **−5 cap** (see Audit
v42). The loop is demonstrably and terminally stuck on the refusal branch the Rev-1 critique predicted;
the withdrawal-disposition revision is the only escape that does not require external authorization, and
the decay cap means further idle audits can no longer lower the score — only a work product (revision or
implementation) will move it.

**Implementation Score:** N/A

---

### Implementation Verification — v4

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` @ HEAD `b056737` audited on 2026-09-03

**Verdict: NOT STARTED (unchanged from v3).** No implementation of approved plan v23 exists, and
**nothing has changed since Implementation Verification v3.** HEAD is now `b056737` — the audit-v40
commit — and there are **zero new commits touching any file** since that audit (working tree clean
except untracked `.DS_Store` files). The re-verified tree is byte-for-byte identical to what v2 and v3
audited:

- **No Cycle-11 target commit.** `docs/VERIFICATION_EVIDENCE.md` still carries only the Cycle-10 records
  (Local Web Gates `PASS`, Native `BLOCKED`, CI `BLOCKED`); `grep -c "Cycle 11" docs/VERIFICATION_EVIDENCE.md`
  = **0**. README status unchanged.
- **All 6 §14 completion boxes `[ ]`.** `git diff d8a9949..HEAD` over the three manifest files
  (`IMPLEMENTATION_PLAN.md`, `docs/VERIFICATION_EVIDENCE.md`, `README.md`) is **empty** — no diff.
- **Both hard pre-implementation gates still unsatisfiable here.** `xcrun simctl list runtimes` = empty
  (`native-ios-sdk-not-installed`); `git remote -v` = none; this remains a non-interactive session that
  cannot run the two §13 Q1–Q2 authorization exchanges.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **MISSING** | No approval obtained/recorded; no Cycle-11 evidence placeholder; no docs-only target commit; no Phase-0 preflight/inventory. |
| §6 Phase 1 — Native iPad execution | **MISSING** | `xcodebuild -downloadPlatform iOS` not run; `simctl list runtimes` still empty; no `.xcresult`, no recorded counts/exit. |
| §6 Phase 2 — Exact-SHA CI execution | **MISSING** | `git remote -v` = none; no push; no `CI` run observed; no `dist-index-html` parity check. |
| §6 Phase 3 — Finalize evidence | **MISSING** | `docs/VERIFICATION_EVIDENCE.md` unchanged (Native `BLOCKED`, CI `BLOCKED`; no Cycle-11 section). README unchanged. |
| §5 File Manifest | **UNTOUCHED** | All three manifest files at Cycle-10 state; no diff. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`; both §13 Q1–Q2 authorization gates unsatisfied. |

#### Directive (unchanged — State 2 cannot advance here; revise the plan)

This remains a **not-yet-implemented, environment-blocked** cycle, not a defective one — there is no code
to fix, and §2 forbids fabricating a `PASS` or weakening the gates. Implementation Score stays **N/A**.
The single sanctioned lever is still to **revise plan v23 to add a bounded terminal disposition for the
declined/unavailable-authorization branch** (Rev-1 critique Path-to-100 #1): if either authorization is
declined or the infrastructure is unavailable, *withdraw* the plan and re-classify the two external gaps
as permanently environment-blocked, audit-closeable Next Steps — rather than leaving the loop implementing
a plan that cannot be implemented here. Fold in Path-to-100 #2 (§4.6 ↔ §6 Phase 2 step-5 required-step
reconciliation) and #3 (pin the CI run event to `push`) in the same revision. Alternatively, if the
operator supplies both exact authorizations, implement Phases 0–3 verbatim. A **fourth** consecutive idle
cycle has now elapsed with no work product; the inactivity decay has advanced to −4 (see Audit v41). The
loop is demonstrably stuck; the withdrawal-disposition revision is the only escape that does not require
external authorization.

**Implementation Score:** N/A

---

### Implementation Verification — v6

**Plan:** `IMPLEMENTATION_PLAN.md` v23 @ commit `d8a9949` (approved Cycle 11 Rev 1 = 96/100)
**Code:** `master` @ HEAD `8872b2c` audited on 2026-09-03

**Verdict: NOT STARTED (unchanged from v5).** No implementation of approved plan v23 exists, and
**nothing has changed since Implementation Verification v5.** HEAD is now `8872b2c` — the audit-v42
commit — and `git log d8a9949..HEAD` contains **only doc/audit commits** (critique v38, audits
v39/v40/v41/v42); `git diff --stat d8a9949..HEAD` over the three manifest files
(`IMPLEMENTATION_PLAN.md`, `docs/VERIFICATION_EVIDENCE.md`, `README.md`) is **empty**. The working
tree is clean except untracked `.DS_Store` files. The re-verified tree is byte-for-byte identical to
what v2–v5 audited:

- **No Cycle-11 target commit.** `docs/VERIFICATION_EVIDENCE.md` still carries only the Cycle-10
  records (Local Web Gates `PASS`, Native `BLOCKED`, CI `BLOCKED`);
  `grep -c "Cycle 11" docs/VERIFICATION_EVIDENCE.md` = **0**. README status unchanged.
- **All 6 §14 completion boxes `[ ]`** (`grep -c "^- \[ \]" IMPLEMENTATION_PLAN.md` = 6). No diff over
  the three manifest files vs. their Cycle-10 state.
- **Both hard pre-implementation gates still unsatisfiable here.** `xcrun simctl list runtimes` shows
  no iOS runtime (`native-ios-sdk-not-installed`); `git remote -v` = none; this remains a
  non-interactive session that cannot run the two §13 Q1–Q2 authorization exchanges.
- **Base tree re-verified unchanged.** Native inventory still six suites / **32** methods
  (6+6+8+3+5+4) / **4** UI — matching §6 Phase 1 step 5. No regressions; backlog 0 unchecked / 15 `[x]`.

#### Section-by-section compliance (approved plan v23 §6)

| Section | Status | Notes |
|---------|--------|-------|
| §6 Phase 0 — Authorization, local gates, target | **MISSING** | No approval obtained/recorded; no Cycle-11 evidence placeholder; no docs-only target commit; no Phase-0 preflight/inventory. |
| §6 Phase 1 — Native iPad execution | **MISSING** | `xcodebuild -downloadPlatform iOS` not run; `simctl list runtimes` still empty; no `.xcresult`, no recorded counts/exit. |
| §6 Phase 2 — Exact-SHA CI execution | **MISSING** | `git remote -v` = none; no push; no `CI` run observed; no `dist-index-html` parity check. |
| §6 Phase 3 — Finalize evidence | **MISSING** | `docs/VERIFICATION_EVIDENCE.md` unchanged (Native `BLOCKED`, CI `BLOCKED`; no Cycle-11 section). README unchanged. |
| §5 File Manifest | **UNTOUCHED** | All three manifest files at Cycle-10 state; no diff. |
| §14 Completion Checklist | **0 / 6 checked** | Every box `[ ]`; both §13 Q1–Q2 authorization gates unsatisfied. |

#### Directive (unchanged — State 2 cannot advance here; revise the plan)

This remains a **not-yet-implemented, environment-blocked** cycle, not a defective one — there is no
code to fix, and §2 forbids fabricating a `PASS` or weakening the gates. Implementation Score stays
**N/A**. The single sanctioned lever is still to **revise plan v23 to add a bounded terminal
disposition for the declined/unavailable-authorization branch** (Rev-1 critique Path-to-100 #1): if
either authorization is declined or the infrastructure is unavailable, *withdraw* the plan and
re-classify the two external gaps as permanently environment-blocked, audit-closeable Next Steps —
rather than leaving the loop implementing a plan that cannot be implemented here. Fold in Path-to-100
#2 (§4.6 ↔ §6 Phase 2 step-5 required-step reconciliation) and #3 (pin the CI run event to `push`) in
the same revision. Alternatively, if the operator supplies both exact authorizations, implement
Phases 0–3 verbatim. A **sixth** consecutive idle cycle has now elapsed with no work product; the
inactivity decay remains at its **−5 cap** (see Audit v43) — further idle audits can no longer lower
the score, so only a work product (revision or implementation) will move it. The loop is terminally
stuck on the refusal branch the Rev-1 critique predicted; the withdrawal-disposition revision is the
only escape that does not require external authorization.

**Implementation Score:** N/A
