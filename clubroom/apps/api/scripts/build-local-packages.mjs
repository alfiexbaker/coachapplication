import { execFileSync } from 'node:child_process';
import { realpathSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const typescriptCli = resolve(apiRoot, 'node_modules/typescript/bin/tsc');
const packageNames = ['@clubroom/config', '@clubroom/db', '@clubroom/shared-contracts'];

for (const packageName of packageNames) {
  const packageRoot = realpathSync(resolve(apiRoot, 'node_modules', packageName));
  rmSync(resolve(packageRoot, 'dist'), { recursive: true, force: true });
  execFileSync(process.execPath, [typescriptCli, '--project', resolve(packageRoot, 'tsconfig.json')], {
    cwd: apiRoot,
    stdio: 'inherit',
  });
}
