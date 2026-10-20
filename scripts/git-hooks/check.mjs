import fs from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function checkStagedFiles(cwd) {
  const names = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM', '-z'], { cwd, encoding: 'utf8' });
  for (const name of names.split('\0').filter(Boolean)) {
    const data = execFileSync('git', ['show', `:${name}`], { cwd, maxBuffer: 32 * 1024 * 1024 });
    if (!data.includes(0) && data.includes(Buffer.from('\r\n'))) {
      throw new Error(`Staged file contains CRLF; convert it to LF and stage it again: ${name}`);
    }
  }
}

export function checkMessage(message) {
  if (/^\s*Co-authored-by\s*:/im.test(message)) {
    throw new Error('Commit messages must not contain Co-authored-by; remove that attribution line.');
  }
}

function runNode(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Check failed: node ${args.join(' ')}`);
}

function main() {
  const cwd = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  if (process.argv[2] === 'pre-commit') {
    checkStagedFiles(cwd);
    runNode(['--test', 'tests/*.test.mjs'], cwd);
    runNode(['scripts/pack-extension.mjs', '--check-only'], cwd);
  } else if (process.argv[2] === 'commit-msg') {
    checkMessage(fs.readFileSync(process.argv[3], 'utf8'));
    const author = execFileSync('git', ['var', 'GIT_AUTHOR_IDENT'], { cwd, encoding: 'utf8' });
    if (!author.startsWith('Shane Wang <shanewa@qq.com> ')) {
      throw new Error('The commit author must be Shane Wang <shanewa@qq.com>; check the Git author configuration.');
    }
  } else {
    throw new Error('Unknown hook check type.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}