/* Firestore append-only mirror over the plain REST API — no SDK, no bundler.

   Design rules:
   - Local-first. store.appendCheckIn() has already committed before we are
     called; a failure here NEVER blocks or reverses a check-in.
   - Idempotent. The visitId is the Firestore document id, so a retry after a
     flaky response cannot create a duplicate.
   - Create-only. Matching rules forbid read/update/delete, so the API key in
     the bundle cannot be used to exfiltrate or wipe the guest list. An undo is
     recorded as a separate `retracted` document, never a delete.
   - Queued. Unsent writes persist in localStorage and flush on reconnect. */

const QUEUE_KEY = 'checkin007.cloudqueue.v1';

function endpoint(cloud, collection, documentId) {
  const base = `https://firestore.googleapis.com/v1/projects/${cloud.PROJECT_ID}/databases/(default)/documents/${collection}`;
  const params = new URLSearchParams({ key: cloud.API_KEY });
  if (documentId) params.set('documentId', documentId);
  return `${base}?${params}`;
}

/* Firestore REST wants typed values. Only strings here, so this stays trivial. */
function toFirestoreFields(record) {
  const fields = {};
  for (const [key, value] of Object.entries(record)) {
    fields[key] = { stringValue: String(value ?? '') };
  }
  return fields;
}

export function createCloudSync({ cloud, storage = globalThis.localStorage, fetchImpl } = {}) {
  const enabled = Boolean(cloud?.PROJECT_ID && cloud?.API_KEY);
  const doFetch = fetchImpl || globalThis.fetch?.bind(globalThis);
  const listeners = new Set();
  let flushing = false;
  let timer = null;

  function readQueue() {
    try {
      const parsed = JSON.parse(storage?.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeQueue(items) {
    try {
      storage?.setItem(QUEUE_KEY, JSON.stringify(items));
    } catch {
      /* storage full or evicted — the local log is still authoritative */
    }
  }

  function status() {
    const queue = readQueue();
    return {
      enabled,
      pending: queue.length,
      online: globalThis.navigator?.onLine !== false,
      failed: queue.filter((item) => item.attempts >= (cloud?.MAX_ATTEMPTS ?? 6)).length,
    };
  }

  function emit() {
    const snapshot = status();
    for (const listener of listeners) listener(snapshot);
  }

  function enqueue(item) {
    if (!enabled) return;
    const queue = readQueue();
    if (queue.some((queued) => queued.documentId === item.documentId)) return;
    queue.push({ ...item, attempts: 0 });
    writeQueue(queue);
    emit();
    flush();
  }

  async function send(item) {
    const response = await doFetch(endpoint(cloud, item.collection, item.documentId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFirestoreFields(item.record) }),
    });
    // 409 ALREADY_EXISTS means a previous attempt landed — treat as success.
    if (response.ok || response.status === 409) return true;
    // 4xx other than 409 will never succeed on retry; drop it rather than spin.
    if (response.status >= 400 && response.status < 500) return 'permanent';
    return false;
  }

  async function flush() {
    if (!enabled || flushing) return;
    if (globalThis.navigator?.onLine === false) return;
    flushing = true;
    try {
      let queue = readQueue();
      while (queue.length) {
        const [item] = queue;
        if (item.attempts >= (cloud?.MAX_ATTEMPTS ?? 6)) break;
        let outcome = false;
        try {
          outcome = await send(item);
        } catch {
          outcome = false;
        }
        queue = readQueue();
        if (outcome === true || outcome === 'permanent') {
          queue = queue.filter((queued) => queued.documentId !== item.documentId);
          writeQueue(queue);
        } else {
          queue = queue.map((queued) =>
            queued.documentId === item.documentId
              ? { ...queued, attempts: queued.attempts + 1 }
              : queued,
          );
          writeQueue(queue);
          schedule();
          break;
        }
      }
    } finally {
      flushing = false;
      emit();
    }
  }

  function schedule() {
    if (timer) return;
    timer = globalThis.setTimeout(() => {
      timer = null;
      flush();
    }, cloud?.RETRY_MS ?? 15000);
  }

  if (enabled) {
    globalThis.addEventListener?.('online', () => flush());
    flush();
  }

  return {
    isEnabled: () => enabled,
    status,
    onStatusChange(listener) {
      listeners.add(listener);
      listener(status());
      return () => listeners.delete(listener);
    },
    recordCheckIn(entry) {
      enqueue({
        collection: cloud.COLLECTION,
        documentId: entry.visitId,
        record: {
          eventId: cloud.EVENT_ID,
          visitId: entry.visitId,
          guestId: entry.guestId,
          name: entry.name,
          table: entry.table,
          timestamp: entry.timestamp,
          retracted: 'false',
        },
      });
    },
    /* Undo: a second create, not a delete, so create-only rules still hold. */
    recordRetraction(entry) {
      enqueue({
        collection: cloud.COLLECTION,
        documentId: `${entry.visitId}-retracted`,
        record: {
          eventId: cloud.EVENT_ID,
          visitId: entry.visitId,
          guestId: entry.guestId,
          name: entry.name,
          table: entry.table,
          timestamp: entry.timestamp,
          retracted: 'true',
        },
      });
    },
    flush,
  };
}
