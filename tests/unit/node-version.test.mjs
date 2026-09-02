import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  SUPPORTED_NODE_MAJOR,
  formatUnsupportedNodeMessage,
  isSupportedNodeVersion,
  main,
  parseNodeMajor,
} from '../../scripts/check-node-version.mjs';

const scriptPath = fileURLToPath(new URL('../../scripts/check-node-version.mjs', import.meta.url));

test('parseNodeMajor accepts plain and v-prefixed versions', () => {
  assert.equal(parseNodeMajor('24.20.0'), 24);
  assert.equal(parseNodeMajor('v24.20.0'), 24);
  assert.equal(parseNodeMajor('22.99.0'), 22);
});

test('parseNodeMajor returns null for empty/non-numeric/null', () => {
  assert.equal(parseNodeMajor(''), null);
  assert.equal(parseNodeMajor('abc'), null);
  assert.equal(parseNodeMajor(null), null);
  assert.equal(parseNodeMajor(42), null);
});

test('isSupportedNodeVersion accepts only Node 24', () => {
  assert.equal(SUPPORTED_NODE_MAJOR, 24);
  assert.equal(isSupportedNodeVersion('24.0.0'), true);
  assert.equal(isSupportedNodeVersion('24.20.0'), true);
  assert.equal(isSupportedNodeVersion('22.99.0'), false);
  assert.equal(isSupportedNodeVersion('23.0.0'), false);
  assert.equal(isSupportedNodeVersion('25.0.0'), false);
  assert.equal(isSupportedNodeVersion('26.3.0'), false);
  assert.equal(isSupportedNodeVersion(''), false);
});

test('main returns 1 and writes a recovery hint for unsupported versions', () => {
  let captured = '';
  const stderr = { write: (chunk) => (captured += chunk) };
  const code = main({ version: '26.3.0', stderr });
  assert.equal(code, 1);
  assert.match(captured, /Node 24 LTS/);
  assert.match(captured, /26\.3\.0/);
  assert.match(captured, /nvm install && nvm use/);
  assert.match(formatUnsupportedNodeMessage('26.3.0'), /Node 24 LTS/);
});

test('main returns 0 and stays silent for Node 24', () => {
  let captured = '';
  const stderr = { write: (chunk) => (captured += chunk) };
  const code = main({ version: '24.20.0', stderr });
  assert.equal(code, 0);
  assert.equal(captured, '');
});

test('CLI executable tail runs main for the current process major', () => {
  const result = spawnSync(process.execPath, [scriptPath]);
  const expected = isSupportedNodeVersion(process.versions.node) ? 0 : 1;
  assert.equal(result.status, expected);
});
