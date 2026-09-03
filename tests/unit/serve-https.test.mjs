import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:https';
import { X509Certificate } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  advertisedUrls,
  httpsUrl,
  lanIpv4Addresses,
  lanUrls,
  parseArgs,
  startServer,
} from '../../scripts/serve-https.mjs';

function get(url, ca, path = '/') {
  return new Promise((resolve, reject) => {
    const req = request(`${url}${path}`, { ca }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () =>
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString(),
        }),
      );
    });
    req.on('error', reject);
    req.end();
  });
}

test('parses repeatable CLI options and rejects invalid ports', () => {
  assert.deepEqual(
    parseArgs(['--port=9000', '--host=cabinet.local', '--host', '192.168.1.4', '--root', 'dist']),
    {
      host: '0.0.0.0',
      port: 9000,
      root: 'dist',
      certDir: '.certs',
      hosts: ['cabinet.local', '192.168.1.4'],
    },
  );
  assert.deepEqual(parseArgs(['--bind=127.0.0.1']), {
    host: '127.0.0.1',
    port: 8443,
    root: process.cwd(),
    certDir: '.certs',
    hosts: [],
  });
  assert.deepEqual(
    parseArgs([
      '--bind',
      '::1',
      '--port',
      '9443',
      '--host',
      'cabinet.local',
      '--cert-dir',
      'certs',
    ]),
    {
      host: '::1',
      port: 9443,
      root: process.cwd(),
      certDir: 'certs',
      hosts: ['cabinet.local'],
    },
  );
  for (const value of ['nope', '0', '65536', '1.5'])
    assert.throws(() => parseArgs([`--port=${value}`]), /integer from 1 to 65535/);
  assert.throws(() => parseArgs(['--wat=x']), /Unknown option/);
  assert.throws(() => parseArgs(['--bind', '--port', '9000']), /Missing value/);
});

test('LAN discovery is sorted, deduplicated, and excludes internal or IPv6 addresses', () => {
  const interfaces = {
    en0: [
      { address: '192.168.50.7', family: 'IPv4', internal: false },
      { address: 'fe80::1', family: 'IPv6', internal: false },
    ],
    en1: [{ address: '10.0.0.2', family: 'IPv4', internal: false }],
    lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
  };
  assert.deepEqual(lanIpv4Addresses(interfaces), ['10.0.0.2', '192.168.50.7']);
  assert.deepEqual(lanUrls(8443, ['192.168.50.7']), ['https://192.168.50.7:8443']);
});

test('formats HTTPS origins and selects deterministic advertised endpoints', () => {
  assert.equal(httpsUrl('192.168.1.4', 8443), 'https://192.168.1.4:8443');
  assert.equal(httpsUrl('cabinet.local', 9443), 'https://cabinet.local:9443');
  assert.equal(httpsUrl('::1', 8443), 'https://[::1]:8443');
  assert.throws(() => httpsUrl('', 8443), /Host must be non-empty/);
  assert.throws(() => httpsUrl('localhost', 70000), /Invalid port/);

  const addresses = ['192.168.50.7', '10.0.0.2', '192.168.50.7'];
  assert.deepEqual(advertisedUrls('0.0.0.0', 8443, addresses), [
    'https://10.0.0.2:8443',
    'https://192.168.50.7:8443',
  ]);
  assert.deepEqual(addresses, ['192.168.50.7', '10.0.0.2', '192.168.50.7']);
  assert.deepEqual(advertisedUrls('::', 8443, []), ['https://localhost:8443']);
  assert.deepEqual(advertisedUrls('127.0.0.1', 8443, ['192.168.50.7']), ['https://127.0.0.1:8443']);
  assert.deepEqual(advertisedUrls('::1', 8443), ['https://[::1]:8443']);
});

test('wildcard server advertises every injected LAN URL and covers them in its SAN', async (t) => {
  const certDir = await mkdtemp(join(tmpdir(), 'checkin-https-'));
  const interfaces = {
    en0: [{ address: '192.168.50.7', family: 'IPv4', internal: false }],
  };
  const result = await startServer({ port: 0, root: process.cwd(), certDir, interfaces });
  t.after(() => result.close());
  assert.deepEqual(result.lanUrls, [`https://192.168.50.7:${result.port}`]);
  assert.deepEqual(result.urls, result.lanUrls);
  assert.equal(result.url, result.urls[0]);
  assert.match(new X509Certificate(result.certPem).subjectAltName, /IP Address:192\.168\.50\.7/);
});

test('explicit loopback server returns a reachable, certificate-covered URL', async (t) => {
  const certDir = await mkdtemp(join(tmpdir(), 'checkin-https-loopback-'));
  const result = await startServer({
    host: '127.0.0.1',
    port: 0,
    root: process.cwd(),
    certDir,
    interfaces: {},
  });
  t.after(() => result.close());
  assert.equal(result.url, `https://127.0.0.1:${result.port}`);
  assert.deepEqual(result.urls, [result.url]);
  assert.match(new X509Certificate(result.certPem).subjectAltName, /IP Address:127\.0\.0\.1/);
  const home = await get(result.url, result.certPem);
  assert.equal(home.status, 200);
  assert.equal(home.headers['cache-control'], 'no-store');
  assert.match(home.body, /Check-In 007/);
  assert.equal((await get(result.url, result.certPem, '/.certs/key.pem')).status, 404);
  assert.equal((await get(result.url, result.certPem, '/..%2f..%2fetc/passwd')).status, 404);
});

test('server returns no-store for hashed build artifacts', async (t) => {
  const { build } = await import('../../scripts/build.mjs');
  await build();
  const manifest = JSON.parse(await readFile('dist/check-in-007.manifest.json', 'utf8'));
  const certDir = await mkdtemp(join(tmpdir(), 'checkin-https-hashed-'));
  const result = await startServer({
    host: '127.0.0.1',
    port: 0,
    root: 'dist',
    certDir,
    interfaces: {},
  });
  t.after(() => result.close());
  for (const path of ['/index.html', `/${manifest.artifact}`]) {
    const response = await get(result.url, result.certPem, path);
    assert.equal(response.status, 200);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.match(response.body, /Check-In 007/);
  }
});

test('an unavailable explicit bind is rejected by the listener', async () => {
  const certDir = await mkdtemp(join(tmpdir(), 'checkin-https-unavailable-'));
  await assert.rejects(
    startServer({ host: '192.0.2.1', port: 0, root: process.cwd(), certDir, interfaces: {} }),
    (error) => error?.code === 'EADDRNOTAVAIL',
  );
});
