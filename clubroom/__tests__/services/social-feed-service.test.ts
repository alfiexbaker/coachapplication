import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { onTyped, ServiceEvents } from '@/services/event-bus';
import { clubFeedService } from '@/services/social-feed-service';

let testIdSeq = 0;

function nextId(prefix: string): string {
  testIdSeq += 1;
  return `${prefix}_${testIdSeq}`;
}

describe('clubFeedService', () => {
  it('creates coach post and emits event (happy path)', async () => {
    const coachId = nextId('coach');
    const events: Array<{ postId: string; coachId: string }> = [];
    const unsub = onTyped(ServiceEvents.COACH_POST_CREATED, (payload) => {
      events.push(payload as { postId: string; coachId: string });
    });

    const result = clubFeedService.createCoachPost({
      coachId,
      coachName: 'Coach Test',
      title: 'Training Update',
      body: 'Great session today.',
      feedType: 'PERSONAL',
    });

    assert.equal(result.success, true);
    if (!result.success) {
      unsub();
      return;
    }

    assert.equal(result.data.authorId, coachId);
    assert.equal(result.data.feedType, 'PERSONAL');

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(events.some((event) => event.postId === result.data.id && event.coachId === coachId));
    unsub();
  });

  it('returns validation err when post has no body and no image (error path)', () => {
    const result = clubFeedService.createCoachPost({
      coachId: nextId('coach'),
      coachName: 'Coach Test',
      title: '',
      body: '   ',
      feedType: 'PERSONAL',
    });

    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'VALIDATION');
  });

  it('returns empty personal feed for coach with no posts (empty path)', () => {
    const feed = clubFeedService.getPersonalFeed(nextId('coach_none'));
    assert.deepEqual(feed, []);
  });
});
