import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateKey, X509Certificate } from 'node:crypto';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildSanExtension,
  ensureCert,
  generateSelfSignedCert,
} from '../../scripts/lib/dev-cert.mjs';

test('generates a valid, self-signed iOS-compatible server certificate', () => {
  const { keyPem, certPem } = generateSelfSignedCert({
    hosts: ['localhost', '127.0.0.1', 'cabinet.local'],
  });
  const cert = new X509Certificate(certPem);
  assert.match(cert.subject, /CN=CheckIn007 Offline Kiosk/);
  assert.equal(cert.issuer, cert.subject);
  assert.match(cert.subjectAltName, /DNS:localhost/);
  assert.match(cert.subjectAltName, /IP Address:127\.0\.0\.1/);
  assert.match(cert.subjectAltName, /DNS:cabinet\.local/);
  assert.ok(cert.keyUsage.includes('1.3.6.1.5.5.7.3.1'));
  assert.equal(cert.ca, false);
  assert.ok((new Date(cert.validTo) - new Date(cert.validFrom)) / 86_400_000 <= 825);
  assert.ok(new Date(cert.validFrom) <= new Date());
  assert.ok(new Date(cert.validTo) >= new Date());
  assert.equal(cert.verify(cert.publicKey), true);
  assert.equal(cert.checkPrivateKey(createPrivateKey(keyPem)), true);
});

test('SAN encoding distinguishes exact IPv4, hostname boundary, and IPv6 literals', () => {
  const encoded = buildSanExtension(['192.168.50.7', '192.168.50.999', '::1']);
  assert.ok(encoded.includes(Buffer.from([0x87, 0x04, 192, 168, 50, 7])));
  assert.ok(encoded.includes(Buffer.from('192.168.50.999', 'ascii')));
  assert.ok(encoded.includes(Buffer.from([0x87, 0x10, 0, 0, 0, 0, 0, 0, 0, 0])));
});

test('ensureCert caches valid bytes with a 0600 key and regenerates invalid caches', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'checkin-cert-'));
  const first = ensureCert({ dir, hosts: ['localhost'] });
  assert.equal((await stat(join(dir, 'key.pem'))).mode & 0o777, 0o600);
  const second = ensureCert({ dir, hosts: ['localhost'] });
  assert.equal(second.regenerated, false);
  assert.equal(second.keyPem, first.keyPem);
  assert.equal(second.certPem, first.certPem);

  const addedSan = ensureCert({ dir, hosts: ['localhost', '192.168.50.7'] });
  assert.equal(addedSan.regenerated, true);
  assert.match(new X509Certificate(addedSan.certPem).subjectAltName, /192\.168\.50\.7/);

  await writeFile(join(dir, 'cert.pem'), 'not a certificate');
  assert.equal(ensureCert({ dir, hosts: ['localhost'] }).regenerated, true);

  const other = generateSelfSignedCert({ hosts: ['localhost'] });
  await writeFile(join(dir, 'key.pem'), other.keyPem);
  assert.equal(ensureCert({ dir, hosts: ['localhost'] }).regenerated, true);

  const expired = generateSelfSignedCert({
    hosts: ['localhost'],
    validityDays: 1,
    now: new Date('2020-01-01T00:00:00Z'),
  });
  await writeFile(join(dir, 'key.pem'), expired.keyPem);
  await writeFile(join(dir, 'cert.pem'), expired.certPem);
  assert.equal(ensureCert({ dir, hosts: ['localhost'] }).regenerated, true);
  assert.match(await readFile(join(dir, 'cert.pem'), 'utf8'), /BEGIN CERTIFICATE/);
});
