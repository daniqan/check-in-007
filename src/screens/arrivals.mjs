import { computeArrivals } from '../lib/arrivals.mjs';

/* Arrivals dashboard: live count, who is still out, per-table progress, undo
   and CSV export. Everything is derived from (roster, log) on each render, so
   an undo or a roster re-import is reflected immediately. */

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
}

function clockTime(timestamp) {
  const match = String(timestamp).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : '--:--';
}

export function mountArrivals(root, { guests, store, cloud, onClose, onExport }) {
  root.innerHTML = `
    <section class="screen arrivals-screen" aria-labelledby="arrivals-title">
      <header class="arrivals-header">
        <div>
          <p>EVENT OPERATIONS</p>
          <h1 id="arrivals-title">Arrivals</h1>
        </div>
        <div class="arrivals-actions">
          <button type="button" data-action="export">Export CSV</button>
          <button type="button" data-action="close">Close</button>
        </div>
      </header>
      <div class="arrivals-body"></div>
    </section>
  `;

  const body = root.querySelector('.arrivals-body');

  function render() {
    const log = store.loadLog();
    const view = computeArrivals(guests, log);
    const cloudStatus = cloud?.status?.() ?? { enabled: false, pending: 0 };

    const cloudLine = !cloudStatus.enabled
      ? 'LOCAL ONLY · NO CLOUD BACKUP CONFIGURED'
      : cloudStatus.pending > 0
        ? `CLOUD BACKUP · ${cloudStatus.pending} PENDING`
        : 'CLOUD BACKUP · UP TO DATE';

    body.innerHTML = `
      <div class="arrivals-stats">
        <div class="stat">
          <p>CHECKED IN</p>
          <strong>${view.arrivedCount}<span> / ${view.total}</span></strong>
        </div>
        <div class="stat">
          <p>STILL OUT</p>
          <strong>${view.pendingCount}</strong>
        </div>
        <div class="stat">
          <p>ARRIVED</p>
          <strong>${view.percent}<span>%</span></strong>
        </div>
        <div class="stat stat-cloud">
          <p>STATUS</p>
          <small>${escapeHtml(cloudLine)}</small>
        </div>
      </div>

      <div class="arrivals-columns">
        <section class="arrivals-panel">
          <h2>Seating Progress</h2>
          <ul class="table-progress">
            ${view.tables
              .map(
                (table) => `
              <li>
                <span class="table-name">${escapeHtml(table.label)}</span>
                <span class="table-bar" aria-hidden="true">
                  <span style="width:${table.total ? (table.arrived / table.total) * 100 : 0}%"></span>
                </span>
                <span class="table-count">${table.arrived}/${table.total}</span>
              </li>`,
              )
              .join('')}
          </ul>
        </section>

        <section class="arrivals-panel">
          <h2>Not Yet Arrived <small>${view.pendingCount}</small></h2>
          <ul class="arrivals-list">
            ${
              view.pending.length
                ? view.pending
                    .map(
                      (guest) => `
              <li>
                <span>${escapeHtml(guest.name)}</span>
                <small>${escapeHtml(guest.table || '—')}</small>
              </li>`,
                    )
                    .join('')
                : '<li class="arrivals-none">EVERYONE IS IN</li>'
            }
          </ul>
        </section>

        <section class="arrivals-panel">
          <h2>Checked In <small>${view.arrivedCount}</small></h2>
          <ul class="arrivals-list">
            ${
              view.arrived.length
                ? view.arrived
                    .map(
                      (guest) => `
              <li>
                <span>${escapeHtml(guest.name)}</span>
                <small>${clockTime(guest.timestamp)}</small>
                <button type="button" data-undo="${escapeHtml(guest.visitId)}">Undo</button>
              </li>`,
                    )
                    .join('')
                : '<li class="arrivals-none">NO ARRIVALS YET</li>'
            }
          </ul>
        </section>
      </div>
    `;
  }

  function onClick(event) {
    const undo = event.target.closest('button[data-undo]');
    if (undo) {
      const removed = store.removeCheckIn(undo.dataset.undo);
      if (removed) cloud?.recordRetraction?.(removed);
      render();
      return;
    }
    const action = event.target.closest('button[data-action]');
    if (!action) return;
    if (action.dataset.action === 'close') onClose();
    if (action.dataset.action === 'export') onExport();
  }

  root.addEventListener('click', onClick);
  const unsubscribe = cloud?.onStatusChange?.(() => render()) ?? (() => {});
  render();

  return () => {
    root.removeEventListener('click', onClick);
    unsubscribe();
  };
}
