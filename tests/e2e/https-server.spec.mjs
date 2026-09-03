import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../../scripts/serve-https.mjs';

test('loads a real ES module through the HTTPS helper', async () => {
  const root = await mkdtemp(join(tmpdir(), 'checkin-https-browser-'));
  const certDir = await mkdtemp(join(tmpdir(), 'checkin-https-cert-'));
  await writeFile(join(root, 'index.html'), '<title>HTTPS probe</title>');
  await writeFile(join(root, 'probe.mjs'), "export const sentinel = '007-secure';");
  const helper = await startServer({ port: 0, root, certDir, interfaces: {} });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto(helper.url);
    const sentinel = await page.evaluate(() =>
      import('./probe.mjs').then((module) => module.sentinel),
    );
    expect(sentinel).toBe('007-secure');
  } finally {
    await browser.close();
    await helper.close();
  }
});
