import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('useInviteCodes blocks global local invite codes in API mode', () => {
  const source = readSource('hooks/use-invite-codes.ts');

  const loadStart = source.indexOf('const loadCodes = async () => {');
  const loadGuard = source.indexOf('if (!apiClient.isMockMode)', loadStart);
  const localRead = source.indexOf('apiClient.get<InviteCode[]>', loadStart);
  assert.ok(loadStart >= 0, 'test should find loadCodes');
  assert.ok(loadGuard >= 0, 'load path must guard API mode');
  assert.ok(localRead >= 0, 'test should find local invite-code read');
  assert.ok(loadGuard < localRead, 'load path must reject API mode before local reads');

  const createStart = source.indexOf('const generateCode = () => {');
  const createGuard = source.indexOf('if (!apiClient.isMockMode)', createStart);
  const localCreateWrite = source.indexOf('apiClient.set(INVITE_CODES_STORAGE_KEY', createStart);
  assert.ok(createStart >= 0, 'test should find generateCode');
  assert.ok(createGuard >= 0, 'create path must guard API mode');
  assert.ok(createGuard < localCreateWrite, 'create path must reject API mode before local writes');

  const deactivateStart = source.indexOf('const deactivateCode = (codeId: string) => {');
  const deactivateGuard = source.indexOf('if (!apiClient.isMockMode)', deactivateStart);
  const localDeactivateWrite = source.indexOf(
    'apiClient.set(INVITE_CODES_STORAGE_KEY',
    deactivateStart,
  );
  assert.ok(deactivateStart >= 0, 'test should find deactivateCode');
  assert.ok(deactivateGuard >= 0, 'deactivate path must guard API mode');
  assert.ok(
    deactivateGuard < localDeactivateWrite,
    'deactivate path must reject API mode before local writes',
  );

  assert.match(source, /\/v1\/clubs\/:clubId\/invite-codes/);
});
