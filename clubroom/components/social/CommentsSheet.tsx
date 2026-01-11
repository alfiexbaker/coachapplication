import { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { commentService, type Comment, type UserRole } from '@/services/comment-service';

interface CommentsSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: Comment;
  currentUserId: string | undefined;
  onDelete: (commentId: string) => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const initials = comment.userName?.slice(0, 2).toUpperCase() || 'U';
  const isOwnComment = currentUserId === comment.userId;
  const timeAgo = commentService.formatTimeAgo(comment.createdAt);

  // Role badge color
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'COACH':
        return palette.tint;
      case 'ADMIN':
        return palette.warning;
      default:
        return palette.muted;
    }
  };

  const handleLongPress = () => {
    if (!isOwnComment) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete Comment'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: 'Delete your comment?',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            onDelete(comment.id);
          }
        }
      );
    } else {
      Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ]);
    }
  };

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={isOwnComment ? 0.7 : 1}
      style={styles.commentItem}
    >
      {/* Avatar */}
      <View style={[styles.commentAvatar, { backgroundColor: `${palette.tint}15` }]}>
        <ThemedText style={[styles.commentAvatarText, { color: palette.tint }]}>
          {initials}
        </ThemedText>
      </View>

      {/* Content */}
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <View style={styles.commentNameRow}>
            <ThemedText type="defaultSemiBold" style={styles.commentName}>
              {comment.userName}
            </ThemedText>
            {(comment.userRole === 'COACH' || comment.userRole === 'ADMIN') && (
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: `${getRoleBadgeColor(comment.userRole)}15` },
                ]}
              >
                <ThemedText
                  style={[styles.roleBadgeText, { color: getRoleBadgeColor(comment.userRole) }]}
                >
                  {comment.userRole === 'COACH' ? 'Coach' : 'Admin'}
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.commentTime, { color: palette.muted }]}>{timeAgo}</ThemedText>
        </View>
        <ThemedText style={[styles.commentText, { color: palette.text }]}>{comment.text}</ThemedText>
        {isOwnComment && (
          <ThemedText style={[styles.deleteHint, { color: palette.muted }]}>
            Long press to delete
          </ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CommentsSheet({
  visible,
  postId,
  onClose,
  onCommentCountChange,
}: CommentsSheetProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments when modal opens
  const loadComments = useCallback(async () => {
    if (!postId) return;
    setIsLoading(true);
    try {
      const loadedComments = await commentService.getComments(postId);
      setComments(loadedComments);
      onCommentCountChange?.(loadedComments.length);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, onCommentCountChange]);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, loadComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const userRole = (currentUser.role as UserRole) || 'USER';
      const userName = currentUser.fullName || currentUser.username || 'User';

      await commentService.addComment(postId, currentUser.id, userName, newComment.trim(), userRole);

      setNewComment('');
      Keyboard.dismiss();

      // Reload comments to get the new one
      await loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser) return;

    try {
      const success = await commentService.deleteComment(postId, commentId, currentUser.id);
      if (success) {
        await loadComments();
      } else {
        Alert.alert('Error', 'Failed to delete comment.');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  };

  const handleClose = () => {
    setNewComment('');
    Keyboard.dismiss();
    onClose();
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.emptyStateText, { color: palette.muted }]}>
        No comments yet
      </ThemedText>
      <ThemedText style={[styles.emptyStateSubtext, { color: palette.muted }]}>
        Be the first to comment!
      </ThemedText>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoid}
            >
              <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
                {/* Handle bar */}
                <View style={styles.handleBar}>
                  <View style={[styles.handle, { backgroundColor: palette.border }]} />
                </View>

                {/* Header */}
                <View style={[styles.header, { borderBottomColor: palette.border }]}>
                  <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    Comments
                  </ThemedText>
                  <ThemedText style={[styles.headerCount, { color: palette.muted }]}>
                    {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={handleClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={palette.icon} />
                  </TouchableOpacity>
                </View>

                {/* Comments list */}
                <FlatList
                  data={comments}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <CommentItem
                      comment={item}
                      currentUserId={currentUser?.id}
                      onDelete={handleDeleteComment}
                    />
                  )}
                  ListEmptyComponent={isLoading ? null : renderEmptyState}
                  contentContainerStyle={[
                    styles.listContent,
                    comments.length === 0 && styles.listContentEmpty,
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />

                {/* Input area */}
                <View style={[styles.inputContainer, { borderTopColor: palette.border }]}>
                  <View style={styles.inputRow}>
                    {currentUser && (
                      <View style={[styles.inputAvatar, { backgroundColor: `${palette.tint}15` }]}>
                        <ThemedText style={[styles.inputAvatarText, { color: palette.tint }]}>
                          {(currentUser.fullName || currentUser.username || 'U')
                            .slice(0, 2)
                            .toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.background,
                          color: palette.text,
                          borderColor: palette.border,
                        },
                      ]}
                      placeholder="Write a comment..."
                      placeholderTextColor={palette.muted}
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                      maxLength={500}
                      editable={!!currentUser && !isSubmitting}
                    />
                    <TouchableOpacity
                      onPress={handleSubmitComment}
                      disabled={!newComment.trim() || !currentUser || isSubmitting}
                      style={[
                        styles.sendButton,
                        {
                          backgroundColor:
                            newComment.trim() && !isSubmitting ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="send"
                        size={18}
                        color={newComment.trim() && !isSubmitting ? '#fff' : palette.muted}
                      />
                    </TouchableOpacity>
                  </View>
                  {!currentUser && (
                    <ThemedText style={[styles.loginHint, { color: palette.muted }]}>
                      Sign in to comment
                    </ThemedText>
                  )}
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    maxHeight: '85%',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '100%',
    minHeight: 300,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
  },
  headerCount: {
    fontSize: 14,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  listContent: {
    padding: Spacing.md,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  commentName: {
    fontSize: 14,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  deleteHint: {
    fontSize: 11,
    marginTop: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
