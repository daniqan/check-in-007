# iPad Scroll Verification Runbook

This runbook is the only automated evidence path for resolving RA #14. Desktop Chromium,
desktop WebKit, and normal CI runs cannot prove the iPadOS touch-momentum scroll path.

## Prerequisites

- Node `24.20.0` and dependencies installed with `npm ci`.
- Xcode command-line tools available on macOS.
- An iOS Simulator runtime and iPad simulator listed by:

```sh
xcrun simctl list devices available
xcodebuild -version
```

- For a physical iPad, a trusted HTTPS URL that serves the current `dist/` output. The automated
  XCTest lane is simulator-or-external-base-URL only; physical iPad verification may be manual if the
  device is not attached to an Xcode runner.

## Simulator Verification

Run the required smoke test on a provisioned macOS runner:

```sh
CHECKIN007_IOS_DEVICE='iPad Pro 13-inch (M4)' \
CHECKIN007_IOS_RUNTIME='iOS' \
CHECKIN007_IOS_SCROLL_REQUIRED=1 \
npm run test:ios-scroll
```

The command builds the kiosk, serves `dist/` over the repository HTTPS helper when
`CHECKIN007_IOS_BASE_URL` is not set, opens Mobile Safari at the current hashed
`?scrollProbe=1` URL, performs the right-edge touch drag, and requires the probe to report movement.

## External URL / Device-Farm Verification

Use this when a device farm or trusted host already serves the current build:

```sh
CHECKIN007_IOS_BASE_URL='https://example.test/check-in-007' \
CHECKIN007_IOS_DEVICE='iPad Pro 13-inch (M4)' \
CHECKIN007_IOS_RUNTIME='iOS' \
CHECKIN007_IOS_SCROLL_REQUIRED=1 \
npm run test:ios-scroll
```

The base URL must serve the current `dist/check-in-007.<hash>.html` artifact and allow Mobile Safari
to load it without certificate warnings. If the host uses the repository HTTPS helper, install and
trust `/checkin007-cert.pem` on the device before running.

## Manual Physical-iPad Fallback

Use the fallback only when no automated device runner is available:

1. Run `npm run build`.
2. Read `dist/check-in-007.manifest.json` and note `artifact`.
3. Serve the full `dist/` directory over trusted HTTPS.
4. On the iPad, clear Website Data for the host or remove and recreate the Home Screen icon.
5. Open the hashed artifact URL named by `artifact`.
6. Confirm the roster list scrolls by touch from a fresh load without tab-switching away and back.
7. Record the artifact name, URL, iPad model, iPadOS version, browser mode, timestamp, and operator.

Manual evidence is acceptable for operator handoff, but automated JSON evidence is preferred.

## Evidence Contract

`npm run test:ios-scroll` writes JSON to `test-results/ios-scroll-result.json` by default. Override
the destination with `CHECKIN007_IOS_SCROLL_RESULT`.

A PASS capable of resolving RA #14 must include:

```json
{
  "status": "passed",
  "required": true,
  "device": "iPad Pro 13-inch (M4)",
  "runtime": "iOS",
  "url": "https://127.0.0.1:12345/check-in-007.15d6647afdf4.html?scrollProbe=1",
  "artifact": "check-in-007.15d6647afdf4.html",
  "resultBundle": "/repo/test-results/ios-scroll.xcresult",
  "startedAt": "2026-09-03T20:00:00.000Z",
  "finishedAt": "2026-09-03T20:01:00.000Z"
}
```

`status: "skipped"` or `status: "failed"` does not resolve RA #14. Required mode must fail closed
when `xcrun`, `xcodebuild`, the requested simulator runtime/device, HTTPS trust, build output, or the
scroll probe is unavailable.

## Cache Busting

Fresh iPad verification must use the hashed artifact listed in `dist/check-in-007.manifest.json`.
For Add-to-Home-Screen verification, confirm `dist/check-in-007.webmanifest` has `start_url` equal to
`"./" + artifact`. Remove stale Home Screen icons after redeploying if iPadOS keeps old standalone
launch metadata.
