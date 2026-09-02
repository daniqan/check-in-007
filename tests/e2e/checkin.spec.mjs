import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import axeSource from 'axe-core';

async function waitForRoster(page, timeout = 4000) {
  await expect(page.getByRole('heading', { name: 'AGENT ROSTER' })).toBeVisible({ timeout });
}

async function runCheckIn(page, guestName = /Ava Sterling/) {
  await page.getByRole('button', { name: guestName }).click();
  await expect(page.getByText(/OPTICAL SENSOR/)).toBeVisible();
  await expect(page.getByText('Table 1 - Casino Royale')).toBeVisible({ timeout: 6000 });
}

test('boot, search, scan, result, log flow, and privacy probes', async ({ page, context }) => {
  await context.grantPermissions(['camera']);
  await page.goto('/');
  await waitForRoster(page);
  await page.evaluate(() => {
    window.__privacyProbe = {
      toDataURL: 0,
      captureStream: 0,
      mediaRecorder: 0,
      tracks: [],
    };
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      window.__privacyProbe.toDataURL += 1;
      return originalToDataURL.apply(this, args);
    };
    const originalCaptureStream = HTMLVideoElement.prototype.captureStream;
    if (originalCaptureStream) {
      HTMLVideoElement.prototype.captureStream = function (...args) {
        window.__privacyProbe.captureStream += 1;
        return originalCaptureStream.apply(this, args);
      };
    }
    const NativeMediaRecorder = window.MediaRecorder;
    window.MediaRecorder = function (...args) {
      window.__privacyProbe.mediaRecorder += 1;
      return Reflect.construct(NativeMediaRecorder, args, new.target || window.MediaRecorder);
    };
    if (NativeMediaRecorder) {
      Object.setPrototypeOf(window.MediaRecorder, NativeMediaRecorder);
      window.MediaRecorder.prototype = NativeMediaRecorder.prototype;
    }
    const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (...args) => {
      const stream = await nativeGetUserMedia(...args);
      window.__privacyProbe.tracks.push(...stream.getVideoTracks());
      return stream;
    };
  });
  await page.getByLabel('Search guest roster').fill('Ava');
  await expect(page.getByRole('button', { name: /Ava Sterling/ })).toBeVisible();
  await runCheckIn(page, /Ava Sterling/);
  const { log, privacy } = await page.evaluate(() => ({
    log: JSON.parse(localStorage.getItem('checkin007.log.v1')),
    privacy: {
      toDataURL: window.__privacyProbe.toDataURL,
      captureStream: window.__privacyProbe.captureStream,
      mediaRecorder: window.__privacyProbe.mediaRecorder,
      trackStates: window.__privacyProbe.tracks.map((track) => track.readyState),
      attachedStream: document.querySelector('video')?.srcObject ?? null,
    },
  }));
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ guestId: 'ava-sterling', name: 'Ava Sterling' });
  expect(privacy).toMatchObject({ toDataURL: 0, captureStream: 0, mediaRecorder: 0 });
  expect(privacy.trackStates.length).toBeGreaterThan(0);
  expect(privacy.trackStates.every((state) => state === 'ended')).toBe(true);
  expect(privacy.attachedStream).toBeNull();
});

test('covert mode works when camera is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto('/');
  await waitForRoster(page);
  await page.getByRole('button', { name: /Miles Archer/ }).click();
  await expect(page.getByText('OPTICAL SENSOR OFFLINE - COVERT MODE')).toBeVisible();
  await expect(page.getByText('Table 1 - Casino Royale')).toBeVisible({ timeout: 6000 });
});

test('orientation change keeps a completed visit idempotent', async ({ page }) => {
  await page.goto('/');
  await waitForRoster(page);
  await runCheckIn(page, /Ava Sterling/);
  const visitId = await page.evaluate(
    () => JSON.parse(localStorage.getItem('checkin007.log.v1'))[0].visitId,
  );
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.setViewportSize({ width: 768, height: 1024 });
  const matchingEntries = await page.evaluate((id) => {
    const log = JSON.parse(localStorage.getItem('checkin007.log.v1'));
    return log.filter((entry) => entry.visitId === id);
  }, visitId);
  expect(matchingEntries).toHaveLength(1);
});

test('admin import and accessibility smoke', async ({ page }) => {
  await page.goto('/');
  await waitForRoster(page);
  await page.locator('.logo-hit').dispatchEvent('pointerdown');
  await page.waitForTimeout(2100);
  await expect(page.getByRole('dialog', { name: 'ADMIN CONTROLS' })).toBeVisible();
  await page.setInputFiles('.csv-input', {
    name: 'guests.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,table\nTest Agent,Table Q\n'),
  });
  await expect(page.getByText(/Loaded 1 agents/)).toBeVisible();
  await page.getByLabel('Close admin').click();
  await expect(page.getByRole('button', { name: /Test Agent/ })).toBeVisible();
  await page.addScriptTag({ content: axeSource.source });
  const result = await page.evaluate(() =>
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }),
  );
  expect(
    result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)),
  ).toEqual([]);
});

test('large imported rosters virtualize while preserving search and selection', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitForRoster(page);
  const rows = ['name,table'];
  for (let index = 0; index < 620; index += 1) {
    const label = String(index).padStart(3, '0');
    const name =
      index === 5
        ? `Agent ${label} With An Exceptionally Long Operational Alias That Must Ellipsize`
        : `Agent ${label}`;
    rows.push(`${name},Table ${label}`);
  }

  await page.locator('.logo-hit').dispatchEvent('pointerdown');
  await page.waitForTimeout(2100);
  await expect(page.getByRole('dialog', { name: 'ADMIN CONTROLS' })).toBeVisible();
  await page.setInputFiles('.csv-input', {
    name: 'large-guests.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`${rows.join('\n')}\n`),
  });
  await expect(page.getByText(/Loaded 620 agents/)).toBeVisible();
  await page.getByLabel('Close admin').click();
  await waitForRoster(page);

  const list = page.locator('.roster-list');
  await expect(list).toHaveClass(/is-virtualized/);
  const renderedRows = await page.locator('.guest-row').count();
  expect(renderedRows).toBeGreaterThan(0);
  expect(renderedRows).toBeLessThanOrEqual(40);

  const longNameMetrics = await page
    .getByRole('button', { name: /Agent 005 With An Exceptionally Long Operational Alias/ })
    .locator('span')
    .evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      whiteSpace: getComputedStyle(element).whiteSpace,
    }));
  expect(longNameMetrics.whiteSpace).toBe('nowrap');
  expect(longNameMetrics.scrollHeight).toBeLessThanOrEqual(longNameMetrics.clientHeight + 1);

  await page.addScriptTag({ content: axeSource.source });
  const result = await page.evaluate(() =>
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }),
  );
  expect(
    result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)),
  ).toEqual([]);

  await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(page.getByRole('button', { name: /Agent 619/ })).toBeVisible();
  await page.getByRole('button', { name: /Agent 619/ }).click();
  await expect(page.getByText('OPTICAL SENSOR OFFLINE - COVERT MODE')).toBeVisible();
  await expect(page.getByText('Table 619')).toBeVisible({ timeout: 4000 });
  await page.evaluate(() => window.CheckIn007.setState('ROSTER'));
  await waitForRoster(page);
  await page.getByLabel('Search guest roster').fill('Agent 012');
  await expect(page.locator('.roster-list')).not.toHaveClass(/is-virtualized/);
  await expect(page.getByRole('button', { name: /Agent 012/ })).toBeVisible();
  await expect(page.locator('.roster-list')).toHaveJSProperty('scrollTop', 0);
});

test('admin copied CSV exactly matches the stored log export', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await waitForRoster(page);
  await runCheckIn(page, /Ava Sterling/);
  await expect(page.getByRole('heading', { name: 'AGENT ROSTER' })).toBeVisible({ timeout: 6000 });
  const expectedCsv = await page.evaluate(() => {
    const columns = ['visitId', 'guestId', 'name', 'table', 'timestamp'];
    const escape = (value) => {
      const text = String(value ?? '');
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const entries = JSON.parse(localStorage.getItem('checkin007.log.v1'));
    return [
      columns.join(','),
      ...entries.map((entry) => columns.map((column) => escape(entry[column])).join(',')),
    ].join('\n');
  });
  await page.evaluate(() => {
    const nativeWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async (text) => {
      window.__copiedText = text;
      return nativeWriteText(text);
    };
  });
  await page.locator('.logo-hit').dispatchEvent('pointerdown');
  await page.waitForTimeout(2100);
  await page.getByRole('button', { name: 'Copy CSV' }).click();
  await expect(page.getByText(/^Copied visitId,guestId,name,table,timestamp/)).toBeVisible();
  const copied = await page.evaluate(() => window.__copiedText);
  expect(copied).toBe(expectedCsv);
});

test('twenty scan exits do not leak app timers or listeners', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });
    const nativeSetTimeout = window.setTimeout.bind(window);
    const nativeClearTimeout = window.clearTimeout.bind(window);
    const nativeAddEventListener = EventTarget.prototype.addEventListener;
    const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;
    const activeTimers = new Set();
    let activeListeners = 0;
    window.setTimeout = (handler, timeout, ...args) => {
      const id = nativeSetTimeout(handler, timeout, ...args);
      activeTimers.add(id);
      return id;
    };
    window.clearTimeout = (id) => {
      activeTimers.delete(id);
      return nativeClearTimeout(id);
    };
    EventTarget.prototype.addEventListener = function (...args) {
      activeListeners += 1;
      return nativeAddEventListener.apply(this, args);
    };
    EventTarget.prototype.removeEventListener = function (...args) {
      activeListeners -= 1;
      return nativeRemoveEventListener.apply(this, args);
    };
    window.__leakProbe = () => ({ timers: activeTimers.size, listeners: activeListeners });
  });
  await page.goto('/');
  await waitForRoster(page);
  const baseline = await page.evaluate(() => window.__leakProbe());
  for (let index = 0; index < 20; index += 1) {
    await page.getByRole('button', { name: /Ava Sterling/ }).click();
    await expect(page.getByText('OPTICAL SENSOR OFFLINE - COVERT MODE')).toBeVisible();
    await page.evaluate(() => window.CheckIn007.setState('ROSTER'));
    await waitForRoster(page);
  }
  expect(await page.evaluate(() => window.__leakProbe())).toEqual(baseline);
});

test('reduced motion uses the shortened browser timing path', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitForRoster(page, 2000);
});

test('file artifact boots from file URL', async ({ page }) => {
  const html = await readFile(resolve('dist/index.html'), 'utf8');
  expect(html).not.toMatch(/<script[^>]+type="module"/);
  await page.goto(`file://${resolve('dist/index.html')}`);
  await waitForRoster(page);
});
