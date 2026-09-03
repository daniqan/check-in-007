import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  contentTypeFor,
  createStaticHandler,
  safeResolve,
} from '../../scripts/lib/static-server.mjs';

test('safeResolve rejects traversal, malformed, and dot-prefixed segments', () => {
  assert.equal(safeResolve('/srv', '/index.html'), '/srv/index.html');
  for (const path of [
    '/../etc/passwd',
    '/%2e%2e/x',
    '/a/../../b',
    '/.certs/key.pem',
    '//etc/passwd',
  ])
    assert.equal(safeResolve('/srv', path), null);
  assert.equal(contentTypeFor('a.mjs'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('app.webmanifest'), 'application/manifest+json');
  assert.equal(contentTypeFor('icon.svg'), 'image/svg+xml');
  assert.equal(contentTypeFor('icon.png'), 'image/png');
  assert.equal(contentTypeFor('a.bin'), 'application/octet-stream');
});

test('static handler serves files and cert but denies secrets and invalid methods', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'checkin-static-'));
  const certDir = join(root, '.certs');
  const privateDir = join(root, 'private-cache');
  await mkdir(join(root, 'src'));
  await mkdir(join(root, 'assets'));
  await mkdir(join(root, 'assets/icons'));
  await mkdir(join(root, 'dist'));
  await mkdir(certDir);
  await mkdir(privateDir);
  await writeFile(join(root, 'index.html'), '<h1>007</h1>');
  await writeFile(join(root, 'manifest.webmanifest'), '{"name":"Check-In 007"}\n');
  await writeFile(join(root, 'dist/check-in-007.webmanifest'), '{"start_url":"./x.html"}\n');
  await writeFile(join(root, 'assets/icons/check-in-007-icon.svg'), '<svg></svg>');
  await writeFile(join(root, 'assets/icons/check-in-007-icon-192.png'), 'PNGDATA');
  await writeFile(join(root, 'src/app.mjs'), 'export const ok = true');
  await writeFile(join(certDir, 'key.pem'), 'PRIVATE');
  await writeFile(join(certDir, 'cert.pem'), 'CERTIFICATE');
  await writeFile(join(privateDir, 'secret.txt'), 'SECRET');
  const server = createServer(
    createStaticHandler({
      root,
      certPath: join(certDir, 'cert.pem'),
      forbiddenRoots: [certDir, privateDir],
    }),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  let response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '<h1>007</h1>');
  response = await fetch(`${base}/src/app.mjs`);
  assert.equal(response.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  response = await fetch(`${base}/manifest.webmanifest`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/manifest+json');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  response = await fetch(`${base}/dist/check-in-007.webmanifest`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/manifest+json');
  response = await fetch(`${base}/assets/icons/check-in-007-icon.svg`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/svg+xml');
  response = await fetch(`${base}/assets/icons/check-in-007-icon-192.png`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  response = await fetch(`${base}/`, { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), '');
  response = await fetch(`${base}/`, { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
  assert.equal((await fetch(`${base}/missing`)).status, 404);
  assert.equal((await fetch(`${base}/.certs/key.pem`)).status, 404);
  assert.equal((await fetch(`${base}/.certs/cert.pem`)).status, 404);
  assert.equal((await fetch(`${base}/private-cache/secret.txt`)).status, 404);
  assert.equal((await fetch(`${base}/..%2f..%2fetc/passwd`)).status, 404);
  response = await fetch(`${base}/checkin007-cert.pem`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/x-pem-file');
  assert.equal(await response.text(), 'CERTIFICATE');
});
