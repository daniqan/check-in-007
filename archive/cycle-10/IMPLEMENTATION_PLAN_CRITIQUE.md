# Implementation Plan Critique — Check-In 007

> **Note (restored v56):** The `acaeeb1` "Archive cycle 9" commit left this file empty (0 bytes);
> the full Cycle-9-and-earlier critique history is preserved in
> `archive/cycle-9/IMPLEMENTATION_PLAN_CRITIQUE.md`. This file is reconstructed with the current
> plan's approval record and implementation verification. See `CONSOLIDATED_AUDIT.md` finding F-15.

## Current status

- **Plan Under Review:** `IMPLEMENTATION_PLAN.md` v27 (Cycle 14 — "Cycle-13 Evidence and Plan-Consistency Closure")
- **Plan Score:** **97 / 100 — APPROVED** (≥95 gate cleared)
- **Implementation Score:** **98 / 100 — VERIFIED** (Implementation Verification v18)
- **Cycle 14 state:** State 4 — COMPLETE.
- **⚠ New work identified (does NOT change the v27 scores):** a HIGH-severity iPad roster
  touch-scroll defect (audit RA #14 / F-14) has been reported and verified against source. It is
  **out of scope for plan v27** (doc-only). A **NEW plan (Cycle 15)** must be drafted to fix it —
  see "Next cycle" below.

---

## Plan v27 Critique (Cycle 14 Rev 1) — APPROVED 97/100

**Reviewed:** `IMPLEMENTATION_PLAN.md` v27 @ `53a9c48`
**Score:** **97 / 100** — **APPROVED**

Plan v27 is a tightly-scoped, documentation-only cycle that closes the two Audit-v53 backlog
follow-ups: (1) back-port the already-shipped `sheet.swipeUp()` lazy-`Form` navigation into the
authoritative plan contract, and (2) durably prove the Cycle-13 roster hit-region diagnosis by
reproducing the pre-fix failure at exact commit `50b4357` in an isolated detached worktree, with
sanitized evidence. §2 forbids any change under `native/`, `src/`, `tests/`, `scripts/`, `.github/`,
`package.json`, or `dist/`; §5 limits the tracked diff to exactly `IMPLEMENTATION_PLAN.md` +
`docs/VERIFICATION_EVIDENCE.md`. Architecture (§3), integration contracts (§7), error/edge handling
(§8), and a fail-closed decision gate (§13) are all specified concretely.

**Flaws of commission:** none identified — the plan changes no runtime behavior.
**Flaws of omission:** none blocking — the evidence workflow is fail-closed (missing/contradictory
capture leaves completion unchecked; no inference substituted).
**Regressions:** none — code tree is byte-identical to the reproduced 37/37 native + 78/13 web result.

**Why 97 and not higher:** the −3 is the intrinsic external CI verification gap (RA #10 — the
deployment path cannot be confirmed end-to-end while GitHub billing is locked), which no doc-only
cycle can close.

---

## Implementation Verification — v18

**Plan:** `IMPLEMENTATION_PLAN.md` v27 @ `53a9c48` (approved 97/100)
**Code:** HEAD `7e02de5` ("docs(§6): close Cycle 14 evidence gaps"), audited 2026-09-03

| Section | Status | Notes |
|---------|--------|-------|
| §5 manifest (exact 2 files) | COMPLIANT | `git show --stat 7e02de5` = `IMPLEMENTATION_PLAN.md` + `docs/VERIFICATION_EVIDENCE.md` only; `git diff --name-only 53a9c48..HEAD -- native/ src/ tests/ scripts/ .github/ package.json` empty. |
| §4.3/§7.3 swipeUp back-port | COMPLIANT | Lazy-`Form` navigation contract now stated in the plan + evidence "REQUIRED CONTRACT"; byte-accurate to shipped `CheckIn007UITests.swift:106`; no assertion weakened. |
| §4.1/§4.2 pre-fix reproduction | COMPLIANT | Reproduced at `50b4357` (exit 65 at missing `scan.status`); complete 12,831-byte attachment machine-checked to roster.row=12 / scan.status=0; sanitized excerpt; temp artifacts deleted. |
| §4.4 historical vs current | COMPLIANT | Evidence labels the `50b4357` run EXPECTED FAIL and current-tree runs PASS (37/37 native, 78/13 web); CI kept `BLOCKED (external billing)`. |

**Implementation Score:** **98 / 100 — VERIFIED.** Only reason not 100: the pre-fix artifact
metrics were not independently *re-run* by the discriminator this cycle (byte-identical tree, prior
reproduction stands). Non-blocking.

---

## Next cycle (Cycle 15) — NOT YET DRAFTED

A NEW plan is required for **RA #14 (P0 / HIGH): the iPad roster does not reliably touch-scroll on
iPadOS Safari/standalone.** This is the primary kiosk device's main screen and is currently the
top project priority. The plan must:

1. **Fix one variable at a time** and **verify on a real iPad / iOS Simulator** — the defect is
   invisible to headless Chromium and desktop WebKit (both scroll fine), so any "fixed" claim from
   desktop/CI evidence alone is invalid. See `docs/IPAD_SCROLL_BUG.md`.
2. Target the verified root cause: `.roster-list` (`src/styles.css:164`) is a descendant of the
   `position:fixed`, `transform`-animated `.screen`/`.roster-screen` (`src/styles.css:55`, `:148`),
   whose entrance transform re-runs on every mount (`src/app.mjs:43-44`). A transformed fixed
   ancestor breaks iOS `-webkit-overflow-scrolling` momentum init at first paint.
3. Leading candidate: remove the transform from the roster's ancestor permanently (fade-only
   entrance, `transform:none` at rest AND during entrance) and change nothing else. Fallbacks:
   move the entrance transform to a non-ancestor inner wrapper; let the roster scroll the document
   natively (drop `position:fixed` stacking for the roster); or promote `.roster-list` to its own
   layer (`translateZ(0)`/`will-change`). Do NOT repeat the already-tried multi-change bundle
   (fade+block+kick+touch-action) — it regressed to "no scroll at all."
4. Preserve the single-file `dist/index.html` build, the other screens' entrance animation, the web
   test/lint gates, the 40-guest sample, and the ≥500 virtualization path.

Until this plan is drafted, scored ≥95, and implemented+verified ≥95, the cycle is **not** complete
despite the v27 numbers above. See `CONSOLIDATED_AUDIT.md` v56.
