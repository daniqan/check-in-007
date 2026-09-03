import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checkCycleArtifacts,
  main,
  readCycleArtifactSizes,
} from '../../scripts/check-cycle-artifacts.mjs';

async function artifactRoot(files = {}) {
  const root = await mkdtemp(join(tmpdir(), 'checkin-cycle-artifacts-'));
  const defaults = {
    'IMPLEMENTATION_PLAN.md': '# Plan\n',
    'IMPLEMENTATION_PLAN_CRITIQUE.md': '# Critique\n',
    'CONSOLIDATED_AUDIT.md': '# Audit\n',
    'BACKLOG.md': '# Backlog\n',
  };
  for (const [filename, content] of Object.entries({ ...defaults, ...files })) {
    if (content !== null) await writeFile(join(root, filename), content);
  }
  return root;
}

test('cycle artifact check passes with all canonical files non-empty', async () => {
  const root = await artifactRoot();
  const files = await readCycleArtifactSizes(root);
  const result = checkCycleArtifacts({ files });
  assert.equal(result.ok, true);
  assert.equal(result.checked.length, 4);
});

test('cycle artifact check fails missing plan, audit, and backlog', async () => {
  const root = await artifactRoot({
    'IMPLEMENTATION_PLAN.md': null,
    'CONSOLIDATED_AUDIT.md': null,
    'BACKLOG.md': null,
  });
  const result = checkCycleArtifacts({ files: await readCycleArtifactSizes(root) });
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors.join('\n'), /IMPLEMENTATION_PLAN\.md/);
  assert.match(result.errors.join('\n'), /CONSOLIDATED_AUDIT\.md/);
  assert.match(result.errors.join('\n'), /BACKLOG\.md/);
});

test('cycle artifact check fails missing, zero-byte, and whitespace-only critique', async () => {
  for (const critique of [null, '', '   \n\t']) {
    const root = await artifactRoot({ 'IMPLEMENTATION_PLAN_CRITIQUE.md': critique });
    const result = checkCycleArtifacts({ files: await readCycleArtifactSizes(root) });
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /IMPLEMENTATION_PLAN_CRITIQUE\.md/);
  }
});

test('empty critique override succeeds and prints intentional-window warning', async () => {
  const root = await artifactRoot({ 'IMPLEMENTATION_PLAN_CRITIQUE.md': '' });
  const output = [];
  const code = await main({
    root,
    allowEmptyCritique: true,
    stdout: (message) => output.push(['out', message]),
    stderr: (message) => output.push(['err', message]),
  });
  assert.equal(code, 0);
  assert.equal(
    output.some(([stream, message]) => stream === 'err' && message.includes('pre-critique')),
    true,
  );
});

test('main returns nonzero for empty critique without override', async () => {
  const root = await artifactRoot({ 'IMPLEMENTATION_PLAN_CRITIQUE.md': '' });
  const errors = [];
  const code = await main({
    root,
    allowEmptyCritique: false,
    stdout: () => {},
    stderr: (message) => errors.push(message),
  });
  assert.equal(code, 1);
  assert.match(errors.join('\n'), /cycle artifact check failed/);
});
