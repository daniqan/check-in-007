import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  IOS_SCROLL_ERROR_LIMIT,
  normalizeIosScrollResult,
  preflightIosRunner,
  runIosScrollSmoke,
  testRunnerEnvironment,
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

test('test-runner environment includes Xcode-forwarded probe variables', () => {
  const env = testRunnerEnvironment({
    probeUrl: 'https://127.0.0.1:9443/check-in-007.abcdef123456.html?scrollProbe=1',
    allowSelfSignedHttps: '1',
  });
  assert.equal(
    env.TEST_RUNNER_CHECKIN007_IOS_PROBE_URL,
    'https://127.0.0.1:9443/check-in-007.abcdef123456.html?scrollProbe=1',
  );
  assert.equal(env.TEST_RUNNER_CHECKIN007_ALLOW_SELF_SIGNED_HTTPS, '1');
  assert.equal(env.CHECKIN007_IOS_PROBE_URL, env.TEST_RUNNER_CHECKIN007_IOS_PROBE_URL);
});

test('runIosScrollSmoke passes probe URL into the XCTest runner launch environment', async () => {
  const root = await mkdtemp(join(tmpdir(), 'checkin-ios-scroll-run-'));
  await mkdir(join(root, 'dist'), { recursive: true });
  await writeFile(
    join(root, 'dist/check-in-007.manifest.json'),
    JSON.stringify({
      artifact: 'check-in-007.abcdef123456.html',
      sha256: 'unused',
      gzipSize: 1,
      byteSize: 1,
    }),
  );

  let capturedEnv;
  const { runCommand } = runnerFor([
    { status: 'exit', code: 0, stdout: `-- ${runtime} --\n    ${device} (Shutdown)\n`, stderr: '' },
    { status: 'exit', code: 0, stdout: 'Xcode 26.4\n', stderr: '' },
    { status: 'exit', code: 0, stdout: 'Test Succeeded\n', stderr: '' },
  ]);
  const result = await runIosScrollSmoke({
    root,
    device,
    runtime,
    required: true,
    outputPath: join(root, 'ios-scroll-result.json'),
    runCommand: async (command, args, options = {}) => {
      if (command === 'xcodebuild' && args[0] === 'test') {
        capturedEnv = options.env;
      }
      return runCommand(command, args, options);
    },
    buildKiosk: async () => {},
    startHttpsServer: async () => ({
      url: 'https://127.0.0.1:9443',
      close: async () => {},
    }),
  });

  const expectedProbeUrl = 'https://127.0.0.1:9443/check-in-007.abcdef123456.html?scrollProbe=1';
  assert.equal(result.status, 'passed');
  assert.equal(result.url, expectedProbeUrl);
  assert.equal(capturedEnv.TEST_RUNNER_CHECKIN007_IOS_PROBE_URL, expectedProbeUrl);
  assert.equal(capturedEnv.TEST_RUNNER_CHECKIN007_ALLOW_SELF_SIGNED_HTTPS, '1');
  assert.equal(capturedEnv.CHECKIN007_IOS_PROBE_URL, expectedProbeUrl);
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
