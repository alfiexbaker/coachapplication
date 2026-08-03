import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiProblemError } from '../../lib/http-errors.js';
import { assertSupportedPostMetadata } from './post-metadata-policy.js';

function assertBadRequest(run: () => void, expectedMessage: RegExp): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof ApiProblemError);
    assert.equal(error.status, 400);
    assert.match(error.message, expectedMessage);
    return true;
  });
}

test('accepts honest club-wide post metadata', () => {
  assert.doesNotThrow(() =>
    assertSupportedPostMetadata({
      clubId: 'club_1',
      metadata: {
        title: 'Training update',
        postType: 'announcement',
        postAs: 'club',
        feedType: 'CLUB',
        audience: 'club',
        audienceLabel: 'Club-wide',
      },
    }),
  );
});

test('rejects metadata that pretends a club post has narrower visibility', () => {
  assertBadRequest(
    () =>
      assertSupportedPostMetadata({
        clubId: 'club_1',
        metadata: { audience: 'squad', squadId: 'squad_1' },
      }),
    /club-wide audience/i,
  );
});

test('does not confuse feed classification with backend visibility', () => {
  assert.doesNotThrow(() =>
    assertSupportedPostMetadata({
      clubId: 'club_1',
      metadata: { feedType: 'PERSONAL', audience: 'club' },
    }),
  );
});

test('rejects arbitrary media URLs in post metadata', () => {
  assertBadRequest(
    () =>
      assertSupportedPostMetadata({
        clubId: 'club_1',
        metadata: { imageUrl: 'https://tracker.invalid/pixel.png' },
      }),
    /finalized attachment proof/i,
  );
});

test('rejects backend-owned pin and attachment metadata', () => {
  for (const [field, value] of [
    ['attachments', []],
    ['isPinned', true],
    ['pinnedBy', 'user_2'],
    ['pinnedAt', '2026-08-01T09:00:00.000Z'],
  ] as const) {
    assertBadRequest(
      () =>
        assertSupportedPostMetadata({
          clubId: 'club_1',
          metadata: { [field]: value },
        }),
      /backend-owned fields/i,
    );
  }
});
