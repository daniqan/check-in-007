# Backlog — Check-In 007

Improvement opportunities beyond the current plan's scope. Unchecked items reduce the audit
score (1 point per 2 unchecked). Defects live in `CONSOLIDATED_AUDIT.md`, not here.

## Deferred Features
- [x] Roster windowing/virtualization for lists >500 rows (§2, §5 Phase 2 threshold) — done in `21e06f3`: pure `src/lib/virtual-list.mjs` window math + `roster.mjs` virtual rendering; Implementation Verification v3 = 97/100 VERIFIED (22 unit + 9 e2e green)
- [x] Multi-device check-in log consolidation / merge tooling (§9) — done in `3168a28`: pure `src/lib/log-merge.mjs` (parse/normalize/dedupe/sort) + `store.mjs` preview/merge APIs + admin Merge-Logs UI; Implementation Verification v4 = 98/100 VERIFIED (38 unit + 10 e2e green)
- [x] Optional subtle scan "blip" audio on identification, gated on a user-gesture unlock (§10 Q6) — done in `b63a8ff`: pure `src/lib/audio.mjs` (factory-based availability, gesture unlock, per-cue oscillator/gain with exact §4.3 automation, guarded non-awaited playback resume, `dispose()`) + `store.mjs` audio-settings persistence + admin opt-in checkbox; Implementation Verification v5 = 98/100 VERIFIED (52 unit + 12 e2e green, default-off, privacy test-enforced)
- [x] Native SwiftUI iPad build as a maximum-fidelity alternative (§10 Q1) — done in `0e72fc8`: `native/` (27 Swift files + Xcode project, 3 targets + shared scheme) mirroring the web contracts (SearchNormalizer/GuestCatalog/CSVCodec/LogMerger/CheckInStore, storage keys `checkin007.*`, CSV `visitId,guestId,name,table,timestamp`, Timing byte-matching `config.mjs`, preview-only camera, default-off scan cue matching `config.mjs` AUDIO) + `scripts/export-native-guests.mjs` + byte-compare parity test; Implementation Verification v6 = 96/100 VERIFIED (web gates green: 57/57 unit, prettier clean, build 26315 gzip bytes, parity 5/5). Native `xcodebuild … test` unrun — no iPadOS runtime installed (§11-documented); `xcodebuild -list` resolves all 3 targets + scheme.
- [/] On-device static-HTTPS helper so the live camera works on a fully offline iPad (§10 Q2)

## Polish & Technical Debt
- [x] Add a lint/format check (e.g. `prettier --check`) to `package.json` scripts and Phase 0 acceptance (done in `07ef178`: `npm run lint` + `.prettierrc.json`; `prettier --check .` clean)
- [x] Font subsetting (Latin + needed glyphs) and a stated single-file artifact size budget (done: `scripts/font-subset.sh` subsets to Latin ranges; `build.mjs` enforces ≤750 KB gzip / ≤1.2 MB; artifact is 20,683 gzip bytes)
- [x] Optional toolchain bump to Node 24 LTS for a longer support runway (§4.1a) — done in `61c456b`: `.nvmrc`/`.node-version` pin `24.20.0`, `engines` `>=24 <25` (package.json + lockfile root), dependency-free `scripts/check-node-version.mjs` guard (pathToFileURL executable tail, fails closed on non-24) wired into `lint`/`test`/`build` + standalone `check:node`, README Node 24 setup path, `tests/unit/node-version.test.mjs` (6 tests incl. child-process smoke). Implementation Verification v7 = 97/100 VERIFIED.
- [x] Add a CI workflow (e.g. GitHub Actions) running `npm ci` + `npm run lint`/`test`/`build` on the pinned Node 24 line, with Playwright browser install/cache — done in `61c456b`: `.github/workflows/ci.yml` (ubuntu-latest, Node 24 via `setup-node@v4` `node-version-file: .nvmrc`, npm cache + `~/.cache/ms-playwright` cache keyed on the lockfile, `npx playwright install --with-deps chromium`, least-privilege `permissions: contents: read`, `cancel-in-progress` concurrency, dist artifact upload). Coupled to the Node 24 pin. Implementation Verification v7 = 97/100 VERIFIED. First live CI run lands on first push (§10, the definitive parse check).
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

As of Cycle 6, native SwiftUI is `[/]` (in progress) and three items remain strictly not-done
(`[ ]`) — the on-device static-HTTPS helper, the CI-workflow item, and the Node 24 toolchain bump
(returned to `[ ]` after its approved plan v14 was abandoned unimplemented) — for a backlog deduction
of −1 (3 unchecked, 1 pt per 2, round down). Each is a separate subsystem and a candidate for a future
planning cycle. (This paragraph superseded by the Cycle 6 note below.)

**Audit v24 (no change since v23):** Plan v14 (Node 24 LTS toolchain) remains APPROVED at 98/100 and
is unchanged, but the approved plan has **not been implemented** — `.nvmrc`, `.node-version`,
`scripts/check-node-version.mjs`, and `tests/unit/node-version.test.mjs` are all still absent and
`package.json` is still `engines.node ">=22"`. The shipped cycle-1–4 system stays healthy (52/52 unit,
prettier clean on Node v26.3.0). This is the **fourth consecutive idle cycle** of cycle 5 (inactivity
decay −4, cap −5). Implementing plan v14 flips Node 24 `[/]` → `[x]`, recovers the backlog deduction,
and resets the decay. See `CONSOLIDATED_AUDIT.md` v24.

**Cycle 6 is open** (State 1 — revise the plan): the approved-but-never-implemented Cycle-5 Node-24
plan was **abandoned**, and `IMPLEMENTATION_PLAN.md` was replaced v14 → v15 with a new plan for the
**"Native SwiftUI iPad build"** item, now in progress (`[/]`); the Node-24 item is returned to `[ ]`
(its approved plan v14 is preserved in git `ff40b18`). **Plan v15 was critiqued at 91/100 — NOT
APPROVED** (Cycle 6 Rev 1). It is strong and source-grounded (roster name/count, `slugify`/
`normalizeGuests`, storage keys, CSV columns, and `visitId` idempotency all verified; Xcode 26.4 is
installed) but held below the ≥95 gate by four mechanically-fixable items: (1) no verification path
when **no iPad simulator runtime is installed** (`xcrun simctl list runtimes` is empty) — the entire
gate is `xcodebuild … test` on a simulator; (2) `npm run lint` (`prettier --check .`) will check the
generated `native/**/*.json`, which `.prettierignore` does not exclude and the plan does not
guarantee Prettier-clean; (3) `extractDefaultGuests` requires `id` on rows that only carry
`{ name, table }`; (4) the hand-committed multi-target `.pbxproj` production method is unspecified.
**Next action: revise plan v15 to ≥95, then implement it** — landing native code is also the only
thing that resets the inactivity decay (now at the −5 cap, fifth idle cycle). Strict-unchecked `[ ]`
= 3 (offline-HTTPS helper, CI workflow, Node 24) → backlog −1. See `IMPLEMENTATION_PLAN_CRITIQUE.md`
Cycle 6 Rev 1 and `CONSOLIDATED_AUDIT.md` v25.

**Cycle 6 plan APPROVED (Rev 2, audit v26):** `IMPLEMENTATION_PLAN.md` was revised v15 → v16 (commit
`bd9dc4b`) and re-critiqued at **97/100 — APPROVED** (Cycle 6 Rev 2). v16 resolved all four Rev-1
gate items (simulator-runtime verifiability, prettier/lint on `native/`, the `extractDefaultGuests`
`id` contract, the Xcode-generated `.pbxproj`) and all three Rev-1 Path-to-100 items (timing enum
byte-matching `config.mjs`, byte-compare parity test, iPadOS 26.0 min-target + device confirmation),
each re-verified against source. The native SwiftUI item stays `[/]` (in progress) — **the plan is
approved but NOT yet implemented** (`native/` does not exist, `scripts/export-native-guests.mjs` is
absent). **Next action: implement approved plan v16** — landing the native tree flips native SwiftUI
`[/]` → `[x]` and is the only thing that resets the inactivity decay (pinned at the −5 cap, sixth
idle cycle). Strict-unchecked `[ ]` = 3 (offline-HTTPS helper, CI workflow, Node 24) → backlog −1.
One Path-to-100 nit worth carrying into implementation: quantify the scan cue (`config.mjs:15-20`:
gain 0.045, 880→1320 Hz, 90 ms, 0.035 s release) so `ScanAudioPlayerTests` can assert cue parity like
the timing constants. See `IMPLEMENTATION_PLAN_CRITIQUE.md` Cycle 6 Rev 2 and `CONSOLIDATED_AUDIT.md`
v26.

**Cycle 6 is complete** (State 4 — cycle complete): the "Native SwiftUI iPad build" item is
now `[x]`. `IMPLEMENTATION_PLAN.md` v16 (APPROVED at 97/100, Plan Critique Cycle 6 Rev 2) was
implemented in commit `0e72fc8` (27 Swift files + Xcode project + web export tooling) and passed
**Implementation Verification v6 = 96/100 — VERIFIED** (see `IMPLEMENTATION_PLAN_CRITIQUE.md`):
all five phases COMPLIANT, byte-exact where a web source of truth exists (Timing enum vs
`config.mjs`, scan-cue AUDIO constants, CSV columns, `checkin007.*` storage keys, roster
normalization). Web gates proven green on Node v26.3.0 — **57/57 unit** (+5 native parity),
`prettier --check .` clean, build **26315 gzip bytes** within budget, parity test 5/5 with a
byte-compare regeneration. The native `xcodebuild … test` gate was **not executed** — no iPadOS
26 simulator runtime is installed (`xcrun simctl list runtimes` empty, the §11-documented
starting state); `xcodebuild -list` resolves all 3 targets + the `CheckIn007` scheme, so native
correctness is source-verified, not execution-proven (the one reason the score is 96, not ≥98).
Code landed → inactivity decay resets to 0. Strict-unchecked `[ ]` = 3 (offline-HTTPS helper,
CI workflow, Node 24 toolchain bump), each a separate subsystem for a future cycle → backlog −1.
See `CONSOLIDATED_AUDIT.md` v27.

**Cycle 7 is open** (State 2 — implement the approved plan): the two coupled toolchain/infra
items — "Optional toolchain bump to Node 24 LTS" and "Add a CI workflow … on the pinned Node 24
line" — are both in progress (`[/]`), folded into `IMPLEMENTATION_PLAN.md` v17. **Plan v17 was
critiqued at 97/100 — APPROVED** (Cycle 7 Rev 1), clearing the ≥95 gate on the first review: it
reuses the vetted Cycle-5 v14 Node-24 material and adds a net-new, fully-written
`.github/workflows/ci.yml` (ubuntu, Node 24 via `.nvmrc`, npm + Playwright-chromium caching,
least-privilege permissions, cancel-in-progress concurrency). Every version/config claim was
re-verified against the live tree. Three non-blocking nits (dist-upload `if:always()`+
`if-no-files-found:error` double-failure, no `timeout-minutes`, no local YAML schema check) hold
it at 97 not 98. **Next action: implement approved plan v17** — landing `.nvmrc`/`.node-version`/
tightened engines/the guard/wired scripts/README/unit tests/`ci.yml` flips **both** `[/]` items
`[x]` and resets the (re-accruing, now −1) inactivity decay. The third strictly-unchecked item —
the on-device static-HTTPS helper (`[ ]`, an unrelated native subsystem) — is justly deferred to
a future cycle (plan §2 Out of scope). Strict-unchecked `[ ]` = 1 → backlog −0. See
`IMPLEMENTATION_PLAN_CRITIQUE.md` Cycle 7 Rev 1 and `CONSOLIDATED_AUDIT.md` v28.

**Cycle 7 is complete** (State 4 — cycle complete): **both** coupled toolchain/infra items —
"Optional toolchain bump to Node 24 LTS" and "Add a CI workflow … on the pinned Node 24 line" —
are now `[x]`. `IMPLEMENTATION_PLAN.md` v17 (APPROVED at 97/100, Cycle 7 Rev 1) was implemented
in commit `61c456b` (9 files) and passed **Implementation Verification v7 = 97/100 — VERIFIED**
(see `IMPLEMENTATION_PLAN_CRITIQUE.md`): all five phases COMPLIANT, byte-exact where a spec value
exists (version files `24.20.0`, single-line lockfile engines edit, guard idiom, `ci.yml` keys).
Web gates proven green on Node v26.3.0 via the §5 direct-tool path — guard fails closed (exit 1),
`prettier --check .` clean (incl. `ci.yml`/README/guard), **63/63 unit** (+6 guard tests),
**12/12 e2e**, build **26315 gzip bytes** within budget. The one deviation — the guarded chain's
Node-24 execution and the first live CI run are deferred to first-push — is plan-sanctioned
(§5/§11/§10), analogous to Cycle 6's env-blocked native tests. Code landed → inactivity decay
resets to 0. **Only one strictly-unchecked `[ ]` item remains** — the on-device static-HTTPS
helper (an unrelated native subsystem, a candidate for a future cycle) → backlog −0. See
`CONSOLIDATED_AUDIT.md` v29.

**Cycle 8 is open** (State 1 — revise the plan): the **last** remaining item — "On-device
static-HTTPS helper so the live camera works on a fully offline iPad (§10 Q2)" — is now in
progress (`[/]`), addressed by `IMPLEMENTATION_PLAN.md` v18 (a dependency-free pure-Node
self-signed-cert HTTPS kiosk replacing the mkcert `serve:https` line). **Plan v18 was critiqued
at 93/100 — NOT APPROVED** (Cycle 8 Rev 1). It is strong and source-grounded (scan
secure-context gate, mkcert line, guarded-tail idiom, Apple TLS-trust rules all verified) but
held below the ≥95 gate by two concrete items: (1) a **flaw of commission** — the "hardened"
static handler serves its own TLS **private key** by default (`GET /.certs/key.pem`, because
the cert dir sits inside the served root and `.pem` is in the MIME map); (2) a **flaw of
omission** — the default cert SAN omits the LAN IP the iPad connects to, so Safari's
name-mismatch blocks the secure context and the feature fails out of the box even after the
trust walkthrough. **Next action: revise plan v18 to ≥95** — default the served root off the
cert dir (and/or deny dotfiles) + assert `GET /.certs/key.pem`→404, and auto-add discovered
LAN IPv4s to the cert SAN (or make `--host` mandatory + warn). Strict-unchecked `[ ]` = 0 (this
item is `[/]`, everything else `[x]`) → backlog −0; first idle cycle since the v29 landing →
decay −1. See `IMPLEMENTATION_PLAN_CRITIQUE.md` Cycle 8 Rev 1 and `CONSOLIDATED_AUDIT.md` v30.

**Cycle 8 plan APPROVED (Rev 2, audit v31):** `IMPLEMENTATION_PLAN.md` was revised v18 → v19
(commit `dfd2909`) and re-critiqued at **98/100 — APPROVED** (Cycle 8 Rev 2). v19 closes
**both** Rev-1 must-fix items — the private-key-on-the-wire flaw of commission (now three
layered guards: dot-segment rejection in `safeResolve`, a `forbiddenRoots` cert-cache denial
that `startServer` always passes, and a `realpath()` symlink-escape check — with tests
asserting `GET /.certs/key.pem` **and** `/.certs/cert.pem` → 404) and the out-of-the-box
SAN/LAN-IP mismatch (`startServer` now seeds discovered LAN IPv4s into the cert SAN by
default, so the printed URL always matches — injected-snapshot test covers it) — plus all
four Rev-1 nits (`key.pem` 0600, exact EKU OID `1.3.6.1.5.5.7.3.1`, UTCTime<2050 note, real
browser `import()` e2e). The offline-HTTPS item stays `[/]` (in progress) — **the plan is
approved but NOT yet implemented** (`scripts/lib/der.mjs`, `dev-cert.mjs`, `static-server.mjs`,
`scripts/serve-https.mjs` all absent; `package.json:11` still the mkcert line). **Next action:
implement approved plan v19** — landing the four scripts + tests + `package.json`/`README`/
`.gitignore` edits flips this **last** item `[/]` → `[x]` and **closes the backlog entirely**,
and is the only thing that resets the accruing inactivity decay (now −2, second idle cycle).
Strict-unchecked `[ ]` = 0 → backlog −0. Three non-blocking Path-to-100 items to carry into
implementation: a golden-byte KeyUsage-extension `der.test.mjs` assertion; a pinned IPv4
predicate in `buildSanExtension`; explicit IPv6 `--host` handling. See
`IMPLEMENTATION_PLAN_CRITIQUE.md` Cycle 8 Rev 2 and `CONSOLIDATED_AUDIT.md` v31.
