import { pathToFileURL } from 'node:url';

export const SUPPORTED_NODE_MAJOR = 24;

export function parseNodeMajor(version = process.versions.node) {
  /** Return the numeric major from "24.20.0" or "v24.20.0".
   *  Return null for empty, non-string, or non-numeric input. */
  if (typeof version !== 'string') return null;
  const match = version.match(/^v?(\d+)\./);
  if (!match) return null;
  const major = Number(match[1]);
  return Number.isInteger(major) ? major : null;
}

export function isSupportedNodeVersion(version = process.versions.node) {
  /** True only when parseNodeMajor(version) === SUPPORTED_NODE_MAJOR. */
  return parseNodeMajor(version) === SUPPORTED_NODE_MAJOR;
}

export function formatUnsupportedNodeMessage(version = process.versions.node) {
  /** One-line stderr message naming the detected version and the required
   *  "Node 24 LTS" target, including "nvm install && nvm use" as the recovery hint. */
  const detected = typeof version === 'string' && version.length > 0 ? version : String(version);
  return `check-in-007 requires Node 24 LTS but detected ${detected}. Run "nvm install && nvm use" (or asdf/mise via .node-version) to select Node 24, then retry.`;
}

export function main({ version = process.versions.node, stderr = process.stderr } = {}) {
  /** Return 0 when supported. Otherwise write the formatted message to stderr and
   *  return 1. Never throw for malformed versions. */
  if (isSupportedNodeVersion(version)) return 0;
  stderr.write(`${formatUnsupportedNodeMessage(version)}\n`);
  return 1;
}

// Version-agnostic executable-tail guard: runs on unsupported majors too, so the CLI
// fails CLOSED (exit 1) on Node 20/22-pre-22.18/23 where import.meta.main is undefined.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
