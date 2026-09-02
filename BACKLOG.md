# Backlog — Check-In 007

Improvement opportunities beyond the current plan's scope. Unchecked items reduce the audit
score (1 point per 2 unchecked). Defects live in `CONSOLIDATED_AUDIT.md`, not here.

## Deferred Features
- [ ] Roster windowing/virtualization for lists >500 rows (§2, §5 Phase 2 threshold)
- [ ] Multi-device check-in log consolidation / merge tooling (§9)
- [ ] Optional subtle scan "blip" audio on identification, gated on a user-gesture unlock (§10 Q6)
- [ ] Native SwiftUI iPad build as a maximum-fidelity alternative (§10 Q1)
- [ ] On-device static-HTTPS helper so the live camera works on a fully offline iPad (§10 Q2)

## Polish & Technical Debt
- [ ] Add a lint/format check (e.g. `prettier --check`) to `package.json` scripts and Phase 0 acceptance
- [ ] Font subsetting (Latin + needed glyphs) and a stated single-file artifact size budget
- [ ] Optional toolchain bump to Node 24 LTS for a longer support runway (§4.1a)
- [ ] Add both `apple-mobile-web-app-capable` and the modern `mobile-web-app-capable` meta tags
- [ ] axe-core accessibility pass wired into the e2e suite

## Documentation
- [x] Resolve/hard-default the six §10 open questions inline so the plan is fully self-contained (done in plan v2 — §10 "Defaults & Revisit Triggers")
- [x] Redraw the §3.1 state-machine diagram so ADMIN's entry/exit edges are unambiguous (done in plan v2; a cosmetic top-border box remains — see critique Rev 6 nit #3)

## Notes
The four Polish items above (lint gate, font subsetting/budget, dual meta tags, axe-core
e2e) are **planned** in the approved plan (Phases 0/6/7) and further hardened in v3 (font
subsetting is now pinned to `fonttools==4.64.0` via `scripts/font-subset.sh`). They remain
unchecked until implemented **in code** and will be marked done at implementation-audit time.
No backlog item was completed in the v3 cycle — it was a plan-only revision.
