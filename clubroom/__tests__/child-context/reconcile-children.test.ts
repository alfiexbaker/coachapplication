/**
 * Tests for reconcileChildren() and getInitials() pure functions
 * from hooks/use-child-context.tsx
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { attachMembershipData, reconcileChildren, getInitials } from '../../hooks/use-child-context';
import type { ChildReference } from '../../constants/user-types';
import type { ChildProfile } from '../../services/child-service';
import type { ClubSquad, SquadMember } from '../../constants/types';
import { CHILD_COLORS } from '../../types/child-context';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRef(overrides: Partial<ChildReference> & { childId: string; childName: string }): ChildReference {
  return {
    relationshipType: 'PARENT_CHILD',
    addedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<ChildProfile> & { id: string; firstName: string; lastName: string }): ChildProfile {
  return {
    parentId: 'parent-1',
    gender: 'MALE',
    relationship: 'SON',
    disabilities: [],
    specialNeeds: [],
    hasSpecialNeeds: false,
    allergies: [],
    medicalConditions: [],
    medications: [],
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '+44 7700 000000',
    emergencyContactRelation: 'Mother',
    photoConsent: true,
    videoConsent: true,
    socialMediaConsent: false,
    emergencyTreatmentConsent: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSquad(overrides: Partial<ClubSquad> & { id: string; clubId: string }): ClubSquad {
  return {
    name: 'Test Squad',
    level: 'U14',
    memberCount: 1,
    primaryCoach: 'coach-1',
    meetLocation: 'Pitch 1',
    ...overrides,
  };
}

function makeSquadMember(
  overrides: Partial<SquadMember> & { id: string; squadId: string; athleteId: string },
): SquadMember {
  return {
    parentId: 'parent-1',
    status: 'ACTIVE',
    joinedAt: '2024-01-01',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getInitials()
// ---------------------------------------------------------------------------

describe('getInitials', () => {
  test('returns two-letter initials for two-part name', () => {
    assert.equal(getInitials('Tom Henderson'), 'TH');
  });

  test('returns two-letter initials for three-part name (first + last)', () => {
    assert.equal(getInitials('Anna Marie Smith'), 'AS');
  });

  test('returns single letter for single-word name', () => {
    assert.equal(getInitials('Zara'), 'Z');
  });

  test('returns ? for empty string', () => {
    assert.equal(getInitials(''), '?');
  });

  test('returns ? for whitespace-only string', () => {
    assert.equal(getInitials('   '), '?');
  });

  test('is case-insensitive (uppercases output)', () => {
    assert.equal(getInitials('jake henderson'), 'JH');
  });

  test('handles extra whitespace between parts', () => {
    assert.equal(getInitials('  Tom   Henderson  '), 'TH');
  });
});

// ---------------------------------------------------------------------------
// reconcileChildren() — exact full-name match
// ---------------------------------------------------------------------------

describe('reconcileChildren', () => {
  describe('exact full-name matching', () => {
    test('matches ref to profile by ID when IDs align', () => {
      const refs = [makeRef({ childId: 'user1', childName: 'Tom Henderson' })];
      const profiles = [makeProfile({ id: 'user1', firstName: 'Tom', lastName: 'Henderson' })];

      const result = reconcileChildren(refs, profiles);

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'user1');
      assert.equal(result[0].profileId, 'user1');
    });

    test('matches ref to profile by full name (case-insensitive)', () => {
      const refs = [makeRef({ childId: 'user1', childName: 'Tom Henderson' })];
      const profiles = [makeProfile({ id: 'child-2', firstName: 'Tom', lastName: 'Henderson' })];

      const result = reconcileChildren(refs, profiles);

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'user1');
      assert.equal(result[0].referenceId, 'user1');
      assert.equal(result[0].profileId, 'child-2');
      assert.equal(result[0].fullName, 'Tom Henderson');
    });

    test('uses profile nickname as display name when available', () => {
      const refs = [makeRef({ childId: 'user1', childName: 'Jake Henderson' })];
      const profiles = [makeProfile({ id: 'child-1', firstName: 'Jake', lastName: 'Henderson', nickname: 'JT' })];

      const result = reconcileChildren(refs, profiles);

      assert.equal(result[0].name, 'JT');
    });

    test('falls back to firstName when no nickname', () => {
      const refs = [makeRef({ childId: 'user1', childName: 'Tom Henderson' })];
      const profiles = [makeProfile({ id: 'child-2', firstName: 'Tom', lastName: 'Henderson' })];

      const result = reconcileChildren(refs, profiles);

      assert.equal(result[0].name, 'Tom');
    });
  });

  // ---------------------------------------------------------------------------
  // First-name fallback
  // ---------------------------------------------------------------------------

  describe('first-name fallback matching', () => {
    test('matches by first name when full name does not match', () => {
      // Ref has "Tom H" but profile has "Tom Henderson"
      const refs = [makeRef({ childId: 'user1', childName: 'Tom H' })];
      const profiles = [makeProfile({ id: 'child-2', firstName: 'Tom', lastName: 'Henderson' })];

      const result = reconcileChildren(refs, profiles);

      assert.equal(result[0].profileId, 'child-2');
    });

    test('does NOT first-name-match when multiple profiles share same first name', () => {
      const refs = [makeRef({ childId: 'user1', childName: 'Tom X' })];
      const profiles = [
        makeProfile({ id: 'child-a', firstName: 'Tom', lastName: 'Alpha' }),
        makeProfile({ id: 'child-b', firstName: 'Tom', lastName: 'Beta' }),
      ];

      const result = reconcileChildren(refs, profiles);

      // First-name map only stores the first profile with that name; second is skipped.
      // "Tom X" doesn't match either full name, so first-name fallback picks child-a.
      assert.equal(result[0].profileId, 'child-a');
    });
  });

  // ---------------------------------------------------------------------------
  // Degraded mode (no profiles)
  // ---------------------------------------------------------------------------

  describe('degraded mode (no profiles)', () => {
    test('builds ChildInfo from ref alone when no profiles exist', () => {
      const refs = [makeRef({ childId: 'user1', childName: 'Tom Henderson' })];

      const result = reconcileChildren(refs, []);

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'user1');
      assert.equal(result[0].referenceId, 'user1');
      assert.equal(result[0].profileId, null);
      assert.equal(result[0].name, 'Tom');
      assert.equal(result[0].fullName, 'Tom Henderson');
      assert.equal(result[0].initials, 'TH');
      assert.equal(result[0].avatarUrl, null);
      assert.equal(result[0].age, null);
      assert.equal(result[0].dateOfBirth, null);
      assert.equal(result[0].hasSpecialNeeds, false);
      assert.equal(result[0].profile, null);
      assert.deepEqual(result[0].squadIds, []);
      assert.deepEqual(result[0].clubIds, []);
    });

    test('uses first word of childName as display name in degraded mode', () => {
      const refs = [makeRef({ childId: 'u1', childName: 'Lily Henderson' })];

      const result = reconcileChildren(refs, []);

      assert.equal(result[0].name, 'Lily');
    });
  });

  // ---------------------------------------------------------------------------
  // Color coding
  // ---------------------------------------------------------------------------

  describe('color coding', () => {
    test('assigns colors by index from CHILD_COLORS', () => {
      const refs = [
        makeRef({ childId: 'u1', childName: 'A Child' }),
        makeRef({ childId: 'u2', childName: 'B Child' }),
        makeRef({ childId: 'u3', childName: 'C Child' }),
      ];

      const result = reconcileChildren(refs, []);

      assert.equal(result[0].colorCode, CHILD_COLORS[0]);
      assert.equal(result[1].colorCode, CHILD_COLORS[1]);
      assert.equal(result[2].colorCode, CHILD_COLORS[2]);
    });

    test('wraps around when more children than colors', () => {
      const refs = Array.from({ length: CHILD_COLORS.length + 1 }, (_, i) =>
        makeRef({ childId: `u${i}`, childName: `Child ${i}` }),
      );

      const result = reconcileChildren(refs, []);

      assert.equal(result[CHILD_COLORS.length].colorCode, CHILD_COLORS[0]);
    });
  });

  // ---------------------------------------------------------------------------
  // Profile data propagation
  // ---------------------------------------------------------------------------

  describe('profile data propagation', () => {
    test('populates avatarUrl from profile photoUrl', () => {
      const refs = [makeRef({ childId: 'u1', childName: 'Tom Henderson' })];
      const profiles = [makeProfile({ id: 'c1', firstName: 'Tom', lastName: 'Henderson', photoUrl: 'https://img.test/tom.jpg' })];

      const result = reconcileChildren(refs, profiles);

      assert.equal(result[0].avatarUrl, 'https://img.test/tom.jpg');
    });

    test('populates hasSpecialNeeds from profile', () => {
      const refs = [makeRef({ childId: 'u1', childName: 'Jake Henderson' })];
      const profiles = [makeProfile({ id: 'c1', firstName: 'Jake', lastName: 'Henderson', hasSpecialNeeds: true })];

      const result = reconcileChildren(refs, profiles);

      assert.equal(result[0].hasSpecialNeeds, true);
    });

    test('attaches full profile object', () => {
      const refs = [makeRef({ childId: 'u1', childName: 'Tom Henderson' })];
      const profile = makeProfile({ id: 'c1', firstName: 'Tom', lastName: 'Henderson' });

      const result = reconcileChildren(refs, [profile]);

      assert.equal(result[0].profile, profile);
    });

    test('populates dateOfBirth from profile', () => {
      const refs = [makeRef({ childId: 'u1', childName: 'Tom Henderson' })];
      const profiles = [makeProfile({ id: 'c1', firstName: 'Tom', lastName: 'Henderson', dateOfBirth: '2012-03-15' })];

      const result = reconcileChildren(refs, profiles);

      assert.equal(result[0].dateOfBirth, '2012-03-15');
      assert.equal(typeof result[0].age, 'number');
      assert.ok(result[0].age! > 0);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    test('returns empty array for empty refs and empty profiles', () => {
      assert.deepEqual(reconcileChildren([], []), []);
    });

    test('includes unmatched profiles so profile-only children still appear', () => {
      const refs = [makeRef({ childId: 'u1', childName: 'Tom Henderson' })];
      const profiles = [
        makeProfile({ id: 'c1', firstName: 'Tom', lastName: 'Henderson' }),
        makeProfile({ id: 'c99', firstName: 'Unknown', lastName: 'Person' }),
      ];

      const result = reconcileChildren(refs, profiles);

      assert.equal(result.length, 2);
      assert.equal(result[0].id, 'u1');
      assert.equal(result[1].id, 'c99');
      assert.equal(result[1].referenceId, 'c99');
      assert.equal(result[1].profileId, 'c99');
    });

    test('builds children from profiles when refs are empty', () => {
      const profiles = [makeProfile({ id: 'c1', firstName: 'Maya', lastName: 'Patel' })];
      const result = reconcileChildren([], profiles);

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'c1');
      assert.equal(result[0].name, 'Maya');
      assert.equal(result[0].fullName, 'Maya Patel');
    });

    test('multiple refs each match distinct profiles', () => {
      const refs = [
        makeRef({ childId: 'u1', childName: 'Tom Henderson' }),
        makeRef({ childId: 'u2', childName: 'Lily Henderson' }),
      ];
      const profiles = [
        makeProfile({ id: 'c1', firstName: 'Tom', lastName: 'Henderson' }),
        makeProfile({ id: 'c2', firstName: 'Lily', lastName: 'Henderson' }),
      ];

      const result = reconcileChildren(refs, profiles);

      assert.equal(result.length, 2);
      assert.equal(result[0].profileId, 'c1');
      assert.equal(result[1].profileId, 'c2');
    });
  });

  describe('membership linking', () => {
    test('attaches squadIds and clubIds to matched children', () => {
      const refs = [makeRef({ childId: 'user1', childName: 'Tom Henderson' })];
      const profiles = [makeProfile({ id: 'user1', firstName: 'Tom', lastName: 'Henderson' })];
      const squads = [makeSquad({ id: 'squad-1', clubId: 'club-1' })];
      const squadMembers = [makeSquadMember({ id: 'member-1', squadId: 'squad-1', athleteId: 'user1' })];

      const reconciled = reconcileChildren(refs, profiles);
      const result = attachMembershipData(reconciled, squads, squadMembers);

      assert.deepEqual(result[0].squadIds, ['squad-1']);
      assert.deepEqual(result[0].clubIds, ['club-1']);
    });

    test('leaves children unchanged when there is no membership match', () => {
      const refs = [makeRef({ childId: 'user1', childName: 'Tom Henderson' })];
      const profiles = [makeProfile({ id: 'user1', firstName: 'Tom', lastName: 'Henderson' })];
      const squads = [makeSquad({ id: 'squad-1', clubId: 'club-1' })];
      const squadMembers = [makeSquadMember({ id: 'member-1', squadId: 'squad-1', athleteId: 'other-user' })];

      const reconciled = reconcileChildren(refs, profiles);
      const result = attachMembershipData(reconciled, squads, squadMembers);

      assert.deepEqual(result[0].squadIds, []);
      assert.deepEqual(result[0].clubIds, []);
    });
  });
});
