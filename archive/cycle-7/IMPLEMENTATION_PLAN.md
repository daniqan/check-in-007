# Check-In 007 — HTTPS Helper API Precision & CLI Documentation Plan v20 (Cycle 9)

## 1. Overview

Cycle 8 shipped and verified the dependency-free offline HTTPS helper. Consolidated Audit v32
records two remaining cosmetic findings: the supported `--bind` option is neither documented nor
directly asserted by parser tests, and `startServer(...).url` always reports loopback even when the
server is bound elsewhere. This cycle resolves exactly those findings without changing the kiosk,
certificate format, static-file security boundary, or CI.

Traceability:

- Audit v32, **Next Step optional polish item 1**: document/test `--bind` or remove it.
- Audit v32, **Next Step optional polish item 2**: return a bound/LAN endpoint instead of a
  hard-coded `127.0.0.1` URL.
- Audit v32's environment-blocked native-simulator and first-live-CI observations are verification
  prerequisites, not local code defects, and remain out of scope.

## 2. Scope

### In scope

1. Preserve `--bind` and define it as the listen-interface selector, distinct from repeatable
   `--host`, which adds certificate SAN entries.
2. Add direct `parseArgs` coverage for both `--bind=<value>` and `--bind <value>` while preserving
   existing defaults and validation.
3. Replace the hard-coded result URL with a deterministic advertised endpoint:
   - wildcard bind (`0.0.0.0` or `::`): first sorted discovered LAN IPv4 URL, falling back to
     `https://localhost:<actualPort>` when no LAN IPv4 exists;
   - explicit bind: that bound host, with IPv6 bracketed, using the actual bound port.
4. Add a `urls` array containing all advertised endpoints while retaining `lanUrls` for backward
   compatibility. `url === urls[0]` is invariant.
5. Include an explicit, non-wildcard bind value in certificate hosts so the returned explicit-bind
   URL is certificate-covered. Wildcards are never SAN entries.
6. Document all HTTPS-helper flags and the distinction among bind address, advertised URL, and
   certificate SAN additions.
7. Run the existing unit, e2e, formatting, and artifact-size gates; add no dependencies.

### Out of scope

- Changes under `src/`, `native/`, `data/`, `assets/`, `vendor/`, or `dist/`.
- Certificate DER, validity, caching, key permissions, SAN encoding, trust steps, or hardened static
  serving. Those Cycle-8 contracts remain unchanged.
- Installing an iPadOS runtime, changing native code, pushing to GitHub, or changing CI merely to
  manufacture the two external verification observations.
- DNS resolution, reachability probing, IPv6 interface discovery, multiple listener sockets, public
  API breaks, or new dependencies.
- Editing discriminator-owned `BACKLOG.md`, `CONSOLIDATED_AUDIT.md`, or
  `IMPLEMENTATION_PLAN_CRITIQUE.md`.

## 3. Architecture and Data Flow

```text
CLI argv
  |
  v
parseArgs() --------------------> { host: bind address, hosts: extra SANs, ... }
  |                                      |
  v                                      v
startServer() ---- discover LAN IPv4 ----+---- build certHosts
  |                                            (localhost, loopback, LAN,
  |                                             explicit bind, --host values)
  v
httpsServer.listen(port, host)
  |
  +--> actualPort from server.address()
  +--> advertisedEndpointUrls(bind, actualPort, discovered LAN IPv4)
          |
          +--> wildcard: sorted LAN URLs, or localhost fallback
          +--> explicit: one bracket-safe bound-host URL
          +--> result { url: urls[0], urls, lanUrls, ...existing fields }
```

`parseArgs` owns syntax/defaults. `startServer` owns listener creation, certificate-host assembly,
and its result contract. Endpoint selection is a pure helper in `scripts/serve-https.mjs`; it does
no DNS or socket probing. `dev-cert.mjs` and `static-server.mjs` remain untouched failure domains.

## 4. Technical Decisions and Rationale

### 4.1 Keep `--bind`; document and test it

The option already lets operators restrict the listener to loopback or one interface instead of
all IPv4 interfaces. Removing it would be an avoidable compatibility break. `--bind` sets the one
address passed to `server.listen`; `--host` remains repeatable for extra DNS/IP SANs. Node remains
the authority for invalid or unavailable bind values, avoiding an incomplete local validator.

### 4.2 Advertise endpoints from the effective bind

A wildcard is not a useful client destination, so wildcard binds advertise discovered LAN IPv4
addresses and use localhost only when none exist. An explicit bind advertises exactly that host.
Always selecting a LAN IP would be wrong for explicit loopback/single-interface binds; returning
`0.0.0.0` or `::` would preserve the audit defect.

### 4.3 Add `urls` without removing `lanUrls`

`url` stays a string for compatibility and becomes the canonical first advertised endpoint.
`urls` exposes the complete advertised set. `lanUrls` remains the discovery-only view because
existing tests and potential callers already receive it. No existing property is removed.

### 4.4 Use `node:net` plus WHATWG `URL` for IPv6-safe formatting

Use the existing built-in `node:net` `isIP` predicate to identify IPv6, wrap only an IPv6 literal in
brackets, then assign that value to the built-in `URL.hostname` before setting `.port`. A raw `::1`
assignment is ignored by WHATWG URL parsing, whereas `[::1]` serializes correctly. IPv4 and DNS
names remain conventional. This avoids a custom colon heuristic and adds no package.

### 4.5 Certificate coverage follows explicit advertisement

Add the explicit bind to `certHosts` unless it is a wildcard. Thus URLs returned for loopback, a
LAN IP, IPv6, or a hostname are represented in the generated SAN. Existing `ensureCert` SAN-mismatch
regeneration remains authoritative; `Set` preserves deterministic first-occurrence deduplication.

## 5. File Manifest

```text
scripts/
  serve-https.mjs                 (MOD) — endpoint formatting/selection, explicit-bind SAN,
                                           additive result metadata
tests/
  unit/
    serve-https.test.mjs          (MOD) — bind parsing, URL selection, live result tests
README.md                         (MOD) — flag reference and bind/SAN semantics
```

No file is created or deleted. Package manifests, lockfile, generated artifacts, audits, critique,
and backlog remain unchanged.

## 6. Implementation Phases

### Phase 1 — Pure advertised-endpoint contract — ✅ Complete

Add two exported pure helpers to `scripts/serve-https.mjs` for direct unit coverage:

```js
/** Build a bracket-safe HTTPS origin for a client-reachable host. */
export function httpsUrl(host, port) {
  // Uses isIP(host) === 6 to bracket IPv6 before assigning URL.hostname.
  // Returns URL.origin (no trailing slash); invalid URL inputs throw.
  ...
}

/**
 * Select deterministic client endpoints for the effective bind.
 * Wildcards advertise LAN IPv4 endpoints or localhost fallback.
 */
export function advertisedUrls(bindHost, port, lanAddresses = []) {
  ...
}
```

Required behavior:

- Recognize only `0.0.0.0` and `::` as wildcards.
- Sort/deduplicate a defensive copy of `lanAddresses`; never mutate caller input.
- Wildcard plus addresses returns every `https://<address>:<port>`.
- Wildcard plus no address returns `['https://localhost:<port>']`.
- Explicit IPv4/DNS returns one conventional URL; explicit IPv6 returns one bracketed URL.
- Strings omit a trailing slash, matching the existing convention.

Acceptance: pure tests cover both wildcards, empty fallback, dedupe/sort, input immutability,
explicit IPv4, hostname, and IPv6. Existing `lanUrls` remains byte-compatible.

### Phase 2 — Bind parsing and live-server result precision — ✅ Complete

Keep parser behavior and expand its matrix. Update `startServer` after the listener starts:

```js
export async function startServer(options = {}) {
  // Existing defaults are unchanged.
  const lanAddresses = lanIpv4Addresses(interfaces);
  const bindCertHosts = host === '0.0.0.0' || host === '::' ? [] : [host];
  const certHosts = [
    ...new Set(['localhost', '127.0.0.1', ...lanAddresses, ...bindCertHosts, ...hosts]),
  ];
  // Existing certificate, handler, listen, EADDRINUSE, and close logic remains.
  const actualPort = server.address().port;
  const urls = advertisedUrls(host, actualPort, lanAddresses);
  return {
    server,
    port: actualPort,
    url: urls[0],
    urls,
    // All existing fields, including lanUrls, remain.
  };
}
```

Tests prove:

1. Both `--bind` syntaxes override only `host`; combined flags retain their exact values.
2. Existing missing-value, unknown-option, and invalid-port behavior remains.
3. A live server bound to `127.0.0.1` returns
   `url === urls[0] === https://127.0.0.1:<actualPort>`.
4. Its certificate covers loopback and a trusted request through `result.url` serves the kiosk.
5. The injected-LAN wildcard test asserts `urls`, `url`, and `lanUrls`: LAN is primary rather than
   hard-coded loopback.
6. No-LAN wildcard behavior stays at the pure-helper layer, independent of machine interfaces.

Acceptance: `url` is never undefined; `urls` is non-empty; no return property is removed or changes
type; existing private-key/dotfile/traversal assertions remain and pass; certificate and static
handler modules have no diff.

### Phase 3 — Operator documentation — ✅ Complete

Add a concise README flag table:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--bind <address>` | `0.0.0.0` | Listener interface; loopback is host-only |
| `--host <name-or-ip>` | repeatable, none | Additional certificate SAN, not a listen address |
| `--port <1-65535>` | `8443` | Listener port |
| `--root <path>` | current directory | Static content root |
| `--cert-dir <path>` | `.certs` | Private certificate cache, never statically served |

Show default wildcard/LAN use and explicit restricted binding. State that explicit bind is included
in the SAN and that loopback prevents iPad LAN access. Preserve trust and static-IP guidance.

Acceptance: every accepted flag has syntax/default; `--bind` cannot be confused with `--host`;
examples use `npm run serve:https -- ...` argument forwarding.

### Phase 4 — Regression gate — ✅ Complete

Run on pinned Node 24:

```bash
npm run lint
npm test
npm run build
```

If the environment is not Node 24, the guard must fail closed. For diagnosis only, use the approved
direct-tool path and report the deviation:

```bash
npx prettier --check .
node --test tests/unit/*.test.mjs
npx playwright test
node scripts/build.mjs
```

Acceptance: zero test failures, Prettier clean, artifact within ≤750 KB gzip/≤1.2 MB raw, and diff
review confirms only the three manifest files changed.

## 7. Integration Points

### 7.1 Parser → listener

- **Contract:** `parseArgs` maps `--bind` to `options.host`; `main` passes it to `startServer`, which
  passes it to `server.listen`.
- **Failure:** malformed CLI shape fails before startup; invalid/unavailable address fails through
  Node's listen error and the existing top-level catch.
- **Migration:** default stays `0.0.0.0`; existing commands behave identically.

### 7.2 Listener → API metadata

- **Contract:** calculation uses `actualPort`, not requested port, so port-zero callers are accurate.
  `url` aliases `urls[0]`; `lanUrls` stays discovery metadata.
- **Failure:** wildcard/no-LAN degrades to localhost; helper formatting errors reject startup.
- **Migration:** additive `urls`, corrected `url`, no removed fields. Old reliance on incorrect
  loopback metadata is intentionally corrected.

### 7.3 Advertised endpoint → certificate SAN

- **Contract:** localhost, loopback, LAN IPv4s, explicit non-wildcard bind, and `--host` feed
  `ensureCert`; every returned URL host is covered.
- **Failure:** bad input is rejected by existing certificate generation or socket bind; stale cache
  regenerates via existing SAN comparison.
- **Migration:** a cache may regenerate once when explicit bind adds a SAN; existing re-trust docs
  cover this.

### 7.4 CLI stdout

- **Contract:** `main` should consume `result.urls` so explicit and wildcard binds print the same
  primary endpoint exposed programmatically; certificate route uses `urls[0]`.
- **Failure:** no-LAN wildcard prints localhost; no empty endpoint list is possible.
- **Migration:** headings and trust instructions stay stable; only previously inaccurate explicit-
  bind output changes.

## 8. Error Handling and Edge Cases

| Condition | Detection | Response and recovery |
| --- | --- | --- |
| Missing `--bind` value | parser sees absent/next flag | Existing `Missing value` error; supply value |
| Unknown flag | parser branch | Existing `Unknown option`; no side effect |
| Invalid/unavailable bind | Node startup `error` | Reject and print failure; choose valid interface |
| Port in use | existing `EADDRINUSE` branch | Preserve actionable `--port` hint |
| Wildcard, no LAN IPv4 | empty discovery | Advertise localhost |
| Duplicate/unsorted LAN input | pure-helper boundary | Copy, dedupe, sort without mutation |
| Explicit IPv6 | WHATWG URL | Bracket origin and add address to SAN |
| Wildcard as SAN | explicit filter | Never pass `0.0.0.0`/`::` as identity |
| Requested port `0` | `server.address().port` | Advertise assigned port |
| SAN set changes | existing cache comparison | Regenerate and retain re-trust notice |
| Close after start | existing Promise wrapper | Propagate close error or resolve cleanly |

First-run, permissions, malformed cache, key mismatch, traversal, dotfile denial, unsupported method,
and certificate-route handling retain Cycle-8 behavior and tests.

## 9. Stability and Performance

- Endpoint selection is `O(n log n)` for sorting `n` LAN addresses and `O(n)` memory; hosts normally
  have single-digit `n`.
- Certificate dedupe remains `O(n + m)` for interfaces plus explicit hosts.
- No per-request work, DNS resolution, reachability probe, retry, timer, or listener is added.
- `urls` is bounded by the finite interface snapshot and cannot grow after startup.
- Tests use port `0`, temporary cert directories, and immediate `t.after` cleanup.
- Wildcard/no-LAN degradation is deterministic and never yields an empty collection.

## 10. Testing Strategy

Unit coverage in `tests/unit/serve-https.test.mjs` includes:

- both bind syntaxes, combined options, defaults, missing values, unknown options, invalid ports;
- hostname/IPv4/IPv6 URL formatting and actual-port interpolation;
- both wildcard forms, sort/dedupe, immutability, no-LAN fallback, explicit-bind precedence;
- explicit-loopback live result and request, wildcard injected-LAN primary URL, SAN coverage, and
  existing secret/traversal denial.

Regression coverage runs every DER, certificate, static-server, Node-version, web-library, and
native-parity unit test; every Playwright test including real HTTPS module loading; Prettier; and
build-size enforcement. Tests require no DNS, internet, privileged port, or real LAN interface.

## 11. Environment and Toolchain

- Node `24.20.0` via `.nvmrc`/`.node-version`; engines remain `>=24 <25`.
- npm with committed lockfile; fresh setup is `nvm use && npm ci`.
- Existing built-in `node:test`, Playwright `1.62.1`, Prettier `3.9.6`.
- No environment variables, secrets, external CA, OpenSSL, mkcert, or new dependency.
- Live tests use OS temporary directories and ephemeral port `0`.

## 12. Deployment, Distribution, and Rollback

This is a source-level CLI/library patch. Distribution remains the repository plus existing
`dist/index.html`; no data migration or release packaging occurs. Existing invocations need no
migration. Explicit-bind users gain correct returned/printed URLs and may see one certificate-cache
regeneration, followed by the documented reinstall/re-trust step.

Rollback is `git revert <implementation-commit>`. It restores loopback-only metadata and removes
`urls`; certificate files and user data remain valid and untouched.

## 13. Open Questions and Fixed Defaults

1. **Discover IPv6 interfaces for wildcard `::`?** No. Existing discovery is deliberately IPv4;
   `::` uses known LAN IPv4 advertisements or localhost. IPv6 discovery needs separate scope.
2. **Validate bind syntax locally?** No. Node supports addresses and hostnames and is authoritative.
3. **Remove `url` for `urls`?** No. Keep the compatible primary alias and add the collection.
4. **Install native runtime or push CI?** No. Audit v32 classifies these as external verification
   gaps, not code defects or locally committable deliverables; each needs separate authority/context.

## 14. Completion Checklist

- [x] Audit v32 polish #1: `--bind` is directly tested and fully documented.
- [x] Audit v32 polish #2: `startServer().url` reflects the effective advertised endpoint.
- [x] `urls` is non-empty and `url === urls[0]` for wildcard, no-LAN, and explicit bind.
- [x] Returned hosts are certificate-covered; wildcards are not SANs.
- [x] Existing HTTPS security regression assertions pass.
- [x] Formatting, unit, e2e, and build gates pass; artifact budgets remain intact.
- [x] Only the three manifest files change during implementation.
