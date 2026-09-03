import {
  createPrivateKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  X509Certificate,
} from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isIP } from 'node:net';
import * as der from './der.mjs';

export const CERT_VALIDITY_DAYS = 820;
const SHA256_RSA = '1.2.840.113549.1.1.11';
const COMMON_NAME = '2.5.4.3';
const BASIC_CONSTRAINTS = '2.5.29.19';
const KEY_USAGE = '2.5.29.15';
const EXTENDED_KEY_USAGE = '2.5.29.37';
const SERVER_AUTH = '1.3.6.1.5.5.7.3.1';
const SUBJECT_ALT_NAME = '2.5.29.17';

function ipv6Bytes(host) {
  const [left, right = ''] = host.toLowerCase().split('::');
  const parse = (side) => {
    if (!side) return [];
    return side.split(':').flatMap((part) => {
      if (!part.includes('.')) return [parseInt(part, 16)];
      const bytes = part.split('.').map(Number);
      return [(bytes[0] << 8) | bytes[1], (bytes[2] << 8) | bytes[3]];
    });
  };
  const leftParts = parse(left);
  const rightParts = parse(right);
  const parts = [
    ...leftParts,
    ...Array(8 - leftParts.length - rightParts.length).fill(0),
    ...rightParts,
  ];
  const bytes = Buffer.alloc(16);
  parts.forEach((part, index) => bytes.writeUInt16BE(part, index * 2));
  return bytes;
}

function normalizedHosts(hosts) {
  return [...new Set(hosts.map((host) => String(host).trim().toLowerCase()).filter(Boolean))];
}

export function buildSanExtension(hosts) {
  const names = normalizedHosts(hosts).map((host) => {
    const family = isIP(host);
    if (family === 4) return der.implicit(7, Buffer.from(host.split('.').map(Number)));
    if (family === 6) return der.implicit(7, ipv6Bytes(host));
    return der.implicit(2, Buffer.from(host, 'ascii'));
  });
  return der.seq(...names);
}

function algorithmIdentifier() {
  return der.seq(der.oid(SHA256_RSA), der.nullValue());
}

function extension(oid, value, critical = false) {
  return der.seq(der.oid(oid), ...(critical ? [der.boolean(true)] : []), der.octetString(value));
}

export function buildTbsCertificate({ subjectCN, spkiDer, hosts, notBefore, notAfter, serial }) {
  const name = der.seq(der.set(der.seq(der.oid(COMMON_NAME), der.utf8String(subjectCN))));
  const extensions = der.seq(
    // cA defaults to FALSE, and DER requires default values to be omitted.
    extension(BASIC_CONSTRAINTS, der.seq(), true),
    extension(KEY_USAGE, der.bitString(Buffer.from([0xa0]), 5), true),
    extension(EXTENDED_KEY_USAGE, der.seq(der.oid(SERVER_AUTH))),
    extension(SUBJECT_ALT_NAME, buildSanExtension(hosts)),
  );
  return der.seq(
    der.explicit(0, der.int(2)),
    der.int(serial),
    algorithmIdentifier(),
    name,
    der.seq(der.utcTime(notBefore), der.utcTime(notAfter)),
    name,
    der.raw(spkiDer),
    der.explicit(3, extensions),
  );
}

function pem(label, bytes) {
  const body = bytes
    .toString('base64')
    .match(/.{1,64}/g)
    .join('\n');
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

export function generateSelfSignedCert({
  hosts = ['localhost', '127.0.0.1'],
  subjectCN = 'CheckIn007 Offline Kiosk',
  validityDays = CERT_VALIDITY_DAYS,
  now = new Date(),
} = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  const notBefore = new Date(now.getTime() - 60 * 60 * 1000);
  const notAfter = new Date(now.getTime() + validityDays * 86_400_000);
  const tbs = buildTbsCertificate({
    subjectCN,
    spkiDer,
    hosts: normalizedHosts(hosts),
    notBefore,
    notAfter,
    serial: randomBytes(16),
  });
  const signature = sign('sha256', tbs, privateKey);
  const certDer = der.seq(tbs, algorithmIdentifier(), der.bitString(signature));
  return {
    keyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    certPem: pem('CERTIFICATE', certDer),
  };
}

function sanSet(cert) {
  const result = new Set();
  for (const match of cert.subjectAltName?.matchAll(/(?:DNS:|IP Address:)([^,]+)/g) ?? [])
    result.add(match[1].trim().toLowerCase());
  return result;
}

function cacheIsValid(keyPem, certPem, hosts) {
  try {
    const cert = new X509Certificate(certPem);
    if (new Date(cert.validTo).getTime() <= Date.now()) return false;
    if (!cert.checkPrivateKey(createPrivateKey(keyPem))) return false;
    const sans = sanSet(cert);
    return normalizedHosts(hosts).every((host) => sans.has(host));
  } catch {
    return false;
  }
}

export function ensureCert({ dir = '.certs', hosts = ['localhost', '127.0.0.1'] } = {}) {
  const target = resolve(dir);
  const keyPath = join(target, 'key.pem');
  const certPath = join(target, 'cert.pem');
  try {
    if (existsSync(keyPath) && existsSync(certPath)) {
      const keyPem = readFileSync(keyPath, 'utf8');
      const certPem = readFileSync(certPath, 'utf8');
      if (cacheIsValid(keyPem, certPem, hosts)) {
        chmodSync(keyPath, 0o600);
        return { keyPem, certPem, keyPath, certPath, regenerated: false };
      }
    }
    mkdirSync(target, { recursive: true, mode: 0o700 });
    const generated = generateSelfSignedCert({ hosts });
    writeFileSync(keyPath, generated.keyPem, { mode: 0o600 });
    chmodSync(keyPath, 0o600);
    writeFileSync(certPath, generated.certPem, { mode: 0o644 });
    return { ...generated, keyPath, certPath, regenerated: true };
  } catch (error) {
    throw new Error(`Unable to create or read certificate cache ${target}: ${error.message}`, {
      cause: error,
    });
  }
}
