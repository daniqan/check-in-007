# Check-In 007

Self-service event check-in kiosk for an iPad. The camera scan is theatrical only: no
camera frame is read, captured, transmitted, or stored.

## Run

This project pins the **Node 24 LTS** toolchain. Select it before installing:

```bash
nvm install && nvm use   # reads .nvmrc → 24.20.0 (asdf/mise read .node-version)
node --version           # v24.x.y
npm ci
npm run serve
```

`npm run lint`, `npm test`, and `npm run build` fail fast on any Node major other than 24
(a one-line recovery hint is printed); run `npm run check:node` to check the current
runtime on its own. `serve`/`serve:https` stay unguarded so a dev server still starts for
diagnosis.

Open `http://localhost:8080`.

### Live camera on an offline iPad

For an iPad on the same LAN, start the dependency-free HTTPS helper:

```bash
npm run serve:https
```

The helper generates and caches a self-signed certificate, automatically discovers the
host's LAN IPv4 addresses, includes them in the certificate, and prints matching kiosk and
certificate-download URLs. It needs no internet, `mkcert`, or OpenSSL. Connect the host and
iPad with ad-hoc Wi-Fi, Personal Hotspot, or a travel router, then open the printed
`https://<host-lan-ip>:8443/` URL. Use `npm run serve:https -- --host <name-or-extra-ip>`
to add a resolvable custom name or address. A static IP or DHCP reservation avoids needing
to re-trust a regenerated certificate after the host address changes.

| Flag                  | Default           | Meaning                                            |
| --------------------- | ----------------- | -------------------------------------------------- |
| `--bind <address>`    | `0.0.0.0`         | Listener interface; `127.0.0.1` is host-only       |
| `--host <name-or-ip>` | none; repeatable  | Additional certificate SAN, not a listen address   |
| `--port <1-65535>`    | `8443`            | Listener port                                      |
| `--root <path>`       | current directory | Static content root                                |
| `--cert-dir <path>`   | `.certs`          | Private certificate cache, never statically served |

The default wildcard bind listens on all IPv4 interfaces and advertises the discovered LAN
addresses. To restrict the helper to this computer, use
`npm run serve:https -- --bind 127.0.0.1`. To listen on one specific LAN interface, use
`npm run serve:https -- --bind <host-lan-ip>`; an explicit bind is automatically included in the
certificate SAN. `--host` only adds another certificate identity and does not change where the
server listens. A loopback bind prevents an iPad from reaching the helper over the LAN. An IPv6
wildcard bind uses the existing IPv4 discovery as a best-effort advertisement for the usual
dual-stack listener; IPv6-only interface discovery and reachability probing are not provided.

On the iPad:

1. Open the printed `/checkin007-cert.pem` URL and allow the profile download.
2. Open Settings → General → VPN & Device Management and install the downloaded profile.
3. Open Settings → General → About → Certificate Trust Settings and enable full trust for
   the CheckIn007 certificate.
4. Reload the kiosk URL and allow camera access.

| Origin / client    | Live camera | Requirement                                      |
| ------------------ | ----------- | ------------------------------------------------ |
| Trusted `https://` | Yes         | Install and fully trust the helper certificate   |
| `http://localhost` | Yes         | Requires a web server running on the same device |
| `http://<lan-ip>`  | No          | Not a secure context                             |
| `file://`          | No          | Uses covert scan fallback                        |
| Native SwiftUI app | Yes         | No HTTPS required                                |

A single iPad with no companion host should use the native SwiftUI app.

## Build And Test

```bash
npm run lint
npm test
npm run build
```

`dist/index.html` is self-contained and also opens from `file://`; that mode uses covert
scan fallback because camera access requires a secure context.

## Continuous Integration

`.github/workflows/ci.yml` runs the full web quality gate — `npm ci`, `npm run lint`, unit
tests, Playwright chromium e2e, and `npm run build` — on the pinned Node 24 line
(`ubuntu-latest`) for every push to `main`/`master` and every pull request, with npm and
Playwright-browser caching. The built `dist/index.html` is uploaded as a per-run artifact.

External native-simulator and live-CI verification status is recorded in
[`docs/VERIFICATION_EVIDENCE.md`](docs/VERIFICATION_EVIDENCE.md). Only results explicitly marked
`PASS` there are verified. The Cycle 12 CSV repair and all 33 native unit methods pass on the iOS
26.4 iPad simulator; the full native gate remains failed on four pre-existing UI element-lookup
tests, and the exact-SHA GitHub Actions run remains blocked by external billing.

## Multi-Device Log Merge

1. Export JSON or CSV from each event device.
2. On the consolidation device, open Admin Controls and select those files under Merge Logs.
3. Review accepted, duplicate, invalid, and file-error counts.
4. Apply Merge.
5. Export the consolidated CSV or JSON from Admin Controls.

## Optional Scan Audio

Admin Controls includes an optional Scan blip audio setting. When enabled, the kiosk
unlocks local Web Audio from the first guest-selection gesture and synthesizes a short
scan cue on identification; it does not request microphone access or record audio.

## iPad Checklist

Camera permission prompt appears on HTTPS; front camera feed is visible; portrait and
landscape fit without overlap; Add to Home Screen launches full-screen with black status
bar; controls do not trigger double-tap zoom; inputs are at least 16 px; callout/selection
are suppressed where Safari allows; VoiceOver announces roster rows, scan status, result
assignment, and admin actions; export the check-in log at the end of the event from the
admin panel.

## Native iPad App (SwiftUI)

A native SwiftUI iPad build lives under `native/` as a maximum-fidelity alternative to the
web kiosk. It mirrors the same roster, theatrical scan, admin controls, export/merge
formats, audio privacy posture, and event-log semantics, but uses AVFoundation for the
live preview and local device storage instead of Safari and `localStorage`. The web app is
unchanged and remains the default client.

### Prerequisites

- macOS with **Xcode 26** (stable) and the **iPadOS 26 SDK**. Minimum deployment target:
  iPadOS 26.0.
- **At least one installed iPadOS simulator runtime.** This is a multi-gigabyte download
  that is _not_ installed with Xcode by default. Install it once:

```bash
xcodebuild -downloadPlatform iOS        # or: Xcode → Settings → Components → iOS/iPadOS 26
xcrun simctl list runtimes              # confirm an iOS/iPadOS 26 runtime now appears
xcrun simctl list devices available | grep -i 'iPad Pro 13-inch (M4)'   # confirm the device
```

If `iPad Pro 13-inch (M4)` is not present, pick the newest available iPad from
`xcrun simctl list devices available` and pass its name to `-destination`.

### Roster parity

The native default roster is generated from the web roster (`data/guests.default.js`) so the
two clients stay in lockstep. The generator reuses the web app's own `normalizeGuests`, so
IDs, duplicate dropping, and search text are byte-identical:

```bash
node scripts/export-native-guests.mjs   # writes native/CheckIn007/Resources/default-guests.json
```

`tests/unit/native-guests-export.test.mjs` byte-compares a fresh regeneration against the
committed JSON and fails if they drift.

### Open, run, and test

```bash
open native/CheckIn007.xcodeproj
# Ensure a runtime is installed (see Prerequisites) before the test command:
xcodebuild -project native/CheckIn007.xcodeproj -scheme CheckIn007 \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4)' test
```

To run interactively, open the project, select the `CheckIn007` scheme and an iPad
simulator or connected iPad, and Run.

### Privacy boundary

The scan screen adds a video input and preview layer only — no photo/movie/video-data
outputs, no microphone input, and no frame-processing delegate. The app never captures,
stores, transmits, or processes frames. On camera denial or unavailability it falls back to
covert mode and the check-in flow continues. Scan-blip audio is off by default and never
requests microphone permission.

### Lint note

`native/` is excluded from `npm run lint` (`.prettierignore`) because Prettier has no
`.swift`/`.plist`/`.pbxproj` parser; the one lint-relevant artifact, the generated
`default-guests.json`, is emitted Prettier-conformant regardless, and its parity is enforced
by the unit test above.
