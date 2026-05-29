import { useEffect, useState, startTransition } from 'react';
import { FlatList, RefreshControl, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { ProfilePostCard } from '@/components/coach/profile-post-card';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { userService } from '@/services/user-service';
import { followService } from '@/services/follow-service';
import { ServiceEvents } from '@/services/event-bus';
import { socialFeedService, type AggregatedFeedPost } from '@/services/social-feed-service';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';
import type { User } from '@/constants/types';
import { err, ok, serviceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

type ConnectionState = 'self' | 'none' | 'outgoing_pending' | 'incoming_pending' | 'connected';
type ConnectionSnapshot = { connectionState: ConnectionState; incomingRequestId: string | null };

async function getConnectionSnapshot(
  currentUserId: string | undefined,
  targetId: string,
): Promise<ConnectionSnapshot> {
  if (!currentUserId || currentUserId === targetId) {
    return { connectionState: 'self', incomingRequestId: null };
  }

  const [isFriends, requestsForTarget, requestsForCurrent] = await Promise.all([
    followService.areFriends(currentUserId, targetId),
    followService.getPendingRequests(targetId),
    followService.getPendingRequests(currentUserId),
  ]);

  if (isFriends) {
    return { connectionState: 'connected', incomingRequestId: null };
  }

  const incomingRequest = requestsForCurrent.find((request) => request.requesterId === targetId);
  if (incomingRequest) {
    return { connectionState: 'incoming_pending', incomingRequestId: incomingRequest.id };
  }

  const hasOutgoingRequest = requestsForTarget.some(
    (request) => request.requesterId === currentUserId,
  );
  if (hasOutgoingRequest) {
    return { connectionState: 'outgoing_pending', incomingRequestId: null };
  }

  return { connectionState: 'none', incomingRequestId: null };
}

function applyConnectionSnapshot(
  snapshot: ConnectionSnapshot,
  setConnectionState: (state: ConnectionState) => void,
  setIncomingRequestId: (requestId: string | null) => void,
) {
  setConnectionState(snapshot.connectionState);
  setIncomingRequestId(snapshot.incomingRequestId);
}

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { currentUser } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>('none');
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [connectionActionLoading, setConnectionActionLoading] = useState(false);

  const { data, status, error, retry, refreshing, onRefresh, colors, showLoadingState } =
    useScreen<User | null>({
      load: async () => {
        if (!userId) {
          return err(serviceError('VALIDATION', 'Missing user id.'));
        }

        const result = await userService.getUserById(userId);
        if (!result.success) {
          if (result.error.code === 'NOT_FOUND') {
            return ok<User | null>(null);
          }
          return err(result.error);
        }

        return ok<User | null>(result.data);
      },
      deps: [userId],
      isEmpty: (value) => value === null,
      refetchOnFocus: true,
      loadingStrategy: 'section-skeleton',
      dataKey: userId ?? null,
    });
  const {
    data: postsData,
    status: postsStatus,
    error: postsError,
    refreshing: postsRefreshing,
    onRefresh: onRefreshPosts,
    retry: retryPosts,
    showLoadingState: postsShowLoadingState,
    showSectionSkeleton: postsShowSectionSkeleton,
  } = useScreen<AggregatedFeedPost[]>({
    load: async () => {
      if (!userId || !data?.id) {
        return ok([]);
      }

      return ok(socialFeedService.getFollowingFeed([data.id], 'all'));
    },
    deps: [userId, data?.id],
    events: [ServiceEvents.COACH_POST_CREATED],
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: userId ? `posts:${userId}` : null,
  });
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );
  const canOpenCoachProfile = data?.role === 'COACH';
  const canManageConnection = Boolean(currentUser?.id && data?.id && currentUser.id !== data.id);
  const canMessage = Boolean(currentUser?.id && data?.id && currentUser.id !== data.id);
  const posts = postsData ?? [];

  useEffect(() => {
    if (!data?.id || status !== 'success') return;

    startTransition(() => {
      void getConnectionSnapshot(currentUser?.id, data.id)
        .then((snapshot) => {
          applyConnectionSnapshot(snapshot, setConnectionState, setIncomingRequestId);
        })
        .catch(() => {
          applyConnectionSnapshot(
            { connectionState: 'none', incomingRequestId: null },
            setConnectionState,
            setIncomingRequestId,
          );
        });
    });
  }, [currentUser?.id, data?.id, status]);

  const connectionButtonLabel = (() => {
    if (connectionActionLoading) return 'Updating...';
    if (connectionState === 'connected') return 'Connected';
    if (connectionState === 'outgoing_pending') return 'Request sent';
    if (connectionState === 'incoming_pending') return 'Review request';
    return 'Connect';
  })();

  const canTriggerConnectionAction =
    !connectionActionLoading &&
    canManageConnection &&
    (connectionState === 'none' ||
      (connectionState === 'incoming_pending' && Boolean(incomingRequestId)));

  const handleConnectionAction = async () => {
    if (!currentUser?.id || !data?.id || !canManageConnection || connectionActionLoading) return;

    setConnectionActionLoading(true);

    return await runAsyncTryCatchFinally(
      async () => {
        if (connectionState === 'incoming_pending' && incomingRequestId) {
          await followService.respondToRequest(incomingRequestId, 'ACCEPTED');
        } else if (connectionState === 'none') {
          await followService.sendFollowRequest({
            requesterId: currentUser.id,
            requesterName:
              currentUser.fullName || currentUser.name || currentUser.username || 'User',
            targetId: data.id,
            targetName: data.name || 'User',
          });
        } else {
          return;
        }

        const snapshot = await getConnectionSnapshot(currentUser.id, data.id);
        applyConnectionSnapshot(snapshot, setConnectionState, setIncomingRequestId);
      },
      async (error) => {
        uiFeedback.showToast('Please try again in a moment.', 'error');
      },
      () => {
        setConnectionActionLoading(false);
      },
    );
  };

  const handleRefresh = () => {
    onRefresh();
    onRefreshPosts();
  };

  const handleLikePost = (postId: string) => {
    if (!currentUser?.id) return;
    socialFeedService.toggleReaction(postId, currentUser.id);
    onRefreshPosts();
  };

  const handleCommentPost = (postId: string) => {
    router.push(Routes.modalPostDetail(postId));
  };

  const handleSharePost = async (postId: string) => {
    const post = posts.find((candidate) => candidate.id === postId);
    if (!post) return;

    try {
      await Share.share({
        title: post.title,
        message: `${post.title}\n\n${post.body}`,
      });
    } catch {
      uiFeedback.showToast('Try again in a moment.', 'error');
    }
  };

  const renderUpdatesHeader = () => (
    <>
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
            {(data?.name || 'U').slice(0, 1).toUpperCase()}
          </ThemedText>
        </View>
        <ThemedText type="heading">{data?.name}</ThemedText>
        <ThemedText style={[styles.role, { color: colors.muted }]}>{data?.role}</ThemedText>

        <View style={styles.meta}>
          <Row align="center" gap="xs">
            <Ionicons name="mail-outline" size={16} color={colors.muted} />
            <ThemedText style={[styles.metaText, { color: colors.text }]}>
              {data?.email || 'No email provided'}
            </ThemedText>
          </Row>
          <Row align="center" gap="xs">
            <Ionicons name="location-outline" size={16} color={colors.muted} />
            <ThemedText style={[styles.metaText, { color: colors.text }]}>
              {data?.postcode || 'No location provided'}
            </ThemedText>
          </Row>
        </View>
      </View>

      <View style={styles.actions}>
        {canManageConnection && (
          <Button
            onPress={handleConnectionAction}
            disabled={!canTriggerConnectionAction}
            variant={connectionState === 'none' ? 'outline' : 'secondary'}
            accessibilityLabel={connectionButtonLabel}
            label={connectionButtonLabel}
          />
        )}
        {canMessage ? (
          <Button onPress={() => router.push(Routes.chat(data!.id))} label="Message" />
        ) : null}
        {canOpenCoachProfile && (
          <Button
            onPress={() => router.push(Routes.coachPublic(data!.id))}
            variant="secondary"
            label="View Coach Profile"
          />
        )}
      </View>

      <View style={styles.updatesHeader}>
        <ThemedText type="defaultSemiBold" style={styles.updatesTitle}>
          Updates
        </ThemedText>
      </View>
      {postsRefreshing ? (
        <SubmitProgressState label="Refreshing updates" style={styles.pendingState} />
      ) : null}
    </>
  );

  const renderPost = ({ item }: { item: AggregatedFeedPost }) => (
    <View style={styles.postItem}>
      <ProfilePostCard
        post={{
          id: item.id,
          content: item.body,
          createdAt: item.createdAt,
          likes: item.reactionCount ?? 0,
          comments: item.commentCount ?? 0,
          mediaUrls: item.imageUrl ? [item.imageUrl] : undefined,
          mediaType: item.imageUrl ? 'photo' : undefined,
        }}
        coachName={data?.name || 'User'}
        contextLabel={item.clubName}
        onLikePress={handleLikePost}
        onCommentPress={handleCommentPost}
        onSharePress={handleSharePost}
      />
    </View>
  );

  if (showLoadingState) {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (status === 'error') {
    return renderShell(
      <ErrorState message={error?.message ?? 'Failed to load profile.'} onRetry={retry} />,
    );
  }

  if (status === 'empty' || !data) {
    return renderShell(
      <EmptyState
        icon="person-outline"
        title="Profile not found"
        message="This user could not be loaded."
        actionLabel="Go back"
        onPressAction={() => router.back()}
      />,
    );
  }

  return renderShell(
    <>
      <Row style={styles.header} align="center" justify="between">
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title">Profile</ThemedText>
        <View style={styles.headerSpacer} />
      </Row>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderUpdatesHeader}
        ListEmptyComponent={
          postsShowLoadingState || postsShowSectionSkeleton ? (
            <LoadingState variant="feed" scope="section" style={styles.postsLoading} />
          ) : postsStatus === 'error' ? (
            <ErrorState
              message={postsError?.message ?? 'Failed to load updates.'}
              onRetry={retryPosts}
            />
          ) : (
            <EmptyState
              icon="newspaper-outline"
              title="No updates yet"
              message={`${data.name} has not shared any updates yet.`}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing || postsRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerSpacer: {
    width: 24,
    height: 24,
  },
  listContent: {
    paddingBottom: Spacing.xl * 2,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  avatarText: {
    ...Typography.title,
  },
  role: {
    ...Typography.caption,
  },
  meta: {
    width: '100%',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.body,
    flex: 1,
  },
  actions: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  updatesHeader: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  updatesTitle: {
    ...Typography.subheading,
  },
  pendingState: {
    marginTop: Spacing.sm,
  },
  postItem: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  postsLoading: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
