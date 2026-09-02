import { parseGuestCsv } from '../lib/csv.mjs';

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return text;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  return text;
}

export function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function mountAdmin(root, { store, onRosterChanged, onClose }) {
  const priorFocus = document.activeElement;
  root.insertAdjacentHTML(
    'beforeend',
    `
    <section class="admin-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-title">
      <div class="admin-panel">
        <header>
          <h2 id="admin-title">ADMIN CONTROLS</h2>
          <button class="icon-button close-admin" type="button" aria-label="Close admin">x</button>
        </header>
        <label class="file-label">Load CSV roster<input class="csv-input" type="file" accept=".csv,text/csv" /></label>
        <div class="admin-grid">
          <button type="button" data-action="export-csv">Export CSV</button>
          <button type="button" data-action="copy-csv">Copy CSV</button>
          <button type="button" data-action="export-json">Export JSON</button>
          <button type="button" data-action="copy-json">Copy JSON</button>
          <button type="button" data-action="reset-roster">Reset Roster</button>
          <button type="button" data-action="clear-log">Clear Log</button>
        </div>
        <p class="admin-status" role="status" aria-live="polite"></p>
      </div>
    </section>`,
  );

  const dialog = root.querySelector('.admin-backdrop');
  const status = dialog.querySelector('.admin-status');
  const input = dialog.querySelector('.csv-input');
  let clearArmed = false;

  function close() {
    dialog.remove();
    if (priorFocus?.focus) priorFocus.focus({ preventScroll: true });
    onClose();
  }

  dialog.querySelector('.close-admin').addEventListener('click', close);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed = parseGuestCsv(await file.text());
      const guests = store.saveRosterOverride(parsed.guests);
      onRosterChanged(guests);
      status.textContent = `Loaded ${guests.length} agents; dropped ${parsed.droppedDuplicates} duplicates.`;
    } catch (error) {
      status.textContent = error.message;
    }
  });

  dialog.addEventListener('click', async (event) => {
    const action = event.target?.dataset?.action;
    if (!action) return;
    const csv = store.exportLogCsv();
    const json = store.exportLogJson();
    if (action === 'export-csv') downloadText('check-in-007-log.csv', csv, 'text/csv');
    if (action === 'export-json') downloadText('check-in-007-log.json', json, 'application/json');
    if (action === 'copy-csv') status.textContent = `Copied ${await copyText(csv)}`;
    if (action === 'copy-json') status.textContent = `Copied ${await copyText(json)}`;
    if (action === 'reset-roster') {
      onRosterChanged(store.resetRoster());
      status.textContent = 'Default roster restored.';
    }
    if (action === 'clear-log') {
      if (!clearArmed) {
        clearArmed = true;
        status.textContent = 'Press Clear Log again to confirm.';
      } else {
        store.clearLog();
        status.textContent = 'Log cleared.';
      }
    }
  });

  dialog.querySelector('.close-admin').focus({ preventScroll: true });
  return close;
}
