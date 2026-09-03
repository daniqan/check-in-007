import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from './build.mjs';
import { startServer } from './serve-https.mjs';

export const IOS_SCROLL_ERROR_LIMIT = 2_000;

export function run(command, args, { timeoutMs = 30_000, env = process.env } = {}) {
  return new Promise((fulfill) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      fulfill({ status: 'timeout', code: null, stdout, stderr });
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      fulfill({ status: 'error', code: null, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      fulfill({ status: 'exit', code, stdout, stderr });
    });
  });
}

function boundedText(value, limit = IOS_SCROLL_ERROR_LIMIT) {
  if (value === null || value === undefined) return null;
  const text = String(value).replaceAll(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}... [truncated]`;
}

function unavailableResult(code, reason, requiredAction) {
  return { ok: false, code, reason, requiredAction };
}

function destinationFor(device) {
  return `platform=iOS Simulator,name=${device}`;
}

async function defaultProbeUrl(root, baseUrl) {
  const manifest = JSON.parse(
    await readFile(resolve(root, 'dist/check-in-007.manifest.json'), 'utf8'),
  );
  return {
    artifact: manifest.artifact,
    url: `${baseUrl}/${manifest.artifact}?scrollProbe=1`,
  };
}

export function normalizeIosScrollResult({
  status,
  required,
  device,
  runtime,
  url = null,
  artifact = null,
  resultBundle = null,
  reason = null,
  code = null,
  stage = null,
  requiredAction = null,
  error = null,
  startedAt,
  finishedAt,
}) {
  if (!['passed', 'skipped', 'failed'].includes(status)) {
    throw new TypeError('iOS scroll result status must be passed, skipped, or failed');
  }
  if (typeof required !== 'boolean') {
    throw new TypeError('iOS scroll result required must be a boolean');
  }
  for (const [name, value] of [
    ['device', device],
    ['runtime', runtime],
    ['startedAt', startedAt],
    ['finishedAt', finishedAt],
  ]) {
    if (!value || typeof value !== 'string') {
      throw new TypeError(`iOS scroll result ${name} is required`);
    }
  }
  if (status === 'passed' && (!url || !artifact || !resultBundle)) {
    throw new TypeError('passed iOS scroll result requires url, artifact, and resultBundle');
  }
  return {
    status,
    required,
    device,
    runtime,
    url,
    artifact,
    resultBundle,
    reason: boundedText(reason),
    code,
    stage,
    requiredAction: boundedText(requiredAction),
    error: boundedText(error),
    startedAt,
    finishedAt,
  };
}

export async function writeIosScrollResult(result, outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export async function preflightIosRunner({
  device = process.env.CHECKIN007_IOS_DEVICE || 'iPad Pro 13-inch (M4)',
  runtime = process.env.CHECKIN007_IOS_RUNTIME || 'iOS',
  runCommand = run,
} = {}) {
  const devices = await runCommand('xcrun', ['simctl', 'list', 'devices', 'available'], {
    timeoutMs: 10_000,
  });
  if (devices.status !== 'exit' || devices.code !== 0) {
    return unavailableResult(
      'missing_xcrun',
      'iOS runner unavailable (xcrun simctl is not available)',
      'Install Xcode command line tools and verify `xcrun simctl list devices available` succeeds.',
    );
  }

  const xcodebuild = await runCommand('xcodebuild', ['-version'], { timeoutMs: 10_000 });
  if (xcodebuild.status !== 'exit' || xcodebuild.code !== 0) {
    return unavailableResult(
      'missing_xcodebuild',
      'iOS runner unavailable (xcodebuild is not available)',
      'Install Xcode and select it with `xcode-select` so `xcodebuild -version` succeeds.',
    );
  }

  if (!devices.stdout.includes(runtime)) {
    return unavailableResult(
      'missing_runtime',
      `iOS runner unavailable (${runtime} runtime is not available)`,
      `Install an iOS Simulator runtime matching CHECKIN007_IOS_RUNTIME=${runtime}.`,
    );
  }
  if (!devices.stdout.includes(device)) {
    return unavailableResult(
      'missing_device',
      `iOS runner unavailable (${device} simulator is not available)`,
      `Create or select a simulator matching CHECKIN007_IOS_DEVICE=${device}.`,
    );
  }

  return { ok: true, device, runtime };
}

export async function runIosScrollSmoke({
  root = process.cwd(),
  device = process.env.CHECKIN007_IOS_DEVICE || 'iPad Pro 13-inch (M4)',
  runtime = process.env.CHECKIN007_IOS_RUNTIME || 'iOS',
  required = process.env.CHECKIN007_IOS_SCROLL_REQUIRED === '1',
  baseUrl = process.env.CHECKIN007_IOS_BASE_URL || '',
  outputPath = process.env.CHECKIN007_IOS_SCROLL_RESULT ||
    resolve(root, 'test-results/ios-scroll-result.json'),
  timeoutMs = 120_000,
  runCommand = run,
  buildKiosk = build,
  startHttpsServer = startServer,
} = {}) {
  const startedAt = new Date().toISOString();
  const finish = async (partial) => {
    const result = normalizeIosScrollResult({
      required,
      device,
      runtime,
      startedAt,
      finishedAt: new Date().toISOString(),
      ...partial,
    });
    return writeIosScrollResult(result, outputPath);
  };

  const preflight = await preflightIosRunner({ device, runtime, runCommand });
  if (!preflight.ok) {
    const result = await finish({
      status: required ? 'failed' : 'skipped',
      stage: 'preflight',
      code: preflight.code,
      reason: `${required ? 'FAILED' : 'SKIPPED'}: ${preflight.reason}`,
      requiredAction: preflight.requiredAction,
    });
    if (result.status === 'failed') {
      throw Object.assign(new Error(result.reason), { result });
    }
    return result;
  }

  let server;
  let certDir;
  let artifact = null;
  let probeUrl = null;
  let stage = 'build';
  const resultBundle = resolve(root, 'test-results/ios-scroll.xcresult');
  try {
    await buildKiosk();
    if (!baseUrl) {
      stage = 'server';
      certDir = await mkdtemp(join(tmpdir(), 'checkin007-ios-scroll-certs-'));
      server = await startHttpsServer({
        host: '127.0.0.1',
        port: 0,
        root: resolve(root, 'dist'),
        certDir,
        interfaces: {},
      });
      baseUrl = server.url;
    }
    stage = 'artifact';
    ({ artifact, url: probeUrl } = await defaultProbeUrl(root, baseUrl));
    await rm(resultBundle, { recursive: true, force: true });
    stage = 'xcodebuild';
    const result = await runCommand(
      'xcodebuild',
      [
        'test',
        '-project',
        resolve(root, 'native/CheckIn007.xcodeproj'),
        '-scheme',
        'CheckIn007',
        '-destination',
        destinationFor(device),
        '-only-testing:CheckIn007UITests/WebRosterScrollUITests/testRosterScrollsInMobileSafari',
        '-resultBundlePath',
        resultBundle,
      ],
      {
        timeoutMs,
        env: {
          ...process.env,
          CHECKIN007_IOS_PROBE_URL: probeUrl,
          CHECKIN007_ALLOW_SELF_SIGNED_HTTPS: server
            ? '1'
            : process.env.CHECKIN007_ALLOW_SELF_SIGNED_HTTPS,
        },
      },
    );
    if (result.status !== 'exit' || result.code !== 0) {
      throw new Error(
        `iOS scroll smoke failed (${result.status}, code ${result.code}).\n${result.stdout}\n${result.stderr}`,
      );
    }
    return finish({
      status: 'passed',
      url: probeUrl,
      artifact,
      resultBundle,
    });
  } catch (error) {
    return finish({
      status: 'failed',
      stage,
      url: probeUrl,
      artifact,
      resultBundle,
      reason: 'FAILED: iOS scroll smoke did not complete',
      error: error.message,
    }).then((result) => {
      throw Object.assign(new Error(result.error || result.reason), { result });
    });
  } finally {
    if (server) await server.close();
    if (certDir) await rm(certDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runIosScrollSmoke();
    if (result.status === 'skipped') {
      console.log(result.reason);
    } else {
      console.log(`PASS: iOS roster scroll probe moved on ${result.device}: ${result.url}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
