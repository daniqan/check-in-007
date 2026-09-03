# Check-In 007 — Web App Manifest / Standalone Start URL Plan v29 (Cycle 16)

## 1. Overview

Cycle 16 addresses the next unchecked backlog item: "Web app manifest / `start_url` for reliable standalone Add-to-Home-Screen installs." Cycle 15 already added content-hashed HTML artifacts and iOS scroll verification plumbing; this plan adds a manifest contract that lets iPadOS/Safari standalone installs launch to the intended kiosk URL instead of relying only on legacy meta tags. The work is deliberately limited to install metadata, build output, static serving, tests, and operator documentation; it does not add a service worker or change runtime check-in behavior.

Source trace:

- `BACKLOG.md` item: "Web app manifest / `start_url` for reliable standalone Add-to-Home-Screen installs..."
- Cycle 15 cache-busting output already present in `scripts/build.mjs`: `dist/index.html`, `dist/check-in-007.<hash>.html`, and `dist/check-in-007.manifest.json`.
- Current install metadata already present in `index.html` and built HTML: `mobile-web-app-capable`, `apple-mobile-web-app-capable`, status bar, and theme color.

## 2. Scope

### In scope

1. Add a source web app manifest file for the development/root app with app identity, `display: "standalone"`, `scope`, `start_url`, theme/background colors, orientation, and icon entries.
2. Add installable app icons sized for home-screen/splash-screen use, generated as committed source assets and referenced by the manifest.
3. Link the manifest from `index.html` and from the built single-file HTML.
4. Extend `scripts/build.mjs` so each build emits a generated manifest whose `start_url` points at the current content-hashed HTML artifact, keeping iPad standalone installs on a fresh URL after redeploy.
5. Preserve the existing machine build manifest `dist/check-in-007.manifest.json`; add the web app manifest under a distinct filename so automation cannot confuse the two.
6. Teach the static HTTPS helper to serve `.webmanifest` / manifest JSON and icon files with appropriate content types and existing `Cache-Control: no-store`.
7. Add unit and e2e coverage for manifest validity, manifest link placement, generated `start_url`, icon references, MIME handling, and no regression to the existing hashed HTML output.
8. Update README and verification docs with the Add-to-Home-Screen install/reinstall path and the expected relationship between hashed HTML and generated manifest.

### Out of scope

- Adding a service worker, offline cache, push notifications, background sync, or any runtime PWA lifecycle.
- Changing check-in state, guest data, camera handling, scan audio, admin export/merge behavior, iOS scroll probing, or native SwiftUI code.
- Claiming RA #14 resolved; real iPad/iOS Simulator touch-scroll verification remains separately required.
- Replacing the existing static HTTPS helper or changing its certificate/SAN behavior.
- Removing existing `apple-mobile-web-app-*` and `mobile-web-app-capable` meta tags. They stay as compatibility metadata beside the manifest.

## 3. Architecture

```text
assets/icons/
  check-in-007-icon.svg
  check-in-007-icon-192.png
  check-in-007-icon-512.png
        |
        v
manifest.webmanifest                 source/dev manifest
        |
        +--> index.html               dev/root link rel=manifest
        |
        +--> scripts/build.mjs        reads source manifest, rewrites start_url
                                      to ./check-in-007.<hash>.html, copies icons
                                      and writes dist/check-in-007.webmanifest
                                             |
                                             v
                                      dist/index.html
                                      dist/check-in-007.<hash>.html
                                      dist/check-in-007.webmanifest
                                      dist/assets/icons/*

scripts/lib/static-server.mjs
  serves .webmanifest as application/manifest+json
  serves icon assets with image/svg+xml / image/png
  preserves no-store and forbidden cert-cache protections
```

The source manifest supports local development from the repository root. The generated `dist/check-in-007.webmanifest` is the install contract for deployed kiosk artifacts and is derived from the exact hashed artifact name produced in the same build. The app remains a static document with no service worker, so stale-asset avoidance comes from URL identity plus `no-store`, not cache interception.

## 4. Technical Decisions and Rationale

### 4.1 Use a web app manifest with hashed `start_url`

Chosen: add a committed `manifest.webmanifest` for source/dev use and generate `dist/check-in-007.webmanifest` during builds with:

```json
{
  "id": "./",
  "name": "Check-In 007",
  "short_name": "Check-In 007",
  "start_url": "./check-in-007.<hash>.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#050505",
  "background_color": "#050505",
  "icons": []
}
```

Why: MDN describes the manifest as the install metadata browsers use for PWAs, including the URL opened from the home-screen icon, while `display: standalone` requests an app-like window without normal browser UI. Web.dev recommends linking one manifest from installable pages and including manifest identity, icons, and display metadata. A generated `start_url` tied to the current hashed HTML closes the gap left by Cycle 15: an iPad standalone icon can launch a fresh content URL instead of falling back to an older `index.html` URL.

Rejected alternatives:

- Static `start_url: "./index.html"`: simpler, but it does not use the already-built cache-busting artifact and can preserve stale standalone launches.
- Query-only `start_url`: less durable for operator workflows than the existing hashed filename convention.
- Service worker cache management: powerful but unnecessary for a kiosk that already ships as a single self-contained HTML document and would add a second cache invalidation surface.

Tradeoff: each build changes the generated manifest when the HTML hash changes. That is acceptable because `dist/` artifacts are generated together and served with `no-store`; source `manifest.webmanifest` remains stable for development.

References verified on 2026-09-03:

- MDN Web App Manifest: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- MDN `start_url`: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url
- MDN `display`: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display
- Web.dev Add a web app manifest: https://web.dev/articles/add-manifest
- Web.dev Web app manifest guide: https://web.dev/learn/pwa/web-app-manifest

### 4.2 Keep the machine build manifest separate

Chosen: keep `dist/check-in-007.manifest.json` as the existing machine-readable build metadata and add `dist/check-in-007.webmanifest` for browser install metadata.

Why over replacing the JSON file: `tests/unit/build.test.mjs`, README, CI artifact upload, and any downstream operator tooling already rely on `check-in-007.manifest.json` containing `{ artifact, sha256, gzipSize, byteSize }`. Browser install metadata has a different schema and purpose.

Tradeoff: there are two manifest-like files in `dist/`; names and tests must be explicit.

### 4.3 Commit source icons and copy them into `dist`

Chosen: create a simple branded SVG source icon plus generated PNG files at 192x192 and 512x512. The source manifest references the repository-root icon paths; the build copies the exact files into `dist/assets/icons/` and rewrites generated manifest icon `src` values to those relative dist paths.

Why: install manifests need icon metadata for home-screen/task-switcher/splash contexts. MDN and web.dev both document icon entries with `src`, `sizes`, `type`, and optional `purpose`. PNG files maximize compatibility; retaining SVG gives a human-editable source.

Rejected alternatives:

- Manifest without icons: browsers may still parse it, but installability checks and iOS/Android presentation are weaker.
- Data URLs inside the manifest: increases manifest size, complicates content-type checks, and is less conventional than static icon assets.

Tradeoff: the project gains small binary PNG assets. They are stable, deterministic, and outside the single-file HTML size budget because install metadata is only used in hosted/HTTPS flows.

### 4.4 No service worker in this cycle

Chosen: explicitly avoid registering a service worker.

Why: the kiosk already builds a self-contained HTML artifact and serves through a no-store static helper. A service worker would need install/activate/update/rollback policy, cache naming, cache eviction, and error recovery. That is disproportionate for the backlog item, whose trigger is standalone launch metadata rather than offline runtime caching.

Tradeoff: Add-to-Home-Screen installs still require network/local-host reachability to the kiosk host, matching the current offline-iPad-with-companion-host model.

### 4.5 Extend existing build and static-server helpers

Chosen: add pure functions to `scripts/build.mjs` for manifest generation and icon copying, and extend the MIME map in `scripts/lib/static-server.mjs`.

Why over new dependencies: the repo already uses dependency-free Node build/static helpers, Node 24, and unit tests around these scripts. Adding a PWA plugin would be heavier than a small deterministic manifest transform.

Tradeoff: the build script owns another artifact type. Focused unit tests will lock the schema and output paths.

Skeletal contracts:

```js
export function createWebAppManifest({
  sourceManifest,
  artifact,
  distIconBase = './assets/icons/',
}) {
  /** Returns a manifest object for dist.
      Rewrites start_url to `./${artifact}`.
      Rewrites icon src values to dist-relative paths.
      Throws when required members or icon entries are missing. */
  ...
}

export async function writeWebAppManifestArtifacts({
  sourceManifestPath,
  dist,
  artifact,
}) {
  /** Reads manifest.webmanifest, validates required members,
      writes dist/check-in-007.webmanifest, copies icon assets,
      and returns the generated manifest object. */
  ...
}
```

## 5. File Manifest

```text
BACKLOG.md                              (MOD) — mark the selected web app manifest/start_url item in progress
IMPLEMENTATION_PLAN.md                  (MOD) — replace Cycle-15 plan with this Cycle-16 contract
manifest.webmanifest                    (NEW) — source/dev web app manifest linked by root index.html
index.html                              (MOD) — add <link rel="manifest" href="./manifest.webmanifest">
assets/icons/check-in-007-icon.svg      (NEW) — editable branded icon source
assets/icons/check-in-007-icon-192.png  (NEW) — install icon referenced by source and dist manifests
assets/icons/check-in-007-icon-512.png  (NEW) — high-resolution install icon referenced by source and dist manifests
scripts/build.mjs                       (MOD) — generate dist/check-in-007.webmanifest and copy icon assets beside hashed HTML
scripts/lib/static-server.mjs           (MOD) — add .webmanifest/image MIME entries if missing; preserve no-store
tests/unit/build.test.mjs               (MOD) — assert source/dist manifest schema, hashed start_url, icon copies, and existing build metadata
tests/unit/static-server.test.mjs       (MOD) — assert manifest and icon content types plus no-store headers
tests/e2e/checkin.spec.mjs              (MOD) — assert dev page has one manifest link and normal kiosk flows still run
README.md                               (MOD) — document A2HS install/reinstall using the generated webmanifest and hashed artifact
docs/VERIFICATION_EVIDENCE.md           (MOD) — append Cycle-16 verification evidence after implementation
```

No production source under `src/`, native Swift files, guest data, or persisted storage keys should change.

## 6. Implementation Phases

### Phase 1 — Source manifest and icon assets

Status: complete.

1. Add `manifest.webmanifest` at the repository root with stable app identity and development `start_url: "./index.html"`.
2. Add `assets/icons/` with SVG, 192 PNG, and 512 PNG icon assets. Icon entries must include `src`, `sizes`, `type`, and `purpose: "any maskable"` where supported by the asset shape.
3. Link the source manifest from `index.html` in the `<head>` after the theme/status metadata.
4. Keep all existing mobile web app meta tags unchanged.

Acceptance:

- `index.html` contains exactly one `rel="manifest"` link.
- The source manifest parses as JSON and includes `name`, `short_name`, `id`, `start_url`, `scope`, `display`, `theme_color`, `background_color`, and at least 192/512 icon entries.
- Existing local `npm run serve` development still starts from `index.html`.

### Phase 2 — Generated dist webmanifest

Status: complete.

1. Add `createWebAppManifest()` and `writeWebAppManifestArtifacts()` to `scripts/build.mjs`.
2. During `build()`, after `artifactNameFor(html)` has identified the hashed HTML name, write `dist/check-in-007.webmanifest` with `start_url: "./<hashed artifact>"`.
3. Copy source icons into `dist/assets/icons/` and rewrite generated icon `src` values to `./assets/icons/<file>`.
4. Preserve the existing order and semantics of `writeBuildArtifacts()` for `index.html`, hashed HTML, and `check-in-007.manifest.json`; keep size-budget checks before any writes.
5. Add `<link rel="manifest" href="./check-in-007.webmanifest">` to the built HTML string, not the source manifest path.

Acceptance:

- `npm run build` emits the existing three artifacts plus `dist/check-in-007.webmanifest` and copied icons.
- `dist/check-in-007.webmanifest.start_url` equals `./${dist/check-in-007.manifest.json.artifact}`.
- Both `dist/index.html` and the hashed HTML twin are byte-identical and point at the dist webmanifest.
- Existing build artifact hash determinism remains intact across two consecutive builds.

### Phase 3 — Serving and MIME behavior

Status: complete.

1. Extend `scripts/lib/static-server.mjs` MIME handling so `.webmanifest` serves as `application/manifest+json`; `.svg` serves as `image/svg+xml`; `.png` serves as `image/png` if not already present.
2. Preserve existing path traversal, forbidden cert-cache, realpath, GET/HEAD, and `Cache-Control: no-store` behavior.
3. Add tests for `GET /manifest.webmanifest`, `GET /dist/check-in-007.webmanifest` after a build fixture, and representative icon paths.

Acceptance:

- Manifest and icon requests return 200 with correct content type and `Cache-Control: no-store`.
- Existing private-key/cert-cache denial tests remain green.
- No change to `serve:https` URL advertisement, certificate generation, or bind/SAN contracts.

### Phase 4 — Verification coverage

Status: complete.

1. Extend `tests/unit/build.test.mjs` to assert:
   - source manifest validation rejects missing required members in pure helper tests,
   - generated webmanifest has the hashed `start_url`,
   - icon files referenced by the generated manifest exist under `dist/`,
   - the machine manifest remains unchanged in shape and values,
   - built HTML has exactly one manifest link to `./check-in-007.webmanifest`.
2. Extend `tests/unit/static-server.test.mjs` for MIME/no-store behavior.
3. Extend `tests/e2e/checkin.spec.mjs` with a non-invasive assertion that the root page exposes one manifest link while the normal roster/scan flow remains unchanged.
4. Run full project gates on Node 24.

Acceptance:

- `npm run lint`, `npm run test:unit`, `npm run test:e2e`, and `npm run build` pass.
- Unit tests cover the manifest transformation without depending on network or browser install UI.
- E2E coverage confirms the linked manifest does not alter kiosk interaction.

### Phase 5 — Documentation and completion evidence

Status: complete pending final command results in `docs/VERIFICATION_EVIDENCE.md`.

1. Update README's Build/Test and iPad checklist sections to describe:
   - source `manifest.webmanifest` for development,
   - generated `dist/check-in-007.webmanifest`,
   - `start_url` pointing to the current hashed HTML artifact,
   - reinstall guidance for Add-to-Home-Screen after redeploy.
2. Append Cycle-16 evidence to `docs/VERIFICATION_EVIDENCE.md` after implementation, including test commands and a generated manifest excerpt.
3. Leave RA #14 wording intact unless real-device scroll verification actually occurred in the same implementation environment.
4. Mark implementation checklist boxes in this plan complete only after code lands; leave backlog closure for the discriminator after audit.

Acceptance:

- Operators can identify which URL/manifest to use for a fresh iPad standalone install.
- Documentation does not overclaim offline behavior or iPad scroll resolution.
- Backlog item remains `[/]` until implementation passes discriminator audit.

## 7. Integration Points

### 7.1 HTML head metadata and browser install flow

- Contract: root `index.html` links `./manifest.webmanifest`; built HTML links `./check-in-007.webmanifest`.
- Failure mode: a wrong link path makes browser install tools report no manifest, or installs launch to stale `index.html`.
- Migration path: additive head metadata; existing meta tags remain for Safari compatibility.

### 7.2 Build artifacts and operator deployment

- Contract: `check-in-007.manifest.json.artifact` and `check-in-007.webmanifest.start_url` refer to the same hashed HTML filename.
- Failure mode: mismatch launches a stale or missing artifact in standalone mode.
- Migration path: build emits all files together; README instructs operators to deploy the whole `dist/` directory, not a single file, when using A2HS installs.

### 7.3 Static HTTPS helper

- Contract: manifests/icons are ordinary static files under the served root and inherit no-store/cache-denial protections.
- Failure mode: wrong MIME type can cause browser install tooling to ignore the manifest; missing no-store can preserve stale generated manifests.
- Migration path: extend MIME map only; do not touch certificate, bind, or path safety logic.

### 7.4 Tests and CI

- Contract: Linux CI can parse and fetch manifest artifacts; iOS-specific install UI is documented but not automated in this cycle.
- Failure mode: trying to automate Add-to-Home-Screen UI in the existing Linux/Chromium lane would create an unmaintainable or false-positive gate.
- Migration path: unit/e2e tests validate deterministic metadata; real iPad manual/runner evidence can be recorded separately.

## 8. Error Handling and Edge Cases

- Missing `manifest.webmanifest`: `npm run build` fails with the file-read error; unit tests cover helper-level validation so this is caught before release.
- Malformed manifest JSON: build fails before writing generated webmanifest artifacts.
- Missing required manifest member (`name`, `short_name`, `start_url`, `scope`, `display`, `icons`): helper throws a descriptive error naming the member.
- Missing or empty icons array: helper throws; installability is not silently weakened.
- Icon path outside repository or dist root: build rejects paths containing absolute URLs, leading `/`, `..`, or backslashes; copied assets stay under `dist/assets/icons/`.
- Hashed artifact name changes between builds: generated webmanifest changes with it; deterministic tests compare two builds from unchanged source.
- Browser requests old generated manifest: static helper returns no-store; operator docs instruct reinstalling A2HS after redeploy when changing launch URL identity.
- `file://` usage: source/built HTML may include a manifest link, but manifest install behavior is only supported through served HTTP(S); file-mode camera fallback remains unchanged.
- Unsupported browser members: browsers ignore unknown/unsupported manifest fields by spec convention; plan uses stable common fields only and avoids experimental `scope_extensions`.
- Disk permission/full errors while copying icons: build aborts nonzero; no partial success is reported.
- Static server HEAD requests: content type and no-store must match GET behavior without sending a body.

## 9. Stability and Performance

- Build time: manifest JSON parsing and copying three icon files are O(manifest bytes + icon bytes), expected under 1 MB total; negligible beside font/data inlining.
- Runtime performance: no JavaScript runtime changes; only an extra `<link rel="manifest">` network fetch in hosted browser contexts.
- Artifact size: the single-file HTML grows only by one link tag. PNG icons are separate files and do not count against the existing single-file gzip budget.
- Memory: build holds the manifest object and icon buffers briefly; no persistent watcher or cache.
- Stability: the generated manifest is deterministic from source manifest plus content hash. No service worker means no cache lifecycle failure mode.
- Rollback: revert the Cycle-16 commit and redeploy the previous `dist/`; existing `index.html`-only kiosk launches continue to work because the manifest link is additive.

## 10. Testing Strategy

- Unit: `tests/unit/build.test.mjs`
  - valid source manifest transforms to hashed dist manifest,
  - missing required members throw clear errors,
  - generated `start_url` matches machine manifest artifact,
  - generated icon files exist and match manifest paths,
  - built HTML contains exactly one dist manifest link,
  - existing self-contained HTML and module-transform assertions remain.
- Unit: `tests/unit/static-server.test.mjs`
  - `.webmanifest` content type is `application/manifest+json`,
  - `.svg` and `.png` content types are correct,
  - no-store remains present,
  - existing forbidden `.certs` and traversal tests remain green.
- E2E: `tests/e2e/checkin.spec.mjs`
  - root page exposes one manifest link,
  - normal roster/scan flow remains unchanged,
  - no probe/install text appears in kiosk UI.
- Regression:
  - `npm run lint`,
  - `npm run test:unit`,
  - `npm run test:e2e`,
  - `npm run build`,
  - optional `npm run test:ios-scroll` remains independent and may skip without a provisioned iOS runner unless required.

## 11. Environment and Toolchain

- Node: existing pinned Node 24 line, `.nvmrc` / `.node-version` `24.20.0`, `engines.node >=24 <25`.
- Package install: `npm ci`.
- No new npm dependencies are planned.
- Icon generation should use deterministic local tooling available on macOS if needed, but generated PNGs are committed so normal builds do not require ImageMagick, Sharp, or network access.
- Browser references are informational only; build/test behavior must be enforced by local tests.

## 12. Deployment and Distribution

1. Run `npm run build`.
2. Deploy the full `dist/` directory when using Add-to-Home-Screen installs:
   - `index.html`
   - `check-in-007.<hash>.html`
   - `check-in-007.manifest.json`
   - `check-in-007.webmanifest`
   - `assets/icons/*`
3. Serve through `npm run serve:https` for offline-iPad companion-host operation.
4. For a fresh iPad standalone install, open the hashed artifact or `index.html` over HTTPS, confirm the page's manifest link resolves, then Add to Home Screen. The generated manifest launches the current hashed artifact.
5. On redeploy where the HTML hash changes, remove and recreate the home-screen icon if iPadOS keeps the old launch metadata.
6. Rollback by redeploying the previous full `dist/` set. Because there is no service worker, rollback is file-level and does not require cache migration.

## 13. Open Questions

1. Should `orientation` be locked to portrait?
   - Proposed resolution: keep `"orientation": "any"` because the existing kiosk supports portrait and landscape and tests guard responsive layout.
   - Needed to change: a product decision to force iPad kiosk operation into one orientation.
2. Should the manifest `id` include the hashed artifact?
   - Proposed resolution: keep stable `"id": "./"` so reinstall identity remains the app, while `start_url` carries the current content hash.
   - Needed to change: evidence that target iPadOS standalone behavior requires launch URL and app identity to move together.
3. Should the app add a service worker for offline launch?
   - Proposed resolution: no for this cycle. It is a separate caching subsystem with its own failure modes and not required to satisfy manifest/start_url reliability.
   - Needed to change: an explicit offline-without-host requirement and a new plan covering cache lifecycle, storage budget, and update semantics.
