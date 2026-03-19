import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AggregatedFeedPost } from '@/services/social-feed-service';
import { mergeUpdatesFeed } from '@/utils/updates-feed';

function makePost(overrides: Partial<AggregatedFeedPost>): AggregatedFeedPost {
  return {
    id: overrides.id ?? 'post_default',
    clubId: overrides.clubId ?? 'club_lions',
    clubName: overrides.clubName ?? 'Lions FC Academy',
    clubBadge: overrides.clubBadge ?? 'LFC',
    title: overrides.title ?? 'Update',
    body: overrides.body ?? 'Body',
    createdAt: overrides.createdAt ?? '2026-03-19T10:00:00.000Z',
    audience: overrides.audience ?? 'club',
    authorId: overrides.authorId ?? 'coach1',
    postAs: overrides.postAs ?? 'self',
    postType: overrides.postType ?? 'announcement',
    feedType: overrides.feedType ?? 'PERSONAL',
    reactionCount: overrides.reactionCount ?? 0,
    commentCount: overrides.commentCount ?? 0,
  };
}

describe('mergeUpdatesFeed', () => {
  it('deduplicates shared posts and sorts newest first', () => {
    const shared = makePost({
      id: 'post_shared',
      createdAt: '2026-03-19T10:00:00.000Z',
    });
    const clubOnly = makePost({
      id: 'post_club',
      createdAt: '2026-03-18T09:00:00.000Z',
    });
    const followingOnly = makePost({
      id: 'post_following',
      createdAt: '2026-03-20T08:00:00.000Z',
      clubId: 'club_eagles',
      clubName: 'East London Eagles',
    });

    const merged = mergeUpdatesFeed([shared, clubOnly], [followingOnly, shared]);

    assert.deepEqual(
      merged.map((post) => post.id),
      ['post_following', 'post_shared', 'post_club'],
    );
  });
});
