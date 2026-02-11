import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const RUNTIME_DIRS = ['app', 'hooks', 'components', 'services', 'constants'] as const;

function listRuntimeFiles(): string[] {
  const files: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
      files.push(fullPath);
    }
  };

  for (const dir of RUNTIME_DIRS) {
    const absolute = path.join(ROOT, dir);
    if (fs.existsSync(absolute)) walk(absolute);
  }

  return files;
}

describe('Service-layer mock boundary contract', () => {
  it('runtime code has no direct imports from mock-data modules', () => {
    const offenders: string[] = [];
    const importPattern = /from\s+['"][^'"]*mock-data(?:\.[^'"]+)?['"]|require\(['"][^'"]*mock-data(?:\.[^'"]+)?['"]\)/;

    for (const filePath of listRuntimeFiles()) {
      const source = fs.readFileSync(filePath, 'utf8');
      if (importPattern.test(source)) {
        offenders.push(path.relative(ROOT, filePath));
      }
    }

    assert.deepEqual(
      offenders,
      [],
      `Runtime files must use services/apiClient only. Offenders: ${offenders.join(', ')}`
    );
  });

  it('only api-client imports AsyncStorage directly', () => {
    const offenders: string[] = [];
    const importPattern = /from\s+['"]@react-native-async-storage\/async-storage['"]/;

    for (const filePath of listRuntimeFiles()) {
      const source = fs.readFileSync(filePath, 'utf8');
      if (!importPattern.test(source)) continue;
      const relative = path.relative(ROOT, filePath);
      if (relative !== 'services/api-client.ts') {
        offenders.push(relative);
      }
    }

    assert.deepEqual(
      offenders,
      [],
      `Only services/api-client.ts may import AsyncStorage directly. Offenders: ${offenders.join(', ')}`
    );
  });
});

