import { displayTable } from '../lib/format.mjs';

export function mountResult(root, { guest, timing, onDone, repeat }) {
  root.innerHTML = `
    <section class="screen result-screen" aria-labelledby="result-title">
      <p>${repeat ? 'RE-VERIFYING' : 'AGENT IDENTIFIED'}</p>
      <h1 id="result-title" aria-live="assertive">${guest.name}</h1>
      <strong>PROCEED TO YOUR ASSIGNMENT:</strong>
      <div class="assignment">${displayTable(guest.table)}</div>
    </section>
  `;
  const timer = window.setTimeout(onDone, timing.RESULT_MS);
  return () => window.clearTimeout(timer);
}
