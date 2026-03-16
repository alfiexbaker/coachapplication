import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { userService } from '@/services/user-service';
import { followService } from '@/services/follow-service';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';
import type { User } from '@/constants/types';
import { err, ok, serviceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

type ConnectionState = 'self' | 'none' | 'outgoing_pending' | 'incoming_pending' | 'following';

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { currentUser } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>('none');
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [connectionActionLoading, setConnectionActionLoading] = useState(false);

  const { data, status, error, retry, colors } = useScreen<User | null>({
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

  const loadConnectionState = useCallback(
    async (targetId: string) => {
      if (!currentUser?.id || currentUser.id === targetId) {
        setConnectionState('self');
        setIncomingRequestId(null);
        return;
      }

      const [isFriends, requestsForTarget, requestsForCurrent] = await Promise.all([
        followService.areFriends(currentUser.id, targetId),
        followService.getPendingRequests(targetId),
        followService.getPendingRequests(currentUser.id),
      ]);

      if (isFriends) {
        setConnectionState('following');
        setIncomingRequestId(null);
        return;
      }

      const incomingRequest = requestsForCurrent.find((request) => request.requesterId === targetId);
      if (incomingRequest) {
        setConnectionState('incoming_pending');
        setIncomingRequestId(incomingRequest.id);
        return;
      }

      const hasOutgoingRequest = requestsForTarget.some(
        (request) => request.requesterId === currentUser.id,
      );
      if (hasOutgoingRequest) {
        setConnectionState('outgoing_pending');
        setIncomingRequestId(null);
        return;
      }

      setConnectionState('none');
      setIncomingRequestId(null);
    },
    [currentUser?.id],
  );

  useEffect(() => {
    if (!data?.id || status !== 'success') return;

    void loadConnectionState(data.id).catch(() => {
      setConnectionState('none');
      setIncomingRequestId(null);
    });
  }, [data?.id, loadConnectionState, status]);

  const connectionButtonLabel = useMemo(() => {
    if (connectionActionLoading) return 'Updating...';
    if (connectionState === 'following') return 'Following';
    if (connectionState === 'outgoing_pending') return 'Follow requested';
    if (connectionState === 'incoming_pending') return 'Review follow';
    return 'Follow';
  }, [connectionActionLoading, connectionState]);

  const canTriggerConnectionAction =
    !connectionActionLoading &&
    canManageConnection &&
    (connectionState === 'none' ||
      (connectionState === 'incoming_pending' && Boolean(incomingRequestId)));

  const handleConnectionAction = useCallback(async () => {
    if (!currentUser?.id || !data?.id || !canManageConnection || connectionActionLoading) return;

    setConnectionActionLoading(true);
    try {
      if (connectionState === 'incoming_pending' && incomingRequestId) {
        await followService.respondToRequest(incomingRequestId, 'ACCEPTED');
      } else if (connectionState === 'none') {
        await followService.sendFollowRequest({
          requesterId: currentUser.id,
          requesterName: currentUser.fullName || currentUser.name || currentUser.username || 'User',
          targetId: data.id,
          targetName: data.name || 'User',
        });
      } else {
        return;
      }

      await loadConnectionState(data.id);
    } catch {
      uiFeedback.showToast('Please try again in a moment.', 'error');
    } finally {
      setConnectionActionLoading(false);
    }
  }, [
    canManageConnection,
    currentUser?.fullName,
    currentUser?.id,
    currentUser?.name,
    currentUser?.username,
    data?.id,
    data?.name,
    connectionActionLoading,
    connectionState,
    incomingRequestId,
    loadConnectionState,
  ]);

  if (status === 'loading') {
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

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
            {(data.name || 'U').slice(0, 1).toUpperCase()}
          </ThemedText>
        </View>
        <ThemedText type="heading">{data.name}</ThemedText>
        <ThemedText style={[styles.role, { color: colors.muted }]}>{data.role}</ThemedText>

        <View style={styles.meta}>
          <Row align="center" gap="xs">
            <Ionicons name="mail-outline" size={16} color={colors.muted} />
            <ThemedText style={[styles.metaText, { color: colors.text }]}>
              {data.email || 'No email provided'}
            </ThemedText>
          </Row>
          <Row align="center" gap="xs">
            <Ionicons name="location-outline" size={16} color={colors.muted} />
            <ThemedText style={[styles.metaText, { color: colors.text }]}>
              {data.postcode || 'No location provided'}
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
          >
            {connectionButtonLabel}
          </Button>
        )}
        <Button onPress={() => router.push(Routes.chat(data.id))}>Message</Button>
        {canOpenCoachProfile && (
          <Button onPress={() => router.push(Routes.coachPublic(data.id))} variant="secondary">
            View Coach Profile
          </Button>
        )}
      </View>
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
});
