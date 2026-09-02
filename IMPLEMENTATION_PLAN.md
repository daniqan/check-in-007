# Check-In 007 — Implementation Plan v18

> **Cycle 8 — On-device static-HTTPS helper for the offline-iPad live camera.** This is a
> NEW cycle started from `BACKLOG.md`. It addresses the **single remaining unchecked**
> Deferred-Features item:
>
> - "On-device static-HTTPS helper so the live camera works on a fully offline iPad (§10 Q2)"
>
> (`§10 Q2` refers to the original cycle-1 plan `archive/cycle-1/IMPLEMENTATION_PLAN.md`
> §10 "Defaults & Revisit Triggers" item 2: *"`file://` runs in covert mode; live camera
> requires HTTPS from a static host or on-site laptop. Revisit only if a fully offline
> live-camera iPad is a hard requirement."*)
>
> With this item done, **every** backlog item is closed.

## 1. Overview

The theatrical scan screen only shows a live front-camera feed when the page runs in a
**secure context** (`window.isSecureContext`) — see `src/screens/scan.mjs:32`. On a
**fully offline iPad** the two available origins are both insecure: `file://` (Safari
treats it as non-secure) and `http://<LAN-IP>` (plain HTTP to a non-loopback host is not a
secure context). Both fall back to covert mode. The only secure-context origins Safari
honours are `https://…` (with a **trusted** certificate) and loopback
(`http://localhost` / `http://127.0.0.1`).

This cycle adds a **dependency-free, fully-offline HTTPS kiosk helper**
(`scripts/serve-https.mjs`) that (a) mints its own SubjectAltName self-signed certificate
in **pure Node** — no `mkcert`, no `openssl`, no network, no npm dependency — (b) serves
the kiosk over HTTPS with a hardened static file handler, (c) exposes the certificate for
one-tap download so the iPad can **trust** it (Safari requires a *trusted* cert for a
secure context — clicking through a warning is not enough for `getUserMedia`), and (d)
prints the exact LAN URL and the iPad trust-install steps. It **replaces** the
mkcert-based `serve:https` script. No application source, styles, data, build output, CI,
or the native SwiftUI target change.

**Scope honesty (stated up front so the reviewer can evaluate it, not guess):** iOS Safari
cannot host its own web server, so a *truly standalone* iPad running the **web** kiosk
still needs an HTTPS host reachable on an offline link (ad-hoc Wi-Fi / Personal Hotspot /
a travel router — all zero-internet). This helper is that host, made **self-contained and
zero-install** so "offline" is real (no CA download, no trust-store mutation, no external
tooling). For a single iPad with **no companion device at all**, the **native SwiftUI
app** (Cycle 6, already shipped) provides the live camera via AVFoundation with no HTTPS
required. "On-device" is interpreted as *"served from the local device set on an offline
network, with nothing fetched from the internet or any external CA"* — §2 states this
boundary explicitly and §13 records the standalone-single-device limitation.

## 2. Scope

### In scope

1. `scripts/lib/der.mjs` (NEW) — a minimal, pure-function ASN.1/DER encoder (the primitives
   needed to emit an X.509 certificate).
2. `scripts/lib/dev-cert.mjs` (NEW) — pure-Node self-signed **SAN** certificate generation
   (RSA-2048 + SHA-256, `serverAuth` EKU, ≤825-day validity) and an on-disk cache
   (`ensureCert`).
3. `scripts/lib/static-server.mjs` (NEW) — a transport-agnostic hardened static request
   handler (correct MIME map, path-traversal rejection, `GET`/`HEAD` only, no directory
   listing, a certificate-download route).
4. `scripts/serve-https.mjs` (NEW) — the CLI: parse flags, ensure the cert, start an
   `node:https` server bound to `0.0.0.0`, print LAN URL(s) + the certificate-download URL +
   the iPad trust-install steps. Exports a testable `startServer(...)`; the CLI tail is
   guarded.
5. `package.json` (MOD) — repoint `serve:https` at the new helper; remove the mkcert/
   `http-server -S` invocation. **No new dependency; no dependency removed** (`http-server`
   stays for plain `serve`, which the e2e suite uses).
6. Unit + integration tests: `tests/unit/der.test.mjs`, `tests/unit/dev-cert.test.mjs`,
   `tests/unit/static-server.test.mjs`, `tests/unit/serve-https.test.mjs`.
7. `README.md` (MOD) — rewrite the iPad-HTTPS section: the offline helper, the iPad
   cert-trust walkthrough, the offline ad-hoc/hotspot setup, and an honest secure-context
   matrix. Prettier-clean.
8. `.gitignore` (MOD) — ensure the generated certificate cache directory (`.certs/`) is
   ignored (existing `*.pem`/`*.key` already cover the files; add the directory for clarity).
9. `BACKLOG.md` (MOD) — mark the offline-HTTPS item `[ ]` → `[/]`.

### Out of scope

- **Any change to `src/`, `data/`, `assets/`, `vendor/`, `dist/`, `scripts/build.mjs`,
  screen behaviour, or the kiosk/privacy contract.** `scan.mjs`'s existing secure-context
  gate and covert fallback are correct and unchanged.
- **A publicly-trusted / ACME / Let's-Encrypt certificate.** Offline by definition rules
  out any CA that requires network reachability. The cert is self-signed and locally
  trusted on the iPad.
- **Making the *web* kiosk run with a live camera on a single iPad with no companion
  device.** That requires an on-iOS web server (native code); the shipped native SwiftUI
  app already covers standalone-offline live camera (§13 Open Question #1).
- **Changing the plain-HTTP `serve` script** (used by the Playwright `webServer`) or the
  CI workflow. CI does not run `serve:https`.
- **Adding the helper to the Node-24 guard chain.** Consistent with the existing policy
  that `serve`/`serve:https` stay unguarded so a dev/host server starts on any runtime
  (README "serve/serve:https stay unguarded"). The new tests *are* covered by `test:unit`.
- **HTTP/2, gzip/deflate transfer encoding, byte-range requests, ETags.** A kiosk serves a
  handful of small static assets to one device; these add surface without benefit.

## 3. Architecture

```
Offline iPad (Safari)                         Host device (laptop / mini-PC / travel box)
        │                                               running Node 24
        │  1. GET https://<lan-ip>:8443/checkin007-cert.pem   (download cert)
        │  2. Settings ▸ General ▸ VPN & Device Mgmt ▸ install profile
        │  3. Settings ▸ General ▸ About ▸ Certificate Trust ▸ enable full trust
        │  4. GET https://<lan-ip>:8443/  (now a TRUSTED secure context)
        ▼                                               ▲
   getUserMedia() succeeds  ◄── secure context ─────────┤
                                                         │
                                   ┌─────────────────────┴───────────────────────┐
                                   │  scripts/serve-https.mjs  (CLI + startServer) │
                                   │      │ ensureCert()                          │
                                   │      ▼                                        │
                                   │  scripts/lib/dev-cert.mjs                     │
                                   │      │ generateSelfSignedCert()               │
                                   │      ▼        (RSA-2048, SHA-256, SAN, EKU)    │
                                   │  scripts/lib/der.mjs   (ASN.1/DER TLV)        │
                                   │      │ writes .certs/{key,cert}.pem (cached)  │
                                   │      ▼                                        │
                                   │  node:https.createServer({key,cert}, handler)│
                                   │      handler = createStaticHandler({ root })  │
                                   │                 scripts/lib/static-server.mjs │
                                   └───────────────────────────────────────────────┘
```

**Components & responsibilities**

- **`der.mjs`** — pure TLV encoders (`SEQUENCE`, `SET`, `INTEGER`, `BIT STRING`,
  `OCTET STRING`, `OID`, `UTF8String`, `IA5String`, `UTCTime`, `BOOLEAN`, `NULL`, explicit/
  implicit context tags, raw passthrough). No Node APIs beyond `Buffer`. The riskiest unit,
  so it is the most heavily tested.
- **`dev-cert.mjs`** — uses `node:crypto` (`generateKeyPairSync('rsa')`, SPKI DER export,
  `sign('sha256', …)`) plus `der.mjs` to emit a valid X.509 v3 self-signed cert; `ensureCert`
  caches key/cert PEM on disk and regenerates when missing or expired.
- **`static-server.mjs`** — transport-agnostic `(req,res)` handler: resolves+sandboxes the
  path under `root`, maps extensions to MIME types, streams the file, serves the cert-download
  route, and returns `404`/`405` for everything else. No `node:https` dependency, so it is
  unit-testable over plain `node:http`.
- **`serve-https.mjs`** — the only component that wires TLS: flag parsing, `ensureCert`,
  `https.createServer`, LAN-address discovery (`node:os` `networkInterfaces`), operator
  output, graceful shutdown. Exports `startServer` for the integration test; the executable
  tail is guarded exactly like `scripts/check-node-version.mjs`.

**Data-flow:** flags → `ensureCert` → `{key,cert}` → `https.createServer(handler)`; each
request → `createStaticHandler` → file stream or error. **Ownership boundaries:** `der.mjs`
owns byte encoding; `dev-cert.mjs` owns certificate shape + caching; `static-server.mjs`
owns HTTP semantics + path safety; `serve-https.mjs` owns TLS wiring + operator UX; README
owns the operator/iPad procedure. **Failure domains:** a cert-generation or file-write error
aborts startup with a clear message (never a silent insecure fallback); a per-request error
(missing file, bad method, traversal attempt) yields a clean 4xx without crashing the server.

## 4. Technical Decisions & Rationale

1. **Pure-Node self-signed certificate over `mkcert`/`openssl`.** The item's core word is
   *offline*. `mkcert` is an external binary that also mutates the OS trust store; `openssl`
   is a system tool absent on some hosts and impossible to invoke from the eventual test
   environment portably. Node ships every primitive needed — `crypto.generateKeyPairSync`,
   SPKI DER export, and `crypto.sign` — so a ~150-line DER encoder produces a self-contained,
   zero-install, fully-offline cert whose generation is **unit-testable without any external
   process**. **Alternatives considered:** (a) `mkcert` — rejected: external install +
   trust-store mutation + not self-contained-testable; (b) shell out to `openssl` — rejected:
   not guaranteed present, non-portable flags, still an external dependency; (c) an npm cert
   library (e.g. `node-forge`, `selfsigned`) — rejected: adds a runtime/dev dependency and
   supply-chain surface, contrary to the project's demonstrated dependency-free ethos (the
   Node-24 guard was praised for exactly this). **Tradeoff:** we own ~150 lines of DER, fully
   covered by tests, in exchange for zero external dependency and self-contained testing.

2. **RSA-2048 + SHA-256, not Ed25519 or a bare EC cert.** Apple's TLS trust rules (iOS 13+)
   require RSA ≥2048 or EC P-256/384 with a signature hash ≥ SHA-256. RSA-2048 is the
   broadest-compatible choice and its DER is simplest: the public key is embedded via Node's
   ready-made SPKI export (`publicKey.export({type:'spki',format:'der'})`), so **no key bytes
   are hand-encoded**, and the signature is a single `crypto.sign('sha256', tbs, key)` call
   (PKCS#1 v1.5 → OID `sha256WithRSAEncryption`). **Alternative considered:** Ed25519 —
   rejected: Safari TLS support for Ed25519 server certs is not dependable. **Alternative
   considered:** EC P-256 — viable but needs `ecdsa-with-SHA256` signature DER unwrapping;
   RSA avoids that complexity. **Tradeoff:** a slightly larger cert/handshake, negligible for
   a LAN kiosk.

3. **Mandatory SubjectAltName + `serverAuth` EKU + `basicConstraints CA:FALSE` +
   `keyUsage` + ≤825-day validity.** Apple rejects CN-only certs (SAN required since 2019),
   requires `id-kp-serverAuth` in ExtendedKeyUsage, and rejects TLS certs with validity
   > 825 days. The generator bakes all of these in (validity = 820 days; SAN always includes
   `DNS:localhost`, `IP:127.0.0.1`, plus every host/IP passed on the CLI). Getting any of
   these wrong is the classic "cert installs but Safari still refuses the secure context"
   failure, so each is asserted in tests via `crypto.X509Certificate`. **Evidence:** Apple
   Support HT210176 ("Requirements for trusted certificates in iOS 13 and macOS 10.15").

4. **Bind `0.0.0.0` and print discovered LAN URLs; default port `8443`.** An offline iPad
   reaches the host by LAN IP, so the server must listen on all interfaces, and the operator
   needs the exact `https://<ip>:8443` URL to type. `node:os.networkInterfaces()` yields the
   non-internal IPv4 addresses to print. `8443` keeps the prior `serve:https` port (README
   continuity) and needs no privileged bind. **Alternative considered:** bind `localhost`
   only — rejected: an external iPad could not reach it. **Tradeoff:** binding all interfaces
   is standard for a LAN dev/kiosk host; the cert restricts trust and no secrets are served.

5. **Serve the certificate for download at a fixed route (`/checkin007-cert.pem`).** Trust
   installation on iOS needs the cert file on the device first; serving it over the same
   (initially untrusted) HTTPS origin — Safari still downloads over an untrusted cert; it
   only blocks *secure-context APIs*, not the download — removes AirDrop/email/cable steps and
   keeps the flow fully offline and self-contained. **Alternative considered:** require the
   operator to hand-copy the pem — rejected: worse UX, more error-prone.

6. **Reuse the guarded executable-tail idiom
   (`import.meta.url === pathToFileURL(process.argv[1]).href`).** Identical to
   `scripts/check-node-version.mjs`, so `serve-https.mjs` can be imported by the integration
   test without starting a server, and its CLI still runs when executed directly. Consistency
   with the vetted existing pattern.

7. **Keep `serve:https` unguarded (no Node-24 guard prefix).** Matches the existing,
   deliberate policy (README: "serve/serve:https stay unguarded so a dev server still starts
   for diagnosis"). A host that only *serves static files* need not be pinned to Node 24; the
   correctness-bearing code paths are covered by the guarded `test:unit`. **Tradeoff:** the
   helper must use only APIs stable across the Node LTS lines it might run on
   (`node:https`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:url` — all
   long-stable); no bleeding-edge API is used.

8. **Cache the cert on disk (`.certs/`) and regenerate on missing/expired.** Re-minting per
   start is wasteful and would force the iPad to re-trust a new cert each launch. Caching keeps
   the trusted cert stable across restarts; regeneration triggers only when the file is absent
   or `notAfter` is in the past. `.certs/` is git-ignored (keys never committed).

## 5. File Manifest

```text
BACKLOG.md                          (MOD) — Offline-HTTPS item [ ] → [/].
IMPLEMENTATION_PLAN.md              (MOD) — Replace cycle-7 plan with this cycle-8 plan.
.gitignore                          (MOD) — Add `.certs/` (files already covered by *.pem/*.key).
package.json                        (MOD) — Repoint `serve:https` to scripts/serve-https.mjs.
scripts/lib/der.mjs                 (NEW) — Minimal pure ASN.1/DER TLV encoder.
scripts/lib/dev-cert.mjs            (NEW) — Pure-Node self-signed SAN cert + on-disk cache.
scripts/lib/static-server.mjs       (NEW) — Hardened transport-agnostic static handler.
scripts/serve-https.mjs             (NEW) — HTTPS CLI + exported startServer(); guarded tail.
tests/unit/der.test.mjs             (NEW) — TLV encoder correctness (lengths, tags, OIDs).
tests/unit/dev-cert.test.mjs        (NEW) — Generated cert parses & satisfies iOS TLS rules.
tests/unit/static-server.test.mjs   (NEW) — MIME, traversal, methods, 404/405, cert route.
tests/unit/serve-https.test.mjs     (NEW) — TLS integration: handshake + GET over https.
README.md                           (MOD) — Offline iPad-HTTPS section + trust walkthrough.
```

No `src/`, `data/`, `assets/`, `vendor/`, `native/`, `dist/`, `scripts/build.mjs`,
`.github/`, style, or screen file changes. `package-lock.json` is **not** touched (no
dependency added or removed).

## 6. Implementation Phases

### Phase 1: DER encoder (`scripts/lib/der.mjs`)

Pure functions returning `Buffer`s. DER is deterministic TLV (tag, definite length, value).

```js
// scripts/lib/der.mjs
// Minimal DER encoder — only the primitives an X.509 v3 cert needs.

/** Encode a definite length in DER short/long form. */
export function encodeLength(n) { ... }        // n<128 → [n]; else [0x80|k, ...k bytes]

/** tag byte + encodeLength(value) + value */
export function tlv(tag, value) { ... }        // value: Buffer

export function der(tagName, ...) // convenience wrappers below:
export function seq(...parts) { ... }          // 0x30, concat(parts)
export function set(...parts) { ... }          // 0x31
export function int(bufOrNumber) { ... }       // 0x02, minimal two's-complement, leading 0x00 if MSB set
export function bitString(buf, unusedBits = 0) // 0x03, [unusedBits, ...buf]
export function octetString(buf) { ... }       // 0x04
export function oid(dotted) { ... }            // 0x06, base-128 varint arcs (first = 40*a+b)
export function utf8String(str) { ... }        // 0x0C
export function ia5String(str) { ... }         // 0x16
export function boolean(v) { ... }             // 0x01, 0xFF/0x00
export function nullValue() { ... }            // 0x05 0x00
export function utcTime(date) { ... }          // 0x17, "YYMMDDHHMMSSZ" (years <2050)
export function explicit(tagNumber, inner) {}  // 0xA0|tagNumber, inner (already TLV)
export function implicit(tagNumber, buf) {}     // context-primitive [tagNumber] over raw bytes
export function raw(buf) { return buf; }         // passthrough for pre-encoded DER (e.g. SPKI)
```

**Acceptance criteria**
- `encodeLength(127)`=`[7f]`; `encodeLength(128)`=`[81 80]`; `encodeLength(256)`=`[82 01 00]`.
- `oid('1.2.840.113549.1.1.11')` matches the known `sha256WithRSAEncryption` DER bytes
  (`06 09 2a 86 48 86 f7 0d 01 01 0b`).
- `int(255)` = `02 02 00 ff` (leading zero because MSB set); `int(127)` = `02 01 7f`.
- `utcTime(new Date('2026-01-02T03:04:05Z'))` = `17 0d 32 36 30 31 30 32 30 33 30 34 30 35 5a`.
- Every helper returns a `Buffer` whose first byte is the correct tag and whose length field
  round-trips (a `readTlvLength` test helper re-reads it).

### Phase 2: Self-signed certificate (`scripts/lib/dev-cert.mjs`)

```js
// scripts/lib/dev-cert.mjs
import { generateKeyPairSync, sign, X509Certificate, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import * as der from './der.mjs';

export const CERT_VALIDITY_DAYS = 820;        // < Apple's 825-day TLS ceiling

/** Build the SAN extension GeneralNames from host strings.
 *  IPv4-looking hosts → iPAddress [7] (4 raw bytes); everything else → dNSName [2] IA5String. */
export function buildSanExtension(hosts) { ... }

/** Assemble the TBSCertificate DER for a v3 self-signed cert:
 *  version [0] INTEGER 2, random 16-byte serial, sig alg sha256WithRSAEncryption,
 *  issuer==subject (CN), validity (now-1h .. now+820d, UTCTime), SPKI (raw DER from Node),
 *  extensions [3]: basicConstraints(CA:FALSE, critical), keyUsage(digitalSignature|
 *  keyEncipherment, critical), extKeyUsage(serverAuth), subjectAltName(hosts). */
export function buildTbsCertificate({ subjectCN, spkiDer, hosts, notBefore, notAfter, serial }) { ... }

/** Generate an RSA-2048 self-signed cert.
 *  @returns {{ keyPem: string, certPem: string }} */
export function generateSelfSignedCert({ hosts = ['localhost', '127.0.0.1'],
                                         subjectCN = 'CheckIn007 Offline Kiosk',
                                         validityDays = CERT_VALIDITY_DAYS } = {}) {
  // 1. const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  // 2. const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  // 3. const tbs = buildTbsCertificate({ ... });
  // 4. const signature = sign('sha256', tbs, privateKey);            // PKCS#1 v1.5
  // 5. const cert = der.seq(der.raw(tbs), sigAlgId, der.bitString(signature));
  // 6. wrap DER → PEM (base64, 64-col, BEGIN/END CERTIFICATE); key via privateKey.export pkcs8 PEM
  ...
}

/** Return cached {keyPem, certPem} from `dir`, regenerating when absent or expired. */
export function ensureCert({ dir, hosts } = {}) {
  // if key.pem & cert.pem exist and new X509Certificate(certPem).validTo is in the future → reuse
  // else generateSelfSignedCert({hosts}) and write both (dir created 0700 if needed)
  ...
}
```

**Acceptance criteria** (all via `node:crypto.X509Certificate`)
- `new X509Certificate(certPem)` parses without throwing.
- `.subject` contains `CN=CheckIn007 Offline Kiosk`; `.issuer` equals `.subject` (self-signed).
- `.subjectAltName` contains `DNS:localhost`, `IP Address:127.0.0.1`, and any extra host passed.
- `.keyUsage` includes `serverAuth` (EKU) [Node surfaces EKU here]; the cert has
  basicConstraints CA:FALSE (assert via `.ca === false`).
- `(new Date(cert.validTo) - new Date(cert.validFrom)) / 86400000 <= 825`.
- `cert.verify(publicKeyObjectFromCert)` returns `true` (self-signature valid) — i.e.
  `cert.checkPrivateKey` / `cert.publicKey` round-trip and `cert.verify(cert.publicKey)`.
- `ensureCert` writes exactly `key.pem` + `cert.pem`; a second call with the same dir reuses
  them (file mtimes unchanged / identical bytes).

### Phase 3: Static handler (`scripts/lib/static-server.mjs`)

```js
// scripts/lib/static-server.mjs
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { normalize, join, extname, resolve, sep } from 'node:path';

export const MIME = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.map': 'application/json; charset=utf-8',
  '.pem': 'application/x-pem-file',
};

/** Resolve a URL path to an absolute file path strictly under `root`.
 *  Returns null on any traversal escape (decoded `..`, absolute, NUL). */
export function safeResolve(root, urlPath) { ... }

export function contentTypeFor(path) { ... }   // MIME[ext] || 'application/octet-stream'

/** Build a (req,res) handler serving files under `root`.
 *  Options: { root, certPath, certRoute='/checkin007-cert.pem' }.
 *  - Only GET/HEAD (else 405, Allow: GET, HEAD).
 *  - certRoute streams certPath as application/x-pem-file (Content-Disposition attachment).
 *  - '/' → '/index.html'.
 *  - traversal / missing file → 404 (no directory listing, no path echoed).
 *  - HEAD → headers only, no body. */
export function createStaticHandler({ root, certPath, certRoute } = {}) { ... }
```

**Acceptance criteria**
- `contentTypeFor('a.mjs')` = `text/javascript; charset=utf-8`; unknown ext →
  `application/octet-stream`.
- `safeResolve('/srv', '/../etc/passwd')`, `'/%2e%2e/x'`, `'/a/../../b'` → `null`;
  `safeResolve('/srv', '/index.html')` → `/srv/index.html`.
- `GET /` → 200 `text/html`; `GET /missing` → 404; `POST /` → 405 with `Allow: GET, HEAD`.
- `GET <certRoute>` → 200 `application/x-pem-file` with the exact cert bytes.
- `HEAD /` → 200, `Content-Type` set, empty body.

### Phase 4: HTTPS CLI (`scripts/serve-https.mjs`)

```js
// scripts/serve-https.mjs
import { createServer } from 'node:https';
import { networkInterfaces } from 'node:os';
import { pathToFileURL } from 'node:url';
import { ensureCert } from './lib/dev-cert.mjs';
import { createStaticHandler } from './lib/static-server.mjs';

export function parseArgs(argv) { ... }  // --host (repeatable), --port=8443, --root=., --cert-dir=.certs
export function lanUrls(port) { ... }    // https://<non-internal IPv4>:<port> for each iface

/** Start the server. Returns { server, port, url, certPath, close() }.
 *  Does NOT print (so tests stay quiet); the CLI tail prints. */
export function startServer({ host = '0.0.0.0', port = 8443, root = process.cwd(),
                             certDir = '.certs', hosts = [] } = {}) {
  // const { keyPem, certPem } = ensureCert({ dir: certDir, hosts: dedupe(['localhost','127.0.0.1', ...hosts]) });
  // const handler = createStaticHandler({ root, certPath: <written cert.pem>, certRoute });
  // const server = createServer({ key: keyPem, cert: certPem }, handler);
  // listen on port/host; resolve when 'listening'
  ...
}

// Guarded executable tail (same idiom as scripts/check-node-version.mjs):
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = parseArgs(process.argv.slice(2));
  const { port, close } = await startServer(opts);
  // print: LAN URLs, cert-download URL, and the 3-step iPad trust instructions
  // handle SIGINT/SIGTERM → close()
}
```

**Acceptance criteria**
- `parseArgs(['--port=9000','--host=cabinet.local'])` → `{ port:9000, hosts:['cabinet.local'], … }`;
  bad `--port` (non-numeric / out of 1–65535) throws a clear error.
- `startServer` on an ephemeral port (`port:0`) resolves with a usable `url` and a working
  `close()`; SAN includes any `hosts` passed.
- Running directly on this Node-26 machine starts and serves (helper is unguarded); Ctrl-C
  shuts down cleanly.

### Phase 5: Tests, wiring, and docs

`package.json`:
```json
{ "scripts": { "serve:https": "node scripts/serve-https.mjs" } }
```
(`serve`, `check:node`, `build`, `lint`, `test`, `test:unit`, `test:e2e`, `fonts:subset`
unchanged; `http-server` dependency retained for `serve`.)

`.gitignore`: add a line `\.certs/` (the generated `key.pem`/`cert.pem` are already matched
by the existing `*.pem`).

`README.md`: replace the current `mkcert` block under "Open `http://localhost:8080`…" with:
- A "Live camera on an offline iPad" subsection: `npm run serve:https` (optionally
  `-- --host <lan-ip-or-name>`), connect the iPad to the host's ad-hoc Wi-Fi / Personal
  Hotspot / a travel router (no internet needed), open `https://<host-lan-ip>:8443/`.
- The **iPad trust walkthrough** (download `checkin007-cert.pem` → install profile → enable
  full trust under Certificate Trust Settings → reload → camera prompt appears).
- An honest **secure-context matrix** table: `https://` (trusted) ✓ · `http://localhost`
  ✓ (needs an on-device server) · `http://<lan-ip>` ✗ · `file://` ✗ (covert) · native app ✓
  (no HTTPS needed) — with a one-line note that a single iPad with no companion should use
  the native app.
- Preserve all other README wording verbatim; keep Prettier-clean.

**Acceptance criteria**
- `npm run test:unit` runs all suites (existing 63 + the 4 new files) green.
- `npm run test:e2e` unchanged and green (helper does not touch the HTTP `serve` path).
- `prettier --check .` clean including the new scripts and README.
- `npm run build` still emits `dist/index.html` within budget (unchanged; sanity only).

> **Verification runtime note (same §5 policy as cycles 5–7).** This machine is Node
> v26.3.0, so the guarded `npm test`/`npm run lint`/`npm run build` fail closed by design.
> Verify the new work directly: `node --test tests/unit/*.test.mjs`, `npx prettier --check .`,
> `npx playwright test`, and `node scripts/serve-https.mjs` (manual start/stop). The new
> unit + integration tests are pure Node (no browser, no device), so they run fully on Node
> 26 here and on Node 24 in CI.

## 7. Integration Points

1. **`package.json` `serve:https` ↔ operators**
   - Contract: `npm run serve:https` starts an HTTPS static host with a cached self-signed cert.
   - Failure mode: port in use → `EADDRINUSE` message with the port; cert dir unwritable →
     clear error naming the dir.
   - Migration: no consumer besides operators; the removed `http-server -S`/mkcert path is
     documented in the README rewrite.

2. **Playwright `webServer` ↔ `serve`**
   - Contract: the e2e suite starts `npm run serve` (plain HTTP, port 8080) — **unchanged**.
   - Failure mode: none introduced (this cycle does not touch `serve`).
   - Migration: n/a.

3. **`static-server.mjs` ↔ the kiosk artifact**
   - Contract: serving repo root (or `dist/` via `--root dist`) returns the same bytes the
     browser expects; MIME for `.mjs`/`.css`/`.woff2`/`.svg`/`.json` is correct so ES modules
     and fonts load.
   - Failure mode: a wrong MIME for `.mjs` would break module loading → covered by a unit test.
   - Migration: n/a.

4. **`dev-cert.mjs` ↔ iOS Safari trust**
   - Contract: the cert satisfies iOS 13+ TLS trust (SAN, serverAuth EKU, ≤825 days,
     RSA-2048/SHA-256), so once installed+trusted, the origin is a secure context.
   - Failure mode: a missing SAN/EKU/over-long validity → Safari refuses the secure context;
     each is asserted in `dev-cert.test.mjs` against `X509Certificate`.
   - Migration: on iOS trust-model changes, adjust the extension set and re-assert.

5. **`.gitignore` ↔ secret hygiene**
   - Contract: `key.pem`/`cert.pem`/`.certs/` never enter version control.
   - Failure mode: an accidentally-committed key → `git status` shows nothing under `.certs/`
     (verified in Phase 5).
   - Migration: n/a.

## 8. Error Handling & Edge Cases

- **Port already in use:** `server.on('error', …)` maps `EADDRINUSE` to a one-line message
  ("port 8443 is in use; pass `-- --port <n>`") and a non-zero exit; never a silent bind.
- **Cert directory unwritable:** `ensureCert` catches the write error, reports the target
  dir, and aborts (no insecure HTTP fallback — failing to serve HTTPS must not silently
  degrade security).
- **Expired cached cert:** `ensureCert` detects `validTo` in the past and regenerates before
  listening.
- **Malformed/partial cached cert:** `new X509Certificate(certPem)` throws → treated as
  missing → regenerated.
- **Path traversal (`..`, encoded `%2e%2e`, absolute paths, NUL byte):** `safeResolve`
  returns `null` → 404 with no path echoed (no information leak).
- **Non-GET/HEAD method:** 405 with `Allow: GET, HEAD`.
- **Directory request / missing index:** `/` → `/index.html`; a directory without index → 404
  (no listing).
- **Symlink escape:** `safeResolve` compares the `resolve()`d path against `root + sep`; a
  file whose real path escapes root is rejected (defense in depth alongside the string check).
- **iPad connects before trusting the cert:** the download route still works over the
  untrusted origin (Safari blocks secure-context *APIs*, not the file download), so the
  operator can fetch and install the cert, then reload — documented in README.
- **Large/streamed files:** served via `createReadStream` (bounded memory); a client
  disconnect (`res` error) closes the stream without crashing the process.
- **SIGINT/SIGTERM:** `close()` stops accepting connections and exits cleanly.
- **`process.argv[1]` undefined (REPL import):** the guarded tail simply does not run
  (`pathToFileURL(undefined)` guarded by the equality check failing) — the module is import-safe.

## 9. Stability & Performance

- **Cert generation:** one-time RSA-2048 keygen (~30–150 ms) + DER assembly (µs) on first
  run only; cached thereafter, so steady-state startup is a file read + `https.createServer`
  (single-digit ms). Memory: a few KB of DER buffers, released after startup.
- **Per request:** O(path length) for the traversal check, then a streamed file copy
  (`createReadStream`) — memory bounded by the pipe buffer regardless of file size. A kiosk
  serves one device and a handful of small assets (~26 KB built artifact), so throughput and
  latency are trivially adequate.
- **DER encoder:** all operations are linear in output size; no recursion beyond the fixed
  cert nesting depth; no I/O.
- **Stability:** per-request errors are isolated (4xx, stream error handlers) and never crash
  the listener; the server refuses to start rather than serve insecurely; `0.0.0.0` bind is
  the only network exposure and it serves read-only static files with a locally-trusted cert.
- **Browser bundle:** unaffected — none of these files are included in `dist/index.html`; the
  ≤750 KB gzip / ≤1.2 MB raw budget is untouched (artifact remains ≈26,315 gzip bytes).

## 10. Testing Strategy

**`tests/unit/der.test.mjs`** — encoder correctness: `encodeLength` short/long form; `int`
minimal encoding + leading-zero rule; `oid` for `sha256WithRSAEncryption`, `commonName`
(`2.5.4.3`), `serverAuth` (`1.3.6.1.5.5.7.3.1`), `subjectAltName` (`2.5.29.17`); `utcTime`
byte layout; `bitString` unused-bits prefix; a `readTlvLength` helper round-trips each
primitive.

**`tests/unit/dev-cert.test.mjs`** — `generateSelfSignedCert({ hosts:['localhost',
'127.0.0.1','cabinet.local'] })` then, via `crypto.X509Certificate`: parses; subject/issuer
equal and contain the CN; SAN contains all three hosts (DNS + IP); EKU includes `serverAuth`;
`ca === false`; validity span ≤ 825 days and `validFrom` ≤ now ≤ `validTo`; self-signature
verifies (`cert.verify(cert.publicKey)` === true). `buildSanExtension` maps IPv4 → iPAddress
(4 bytes) and names → dNSName. `ensureCert` in a temp dir: first call writes `key.pem` +
`cert.pem`; second call reuses (identical bytes); a hand-expired cert triggers regeneration.

**`tests/unit/static-server.test.mjs`** — mount `createStaticHandler` on a plain
`node:http` server (ephemeral port) and `fetch` it: `GET /` 200 text/html; `GET /src/app.mjs`
200 `text/javascript`; `GET /nope` 404; `POST /` 405 + `Allow`; `GET <certRoute>` 200
`application/x-pem-file`; `HEAD /` 200 empty body; traversal (`/..%2f..%2fpackage.json`,
`/../../etc/hosts`) → 404. Pure-unit `safeResolve`/`contentTypeFor` assertions too.

**`tests/unit/serve-https.test.mjs`** — TLS integration: `startServer({ port:0,
root:process.cwd(), certDir:<temp> })`; read the generated `cert.pem`; `fetch(url, {
dispatcher/agent trusting that CA })` — using `https.request` with `ca: certPem` (Node
client, no browser) — asserts a successful TLS handshake, `GET /` 200 text/html, and a
traversal request 404 over TLS. `parseArgs` unit cases (port/host/root parsing + invalid
port throwing). Always `close()` in `after`/`finally`.

**Regression:** `node --test tests/unit/*.test.mjs` keeps the existing suites green;
`npx playwright test` unchanged; `npx prettier --check .` clean incl. new files + README;
`node scripts/build.mjs` still within budget.

**Manual device check (documented, not automated — same precedent as the native app):** on a
real offline iPad, install+trust the served cert, load `https://<host>:8443/`, confirm the
camera permission prompt appears and the front feed shows (secure context achieved).

## 11. Environment & Toolchain

- **Runtime:** Node 24 LTS is the pinned/target line; the helper uses only long-stable core
  modules (`node:https`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:url`) and
  runs on this Node-26 machine too (it is unguarded). No new npm dependency; `package-lock.json`
  unchanged.
- **No external tools:** unlike the removed path, there is **no `mkcert`, no `openssl`, and no
  network** requirement — the point of the cycle.
- **CI:** unaffected — `.github/workflows/ci.yml` runs `test:unit` (which now includes the new
  suites, all pure Node) on Node 24; it does not run `serve:https`.
- **iPad:** iPadOS Safari; a one-time cert trust install (Settings ▸ General ▸ VPN & Device
  Management, then Certificate Trust Settings). No developer account or provisioning needed.

## 12. Deployment & Distribution

- The kiosk artifact and its distribution are unchanged. `npm run serve:https` is an operator
  convenience for the offline live-camera scenario; it serves the repo root by default or
  `dist/` via `--root dist`.
- **Rollback:** (1) revert this cycle's commit; (2) `serve:https` returns to the prior
  `http-server -S` + mkcert line; (3) delete `.certs/` if present. The app and all other
  scripts are unaffected. Restore the backlog item `[/]` → `[ ]` only if the discriminator
  asks for the cycle to be abandoned.

## 13. Open Questions

1. **A single offline iPad with no companion device — web kiosk live camera?**
   - Proposed resolution: use the **native SwiftUI app** (Cycle 6), which provides the live
     camera via AVFoundation with no HTTPS/host needed. Making the *web* kiosk do this on a
     lone iPad would require an on-iOS web server (native code) and duplicate the native app's
     capability, so it is intentionally out of scope. This helper closes the item for the
     realistic offline event setup (iPad + a small host on an offline link).
   - Needed to confirm: whether any operator truly has *only* one iPad and *cannot* use the
     native app.

2. **SubjectAltName should include the operator's LAN IP for a warning-free first load?**
   - Proposed resolution: the CLI already accepts `--host <lan-ip>`; the README instructs
     operators to pass their host IP so the SAN matches the URL the iPad opens. A DHCP-changed
     IP means re-running with the new `--host` (regenerates the cert). Documented in §5/README.
   - Needed to confirm: whether to auto-add all discovered LAN IPv4s to the SAN by default
     (convenience vs. a broader-scoped cert). Deferred to a future polish item if requested.

3. **EC P-256 instead of RSA-2048 for a smaller cert/faster handshake?**
   - Proposed resolution: RSA-2048 this cycle for the broadest Safari compatibility and the
     simplest DER (SPKI reused from Node, single-call signature). EC is a reasonable future
     optimization once the RSA path is proven on-device.
   - Needed to confirm: measured need; not a current constraint for a LAN kiosk.
