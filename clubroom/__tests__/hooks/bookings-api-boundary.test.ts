import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('bookings screen surfaces live group-session and invite read failures in API mode', () => {
  const source = readSource('hooks/use-bookings.ts');
  const groupSessionsStart = source.indexOf('const groupSessionsPromise = (');
  const groupRegistrationsStart = source.indexOf(
    'const groupRegistrationsPromise = sessionRegistrationService',
    groupSessionsStart,
  );
  const pendingInvitesStart = source.indexOf('let pendingInvitesList: SessionInvite[] = [];');
  const loadCompleteStart = source.indexOf("logger.debug('Load cycle complete'", pendingInvitesStart);

  assert.ok(groupSessionsStart >= 0, 'test should find group-session loader');
  assert.ok(groupRegistrationsStart > groupSessionsStart, 'test should find registration loader');
  assert.ok(pendingInvitesStart > groupRegistrationsStart, 'test should find pending invites loader');
  assert.ok(loadCompleteStart > pendingInvitesStart, 'test should find load completion boundary');

  const groupSessionsBlock = source.slice(groupSessionsStart, groupRegistrationsStart);
  const groupRegistrationsBlock = source.slice(groupRegistrationsStart, pendingInvitesStart);
  const pendingInvitesBlock = source.slice(pendingInvitesStart, loadCompleteStart);

  assert.ok(
    groupSessionsBlock.includes('if (!apiClient.isMockMode) {\n          throw sessionError;\n        }'),
    'API mode must surface group-session offering read failures',
  );
  assert.ok(
    groupRegistrationsBlock.includes(
      'if (!apiClient.isMockMode) {\n            throw registrationError;\n          }',
    ),
    'API mode must surface group-session registration read failures',
  );
  assert.ok(
    pendingInvitesBlock.includes('if (!apiClient.isMockMode) {\n            throw inviteErr;\n          }'),
    'API mode must surface pending invite read failures',
  );
  assert.ok(
    groupSessionsBlock.includes('return [];') &&
      groupRegistrationsBlock.includes('return [];'),
    'mock mode may still keep empty optional booking panels',
  );
});

test('bookings discover surfaces live pending-invite read failures in API mode', () => {
  const source = readSource('hooks/use-bookings-discover.ts');
  const loadStart = source.indexOf('const loadData = useCallback(async () => {');
  const pendingInvitesStart = source.indexOf('// --- Pending invites ---', loadStart);
  const scopedChildrenStart = source.indexOf(
    'const scopedChildren = contextChildren.filter',
    pendingInvitesStart,
  );

  assert.ok(loadStart >= 0, 'test should find discover loader');
  assert.ok(pendingInvitesStart > loadStart, 'test should find pending invite block');
  assert.ok(scopedChildrenStart > pendingInvitesStart, 'test should find pending invite boundary');

  const pendingInvitesBlock = source.slice(pendingInvitesStart, scopedChildrenStart);

  assert.ok(
    source.includes("import { apiClient } from '@/services/api-client';"),
    'discover bookings should branch on runtime mode before swallowing invite failures',
  );
  assert.ok(
    pendingInvitesBlock.includes('if (!apiClient.isMockMode) {\n            throw e;\n          }'),
    'API mode must surface pending invite read failures in discover bookings',
  );
});
