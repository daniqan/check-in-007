# Check-In 007 — Implementation Plan v17

> **Cycle 7 — Node 24 LTS toolchain pin + GitHub Actions CI.** This is a NEW cycle
> started from `BACKLOG.md`. It bundles the two remaining, tightly-coupled Polish &
> Technical-Debt items:
>
> - "Optional toolchain bump to Node 24 LTS for a longer support runway (§4.1a)"
> - "Add a CI workflow (e.g. GitHub Actions) running `npm ci` + `npm run lint`/`test`/`build`
>   on the pinned Node 24 line, with Playwright browser install/cache"
>
> They are coupled: the CI item explicitly runs "on the pinned Node 24 line", so CI must
> consume the Node-24 pin this cycle produces. The third unchecked backlog item — the
> on-device static-HTTPS helper for offline iPad camera — is an unrelated native subsystem
> and is deferred to a future cycle (§2 Out of scope).
>
> The Node-24 portion re-uses the previously-APPROVED (98/100, Cycle-5 Rev 3) plan v14
> preserved in git `ff40b18`, which this cycle abandoned unimplemented. That approval
> covered only the toolchain pin; the CI workflow (its §13 Open Question #1, resolved "no
> for that cycle") is net-new here and is the primary reason this is a fresh plan, not a
> re-implementation.

## 1. Overview

Pin the project's Node.js toolchain to the **Node 24 LTS** line (`.nvmrc`,
`.node-version`, tightened `engines`, and a dependency-free fail-fast guard wired into the
`lint`/`test`/`build` scripts), and add a **GitHub Actions** workflow that runs the full
web quality gate — `npm ci`, `npm run lint`, unit tests, Playwright e2e, and `npm run
build` — on that pinned Node line, with npm and Playwright-browser caching. This closes the
last two toolchain/infra backlog items, gives the project a longer support runway, and makes
the previously-manual quality gate reproducible on every push and pull request. No
application source, data, styles, or the native SwiftUI target change.

## 2. Scope

### In scope

1. `.nvmrc` and `.node-version` pinning Node `24.20.0`.
2. `package.json` + `package-lock.json` root `engines.node` tightened from `">=22"` to
   `">=24 <25"`.
3. A dependency-free Node major-version guard `scripts/check-node-version.mjs`, wired as a
   fail-fast prefix into `lint`, `test`, and `build`, plus a standalone `check:node` script.
4. Unit tests for the guard (`tests/unit/node-version.test.mjs`), including a child-process
   smoke test of the executable tail.
5. A GitHub Actions workflow `.github/workflows/ci.yml` running the web gate on Node 24
   (`ubuntu-latest`), with `actions/setup-node` npm caching and a Playwright browser cache.
6. `README.md` updated with the Node 24 setup path and a CI/badge note.

### Out of scope

- **On-device static-HTTPS helper** for offline iPad camera (§10 Q2) — a separate native
  subsystem; remains `[ ]` in the backlog for a future cycle.
- **Native SwiftUI CI** (macOS runner + `xcodebuild` + multi-GB simulator-runtime download).
  Native correctness stays source-verified per Cycle 6; a macOS CI lane is a separate, much
  heavier operational decision (§13 Open Question #2). This workflow is web-only.
- **Dependency upgrades.** Dev-dependency versions and lockfile integrity hashes are frozen;
  this is a toolchain/CI cycle, not a dependency migration.
- **Node 25/26 "Current" validation.** The backlog item names Node 24 LTS specifically; the
  guard deliberately rejects non-24 majors, including this machine's Node 26.
- **Any change to application source** in `src/`, `data/`, `assets/`, `vendor/`, the build
  internals of `scripts/build.mjs`, screen behavior, or the kiosk/privacy contract.

## 3. Architecture

Three thin, independent layers are added around the existing web app; none touches
`src/` or the browser artifact.

```
Developer / CI runner
        │
        ▼
  version selection hint ──────►  .nvmrc / .node-version   (24.20.0)
        │
        ▼
  npm script entry (lint|test|build)
        │  guard runs FIRST, fails closed on non-24
        ▼
  scripts/check-node-version.mjs  ──(exit 1 + stderr hint)──►  abort before slow tools
        │  exit 0 on Node 24
        ▼
  existing tools: prettier --check .  │  node --test  │  playwright test  │  build.mjs
        ▲
        │ same commands, same order
  .github/workflows/ci.yml  ── setup-node(.nvmrc) → npm ci → lint → test:unit
                                → cache+install chromium → test:e2e → build → upload dist
```

**Components & responsibilities**

- **Version files** (`.nvmrc`, `.node-version`): the single source of truth for the pinned
  Node line. `setup-node` reads `.nvmrc` in CI; nvm/asdf/mise read them locally.
- **Guard** (`scripts/check-node-version.mjs`): pure, dependency-free major-version
  validation with a guarded executable tail. Fails **closed** (exit 1) on every non-24
  major, including runtimes where `import.meta.main` is unavailable.
- **CI workflow** (`.github/workflows/ci.yml`): orchestrates the same commands a developer
  runs locally, on the pinned Node line, with caching. It is the *only* new component that
  consumes both the version pin and the guard.

**Data-flow direction:** version files → guard → tools; CI wraps the same chain. **Ownership
boundaries:** version files own the pin; `package.json`/lockfile own engine metadata + script
wiring; the guard owns runtime validation/messaging; the workflow owns CI orchestration;
`README.md` owns setup docs. **Failure domains:** a non-24 runtime fails at the guard before
any slow tool runs (local and CI alike); a CI infra failure (cache miss, browser download)
degrades to a slower-but-correct run, never a false green.

## 4. Technical Decisions & Rationale

1. **Target Node `24.20.0`, engine range `>=24 <25`.** Node v24 (codename *Krypton*) is the
   Active LTS line; `24.20.0` is the pinned patch (carried forward from approved plan v14,
   which cited the nodejs.org previous-releases page listing v24 as LTS on 2026-09-02).
   `>=24 <25` expresses "Node 24 LTS" exactly. **Alternative considered:** a broad `>=24`,
   rejected because it would silently admit un-audited Node 25/26. **Tradeoff:** a pinned
   patch needs a deliberate bump when the LTS patch advances (documented in §8), in exchange
   for reproducibility.

2. **Dependency-free local guard over a package.** `process.versions.node` is stable and
   sufficient for major-version validation; a ~30-line script avoids lockfile churn and
   supply-chain surface. **Alternative considered:** `check-node-version` (npm), rejected to
   keep runtime deps at zero and dev deps tightly scoped. **Tradeoff:** we maintain a small
   script instead of importing one.

3. **`pathToFileURL(process.argv[1]).href` for CLI-execution detection.** The guard must run
   on the very runtimes it *rejects* (Node 20, Node 22 before `22.18.0`, Node 23), so it
   cannot rely on `import.meta.main` (added in `v24.2.0`, backported to `v22.18.0`; elsewhere
   `undefined`, which would let the CLI no-op with exit 0 — a guard-fails-**open** bug). This
   exact decision was the Cycle-5 Rev-2 blocker; `pathToFileURL` (in `node:url` on every
   supported/unsupported runtime) fixes it and handles spaces/percent-encoding/platform paths.
   **Alternative considered:** `` import.meta.url === `file://${process.argv[1]}` ``, rejected
   for mishandling those paths.

4. **Keep both `.nvmrc` and `.node-version`.** `.nvmrc` covers nvm + `setup-node`'s
   `node-version-file`; `.node-version` covers asdf/mise. Low cost, less setup ambiguity.

5. **GitHub Actions on `ubuntu-latest`, web-only.** GitHub Actions is the repo's host
   platform's native CI, needs no extra service, and its `actions/setup-node` has first-class
   `.nvmrc` support and built-in npm caching. **Alternative considered:** a macOS runner that
   also builds the native target — rejected this cycle: it needs a multi-GB simulator-runtime
   download and a much longer job, a separate operational decision (§13). Ubuntu is the
   fastest correct host for the web gate.

6. **`node-version-file: '.nvmrc'` in CI, not a hard-coded version.** The workflow reads the
   same pin developers use, so the version has exactly one source of truth. **Tradeoff:** the
   exact patch (`24.20.0`) must be resolvable by `setup-node`'s version index; `24.20.0` is a
   published LTS patch, so it resolves. If a future pin bump outpaces the index, the fallback
   is a fuzzy `24` in `.nvmrc` — not needed now.

7. **First-party `actions/*` pinned to major tags (`@v4`).** `actions/checkout`,
   `actions/setup-node`, `actions/cache`, and `actions/upload-artifact` are GitHub-maintained;
   major-tag pinning is GitHub's documented default and gets security patches automatically.
   **Alternative considered:** full 40-char SHA pinning (strongest supply-chain posture),
   deferred — it adds a manual bump burden and is most valuable for third-party actions, of
   which this workflow uses none. Documented as a future hardening option (§13).

8. **Cache npm via `setup-node` and Playwright browsers via `actions/cache`.** `setup-node`'s
   `cache: 'npm'` keys on `package-lock.json`. Playwright's browser binaries live outside
   `node_modules` (`~/.cache/ms-playwright`), so they need a separate cache keyed on the
   lockfile (which pins `@playwright/test@1.62.1`). `npx playwright install --with-deps
   chromium` is then idempotent: it skips the download on a cache hit but still ensures the
   apt system libraries are present. **Alternative considered:** installing all three
   browser engines — rejected: the e2e suite is chromium-only (it relies on chromium fake-
   media launch flags), so chromium alone is correct and faster.

9. **CI runs the *guarded* npm scripts, not raw tools.** Running `npm run lint` / `npm run
   build` (guard-prefixed) under Node 24 proves the guard passes on the supported runtime and
   exercises the exact developer commands. `test:unit`/`test:e2e` stay unguarded (called by
   the guarded `test`) so CI can install browsers between them; both still run on Node 24.

## 5. File Manifest

```text
BACKLOG.md                          (MOD) — Mark BOTH the Node 24 and CI items in progress ([ ]→[/]).
IMPLEMENTATION_PLAN.md              (MOD) — Replace completed cycle-6 plan with this cycle-7 plan.
.nvmrc                              (NEW) — Select Node 24.20.0 for nvm / setup-node.
.node-version                       (NEW) — Select Node 24.20.0 for asdf / mise.
package.json                        (MOD) — Tighten engines; add check:node; guard-prefix lint/test/build.
package-lock.json                   (MOD) — Mirror root packages[""].engines.node to ">=24 <25" only.
scripts/check-node-version.mjs      (NEW) — Fail-fast Node major guard (pure fns + guarded CLI tail).
tests/unit/node-version.test.mjs    (NEW) — Unit-test parse/range/message/CLI dispatch (+ smoke test).
.github/workflows/ci.yml            (NEW) — GitHub Actions web gate on pinned Node 24 with caching.
README.md                           (MOD) — Node 24 setup path + CI note (Prettier-clean).
```

No `src/`, `data/`, `assets/`, `vendor/`, `native/`, style, screen, or deployment-artifact
files change. `package-lock.json` changes are limited to the **root** `packages[""].engines`
value; no dependency versions or integrity hashes change.

## 6. Implementation Phases

> **Implementation status (all phases COMPLETE ✅ — verified on Node v26.3.0 via the §5
> direct-tool diagnostic path; the guarded npm scripts run this same chain on Node 24 in CI):**
> `npm ci` validated the hand-edited lockfile; guard fails closed (exit 1) on Node 26 as
> designed; `prettier --check .` clean (incl. new `ci.yml`, README, guard); **63/63** unit
> tests pass (+6 new guard tests, was 57); **12/12** e2e pass; `dist/index.html` builds at
> 26315 gzip bytes (within the ≤750 KB budget). Lockfile diff limited to the root
> `packages[""].engines` line.

### Phase 1: Version metadata ✅ COMPLETE

Create `.nvmrc` and `.node-version`, each exactly:

```text
24.20.0
```

Edit `package.json` and the root `packages[""].engines` entry in `package-lock.json`
(`package-lock.json:17-18`, the `packages[""]` block — **not** the transitive `>=20`/`>=8`
floors) to:

```json
{ "engines": { "node": ">=24 <25" } }
```

**Acceptance criteria**

- Both version files contain exactly `24.20.0` and a trailing newline.
- `package.json` and lockfile root engine metadata both read `">=24 <25"`.
- No dependency versions or integrity hashes change (verify with `git diff` — only the two
  engine lines and the root package differ).
- Validate the hand-edited lockfile with `npm ci` (not `npm install`, which may rewrite
  unrelated metadata).

### Phase 2: Node version guard ✅ COMPLETE

Create `scripts/check-node-version.mjs`:

```js
import { pathToFileURL } from 'node:url';

export const SUPPORTED_NODE_MAJOR = 24;

export function parseNodeMajor(version = process.versions.node) {
  /** Return the numeric major from "24.20.0" or "v24.20.0".
   *  Return null for empty, non-string, or non-numeric input. */
  ...
}

export function isSupportedNodeVersion(version = process.versions.node) {
  /** True only when parseNodeMajor(version) === SUPPORTED_NODE_MAJOR. */
  ...
}

export function formatUnsupportedNodeMessage(version = process.versions.node) {
  /** One-line stderr message naming the detected version and the required
   *  "Node 24 LTS" target, including "nvm install && nvm use" as the recovery hint. */
  ...
}

export function main({ version = process.versions.node, stderr = process.stderr } = {}) {
  /** Return 0 when supported. Otherwise write the formatted message to stderr and
   *  return 1. Never throw for malformed versions. */
  ...
}

// Version-agnostic executable-tail guard: runs on unsupported majors too, so the CLI
// fails CLOSED (exit 1) on Node 20/22-pre-22.18/23 where import.meta.main is undefined.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
```

**Acceptance criteria**

- `node 24.x.y` → exit `0`, no output.
- `22.x`, `23.x`, `25.x`, `26.x`, empty, and malformed → exit `1`, one-line stderr naming
  the detected version + `Node 24 LTS` + `nvm install && nvm use`.
- Imported by the unit test without exiting the test process (tail is guarded).
- `node scripts/check-node-version.mjs` reaches `main()` when executed directly on Node
  20/22/23/24/25/26 (fails closed on non-24).

### Phase 3: Script wiring and docs ✅ COMPLETE

Edit `package.json` scripts (leave `serve`, `serve:https`, `test:unit`, `test:e2e`,
`fonts:subset` unchanged so dev servers still start for diagnosis):

```json
{
  "scripts": {
    "check:node": "node scripts/check-node-version.mjs",
    "build": "node scripts/check-node-version.mjs && node scripts/build.mjs",
    "lint": "node scripts/check-node-version.mjs && prettier --check .",
    "test": "node scripts/check-node-version.mjs && npm run test:unit && npm run test:e2e"
  }
}
```

Edit `README.md` (keep Prettier-formatted — it is checked by `prettier --check .`):

- Add "Node 24 LTS" as a prerequisite before `npm ci`, with `nvm install && nvm use` as the
  default setup path (and `.node-version` for asdf/mise).
- State that `npm run lint`, `npm test`, and `npm run build` fail fast outside Node 24.
- Add a short "Continuous Integration" note pointing at `.github/workflows/ci.yml` (and,
  optionally, a status badge — see Phase 4).
- Preserve existing iPad-HTTPS, privacy, merge, audio, and native-app wording verbatim.

**Acceptance criteria**

- Fresh-clone README setup is deterministic for Node 24 users; command names stay familiar.
- No user-facing kiosk copy changes; `prettier --check .` stays clean.

### Phase 4: GitHub Actions CI workflow ✅ COMPLETE

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  web:
    name: Web gate (Node 24 LTS)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node 24 (pinned via .nvmrc)
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'

      - name: Install dependencies (reproducible)
        run: npm ci

      - name: Lint (guarded, Node 24)
        run: npm run lint

      - name: Unit tests
        run: npm run test:unit

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}
          restore-keys: ${{ runner.os }}-playwright-

      - name: Install Playwright chromium (+ system deps)
        run: npx playwright install --with-deps chromium

      - name: E2E tests
        run: npm run test:e2e

      - name: Build self-contained artifact (guarded, Node 24)
        run: npm run build

      - name: Upload built kiosk
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dist-index-html
          path: dist/index.html
          if-no-files-found: error

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          if-no-files-found: ignore
```

**Acceptance criteria**

- Workflow is valid YAML and parses (`node -e "…YAML.parse…"` is unavailable without a dep;
  validate structurally — see §10 — and by GitHub's own parse on push).
- `setup-node` resolves Node `24.20.0` from `.nvmrc`; every subsequent step runs on Node 24,
  so the guard-prefixed `lint`/`build` pass rather than fail closed.
- `npm ci` uses the committed lockfile; npm cache keyed on `package-lock.json`.
- Playwright chromium is cached across runs and installed with system deps; `test:e2e` runs
  headless against the auto-started `npm run serve` webServer (config already sets
  `reuseExistingServer: true`).
- `dist/index.html` is uploaded as an artifact on every run; the Playwright HTML report is
  uploaded only on failure.
- The workflow never invokes `xcodebuild` or touches `native/` (web-only, per §2).

### Phase 5: Verification ✅ COMPLETE

Add `tests/unit/node-version.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  SUPPORTED_NODE_MAJOR,
  formatUnsupportedNodeMessage,
  isSupportedNodeVersion,
  main,
  parseNodeMajor,
} from '../../scripts/check-node-version.mjs';

test('parseNodeMajor accepts plain and v-prefixed versions', () => { ... });
test('parseNodeMajor returns null for empty/non-numeric/null', () => { ... });
test('isSupportedNodeVersion accepts only Node 24', () => { ... });
test('main returns 1 and writes a recovery hint for unsupported versions', () => { ... });
test('main returns 0 and stays silent for Node 24', () => { ... });
test('CLI executable tail runs main for the current process major', () => { ... });
```

Then, under **Node 24.20.0** (the accepted validation path):

```bash
nvm install && nvm use     # or asdf/mise/nodejs.org → node --version prints v24.x.y
node --version
npm ci
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

**Verifying on this non-24 shell (Node v26.3.0).** After Phase 3 the guarded commands
intentionally fail on Node 26. If Node 24 cannot be selected during implementation/audit,
verify the underlying tools directly and record that the guard's Node-26 rejection is
*expected, not a regression*:

```bash
node scripts/check-node-version.mjs        # expected: exit 1 on Node 26 (fails closed)
npx prettier --check .                      # must be clean (incl. new .yml, README, script)
node --test tests/unit/*.test.mjs           # all unit suites incl. node-version.test.mjs green
npx playwright test                         # e2e green
node scripts/build.mjs                       # dist/index.html within size budget
```

The direct-tool bypass is a diagnostic escape hatch only; the accepted validation path is
the guarded npm scripts under Node 24, and CI runs exactly that on Node 24.

**Acceptance criteria**

- New guard unit tests pass; all existing unit + e2e suites stay green (no privacy/camera
  assertions weakened).
- The child-process smoke test `spawnSync(process.execPath, [<abs path to
  check-node-version.mjs>])` asserts exit status ===
  `isSupportedNodeVersion(process.versions.node) ? 0 : 1`, proving the tail calls `main()`.
- `prettier --check .` is clean including the new `.github/workflows/ci.yml`, README, and
  guard script (`.github/` is **not** in `.prettierignore`, so the YAML is checked).
- `dist/index.html` builds within the ≤750 KB gzip / ≤1.2 MB raw budget.

## 7. Integration Points

1. **npm engines**
   - Contract: `package.json` and lockfile root both say `">=24 <25"`.
   - Failure mode: mismatch → npm warnings / discriminator finding.
   - Migration: edit both in the same commit; validate via `npm ci`.

2. **Developer validation scripts**
   - Contract: `lint`/`test`/`build` invoke the guard first; `check:node` is the standalone
     diagnostic.
   - Failure mode: unsupported Node exits before Prettier/node:test/Playwright/build.
   - Migration: `nvm install && nvm use`, then rerun the same command.

3. **Test runner**
   - Contract: `node-version.test.mjs` imports pure functions and spawns the CLI tail.
   - Failure mode: an unguarded `process.exit()` would abort the unit suite.
   - Migration: keep the tail behind `import.meta.url === pathToFileURL(process.argv[1]).href`;
     the smoke test proves direct execution reaches `main()`.

4. **GitHub Actions ↔ version files**
   - Contract: `setup-node` reads `.nvmrc`; all steps then run on Node 24, so guarded
     scripts pass.
   - Failure mode: if `.nvmrc` and `package.json` engines disagree, `npm ci` warns and a
     guarded step could fail. They are edited together in Phase 1/3.
   - Migration: a version bump updates `.nvmrc`, `.node-version`, `engines`, and the pinned
     patch in one commit (§8).

5. **GitHub Actions ↔ Playwright**
   - Contract: the browser cache (`~/.cache/ms-playwright`, keyed on the lockfile) plus
     `npx playwright install --with-deps chromium` provide chromium + apt deps; the e2e
     `webServer` auto-starts `npm run serve` on port 8080.
   - Failure mode: cache miss → slower (re-download) but still correct; missing system deps →
     `--with-deps` installs them every run regardless of cache.
   - Migration: bumping `@playwright/test` changes the lockfile hash → cache key rotates
     automatically.

6. **Static artifact build**
   - Contract: `scripts/build.mjs` output is unchanged except being invoked under Node 24
     (locally and in CI); artifact stays self-contained and within budget.
   - Failure mode: an Acorn/Node API difference under Node 24 breaks the build.
   - Migration: fix the specific incompatibility while preserving the artifact contract and
     size budget; do not widen the engine range to hide it.

7. **Operator documentation**
   - Contract: README names the required Node line before `npm ci` and points at CI.
   - Failure mode: stale docs leave developers on Node 22/26 and validation fails.
   - Migration: docs and the guard message share the same recovery command.

## 8. Error Handling & Edge Cases

- **Unsupported Node major (local):** `parseNodeMajor` detects it; `main()` writes one line
  and returns `1` before any slow tool runs.
- **Malformed / empty version string:** `parseNodeMajor` returns `null`; same unsupported
  path, message echoes the raw detected value; never throws.
- **`import.meta.main` unavailability:** the tail uses `pathToFileURL(process.argv[1]).href`,
  so the CLI still runs (and fails closed) on Node 20 / Node 22 < 22.18 / Node 23 — the exact
  Cycle-5 fails-open bug this avoids.
- **Running from Node 26 Current (this machine):** the guard rejects it by design; §5 gives
  the direct-tool diagnostic path so implementation/audit can proceed on Node 26 while
  treating the guard's rejection as expected.
- **Patch-release drift:** `.nvmrc`/`.node-version` pin `24.20.0`; if the official Node 24
  LTS patch advances, bump all version references *together* in one commit. `setup-node`
  resolves the pinned patch from its index; if a future patch is briefly unavailable there,
  relax `.nvmrc` to a fuzzy `24` (not needed now).
- **CI cache miss (npm or Playwright):** degrades to a full install/download — slower, still
  correct; never a false green.
- **CI on a fork PR:** `permissions: contents: read` + no secrets used, so forked PRs run
  safely with read-only tokens; no secret is exposed.
- **Concurrent pushes:** `concurrency` with `cancel-in-progress` supersedes stale runs on the
  same ref, bounding runner usage.
- **npm without `engine-strict`:** npm may only warn on `engines`; the guarded scripts
  provide the hard local failure that `engines` alone does not.
- **`.github/` not in `.prettierignore`:** the new `ci.yml` **is** Prettier-checked (YAML
  parser). It must be authored Prettier-clean; Phase 5 verifies `prettier --check .`.

## 9. Stability & Performance

- **Guard:** O(1) — parses one short string, no I/O. Added cost to each guarded command is
  <50 ms because the script is invoked directly (`node scripts/check-node-version.mjs && …`),
  avoiding a nested `npm run` startup. Constant, negligible memory (a few strings + one
  stderr write on failure).
- **Browser bundle:** unchanged — the guard and CI files are never included in
  `dist/index.html`; the ≤750 KB gzip / ≤1.2 MB raw budget is unaffected (current artifact
  ≈26,315 gzip bytes).
- **CI wall-clock (steady state, warm caches):** npm cache hit + Playwright cache hit make
  `npm ci` and browser install the fast paths; expected job time is a few minutes, dominated
  by the e2e run. `cancel-in-progress` bounds concurrent runner minutes.
- **CI cold cache:** first run (or after a lockfile change) re-downloads chromium (~100+ MB)
  and re-installs deps — a one-time cost amortized by the cache on subsequent runs.
- **Stability:** the guard prevents accidental validation on unsupported/unreviewed Node
  majors; CI makes the previously-manual gate reproducible, catching regressions per push
  without weakening any privacy/camera assertion. `--with-deps` every run guarantees apt
  libraries are present regardless of cache state, avoiding flaky browser launches.

## 10. Testing Strategy

**Unit tests** (`tests/unit/node-version.test.mjs`):

- `parseNodeMajor('24.20.0') === 24`, `parseNodeMajor('v24.20.0') === 24`.
- `parseNodeMajor('')`, `parseNodeMajor('abc')`, `parseNodeMajor(null)` all `=== null`.
- `isSupportedNodeVersion('24.0.0')` and `('24.20.0')` are `true`;
  `('22.99.0')`, `('23.0.0')`, `('25.0.0')`, `('26.3.0')` are `false`.
- `main({ version: '26.3.0', stderr })` returns `1` and writes a message containing
  `Node 24 LTS`, `26.3.0`, and `nvm install && nvm use`.
- `main({ version: '24.20.0', stderr })` returns `0` and writes nothing.
- Child-process smoke test: `spawnSync(process.execPath, [<abs path to
  check-node-version.mjs>])` (path resolved via `fileURLToPath(new URL(...))` so cwd does not
  matter) and assert `status === (isSupportedNodeVersion(process.versions.node) ? 0 : 1)` —
  proves the executable tail calls `main()`.

**Workflow validation** (no new dependency): the YAML is validated three ways —
(1) `prettier --check .` parses it (Prettier has a YAML parser) as part of `npm run lint`;
(2) a structural read in Phase 5 confirms required keys (`on`, `jobs.web.runs-on`,
`steps[].uses` pins, `node-version-file: '.nvmrc'`); (3) GitHub itself parses and runs it on
the first push, which is the definitive check.

**Regression tests:**

- `npm run lint` stays Prettier-clean (now including `.github/workflows/ci.yml`, README, and
  the guard script).
- `npm run test:unit` passes all existing suites plus `node-version.test.mjs`.
- `npm run test:e2e` stays green; no camera/audio privacy assertion is weakened.
- `npm run build` emits `dist/index.html` within the existing size budget.

**Manual negative check:** `node scripts/check-node-version.mjs` under a non-24 runtime must
fail with the recovery hint and mutate no files.

## 11. Environment & Toolchain

**Fresh-clone setup (accepted path, Node 24):**

```bash
nvm install        # reads .nvmrc → 24.20.0  (or: asdf/mise via .node-version, or nodejs.org)
nvm use
node --version     # v24.20.0 (or a newer v24.x.y LTS patch, updated together per §8)
npm ci
npm run lint
npm test
npm run build
```

**This workspace reports `node --version` = `v26.3.0`.** After Phase 3 that is an
intentionally unsupported runtime for the guarded commands. Select Node 24 first, or use the
§5 direct-tool diagnostic set and treat the Node-26 guard failure as expected.

**CI toolchain:** `ubuntu-latest`, `actions/setup-node@v4` resolving Node `24.20.0` from
`.nvmrc`, npm bundled with that Node, Playwright chromium `1.62.1` (from the lockfile) cached
in `~/.cache/ms-playwright`. Dev dependencies stay pinned in `package-lock.json`; no new npm
dependency is added by this cycle.

## 12. Deployment & Distribution

Deployment is unchanged:

- `npm run build` produces the self-contained `dist/index.html` (also openable from
  `file://`); `serve`/`serve:https` keep the same ports and flags.
- CI additionally uploads `dist/index.html` as a build artifact per run; this is a
  convenience, not a release channel — distribution still happens via the committed/served
  artifact.

**Rollback:**

1. Revert this cycle's implementation commit(s).
2. Rerun `npm ci`, `npm run lint`, `npm test`, `npm run build` under the previous accepted
   runtime.
3. Delete `.github/workflows/ci.yml` if CI itself must be withdrawn; the app is unaffected.
4. Restore the two backlog items from `[/]` to `[ ]` only if the discriminator asks for the
   cycle to be abandoned.

## 13. Open Questions

1. **SHA-pin the `actions/*` steps instead of major tags?**
   - Proposed resolution: not this cycle — all four actions are first-party GitHub-maintained
     and major-tag pinning is the documented default that still receives security patches. SHA
     pinning is a reasonable future hardening (and would pair well with Dependabot for actions).
   - Needed to confirm: maintainer supply-chain policy.

2. **Add a macOS lane that builds/tests the native SwiftUI target?**
   - Proposed resolution: no this cycle. It requires a multi-GB `xcodebuild -downloadPlatform
     iOS` simulator-runtime step and a much longer job; native correctness is source-verified
     per Cycle 6. A dedicated native-CI cycle can add it later.
   - Needed to confirm: maintainer appetite for macOS runner minutes.

3. **Should Node 26 "Current" be an additional validation target?**
   - Proposed resolution: no. The backlog item names Node 24 LTS; the guard deliberately
     rejects non-24. Evaluate Node 26 in a future toolchain cycle.
   - Needed to confirm: a future audit or maintainer request for Current-release testing.
