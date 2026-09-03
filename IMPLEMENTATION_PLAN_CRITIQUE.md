# Web App Manifest / Standalone Start URL Plan Critique — Cycle 16, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `06d9bc5`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v29 (Cycle 16)
**Score:** **96 / 100** (first review of Cycle 16)
**Status:** APPROVED (≥95 gate cleared)

Plan v29 adds a web app manifest with a build-generated, content-hashed `start_url` so iPadOS
standalone (Add-to-Home-Screen) installs launch a fresh artifact instead of a stale `index.html`.
The scope is tight and correct: install metadata, build output, static serving, tests, and docs —
no service worker, no runtime behavior change. Every factual claim about the current tree was
independently verified and holds. The plan is implementation-ready.

> **Note on prior state (F-15 recurred):** the `06d9bc5` plan-v29 commit landed with
> `IMPLEMENTATION_PLAN_CRITIQUE.md` at **0 bytes** — the Cycle-9 archive left the canonical
> critique empty and the new-cycle commit did not repopulate it. This file is re-authored this
> cycle (v29 APPROVED 96 + State-2 disposition). Watch for recurrence on the next new-cycle commit.

## Plan factual claims — independently verified against source (all accurate)

1. **Current install metadata.** `index.html:6-9` carries `mobile-web-app-capable`,
   `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, and
   `theme-color=#050505`. The plan's "add a `<link rel="manifest">` after the theme/status
   metadata, keep existing meta tags" (§6 Phase 1.3-1.4, §2 Out of scope) is exactly placeable.
2. **Cache-busting output already present.** `scripts/build.mjs:121-144` emits `dist/index.html`,
   `dist/check-in-007.<hash>.html`, and `dist/check-in-007.manifest.json` with
   `{ artifact, sha256, gzipSize, byteSize }`. Plan §4.2's claim that tests/README/CI rely on that
   JSON shape is correct — so keeping it separate from the new `.webmanifest` is the right call.
3. **`artifactNameFor(html)` hashes the HTML** (`build.mjs:122-123`); the built HTML is a single
   `<head>…<title>Check-In 007</title><style>` template literal at `build.mjs:172`. The manifest
   link can be baked into that string (Phase 2.5) and the hashed name derived after — see nit #1
   on ordering.
4. **`.webmanifest` MIME is genuinely absent.** `scripts/lib/static-server.mjs:5-22` MIME map has
   `.svg`→`image/svg+xml` (`:11`) and `.png`→`image/png` (`:12`) **already**, but no
   `.webmanifest`. Plan Phase 3.1 ("add … if not already present") is precisely right: only
   `.webmanifest → application/manifest+json` needs adding; SVG/PNG are already covered.
5. **Path-safety compatibility.** `safeResolve` (`static-server.mjs:28-44`) rejects any path
   segment starting with `.` (`:39`). The served paths the plan introduces —
   `/manifest.webmanifest`, `/check-in-007.webmanifest`, `/assets/icons/<file>` — contain **no**
   dot-leading segments, so they resolve cleanly; the cert-cache `forbiddenRoots`/`realpath`
   guards (`:82-94`) are untouched. Plan §7.3 ("extend MIME map only; do not touch cert/bind/path
   logic") is honored by construction.
6. **Prettier scope.** `.prettierignore` excludes `dist/` and `native/`; the committed source
   `manifest.webmanifest` and `assets/icons/*.png` are new — PNGs are binary (not linted) and the
   root `manifest.webmanifest` is JSON that Prettier will format. Not a blocker, but see nit #3.

## Baseline reproduced this cycle (trust nothing)

- `node --test tests/unit/*.test.mjs` → **84/84 pass**.
- `npx playwright test` → **15/15 pass** (the previously-flaky "roster has no transform ancestor"
  test is reliably green — RA #15 fix holds).
- `node scripts/build.mjs` → deterministic SHA `83a98b13250d`, **26858 gzip bytes** (well under the
  750 KB budget; one extra `<link>` tag will not threaten it).
- `npx prettier --check .` → clean on all tracked files (only the untracked `Claude outputs/`
  scratch dir warns; not a project file).

## Scope Check

- **Backlog:** the manifest / `start_url` item is the **only** open backlog line
  (`BACKLOG.md:19`, `[/]`); every other item is `[x]`. This plan addresses exactly it. No related
  in-scope backlog item is ignored → **no scope cap.**
- **Audit findings:** **RA #14** (P0/HIGH, iPad roster touch-scroll) is IN PROGRESS / env-blocked
  on device verification. The plan correctly **does not** touch or over-claim it (§2 Out of scope,
  §5 File Manifest note "No production source under `src/` … should change", §5.3 "Claiming RA #14
  resolved" is out of scope). Cycle 15 already landed the code fix; the remaining step is a real
  iPad/simulator PASS that this environment cannot produce, so pivoting to the next actionable
  backlog item is a defensible prioritization — flagged in the audit, not held against this plan.
  **RA #10** (external CI billing) is outside the code loop.
- **Integration points:** §7 covers HTML head/browser-install, build↔operator deployment
  (`artifact` ↔ `start_url` contract), the static helper, and CI. Adequate.
- **Alternatives:** §4.1 (static vs query-only vs hashed `start_url`, service worker),
  §4.2 (separate vs replace the machine manifest), §4.3 (icons vs data URLs vs none),
  §4.4 (no service worker). Genuine tradeoff analysis, not hand-waving.

## Flaws of Commission

No flaws of commission identified. The two-manifest separation (§4.2) is the correct way to avoid
colliding with the existing `check-in-007.manifest.json` consumers; the MIME additions are
minimal and spec-correct (`application/manifest+json` is the W3C-registered type); the path-safety
and cert-cache guards are explicitly left untouched.

## Flaws of Omission

1. **Build ordering / non-circularity not spelled out (minor).** The manifest link baked into the
   built HTML uses the **fixed** filename `./check-in-007.webmanifest` (Phase 2.5), while the
   manifest's `start_url` uses the **hashed** HTML name (Phase 2.2). This is exactly what avoids a
   hash cycle — the HTML hash does not depend on the manifest content, only on a fixed link — but
   the plan never states that reasoning. Implementation must bake the link **before** hashing so
   both `dist/index.html` and the hashed twin stay byte-identical *and* carry the link (the Phase 2
   acceptance criterion implies this but the ordering is left implicit). Spell it out to prevent a
   future maintainer from making the link hash-dependent and creating a build cycle.
2. **Icon generation recipe unspecified (minor).** Phase 1.2 / §4.3 commit 192×192 and 512×512
   PNGs as source but do not state *how* they are produced (tool, dimensions verification, or a
   regeneration script). Because they are committed, build determinism is preserved — but there is
   no reproducible path to regenerate them if the brand mark changes, and no test asserts the
   committed PNGs are actually the declared sizes. Consider a one-line generation note and a unit
   assertion on icon dimensions/byte presence.
3. **Maskable-icon safe zone not addressed (minor).** Phase 1.2 proposes `purpose: "any maskable"`
   on the icon "where supported by the asset shape." A `maskable` icon is cropped to a platform
   mask and needs ~10% edge padding (safe zone) or the mark gets clipped. Using one un-padded icon
   for both `any` and `maskable` risks a clipped home-screen icon on Android/Chromium. Either pad
   the maskable variant or declare `purpose: "any"` only.

## Regressions

No regressions identified. The change is additive: existing `apple-mobile-web-app-*` /
`mobile-web-app-capable` meta tags stay (§2), the machine manifest JSON is preserved unchanged
(§4.2), the single-file gzip budget is not meaningfully affected (§9 — one `<link>` tag; PNGs are
separate files outside the budget), and rollback is a file-level `dist/` revert (§9). The static
helper's cert/bind/path-safety contracts are explicitly untouched (§7.3).

## Why 96 and not 97

Three minor specificity/omission nits (build-ordering rationale, icon-generation recipe, maskable
safe zone) keep it a notch below the 97-98 band. None is blocking; the iOS/browser install lane —
the least testable surface — is deliberately validated by deterministic metadata unit/e2e tests
(§7.4, §10) rather than an unmaintainable Add-to-Home-Screen UI gate, which is the right call. The
plan is implementation-ready as written.

## Path to 100

1. **Address the three omission nits** (§ above): state the bake-before-hash ordering and why the
   fixed webmanifest filename avoids a hash cycle; add an icon-generation note + a dimensions/byte
   unit assertion on the committed PNGs; resolve the maskable safe-zone (pad or drop `maskable`).
2. **Pin the e2e assertion target (§Phase 4.3).** State which served page/URL the "exactly one
   `rel=manifest` link" assertion runs against (dev `index.html` via the existing Playwright fixture)
   and assert the `href` value, not just presence.
3. **Assert the `start_url` ↔ `artifact` contract in a unit test (§7.2).** §Phase 4.1 already plans
   "generated webmanifest has the hashed `start_url`"; make it explicit that the test reads both
   `check-in-007.manifest.json.artifact` and `check-in-007.webmanifest.start_url` from the same
   build and asserts `start_url === './' + artifact`.
4. **Manifest `id` durability (§13 Q2).** The proposed `"id": "./"` is fine; briefly note that it
   is resolved relative to origin and stays stable across redeploys while `start_url` carries the
   hash — the plan states the decision but not the resolution semantics.

## Summary

Plan v29 is approval-grade: correctly scoped to the last open backlog item, source-accurate in
every checked claim, additive with a clean rollback, and testable without a flaky install-UI gate.
Three minor specificity nits (ordering rationale, icon recipe, maskable safe zone) are the only
gap between 96 and excellence. **APPROVED at 96/100 — proceed to implement (Cycle 16, State 2).**
The plan is now the contract against which the implementation will be audited. RA #14's real-iPad
verification remains separately required and must not be marked resolved by this cycle.
