import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const repoRoot = process.cwd();
const registerPath = path.join(repoRoot, 'scripts/test-register.js');
const configPath = path.join(repoRoot, '.tmp-tests/constants/config.js');

function importRuntimeConfig(env: Record<string, string>): void {
  execFileSync(
    process.execPath,
    ['--require', registerPath, '-e', `require(${JSON.stringify(configPath)})`],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...env,
      },
      encoding: 'utf8',
      stdio: 'pipe',
    },
  );
}

describe('runtime mode config', () => {
  it('allows retained mock compatibility only in test runtime', () => {
    assert.doesNotThrow(() =>
      importRuntimeConfig({
        NODE_ENV: 'test',
        EXPO_PUBLIC_ENV: 'development',
        EXPO_PUBLIC_USE_MOCK: 'true',
      }),
    );
  });

  it('blocks mock mode in every non-test app runtime config', () => {
    for (const env of ['development', 'staging', 'production']) {
      assert.throws(
        () =>
          importRuntimeConfig({
            NODE_ENV: 'development',
            EXPO_PUBLIC_ENV: env,
            EXPO_PUBLIC_USE_MOCK: 'true',
          }),
        /EXPO_PUBLIC_USE_MOCK=true is test-only/,
      );
    }
  });

  it('blocks retired pre-API live mode in every runtime config', () => {
    assert.throws(
      () =>
        importRuntimeConfig({
          NODE_ENV: 'development',
          EXPO_PUBLIC_ENV: 'staging',
          EXPO_PUBLIC_USE_MOCK: 'false',
          EXPO_PUBLIC_PRE_API_LIVE_MODE: 'true',
        }),
      /EXPO_PUBLIC_PRE_API_LIVE_MODE=true is no longer supported/,
    );

    assert.throws(
      () =>
        importRuntimeConfig({
          NODE_ENV: 'development',
          EXPO_PUBLIC_ENV: 'development',
          EXPO_PUBLIC_USE_MOCK: 'true',
          EXPO_PUBLIC_PRE_API_LIVE_MODE: 'true',
        }),
      /EXPO_PUBLIC_PRE_API_LIVE_MODE=true is no longer supported/,
    );
  });

  it('does not expose pre-API live compatibility config or storage keys', () => {
    const configSource = fs.readFileSync(path.join(repoRoot, 'constants/config.ts'), 'utf8');
    const storageSource = fs.readFileSync(path.join(repoRoot, 'constants/storage-keys.ts'), 'utf8');
    const envExample = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');

    assert.equal(configSource.includes('export const preApiLive'), false);
    assert.equal(configSource.includes('PRE_API_LIVE_SEED_ON_AUTH'), false);
    assert.equal(configSource.includes('PRE_API_LIVE_PULSE_INTERVAL_MS'), false);
    assert.equal(envExample.includes('PRE_API_LIVE_MODE'), false);
    assert.equal(envExample.includes('PRE_API_LIVE_SEED_ON_AUTH'), false);
    assert.equal(envExample.includes('PRE_API_LIVE_PULSE_INTERVAL_MS'), false);
    assert.equal(envExample.includes('ENABLE_RELATIONAL_DEMO_SEED'), false);
    assert.equal(storageSource.includes('PRE_API_LIVE_LAST'), false);
    assert.equal(storageSource.includes('pre_api_live'), false);
  });

  it('does not default frontend auth metadata to mock', () => {
    const configSource = fs.readFileSync(path.join(repoRoot, 'constants/config.ts'), 'utf8');
    const envExample = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');

    assert.equal(configSource.includes("getEnv('AUTH_PROVIDER', 'mock')"), false);
    assert.equal(envExample.includes('EXPO_PUBLIC_AUTH_PROVIDER=mock'), false);
    assert.ok(configSource.includes("getEnv('AUTH_PROVIDER', 'api')"));
    assert.ok(envExample.includes('EXPO_PUBLIC_AUTH_PROVIDER=api'));
  });
});
