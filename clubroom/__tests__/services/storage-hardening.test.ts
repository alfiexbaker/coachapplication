import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { describe, beforeEach } from 'node:test';

import { STORAGE_KEYS } from '../../constants/storage-keys';
import { apiClient } from '../../services/api-client';
import { authService, type AuthTokens } from '../../services/auth-service';

const ROOT = process.cwd();
const SOURCE_ROOTS = ['app', 'components', 'hooks', 'services', 'utils'];

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readSourceFiles(relativeDir: string): Array<{ path: string; source: string }> {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    const absolutePath = path.join(ROOT, relativePath);

    if (entry.isDirectory()) {
      return readSourceFiles(relativePath);
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) {
      return [];
    }

    return [{ path: relativePath, source: fs.readFileSync(absolutePath, 'utf8') }];
  });
}

describe('storage hardening', () => {
  beforeEach(async () => {
    await authService.logout();
  });

  test('auth tokens do not round-trip through generic local storage', async () => {
    const tokens: AuthTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 60_000,
    };

    await authService.storeTokens(tokens);

    assert.deepEqual(await authService.getTokens(), tokens);
    assert.equal(await apiClient.get<AuthTokens | null>(STORAGE_KEYS.AUTH_TOKENS, null), null);
    assert.equal(await apiClient.get<string | null>(STORAGE_KEYS.AUTH_TOKEN, null), null);
  });

  test('sensitive add-child drafts are not saved or restored locally', () => {
    const source = readSource('hooks/use-add-child.ts');

    assert.doesNotMatch(source, /apiClient\.set\(\s*STORAGE_KEYS\.ADD_CHILD_DRAFT/);
    assert.doesNotMatch(source, /apiClient\.get<[^>]*>\(\s*STORAGE_KEYS\.ADD_CHILD_DRAFT/);
  });

  test('club product data is not client-local authority in API mode', () => {
    const source = readSource('services/api-client.ts');
    const localKeysBlock = source.match(
      /const CLIENT_LOCAL_STORAGE_KEYS = new Set<string>\(\[([\s\S]*?)\]\);/,
    );

    assert.ok(localKeysBlock, 'expected client local storage allowlist');
    assert.equal(localKeysBlock[1]?.includes('STORAGE_KEYS.CLUBS'), false);
    assert.equal(localKeysBlock[1]?.includes('STORAGE_KEYS.CLUB_MEMBERSHIPS'), false);
    assert.equal(localKeysBlock[1]?.includes('STORAGE_KEYS.CLUB_INVITE_CODES'), false);
  });

  test('auth token keys stay out of API-mode client-local allowlist', () => {
    const source = readSource('services/api-client.ts');
    const localKeysBlock = source.match(
      /const CLIENT_LOCAL_STORAGE_KEYS = new Set<string>\(\[([\s\S]*?)\]\);/,
    );

    assert.ok(localKeysBlock, 'expected client local storage allowlist');
    assert.equal(localKeysBlock[1]?.includes('STORAGE_KEYS.AUTH_TOKEN'), false);
    assert.equal(localKeysBlock[1]?.includes('STORAGE_KEYS.AUTH_TOKENS'), false);
  });

  test('product code does not persist auth tokens through generic apiClient storage', () => {
    const forbidden = SOURCE_ROOTS.flatMap(readSourceFiles).filter(
      ({ path: sourcePath, source }) => {
        if (sourcePath === 'services/auth-token-storage.ts') {
          return false;
        }

        return /apiClient\.(get|set|remove)\(\s*STORAGE_KEYS\.AUTH_TOKENS?/.test(source);
      },
    );

    assert.deepEqual(
      forbidden.map((entry) => entry.path),
      [],
    );
  });

  test('onboarding draft persistence blanks password fields', () => {
    const source = readSource('hooks/use-onboarding.ts');

    assert.match(source, /password:\s*''/);
    assert.match(source, /confirmPassword:\s*''/);
  });

  test('API mode does not keep wizard resume drafts local', () => {
    const source = readSource('services/api-client.ts');
    const localKeysBlock = source.match(
      /const CLIENT_LOCAL_STORAGE_KEYS = new Set<string>\(\[([\s\S]*?)\]\);/,
    );
    const localPrefixesBlock = source.match(
      /const CLIENT_LOCAL_STORAGE_PREFIXES = \[([\s\S]*?)\];/,
    );

    assert.ok(localKeysBlock, 'expected client local storage allowlist');
    assert.ok(localPrefixesBlock, 'expected client local storage prefix allowlist');
    assert.equal(localKeysBlock[1]?.includes('STORAGE_KEYS.ONBOARDING_COMPLETE'), false);
    assert.equal(localKeysBlock[1]?.includes('STORAGE_KEYS.ONBOARDING_PROGRESS'), false);
    assert.equal(localKeysBlock[1]?.includes('STORAGE_KEYS.ADD_CHILD_DRAFT'), false);
    assert.equal(localPrefixesBlock[1]?.includes('STORAGE_KEYS.FORM_DRAFT_PREFIX'), false);
  });

  test('API mode does not keep local offline mutation queues', () => {
    const source = readSource('services/api-client.ts');
    const localKeysBlock = source.match(
      /const CLIENT_LOCAL_STORAGE_KEYS = new Set<string>\(\[([\s\S]*?)\]\);/,
    );

    assert.ok(localKeysBlock, 'expected client local storage allowlist');
    assert.equal(localKeysBlock[1]?.includes('STORAGE_KEYS.OFFLINE_QUEUE'), false);
  });
});
