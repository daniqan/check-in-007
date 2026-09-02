import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import axeSource from 'axe-core';

test('boot, search, scan, result, and log flow', async ({ page, context }) => {
  await context.grantPermissions(['camera']);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AGENT ROSTER' })).toBeVisible({ timeout: 4000 });
  await page.getByLabel('Search guest roster').fill('Ava');
  await expect(page.getByRole('button', { name: /Ava Sterling/ })).toBeVisible();
  await page.getByRole('button', { name: /Ava Sterling/ }).click();
  await expect(page.getByText(/OPTICAL SENSOR/)).toBeVisible();
  await expect(page.getByText('Table 1 - Casino Royale')).toBeVisible({ timeout: 6000 });
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('checkin007.log.v1')));
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ guestId: 'ava-sterling', name: 'Ava Sterling' });
});

test('covert mode works when camera is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AGENT ROSTER' })).toBeVisible({ timeout: 4000 });
  await page.getByRole('button', { name: /Miles Archer/ }).click();
  await expect(page.getByText('OPTICAL SENSOR OFFLINE - COVERT MODE')).toBeVisible();
  await expect(page.getByText('Table 1 - Casino Royale')).toBeVisible({ timeout: 6000 });
});

test('admin import and accessibility smoke', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AGENT ROSTER' })).toBeVisible({ timeout: 4000 });
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

test('file artifact boots from file URL', async ({ page }) => {
  const html = await readFile(resolve('dist/index.html'), 'utf8');
  expect(html).not.toMatch(/<script[^>]+type="module"/);
  await page.goto(`file://${resolve('dist/index.html')}`);
  await expect(page.getByRole('heading', { name: 'AGENT ROSTER' })).toBeVisible({ timeout: 4000 });
});
