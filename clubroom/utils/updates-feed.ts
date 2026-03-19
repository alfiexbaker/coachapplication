import type { AggregatedFeedPost } from '@/services/social-feed-service';

export function mergeUpdatesFeed(
  primaryFeed: AggregatedFeedPost[],
  followingFeed: AggregatedFeedPost[],
): AggregatedFeedPost[] {
  const mergedById = new Map<string, AggregatedFeedPost>();

  for (const post of primaryFeed) {
    mergedById.set(post.id, post);
  }

  for (const post of followingFeed) {
    if (!mergedById.has(post.id)) {
      mergedById.set(post.id, post);
    }
  }

  return Array.from(mergedById.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
