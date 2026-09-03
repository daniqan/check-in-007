import { createServer } from 'node:https';
import { isIP } from 'node:net';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureCert } from './lib/dev-cert.mjs';
import { createStaticHandler } from './lib/static-server.mjs';

const CERT_ROUTE = '/checkin007-cert.pem';

export function parseArgs(argv) {
  const options = {
    host: '0.0.0.0',
    port: 8443,
    root: process.cwd(),
    certDir: '.certs',
    hosts: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const [flag, inline] = argument.split(/=(.*)/s, 2);
    const value = inline ?? argv[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (flag === '--port') options.port = Number(value);
    else if (flag === '--host') options.hosts.push(value);
    else if (flag === '--root') options.root = value;
    else if (flag === '--cert-dir') options.certDir = value;
    else if (flag === '--bind') options.host = value;
    else throw new Error(`Unknown option: ${flag}`);
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535)
    throw new Error('--port must be an integer from 1 to 65535');
  return options;
}

export function lanIpv4Addresses(interfaces = networkInterfaces()) {
  return [
    ...new Set(
      Object.values(interfaces)
        .flat()
        .filter((item) => item && !item.internal && item.family === 'IPv4')
        .map((item) => item.address),
    ),
  ].sort();
}

export function lanUrls(port, addresses = lanIpv4Addresses()) {
  return addresses.map((address) => `https://${address}:${port}`);
}

/** Build a bracket-safe HTTPS origin for a client-reachable host. */
export function httpsUrl(host, port) {
  if (typeof host !== 'string' || host.length === 0) throw new TypeError('Host must be non-empty');
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535)
    throw new RangeError('Invalid port');
  const url = new URL('https://localhost');
  url.hostname = isIP(host) === 6 ? `[${host}]` : host;
  url.port = String(numericPort);
  if (url.hostname === 'localhost' && host.toLowerCase() !== 'localhost')
    throw new TypeError(`Invalid host: ${host}`);
  return url.origin;
}

/** Select deterministic client endpoints for the effective bind. */
export function advertisedUrls(bindHost, port, lanAddresses = []) {
  if (bindHost !== '0.0.0.0' && bindHost !== '::') return [httpsUrl(bindHost, port)];
  const addresses = [...new Set([...lanAddresses].sort())];
  return addresses.length
    ? addresses.map((address) => httpsUrl(address, port))
    : [httpsUrl('localhost', port)];
}

export async function startServer({
  host = '0.0.0.0',
  port = 8443,
  root = process.cwd(),
  certDir = '.certs',
  hosts = [],
  interfaces = networkInterfaces(),
} = {}) {
  const lanAddresses = lanIpv4Addresses(interfaces);
  const bindCertHosts = host === '0.0.0.0' || host === '::' ? [] : [host];
  const certHosts = [
    ...new Set(['localhost', '127.0.0.1', ...lanAddresses, ...bindCertHosts, ...hosts]),
  ];
  const certDirectory = resolve(certDir);
  const cert = ensureCert({ dir: certDirectory, hosts: certHosts });
  const handler = createStaticHandler({
    root: resolve(root),
    certPath: cert.certPath,
    forbiddenRoots: [certDirectory],
    certRoute: CERT_ROUTE,
  });
  const server = createServer({ key: cert.keyPem, cert: cert.certPem }, handler);
  let startupError;
  await new Promise((fulfill, reject) => {
    startupError = reject;
    server.once('error', startupError);
    server.listen(port, host, fulfill);
  }).catch((error) => {
    if (error.code === 'EADDRINUSE')
      throw new Error(`Port ${port} is in use; pass -- --port <n>.`, { cause: error });
    throw error;
  });
  server.off('error', startupError);
  const actualPort = server.address().port;
  const urls = advertisedUrls(host, actualPort, lanAddresses);
  const close = () =>
    new Promise((fulfill, reject) => server.close((error) => (error ? reject(error) : fulfill())));
  return {
    server,
    port: actualPort,
    url: urls[0],
    urls,
    certPath: cert.certPath,
    certPem: cert.certPem,
    regenerated: cert.regenerated,
    lanUrls: lanUrls(actualPort, lanAddresses),
    close,
  };
}

async function main() {
  try {
    const result = await startServer(parseArgs(process.argv.slice(2)));
    console.log(
      `Check-In 007 HTTPS server is ready:\n${result.urls.map((url) => `  ${url}/`).join('\n')}`,
    );
    console.log(`\nCertificate download:\n  ${result.url}${CERT_ROUTE}`);
    if (result.regenerated)
      console.log('\nA new certificate was generated; install and trust this certificate again.');
    console.log(
      '\nOn iPad: download the certificate, install it under VPN & Device Management, then enable full trust under Certificate Trust Settings and reload the kiosk.',
    );
    const stop = async () => {
      await result.close();
      process.exitCode = 0;
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } catch (error) {
    console.error(`Unable to start HTTPS server: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
