# Backlog — Check-In 007

Improvement opportunities beyond the current plan's scope. Unchecked items reduce the audit
score (1 point per 2 unchecked). Defects live in `CONSOLIDATED_AUDIT.md`, not here.

## Deferred Features
- [x] Roster windowing/virtualization for lists >500 rows (§2, §5 Phase 2 threshold) — done in `21e06f3`: pure `src/lib/virtual-list.mjs` window math + `roster.mjs` virtual rendering; Implementation Verification v3 = 97/100 VERIFIED (22 unit + 9 e2e green)
- [x] Multi-device check-in log consolidation / merge tooling (§9) — done in `3168a28`: pure `src/lib/log-merge.mjs` (parse/normalize/dedupe/sort) + `store.mjs` preview/merge APIs + admin Merge-Logs UI; Implementation Verification v4 = 98/100 VERIFIED (38 unit + 10 e2e green)
- [x] Optional subtle scan "blip" audio on identification, gated on a user-gesture unlock (§10 Q6) — done in `b63a8ff`: pure `src/lib/audio.mjs` (factory-based availability, gesture unlock, per-cue oscillator/gain with exact §4.3 automation, guarded non-awaited playback resume, `dispose()`) + `store.mjs` audio-settings persistence + admin opt-in checkbox; Implementation Verification v5 = 98/100 VERIFIED (52 unit + 12 e2e green, default-off, privacy test-enforced)
- [ ] Native SwiftUI iPad build as a maximum-fidelity alternative (§10 Q1)
- [ ] On-device static-HTTPS helper so the live camera works on a fully offline iPad (§10 Q2)

## Polish & Technical Debt
- [x] Add a lint/format check (e.g. `prettier --check`) to `package.json` scripts and Phase 0 acceptance (done in `07ef178`: `npm run lint` + `.prettierrc.json`; `prettier --check .` clean)
- [x] Font subsetting (Latin + needed glyphs) and a stated single-file artifact size budget (done: `scripts/font-subset.sh` subsets to Latin ranges; `build.mjs` enforces ≤750 KB gzip / ≤1.2 MB; artifact is 20,683 gzip bytes)
- [/] Optional toolchain bump to Node 24 LTS for a longer support runway (§4.1a)
- [ ] Add a CI workflow (e.g. GitHub Actions) running `npm ci` + `npm run lint`/`test`/`build` on the pinned Node 24 line, with Playwright browser install/cache — explicitly deferred by plan v14 §4.6/§13 (no `.github/` exists today; secrets/runner/cache policy is a separate operational decision)
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

**Cycle 3 is complete** (State 4 — cycle complete): the "Multi-device check-in log consolidation /
merge tooling" item is now `[x]`. `IMPLEMENTATION_PLAN.md` v7 (APPROVED at 97/100, Plan Critique
Rev 2) was implemented in commit `3168a28` and passed **Implementation Verification v4 = 98/100 —
VERIFIED** (see `IMPLEMENTATION_PLAN_CRITIQUE.md`): all four phases COMPLIANT, proven by execution
(lint clean, 38 unit + 10 e2e green, build 24,660 gzip bytes within budget, artifact module order
`csv`→`log-merge`→`store` verified). No regressions.

Three items remain strictly not-done here (`[ ]`) while scan audio is in progress (`[/]`), for a
backlog deduction of −1 (1 pt per 2 unchecked, round down): native SwiftUI, offline-HTTPS helper,
and the optional Node 24 toolchain bump each remain separate subsystems and candidates for future
planning cycles.

**Cycle 4 is complete** (State 4 — cycle complete): the "Optional subtle scan blip audio" item is
now `[x]`. `IMPLEMENTATION_PLAN.md` v11 (APPROVED at 99/100, Plan Critique Rev 4) was implemented in
commit `b63a8ff` (13 files) and passed **Implementation Verification v5 = 98/100 — VERIFIED** (see
`IMPLEMENTATION_PLAN_CRITIQUE.md`): every plan section COMPLIANT, proven by execution — lint clean,
**52 unit + 12 e2e** green, build 26,315 gzip bytes within budget, module order
`src_config`→`src_lib_audio`→`src_app` verified, exact §4.3 automation unit-asserted, camera
privacy preserved and test-enforced. The last Path-to-100 nit (repeated-unlock idempotency unit
assertion) was folded into `tests/unit/audio.test.mjs` as recommended. No regressions. Code landed →
inactivity decay resets to 0.

**Cycle 5 is open** (State 2 — implement the approved plan): the "Optional toolchain bump to Node 24
LTS" item is in progress (`[/]`). `IMPLEMENTATION_PLAN.md` was revised v13 → v14 and re-critiqued at
**98/100 — APPROVED** (Plan Critique Cycle 5 Rev 3). v14 resolved the Rev-2 gate-blocker by swapping
the executable-tail idiom to the version-agnostic `import.meta.url === pathToFileURL(process.argv[1]).href`
(runs on every Node major, so the guard fails **closed** on Node 20/22/23 as its acceptance criteria
require) and folded in the Path-to-100 child-process smoke test that exercises the tail. Two trivial
Path-to-100 nits remain (realpath-asymmetry caveat in §4.5; cwd-relative smoke-test spawn), neither
blocking. **Next action: implement plan v14** — landing the code (`.nvmrc`/`.node-version`, tightened
engines, the guard, script wiring, README, unit tests) closes this item (`[/]` → `[x]`), recovers the
−1 backlog deduction, and resets the accruing inactivity decay (now −3). See
`IMPLEMENTATION_PLAN_CRITIQUE.md` Cycle 5 Rev 3 and `CONSOLIDATED_AUDIT.md` v23.

With Node 24 now `[/]`, three items remain strictly not-done here (`[ ]`) — native SwiftUI iPad build,
the on-device static-HTTPS helper, and the newly-added CI-workflow item — for a backlog deduction of
−1 (3 unchecked, 1 pt per 2, round down). Each is a separate subsystem and a candidate for a future
planning cycle.

**Audit v24 (no change since v23):** Plan v14 (Node 24 LTS toolchain) remains APPROVED at 98/100 and
is unchanged, but the approved plan has **not been implemented** — `.nvmrc`, `.node-version`,
`scripts/check-node-version.mjs`, and `tests/unit/node-version.test.mjs` are all still absent and
`package.json` is still `engines.node ">=22"`. The shipped cycle-1–4 system stays healthy (52/52 unit,
prettier clean on Node v26.3.0). This is the **fourth consecutive idle cycle** of cycle 5 (inactivity
decay −4, cap −5). Implementing plan v14 flips Node 24 `[/]` → `[x]`, recovers the backlog deduction,
and resets the decay. See `CONSOLIDATED_AUDIT.md` v24.
