# Cloud setup — Firestore append-only backup

The kiosk is **local-first**. Every check-in is written to `localStorage`
first; Firestore is a best-effort mirror. Losing wifi never blocks check-in —
unsent writes queue and flush when the network returns.

Leave `CLOUD.PROJECT_ID` blank and the kiosk runs fully offline, sending
nothing. Everything below is optional.

## Why bother, with one iPad?

One reason only: **durability.** iOS Safari can evict site storage under
pressure, and if the iPad is lost or reset mid-event the log goes with it.
The dashboard, the arrival count, the not-yet-arrived list and CSV export
are all local features and need no server at all.

## What you need from your side

1. A Google Cloud project with billing enabled.
2. Firestore in **Native mode**, in a region near the venue.
3. A **browser-key** API key, restricted to the Firestore API.

## Steps

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable firestore.googleapis.com

# one-time, pick a region close to the venue
gcloud firestore databases create --location=nam5

# publish the create-only rules from this repo
gcloud firestore deploy --rules=firestore.rules
```

Then create the API key (Console → APIs & Services → Credentials → Create
credentials → API key). Restrict it to the **Cloud Firestore API**. An HTTP
referrer restriction for the kiosk's origin is worth adding too.

Fill in `src/config.mjs`:

```js
export const CLOUD = {
  PROJECT_ID: 'your-project-id',
  API_KEY: 'AIza...',
  COLLECTION: 'checkins',
  EVENT_ID: 'gala-2026-09',   // change per event
  RETRY_MS: 15000,
  MAX_ATTEMPTS: 6,
};
```

## Why the API key in the bundle is safe here

It isn't a secret and it doesn't need to be. `firestore.rules` grants
**create only** on `/checkins/{visitId}`:

- No `read` — the key cannot pull your guest list back out.
- No `update` / `delete` — nobody can tamper with or wipe recorded arrivals.
- Field validation — documents must match the expected shape.

The worst a stranger with the URL can do is append junk check-in documents.
That is noise in a table you control, not a data breach. If that bothers you,
add Firebase App Check or anonymous auth and tighten `allow create` to
`request.auth != null`.

## Undo is a write, not a delete

Create-only rules mean an undo can't delete the original. The kiosk writes a
second document, `<visitId>-retracted`, with `retracted: "true"`. When you
read the data back, a check-in counts only if no retraction exists for it:

```bash
# after the event
gcloud firestore export gs://YOUR_BUCKET/checkins-$(date +%F)
```

Or read it in the Firebase console and filter `retracted == "false"`.

## Verifying it works

1. Fill in `CLOUD`, reload the kiosk, check someone in.
2. Open the arrivals dashboard (burger menu → ARRIVALS with `?devNav=1`).
   The STATUS tile should read `CLOUD BACKUP · UP TO DATE`.
3. Firebase console → Firestore → `checkins` should show the document, its id
   equal to the visit id.
4. Turn on airplane mode, check two people in — STATUS shows
   `CLOUD BACKUP · 2 PENDING`. Turn wifi back on; it drains to
   `UP TO DATE` within ~15s.

Retries are idempotent: the visit id is the document id, so a retry after a
flaky response can't double-record. A `409 ALREADY_EXISTS` is treated as
success.

## The one thing to test before the event

Run the whole flow on the real iPad, on the **venue's** wifi if you can get
on it. Captive portals are the usual failure: the network looks connected,
`navigator.onLine` is true, and writes fail until someone accepts the portal
terms. The queue handles it correctly (writes drain once traffic flows), but
you want to have seen it happen once.
