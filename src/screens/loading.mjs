export function mountLoading(root, { timing, onDone }) {
  root.innerHTML = `
    <section class="screen loading-screen" aria-label="Loading terminal">
      <div class="gunbarrel" aria-hidden="true"><span></span><span class="gunbarrel-art"></span></div>
      <div class="boot-copy">
        <p>MI6 EVENT OPERATIONS</p>
        <h1>MI6 CHECK-IN</h1>
        <strong>INITIALIZING AGENT ROSTER</strong>
      </div>
    </section>
  `;
  const timer = window.setTimeout(onDone, timing.LOADING_MS);
  return () => window.clearTimeout(timer);
}
