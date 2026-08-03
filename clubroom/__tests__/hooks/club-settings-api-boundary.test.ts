import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('club settings derives API-mode permissions from club authority only', () => {
  const source = readSource('hooks/use-club-settings.ts');
  const knownClubsStart = source.indexOf('const knownClubs = (() => {');
  const knownClubsEnd = source.indexOf('const clubId = paramClubId || userClubs[0]?.id;');
  const loadStart = source.indexOf('const loadData = async');
  const requestedClubStart = source.indexOf('const requestedClubId = clubId;', loadStart);
  const mockBranchStart = source.indexOf('if (api.useMock) {', knownClubsEnd);
  const apiBranchStart = source.indexOf('} else {', mockBranchStart);
  const memberLoadStart = source.indexOf('const [squadData, memberData, brandingData, inviteData]', apiBranchStart);

  assert.ok(knownClubsStart >= 0, 'test should find known-club derivation');
  assert.ok(knownClubsEnd > knownClubsStart, 'test should find known-club boundary');
  assert.ok(loadStart > knownClubsEnd, 'test should find settings data loader');
  assert.ok(requestedClubStart > loadStart, 'test should find requested club id resolution');
  assert.ok(mockBranchStart > knownClubsEnd, 'test should find mock load branch');
  assert.ok(apiBranchStart > mockBranchStart, 'test should find API load branch');
  assert.ok(memberLoadStart > apiBranchStart, 'test should find API load boundary');

  const knownClubsBlock = source.slice(knownClubsStart, knownClubsEnd);
  const loadPrelude = source.slice(loadStart, requestedClubStart);
  const mockBranch = source.slice(mockBranchStart, apiBranchStart);
  const apiBranch = source.slice(apiBranchStart, memberLoadStart);

  assert.match(
    source,
    /const userClubs =\s+api\.useMock && currentUser\?\.id \? socialFeedService\.getUserClubs\(currentUser\.id\) : \[\];/,
    'top-level local club derivation should be mock-only',
  );
  assert.ok(
    knownClubsBlock.includes('if (!api.useMock) {\n      return [];\n    }'),
    'knownClubs should return before local social-feed reads in API mode',
  );
  assert.equal(
    loadPrelude.includes('if (!clubId)'),
    false,
    'API mode should not return empty before asking club authority for a default club',
  );
  assert.match(
    mockBranch,
    /socialFeedService\s*\.\s*getClub\(requestedClubId\)/,
    'mock mode may keep local club fallback',
  );
  assert.match(
    mockBranch,
    /socialFeedService\s*\.\s*getMembership\(currentUser\.id, requestedClubId\)/,
    'mock mode may keep local membership fallback',
  );
  assert.ok(
    apiBranch.includes('const authorityClubs = await clubAuthorityService.listClubs();'),
    'API mode should load club and viewer membership through /v1 club authority',
  );
  assert.ok(
    apiBranch.includes(': (authorityClubs.data.clubs[0] ?? null);'),
    'API mode should use the first live authority club when no route club id was requested',
  );
  assert.equal(
    apiBranch.includes('socialFeedService'),
    false,
    'API mode must not read local social-feed club or membership mirrors',
  );
  assert.ok(
    source.includes('const resolvedClubId = clubData?.id;') &&
      source.includes('squadService.getSquads(resolvedClubId)') &&
      source.includes('clubAuthorityService.listInviteCodes(resolvedClubId)'),
    'settings subreads should use the resolved live club id',
  );
  assert.ok(
    source.includes('if (!inviteData.success) {\n        return err(inviteData.error);\n      }'),
    'manager invite-code API failures should surface instead of rendering empty local-looking state',
  );
  assert.ok(
    source.includes(
      'const canLoadManagerData = canManageClubMembers(membership?.role);',
    ) &&
      source.includes(
        'canLoadManagerData ? squadService.getSquads(resolvedClubId) : Promise.resolve([])',
      ) &&
      source.includes(
        'canLoadManagerData ? clubService.getMembers(resolvedClubId) : Promise.resolve([])',
      ) &&
      source.includes(
        'canLoadManagerData\n          ? clubAuthorityService.listInviteCodes(resolvedClubId)\n          : Promise.resolve(ok([]))',
      ),
    'read-only settings must not request manager-only datasets',
  );
  assert.ok(
    source.includes('const canManageClub = canManageClubMembers(membership?.role);'),
    'settings controls should derive permissions from loaded membership data',
  );
  assert.ok(
    source.includes('const activeClubId = club?.id ?? clubId;') &&
      source.includes('clubId: activeClubId,'),
    'settings actions should use the club id resolved from authority data',
  );
});

test('club settings exposes only supported invite-code roles and revoke semantics', () => {
  const section = readSource('components/club/settings-invites-section.tsx');
  const hook = readSource('hooks/use-club-settings.ts');

  assert.ok(
    section.includes(
      "(role) => role === 'MEMBER' || role === 'COACH' || role === 'ADMIN'",
    ),
    'invite-code actions should match the strict backend role contract',
  );
  assert.ok(
    section.includes('accessibilityLabel={`Revoke ${roleLabel} invite code`}') &&
      section.includes('name="remove-circle-outline"'),
    'soft revocation should be clear without exposing the raw code in accessibility telemetry',
  );
  assert.ok(
    section.includes('numberOfLines={1}') &&
      section.includes('adjustsFontSizeToFit') &&
      section.includes('minHeight: 48') &&
      section.includes('Create {ORGANIZATION_ROLE_LABELS[role].toLowerCase()} code'),
    'mobile invite rows should keep codes and actions legible without overflowing',
  );
  assert.ok(
    hook.includes("uiFeedback.alert('Revoke invite code?'") &&
      hook.includes("showToast('Invite code revoked', 'success')") &&
      hook.includes("logger.action('RevokeInviteCode'"),
    'confirmation, feedback, and product logs should use revoke semantics',
  );
});

test('club settings is the only invite-code management surface and keeps codes out of logs', () => {
  const hook = readSource('hooks/use-club-settings.ts');
  const service = readSource('services/club-authority-service.ts');
  const routes = readSource('navigation/routes.ts');
  const routeAccess = readSource('constants/route-access.ts');
  const manifest = readSource('navigation/loading-route-manifest.js');
  const demoEntries = readSource('utils/demo-role-entry.ts');
  const login = readSource('components/auth/login-screen.tsx');
  const auth = readSource('hooks/use-auth.tsx');

  for (const legacyPath of [
    'app/(tabs)/admin/invite-codes.tsx',
    'hooks/use-invite-codes.ts',
    'components/admin/invite-code-card.tsx',
    'components/admin/create-code-modal.tsx',
    'constants/invite-code-seeds.ts',
    'constants/school-seeds.ts',
    'components/auth/coach-signup-screen.tsx',
    'components/auth/coach-signup-sections.tsx',
    'components/auth/coach-signup-helpers.ts',
  ]) {
    assert.equal(fs.existsSync(path.join(ROOT, legacyPath)), false, `${legacyPath} should be removed`);
  }

  assert.doesNotMatch(routes, /ADMIN_INVITE_CODES|admin\/invite-codes/);
  assert.doesNotMatch(routeAccess, /admin\/invite-codes/);
  assert.doesNotMatch(manifest, /admin\/invite-codes/);
  assert.doesNotMatch(demoEntries, /ADMIN_INVITE_CODES|admin\/invite-codes/);
  assert.doesNotMatch(login, /coach-signup|Use invite code|LazyCoachSignupScreen/);
  assert.doesNotMatch(auth, /registerCoach|CoachSignupData|schoolId|schoolName/);
  assert.ok(hook.includes('clubAuthorityService.listInviteCodes(resolvedClubId)'));
  assert.ok(hook.includes('clubAuthorityService.createInviteCode(activeClubId, role)'));
  assert.ok(hook.includes('clubAuthorityService.deleteInviteCode(activeClubId, code)'));
  assert.doesNotMatch(hook, /logger\.action\([^\n]+\{[^\n]*\bcode\b/);

  const revokeWarningStart = service.indexOf(
    "logger.warn('Invite code revoked but local invite-code refresh failed'",
  );
  const revokeWarningEnd = service.indexOf('});', revokeWarningStart);
  assert.ok(revokeWarningStart >= 0 && revokeWarningEnd > revokeWarningStart);
  assert.doesNotMatch(service.slice(revokeWarningStart, revokeWarningEnd), /\n\s*code\s*[,}]/);
});

test('club settings read-only CTA avoids legacy Club Hub in API mode', () => {
  const source = readSource('app/club/settings.tsx');
  const ctaStart = source.indexOf('router.push(');
  const ctaBlock = source.slice(ctaStart, source.indexOf('<Row align="center"', ctaStart));

  assert.ok(ctaStart >= 0, 'test should find read-only CTA route');
  assert.ok(
    source.includes("import { api } from '@/constants/config';") &&
      source.includes('const MOCK_API_MODE = api.useMock;'),
    'settings screen should branch on runtime mode',
  );
  assert.ok(
    ctaBlock.includes('MOCK_API_MODE'),
    'legacy Club Hub should only be reachable from this CTA in mock mode',
  );
  assert.ok(
    ctaBlock.includes('Routes.MY_CLUBS'),
    'API mode should send users to the backend-owned My Clubs surface',
  );
});

test('club settings removes edit controls for read-only viewers', () => {
  const screen = readSource('app/club/settings.tsx');
  const details = readSource('components/club/settings-details-section.tsx');

  assert.ok(
    screen.includes('canEdit={canManageClub}'),
    'the loaded membership capability should control the details form',
  );
  assert.ok(
    details.includes('canEdit: boolean;') &&
      details.includes('{canEdit ? (') &&
      details.includes("{value.trim() || 'Not set'}"),
    'read-only viewers should receive plain values instead of text inputs',
  );
  assert.ok(
    details.includes('Save changes') && details.includes(') : null}'),
    'the save action should only render in the editable branch',
  );
});
