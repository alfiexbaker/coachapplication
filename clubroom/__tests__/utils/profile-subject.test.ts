import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProfileScopePayload,
  buildProfileSubjectOptions,
  getNextProfileSubject,
  resolveProfileSubjectId,
} from '@/utils/profile-subject';

test('buildProfileSubjectOptions includes self before child options when requested', () => {
  const options = buildProfileSubjectOptions({
    currentUser: { id: 'user1', name: 'Amelia', fullName: 'Amelia Shaw' },
    children: [
      {
        id: 'child1',
        referenceId: 'child1',
        profileId: 'child1',
        name: 'CHICA',
        fullName: 'Chica Shaw',
        initials: 'CS',
        avatarUrl: null,
        age: 10,
        dateOfBirth: null,
        colorCode: '#FF0000',
        squadIds: [],
        clubIds: [],
        hasSpecialNeeds: false,
        profile: null,
      },
    ],
  });

  assert.equal(options[0]?.kind, 'self');
  assert.equal(options[0]?.id, 'user1');
  assert.equal(options[1]?.kind, 'child');
  assert.equal(options[1]?.id, 'child1');
});

test('buildProfileSubjectOptions omits self when includeSelf is false', () => {
  const options = buildProfileSubjectOptions({
    currentUser: { id: 'user1', name: 'Amelia', fullName: 'Amelia Shaw' },
    children: [
      {
        id: 'child1',
        referenceId: 'child1',
        profileId: 'child1',
        name: 'CHICA',
        fullName: 'Chica Shaw',
        initials: 'CS',
        avatarUrl: null,
        age: 10,
        dateOfBirth: null,
        colorCode: '#FF0000',
        squadIds: [],
        clubIds: [],
        hasSpecialNeeds: false,
        profile: null,
      },
    ],
    includeSelf: false,
  });

  assert.equal(options.length, 1);
  assert.equal(options[0]?.kind, 'child');
  assert.equal(options[0]?.id, 'child1');
});

test('resolveProfileSubjectId prefers explicit subject, then profile scope, then fallback', () => {
  const options = buildProfileSubjectOptions({
    currentUser: { id: 'user1', name: 'Amelia', fullName: 'Amelia Shaw' },
    children: [],
  });

  assert.equal(
    resolveProfileSubjectId({
      explicitSubjectId: 'user1',
      currentUserId: 'user1',
      profileMode: 'child',
      profileSubjectId: null,
      subjectOptions: options,
    }),
    'user1',
  );

  assert.equal(
    resolveProfileSubjectId({
      explicitSubjectId: null,
      currentUserId: 'user1',
      profileMode: 'self',
      profileSubjectId: null,
      subjectOptions: options,
    }),
    'user1',
  );
});

test('getNextProfileSubject cycles through self and child subjects', () => {
  const options = buildProfileSubjectOptions({
    currentUser: { id: 'user1', name: 'Amelia', fullName: 'Amelia Shaw' },
    children: [
      {
        id: 'child1',
        referenceId: 'child1',
        profileId: 'child1',
        name: 'CHICA',
        fullName: 'Chica Shaw',
        initials: 'CS',
        avatarUrl: null,
        age: 10,
        dateOfBirth: null,
        colorCode: '#FF0000',
        squadIds: [],
        clubIds: [],
        hasSpecialNeeds: false,
        profile: null,
      },
    ],
  });

  assert.equal(getNextProfileSubject('user1', options)?.id, 'child1');
  assert.equal(getNextProfileSubject('child1', options)?.id, 'user1');
});

test('buildProfileScopePayload maps self and child subjects correctly', () => {
  assert.deepEqual(
    buildProfileScopePayload({ id: 'user1', name: 'Amelia', initials: 'ME', kind: 'self' }),
    { mode: 'self' },
  );
  assert.deepEqual(
    buildProfileScopePayload({ id: 'child1', name: 'CHICA', initials: 'CS', kind: 'child' }),
    { mode: 'child', childId: 'child1' },
  );
});
