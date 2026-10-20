import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

try {
  const repoRoot = git('rev-parse', '--show-toplevel');
  if (fs.realpathSync(repoRoot) !== fs.realpathSync(root)) throw new Error('Install hooks from the NokiaPulse repository.');
  const previous = (() => {
    try { return git('config', '--get', 'core.hooksPath'); }
    catch { return ''; }
  })();
  if (previous && previous !== 'scripts/git-hooks') {
    throw new Error(`core.hooksPath=${previous} is already configured. Resolve the existing configuration manually to avoid overwriting it.`);
  }
  for (const name of ['pre-commit', 'commit-msg']) {
    const file = path.join(root, 'scripts', 'git-hooks', name);
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('\r\n')) fs.writeFileSync(file, text.replace(/\r\n/g, '\n'));
    fs.chmodSync(file, 0o755);
  }
  git('config', '--local', 'core.hooksPath', 'scripts/git-hooks');
  git('config', '--local', 'user.name', 'Shane Wang');
  git('config', '--local', 'user.email', 'shanewa@qq.com');
  console.log('Enabled pre-commit / commit-msg; only the current repository Git configuration was changed.');
  console.log('Author: Shane Wang <shanewa@qq.com>; no automatic commits or pushes.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}