import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.pem': 'application/x-pem-file',
};

function within(parent, child) {
  return child === parent || child.startsWith(`${parent}${sep}`);
}

export function safeResolve(root, urlPath) {
  if (typeof urlPath !== 'string' || urlPath.includes('\0') || !urlPath.startsWith('/'))
    return null;
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.replace(/\\/g, '/'));
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.startsWith('//')) return null;
  const parts = decoded.split('/').filter(Boolean);
  if (parts.some((part) => part.startsWith('.') || part.includes('/') || part.includes('\\')))
    return null;
  const base = resolve(root);
  const target = resolve(base, ...parts);
  return within(base, target) ? target : null;
}

export function contentTypeFor(path) {
  return MIME[extname(path).toLowerCase()] || 'application/octet-stream';
}

function reply(res, status, headers = {}) {
  res.writeHead(status, { 'Content-Length': '0', ...headers });
  res.end();
}

export function createStaticHandler({
  root = process.cwd(),
  certPath,
  forbiddenRoots = [],
  certRoute = '/checkin007-cert.pem',
} = {}) {
  const rootPath = resolve(root);
  const blockedPaths = forbiddenRoots.map((path) => resolve(path));
  return async function staticHandler(req, res) {
    if (!['GET', 'HEAD'].includes(req.method)) {
      reply(res, 405, { Allow: 'GET, HEAD' });
      return;
    }
    const pathname = req.url?.split(/[?#]/, 1)[0];
    if (!pathname) {
      reply(res, 404);
      return;
    }
    const requestedCert = pathname === certRoute;
    let target = requestedCert
      ? certPath
      : safeResolve(rootPath, pathname === '/' ? '/index.html' : pathname);
    if (!target) {
      reply(res, 404);
      return;
    }
    target = resolve(target);
    try {
      const [realRoot, realTarget, ...realBlocked] = await Promise.all([
        realpath(rootPath),
        realpath(target),
        ...blockedPaths.map((path) => realpath(path).catch(() => path)),
      ]);
      if (
        !requestedCert &&
        (!within(realRoot, realTarget) || realBlocked.some((path) => within(path, realTarget)))
      ) {
        reply(res, 404);
        return;
      }
      const info = await stat(realTarget);
      if (!info.isFile()) {
        reply(res, 404);
        return;
      }
      const headers = {
        'Content-Type': requestedCert ? 'application/x-pem-file' : contentTypeFor(realTarget),
        'Content-Length': String(info.size),
        'Cache-Control': 'no-store',
      };
      if (requestedCert)
        headers['Content-Disposition'] = 'attachment; filename="checkin007-cert.pem"';
      res.writeHead(200, headers);
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = createReadStream(realTarget);
      const destroy = () => stream.destroy();
      res.on('close', destroy);
      stream.on('error', () => {
        if (!res.headersSent) reply(res, 404);
        else res.destroy();
      });
      stream.pipe(res);
    } catch {
      reply(res, 404);
    }
  };
}
