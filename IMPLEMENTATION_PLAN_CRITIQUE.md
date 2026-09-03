# Check-In 007 Plan Critique — Cycle 8, Revision 2

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `dfd2909`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v19 (Cycle 8 — offline static-HTTPS helper)
**Score:** **98 / 100** (previous: 93 — Cycle 8 Rev 1 on v18)
**Status:** APPROVED (clears the ≥95 gate)

**Plan Score:** 98/100
**Implementation Score:** N/A

v19 resolves **both** Rev-1 must-fix items and **all four** Rev-1 Path-to-100 nits, each
with a concrete mechanism and a matching test. The private-key-on-the-wire flaw of
commission is closed with three layered defenses; the out-of-the-box SAN/LAN-IP mismatch
is closed by auto-seeding discovered LAN IPv4s into the cert. The plan is now
implementation-ready. Only minor specificity/test-completeness gaps separate it from 100.

## Issues resolved in revision 2

1. **[Rev-1 Commission #1 — private-key disclosure] CLOSED.** v18 served
   `<root>/.certs/key.pem` over the wire because the served root contained the cert dir and
   `safeResolve` blocked only traversal *escapes*. v19 adds three independent guards:
   (a) `safeResolve` now "Returns null on traversal, absolute/NUL input, **or any
   dot-prefixed path segment**" (§Phase 3), (b) `createStaticHandler` takes
   `forbiddenRoots=[]` and "startServer always passes the certificate-cache directory"
   (§Phase 3, §Phase 4 `forbiddenRoots: [resolve(certDir)]`), and (c) a `realpath()`
   symlink-escape check compares the resolved target "against the real root and real
   forbidden roots" (§8). Tests assert `GET /.certs/key.pem` **and** `/.certs/cert.pem` →
   404 *and* repeat the check with a non-dot `private-cache` forbidden root, proving custom
   cache paths are also denied (§Phase 3 acceptance, §10). §4.8 states plainly "the key
   never is" downloadable; only `certRoute` streams `cert.pem`. Correct and well-tested.

2. **[Rev-1 Omission #1 — feature fails out of the box] CLOSED.** v19's `startServer`
   seeds `certHosts = dedupe(['localhost','127.0.0.1', ...lanAddresses, ...hosts])` from
   `lanIpv4Addresses(interfaces)` (§Phase 4), so the default `npm run serve:https` mints a
   cert whose SAN matches every LAN URL it prints — no flag required. An injected
   interface-snapshot test asserts the default SAN contains `IP Address:192.168.50.7` and
   that `lanUrls` prints the matching URL (§Phase 4 acceptance, §10). `ensureCert`
   regenerates when "the cached SAN does not cover every currently requested host" (§4.8),
   making a DHCP address change explicit and prompting re-trust. §13 Q2 is now a hard
   default, not a deferral. Correct.

3. **[Rev-1 nit — key file mode] CLOSED.** `ensureCert` "key.pem is always written mode
   0600" (§Phase 2), asserted `stat(key.pem).mode & 0o777 === 0o600` (§Phase 2/§10).

4. **[Rev-1 nit — keyUsage assertion form] CLOSED.** §Phase 2/§10 now pin the exact
   server-auth **OID string** `1.3.6.1.5.5.7.3.1` on `.keyUsage` (Node surfaces EKU OIDs
   here), not the name `'serverAuth'`.

5. **[Rev-1 Path-to-100 — UTCTime] CLOSED.** §Phase 1 documents that UTCTime is deliberate
   for the 820-day (<2050) window and that GeneralizedTime is required if validity ever
   crosses 2050 — the exact maintainer trap flagged in Rev 1.

6. **[Rev-1 Path-to-100 — real module load] CLOSED.** `tests/e2e/https-server.spec.mjs`
   now executes a real browser `import('./probe.mjs')` and asserts the exported sentinel
   (§Phase 5, §10), proving `.mjs` MIME + module loading end-to-end rather than a bare
   string compare.

## Scope Check

- **Audit findings (`CONSOLIDATED_AUDIT.md` v30):** Required Actions #1–#8 all DONE, none
  stalled. No open P0–P2 finding this plan must address. ✓
- **Backlog (`BACKLOG.md`):** this plan addresses the **single** remaining item — the
  on-device static-HTTPS helper (`[/]`); every other item is `[x]`. Exact scope match;
  nothing in scope is ignored. With this cycle done, the backlog is fully closed. ✓
- **Integration points:** §7 covers `serve:https`↔operators, Playwright `serve`
  (untouched), static handler↔kiosk artifact, cert↔iOS trust, `.gitignore`↔secret hygiene.
  The Rev-1 gap (served root contains the cert dir) is now an explicit contract in §7.3/§7.5
  with 404 tests. ✓
- **Alternatives considered:** §4 evaluates mkcert vs openssl vs npm-cert-lib; RSA-2048 vs
  Ed25519 vs EC P-256; bind-all vs loopback; cert-download vs hand-copy. Strong. ✓

No scope cap applied.

## Flaws of Commission

1. **None gate-blocking.** The DER/X.509 construction remains correct: `version [0] EXPLICIT
   INTEGER 2`, `extensions [3] EXPLICIT`, dNSName `[2]`/iPAddress `[7]` IMPLICIT context
   tags, SPKI reused from Node (no hand-encoded key bytes), `sign('sha256', tbs, key)` →
   PKCS#1 v1.5 matching OID `1.2.840.113549.1.1.11`, random ≤16-byte positive serial (the
   `int` leading-zero rule keeps it positive and ≤20 octets), self-signature verified via
   `cert.verify(cert.publicKey)`. The Rev-1 security defect is closed. No new commission
   introduced by the fixes.

## Flaws of Omission

1. **Basic KeyUsage bit-string is encoded but not independently asserted (Path-to-100).**
   §Phase 2 emits `keyUsage(digitalSignature|keyEncipherment, critical)` via
   `der.bitString(buf, unusedBits)`, but the acceptance criteria assert only EKU
   (`.keyUsage` OID) and `ca === false` — Node's `X509Certificate` does not conveniently
   surface the basic KeyUsage bits, so the fiddliest DER (unused-bits count + bit order) is
   unverified by test. iOS enforces SAN/EKU/validity far more than basic KeyUsage, so this
   is not gate-blocking, but a golden-byte assertion on the KeyUsage extension DER in
   `der.test.mjs` would remove the one unencoded-correctly-by-inspection risk.

2. **`buildSanExtension` IPv4 detection heuristic is not pinned (Path-to-100).** §Phase 2
   says "IPv4-looking hosts → iPAddress [7]; everything else → dNSName" but does not state
   the exact predicate (e.g. `/^\d{1,3}(\.\d{1,3}){3}$/` with 0–255 range). An underspecified
   heuristic risks a `--host` value being classified into the wrong GeneralName. Pin the
   regex/range check and unit-test one IPv4 and one hostname boundary.

3. **IPv6 `--host` handling unspecified (Path-to-100).** LAN discovery is IPv4-only
   (`lanIpv4Addresses`), but an operator could pass an IPv6 literal via `--host`; under the
   heuristic above it would fall to dNSName and produce a SAN that never matches. Either
   document IPv6 as unsupported or map it to iPAddress [7] (16 bytes). Minor — IPv6 LAN
   kiosks are unusual.

4. Otherwise omissions are thoroughly covered: §8 handles EADDRINUSE, unwritable cert dir
   (no insecure fallback), expired/malformed/key-mismatched/SAN-missing cache, traversal
   (`..`/`%2e%2e`/absolute/NUL), non-GET/HEAD (405 + Allow), missing index, symlink escape
   via realpath, untrusted-origin cert download, client disconnect, SIGINT/SIGTERM, and
   REPL-import safety.

## Regressions

1. **None.** `serve` (plain-HTTP Playwright `webServer`) and the CI workflow are untouched
   (§2 Out of scope, §7.2). `http-server` stays a dependency for `serve`; removing `-S` from
   `serve:https` breaks no consumer. `package-lock.json` is not touched (no dep added or
   removed). Test coverage grows (4 unit + 1 e2e suite); nothing shrinks. mkcert→pure-Node
   is a net improvement with a documented rollback (§12). No API/contract/perf regression.

## Why 98 and not 99

Two small test-completeness gaps and one specificity gap remain: the basic KeyUsage
extension DER is emitted but not asserted by any test (Omission #1); the IPv4-vs-dNSName
predicate in `buildSanExtension` is described as "IPv4-looking" rather than pinned to an
exact check (Omission #2); and IPv6 `--host` behavior is undefined (Omission #3). None
threaten the gate — they are the difference between "correct as written and heavily tested"
and "every byte independently proven." The plan is otherwise flawless and
implementation-ready.

## Why 99 and not 100

A perfect plan would (a) add a golden-byte `der.test.mjs` assertion for the KeyUsage
extension so no encoded field is verified only by inspection, (b) pin the exact IPv4
predicate and test its boundary, (c) resolve IPv6 `--host` explicitly, and (d) offer a
one-line operator note that a **static IP / DHCP reservation** avoids the re-trust churn
that `ensureCert`'s SAN-mismatch regeneration otherwise imposes on every address change.

## Path to 100 (all non-blocking — the plan is approved)

1. Add a golden-byte KeyUsage-extension assertion in `tests/unit/der.test.mjs`
   (`digitalSignature|keyEncipherment`, critical, correct unused-bits count).
2. Pin `buildSanExtension`'s IPv4 predicate to an exact regex + 0–255 range check and
   unit-test one IPv4 and one hostname on the boundary.
3. State IPv6 `--host` handling explicitly (map to iPAddress [7] 16-byte, or document as
   unsupported).
4. Add a README one-liner recommending a static IP / DHCP reservation for the host so the
   trusted cert stays stable across restarts (avoids re-trust churn).

## Summary

Approval-grade and implementation-ready. v19 closes the Rev-1 private-key-disclosure
security defect (three layered guards + 404 tests) and the out-of-the-box SAN/LAN-IP
mismatch (default LAN-IPv4 SAN seeding + injected-snapshot test), and folds in every
Rev-1 nit. Scope is exactly right — the single remaining backlog item, no more.
**State 1 → State 2: implement the approved plan v19. Do not revise the plan to chase the
last two points; land the code** and fold the four Path-to-100 items in during
implementation.
