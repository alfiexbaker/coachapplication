import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'packages/db/scripts/import-marketplace-p0-seed.mjs');

function runSeedImport(env: Record<string, string>) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH ?? '',
      NODE_ENV: env.NODE_ENV ?? 'test',
      ...env,
    },
  });
}

test('P0 seed import guard runs before Prisma client or destructive transaction work', () => {
  const source = readFileSync(scriptPath, 'utf8');
  const mainStart = source.indexOf('async function main() {');
  const guardStart = source.indexOf('assertSeedImportAllowed();', mainStart);
  const prismaStart = source.indexOf('prisma = new PrismaClient();', mainStart);
  const transactionStart = source.indexOf('await prisma.$transaction', mainStart);

  assert.ok(mainStart >= 0, 'test should find the import main function');
  assert.ok(guardStart > mainStart, 'guard should run inside main');
  assert.ok(prismaStart > guardStart, 'guard must run before Prisma client creation');
  assert.ok(transactionStart > prismaStart, 'Prisma client should be created before transaction work');
  assert.equal(
    source.includes('const prisma = new PrismaClient();'),
    false,
    'P0 seed import must not create a Prisma client at module load',
  );
  assert.ok(source.includes('await prisma?.$disconnect();'));
});

test('P0 seed import refuses to run without explicit confirmation', () => {
  const result = runSeedImport({
    CLUBROOM_P0_SEED_TARGET: 'staging',
    DATABASE_URL: 'postgresql://postgres:postgres@staging.example.com:5432/postgres',
    EXPO_PUBLIC_ENV: 'staging',
    NODE_ENV: 'production',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /without CLUBROOM_P0_SEED_IMPORT=1/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /PrismaClientKnownRequestError/);
});

test('P0 seed import refuses production-labeled targets and non-local local URLs', () => {
  const productionEnv = runSeedImport({
    CLUBROOM_P0_SEED_IMPORT: '1',
    CLUBROOM_P0_SEED_TARGET: 'staging',
    DATABASE_URL: 'postgresql://postgres:postgres@staging.example.com:5432/postgres',
    EXPO_PUBLIC_ENV: 'production',
    NODE_ENV: 'production',
  });
  assert.notEqual(productionEnv.status, 0);
  assert.match(productionEnv.stderr, /EXPO_PUBLIC_ENV=production/);

  const nonLocal = runSeedImport({
    CLUBROOM_P0_SEED_IMPORT: '1',
    CLUBROOM_P0_SEED_TARGET: 'local',
    DATABASE_URL: 'postgresql://postgres:postgres@staging.example.com:5432/postgres',
    EXPO_PUBLIC_ENV: 'development',
    NODE_ENV: 'development',
  });
  assert.notEqual(nonLocal.status, 0);
  assert.match(nonLocal.stderr, /local targets require a localhost DATABASE_URL/);
});
