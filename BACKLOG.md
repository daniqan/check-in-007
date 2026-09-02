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
- [ ] Resolve/hard-default the six §10 open questions inline so the plan is fully self-contained
- [ ] Redraw the §3.1 state-machine diagram so ADMIN's entry/exit edges are unambiguous
