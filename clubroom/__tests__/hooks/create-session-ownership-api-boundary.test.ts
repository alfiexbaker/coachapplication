import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('create session wizard fails closed on club and staff ownership authority failures', () => {
  const source = readSource('hooks/use-create-session.ts');

  assert.ok(source.includes('clubOptionsError: string | null;'));
  assert.ok(source.includes('assigneeOptionsError: string | null;'));

  const clubFailureStart = source.indexOf('if (!academyResult.success)');
  const clubFailureEnd = source.indexOf('const nextOptions = academyResult.data.flatMap', clubFailureStart);
  const clubFailureBlock = source.slice(clubFailureStart, clubFailureEnd);

  assert.ok(clubFailureStart >= 0, 'test should find club permissions failure branch');
  assert.ok(clubFailureBlock.includes('setClubOptions([]);'));
  assert.ok(clubFailureBlock.includes('setSelectedClubIdState(null);'));
  assert.ok(
    clubFailureBlock.includes(
      "apiClient.isMockMode ? null : 'Failed to load club session permissions. Please retry.'",
    ),
  );

  const staffFailureStart = source.indexOf('if (!staffResult.success)');
  const staffFailureEnd = source.indexOf('const staff = staffResult.data.filter', staffFailureStart);
  const staffFailureBlock = source.slice(staffFailureStart, staffFailureEnd);

  assert.ok(staffFailureStart >= 0, 'test should find club staff failure branch');
  assert.ok(staffFailureBlock.includes('setAssigneeOptions([]);'));
  assert.ok(staffFailureBlock.includes('setSelectedAssigneeIdState(null);'));
  assert.ok(
    staffFailureBlock.includes(
      "apiClient.isMockMode ? null : 'Failed to load club staff. Please retry.'",
    ),
  );

  const staffNameGuardStart = source.indexOf('!apiClient.isMockMode', staffFailureEnd);
  const staffNameGuardEnd = source.indexOf('const mapped = staff', staffNameGuardStart);
  const staffNameGuardBlock = source.slice(staffNameGuardStart, staffNameGuardEnd);

  assert.ok(staffNameGuardStart >= 0, 'test should find live staff name guard');
  assert.ok(staffNameGuardBlock.includes('!usersResult.success'));
  assert.ok(staffNameGuardBlock.includes('staff.some((member) => !labelById.get(member.userId)?.trim())'));
  assert.ok(staffNameGuardBlock.includes('setSelectedAssigneeIdState(null);'));
  assert.ok(
    staffNameGuardBlock.includes("setAssigneeOptionsError('Failed to load club staff names. Please retry.')"),
  );

  const ownershipFallbackStart = source.indexOf('if (!clubOptionsLoaded)');
  const ownershipFallbackEnd = source.indexOf('if (!selectedClubOption', ownershipFallbackStart);
  const ownershipFallbackBlock = source.slice(ownershipFallbackStart, ownershipFallbackEnd);

  assert.ok(
    ownershipFallbackBlock.includes('if (clubOptionsError)') &&
      ownershipFallbackBlock.includes('return;'),
    'club authority failures must not silently switch club-owned creates back to self-owned',
  );

  const submitStart = source.indexOf("if (resolvedActingAs === 'club')");
  const submitEnd = source.indexOf('if (!ownerCoachId)', submitStart);
  const submitBlock = source.slice(submitStart, submitEnd);

  assert.ok(submitBlock.includes('if (clubOptionsError || assigneeOptionsError)'));
  assert.ok(submitBlock.includes("setValidationMessage('Choose a coach loaded from club staff authority.')"));
});

test('existing-session invite flow requires live club staff ownership before sending', () => {
  const source = readSource('app/sessions/create.tsx');

  assert.ok(source.includes("import { api } from '@/constants/config';"));
  assert.ok(source.includes('const ownershipLoadError = clubLoadError ?? assigneeLoadError;'));

  const canSendStart = source.indexOf('const canSend =');
  const canSendEnd = source.indexOf('useEffect(() => {', canSendStart);
  const canSendBlock = source.slice(canSendStart, canSendEnd);

  assert.ok(canSendBlock.includes('selectedAssignee !== null'));
  assert.ok(canSendBlock.includes('!ownershipLoadError'));
  assert.ok(
    source.includes('if (assigneeLoadError) {\n      return;\n    }'),
    'staff authority errors should keep cleared assignee ids cleared',
  );
  assert.ok(source.includes('[assigneeCoachId, assigneeLoadError, currentUser?.id, postingAs]'));

  assert.ok(
    source.includes("api.useMock ? null : 'Failed to load club invite permissions. Please retry.'"),
  );

  const staffFailureStart = source.indexOf('if (!staffResult.success)');
  const staffFailureEnd = source.indexOf('const staff = staffResult.data.filter', staffFailureStart);
  const staffFailureBlock = source.slice(staffFailureStart, staffFailureEnd);

  assert.ok(staffFailureStart >= 0, 'test should find existing invite staff failure branch');
  assert.ok(staffFailureBlock.includes('setAssigneeOptions([]);'));
  assert.ok(staffFailureBlock.includes('setAssigneeCoachId(null);'));
  assert.ok(
    staffFailureBlock.includes("api.useMock ? null : 'Failed to load club staff. Please retry.'"),
  );

  const staffNameGuardStart = source.indexOf('!api.useMock', staffFailureEnd);
  const staffNameGuardEnd = source.indexOf('const options = staff', staffNameGuardStart);
  const staffNameGuardBlock = source.slice(staffNameGuardStart, staffNameGuardEnd);

  assert.ok(staffNameGuardStart >= 0, 'test should find existing invite live staff name guard');
  assert.ok(staffNameGuardBlock.includes('!usersResult.success'));
  assert.ok(staffNameGuardBlock.includes('staff.some((member) => !nameById.get(member.userId)?.trim())'));
  assert.ok(staffNameGuardBlock.includes('setAssigneeCoachId(null);'));
  assert.ok(
    staffNameGuardBlock.includes("setAssigneeLoadError('Failed to load club staff names. Please retry.')"),
  );

  const userLookupStart = source.indexOf(
    'const usersResult = await userService.getUsersByIds(ids);',
    staffFailureEnd,
  );
  const postLookupActiveGuard = source.indexOf('if (!active) return;', userLookupStart);
  const nameMapStart = source.indexOf(
    'const nameById = new Map<string, string>();',
    userLookupStart,
  );

  assert.ok(userLookupStart >= 0, 'test should find the assignee name lookup');
  assert.ok(
    postLookupActiveGuard > userLookupStart && postLookupActiveGuard < nameMapStart,
    'obsolete assignee name lookups must stop before updating owner state',
  );

  const submitStart = source.indexOf('const handleSubmit = async () => {');
  const submitEnd = source.indexOf('setSubmitting(true);', submitStart);
  const submitBlock = source.slice(submitStart, submitEnd);

  assert.ok(submitBlock.includes("uiFeedback.showToast(ownershipLoadError, 'error')"));
  assert.ok(submitBlock.includes("uiFeedback.showToast('Choose a coach loaded from club staff authority.', 'error')"));
  assert.ok(source.includes('<StatusBanner variant="error" message={ownershipLoadError} />'));
});
