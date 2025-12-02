import type { Post } from '@/constants/app-types';
import { MOCK_POSTS } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

type CreatePostInput = {
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  imageUrl?: string;
  context?: 'manual' | 'badge_share';
  badgeAwardId?: string;
  badgeId?: string;
  badgeLabel?: string;
  sessionId?: string;
};

class SocialFeedService {
  private logger = createLogger('SocialFeedService');

  addPost(input: CreatePostInput): Post {
    const content = input.content.trim();
    if (!content) {
      throw new Error('Post content cannot be empty');
    }

    const post: Post = {
      id: `post_${Date.now()}`,
      authorId: input.authorId,
      authorName: input.authorName,
      authorAvatar: input.authorAvatar || '🏅',
      content,
      likes: [],
      commentCount: 0,
      createdAt: new Date().toISOString(),
      imageUrl: input.imageUrl,
    };

    MOCK_POSTS.unshift(post);

    this.logger.info('social_post_created', {
      postId: post.id,
      context: input.context || 'manual',
      badgeAwardId: input.badgeAwardId,
      badgeId: input.badgeId,
      sessionId: input.sessionId,
    });

    return post;
  }
}

export const socialFeedService = new SocialFeedService();
