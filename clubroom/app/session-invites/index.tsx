import { useState, useCallback, useMemo } from 'react';
import { ScrollView, Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { ok } from '@/types/result';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { InviteModeToggle, InviteStatusFilter } from '@/components/invite/invite-filter-bar';
import { InviteListCard } from '@/components/invite/invite-list-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { inviteService as sessionInviteService } from '@/services/invite';
import { ServiceEvents } from '@/services/event-bus';
import { isCoach } from '@/utils/user-helpers';
import { useChildContext } from '@/hooks/use-child-context';
import type { SessionInvite } from '@/constants/types';
import {
  getSessionInviteAthleteNames,
  getSessionInviteCoachName,
  resolveInviteChildLabel,
} from '@/utils/session-invite-display';

type ViewMode = 'sent' | 'received';
type FilterMode = 'all' | 'pending' | 'responded';

export default function SessionInvitesScreen() {
  const { currentUser } = useAuth();
  const userIsCoach = isCoach(currentUser);
  const { isParent: userHasChildren, isMultiChild, getChildById } = useChildContext();
  const [mode, setMode] = useState<ViewMode>(userIsCoach ? 'sent' : 'received');
  const [filter, setFilter] = useState<FilterMode>('all');
  const {
    data: invites,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors,
  } = useScreen({
    load: async () => {
      if (!currentUser?.id) return ok([] as SessionInvite[]);
      const data =
        mode === 'sent'
          ? await sessionInviteService.getCoachInvites(currentUser.id)
          : await sessionInviteService.getParentInvites(currentUser.id);
      return ok(data);
    },
    deps: [currentUser?.id, mode],
    events: [ServiceEvents.INVITE_ACCEPTED, ServiceEvents.INVITE_BOOKING_FAILED],
  });

  const pendingCount = useMemo(() => {
    if (!invites) return 0;
    return invites.filter((i) => i.status === 'PENDING' && new Date(i.expiresAt) > new Date())
      .length;
  }, [invites]);

  const filteredInvites = useMemo(() => {
    if (!invites) return [];
    return invites.filter((invite) => {
      if (filter === 'all') return true;
      if (filter === 'pending')
        return invite.status === 'PENDING' && new Date(invite.expiresAt) > new Date();
      if (filter === 'responded') return invite.status !== 'PENDING';
      return true;
    });
  }, [invites, filter]);

  const showModeToggle = userIsCoach && userHasChildren;
  const showFilterChips =
    (mode === 'received' || (!userIsCoach && userHasChildren)) && (invites?.length ?? 0) > 0;
  const handleCreateInvite = useCallback(() => {
    router.push(Routes.SESSION_INVITES_CREATE);
  }, []);
  const handleOpenInvite = useCallback((inviteId: string) => {
    router.push(Routes.sessionInvite(inviteId));
  }, []);
  const handleQuickDecline = useCallback(
    async (invite: SessionInvite) => {
      const coachName = getSessionInviteCoachName(invite);
      Alert.alert(
        'Decline Invite',
        `Are you sure you want to decline the session invite from Coach ${coachName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: async () => {
              try {
                await sessionInviteService.respondToInvite({
                  inviteId: invite.id,
                  response: 'DECLINED',
                });
                Alert.alert('Done', 'Invite declined. The coach has been notified.');
                onRefresh();
              } catch {
                Alert.alert('Error', 'Failed to decline invite. Please try again.');
              }
            },
          },
        ],
      );
    },
    [onRefresh],
  );

  const handleCancelInvite = useCallback(
    async (invite: SessionInvite) => {
      const athleteNames = getSessionInviteAthleteNames(invite);
      Alert.alert(
        'Cancel Invite',
        `Are you sure you want to cancel this invite to ${athleteNames.join(', ')}?`,
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Invite',
            style: 'destructive',
            onPress: async () => {
              try {
                await sessionInviteService.cancelInvite(invite.id);
                Alert.alert('Done', 'Invite cancelled.');
                onRefresh();
              } catch {
                Alert.alert('Error', 'Failed to cancel invite. Please try again.');
              }
            },
          },
        ],
      );
    },
    [onRefresh],
  );

  const handleDismissInvite = useCallback(
    async (invite: SessionInvite) => {
      Alert.alert('Remove Invite', 'Remove this invite from your list?', [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await sessionInviteService.dismissInvite(invite.id);
              onRefresh();
            } catch {
              Alert.alert('Error', 'Failed to remove invite. Please try again.');
            }
          },
        },
      ]);
    },
    [onRefresh],
  );

  const handleChangeMode = useCallback((newMode: ViewMode) => setMode(newMode), []);
  const handleChangeFilter = useCallback((newFilter: FilterMode) => setFilter(newFilter), []);

  if (status === 'loading')
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="list" />
      </SafeAreaView>
    );

  if (status === 'error')
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState message={error?.message ?? 'Failed to load invites'} onRetry={retry} />
      </SafeAreaView>
    );

  if (status === 'empty')
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <Row gap="md" align="center" paddingH="lg" paddingV="md">
          <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <Row gap="sm" align="center" style={styles.headerTitle}>
            <ThemedText type="title">Session Invites</ThemedText>
          </Row>
          {userIsCoach && (
            <Clickable
              onPress={handleCreateInvite}
              accessibilityLabel="Create new invite"
              style={[styles.createButton, { backgroundColor: colors.tint }]}
            >
              <Ionicons name="add" size={20} color={colors.onPrimary} />
            </Clickable>
          )}
        </Row>
        {showModeToggle && <InviteModeToggle mode={mode} onChangeMode={handleChangeMode} />}
        <EmptyState
          icon={mode === 'sent' ? 'paper-plane-outline' : 'mail-outline'}
          title={mode === 'sent' ? 'No invites sent' : 'No invites received'}
          message={
            mode === 'sent'
              ? 'Invite athletes to sessions from their profile or your roster'
              : 'Session invites from coaches will appear here'
          }
        />
      </SafeAreaView>
    );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <Row gap="md" align="center" paddingH="lg" paddingV="md">
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <Row gap="sm" align="center" style={styles.headerTitle}>
          <ThemedText type="title">Session Invites</ThemedText>
          {pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.error }]}>
              <ThemedText style={[styles.badgeText, { color: colors.onPrimary }]}>
                {pendingCount}
              </ThemedText>
            </View>
          )}
        </Row>
        {userIsCoach && (
          <Clickable
            onPress={handleCreateInvite}
            accessibilityLabel="Create new invite"
            style={[styles.createButton, { backgroundColor: colors.tint }]}
          >
            <Ionicons name="add" size={20} color={colors.onPrimary} />
          </Clickable>
        )}
      </Row>

      {showModeToggle && <InviteModeToggle mode={mode} onChangeMode={handleChangeMode} />}
      {showFilterChips && (
        <InviteStatusFilter
          filter={filter}
          pendingCount={pendingCount}
          onChangeFilter={handleChangeFilter}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {userHasChildren && pendingCount > 0 && filter === 'all' && (
          <Row
            gap="sm"
            align="center"
            style={[styles.pendingBanner, { backgroundColor: withAlpha(colors.warning, 0.09) }]}
          >
            <Ionicons name="alert-circle" size={20} color={colors.warning} />
            <ThemedText style={[styles.pendingBannerText, { color: colors.text }]}>
              You have {pendingCount} pending invite{pendingCount > 1 ? 's' : ''} awaiting your
              response
            </ThemedText>
          </Row>
        )}

        {filteredInvites.length === 0 ? (
          <EmptyState
            icon={mode === 'sent' ? 'paper-plane-outline' : 'mail-outline'}
            title={
              filter === 'pending'
                ? 'No pending invites'
                : filter === 'responded'
                  ? 'No responded invites'
                  : mode === 'sent'
                    ? 'No invites sent'
                    : 'No invites received'
            }
            message={
              mode === 'sent'
                ? 'Invite athletes to sessions from their profile or your roster'
                : 'Session invites from coaches will appear here'
            }
          />
        ) : (
          <Column gap="md">
            {filteredInvites.map((invite, index) => (
              <InviteListCard
                key={invite.id}
                invite={invite}
                index={index}
                mode={mode}
                colors={colors}
                childLabel={resolveInviteChildLabel(invite.athleteIds, getChildById, isMultiChild)}
                onPress={() => handleOpenInvite(invite.id)}
                onQuickDecline={() => handleQuickDecline(invite)}
                onCancel={() => handleCancelInvite(invite)}
                onDismiss={() => handleDismissInvite(invite)}
              />
            ))}
          </Column>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { flex: 1 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  badgeText: { ...Typography.caption },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.lg, paddingTop: 0 },
  pendingBanner: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  pendingBannerText: { ...Typography.bodySmallSemiBold, flex: 1 },
});
