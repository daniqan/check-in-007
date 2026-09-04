import { displayTable } from '../lib/format.mjs';

/* The dossier screen no longer auto-advances. It waits for an explicit
   decision: CONFIRM checks the guest in (onConfirm), CANCEL returns to the
   roster without recording anything (onCancel). `timing` is still accepted so
   the call signature is unchanged, but RESULT_MS is intentionally unused. */
export function mountResult(root, { guest, onConfirm, onCancel, repeat }) {
  root.innerHTML = `
    <section class="screen result-screen" aria-labelledby="result-title">
      <p>${repeat ? 'RE-VERIFYING' : 'AGENT IDENTIFIED'}</p>
      <h1 id="result-title" aria-live="assertive">${guest.name}</h1>
      <strong>PROCEED TO YOUR ASSIGNMENT:</strong>
      <div class="assignment">${displayTable(guest.table)}</div>
      <div class="decision" role="group" aria-label="Confirm check-in">
        <button type="button" class="decision-deny" data-decision="cancel">
          <span class="decision-glyph" aria-hidden="true">
            <svg viewBox="0 0 40 40" focusable="false"><path d="M11 11 L29 29 M29 11 L11 29" /></svg>
          </span>
          <span class="decision-label">Not Me</span>
        </button>
        <button type="button" class="decision-confirm" data-decision="confirm">
          <span class="decision-glyph" aria-hidden="true">
            <svg viewBox="0 0 40 40" focusable="false"><path d="M9 21 L17 29 L31 12" /></svg>
          </span>
          <span class="decision-label">Check In</span>
        </button>
      </div>
    </section>
  `;

  const group = root.querySelector('.decision');
  let settled = false;

  function onClick(event) {
    const button = event.target.closest('button[data-decision]');
    if (!button || settled) return;
    settled = true;
    group.classList.add('is-settled');
    if (button.dataset.decision === 'confirm') onConfirm();
    else onCancel();
  }

  group.addEventListener('click', onClick);

  return () => group.removeEventListener('click', onClick);
}
