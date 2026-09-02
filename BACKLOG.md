# Backlog — Check-In 007

Improvement opportunities beyond the current plan's scope. Unchecked items reduce the audit
score (1 point per 2 unchecked). Defects live in `CONSOLIDATED_AUDIT.md`, not here.

## Deferred Features
- [x] Roster windowing/virtualization for lists >500 rows (§2, §5 Phase 2 threshold) — done in `21e06f3`: pure `src/lib/virtual-list.mjs` window math + `roster.mjs` virtual rendering; Implementation Verification v3 = 97/100 VERIFIED (22 unit + 9 e2e green)
- [/] Multi-device check-in log consolidation / merge tooling (§9)
- [ ] Optional subtle scan "blip" audio on identification, gated on a user-gesture unlock (§10 Q6)
- [ ] Native SwiftUI iPad build as a maximum-fidelity alternative (§10 Q1)
- [ ] On-device static-HTTPS helper so the live camera works on a fully offline iPad (§10 Q2)

## Polish & Technical Debt
- [x] Add a lint/format check (e.g. `prettier --check`) to `package.json` scripts and Phase 0 acceptance (done in `07ef178`: `npm run lint` + `.prettierrc.json`; `prettier --check .` clean)
- [x] Font subsetting (Latin + needed glyphs) and a stated single-file artifact size budget (done: `scripts/font-subset.sh` subsets to Latin ranges; `build.mjs` enforces ≤750 KB gzip / ≤1.2 MB; artifact is 20,683 gzip bytes)
- [ ] Optional toolchain bump to Node 24 LTS for a longer support runway (§4.1a)
- [x] Add both `apple-mobile-web-app-capable` and the modern `mobile-web-app-capable` meta tags (done: present in `index.html` and built `dist/index.html`)
- [x] axe-core accessibility pass wired into the e2e suite (done: `tests/e2e/checkin.spec.mjs` runs `axe.run` and asserts zero serious/critical)

## Documentation
- [x] Resolve/hard-default the six §10 open questions inline so the plan is fully self-contained (done in plan v2 — §10 "Defaults & Revisit Triggers")
- [x] Redraw the §3.1 state-machine diagram so ADMIN's entry/exit edges are unambiguous (done in plan v2; a cosmetic top-border box remains — see critique Rev 6 nit #3)

## Notes
The four Polish items above (lint gate, font subsetting/budget, dual meta tags, axe-core e2e)
were **implemented and verified** at implementation-audit v8 (commit `07ef178`) and are marked
done. The implementation defects D1–D6 (privacy-spy/orientation/export/leak/reduced-motion e2e
and the §4.1 magic-number nit) that were tracked in `CONSOLIDATED_AUDIT.md` Required Actions
#5–#8 are now **all resolved** in commit `75c8279` — Implementation Verification v2 = 96/100
**VERIFIED** (audit v9). No open defects remain.

Cycle 2 is **complete**: `IMPLEMENTATION_PLAN.md` v5 ("Roster windowing/virtualization") was
implemented in commit `21e06f3` and passed **Implementation Verification v3 = 97/100 — VERIFIED**
(see `IMPLEMENTATION_PLAN_CRITIQUE.md`). The roster-windowing item is now `[x]`.

**Cycle 3 is open** (State 2 — implement the approved plan): the "Multi-device check-in log
consolidation / merge tooling" item is `[/]` (in progress). `IMPLEMENTATION_PLAN.md` v7 targets it
and is **APPROVED at 97/100** (Plan Critique Rev 2) — all three Rev-1 blockers (build `modules`-order
dependency on `csv.mjs`, CSV parse-throw error path, cross-device timestamp ordering) and all five
Path-to-100 nits resolved. The item moves to `[x]` only after the implementation lands and passes
Implementation Verification (≥95).

Four items remain strictly not-done here (`[ ]`), for a backlog deduction of −2 (1 pt per 2, round
down); the merge item is `[/]` and not counted as unchecked. The remaining levers are the three
other deferred features (scan audio, native SwiftUI, offline-HTTPS helper) plus the optional Node 24
toolchain bump — each a separate subsystem and a candidate for a future planning cycle.
