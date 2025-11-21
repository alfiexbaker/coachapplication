import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { router, useLocalSearchParams } from 'expo-router';
import { getPostById, getCommentsForPost, MOCK_COMMENTS, MOCK_POSTS } from '@/constants/mock-data';
import type { Comment } from '@/constants/app-types';

export default function PostDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const post = getPostById(postId || '');
  const [comments, setComments] = useState(getCommentsForPost(postId || ''));
  const [newComment, setNewComment] = useState('');

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <ThemedText>Post not found</ThemedText>
      </SafeAreaView>
    );
  }

  const isLiked = post.likes.includes(currentUser?.id || '');

  const handleLike = () => {
    // Mock implementation - in production would call API
    console.log('Like post:', post.id);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !currentUser) return;

    // Mock implementation - create new comment
    const comment: Comment = {
      id: `comment${Date.now()}`,
      postId: post.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: newComment,
      likes: [],
      createdAt: new Date().toISOString(),
    };

    setComments([...comments, comment]);
    MOCK_COMMENTS.push(comment);

    // Update comment count
    if (post.commentCount !== undefined) {
      post.commentCount += 1;
    }

    setNewComment('');
  };

  const handleCommentLike = (commentId: string) => {
    // Mock implementation
    console.log('Like comment:', commentId);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={palette.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle">Post</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Post Content */}
        <View style={[styles.postCard, { backgroundColor: palette.cardBackground, borderColor: palette.border }]}>
          <View style={styles.postHeader}>
            <View style={styles.authorInfo}>
              <View style={[styles.avatar, { backgroundColor: palette.tintAlt }]}>
                <ThemedText style={{ fontSize: 24 }}>{post.authorAvatar || '👤'}</ThemedText>
              </View>
              <View style={styles.authorDetails}>
                <ThemedText type="defaultSemibold">{post.authorName}</ThemedText>
                <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
                  {new Date(post.createdAt).toLocaleDateString()}
                </ThemedText>
              </View>
            </View>
          </View>

          <ThemedText style={styles.postContent}>{post.content}</ThemedText>

          <View style={styles.postActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <IconSymbol
                name={isLiked ? 'heart.fill' : 'heart'}
                size={20}
                color={isLiked ? '#FF3B30' : palette.muted}
              />
              <ThemedText style={[styles.actionText, { color: palette.muted }]}>
                {post.likes.length}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <IconSymbol name="bubble.left" size={20} color={palette.muted} />
              <ThemedText style={[styles.actionText, { color: palette.muted }]}>
                {comments.length}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <ThemedText type="subtitle" style={styles.commentsTitle}>
            Comments ({comments.length})
          </ThemedText>

          {comments.map((comment) => {
            const commentLiked = comment.likes.includes(currentUser?.id || '');
            return (
              <View
                key={comment.id}
                style={[styles.commentCard, { backgroundColor: palette.cardBackground, borderColor: palette.border }]}
              >
                <View style={styles.commentHeader}>
                  <View style={[styles.commentAvatar, { backgroundColor: palette.tintAlt }]}>
                    <ThemedText style={{ fontSize: 18 }}>{comment.authorAvatar || '👤'}</ThemedText>
                  </View>
                  <View style={styles.commentDetails}>
                    <ThemedText type="defaultSemibold">{comment.authorName}</ThemedText>
                    <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.commentContent}>{comment.content}</ThemedText>
                <TouchableOpacity
                  style={styles.commentLike}
                  onPress={() => handleCommentLike(comment.id)}
                >
                  <IconSymbol
                    name={commentLiked ? 'heart.fill' : 'heart'}
                    size={16}
                    color={commentLiked ? '#FF3B30' : palette.muted}
                  />
                  {comment.likes.length > 0 && (
                    <ThemedText style={[styles.likeCount, { color: palette.muted }]}>
                      {comment.likes.length}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={[styles.commentInput, { backgroundColor: palette.cardBackground, borderTopColor: palette.border }]}>
        <TextInput
          style={[styles.input, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]}
          placeholder="Add a comment..."
          placeholderTextColor={palette.muted}
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: newComment.trim() ? palette.tint : palette.border },
          ]}
          onPress={handleAddComment}
          disabled={!newComment.trim()}
        >
          <IconSymbol name="arrow.up" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  postCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  postHeader: {
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorDetails: {
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
  },
  commentsSection: {
    paddingHorizontal: 16,
  },
  commentsTitle: {
    marginBottom: 12,
  },
  commentCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentDetails: {
    flex: 1,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  likeCount: {
    fontSize: 12,
  },
  commentInput: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
