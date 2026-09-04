import { parseGuestCsv } from '../lib/csv.mjs';
import { parseLogFile } from '../lib/log-merge.mjs';

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

export function mountAdmin(
  root,
  {
    store,
    audioSettings = { scanBlipEnabled: false },
    onAudioSettingsChanged = (settings) => settings,
    onRosterChanged,
    onViewArrivals,
    onClose,
  },
) {
  const priorFocus = document.activeElement;
  const normalizedAudioSettings = { scanBlipEnabled: audioSettings?.scanBlipEnabled === true };
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
        <section class="merge-panel" aria-labelledby="merge-title">
          <h3 id="merge-title">Merge Logs</h3>
          <label class="file-label">Select log exports<input class="log-merge-input" type="file" multiple accept=".json,.csv,application/json,text/csv" /></label>
          <div class="merge-preview" aria-live="polite"></div>
          <button type="button" data-action="apply-merge" disabled>Apply Merge</button>
        </section>
        <label class="audio-setting"><input class="scan-blip-input" type="checkbox" ${normalizedAudioSettings.scanBlipEnabled ? 'checked' : ''} />Scan blip audio</label>
        <div class="admin-grid">
          <button type="button" data-action="view-arrivals" class="admin-primary">View Arrivals</button>
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
  const mergeInput = dialog.querySelector('.log-merge-input');
  const scanBlipInput = dialog.querySelector('.scan-blip-input');
  const mergePreview = dialog.querySelector('.merge-preview');
  const applyMergeButton = dialog.querySelector('[data-action="apply-merge"]');
  let clearArmed = false;
  let activeMergeRows = [];
  let activeFileSummaries = [];
  let hasActivePreview = false;

  async function readMergeFiles(fileList) {
    const files = Array.from(fileList || []);
    const importedEntries = [];
    const fileSummaries = [];

    for (const file of files) {
      try {
        const parsed = parseLogFile(file.name, await file.text());
        importedEntries.push(...parsed.entries);
        fileSummaries.push({
          name: file.name,
          acceptedRows: parsed.entries.length,
          invalidRows: parsed.invalidRows.length,
          errors: parsed.errors,
        });
      } catch (error) {
        fileSummaries.push({
          name: file.name,
          acceptedRows: 0,
          invalidRows: 0,
          errors: [`${file.name}: ${error.message}`],
        });
      }
    }

    return { importedEntries, fileSummaries };
  }

  function renderMergePreview(result, fileSummaries, applied = false) {
    const importedRowCount = fileSummaries.reduce(
      (total, item) => total + item.acceptedRows + item.invalidRows,
      0,
    );
    const parsedInvalidCount = fileSummaries.reduce((total, item) => total + item.invalidRows, 0);
    const hasFileErrors = fileSummaries.some((item) => item.errors.length);
    const errors = fileSummaries.flatMap((item) => [
      ...item.errors,
      ...(item.invalidRows ? [`${item.name}: skipped ${item.invalidRows} invalid rows.`] : []),
    ]);

    mergePreview.replaceChildren();
    const summary = document.createElement('dl');
    summary.className = 'merge-summary';
    const rows = [
      ['Current local rows', result.summary.currentCount],
      ['Imported rows', importedRowCount],
      ['Accepted new rows', result.summary.acceptedCount],
      ['Skipped duplicates', result.summary.duplicateCount],
      ['Skipped invalid rows', parsedInvalidCount + result.summary.invalidImportedCount],
      ['Invalid existing rows', result.summary.invalidExistingCount],
      ['Final stored rows', result.entries.length],
    ];
    for (const [label, value] of rows) {
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = String(value);
      summary.append(term, detail);
    }
    mergePreview.append(summary);

    if (errors.length) {
      const list = document.createElement('ul');
      list.className = 'merge-errors';
      for (const message of errors) {
        const item = document.createElement('li');
        item.textContent = message;
        list.append(item);
      }
      mergePreview.append(list);
    }

    hasActivePreview = true;
    applyMergeButton.disabled = applied || activeMergeRows.length === 0;
    status.textContent = applied
      ? `Merge applied. Stored ${result.entries.length} rows.`
      : `Preview ready: ${result.summary.acceptedCount} new, ${result.summary.duplicateCount} duplicates${hasFileErrors ? ', with file errors' : ''}.`;
  }

  function clearMergePreview() {
    activeMergeRows = [];
    activeFileSummaries = [];
    hasActivePreview = false;
    mergeInput.value = '';
    mergePreview.replaceChildren();
    applyMergeButton.disabled = true;
  }

  async function handleMergeSelection() {
    const files = mergeInput.files;
    if (!files?.length) {
      clearMergePreview();
      status.textContent = 'No log files selected.';
      return;
    }
    const parsed = await readMergeFiles(files);
    activeMergeRows = parsed.importedEntries;
    activeFileSummaries = parsed.fileSummaries;
    renderMergePreview(store.previewLogMerge(activeMergeRows), activeFileSummaries);
  }

  function applyMerge() {
    if (!hasActivePreview || applyMergeButton.disabled || activeMergeRows.length === 0) return;
    const result = store.mergeLogEntries(activeMergeRows);
    renderMergePreview(result, activeFileSummaries, true);
  }

  function close() {
    clearMergePreview();
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
  mergeInput.addEventListener('change', handleMergeSelection);
  scanBlipInput.addEventListener('change', () => {
    const saved = onAudioSettingsChanged({ scanBlipEnabled: scanBlipInput.checked });
    scanBlipInput.checked = saved.scanBlipEnabled === true;
    status.textContent = scanBlipInput.checked
      ? 'Scan blip audio enabled.'
      : 'Scan blip audio disabled.';
  });

  dialog.addEventListener('click', async (event) => {
    const action = event.target?.dataset?.action;
    if (!action) return;
    if (action === 'apply-merge') {
      applyMerge();
      return;
    }
    if (action === 'view-arrivals') {
      // close() calls onClose, which returns to ROSTER; navigate after so the
      // dashboard is what the operator lands on.
      close();
      onViewArrivals?.();
      return;
    }
    if (action === 'export-csv')
      downloadText('check-in-007-log.csv', store.exportLogCsv(), 'text/csv');
    if (action === 'export-json')
      downloadText('check-in-007-log.json', store.exportLogJson(), 'application/json');
    if (action === 'copy-csv')
      status.textContent = `Copied ${await copyText(store.exportLogCsv())}`;
    if (action === 'copy-json')
      status.textContent = `Copied ${await copyText(store.exportLogJson())}`;
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
