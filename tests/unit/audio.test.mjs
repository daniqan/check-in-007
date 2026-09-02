import test from 'node:test';
import assert from 'node:assert/strict';
import { createScanAudioController } from '../../src/lib/audio.mjs';

const config = {
  SCAN_BLIP_DEFAULT_ENABLED: false,
  SCAN_BLIP_GAIN: 0.045,
  SCAN_BLIP_START_HZ: 880,
  SCAN_BLIP_END_HZ: 1320,
  SCAN_BLIP_DURATION_MS: 90,
  SCAN_BLIP_RELEASE_SECONDS: 0.035,
};

function createMockContext({ state = 'running', throwSchedule = false } = {}) {
  const calls = [];
  const oscillators = [];
  const gains = [];
  const context = {
    state,
    currentTime: 12,
    destination: { id: 'destination' },
    resumeCalls: 0,
    suspendCalls: 0,
    closeCalls: 0,
    async resume() {
      this.resumeCalls += 1;
      calls.push(['resume']);
      this.state = 'running';
    },
    async suspend() {
      this.suspendCalls += 1;
      calls.push(['suspend']);
      this.state = 'suspended';
    },
    async close() {
      this.closeCalls += 1;
      calls.push(['close']);
      this.state = 'closed';
    },
    createOscillator() {
      if (throwSchedule) throw new Error('schedule failed');
      const oscillator = {
        type: 'oscillator',
        listeners: new Map(),
        frequency: {
          setValueAtTime: (...args) => calls.push(['frequency.setValueAtTime', ...args]),
          linearRampToValueAtTime: (...args) =>
            calls.push(['frequency.linearRampToValueAtTime', ...args]),
        },
        connect: (node) => calls.push(['oscillator.connect', node.type]),
        disconnect: () => calls.push(['oscillator.disconnect']),
        addEventListener(name, listener) {
          this.listeners.set(name, listener);
        },
        start: (...args) => calls.push(['oscillator.start', ...args]),
        stop: (...args) => calls.push(['oscillator.stop', ...args]),
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain() {
      const gain = {
        type: 'gain',
        gain: {
          setValueAtTime: (...args) => calls.push(['gain.setValueAtTime', ...args]),
          setTargetAtTime: (...args) => calls.push(['gain.setTargetAtTime', ...args]),
        },
        connect: (node) => calls.push(['gain.connect', node.id]),
        disconnect: () => calls.push(['gain.disconnect']),
      };
      gains.push(gain);
      return gain;
    },
  };
  return { context, calls, oscillators, gains };
}

test('default controller is disabled and does not construct AudioContext', async () => {
  let constructions = 0;
  const controller = createScanAudioController({
    audioContextFactory: () => {
      constructions += 1;
      return createMockContext().context;
    },
    config,
  });
  assert.equal(controller.isEnabled(), false);
  assert.equal(await controller.unlockFromGesture(), false);
  assert.equal(controller.playScanBlip(), false);
  assert.equal(constructions, 0);
});

test('enabled controller unlocks running context and repeated unlock is idempotent', async () => {
  let constructions = 0;
  const { context } = createMockContext({ state: 'running' });
  const controller = createScanAudioController({
    audioContextFactory: () => {
      constructions += 1;
      return context;
    },
    config,
  });
  controller.setEnabled(true);
  assert.equal(await controller.unlockFromGesture(), true);
  assert.equal(await controller.unlockFromGesture(), true);
  assert.equal(constructions, 1);
  assert.equal(context.resumeCalls, 0);
  assert.equal(controller.getState().unlocked, true);
});

test('suspended context calls and awaits resume during unlock', async () => {
  const { context } = createMockContext({ state: 'suspended' });
  const controller = createScanAudioController({ audioContextFactory: () => context, config });
  controller.setEnabled(true);
  assert.equal(await controller.unlockFromGesture(), true);
  assert.equal(context.resumeCalls, 1);
  assert.equal(context.state, 'running');
});

test('unavailable constructors return false and injected factories work without globals', async () => {
  const originalAudioContext = globalThis.AudioContext;
  const originalWebkitAudioContext = globalThis.webkitAudioContext;
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  try {
    const unavailable = createScanAudioController({ config });
    unavailable.setEnabled(true);
    assert.equal(await unavailable.unlockFromGesture(), false);
    assert.equal(unavailable.playScanBlip(), false);

    const { context } = createMockContext();
    const injected = createScanAudioController({ audioContextFactory: () => context, config });
    injected.setEnabled(true);
    assert.equal(await injected.unlockFromGesture(), true);
  } finally {
    if (originalAudioContext) globalThis.AudioContext = originalAudioContext;
    if (originalWebkitAudioContext) globalThis.webkitAudioContext = originalWebkitAudioContext;
  }
});

test('play before unlock returns false', () => {
  const { context } = createMockContext();
  const controller = createScanAudioController({ audioContextFactory: () => context, config });
  controller.setEnabled(true);
  assert.equal(controller.playScanBlip(), false);
});

test('successful playback schedules the exact scan blip automation', async () => {
  const { context, calls, oscillators, gains } = createMockContext({ state: 'running' });
  const controller = createScanAudioController({ audioContextFactory: () => context, config });
  controller.setEnabled(true);
  await controller.unlockFromGesture();
  assert.equal(controller.playScanBlip(), true);
  assert.equal(oscillators.length, 1);
  assert.equal(gains.length, 1);
  assert.deepEqual(calls, [
    ['oscillator.connect', 'gain'],
    ['gain.connect', 'destination'],
    ['frequency.setValueAtTime', 880, 12],
    ['frequency.linearRampToValueAtTime', 1320, 12.045],
    ['gain.setValueAtTime', 0.045, 12],
    ['gain.setTargetAtTime', 0, 12, 0.035],
    ['oscillator.start', 12],
    ['oscillator.stop', 12.09],
  ]);
});

test('suspended or interrupted context after unlock resumes without scheduling current cue', async () => {
  for (const state of ['suspended', 'interrupted']) {
    const { context, oscillators } = createMockContext({ state: 'running' });
    const controller = createScanAudioController({ audioContextFactory: () => context, config });
    controller.setEnabled(true);
    await controller.unlockFromGesture();
    context.state = state;
    assert.equal(controller.playScanBlip(), false);
    await Promise.resolve();
    assert.equal(context.resumeCalls, 1);
    assert.equal(oscillators.length, 0);
  }
});

test('repeated successful playback creates separate oscillator instances', async () => {
  const { context, oscillators } = createMockContext({ state: 'running' });
  const controller = createScanAudioController({ audioContextFactory: () => context, config });
  controller.setEnabled(true);
  await controller.unlockFromGesture();
  assert.equal(controller.playScanBlip(), true);
  assert.equal(controller.playScanBlip(), true);
  assert.equal(oscillators.length, 2);
});

test('disabled after unlock suppresses playback and attempts suspend', async () => {
  const { context, oscillators } = createMockContext({ state: 'running' });
  const controller = createScanAudioController({ audioContextFactory: () => context, config });
  controller.setEnabled(true);
  await controller.unlockFromGesture();
  controller.setEnabled(false);
  await Promise.resolve();
  assert.equal(controller.playScanBlip(), false);
  assert.equal(context.suspendCalls, 1);
  assert.equal(oscillators.length, 0);
});

test('constructor, resume, and scheduling errors are caught', async () => {
  const constructorFails = createScanAudioController({
    audioContextFactory: () => {
      throw new Error('blocked');
    },
    config,
  });
  constructorFails.setEnabled(true);
  assert.equal(await constructorFails.unlockFromGesture(), false);

  const resumeFailsContext = createMockContext({ state: 'suspended' }).context;
  resumeFailsContext.resume = async () => {
    resumeFailsContext.resumeCalls += 1;
    throw new Error('resume blocked');
  };
  const resumeFails = createScanAudioController({
    audioContextFactory: () => resumeFailsContext,
    config,
  });
  resumeFails.setEnabled(true);
  assert.equal(await resumeFails.unlockFromGesture(), false);

  const { context } = createMockContext({ state: 'running', throwSchedule: true });
  const scheduleFails = createScanAudioController({ audioContextFactory: () => context, config });
  scheduleFails.setEnabled(true);
  await scheduleFails.unlockFromGesture();
  assert.equal(scheduleFails.playScanBlip(), false);
});

test('dispose prevents future playback and closes owned context', async () => {
  const { context, oscillators } = createMockContext({ state: 'running' });
  const controller = createScanAudioController({ audioContextFactory: () => context, config });
  controller.setEnabled(true);
  await controller.unlockFromGesture();
  assert.equal(controller.playScanBlip(), true);
  controller.dispose();
  assert.equal(context.closeCalls, 1);
  assert.equal(controller.playScanBlip(), false);
  assert.equal(oscillators.length, 1);
});
