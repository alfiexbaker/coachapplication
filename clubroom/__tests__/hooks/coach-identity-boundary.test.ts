import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const RUNTIME_DIRS = ['app', 'hooks', 'services', 'components'] as const;

function listRuntimeFiles(): string[] {
  const files: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };

  for (const dir of RUNTIME_DIRS) {
    walk(path.join(ROOT, dir));
  }

  return files;
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('runtime code does not fabricate the legacy coach_1 actor', () => {
  const offenders = listRuntimeFiles()
    .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('coach_1'))
    .map((filePath) => path.relative(ROOT, filePath));

  assert.deepEqual(
    offenders,
    [],
    `Runtime code must use authenticated coach context, not coach_1. Offenders: ${offenders.join(', ')}`,
  );
});

test('coach-owned screen hooks fail closed before service calls when auth is missing', () => {
  const rosterSource = readProjectFile('app/roster/index.tsx');
  const athletesSource = readProjectFile('hooks/use-athletes-screen.ts');
  const athleteDetailSource = readProjectFile('hooks/use-athlete-detail.ts');
  const consentsSource = readProjectFile('hooks/use-consents.ts');
  const emergencySource = readProjectFile('hooks/use-emergency-access.ts');
  const scheduleSource = readProjectFile('hooks/use-schedule.ts');
  const concernSource = readProjectFile('app/roster/[athleteId]/raise-concern.tsx');
  const matchSource = readProjectFile('hooks/use-create-match.ts');

  for (const [name, source] of Object.entries({
    rosterSource,
    athletesSource,
    athleteDetailSource,
    consentsSource,
    emergencySource,
    scheduleSource,
    concernSource,
  })) {
    assert.ok(
      source.includes("serviceError('UNAUTHORIZED'"),
      `${name} should return an explicit UNAUTHORIZED result before loading live coach data`,
    );
  }

  assert.ok(matchSource.includes('const coachId = currentUser?.id;'));
  assert.equal(matchSource.includes("currentUser?.id || 'coach_1'"), false);
});
