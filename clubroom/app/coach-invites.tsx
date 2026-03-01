/**
 * Coach Invites Screen
 *
 * Inbox for coaches to view and respond to club/organization invites.
 * All state/logic in useCoachInvites hook.
 */

import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { AccessibleListCell } from '@/components/ui/list-accessibility';
import {
  useCoachInvites,
  formatExpiry,
  ROLE_LABELS,
  type PendingClubInvite,
} from '@/hooks/use-coach-invites';

export default function CoachInvitesScreen() {
  const { colors: palette } = useTheme();
  const c = useCoachInvites();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );
  const renderScreenShell = (content: ReactNode, subtitle: string) =>
    renderShell(
      <>
        <PageHeader
          title="Club Invites"
          subtitle={subtitle}
          showBack
          onBackPress={() => router.back()}
        />
        {content}
      </>,
    );

  const renderInvite = ({ item: invite }: { item: PendingClubInvite }) => {
    const isResponding = c.respondingTo === invite.id;
    return (
      <SurfaceCard style={styles.inviteCard}>
        <Row style={styles.inviteHeader}>
          <View style={[styles.clubBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]}>
              {invite.clubBadge?.slice(0, 2) || invite.clubName.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.clubInfo}>
            <ThemedText type="defaultSemiBold" style={{ ...Typography.heading }}>
              {invite.clubName}
            </ThemedText>
            <Row style={[styles.roleBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="shield-checkmark" size={14} color={palette.success} />
              <ThemedText style={[styles.roleText, { color: palette.success }]}>
                Invited as {ROLE_LABELS[invite.role]}
              </ThemedText>
            </Row>
          </View>
        </Row>
        <View style={[styles.detailsSection, { borderTopColor: palette.border }]}>
          <Row style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color={palette.muted} />
            <ThemedText style={{ color: palette.muted }}>Invited by {invite.invitedBy}</ThemedText>
          </Row>
          <Row style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={palette.warning} />
            <ThemedText style={{ color: palette.warning }}>
              {formatExpiry(invite.expiresAt)}
            </ThemedText>
          </Row>
        </View>
        <Row style={styles.actions}>
          <Clickable
            style={[styles.declineButton, { borderColor: palette.border }]}
            onPress={() => c.handleDecline(invite)}
            disabled={isResponding}
          >
            <ThemedText style={[styles.declineText, { color: palette.muted }]}>Decline</ThemedText>
          </Clickable>
          <Clickable
            style={[styles.acceptButton, { backgroundColor: palette.tint }]}
            onPress={() => c.handleAccept(invite)}
            disabled={isResponding}
          >
            <Row align="center" justify="center" gap="xs">
              {isResponding ? (
                <ThemedText style={[styles.acceptText, { color: palette.onPrimary }]}>
                  Joining...
                </ThemedText>
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.acceptText, { color: palette.onPrimary }]}>
                    Accept & Join
                  </ThemedText>
                </>
              )}
            </Row>
          </Clickable>
        </Row>
      </SurfaceCard>
    );
  };

  if (c.status === 'loading') {
    return renderScreenShell(<LoadingState variant="list" />, 'Checking your invites');
  }

  if (c.status === 'error') {
    return renderScreenShell(
      <ErrorState
        message={c.error?.message || 'Failed to load club invites.'}
        onRetry={c.retry}
      />,
      'Unable to load invites',
    );
  }

  if (c.status === 'empty') {
    return renderScreenShell(
      <EmptyState
        icon="shield-outline"
        title="No pending invites"
        message="When you enter a club invite code, the invitation will appear here for you to review and accept."
        actionLabel="Go to Club Hub"
        onPressAction={() => router.push(Routes.CLUB_HUB)}
      />,
      'No pending invites',
    );
  }

  return renderScreenShell(
    <FlatList
      CellRendererComponent={AccessibleListCell}
      accessibilityRole="list"
      data={c.invites}
      keyExtractor={(item) => item.id}
      renderItem={renderInvite}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.handleRefresh} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />,
    c.pendingCount > 0 ? `${c.pendingCount} pending` : 'No pending invites',
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.md },
  inviteCard: { gap: Spacing.md },
  inviteHeader: { alignItems: 'center', gap: Spacing.md },
  clubBadge: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: { ...Typography.heading },
  clubInfo: { flex: 1, gap: Spacing.xs },
  roleBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  roleText: { ...Typography.smallSemiBold },
  detailsSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  detailRow: { alignItems: 'center', gap: Spacing.sm },
  actions: { gap: Spacing.sm, marginTop: Spacing.xs },
  declineButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  declineText: { ...Typography.bodySemiBold },
  acceptButton: { flex: 2, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  acceptText: { ...Typography.bodySemiBold },
  separator: { height: Spacing.sm },
});
