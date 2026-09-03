import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CANONICAL_ARTIFACTS = {
  plan: 'IMPLEMENTATION_PLAN.md',
  critique: 'IMPLEMENTATION_PLAN_CRITIQUE.md',
  audit: 'CONSOLIDATED_AUDIT.md',
  backlog: 'BACKLOG.md',
};

function isEmptyArtifact(file) {
  return file.missing || file.size === 0 || file.whitespaceOnly;
}

export async function readCycleArtifactSizes(root = process.cwd()) {
  const entries = {};
  for (const [key, filename] of Object.entries(CANONICAL_ARTIFACTS)) {
    const path = resolve(root, filename);
    try {
      const content = await readFile(path, 'utf8');
      entries[key] = {
        key,
        filename,
        path,
        missing: false,
        size: Buffer.byteLength(content),
        whitespaceOnly: content.trim().length === 0,
      };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      entries[key] = {
        key,
        filename,
        path,
        missing: true,
        size: 0,
        whitespaceOnly: true,
      };
    }
  }
  return entries;
}

export function checkCycleArtifacts({ files, allowEmptyCritique = false }) {
  const errors = [];
  const checked = Object.values(files).map((file) => file.filename);

  for (const key of ['plan', 'audit', 'backlog']) {
    if (isEmptyArtifact(files[key])) {
      errors.push(`${files[key].filename} is missing, zero-byte, or whitespace-only`);
    }
  }

  if (!isEmptyArtifact(files.plan) && isEmptyArtifact(files.critique) && !allowEmptyCritique) {
    errors.push(
      `${files.critique.filename} is missing, zero-byte, or whitespace-only while ${files.plan.filename} is non-empty`,
    );
  }

  return errors.length > 0 ? { ok: false, errors, checked } : { ok: true, checked };
}

export async function main({
  root = process.cwd(),
  allowEmptyCritique = process.env.CHECKIN007_ALLOW_EMPTY_CRITIQUE === '1',
  stdout = console.log,
  stderr = console.error,
} = {}) {
  const files = await readCycleArtifactSizes(root);
  const result = checkCycleArtifacts({ files, allowEmptyCritique });
  if (allowEmptyCritique && isEmptyArtifact(files.critique)) {
    stderr(
      'WARNING: CHECKIN007_ALLOW_EMPTY_CRITIQUE=1 permits an empty critique only during the intentional pre-critique planning window.',
    );
  }
  if (!result.ok) {
    for (const error of result.errors) stderr(`cycle artifact check failed: ${error}`);
    return 1;
  }
  stdout(`cycle artifact check passed: ${result.checked.join(', ')}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
