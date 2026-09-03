import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from './build.mjs';
import { startServer } from './serve-https.mjs';

function run(command, args, { timeoutMs = 30_000, env = process.env } = {}) {
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

function skip(message, required) {
  if (required) throw new Error(message);
  return { status: 'skipped', reason: message };
}

async function commandAvailable(command, args) {
  const result = await run(command, args, { timeoutMs: 10_000 });
  return result.status === 'exit' && result.code === 0;
}

function destinationFor(device) {
  return `platform=iOS Simulator,name=${device}`;
}

async function defaultProbeUrl(root, baseUrl) {
  const manifest = JSON.parse(
    await readFile(resolve(root, 'dist/check-in-007.manifest.json'), 'utf8'),
  );
  return `${baseUrl}/${manifest.artifact}?scrollProbe=1`;
}

export async function runIosScrollSmoke({
  root = process.cwd(),
  device = process.env.CHECKIN007_IOS_DEVICE || 'iPad Pro 13-inch (M4)',
  runtime = process.env.CHECKIN007_IOS_RUNTIME || 'iOS',
  required = process.env.CHECKIN007_IOS_SCROLL_REQUIRED === '1',
  baseUrl = process.env.CHECKIN007_IOS_BASE_URL || '',
  timeoutMs = 120_000,
} = {}) {
  const devices = await run('xcrun', ['simctl', 'list', 'devices', 'available'], {
    timeoutMs: 10_000,
  });
  if (devices.status !== 'exit' || devices.code !== 0) {
    return skip('SKIPPED: iOS runner unavailable (xcrun simctl is not available)', required);
  }
  if (!(await commandAvailable('xcodebuild', ['-version']))) {
    return skip('SKIPPED: iOS runner unavailable (xcodebuild is not available)', required);
  }
  if (!devices.stdout.includes(runtime) || !devices.stdout.includes(device)) {
    return skip(
      `SKIPPED: iOS runner unavailable (${device} / ${runtime} simulator is not available)`,
      required,
    );
  }

  await build();
  let server;
  let certDir;
  try {
    if (!baseUrl) {
      certDir = await mkdtemp(join(tmpdir(), 'checkin007-ios-scroll-certs-'));
      server = await startServer({
        host: '127.0.0.1',
        port: 0,
        root: resolve(root, 'dist'),
        certDir,
        interfaces: {},
      });
      baseUrl = server.url;
    }
    const probeUrl = await defaultProbeUrl(root, baseUrl);
    const resultBundle = resolve(root, 'test-results/ios-scroll.xcresult');
    await rm(resultBundle, { recursive: true, force: true });
    const result = await run(
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
    return { status: 'passed', url: probeUrl, device, runtime };
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
