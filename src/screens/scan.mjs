export function mountScan(root, { guest, timing, onDone }) {
  root.innerHTML = `
    <section class="screen scan-screen" aria-labelledby="scan-title">
      <video class="camera" autoplay muted playsinline></video>
      <div class="covert" hidden aria-hidden="true"></div>
      <div class="hud" aria-hidden="true">
        <div class="reticle"></div>
        <div class="sweep"></div>
      </div>
      <div class="scan-copy">
        <p id="scan-status" aria-live="polite">OPTICAL SENSOR SYNCING</p>
        <h1 id="scan-title">${guest.name}</h1>
        <strong>BIOMETRIC SCAN IN PROGRESS</strong>
      </div>
    </section>
  `;
  const video = root.querySelector('video');
  const covert = root.querySelector('.covert');
  const status = root.querySelector('#scan-status');
  let stream = null;
  let stopped = false;

  function stopCamera() {
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    if (video) video.srcObject = null;
    stream = null;
  }

  async function startCamera() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      covert.hidden = false;
      status.textContent = 'OPTICAL SENSOR OFFLINE - COVERT MODE';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      if (stopped) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      status.textContent = 'OPTICAL SENSOR ONLINE';
    } catch {
      covert.hidden = false;
      status.textContent = 'OPTICAL SENSOR OFFLINE - COVERT MODE';
    }
  }

  const timer = window.setTimeout(onDone, timing.SCAN_MS);
  startCamera();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    stopCamera();
  };
}
