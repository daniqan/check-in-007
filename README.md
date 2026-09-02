# Check-In 007

Self-service event check-in kiosk for an iPad. The camera scan is theatrical only: no
camera frame is read, captured, transmitted, or stored.

## Run

```bash
npm ci
npm run serve
```

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

## iPad Checklist

Camera permission prompt appears on HTTPS; front camera feed is visible; portrait and
landscape fit without overlap; Add to Home Screen launches full-screen with black status
bar; controls do not trigger double-tap zoom; inputs are at least 16 px; callout/selection
are suppressed where Safari allows; VoiceOver announces roster rows, scan status, result
assignment, and admin actions; export the check-in log at the end of the event from the
admin panel.
