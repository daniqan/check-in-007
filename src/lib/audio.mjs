import { AUDIO } from '../config.mjs';

function defaultAudioContextFactory() {
  const AudioContextConstructor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (typeof AudioContextConstructor !== 'function') {
    throw new Error('Web Audio unavailable');
  }
  return new AudioContextConstructor();
}

function scheduleBlip(context, config) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime || 0;
  const durationSeconds = config.SCAN_BLIP_DURATION_MS / 1000;

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.frequency.setValueAtTime(config.SCAN_BLIP_START_HZ, now);
  oscillator.frequency.linearRampToValueAtTime(config.SCAN_BLIP_END_HZ, now + durationSeconds / 2);
  gain.gain.setValueAtTime(config.SCAN_BLIP_GAIN, now);
  gain.gain.setTargetAtTime(0, now, config.SCAN_BLIP_RELEASE_SECONDS);
  oscillator.addEventListener?.('ended', () => {
    oscillator.disconnect?.();
    gain.disconnect?.();
  });
  oscillator.start(now);
  oscillator.stop(now + durationSeconds);

  return { oscillator, gain };
}

export function createScanAudioController({
  audioContextFactory = defaultAudioContextFactory,
  config = AUDIO,
} = {}) {
  let enabled = config.SCAN_BLIP_DEFAULT_ENABLED === true;
  let available = typeof audioContextFactory === 'function';
  let unlocked = false;
  let disposed = false;
  let context = null;
  const activeNodes = new Set();

  function getContext() {
    if (!context) context = audioContextFactory();
    return context;
  }

  function guardedResume(targetContext) {
    try {
      return targetContext.resume?.();
    } catch {
      return undefined;
    }
  }

  function ignorePromiseFailure(promise) {
    promise?.catch?.(() => {});
  }

  return {
    async unlockFromGesture() {
      if (!enabled || !available || disposed || typeof audioContextFactory !== 'function') {
        return false;
      }
      try {
        const targetContext = getContext();
        if (targetContext.state === 'closed') return false;
        if (targetContext.state === 'suspended') {
          await targetContext.resume?.();
        }
        if (targetContext.state === 'running') {
          unlocked = true;
          return true;
        }
        return false;
      } catch {
        available = false;
        unlocked = false;
        return false;
      }
    },
    playScanBlip() {
      if (!enabled || !available || !unlocked || disposed || !context) return false;
      try {
        if (context.state === 'closed') return false;
        if (context.state === 'suspended' || context.state === 'interrupted') {
          ignorePromiseFailure(guardedResume(context));
          return false;
        }
        const nodes = scheduleBlip(context, config);
        activeNodes.add(nodes);
        nodes.oscillator.addEventListener?.('ended', () => activeNodes.delete(nodes), {
          once: true,
        });
        return true;
      } catch {
        return false;
      }
    },
    setEnabled(nextEnabled) {
      enabled = nextEnabled === true;
      if (!enabled) {
        unlocked = false;
        if (context?.state === 'running') {
          try {
            ignorePromiseFailure(context.suspend?.());
          } catch {
            // Disabling audio is best-effort; a failed suspend still suppresses playback.
          }
        }
      }
    },
    isEnabled() {
      return enabled;
    },
    getState() {
      return {
        available,
        enabled,
        unlocked,
        disposed,
        contextState: context?.state || null,
      };
    },
    dispose() {
      disposed = true;
      enabled = false;
      unlocked = false;
      for (const nodes of activeNodes) {
        nodes.oscillator.disconnect?.();
        nodes.gain.disconnect?.();
      }
      activeNodes.clear();
      try {
        ignorePromiseFailure(context?.close?.());
      } catch {
        // Disposal is best-effort; UI teardown must not throw on browser audio errors.
      }
    },
  };
}
