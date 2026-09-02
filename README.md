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

Open `http://localhost:8080`. For an iPad on the LAN, use HTTPS:

```bash
mkcert -install
mkcert localhost 127.0.0.1 <laptop-LAN-IP>
npm run serve:https
```

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
