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
  const mockBranchStart = source.indexOf('if (api.useMock) {', knownClubsEnd);
  const apiBranchStart = source.indexOf('} else {', mockBranchStart);
  const memberLoadStart = source.indexOf('const [squadData, memberData, brandingData, inviteData]', apiBranchStart);

  assert.ok(knownClubsStart >= 0, 'test should find known-club derivation');
  assert.ok(knownClubsEnd > knownClubsStart, 'test should find known-club boundary');
  assert.ok(mockBranchStart > knownClubsEnd, 'test should find mock load branch');
  assert.ok(apiBranchStart > mockBranchStart, 'test should find API load branch');
  assert.ok(memberLoadStart > apiBranchStart, 'test should find API load boundary');

  const knownClubsBlock = source.slice(knownClubsStart, knownClubsEnd);
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
  assert.match(
    mockBranch,
    /socialFeedService\s*\.\s*getClub\(clubId\)/,
    'mock mode may keep local club fallback',
  );
  assert.match(
    mockBranch,
    /socialFeedService\s*\.\s*getMembership\(currentUser\.id, clubId\)/,
    'mock mode may keep local membership fallback',
  );
  assert.ok(
    apiBranch.includes('const authorityClubs = await clubAuthorityService.listClubs();'),
    'API mode should load club and viewer membership through /v1 club authority',
  );
  assert.equal(
    apiBranch.includes('socialFeedService'),
    false,
    'API mode must not read local social-feed club or membership mirrors',
  );
  assert.ok(
    source.includes('if (!inviteData.success) {\n        return err(inviteData.error);\n      }'),
    'invite-code API failures should surface instead of rendering empty local-looking state',
  );
  assert.ok(
    source.includes('const canManageClub = canManageClubMembers(membership?.role);'),
    'settings controls should derive permissions from loaded membership data',
  );
});

test('club settings read-only CTA avoids legacy Club Hub in API mode', () => {
  const source = readSource('app/club/settings.tsx');
  const ctaStart = source.indexOf('router.push(');
  const ctaBlock = source.slice(ctaStart, source.indexOf('<Row align="center"', ctaStart));

  assert.ok(ctaStart >= 0, 'test should find read-only CTA route');
  assert.ok(
    source.includes("import { api } from '@/constants/config';"),
    'settings screen should branch on runtime mode',
  );
  assert.ok(
    ctaBlock.includes('api.useMock'),
    'legacy Club Hub should only be reachable from this CTA in mock mode',
  );
  assert.ok(
    ctaBlock.includes('Routes.MY_CLUBS'),
    'API mode should send users to the backend-owned My Clubs surface',
  );
});
