import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:https';
import { X509Certificate } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanIpv4Addresses, lanUrls, parseArgs, startServer } from '../../scripts/serve-https.mjs';

function get(url, ca, path = '/') {
  return new Promise((resolve, reject) => {
    const req = request(`${url}${path}`, { ca }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () =>
        resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString() }),
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
  for (const value of ['nope', '0', '65536', '1.5'])
    assert.throws(() => parseArgs([`--port=${value}`]), /integer from 1 to 65535/);
  assert.throws(() => parseArgs(['--wat=x']), /Unknown option/);
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

test('starts an HTTPS server whose default SAN covers every printed LAN URL', async (t) => {
  const certDir = await mkdtemp(join(tmpdir(), 'checkin-https-'));
  const interfaces = {
    en0: [{ address: '192.168.50.7', family: 'IPv4', internal: false }],
  };
  const result = await startServer({ port: 0, root: process.cwd(), certDir, interfaces });
  t.after(() => result.close());
  assert.deepEqual(result.lanUrls, [`https://192.168.50.7:${result.port}`]);
  assert.match(new X509Certificate(result.certPem).subjectAltName, /IP Address:192\.168\.50\.7/);
  const home = await get(result.url, result.certPem);
  assert.equal(home.status, 200);
  assert.match(home.body, /Check-In 007/);
  assert.equal((await get(result.url, result.certPem, '/.certs/key.pem')).status, 404);
  assert.equal((await get(result.url, result.certPem, '/..%2f..%2fetc/passwd')).status, 404);
});
