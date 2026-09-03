# Check-In 007 Plan Critique — Cycle 8, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `2b5e8d3`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v18 (Cycle 8 — offline static-HTTPS helper)
**Score:** **93 / 100** (first review of v18)
**Status:** NOT APPROVED (below the ≥95 gate — two must-fix items, then re-review)

A genuinely strong, source-grounded, dependency-free plan that correctly diagnoses the
secure-context problem (`scan.mjs:32`), picks the right tradeoffs (pure-Node cert over
mkcert/openssl/npm, RSA-2048/SHA-256, SAN+EKU+CA:FALSE+≤825-day per Apple HT210176), and
specifies deep tests. It is held below the gate by **one real security flaw of commission**
(the "hardened" static handler serves its own TLS **private key** by default) and **one
correctness/UX gap** (the default certificate's SAN does not cover the LAN IP the iPad
actually connects to, so the secure context still fails out of the box). Both are small,
concrete fixes.

## Scope Check

- **Audit findings (`CONSOLIDATED_AUDIT.md` v29):** Required Actions #1–#8 are all DONE/none
  stalled. No open P0–P2 findings this plan must address. ✓
- **Backlog (`BACKLOG.md`):** this plan addresses the **single** remaining item — "On-device
  static-HTTPS helper … (§10 Q2)" — already `[/]`. Every other item is `[x]`. Perfect scope
  match; no in-scope item is ignored. ✓
- **Integration points:** §7 covers `package.json`/operators, Playwright `serve` (untouched),
  static handler ↔ kiosk artifact, cert ↔ iOS trust, `.gitignore` ↔ secret hygiene. The one
  integration the plan *misses* is that the served **root** contains the cert dir — see
  Commission #1. Otherwise thorough. ✓ (with the caveat)
- **Alternatives considered:** §4 evaluates mkcert vs openssl vs npm-cert-lib; RSA vs Ed25519
  vs EC P-256; bind-all vs loopback; cert-download vs hand-copy. Strong. ✓

No scope cap applied — the score reflects execution/security quality, not breadth.

## Flaws of Commission

1. **[MUST-FIX — private-key disclosure] The static handler serves the TLS private key by
   default.** `startServer` defaults `root = process.cwd()` (§Phase 4) and `certDir = '.certs'`
   (relative), so `ensureCert` writes `key.pem`/`cert.pem` to `<root>/.certs/` — *inside the
   served tree*. `createStaticHandler` serves any file under `root`; `safeResolve` only rejects
   traversal **escapes**, not in-root dotfiles, and `MIME` even maps `.pem` →
   `application/x-pem-file` (§Phase 3). Therefore a verbatim implementation answers
   `GET /.certs/key.pem` with **200 and the RSA private key**. This directly contradicts the
   plan's own "hardened static handler" (§2.3) and "secret hygiene … key.pem never [exposed]"
   framing (§7.5) — `.gitignore` keeps the key out of git but nothing keeps it off the wire.
   On an offline LAN this lets any device on the ad-hoc network impersonate the kiosk origin
   (defeating the very secure-context guarantee the cycle exists to provide).
   **Fix (any one, prefer the first two):** (a) default `--root` to `dist/` (the actual kiosk
   artifact) and/or (b) store the cert dir **outside** the served root by default and/or (c)
   have `createStaticHandler` deny any path segment beginning with `.` (dotfiles) and the cert
   directory. Add a `static-server.test.mjs` assertion: `GET /.certs/key.pem` and
   `GET /.certs/cert.pem` → **404** (the download must come only from the dedicated
   `certRoute`, which streams `cert.pem` — never the key).

2. **No flaws of commission beyond #1.** The DER/X.509 construction is correct as specified:
   `version [0] EXPLICIT INTEGER 2`, `extensions [3] EXPLICIT`, dNSName `[2]`/iPAddress `[7]`
   IMPLICIT context tags, SPKI reused from Node (no hand-encoded key bytes),
   `sign('sha256', tbs, key)` → PKCS#1 v1.5 matching OID `1.2.840.113549.1.1.11`,
   `cert.verify(cert.publicKey)` for the self-signature. UTCTime is valid for the 820-day
   window (well below the year-2050 GeneralizedTime boundary). These are sound.

## Flaws of Omission

1. **[MUST-FIX — feature fails out of the box] Default SAN omits the LAN IP the iPad
   connects to.** `generateSelfSignedCert` defaults `hosts = ['localhost','127.0.0.1']`
   (§Phase 2) and `startServer` only adds CLI `hosts`. But the iPad opens
   `https://<host-lan-ip>:8443/` (§3, §Phase 4 `lanUrls`). A **trusted** cert whose SAN does
   **not** match the connected IP still yields a name-mismatch error in Safari, which blocks
   the secure context — so `getUserMedia` fails even after the operator completes the whole
   trust walkthrough. The plan frames `--host <lan-ip>` as **"optionally"** in the README
   (§Phase 5) and defers auto-adding discovered IPs to §13 Q2, but for the LAN scenario that
   flag is **mandatory**, not optional — omitting it silently breaks the one feature this
   cycle ships. **Fix (prefer the first):** (a) by default, add every non-internal IPv4 from
   `networkInterfaces()` (already computed for `lanUrls`) to the cert SAN, so the default
   `npm run serve:https` produces a cert matching the URL it prints; or (b) make the README
   state `--host <lan-ip>` is **required** for the LAN case **and** have `startServer`/CLI warn
   at startup when a printed LAN URL's IP is absent from the cert SAN. Add a test asserting the
   default cert's SAN includes the discovered LAN IPv4 (option a) or that the warning fires
   (option b).

2. **Private-key file mode (nit).** §Phase 2 sets the cert **dir** to 0700 but does not
   specify the **file** mode for `key.pem`; on a shared host a default 0644 key is
   world-readable. Write `key.pem` with mode `0o600`. (Path-to-100.)

3. **`X509Certificate.keyUsage` assertion form (nit).** §Phase 2/§10 assert `.keyUsage`
   "includes `serverAuth`". Node surfaces **extended** key usage on `.keyUsage` (the bracketed
   note is correct), but it returns **OID strings** (`'1.3.6.1.5.5.7.3.1'`), not the name
   `'serverAuth'`. Pin the exact asserted value so `dev-cert.test.mjs` does not silently pass a
   wrong check. (Path-to-100.)

4. Otherwise omissions are well covered: §8 handles EADDRINUSE, unwritable cert dir (no
   insecure fallback), expired/malformed cached cert, traversal, non-GET/HEAD, missing index,
   symlink escape, client disconnect, SIGINT/SIGTERM, and REPL-import safety.

## Regressions

1. **None.** `serve` (plain-HTTP Playwright `webServer`) and the CI workflow are untouched
   (§2 Out of scope, §7.2). `http-server` stays a dependency (retained for `serve`), so
   removing the `-S` flag from `serve:https` breaks no consumer. `package-lock.json` is not
   touched. Test coverage grows (4 new suites); nothing shrinks. The mkcert→pure-Node swap is
   a net improvement with a documented rollback (§12). No API/contract/perf regression.

## Why 93 and not 94

The private-key-disclosure defect (Commission #1) is a real, shippable security bug in code
the plan brands "hardened," and the SAN-mismatch gap (Omission #1) means the default operator
flow does not actually deliver the feature. Either alone would hold a plan at 93–94; together
they sit below the gate. Everything else is 97-98-grade work.

## Path to ≥95 (must-fix, both required)

1. **Stop serving the cert directory / private key.** Default the served root to `dist/`
   and/or move the cert dir outside the served root and/or deny dotfile/`.certs/` paths in
   `createStaticHandler`. Add unit assertions: `GET /.certs/key.pem` → 404 and
   `GET /.certs/cert.pem` → 404 (cert reaches the client only via `certRoute`).
2. **Make the default cert match the URL the iPad opens.** Auto-add discovered non-internal
   LAN IPv4s to the SAN by default (preferred), or make `--host <lan-ip>` documented-mandatory
   for the LAN case with a startup warning when a printed URL's IP is not in the SAN. Add a
   test covering the chosen behavior.

Addressing both, with the two nits below folded in, would put v19 at 97–98.

## Path to 100

- Write `key.pem` with mode `0o600` (Omission #2).
- Commit to the exact `X509Certificate.keyUsage` OID-string assertion (Omission #3).
- Add a one-line note that UTCTime is used deliberately (validity < year 2050; GeneralizedTime
  would be needed beyond that) so a future maintainer extending validity does not silently
  emit a malformed time.
- Consider asserting a real ES-module load path (an actual `import()` or browser fetch of a
  served `.mjs`) rather than only the `.mjs` MIME string, to prove module loading end-to-end.

## Summary

Approval-grade engineering with one security defect and one out-of-the-box correctness gap
standing between it and the gate. Fix the private-key exposure (Commission #1) and the default
SAN/LAN-IP mismatch (Omission #1), add the two assertions, and v19 should clear ≥95 comfortably
(97–98). Do **not** widen scope — the single-item scope is exactly right.
