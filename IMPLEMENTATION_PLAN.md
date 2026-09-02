# Check-In 007 — Implementation Plan v12

> Cycle 5 backlog plan. Source item: `BACKLOG.md` Polish & Technical Debt item
> "Optional toolchain bump to Node 24 LTS for a longer support runway (§4.1a)", now
> marked in progress as `- [/]`.

## 1. Overview

This cycle moves the project from a broad Node `>=22` development floor to an explicit
Node 24 LTS toolchain. The app itself remains a static browser kiosk with no runtime
server dependency; this plan only affects local development, tests, build scripts, and
operator documentation. The goal is a reproducible maintenance baseline that avoids
accidentally validating the project only on newer Current releases.

## 2. Scope

### In scope

1. Add repository version files that select Node `24.20.0`, the latest Node 24 LTS shown
   on the official Node.js releases page on 2026-09-02.
2. Tighten `package.json` and `package-lock.json` engines from `>=22` to `>=24 <25`.
3. Add a dependency-free Node version check script with actionable failure output.
4. Wire the check into `lint`, `test`, and `build` so standard validation fails fast on
   unsupported Node majors.
5. Document the Node 24 requirement and supported install path in `README.md`.
6. Verify the current lint, unit, e2e, and build suites under Node 24.

### Out of scope

- Changing browser application behavior, kiosk UI, storage keys, roster/log formats, or
  the scan-audio implementation.
- Upgrading Playwright, Acorn, axe-core, http-server, Prettier, npm, or browser binaries.
- Adding CI workflow files where none currently exist.
- Supporting Node 26 Current as the primary validation target for this cycle.
- Native SwiftUI iPad work or the offline static-HTTPS helper.

## 3. Architecture

The project keeps the current static-build architecture. The only new component is a
small development guard that runs before existing validation commands.

```text
Developer shell
  -> version manager reads .nvmrc / .node-version
  -> npm install uses package/package-lock engines
  -> npm run lint|test|build
  -> npm run check:node
  -> scripts/check-node-version.mjs validates process.versions.node
  -> existing Prettier / node:test / Playwright / build flow
```

Ownership boundaries:

- `.nvmrc` and `.node-version` own the human/tool version selection hint.
- `package.json` and `package-lock.json` own npm engine metadata and script wiring.
- `scripts/check-node-version.mjs` owns local runtime validation and error messaging.
- `README.md` owns operator/developer setup instructions.
- Existing source modules in `src/`, tests, Playwright config, and build internals must
  remain behaviorally unchanged unless a Node 24 incompatibility is discovered during
  implementation.

Failure domains:

- If a developer runs validation under Node 22, 23, 25, 26, or any non-24 major, the
  guard exits with code `1` before slower checks start.
- If the version string is malformed or unavailable, the guard exits with code `1` and
  prints the detected value.
- If Node 24 reveals a latent test/build failure, fix the project code or tests to
  preserve existing behavior under Node 24; do not widen the engine range to hide it.

## 4. Technical Decisions & Rationale

1. **Target Node `24.20.0` and engine range `>=24 <25`.** The official Node.js releases
   page lists Node v24, codename Krypton, as LTS and identifies `v24.20.0` as the latest
   LTS release on 2026-09-02 (https://nodejs.org/en/about/previous-releases). The same
   page says production applications should use Active LTS or Maintenance LTS releases.
   A broad `>=24` range was considered, but it would silently admit Node 25/26+ before
   this project has audited them. `>=24 <25` expresses "Node 24 LTS" exactly.

2. **Use a local guard instead of adding a dependency.** `process.versions.node` is
   stable in Node and sufficient for major-version validation. Packages such as
   `check-node-version` were considered, but this repo has intentionally kept runtime
   dependencies at zero and dev dependencies tightly scoped; a 30-line script avoids
   lockfile churn and supply-chain surface.

3. **Keep dependency versions pinned.** `@playwright/test@1.62.1`, `acorn@8.18.0`,
   `axe-core@4.13.0`, `http-server@14.1.1`, and `prettier@3.9.6` already declare engine
   support compatible with Node 24 in `package-lock.json` (`@playwright/test` and
   `playwright` require `>=20`; `http-server` requires `>=12`; Prettier requires
   `>=14`). Upgrading them would conflate a toolchain bump with dependency migration.

4. **Keep both `.nvmrc` and `.node-version`.** `.nvmrc` covers nvm and many CI images;
   `.node-version` covers asdf and mise. A single file was considered, but maintaining
   both is low cost and reduces setup ambiguity across developer machines.

5. **Do not add CI in this cycle.** The repository has no `.github/` workflow today.
   Adding CI would be useful, but it is a separate operational change with secrets,
   runner, cache, and browser-install policy decisions that are outside this focused
   backlog item.

## 5. File Manifest

```text
BACKLOG.md                       (MOD) — Mark the Node 24 LTS toolchain backlog item in progress.
IMPLEMENTATION_PLAN.md           (MOD) — Replace completed cycle-4 plan with this cycle-5 plan.
.nvmrc                           (NEW) — Select Node 24.20.0 for nvm-compatible tooling.
.node-version                    (NEW) — Select Node 24.20.0 for asdf/mise-style tooling.
package.json                     (MOD) — Tighten engines and add check:node script wiring.
package-lock.json                (MOD) — Mirror the root package engine range.
scripts/check-node-version.mjs   (NEW) — Fail-fast Node major guard.
tests/unit/node-version.test.mjs (NEW) — Unit-test version parsing and supported range logic.
README.md                        (MOD) — Document Node 24 setup and validation expectations.
```

No `src/` files, data fixtures, styles, browser screens, or deployment artifacts are
planned to change.

## 6. Implementation Phases

### Phase 1: Version Metadata

Create `.nvmrc` and `.node-version`, each containing exactly:

```text
24.20.0
```

Modify `package.json` and the root `packages[""].engines` entry in `package-lock.json`:

```json
{
  "engines": {
    "node": ">=24 <25"
  }
}
```

Acceptance criteria:

- `npm install` and npm engine warnings reference Node 24 instead of Node 22.
- The lockfile root package metadata matches `package.json`.
- No dependency versions or integrity hashes change.

### Phase 2: Node Version Guard

Create `scripts/check-node-version.mjs`:

```js
export const SUPPORTED_NODE_MAJOR = 24;

export function parseNodeMajor(version = process.versions.node) {
  /**
   * Return the numeric major version from strings like "24.20.0" or "v24.20.0".
   * Return null for empty, non-string, or non-numeric input.
   */
  ...
}

export function isSupportedNodeVersion(version = process.versions.node) {
  /**
   * Return true only when parseNodeMajor(version) === SUPPORTED_NODE_MAJOR.
   */
  ...
}

export function formatUnsupportedNodeMessage(version = process.versions.node) {
  /**
   * Return a one-line stderr message naming the detected version and the required
   * "Node 24 LTS" target. Include "nvm install && nvm use" as the recovery hint.
   */
  ...
}

export function main({ version = process.versions.node, stderr = process.stderr } = {}) {
  /**
   * Return 0 when supported. Otherwise write the formatted message to stderr and
   * return 1. Do not throw for malformed versions.
   */
  ...
}
```

The executable tail must be guarded so unit tests can import the functions without
exiting the test process:

```js
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
```

Acceptance criteria:

- Node `24.x.y` exits `0`.
- Node `22.x`, `23.x`, `25.x`, `26.x`, empty strings, and malformed values exit `1`.
- Failure output is one line and names the detected version.

### Phase 3: Script Wiring And Docs

Modify `package.json` scripts:

```json
{
  "scripts": {
    "check:node": "node scripts/check-node-version.mjs",
    "build": "npm run check:node && node scripts/build.mjs",
    "lint": "npm run check:node && prettier --check .",
    "test": "npm run check:node && npm run test:unit && npm run test:e2e"
  }
}
```

Leave `test:unit`, `test:e2e`, `serve`, `serve:https`, and `fonts:subset` unchanged so
development servers can still be started for diagnosis, but documented validation uses
the guarded commands.

Modify `README.md`:

- Add Node 24 LTS as a prerequisite before `npm ci`.
- Add `nvm install && nvm use` as the default setup path.
- State that `npm run lint`, `npm test`, and `npm run build` fail fast outside Node 24.
- Preserve the existing iPad HTTPS and privacy wording.

Acceptance criteria:

- README setup from a fresh clone is deterministic for Node 24 users.
- Existing command names remain familiar.
- No user-facing kiosk copy changes.

### Phase 4: Verification

Add `tests/unit/node-version.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatUnsupportedNodeMessage,
  isSupportedNodeVersion,
  main,
  parseNodeMajor,
} from '../../scripts/check-node-version.mjs';

test('parseNodeMajor accepts plain and v-prefixed versions', () => { ... });
test('isSupportedNodeVersion accepts only Node 24', () => { ... });
test('main returns 1 and writes a recovery hint for unsupported versions', () => { ... });
```

Run under Node 24.20.0:

```bash
node --version
npm ci
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

Acceptance criteria:

- `node --version` prints `v24.20.0` or another `v24.x.y` LTS patch if the official
  installer advances before implementation.
- Unit tests include the new guard tests and all existing tests remain green.
- E2E tests remain green with the existing Playwright fake-camera launch flags.
- `dist/index.html` still builds under the existing gzip/raw byte budgets.

## 7. Integration Points

1. **npm engines**
   - Contract: `package.json` and `package-lock.json` both say `>=24 <25`.
   - Failure mode: mismatched metadata causes npm warnings or discriminator findings.
   - Migration path: update both files in the same implementation commit.

2. **developer validation scripts**
   - Contract: `lint`, `test`, and `build` invoke `check:node` first.
   - Failure mode: unsupported Node exits before Prettier, node:test, Playwright, or
     build work begins.
   - Migration path: developers run `nvm install && nvm use`, then rerun the same command.

3. **test runner**
   - Contract: `tests/unit/node-version.test.mjs` imports pure functions from the guard.
   - Failure mode: an unguarded `process.exit()` would abort the unit suite.
   - Migration path: keep CLI execution behind the `import.meta.url` check.

4. **static artifact build**
   - Contract: `scripts/build.mjs` output is unchanged except being invoked under Node 24.
   - Failure mode: Acorn or Node API behavior differences break the build.
   - Migration path: fix the specific incompatibility while preserving the classic
     self-contained artifact contract and size budget.

5. **operator documentation**
   - Contract: README install instructions name the required Node line before `npm ci`.
   - Failure mode: stale docs leave developers on Node 22/26 and validation fails.
   - Migration path: docs and guard message use the same recovery command.

## 8. Error Handling & Edge Cases

- **Unsupported Node major:** detected by `parseNodeMajor`; `main()` writes a one-line
  message and returns `1`.
- **Malformed version string:** parse returns `null`; response is the same unsupported
  path and includes the raw detected value.
- **Patch release drift:** `.nvmrc`/`.node-version` pin `24.20.0`; if the official Node 24
  LTS patch advances before implementation, use the newer `24.x.y` only if README,
  version files, and tests are updated together in the implementation commit.
- **Running from Node 26 Current:** guard fails by design even though the code may work;
  this prevents unreviewed Current-only behavior from becoming the validation baseline.
- **npm without engine-strict:** npm may only warn on engines, so guarded scripts provide
  the hard failure.
- **Direct `node scripts/build.mjs`:** still bypasses the guard. This is acceptable
  because documented validation uses `npm run build`; adding a hard import-level guard to
  every script would couple unrelated modules to toolchain policy.
- **CI or shell without nvm:** README also names `.node-version` so asdf/mise users can
  select the same version. Other installers may install Node 24 manually from nodejs.org.

## 9. Stability & Performance

- The guard is O(1): it parses a short version string once and does no filesystem or
  network I/O.
- Added runtime cost to guarded commands is below 50 ms on typical local machines because
  it starts a single Node process and exits before slower tools.
- No browser bundle bytes change; `scripts/check-node-version.mjs` is never included in
  `dist/index.html`.
- Memory use is constant and negligible: a few strings and one stderr write on failure.
- The existing build size limits remain `<=750 KiB gzip` and `<=1.2 MiB` raw HTML.
- Stability improves by preventing accidental validation on unsupported or unreviewed
  Node majors.

## 10. Testing Strategy

Unit tests:

- `parseNodeMajor('24.20.0') === 24`.
- `parseNodeMajor('v24.20.0') === 24`.
- `parseNodeMajor('')`, `parseNodeMajor('abc')`, and `parseNodeMajor(null)` return
  `null`.
- `isSupportedNodeVersion('24.0.0')` and `isSupportedNodeVersion('24.20.0')` return
  `true`.
- Node `22.99.0`, `23.0.0`, `25.0.0`, and `26.3.0` return `false`.
- `main({ version: '26.3.0', stderr })` returns `1` and writes a message containing
  `Node 24 LTS`, `26.3.0`, and `nvm install && nvm use`.
- `main({ version: '24.20.0', stderr })` returns `0` and writes nothing.

Regression tests:

- `npm run lint` remains Prettier-clean.
- `npm run test:unit` passes all existing unit suites plus `node-version.test.mjs`.
- `npm run test:e2e` remains green; no camera/audio privacy assertions are weakened.
- `npm run build` emits `dist/index.html` inside the existing size budget.

Manual negative check:

```bash
node scripts/check-node-version.mjs
```

When run under a non-24 local runtime, it must fail with the same recovery hint without
mutating files.

## 11. Environment & Toolchain

Fresh clone setup:

```bash
nvm install
nvm use
node --version
npm ci
npm run lint
npm test
npm run build
```

Expected version:

- Node: `v24.20.0` from `.nvmrc`/`.node-version`, or a newer official Node 24 LTS patch
  if the implementation deliberately updates all version references together.
- npm: the npm bundled with the selected Node 24 distribution; no separate npm pin in
  this cycle.

Current project dev dependencies remain pinned in `package-lock.json`.

## 12. Deployment & Distribution

Deployment remains unchanged:

- `npm run build` produces `dist/index.html`.
- `dist/index.html` remains self-contained and can still be opened from `file://`.
- `npm run serve` and `npm run serve:https` keep the same ports and http-server flags.

Rollback procedure:

1. Revert the implementation commit for this cycle.
2. Rerun `npm ci`, `npm run lint`, `npm test`, and `npm run build` under the previous
   accepted runtime.
3. Restore the backlog item from `[/]` to `[ ]` only if the discriminator asks for the
   cycle to be abandoned.

## 13. Open Questions

1. **Should this also add CI?**
   - Proposed resolution: no for this cycle. The repository has no workflow directory,
     and CI design is a separate operational decision.
   - Needed to confirm: maintainer preference for GitHub Actions or another runner.

2. **Should Node 26 Current be allowed as an additional validation target?**
   - Proposed resolution: no. The backlog item specifically names Node 24 LTS, and Node
     26 Current can be evaluated in a future toolchain cycle.
   - Needed to confirm: a future audit or maintainer request for Current-release testing.
