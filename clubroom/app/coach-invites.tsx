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

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useCoachInvites, formatExpiry, ROLE_LABELS, type PendingClubInvite } from '@/hooks/use-coach-invites';

export default function CoachInvitesScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const c = useCoachInvites();

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
            <ThemedText type="defaultSemiBold" style={{ ...Typography.heading }}>{invite.clubName}</ThemedText>
            <Row style={[styles.roleBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="shield-checkmark" size={14} color={palette.success} />
              <ThemedText style={[styles.roleText, { color: palette.success }]}>Invited as {ROLE_LABELS[invite.role]}</ThemedText>
            </Row>
          </View>
        </Row>
        <View style={[styles.detailsSection, { borderTopColor: palette.border }]}>
          <Row style={styles.detailRow}><Ionicons name="person-outline" size={16} color={palette.muted} />
            <ThemedText style={{ color: palette.muted }}>Invited by {invite.invitedBy}</ThemedText></Row>
          <Row style={styles.detailRow}><Ionicons name="time-outline" size={16} color={palette.warning} />
            <ThemedText style={{ color: palette.warning }}>{formatExpiry(invite.expiresAt)}</ThemedText></Row>
        </View>
        <Row style={styles.actions}>
          <Clickable style={[styles.declineButton, { borderColor: palette.border }]} onPress={() => c.handleDecline(invite)} disabled={isResponding}>
            <ThemedText style={[styles.declineText, { color: palette.muted }]}>Decline</ThemedText>
          </Clickable>
          <Clickable style={[styles.acceptButton, { backgroundColor: palette.tint }]} onPress={() => c.handleAccept(invite)} disabled={isResponding}>
            <Row align="center" justify="center" gap="xs">
              {isResponding ? <ThemedText style={[styles.acceptText, { color: palette.onPrimary }]}>Joining...</ThemedText> : (
                <><Ionicons name="checkmark" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.acceptText, { color: palette.onPrimary }]}>Accept & Join</ThemedText></>
              )}
            </Row>
          </Clickable>
        </Row>
      </SurfaceCard>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader title="Club Invites" subtitle={c.pendingCount > 0 ? `${c.pendingCount} pending` : 'No pending invites'}
        showBack onBackPress={() => router.back()} />
      <FlatList data={c.invites} keyExtractor={(item) => item.id} renderItem={renderInvite}
        contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.muted, 0.06) }]}>
              <Ionicons name="shield-outline" size={40} color={palette.muted} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              {c.loading ? 'Loading...' : 'No pending invites'}
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              When you enter a club invite code, the invitation will appear here for you to review and accept.
            </ThemedText>
            <Clickable style={[styles.goToClubHubButton, { backgroundColor: palette.tint }]} onPress={() => router.push(Routes.CLUB_HUB)}>
              <Row align="center" gap="sm">
                <Ionicons name="people" size={18} color={palette.onPrimary} />
                <ThemedText style={{ color: palette.onPrimary, fontWeight: '600' }}>Go to Club Hub</ThemedText>
              </Row>
            </Clickable>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.md },
  inviteCard: { gap: Spacing.md },
  inviteHeader: { alignItems: 'center', gap: Spacing.md },
  clubBadge: { width: 56, height: 56, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  clubBadgeText: { ...Typography.heading },
  clubInfo: { flex: 1, gap: Spacing.xs },
  roleBadge: { alignItems: 'center', alignSelf: 'flex-start', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  roleText: { ...Typography.smallSemiBold },
  detailsSection: { gap: Spacing.xs, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: 'transparent' },
  detailRow: { alignItems: 'center', gap: Spacing.sm },
  actions: { gap: Spacing.sm, marginTop: Spacing.xs },
  declineButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1.5, alignItems: 'center' },
  declineText: { ...Typography.bodySemiBold },
  acceptButton: { flex: 2, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  acceptText: { ...Typography.bodySemiBold },
  separator: { height: Spacing.sm },
  empty: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm, marginTop: Spacing.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: Radii['3xl'], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  emptyTitle: { ...Typography.heading },
  emptyText: { ...Typography.bodySmall, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  goToClubHubButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.md, marginTop: Spacing.md },
});
