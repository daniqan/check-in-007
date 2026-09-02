# Check-In 007 — Implementation Plan Critique (Cycle 5: Node 24 LTS Toolchain)

**Plan Score:** **98/100**
**Implementation Score:** _n/a — plan just APPROVED at Rev 3; not yet implemented_
**Status:** **APPROVED** (Rev 3 — the Rev-2 gate-blocker and the Path-to-100 nit are both resolved; ≥95 gate cleared)

> Cycle 4 (scan blip audio) is complete and **VERIFIED** (Implementation Verification v5 =
> 98/100; see the archived critique further down this file). Cycle 5's plan is
> `IMPLEMENTATION_PLAN.md` v14 (optional Node 24 LTS toolchain bump), now **APPROVED at
> 98/100 (Rev 3)**. Loop state: **State 2 — implement the approved plan**. The plan is the
> contract; implementation will be audited against it.

---

## Plan Critique — Cycle 5, Revision 3

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `ff40b18`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v14
**Score:** **98 / 100** (previous: 93 — Rev 2, plan v13)
**Status:** **APPROVED** — the sole Rev-2 gate-blocker is resolved and the Path-to-100 nit is folded in; the plan is implementation-ready.

Plan v14 does exactly and only what Rev 2 asked. Verified against the v13→v14 diff (`git show ff40b18`):

1. **Rev-2 gate-blocker (guard fails open on sub-24 majors) — RESOLVED.** The executable tail
   is now `if (import.meta.url === pathToFileURL(process.argv[1]).href) { process.exitCode = main(); }`
   (Phase 2, plan lines 201-205), with `import { pathToFileURL } from 'node:url';` added to the
   guard sketch (line 161). `pathToFileURL` has existed since Node 10.12, so it evaluates correctly
   on **every** runtime the guard must reject (Node 20, Node 22.0–22.17, all of Node 23) — `main()`
   now runs on all majors and returns `1` for non-24, satisfying the Phase-2 acceptance criterion
   ("Node 22.x, 23.x … exit 1", line 210). §4.5 (lines 95-104) is rewritten with the correct
   rationale — the guard must run on the runtimes it *rejects*, and `import.meta.main` was added in
   v24.2.0 / backported only to v22.18.0 so it is `undefined` on the older majors — and §7.3's
   migration path (lines 330-336) is updated to the same idiom. This is precisely Rev 2's option (a),
   the one the critique flagged as "cleanest and keeps every stated acceptance criterion true."
2. **Rev-2 Path-to-100 (no test exercises the executable tail) — FOLDED IN.** A fourth unit test
   `CLI executable tail runs main for the current process major` (Phase 4, line 267), a §10
   child-process smoke test using `spawnSync(process.execPath, ['scripts/check-node-version.mjs'])`
   asserting the exit status matches `isSupportedNodeVersion(process.versions.node) ? 0 : 1`
   (lines 397-400), a matching Phase-4 acceptance bullet (lines 286-288), the §7.3 test-runner
   contract, and the File-Manifest note ("range logic, and CLI dispatch", line 121) all now assert
   that direct script execution actually reaches `main()`. This is the assertion that would have
   caught the Rev-2 defect.

Re-verified against the working tree: `package.json` engines still `">=22"` (`package.json:6-8`);
lockfile root `packages[""].engines.node` `">=22"` (`package-lock.json:17-18`), distinct from the
transitive `>=20`/`>=12` dep floors; no `.github/`; `README.md` not in `.prettierignore`;
`node --version` → **v26.3.0** (the guard's canonical rejected version, still the audit shell). The
v13→v14 diff touches nothing else — no `src/`, fixture, style, screen, build output, or storage key.

## Issues resolved in revision 3

Both open Rev-2 items are closed (enumerated above): the gate-blocking `import.meta.main` fail-open
flaw of commission, and the Path-to-100 executable-tail test omission. The diff is otherwise a pure
rationale/acceptance-criteria update with no new surface.

## Remaining issues

None gate-blocking. Two trivial Path-to-100 nits remain (see Path to 100); neither affects correctness
on this repo's documented invocation and neither blocks implementation.

## Scope Check

Unchanged from Rev 1/Rev 2 and still adequate.
- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` reports all Required
  Actions #1–#8 DONE and zero open defects.
- **Backlog items in scope but not addressed:** None mis-scoped. The plan addresses the in-progress
  item ("Optional toolchain bump to Node 24 LTS", `BACKLOG.md:16`, `[/]`); the two remaining `- [ ]`
  items (native SwiftUI iPad build, on-device static-HTTPS helper) are independent subsystems
  correctly deferred (§2 Out of scope).
- **Integration points analyzed:** Yes — §7's five contracts (npm engines, dev validation scripts,
  test runner, static build, operator docs), each with failure mode and migration path.
- **Alternatives considered:** Yes — §4 justifies `>=24 <25` over `>=24`, a local guard over the
  `check-node-version` package, pinned deps, both version files, `pathToFileURL` over both
  `import.meta.main` and the raw `file://` comparison (now with the correct reasoning), and deferring CI.
- **Score cap applied:** None. Scope is adequate.

## Flaws of Commission

No flaws of commission. The Rev-2 fail-open defect is resolved: the `pathToFileURL` idiom runs on all
Node majors, so the guard fires and rejects on 20/22/23 as its acceptance criteria require. The engine
range `>=24 <25` is valid semver consistent with the guard's major-only logic; the direct-invocation
script wiring is correct; the in-place lockfile edit verified via `npm ci` changes no dependency
versions or integrity hashes; §4.5's rationale and Phase-2's acceptance criteria are now internally
consistent.

## Flaws of Omission

No gate-blocking omissions. The Rev-2 omission (no test for the executable tail) is closed by the
child-process smoke test. The two residual items are Path-to-100 polish, not omissions of required
behavior.

## Regressions

No regressions. The v13→v14 edit **reverses** the Rev-2 plan-level regression: the guard's rejection
behavior on sub-24 runtimes goes from "silently passes" (v13's `import.meta.main`) back to "correctly
fails closed" (v14's `pathToFileURL`), now on *every* Node version rather than only on space-free POSIX
paths. No shipped-product regression — the plan still touches no `src/` file, fixture, style, screen,
build output, or storage key (§5).

## Why 98 and not 99

Two genuine (if trivial) improvements separate v14 from a 99:

1. **§4.5 claims `pathToFileURL` handles "platform path differences" but does not acknowledge the
   `argv[1]`-vs-`import.meta.url` realpath asymmetry.** Node's loader realpath-resolves the module URL
   (`import.meta.url`), while `process.argv[1]` is left as invoked (not realpathed unless the runtime
   does so). If the guard were ever launched through a *symlinked* path, the equality would be false,
   `main()` would no-op, and the guard would fail open again. This does **not** affect this repo —
   validation invokes `node scripts/check-node-version.mjs` by its real relative path, and the new
   child-process smoke test would surface any mismatch in-environment — so it is non-blocking. But the
   rationale overstates robustness by one case it does not cover.

2. **The §10/Phase-4 smoke test spawns a cwd-relative path (`['scripts/check-node-version.mjs']`).**
   Correct under the documented flow (`node --test` from the repo root), but a root-anchored path
   (`fileURLToPath(new URL('../../scripts/check-node-version.mjs', import.meta.url))`) would make the
   test cwd-independent.

Neither is blocking; both are noted below.

## Path to ≥95

Cleared. The plan is APPROVED at 98. No required changes remain before implementation.

## Path to 100

- Add one sentence to §4.5 acknowledging that `import.meta.url` is realpath-resolved while
  `process.argv[1]` is not, so the equality assumes the script is invoked by its real (non-symlinked)
  path — true for this repo's `node scripts/check-node-version.mjs` flow. (Why-98 nit #1.)
- Anchor the child-process smoke-test path to the module rather than cwd
  (`fileURLToPath(new URL('../../scripts/check-node-version.mjs', import.meta.url))`) so it passes
  regardless of the directory `node --test` is launched from. (Why-98 nit #2.)

## Summary

Plan v14 resolves the Rev-2 gate-blocker with the version-agnostic `pathToFileURL(process.argv[1]).href`
comparison (Rev 2's recommended option (a)) so the guard fires and fails closed on every sub-24 Node
major it must reject, and folds in the child-process CLI smoke test that would have caught the Rev-2
defect. Scope remains adequate, no flaws of commission or gate-blocking omissions remain, and the one
plan-level regression from Rev 2 is undone. Two trivial Path-to-100 nits (a realpath-asymmetry caveat
in §4.5, a cwd-relative smoke-test path) keep it at 98 rather than 99, but neither blocks
implementation. **APPROVED at 98/100. State 2 — implement the approved plan.**

---

## Plan Critique — Cycle 5, Revision 2

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `cbdabe3`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v13
**Score:** **93 / 100** (previous: 94 — Rev 1, plan v12)
**Status:** NOT APPROVED — one **new** gate-blocking flaw of commission introduced by the v12→v13 fix; otherwise the plan is now excellent.

Plan v13 is a clean, focused revision that **resolves every single item from Rev 1** — the sole
gate-blocker (no verification path on a non-24 shell) and all three Path-to-100 nits (fragile
main-module idiom, understated §9 perf claim, README/lockfile-edit hygiene). Verified against the
v12→v13 diff (`git show cbdabe3`):

1. **Gate-blocker #1 (Rev 1) — RESOLVED.** Phase 4 now carries a "Verifying on a non-24 shell"
   subsection (lines 278-300) and §11 a "Non-24 local shell procedure" (lines 420-430): both state
   the current shell is Node `v26.3.0`, require `nvm install && nvm use` (with asdf/mise/nodejs.org
   equivalents) before the guarded commands, and enumerate the exact direct-tool bypass set
   (`node scripts/check-node-version.mjs`, `npx prettier --check .`, `node --test tests/unit/*.test.mjs`,
   `npx playwright test`, `node scripts/build.mjs`) as the auditor's escape hatch. This is precisely
   the fix Rev 1 asked for.
2. **Path-to-100 (Rev 1 Commission #2 / §9 perf) — RESOLVED.** Phase 3 now invokes the guard
   directly (`node scripts/check-node-version.mjs && …`, lines 213-217) instead of `npm run
   check:node && …`, and §9 (lines 356-358) is corrected to describe the direct invocation "avoiding
   an extra nested `npm run check:node` startup." The <50 ms claim is now accurate.
3. **Path-to-100 (Rev 1 Omissions #2/#3) — RESOLVED.** Phase 1 adds "verify the hand-edited lockfile
   with `npm ci`; do not run `npm install` this cycle" (lines 149-150), and Phase 3 adds "keep README
   edits Prettier-formatted because `README.md` is checked by `prettier --check .`" (lines 231-232).

Every source claim re-verified against the working tree: `package.json` engines `">=22"`
(`package.json:6-8`); lockfile root `packages[""].engines.node` `">=22"` (`package-lock.json:17-18`),
distinct from transitive `>=20`/`>=12` dep floors; no `.github/`; `README.md` **not** in
`.prettierignore`; `node --version` → **v26.3.0**.

Had v13 only closed the Rev-1 list, it would score ~98. It does not, because the *way* it closed the
main-module Path-to-100 nit introduces a new, gate-blocking flaw of commission in the guard's core
mechanism.

## Issues resolved in revision 2

All four Rev-1 items are closed (enumerated above): the non-24-shell verification gate-blocker plus
the three Path-to-100 nits (main-module idiom, §9 perf claim, README/lockfile hygiene). The v12→v13
diff is otherwise purely additive/clarifying.

## Remaining issues

1. **`import.meta.main` makes the guard silently no-op — and therefore *pass* — on the older Node
   majors it is built to reject (NEW, gate-blocking flaw of commission).**
   Rev 1 offered two ways to replace the fragile URL comparison: `import.meta.main` **or**
   `import.meta.url === pathToFileURL(process.argv[1]).href`. v13 chose `import.meta.main` (§4.5 lines
   95-100; Phase-2 executable tail lines 194-198: `if (import.meta.main) { process.exitCode = main(); }`;
   §7.3 line 319). But `import.meta.main` was **added in Node v24.2.0 and backported only to v22.18.0**
   (verified against the Node.js ESM docs version history). On any runtime older than those —
   **all of Node 23.x, Node 22.0–22.17.x, and Node 20.x** — `import.meta.main` is `undefined`
   (property access, does not throw), so the executable tail `if (import.meta.main)` is falsy, `main()`
   **never runs**, and `node scripts/check-node-version.mjs` exits `0`. Wired as
   `node scripts/check-node-version.mjs && …`, the `&&` then proceeds to run prettier / node:test /
   Playwright / build **on the unsupported Node**. This directly defeats the plan's own core purpose
   ("fail fast on unsupported Node majors," §2 item 4; §Phase 3) and contradicts its own Phase-2
   acceptance criterion (lines 202-204): *"Node `22.x`, `23.x`, `25.x`, `26.x`, empty strings, and
   malformed values exit `1`."* Under the chosen idiom, running the CLI on Node 22.17 or Node 23.x
   exits `0`, not `1`. The guard fires correctly only on runtimes *newer* than 24.2 (25, 26) — while
   Node 20 and Node 22 (the prior two LTS lines, the most likely "wrong-but-installed" versions) sail
   straight through. Because npm's `engines` only warns without `engine-strict` (the plan relies on
   the guard for "the hard failure," §8), the guard is the *only* hard gate — and it is exactly the
   layer that fails open here. The planned §10 unit tests call `main({version})` directly (pure
   function) so they stay green, giving false confidence: the suite passes while the shipped CLI is
   broken on common runtimes.
   *Fix (one of):* (a) Use the version-agnostic robust form Rev 1 also offered —
   `import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href` — which
   evaluates correctly on **all** Node versions, so the guard fires and rejects on 20/22/23; or
   (b) keep `import.meta.main` but fall back when it is `undefined`:
   `if (import.meta.main ?? (import.meta.url === pathToFileURL(process.argv[1]).href)) { … }`; or
   (c) if `import.meta.main` is kept as-is, the plan must explicitly scope the guard's contract to
   "detects unsupported Node **≥ 22.18 / ≥ 24.2**" and revise the Phase-2 acceptance criteria and §2
   accordingly (weaker — it leaves Node 20 / early-22 / all-23 unguarded, which undercuts the feature).
   Option (a) is cleanest and keeps every stated acceptance criterion true.

## Scope Check

Unchanged from Rev 1 and still adequate.
- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` reports all Required
  Actions #1–#8 DONE and zero open defects.
- **Backlog items in scope but not addressed:** None mis-scoped. The plan addresses the in-progress
  item ("Optional toolchain bump to Node 24 LTS", `BACKLOG.md:16`, `[/]`); the two remaining `- [ ]`
  items (native SwiftUI iPad build, on-device static-HTTPS helper) are independent subsystems
  correctly deferred (§2 Out of scope).
- **Integration points analyzed:** Yes — §7's five contracts (npm engines, dev validation scripts,
  test runner, static build, operator docs), each with failure mode and migration path.
- **Alternatives considered:** Yes — §4 justifies `>=24 <25` over `>=24`, a local guard over the
  `check-node-version` package, pinned deps, both version files, `import.meta.main` over the URL
  comparison (the choice that backfired), and deferring CI.
- **Score cap applied:** None. Scope is adequate; the score reflects the one commission defect, not scope.

## Flaws of Commission

1. **The `import.meta.main` executable-tail idiom (Remaining issue #1)** is a genuine flaw of
   commission: for a guard whose entire job is to *reject* Node ≠ 24, choosing a detection mechanism
   that is `undefined` on the sub-24 majors (20, 22.0–22.17, 23.x) means the guard fails **open** —
   the most dangerous failure mode for a safety gate. It also makes the plan internally inconsistent:
   §4.5's idiom cannot satisfy §Phase 2's "Node 22.x, 23.x … exit 1" acceptance criterion.

No other flaws of commission. The engine range `>=24 <25` is valid semver and consistent with the
guard's major-only logic; the direct-invocation script wiring is correct; the lockfile edit target is
right and, edited in place with `npm ci` verification, changes no dependency versions or hashes.

## Flaws of Omission

1. **No test exercises the executable tail across runtimes.** §10 tests only the pure functions
   (`parseNodeMajor`/`isSupportedNodeVersion`/`main({version})`), so the CLI-dispatch behavior that
   Remaining issue #1 breaks is never asserted. Even after fixing the idiom, a child-process smoke
   test — spawn `node scripts/check-node-version.mjs` under the current runtime and assert the exit
   code matches the major — would lock in that `main()` actually runs when invoked as a script.
   (Path-to-100 once #1 is fixed; today it is the reason the defect hides behind a green suite.)

No other omissions. The Rev-1 omissions (README Prettier hygiene, `npm ci`-not-`npm install`) are now
addressed.

## Regressions

No regressions to the shipped product — the plan still touches no `src/` file, fixture, style, screen,
build output, or storage key (§5). The one *plan-level* regression is internal to this cycle: the
v12→v13 edit **traded a cosmetic robustness nit for a functional gate-blocker** — v12's
`import.meta.url === \`file://${process.argv[1]}\`` idiom, while fragile on spaces/symlinks/Windows,
at least *ran on every Node version* and so would have rejected Node 20/22/23 correctly on this repo's
space-free POSIX path. v13's `import.meta.main` is more elegant on the target runtime but fails open on
older majors. Net, the guard's rejection behavior on sub-24 runtimes regressed from "works" to "silently
passes."

## Why 93 and not 94

Rev 1 (v12) scored 94 for a single mechanically-fixable *verification/process* gap. v13 closes that
gap and all three polish nits — real progress — but replaces them with a *functional correctness*
defect in the deliverable's core mechanism: a safety guard that fails open on the common older LTS
lines (Node 20, Node 22) it exists to catch, plus a resulting internal inconsistency (§4.5 vs Phase-2
acceptance) and a test suite that stays green while the CLI is broken. A false-pass in a guard is
strictly worse than a missing "how to verify" note, so it lands one point below Rev 1's 94 rather than
at the ~98 the Rev-1 fixes alone would have earned.

## Path to ≥95

Address the following in one revision pass:

1. **Fix the executable-tail idiom (Remaining issue #1).** Prefer option (a): replace
   `if (import.meta.main)` with `import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href`
   so the guard fires (and `main()` runs) on **every** Node version, keeping the Phase-2 acceptance
   criteria ("Node 22.x, 23.x … exit 1") true. Update §4.5's rationale (the `import.meta.main`
   "added in 24.2.0 / target is 24.20.0" reasoning is the logic gap — the guard must run on the
   runtimes it *rejects*, not the one it wants) and §7.3's migration path to match.

Doing #1 clears the gate (expected ~97-98). Folding in the Path-to-100 item below would land 98-99.

## Path to 100

- Add a child-process CLI smoke test (spawn `node scripts/check-node-version.mjs`, assert the exit
  code matches the running major) to §10 so the executable-tail dispatch is actually exercised, not
  just the pure functions (Flaws of Omission #1). This is the assertion that would have caught the
  Rev-2 defect.

## Summary

Plan v13 resolves the entire Rev-1 list — the non-24-shell verification gate-blocker and all three
Path-to-100 nits — and is, in every other respect, an excellent, correctly-scoped, dependency-free
toolchain plan. But the fix for the (cosmetic) main-module nit reached for `import.meta.main`, which
was **added in v24.2.0 and backported only to v22.18.0**; on Node 20, Node 22.0–22.17, and all of
Node 23.x the property is `undefined`, so the guard's executable tail never runs and the CLI exits
`0` — failing open on exactly the sub-24 majors it must reject, contradicting its own Phase-2
acceptance criteria, and hiding behind a green pure-function unit suite. Swap to the version-agnostic
`pathToFileURL(process.argv[1]).href` comparison (Rev 1's other offered option) and the plan clears
≥95. **State 1 — revise plan.** Score **93/100 — NOT APPROVED.**

---

## Plan Critique — Cycle 5, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `2c1ea09`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v12
**Score:** **94 / 100** (first review of the cycle-5 plan)
**Status:** NOT APPROVED — one gate-relevant feasibility/verification gap; otherwise a strong, well-scoped plan.

Plan v12 is a clean, tightly-scoped toolchain plan: pin Node 24 LTS via `.nvmrc`/`.node-version`,
tighten `engines` from `>=22` to `>=24 <25`, add a dependency-free major-version guard
(`scripts/check-node-version.mjs`), wire it into `lint`/`test`/`build`, document it, and unit-test
the parsing/range logic. It correctly keeps the browser kiosk, storage keys, and scan-audio code
out of scope, keeps runtime dependencies at zero, considers and rejects the obvious alternatives
(`>=24` range, `check-node-version` package, single version file, adding CI), and gives every phase
concrete acceptance criteria. It falls just short of the ≥95 gate on a single feasibility/verification
gap that is unusually load-bearing *for this plan specifically*, because this is a toolchain plan and
the machine it will be implemented on is on the very Node line the guard blocks.

Every factual claim about the current code was verified against source:
- `package.json` engines is `">=22"` (`package.json:6-8`) — the plan's "from `>=22`" baseline is correct.
- `package-lock.json` root `packages[""].engines.node` is `">=22"` at `package-lock.json:17-18` — the
  plan's "root `packages[""].engines`" target exists exactly where claimed; the transitive-dep engines
  below it (`>=20` for `@playwright/test`, etc.) are separate and must not be touched. Verified.
- Dependency engine floors are Node-24-compatible: `@playwright/test`/`playwright` `>=20`
  (`package-lock.json:34`); others `>=12`/`>=14`/`>=0.4` — all satisfied by Node 24. The §4.3 claim holds.
- Scripts are `serve`/`serve:https`/`build`/`lint`/`test`/`test:unit`/`test:e2e`/`fonts:subset`
  (`package.json:9-18`); the plan's Phase-3 rewrite of `build`/`lint`/`test` + new `check:node`
  matches, and leaving `test:unit`/`test:e2e`/`serve*`/`fonts:subset` unchanged is correct.
- No `.github/` exists — the "don't add CI this cycle" decision is grounded (verified: no workflow dir).
- `README.md` is **not** in `.prettierignore` (only BACKLOG/AUDIT/PLAN/CRITIQUE + build dirs are), so it
  is markdown-linted by `prettier --check .`; `npx prettier --check .` is currently clean on this tree.

## Remaining issues

1. **The plan does not address verifying its own acceptance criteria on a machine that is not already
   on Node 24 — and this machine is on Node 26.3.0 (gate-relevant feasibility/verification gap).**
   The whole deliverable is "the guarded suites pass under Node 24" (Phase 4, §10, §11). But the
   current dev environment runs **Node v26.3.0** (confirmed: `node --version` → `v26.3.0`) — the exact
   `26.3.0` the plan uses as its canonical *rejected* version (§10 line 339-341). The moment the
   implementer wires `check:node` into `lint`/`test`/`build` (Phase 3), **every** one of `npm run lint`,
   `npm test`, and `npm run build` fails fast on this machine until Node 24 is installed and selected —
   including the generator's own Phase-4 verification run and the discriminator's later implementation
   audit. The plan assumes Node 24.20.0 is simply active (§11 `nvm install && nvm use`) but never (a)
   confirms nvm + a Node 24 build are actually available in this environment, nor (b) specifies the
   audit-time fallback for verifying the work when the shell is still on Node 26. This is exactly the
   "implicit assumption that might not hold" + "how will you know it works" gap the rubric weights, and
   for a *toolchain* plan it is not cosmetic — as written, the plan risks being unverifiable on the box
   it ships from.
   *Fix (one of):* Add a short "Verifying on a non-24 shell" subsection to Phase 4 / §11 that (i) states
   the implementer must `nvm install 24 && nvm use` (or install Node 24.20.0 from nodejs.org / asdf /
   mise) **before** running the guarded commands, explicitly noting the current shell is Node 26 so the
   guarded commands will fail until then; and (ii) documents that the underlying tools can be invoked
   directly to verify the change without the guard — `node scripts/check-node-version.mjs`,
   `npx prettier --check .`, `node --test tests/unit/*.test.mjs`, `npx playwright test`, and
   `node scripts/build.mjs` (§8 already notes direct `node scripts/build.mjs` bypasses the guard; make
   the full bypass set explicit as the auditor's escape hatch). This closes the gate.

## Scope Check

- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` reports all Required
  Actions #1–#8 DONE and **zero open defects**. Nothing is left for this plan to pick up.
- **Backlog items in scope but not addressed:** None mis-scoped. The plan addresses the in-progress
  item ("Optional toolchain bump to Node 24 LTS", `BACKLOG.md:16`, `[/]`). The two remaining `- [ ]`
  items — native SwiftUI iPad build and the on-device static-HTTPS helper — are independent subsystems
  correctly deferred (§2 Out of scope). No related toolchain backlog items are ignored.
- **Integration points analyzed:** Yes — §7 enumerates five contracts (npm engines, dev validation
  scripts, test runner, static build, operator docs) each with a failure mode and migration path.
- **Alternatives considered:** Yes — §4 justifies `>=24 <25` over `>=24`, a local guard over the
  `check-node-version` package, keeping deps pinned, keeping both version files, and deferring CI.
- **Score cap applied:** None. Scope is adequate; the score reflects the one verification gap plus
  polish, not scope.

## Flaws of Commission

No gate-blocking flaws of commission. The engine range `>=24 <25` is valid semver and is internally
consistent with the guard's major-only logic (`isSupportedNodeVersion` true iff major === 24; both
express "Node 24 only"). The lockfile edit target is correct and, edited in place alongside
`package.json`, changes no dependency versions or integrity hashes. Two minor commission-adjacent nits
(both Path-to-100, non-blocking):

1. **Fragile main-module idiom.** The Phase-2 executable guard is
   `if (import.meta.url === \`file://${process.argv[1]}\`) { … }` (plan lines 187-189). This idiom is
   known-fragile: it breaks when the script path contains spaces or non-ASCII (percent-encoded in
   `import.meta.url` but raw in `process.argv[1]`), on symlinked invocations, and on Windows drive
   paths. It happens to work for this repo (`/Users/cyrax/daniqan/check-in-007/...`, no spaces), so it
   is not a functional blocker here — but since the plan *targets Node 24*, the robust and simpler
   `if (import.meta.main) { … }` (available on Node 24) or `import.meta.url ===
   (await import('node:url')).pathToFileURL(process.argv[1]).href` is the better choice. State one.
2. **§9 performance claim understates real cost.** §9 says the added cost is "below 50 ms … because it
   starts a single Node process." But Phase 3 invokes the guard as `npm run check:node && …`, so each
   guarded command spawns an **`npm run` indirection** (npm startup, typically ~150-400 ms) *plus* the
   node process — not a single node process. The guard script itself is <50 ms, but the wall-clock
   addition per `npm run lint|test|build` is several hundred ms. Either correct the claim to describe
   the npm-spawn overhead, or invoke the guard directly (`node scripts/check-node-version.mjs && …`) to
   match the 50 ms claim (at the cost of not reusing the named `check:node` script).

## Flaws of Omission

1. The verification-on-non-24-shell gap (Remaining issue #1) is the one gate-relevant omission.
2. **README prettier-clean not called out.** `README.md` is markdown-linted by `prettier --check .`
   (not in `.prettierignore`). Phase 3 rewrites README prose; the plan commits to lint staying clean
   (§10) but does not flag that README edits themselves must be Prettier-formatted (≤100 col, etc.) or
   `npm run lint` fails. Trivial, but worth a line so the implementer doesn't trip the very gate they add.
3. **No guard against a future `npm install` re-normalizing the hand-edited lockfile.** The plan says to
   edit `package-lock.json` root engines by hand and verify with `npm ci` (which does not rewrite the
   lock). That is correct, but a stray `npm install` (not `ci`) after the edit could re-derive/re-order
   the root block. A one-line note ("verify only via `npm ci`; do not run `npm install` in this cycle")
   would remove the ambiguity. Minor.

## Regressions

No regressions identified. No `src/` file, data fixture, style, screen, build output, or storage key
changes (§5 explicitly: "No `src/` files … change"). The added `tests/unit/node-version.test.mjs`
imports only pure functions from the guard (execution guarded behind the main-module check), so the
existing 52 unit / 12 e2e suites are unaffected and the suite only grows. The self-contained
`dist/index.html` artifact and its ≤750 KB gzip / ≤1.2 MB budget are untouched (the guard is never
bundled). The one *intended* behavior change — guarded commands now fail on Node ≠ 24 — is the feature,
not a regression, and is reversible by the documented rollback (§12).

## Why 94 and not 95

A single issue holds it below the gate: for a plan whose entire purpose is toolchain validation, the
plan does not say how its acceptance criteria get verified on the machine it will be built on, and that
machine is on Node 26.3.0 — so wiring in the guard makes `lint`/`test`/`build` all fail there until
Node 24 is installed, with no stated escape hatch for the implementation audit (Remaining issue #1).
That is a concrete feasibility/verification gap, not a judgment call, which is what keeps it out of the
≥95 band. Everything else is genuinely strong or cosmetic.

## Path to ≥95

Address the following in one revision pass:

1. **Close the verification gap (Remaining issue #1).** Add a "Verifying on a non-24 shell" note to
   Phase 4 / §11: state the current environment is Node 26.3.0, require `nvm install 24 && nvm use`
   (or asdf/mise/nodejs.org) before the guarded commands, and enumerate the direct-tool bypass set
   (`node scripts/check-node-version.mjs`, `npx prettier --check .`, `node --test tests/unit/*.test.mjs`,
   `npx playwright test`, `node scripts/build.mjs`) as the auditor's way to verify without the guard.

Doing #1 clears the gate (expected ~96). Folding in the three Path-to-100 items below would land 98-99.

## Path to 100

- Replace the fragile `import.meta.url === \`file://${process.argv[1]}\`` main-module check with
  `import.meta.main` (Node 24) or a `pathToFileURL(process.argv[1]).href` comparison (Commission #1).
- Correct the §9 "<50 ms / single Node process" claim to account for the `npm run check:node` npm-spawn
  overhead, or invoke the guard directly to make the claim true (Commission #2).
- Note that README edits must stay Prettier-formatted, and that the lockfile edit should be verified
  only via `npm ci` (not `npm install`) this cycle (Omissions #2, #3).

## Summary

A strong, correctly-scoped, dependency-free toolchain plan with concrete phases, acceptance criteria,
an alternatives analysis, and a five-contract integration map — one mechanically-fixable revision from
approval. The single gate-blocker is that a *toolchain* plan omits how it is verified on the current
Node 26.3.0 shell (where the new guard makes every guarded command fail until Node 24 is installed) and
gives no audit-time bypass. Add the "verifying on a non-24 shell" note and the direct-tool escape hatch;
that alone should clear ≥95. Three cosmetic nits (fragile main-module idiom, understated §9 perf claim,
README/lockfile-edit hygiene) separate it from 100. **State 1 — revise plan.**

---

## Archived — Cycle 4 (Scan Blip Audio) — VERIFIED at 98/100

> The sections below are the cycle-4 record: Plan Critique Revs 1-4 (final 99/100, APPROVED) and
> Implementation Verification v5 (98/100, VERIFIED). Retained for history; superseded by the Cycle 5
> critique above.

## Implementation Verification — v5

## Implementation Verification — v5

**Plan:** `IMPLEMENTATION_PLAN.md` v11 @ approved commit `b2178c2` (approved score: 99/100, Rev 4)
**Code:** commit `b63a8ff` ("feat(audio): implement scan blip cue", 13 files) audited on 2026-09-02
**Note:** Plan v11 is unchanged since the Rev-4 approval; per the version-check rule it was **not**
re-critiqued (that would be an empty critique). The generator has implemented the approved plan
(State 2 → verification), so this run performs the Mode-2 implementation audit instead.

Every plan section was walked against the landed code and confirmed by execution — not by reading
comments. All four regression commands were re-run to completion:

- `npm run lint` → **clean** (`prettier --check .`, all files formatted).
- `npm run test:unit` → **52/52 pass** (was 38 pre-cycle; +14 audio/store assertions).
- `npm run test:e2e` → **12/12 pass** (was 10; +2 scan-blip workflows).
- `npm run build` → `dist/index.html` **26,315 gzip bytes** (was 24,660; +~1.65 KB, within the
  §9 "<3 KB gzip" estimate and far under the ≤750 KB gzip / ≤1.2 MB budget).

| Section | Status | Notes |
|---------|--------|-------|
| §Phase 1 — config `AUDIO`/`AUDIO_KEY` | COMPLIANT | `config.mjs:8-21` matches the plan block byte-for-byte (default-off, gain `0.045`, 880→1320 Hz, 90 ms, release `0.035`s; `AUDIO_KEY: 'checkin007.audio.v1'`). |
| §Phase 1 — store settings | COMPLIANT | `store.mjs` adds `normalizeAudioSettings` (JSON-parse-safe, `=== true` coercion, default-off), `loadAudioSettings`, `saveAudioSettings` (compact `{"scanBlipEnabled":true}`), volatile-fallback key seeded. Unit-verified (3 new store tests: default/malformed off, round-trip under versioned key, volatile read). |
| §Phase 2 — `src/lib/audio.mjs` | COMPLIANT | Factory-based availability (`typeof audioContextFactory === 'function'`); lazy single-context `getContext()`; gesture unlock with suspended→`await resume()`→running; **idempotent** repeated unlock (no second context, `resumeCalls === 0` on the second call — the folded Path-to-100 test); guarded **non-awaited** playback resume on `suspended`/`interrupted`; per-cue oscillator/gain; `dispose()` closes owned context. All public methods catch and return booleans. |
| §4.3 exact automation | COMPLIANT | Unit test asserts the literal call order + args: `connect`→`connect`, `frequency.setValueAtTime(880,12)`, `linearRampToValueAtTime(1320,12.045)`, `gain.setValueAtTime(0.045,12)`, `setTargetAtTime(0,12,0.035)`, `start(12)`, `stop(12.09)` (`audio.test.mjs:156-165`). `durationSeconds = 90/1000 = 0.09` confirmed. |
| §Phase 3 — app wiring | COMPLIANT | `app.mjs` constructs the controller, `setEnabled(loadAudioSettings().scanBlipEnabled)` on start; `onSelect` creates the visit id then calls `audio.unlockFromGesture()` (non-awaited) before `setState('SCAN')`; scan `onDone` calls `audio.playScanBlip()` then `setState('RESULT')`; `updateAudioSettings` persists + re-`setEnabled`. Matches §6 snippet + §7 contracts. |
| §Phase 3 — admin UI | COMPLIANT | Checkbox inserted after `.merge-panel` `</section>` and before `.admin-grid` (plan's exact insertion point); inline normalization `audioSettings?.scanBlipEnabled === true` (does not import `store.normalizeAudioSettings`); change handler persists via `onAudioSettingsChanged`, re-syncs `checked` to saved value, announces "Scan blip audio enabled./disabled." in the existing live region. CSS `.audio-setting` added. |
| §Phase 4 — build order | COMPLIANT | `src/lib/audio.mjs` inserted immediately after `src/config.mjs` in `build.mjs` `modules`. Build test asserts `src_config` < `src_lib_audio` < `src_app`, the `const AUDIO = …src_config.AUDIO` alias, and the `src_app` `createScanAudioController` alias. |
| §Phase 4 — e2e | COMPLIANT | Init-script `MockAudioContext` (starts `suspended`, `resume()`→`running`) with unlock/playback-resume counters keyed off first-oscillator creation. Enabled workflow asserts `constructions:1, unlockResume:1, playbackResume:0, oscillators:1, gains:1, starts:1, stops:1, connections:2, checkins:1`. Disabled workflow asserts `constructions:0, starts:0, checkins:1`. Both pass. |
| §Phase 4 — privacy probe | COMPLIANT | Extended probe records every `getUserMedia` `audio` constraint and asserts `audioConstraints.length > 0 && every(=== false)`; `scan.mjs:40` still `audio: false`; `toDataURL`/`captureStream`/`MediaRecorder` all 0; tracks `ended`. Test-enforced. |
| §Phase 4 — README | COMPLIANT | "Optional Scan Audio" section documents admin-enabled, gesture-gated, locally-synthesized, no-microphone behavior. |

### Regression detection

- **Behavioral:** all prior unit + e2e specs still green (52/52, 12/12). No previously-passing test now fails.
- **Performance/artifact:** +~1.65 KB gzip; hot path stays O(1) per cue. No new blocking calls on navigation (playback resume is non-awaited).
- **API/contract:** `mountAdmin`'s new params are additive with safe defaults; `store` gains two methods without changing existing keys/shapes; `onSelect`/visit-id/`RESULT` semantics preserved.
- **Coverage:** test suite grew (38→52 unit, 10→12 e2e). No coverage regression.
- **Privacy invariant:** magic-number grep for audio constants outside `config.mjs`/`audio.mjs` → **none**; camera constraint unchanged. No silent regression.

**Implementation Score:** 98/100

## Defects

No gate-blocking defects. Implementation is COMPLIANT across every section and clears the ≥95 gate → **VERIFIED**. Two non-blocking Path-to-100 nits remain (do not require a fix cycle; fold opportunistically if the file is next touched):

1. **Enabled-audio e2e runs in covert mode.** `installAudioMock` sets `navigator.mediaDevices = undefined`, so the enabled-cue e2e exercises the audio path with the camera absent (covert scan) rather than alongside a live camera stream. The audio flow is independent of camera state and the disabled/enabled cue counters are exact, so coverage is sound — but a maximally thorough test would fire the cue with a granted camera to prove the two subsystems coexist. Cosmetic.
2. **No enable→disable→scan e2e.** The unit suite proves `disabled-after-unlock` suppresses playback and attempts `suspend()`; e2e proves enabled-plays-once and default-off-silent, but not the admin round-trip of enabling, disabling, then scanning silently. The unit coverage makes this low-value, but it is the one behavioral combination not asserted end-to-end.

## Summary

Plan v11 (approved 99/100) is **implemented and VERIFIED at 98/100** in commit `b63a8ff`. Every
plan section is COMPLIANT, confirmed by execution: lint clean, 52/52 unit, 12/12 e2e, build 26,315
gzip bytes within budget with the verified module order `src_config` < `src_lib_audio` < `src_app`
and both namespace aliases wired. The exact §4.3 AudioParam automation is unit-asserted to the
literal call sequence; unlock idempotency (the last Rev-3/Rev-4 Path-to-100 nit) was folded into
`tests/unit/audio.test.mjs` as recommended; camera privacy is preserved and test-enforced. No
regressions. Loop reaches **State 4 — cycle complete**. Two cosmetic e2e-coverage nits remain
(Path-to-100 only). See `CONSOLIDATED_AUDIT.md` v20.

---

## Plan Critique — Revision 4

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `b2178c2`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v11
**Score:** **99 / 100** (previous: 99 — Rev 3)
**Status:** APPROVED — the single Rev-3 Path-to-100 nit (unlock idempotency) is now stated
explicitly; one equally-cosmetic test-coverage nit takes its place, so the score holds at 99.

Plan v11 is a two-hunk, documentation-only follow-up to the already-approved v10. It does not
touch scope, architecture, or any gate-blocking mechanism — it closes the exact Path-to-100
item Rev 3 listed. Re-reviewed under the staleness rule (v11 > the v10 that Rev 3 critiqued).
The plan remains implementation-ready, correctly scoped to the one in-progress backlog item,
dependency-free, default-off, and privacy-preserving (`{ audio: false }`, no
`MediaRecorder`/`captureStream`).

The v10→v11 diff (two hunks) and its correctness:

1. **`unlockFromGesture()` idempotency stated in the Phase-2 contract — RESOLVED (was the sole
   Rev-3 Path-to-100 nit / Omission).** The controller contract now reads: "`unlockFromGesture()`
   is idempotent across repeated roster selections: after the controller is already unlocked and
   the context is `running`, a later call re-marks the controller unlocked and returns `true`
   without creating another context or calling `resume()` again" (lines 293-296). This is exactly
   the one-line statement Rev 3 asked for, and it is consistent with the pre-existing contract "if
   state is `running`, it marks unlocked" (line 292).

2. **§8 "Multiple rapid selections" idempotency footnote — RESOLVED (same nit, second location).**
   §8 now adds: "Repeated eligible selections across a normal session may call
   `unlockFromGesture()` again, but an already-unlocked running context is treated as a safe no-op
   and does not create a second context or churn `resume()` calls" (lines 533-535). The two
   statements agree; the behavior is a safe no-op, so it introduces no logic risk.

Source re-verified for this revision (no source has changed since the v15 landing `3168a28`):
`mountAdmin(root, { store, onRosterChanged, onClose })` (`admin.mjs:31`) confirms
`audioSettings`/`onAudioSettingsChanged` remain net-new; `.merge-panel` (`admin.mjs:43`) and
`.admin-grid` (`admin.mjs:49`) hold the insertion point; `SCAN_MS: 4500` (`config.mjs:3`) confirms
the ~4.5 s unlock→playback gap the guarded playback-path resume targets.

## Issues resolved in revision 4

The single Rev-3 Path-to-100 item (unstated `unlockFromGesture()` idempotency) is closed in two
locations (enumerated above). No new issues introduced; the diff is purely additive clarification.

## Remaining issues

No gate-blocking or specificity issues remain. Only the single cosmetic Path-to-100 nit below.

## Scope Check

Unchanged from Rev 3 and still adequate.
- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` reports all Required
  Actions #1–#8 DONE and zero open defects.
- **Backlog items in scope but not addressed:** None mis-scoped. Addresses the in-progress item
  (`BACKLOG.md:9`, `[/]`); the three `- [ ]` items (native SwiftUI, offline-HTTPS helper, Node 24
  bump) are independent subsystems correctly deferred.
- **Integration points analyzed:** Yes — §7's six contracts are unchanged.
- **Alternatives considered:** Yes — §4 unchanged.
- **Score cap applied:** None.

## Flaws of Commission

No flaws of commission identified. The v11 diff adds no logic — only documentation of an
already-implied safe no-op. The idempotency statement is behaviorally consistent with the existing
`running`→marks-unlocked contract.

## Flaws of Omission

No gate-blocking omissions. One cosmetic residue (Path-to-100): the plan now *specifies*
`unlockFromGesture()` idempotency as a contract (no second context, no repeated `resume()`) but
§10's unit-test enumeration does not list a matching assertion. §10 tests repeated *playback*
("repeated successful playback creates two oscillator instances", line 582) but not repeated
*unlock* on an already-`running` context. A newly-stated behavioral contract ideally gets a test
so a future regression (e.g. calling `resume()` on every selection) would be caught. This is
minor — the behavior is a safe no-op and the e2e single-selection flow exercises the unlock path
once — but it is a concrete, actionable gap.

## Regressions

No regressions identified. The v11 changes are documentation-only relative to v10; artifact-size
budget, `onSelect`/visit-id semantics, the `RESULT` transition, and camera privacy are all
unchanged.

## Why 99 and not 100

The plan closed the exact Rev-3 nit, but in specifying the idempotency contract it created one
equally-cosmetic successor: that contract has no matching §10 unit assertion (Flaws of Omission).
A flawless plan would enumerate a "repeated `unlockFromGesture()` on a running context creates no
second context and calls `resume()` at most once" test alongside the contract. This does not gate
approval or implementation correctness — it is polish only.

**This nit is not worth another plan-revision pass.** The plan has been at the 99 ceiling since v9
cleared the gate (Rev 2 = 97 → Rev 3 = 99 → Rev 4 = 99), and every plan-only commit since the v15
code landing has accrued another −1 inactivity decay (audit 72 → 71 → 70 → 69). Fold the
idempotency unit assertion into `tests/unit/audio.test.mjs` *during implementation*; do not spend
another cycle editing the plan for it.

## Path to 100

- In §10's `tests/unit/audio.test.mjs` list, add one assertion for the now-stated idempotency
  contract: a second `unlockFromGesture()` call on an already-unlocked `running` context returns
  `true`, constructs no second `AudioContext`, and calls `resume()` at most once. (Handle this
  when writing the tests, not via another plan revision.)

## Summary

Plan v11 is approved at 99/100. It folds in the one Rev-3 Path-to-100 nit (unlock idempotency,
now stated in both the Phase-2 contract and §8) with no new logic and no new issues beyond a
single cosmetic test-coverage successor. The plan is the contract against which implementation
will be audited. Loop remains **State 2 — implement the approved plan**. The plan is done; further
plan-only revisions are counterproductive (each is another idle cycle) — **implement now**.

---

## Plan Critique — Revision 3

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `a381a27`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v10
**Score:** **99 / 100** (previous: 97 — Rev 2)
**Status:** APPROVED — all four Rev-2 Path-to-100 nits folded in; only a cosmetic
idempotency-documentation gap separates it from a perfect 100.

Plan v10 is a targeted follow-up to the already-approved v9. It does not touch scope,
architecture, or any gate-blocking mechanism — it closes the exact four Path-to-100 items
Rev 2 listed. Re-reviewed under the staleness rule (v10 > the v9 that Rev 2 critiqued);
the delta is four clarifications, each verified below. The plan remains implementation-ready
and correctly scoped to the one in-progress backlog item, dependency-free, default-off, and
privacy-preserving (`{ audio: false }`, no `MediaRecorder`/`captureStream`).

The v9→v10 diff (four hunks) and its correctness:

1. **e2e mock initial state pinned — RESOLVED (was Rev-2 "Why 97 not 98" + Omission #1).**
   §10 now states "The mock context starts in `suspended`, and its `resume()` implementation
   changes state to `running`, so the unlock-phase resume assertion is load-bearing and
   deterministic" (lines 595-597). This was the *single* reason v9 was held to 97; the
   "one unlock/resume attempt from `unlockFromGesture()`" assertion (line 604) is now
   unambiguous — a suspended→running mock forces exactly one unlock-phase `resume()` and
   zero playback-phase resumes (state is `running` by playback), matching the Phase-2
   contract "if state is `running`, it marks unlocked" (line 291).

2. **ms→seconds conversion stated — RESOLVED (was Path-to-100).** `scheduleBlip`'s comment
   now reads "Convert `config.SCAN_BLIP_DURATION_MS` to durationSeconds with
   `config.SCAN_BLIP_DURATION_MS / 1000`" (lines 266-268), and §10 adds a matching unit
   assertion (lines 570-572). With `SCAN_BLIP_DURATION_MS: 90` (line 193) this pins
   `durationSeconds = 0.09`, so `now + durationSeconds / 2` (the 880→1320 Hz ramp midpoint)
   and `stop(now + durationSeconds)` are computable — the §4.3 automation contract is now
   fully numeric.

3. **Admin normalization mechanism decided — RESOLVED (was Path-to-100 / Omission #2).**
   `mountAdmin` now specifies inline coercion `{ scanBlipEnabled: audioSettings?.scanBlipEnabled
   === true }` and explicitly "Do not import `store.normalizeAudioSettings` into this screen;
   store remains responsible for persisted shape normalization, while admin only needs a
   defensive UI boolean" (lines 391-396). This is the right call — it keeps the persistence-shape
   authority in `store` and the screen's dependency surface minimal, and the optional-chained
   `=== true` cannot throw on `undefined`/`null`/missing params.

4. **Interrupted-cue skip tradeoff documented — RESOLVED (was Path-to-100 #4).** §8's
   interrupted-context bullet now adds "The cue for the scan that encountered `interrupted`
   is intentionally skipped because waiting for resume would delay result navigation and
   could violate autoplay policy on browsers that reject the resume" (lines 514-518). The
   effectiveness footnote Rev 2 asked for is now explicit.

Source re-verified for this revision: `.merge-panel` (`admin.mjs:43`) and `.admin-grid`
(`admin.mjs:49`) both present — the insertion point holds; `mountAdmin(root, { store,
onRosterChanged, onClose })` (`admin.mjs:31`) confirms `audioSettings`/`onAudioSettingsChanged`
are net-new; `SCAN_MS: 4500` (`config.mjs:3`) confirms the ~4.5 s unlock→playback gap the
playback-path resume targets.

## Issues resolved in revision 3

All four Rev-2 Path-to-100 items are closed (enumerated above). No new issues introduced;
the diff is purely additive clarification.

## Remaining issues

No gate-blocking or specificity issues remain. Only the single cosmetic Path-to-100 nit
below.

## Scope Check

Unchanged from Rev 2 and still adequate.
- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` reports all
  Required Actions DONE and zero open defects.
- **Backlog items in scope but not addressed:** None mis-scoped. Addresses the in-progress
  item (`BACKLOG.md:9`, `[/]`); the three `- [ ]` items (native SwiftUI, offline-HTTPS
  helper, Node 24 bump) are independent subsystems correctly deferred.
- **Integration points analyzed:** Yes — §7's six contracts are unchanged.
- **Alternatives considered:** Yes — §4 unchanged.
- **Score cap applied:** None.

## Flaws of Commission

No flaws of commission identified. The v10 diff adds no logic — only documentation of
already-specified behavior. The inline `?.scanBlipEnabled === true` coercion is correct.

## Flaws of Omission

No gate-blocking omissions. One cosmetic residue (Path-to-100): the plan does not explicitly
state that `unlockFromGesture()` is idempotent across the multiple roster selections that
occur in a real session — the Phase-2 contract implies a second call on an already-`running`
context simply re-marks unlocked (a safe no-op), but this is left inferable rather than stated.

## Regressions

No regressions identified. The v10 changes are documentation-only relative to v9; artifact-size
budget, `onSelect`/visit-id semantics, the `RESULT` transition, and camera privacy are all
unchanged from the Rev-2 analysis.

## Why 99 and not 100

The one remaining gap is the unstated idempotency of `unlockFromGesture()` across repeated
selections (Flaws of Omission). It is inferable from the Phase-2 state contract and is
behaviorally safe as written, so it does not affect implementation correctness — but a
flawless plan would state it in one line. Everything the previous revisions flagged is now
resolved.

## Path to 100

- State in the Phase-2 controller contract that `unlockFromGesture()` is idempotent: a call
  on an already-unlocked, `running` context re-marks unlocked without a redundant `resume()`,
  so the multiple selections in a normal session incur at most one context creation and no
  churn (the §8 "Multiple rapid selections" bullet covers cue-node reuse but not unlock
  idempotency).

## Summary

Plan v10 is approved at 99/100. This revision folded in every Rev-2 Path-to-100 item —
e2e mock initial state pinned to `suspended`, the ms→seconds `durationSeconds` conversion
stated, the admin inline-normalization decision made explicit, and the interrupted-cue skip
tradeoff documented — with no new issues. Only a one-line idempotency footnote separates it
from 100. Loop remains **State 2 — implement the approved plan**; the plan is the contract
against which implementation will be audited.

---

## Plan Critique — Revision 2

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `d79f742`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v9
**Score:** **97 / 100** (previous: 93 — Rev 1)
**Status:** APPROVED — all three Rev-1 gate-blockers resolved; all five Rev-1 Path-to-100 items folded in.

Plan v9 clears the ≥95 gate. The single focused revision pass closed every gate-blocking
issue from Rev 1 **and** the entire Path-to-100 list. The plan is now implementation-ready:
a competent developer could author every enumerated unit/e2e test and wire every module
without an architectural question. It stays correctly scoped to the one in-progress backlog
item, keeps the feature dependency-free and default-off, and preserves the flagship
camera-privacy posture (`{ audio: false }`, no `MediaRecorder`/`captureStream`).

Every fix was verified against source:
- `mountAdmin(root, { store, onRosterChanged, onClose })` at `src/screens/admin.mjs:31` —
  the new `audioSettings`/`onAudioSettingsChanged` params are net-new; the v9 `onAdminHold`
  snippet (`IMPLEMENTATION_PLAN.md:349-363`) now shows the updated `mountAdmin(...)` call.
- `.merge-panel` (`admin.mjs:43`) and `.admin-grid` (`admin.mjs:49`) both exist — the v9
  insertion point "after `.merge-panel` and before `.admin-grid`" (line 406) is concrete.
- `handleListClick` → `onSelect(...)` is synchronous from a trusted `click`
  (`roster.mjs:146-150`); `scan.mjs` `onDone` fires from a `setTimeout` timer — unlock-on-
  selection / play-on-scan-complete is the correct model.
- Build transform accepts named imports, rejects side-effect imports (`build.mjs:64-76`);
  `audio.mjs` imports `{ AUDIO }` only. Inserting `src/lib/audio.mjs` immediately after
  `src/config.mjs` in the `modules` array (`build.mjs:7-20`) satisfies its only dependency.
- `SCAN_MS: 4500` (`config.mjs:3`) confirms the ~4.5 s unlock→playback gap that motivated
  the playback-path resume (Rev-1 issue #4).

## Issues resolved in revision 2

1. **Availability detection vs. `audioContextFactory` — RESOLVED (was BLOCKING #1).** Phase 2
   now states one model unambiguously: "Availability is factory-based: the controller is
   potentially available when `audioContextFactory` is a function. The default factory
   resolves `globalThis.AudioContext || globalThis.webkitAudioContext` and throws when
   neither constructor exists; injected mock factories are fully testable without also
   stubbing `globalThis`" (lines 282-286). §8 is reconciled: "the default `audioContextFactory`
   throws on first construction when neither … exists. Injected factories are treated as the
   availability source for tests" (lines 498-501). The Phase-2/§10 unit tests are now
   authorable exactly as enumerated.

2. **app→admin wiring — RESOLVED (was #2).** The `onAdminHold` snippet (lines 349-363) now
   shows `mountAdmin(root, { store, audioSettings: store.loadAudioSettings(),
   onAudioSettingsChanged: updateAudioSettings, onRosterChanged, onClose })` — the settings
   path is connected end-to-end.

3. **`mountAdmin` default/guard — RESOLVED (was #3).** The signature now defaults
   `audioSettings = { scanBlipEnabled: false }` and the body "Normalize the received
   audioSettings to `{ scanBlipEnabled: boolean }` before any dereference so direct mounts
   or omitted params default off instead of throwing" (lines 383-396). Cannot throw on a
   missing param.

4. **Playback-path resume for iOS auto-suspend — RESOLVED (was Path-to-100 #4).** §4.2, the
   Phase-2 controller contract (lines 294-296), and §8 (lines 507-511) now specify a guarded
   **non-awaited** `context.resume()` inside `playScanBlip()` when an already-unlocked context
   is `suspended`/`interrupted`, skipping the current cue and allowing a later scan to play —
   correctly gated on prior trusted unlock so it cannot become autoplay-on-boot.

5. **§3-diagram vs §6 ordering — RESOLVED (was #5).** Both now pin the same canonical order:
   §3 diagram (lines 64-71) shows `create visit id` → `audio.unlockFromGesture()` →
   `mountScan()`, and §6 `onSelect` (lines 337-346) reads "Create the visit id first as today,
   then call `audio.unlockFromGesture()` … before `setState('SCAN')`."

6. **Exact AudioParam automation — RESOLVED (Path-to-100).** §4.3 (lines 132-138) now gives
   the literal call sequence: `frequency.setValueAtTime(880, now)` →
   `linearRampToValueAtTime(1320, now + durationSeconds/2)`, `gain.setValueAtTime(0.045, now)`,
   `gain.setTargetAtTime(0, now, SCAN_BLIP_RELEASE_SECONDS)`, `start(now)`,
   `stop(now + durationSeconds)` — the §10 "exact automation sequence from §4.3" unit assertion
   (line 561) now has an unambiguous target.

7. **e2e unlock-vs-playback resume distinction — RESOLVED (Path-to-100).** §10 (lines 590-593)
   states the mock "distinguishes unlock from playback by counting `resume()` before the first
   oscillator creation as unlock-phase and counting `resume()` after that point as
   playback-phase" — the "one unlock/resume attempt, zero playback-path resume" assertions are
   now precise.

## Remaining issues

All Rev-1 issues are closed. Only the three minor nits in Path to 100 remain — none blocks
approval or implementation.

## Scope Check

- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` reports all
  Required Actions #1–#8 DONE and zero open defects.
- **Backlog items in scope but not addressed:** None mis-scoped. Addresses the in-progress
  item (`BACKLOG.md:9`, `[/]`). The three remaining `- [ ]` items (native SwiftUI,
  offline-static-HTTPS helper, Node 24 bump) are independent subsystems correctly deferred.
- **Integration points analyzed:** Yes — §7 enumerates six contracts, each with failure mode
  and migration path.
- **Alternatives considered:** Yes — §4 justifies oscillator synthesis over `<audio>`,
  boolean-only persistence over a settings object, and no runtime deps over Tone.js/Howler.js.
- **Score cap applied:** None. Scope is adequate.

## Flaws of Commission

No flaws of commission identified. The one true commission flaw from Rev 1 (the
availability/factory conflict) is resolved. Config constants, storage-key versioning,
per-cue node creation, `dispose()` ownership, and build-order placement are all correct.

## Flaws of Omission

Only the two minor omissions below (both Path-to-100), neither gate-blocking:
1. The e2e mock's **initial context state** is not pinned. The "one unlock/resume attempt"
   assertion (§10, line 591; Phase 4 step 6, line 445) is only correct if the mocked
   `AudioContext` starts `suspended` (as real browsers do) so `unlockFromGesture()` calls
   `resume()`; if the mock started `running`, the Phase-2 contract "if state is `running`, it
   marks unlocked" (line 291) means unlock does **not** call `resume()` and the counter stays
   0. A competent implementer will use a suspended mock, but the plan should say so explicitly.
2. Whether `mountAdmin` imports `store.normalizeAudioSettings` or normalizes inline is left
   open (the default param + inline boolean coercion is sufficient, so this is cosmetic).

## Regressions

No regressions identified. Artifact-size budget holds (added module < 3 KB gzip, §9, well
within the ≤750 KB gzip / ≤1.2 MB budget at `build.mjs`); `onSelect`/visit-id semantics and
the `RESULT` transition are preserved because all public audio methods catch and return
booleans; camera privacy (`{ audio: false }`) is kept and the e2e probe is extended, not
replaced.

## Why 97 and not 98

One small specificity gap keeps it out of the 98 band: the e2e mock's initial context state
(`suspended`) is load-bearing for the "one unlock/resume attempt" assertion but is not stated
(Omission #1). It is inferable and mechanically trivial, so it does not block approval — but a
98-grade plan would pin it. Everything else is either resolved or genuinely cosmetic.

## Path to 100

- Pin the e2e mock's initial context state to `suspended` so the unlock-phase `resume()`
  assertion is unambiguous (Omission #1).
- State the ms→seconds conversion for `durationSeconds` (from `SCAN_BLIP_DURATION_MS: 90`)
  used in the `scheduleBlip` `now + durationSeconds/2` / `stop(now + durationSeconds)` math.
- Say whether `mountAdmin` normalizes via `store.normalizeAudioSettings` or inline
  (Omission #2).
- Acknowledge that on a context that is `interrupted` at the moment of a scan completion, the
  cue for *that* scan is skipped (resume is non-awaited) and only a subsequent check-in will
  play — a minor effectiveness footnote, already the documented tradeoff.

## Summary

Plan v9 is approved at 97/100. The revision resolved all three ≥95 gate-blockers and folded
in every Rev-1 Path-to-100 item — factory-based availability, connected app→admin wiring,
guarded `mountAdmin` default, playback-path resume for the iOS auto-suspend case, reconciled
unlock/visit-id ordering, exact AudioParam automation, and a precise e2e unlock-vs-playback
resume distinction. Only three cosmetic nits remain (e2e mock initial state, ms→s conversion,
admin normalization mechanism), none blocking. Loop advances **State 1 → State 2 — implement
the approved plan.** The plan is now the contract against which implementation will be audited.

---

## Plan Critique — Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `c6c9151`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v8
**Score:** **93 / 100** (first review of the cycle-4 plan)
**Status:** NOT APPROVED — three mechanically-fixable gaps below the gate.

Plan v8 is a strong, well-scoped opening draft for the optional scan "blip" audio cue.
It correctly isolates Web Audio behind a pure adapter (`src/lib/audio.mjs`), keeps the
feature dependency-free and default-off, gates unlock on the existing trusted
roster-selection gesture, and preserves the flagship camera-privacy posture
(`{ audio: false }`, no `MediaRecorder`/`captureStream`). Scope is correct — it addresses
the one in-progress backlog item and defers the three unrelated subsystems. It falls just
short of the ≥95 gate on one genuine feasibility/testability gap in the core module plus
two smaller specificity gaps in the app/admin wiring.

Every factual claim about the current code was verified against source:
- `mountRoster` invokes `onSelect` synchronously from a trusted `click` listener
  (`src/screens/roster.mjs:146-151`) — the §4.2/§7.3 gesture-unlock path is valid.
- `mountScan`'s `onDone` fires from a `setTimeout` (`src/screens/scan.mjs:62`), **not** a
  gesture — so playback-after-unlock (§4.2) is the correct model.
- `mountAdmin` currently takes `{ store, onRosterChanged, onClose }`
  (`src/screens/admin.mjs:34`); the plan's added params are net-new.
- The build transform only supports **named** imports and rejects side-effect imports
  (`scripts/build.mjs:64-76`); `audio.mjs` imports `{ AUDIO }` only — compatible.
- `namespaceFor('src/lib/audio.mjs')` = `src_lib_audio` and `namespaceFor('src/app.mjs')`
  = `src_app` — the Phase-4 build-test alias assertions name the right namespaces.
- Placing `src/lib/audio.mjs` immediately after `src/config.mjs` in the `modules` array
  (`scripts/build.mjs:7-21`) satisfies its only dependency (config) before it runs.

## Remaining issues

1. **Availability detection vs. the injected `audioContextFactory` is ambiguous and
   internally inconsistent (BLOCKING).**
   Phase 2 documents `audioContextFactory` as the test-injection seam
   (`IMPLEMENTATION_PLAN.md:236`), yet §8 (line 448) and the Phase-2 contract (lines
   262-264) say `createScanAudioController()` "detects no `AudioContext` or
   `webkitAudioContext`, marks unavailable" — i.e. detection keys off `globalThis`. If
   availability is derived from `globalThis`, then a unit test that injects a mock
   `audioContextFactory` **without** also stubbing `globalThis.AudioContext` is marked
   unavailable and the injected factory is never called — which makes the documented seam
   non-functional and directly breaks the Phase-2 / §10 unit tests ("enabled controller
   unlocks a running context", "suspended context calls `resume()`", "unavailable
   constructor returns false"). The two mechanisms as written conflict.
   *Fix:* Pick one detection model and state it explicitly. Cleanest: availability is a
   property of the **factory** — `available` is true when `audioContextFactory` is a
   function (the default factory internally resolves `globalThis.AudioContext ||
   webkitAudioContext` and the controller marks unavailable if construction throws on
   first use inside try/catch). Then the "unavailable" unit test injects a factory that
   throws (or a default factory with both globals deleted), and the "running/suspended"
   tests inject a working mock factory — no `globalThis` stubbing required. Update §8's
   "detects no `AudioContext`" wording to match.

2. **The app→admin wiring for audio settings is defined but never shown being connected
   (specificity).**
   Phase 3 defines `updateAudioSettings` (lines 298-305) and an admin signature that takes
   `audioSettings` + `onAudioSettingsChanged` (lines 334-340), but the app.mjs snippet
   (lines 288-329) does not show the `mountAdmin(...)` call — currently
   `{ store, onRosterChanged, onClose }` at `src/screens/admin.mjs:34` / `src/app.mjs:47`
   — being updated to pass `audioSettings: store.loadAudioSettings()` and
   `onAudioSettingsChanged: updateAudioSettings`. As written, an implementer following the
   literal snippet would wire `updateAudioSettings` to nothing. Show the updated
   `mountAdmin` call inside `onAdminHold`.

3. **`mountAdmin` gains parameters with no specified default/guard (omission).**
   The new signature (lines 334-340) reads `audioSettings` and dereferences
   `audioSettings.scanBlipEnabled`. If `audioSettings` is ever `undefined` (a direct
   mount, or a future call site that forgets it) this throws and takes down the admin
   dialog. Specify a default — `audioSettings = { scanBlipEnabled: false }` — or normalize
   it through the store's `normalizeAudioSettings` at the top of `mountAdmin`.

4. **No re-`resume()` attempt in the playback path; likely silent on the primary target
   (omission / effectiveness).**
   The controller deliberately skips playback when the context is `suspended`/`interrupted`
   (lines 268-269, 453-457). But there is a ~4.5 s gap between the unlock gesture
   (`SCAN_MS`, `src/config.mjs:3`) and the `playScanBlip()` call, and iOS/iPadOS Safari —
   the stated kiosk target — routinely transitions an unlocked context to
   `interrupted`/`suspended` during that window. With skip-only behavior the cue will
   frequently never fire on exactly the device this feature targets. Since the context was
   already user-unlocked earlier in the session, a **non-awaited** `context.resume()`
   inside `playScanBlip()` before scheduling (still wrapped in try/catch, still
   degrading silently if it rejects) is generally permitted post-unlock and would make the
   cue reliable. At minimum, acknowledge the tradeoff explicitly; preferably add the guarded
   resume attempt.

5. **§3 flow diagram and §6 `onSelect` disagree on ordering (cosmetic).**
   The §3 diagram (lines 64-71) shows `unlockFromGesture()` → `create visit id` →
   `mountScan()`, while the §6 `onSelect` comment (lines 307-316) preserves visit-id
   creation and only requires the unlock call "before `setState('SCAN')`" without pinning
   its position relative to visit-id creation. Harmless, but state one canonical order.

## Scope Check

- **Audit findings in scope but not addressed:** None. `CONSOLIDATED_AUDIT.md` (v15)
  reports all Required Actions #1–#8 DONE and **zero open defects**. Nothing is left
  unaddressed for this plan to pick up.
- **Backlog items in scope but not addressed:** None mis-scoped. This plan addresses the
  in-progress item ("Optional subtle scan blip audio", `BACKLOG.md:9`, `[/]`). The three
  remaining `- [ ]` items — native SwiftUI, offline-static-HTTPS helper, Node 24 bump —
  are independent subsystems correctly deferred (§2 Out of scope, lines 48-49).
- **Integration points analyzed:** Yes — §7 enumerates six contracts (admin→store,
  store→controller, selection→unlock, scan→result, build transform, privacy surface) each
  with failure mode and migration path.
- **Alternatives considered:** Yes — §4 justifies oscillator-synthesis over an `<audio>`
  asset, boolean-only persistence over a settings object, and no runtime deps over
  Tone.js/Howler.js.
- **Score cap applied:** None. Scope is adequate; the score reflects execution
  specificity, not scope.

## Flaws of Commission

1. The availability-detection / factory-injection conflict (Remaining issue #1) is the one
   true commission flaw — as written the two mechanisms contradict, and the described unit
   tests cannot be authored against the literal contract without resolving it.

No other flaws of commission identified: the config constants, storage-key versioning
(`checkin007.audio.v1`), per-cue node creation (one-shot sources), `dispose()` ownership
(close only self-created contexts), and the build-order placement are all correct.

## Flaws of Omission

1. Admin `audioSettings` default/guard missing (Remaining issue #3).
2. No playback-path re-`resume()` for the auto-suspend case on the target device
   (Remaining issue #4).
3. The plan does not state where in the admin panel the checkbox is inserted relative to
   the existing `.merge-panel` / `.admin-grid` DOM (`src/screens/admin.mjs:40-64`) — "near
   operational controls" (line 357) is directionally clear but not a concrete insertion
   point. Minor.

## Regressions

No regressions identified. Verified:
- Artifact-size budget: the added module is expected < 3 KB gzip (§9), well within the
  ≤750 KB gzip / ≤1.2 MB budget already enforced at `scripts/build.mjs:135-140`.
- `onSelect` gains `audio.unlockFromGesture()` but unlock failure is caught internally and
  must not block scan (§7.3) — selection/visit-id semantics preserved.
- `mountScan` `onDone` gains `audio.playScanBlip()` before `setState('RESULT')`; all
  public audio methods catch and return booleans (lines 274-275), so the RESULT
  transition and idempotent logging (`src/app.mjs:66-75`) are unaffected.
- Camera privacy: §2/§6/§7.6 keep `{ audio: false }` and extend (not replace) the existing
  privacy probes.

## Why 93 and not 94

The availability-detection ambiguity (#1) is not cosmetic — it sits in the core new module
and, as written, blocks the very unit tests the plan enumerates. Combined with the
unconnected app→admin wiring (#2) it means a competent developer following the literal
plan would produce a controller whose test seam does not work and an admin control wired to
nothing. Those two require a decision, not just judgment, which is what keeps this out of
the ≥95 band.

## Path to ≥95

Address all of the following in one revision pass:

1. **Resolve the availability/factory detection model (Remaining issue #1)** — pick the
   factory-based model, update the Phase-2 contract and §8 wording so the unit tests are
   authorable as described.
2. **Show the updated `mountAdmin(...)` call (Remaining issue #2)** passing `audioSettings`
   and `onAudioSettingsChanged` from within `onAdminHold`.
3. **Specify the `audioSettings` default/guard in `mountAdmin` (Remaining issue #3).**

Doing 1–3 clears the gate (expected ~96). Also folding in #4 and #5 would land 97–98.

## Path to 100

- Add the guarded non-awaited `resume()` in `playScanBlip()` for the iOS auto-suspend case,
  or explicitly document why skip-only is acceptable on the kiosk target (#4).
- Pin the checkbox's exact DOM insertion point in the admin panel (Omission #3).
- Reconcile the §3-diagram vs §6 unlock/visit-id ordering (#5).
- Specify the exact `AudioParam` automation for the 90 ms envelope (attack at
  `setValueAtTime`, release via `setTargetAtTime` with `SCAN_BLIP_RELEASE_SECONDS`, and the
  880→1320 Hz sweep via `setValueAtTime`/`linearRampToValueAtTime`) so the "sets configured
  frequencies/gain … schedules start/stop exactly once" unit assertion (§10, lines 504-506)
  has an unambiguous target — the plan names the config values but not the exact call
  sequence.
- State how the e2e mock distinguishes an "unlock/resume attempt" from later calls so the
  "one unlock/resume attempt" assertion (§6 Phase 4, line 396) is precise.

## Summary

A genuinely strong first-draft plan — correct scope, clean adapter isolation, privacy
posture intact, alternatives and integration well documented. It is three
mechanically-fixable changes away from approval: resolve the availability-vs-factory
detection model, connect the app→admin audio-settings wiring in the snippet, and give
`mountAdmin`'s new `audioSettings` param a default. Not approved at 93; a single focused
revision should clear ≥95.
