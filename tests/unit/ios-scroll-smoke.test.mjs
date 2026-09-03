import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  IOS_SCROLL_ERROR_LIMIT,
  normalizeIosScrollResult,
  preflightIosRunner,
  writeIosScrollResult,
} from '../../scripts/ios-scroll-smoke.mjs';

const device = 'iPad Pro 13-inch (M4)';
const runtime = 'iOS';
const startedAt = '2026-09-03T20:00:00.000Z';
const finishedAt = '2026-09-03T20:00:01.000Z';

function runnerFor(results) {
  const calls = [];
  return {
    calls,
    runCommand: async (command, args) => {
      calls.push([command, args]);
      const next = results.shift();
      assert.ok(next, `unexpected command: ${command} ${args.join(' ')}`);
      return next;
    },
  };
}

test('preflight classifies missing xcrun', async () => {
  const { runCommand } = runnerFor([{ status: 'error', code: null, stdout: '', stderr: 'ENOENT' }]);
  const result = await preflightIosRunner({ device, runtime, runCommand });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'missing_xcrun');
  assert.match(result.reason, /xcrun/);
});

test('preflight classifies missing xcodebuild', async () => {
  const { runCommand } = runnerFor([
    { status: 'exit', code: 0, stdout: `-- ${runtime} --\n    ${device} (Booted)\n`, stderr: '' },
    { status: 'error', code: null, stdout: '', stderr: 'ENOENT' },
  ]);
  const result = await preflightIosRunner({ device, runtime, runCommand });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'missing_xcodebuild');
});

test('preflight classifies missing runtime before missing device', async () => {
  const { runCommand } = runnerFor([
    { status: 'exit', code: 0, stdout: '-- tvOS --\n    Apple TV\n', stderr: '' },
    { status: 'exit', code: 0, stdout: 'Xcode 26.4\n', stderr: '' },
  ]);
  const result = await preflightIosRunner({ device, runtime, runCommand });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'missing_runtime');
});

test('preflight classifies missing requested device', async () => {
  const { runCommand } = runnerFor([
    { status: 'exit', code: 0, stdout: `-- ${runtime} --\n    iPhone 17\n`, stderr: '' },
    { status: 'exit', code: 0, stdout: 'Xcode 26.4\n', stderr: '' },
  ]);
  const result = await preflightIosRunner({ device, runtime, runCommand });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'missing_device');
});

test('preflight passes when xcrun, xcodebuild, runtime, and device are available', async () => {
  const { runCommand } = runnerFor([
    { status: 'exit', code: 0, stdout: `-- ${runtime} --\n    ${device} (Shutdown)\n`, stderr: '' },
    { status: 'exit', code: 0, stdout: 'Xcode 26.4\n', stderr: '' },
  ]);
  const result = await preflightIosRunner({ device, runtime, runCommand });
  assert.deepEqual(result, { ok: true, device, runtime });
});

test('normalizes skipped, passed, and failed results', () => {
  assert.equal(
    normalizeIosScrollResult({
      status: 'skipped',
      required: false,
      device,
      runtime,
      reason: 'SKIPPED: iOS runner unavailable',
      startedAt,
      finishedAt,
    }).status,
    'skipped',
  );

  const passed = normalizeIosScrollResult({
    status: 'passed',
    required: true,
    device,
    runtime,
    url: 'https://127.0.0.1:9443/check-in-007.abcdef123456.html?scrollProbe=1',
    artifact: 'check-in-007.abcdef123456.html',
    resultBundle: '/repo/test-results/ios-scroll.xcresult',
    startedAt,
    finishedAt,
  });
  assert.equal(passed.url.endsWith('?scrollProbe=1'), true);
  assert.match(passed.artifact, /^check-in-007\.[0-9a-f]{12}\.html$/);

  const failed = normalizeIosScrollResult({
    status: 'failed',
    required: true,
    device,
    runtime,
    error: `first\n${'x'.repeat(IOS_SCROLL_ERROR_LIMIT + 100)}`,
    startedAt,
    finishedAt,
  });
  assert.equal(failed.error.includes('\n'), false);
  assert.ok(failed.error.length <= IOS_SCROLL_ERROR_LIMIT + '... [truncated]'.length);
});

test('normalization rejects invalid results', () => {
  assert.throws(
    () =>
      normalizeIosScrollResult({
        status: 'ok',
        required: false,
        device,
        runtime,
        startedAt,
        finishedAt,
      }),
    /status/,
  );
  assert.throws(
    () =>
      normalizeIosScrollResult({
        status: 'passed',
        required: true,
        device,
        runtime,
        startedAt,
        finishedAt,
      }),
    /passed/,
  );
});

test('writes result JSON with trailing newline', async () => {
  const root = await mkdtemp(join(tmpdir(), 'checkin-ios-scroll-test-'));
  const path = join(root, 'nested/ios-scroll-result.json');
  const result = normalizeIosScrollResult({
    status: 'skipped',
    required: false,
    device,
    runtime,
    reason: 'SKIPPED: no runner',
    startedAt,
    finishedAt,
  });
  await writeIosScrollResult(result, path);
  const content = await readFile(path, 'utf8');
  assert.equal(content.endsWith('\n'), true);
  assert.deepEqual(JSON.parse(content), result);

  await writeFile(join(root, 'sentinel.txt'), 'ok');
});
