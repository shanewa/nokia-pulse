import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkMessage, checkStagedFiles } from '../scripts/git-hooks/check.mjs';

test('commit messages reject Co-authored-by without rewriting the original message', () => {
  assert.doesNotThrow(() => checkMessage('feat: add price alerts\n'));
  assert.throws(() => checkMessage('feat: add alerts\n\nCo-authored-by: Bot <bot@example.com>\n'), /Co-authored-by/);
});

test('line-ending checks inspect staged files rather than working files and ignore binary files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'np-hooks-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  try {
    git('init');
    git('config', 'core.autocrlf', 'false');
    fs.writeFileSync(path.join(dir, '.gitattributes'), '* -text\n');
    fs.writeFileSync(path.join(dir, 'sample.txt'), 'one\r\ntwo\r\n');
    git('add', '.');
    fs.writeFileSync(path.join(dir, 'sample.txt'), 'one\ntwo\n');
    assert.throws(() => checkStagedFiles(dir), /CRLF/);
    git('add', 'sample.txt');
    fs.writeFileSync(path.join(dir, 'sample.bin'), Buffer.from([0, 13, 10, 255]));
    git('add', 'sample.bin');
    assert.doesNotThrow(() => checkStagedFiles(dir));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});