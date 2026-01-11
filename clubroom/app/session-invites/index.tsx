import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { sessionInviteService } from '@/services/session-invite-service';
import type { SessionInvite } from '@/constants/types';

type ViewMode = 'sent' | 'received';
type FilterMode = 'all' | 'pending' | 'responded';

function InviteCard({
  invite,
  index,
  mode,
  onPress,
  onQuickDecline,
}: {
  invite: SessionInvite;
  index: number;
  mode: ViewMode;
  onPress: () => void;
  onQuickDecline?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isExpired = new Date(invite.expiresAt) < new Date();
  const status = isExpired && invite.status === 'PENDING' ? 'EXPIRED' : invite.status;

  const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
    PENDING: { bg: '#FEF3C7', text: '#92400E', icon: 'hourglass-outline' },
    ACCEPTED: { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle-outline' },
    DECLINED: { bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle-outline' },
    EXPIRED: { bg: '#F3F4F6', text: '#6B7280', icon: 'time-outline' },
    COUNTERED: { bg: '#DBEAFE', text: '#1E40AF', icon: 'swap-horizontal-outline' },
  };

  const statusConfig = statusColors[status] || statusColors.PENDING;

  const displayName = mode === 'sent' ? invite.athleteNames.join(', ') : invite.coachName;
  const initials =
    mode === 'sent'
      ? invite.athleteNames[0]?.charAt(0) || 'A'
      : invite.coachName
          .split(' ')
          .map((n) => n[0])
          .join('');

  // Build invitation message
  const coachFirstName = invite.coachName.split(' ')[0];
  const athleteDisplay = invite.athleteNames.length === 1
    ? invite.athleteNames[0]
    : `${invite.athleteNames.length} athletes`;
  const invitationMessage = mode === 'received'
    ? invite.clubName
      ? `Coach ${coachFirstName} has invited ${athleteDisplay} to ${invite.clubName}`
      : `Coach ${coachFirstName} has invited ${athleteDisplay} to a ${invite.sessionType.toLowerCase()}`
    : invite.clubName
      ? `Invite to ${invite.clubName}`
      : `${invite.sessionType} invite`;

  const firstSlot = invite.proposedSlots[0];
  const slotDate = firstSlot
    ? new Date(firstSlot.date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

  // Calculate expiry countdown
  const getExpiryText = () => {
    if (status !== 'PENDING') return null;
    const now = new Date();
    const expiry = new Date(invite.expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffDays > 0) return `${diffDays}d ${diffHours}h left`;
    if (diffHours > 0) return `${diffHours}h left`;
    return 'Expires soon';
  };

  const expiryText = getExpiryText();

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.inviteCard} onPress={onPress}>
        {/* Invitation Message Banner */}
        <View style={[styles.invitationBanner, { backgroundColor: `${palette.tint}08` }]}>
          <Ionicons name="mail-outline" size={16} color={palette.tint} />
          <ThemedText style={[styles.invitationText, { color: palette.text }]} numberOfLines={2}>
            {invitationMessage}
          </ThemedText>
        </View>

        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: `${palette.tint}10` }]}>
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {initials}
            </ThemedText>
          </View>

          <View style={styles.headerContent}>
            <ThemedText type="defaultSemiBold" style={styles.name}>
              {mode === 'received' ? `Coach ${displayName}` : displayName}
            </ThemedText>
            {invite.clubName && (
              <ThemedText style={[styles.clubName, { color: palette.tint }]}>
                {invite.clubName}
              </ThemedText>
            )}
            <ThemedText style={[styles.sessionType, { color: palette.muted }]}>
              {invite.sessionType} - {invite.focus}
            </ThemedText>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.text} />
            <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
              {status}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={palette.muted} />
            <ThemedText style={[styles.detailText, { color: palette.text }]}>
              {slotDate} at {firstSlot?.startTime}
              {invite.proposedSlots.length > 1 && ` (+${invite.proposedSlots.length - 1} options)`}
            </ThemedText>
          </View>

          {firstSlot?.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={palette.muted} />
              <ThemedText style={[styles.detailText, { color: palette.text }]}>
                {firstSlot.location}
              </ThemedText>
            </View>
          )}

          {invite.priceUsd && (
            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={16} color={palette.muted} />
              <ThemedText style={[styles.detailText, { color: palette.text }]}>
                £{invite.priceUsd}
              </ThemedText>
            </View>
          )}
        </View>

        {invite.notes && (
          <ThemedText style={[styles.notes, { color: palette.muted }]} numberOfLines={2}>
            "{invite.notes}"
          </ThemedText>
        )}

        {/* Expiry countdown for pending invites */}
        {expiryText && (
          <View style={styles.expiryRow}>
            <Ionicons name="time-outline" size={14} color={palette.warning} />
            <ThemedText style={[styles.expiryText, { color: palette.warning }]}>
              {expiryText}
            </ThemedText>
          </View>
        )}

        {/* Action buttons for received pending invites */}
        {mode === 'received' && status === 'PENDING' && (
          <View style={styles.actionsRow}>
            <Clickable
              style={[styles.actionButton, styles.declineButton, { borderColor: palette.border }]}
              onPress={onQuickDecline}
            >
              <Ionicons name="close-outline" size={16} color={palette.text} />
              <ThemedText style={[styles.actionText, { color: palette.text }]}>
                Decline
              </ThemedText>
            </Clickable>
            <Clickable
              style={[styles.actionButton, styles.acceptButton, { backgroundColor: palette.tint }]}
              onPress={onPress}
            >
              <Ionicons name="checkmark-outline" size={16} color="#fff" />
              <ThemedText style={[styles.actionText, { color: '#fff' }]}>View & Accept</ThemedText>
            </Clickable>
          </View>
        )}
      </SurfaceCard>
    </Animated.View>
  );
}

export default function SessionInvitesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [invites, setInvites] = useState<SessionInvite[]>([]);
  const [mode, setMode] = useState<ViewMode>(currentUser?.role === 'COACH' ? 'sent' : 'received');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadInvites();
    }, [currentUser?.id, mode])
  );

  const loadInvites = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const data =
        mode === 'sent'
          ? await sessionInviteService.getCoachInvites(currentUser.id)
          : await sessionInviteService.getParentInvites(currentUser.id);
      setInvites(data);
    } catch (error) {
      console.error('Failed to load invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvites();
    setRefreshing(false);
  };

  const handleQuickDecline = async (invite: SessionInvite) => {
    Alert.alert(
      'Decline Invite',
      `Are you sure you want to decline the session invite from Coach ${invite.coachName}?`,
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
              loadInvites();
            } catch (error) {
              Alert.alert('Error', 'Failed to decline invite. Please try again.');
            }
          },
        },
      ]
    );
  };

  const pendingCount = invites.filter(
    (i) => i.status === 'PENDING' && new Date(i.expiresAt) > new Date()
  ).length;

  const isCoach = currentUser?.role === 'COACH';
  const isParent = currentUser?.role === 'PARENT';

  // Apply filter
  const filteredInvites = invites.filter((invite) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return invite.status === 'PENDING' && new Date(invite.expiresAt) > new Date();
    if (filter === 'responded') return invite.status !== 'PENDING';
    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Session Invites</ThemedText>
          {pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: palette.error }]}>
              <ThemedText style={styles.badgeText}>{pendingCount}</ThemedText>
            </View>
          )}
        </View>
        {isCoach && (
          <Clickable
            onPress={() => router.push('/session-invites/create')}
            style={[styles.createButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Clickable>
        )}
      </View>

      {/* View Toggle (for coaches who can see both) */}
      {isCoach && (
        <View style={styles.toggleRow}>
          <Chip
            label="Sent Invites"
            selected={mode === 'sent'}
            onPress={() => setMode('sent')}
          />
          <Chip
            label="Received"
            selected={mode === 'received'}
            onPress={() => setMode('received')}
          />
        </View>
      )}

      {/* Filter chips for parents */}
      {(isParent || mode === 'received') && invites.length > 0 && (
        <View style={styles.filterRow}>
          <Chip
            label="All"
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <Chip
            label={`Pending (${pendingCount})`}
            selected={filter === 'pending'}
            onPress={() => setFilter('pending')}
          />
          <Chip
            label="Responded"
            selected={filter === 'responded'}
            onPress={() => setFilter('responded')}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />
        }
      >
        {/* Pending invites highlight for parents */}
        {isParent && pendingCount > 0 && filter === 'all' && (
          <View style={[styles.pendingBanner, { backgroundColor: `${palette.warning}15` }]}>
            <Ionicons name="alert-circle" size={20} color={palette.warning} />
            <ThemedText style={[styles.pendingBannerText, { color: palette.text }]}>
              You have {pendingCount} pending invite{pendingCount > 1 ? 's' : ''} awaiting your response
            </ThemedText>
          </View>
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
          <View style={styles.list}>
            {filteredInvites.map((invite, index) => (
              <InviteCard
                key={invite.id}
                invite={invite}
                index={index}
                mode={mode}
                onPress={() =>
                  router.push({
                    pathname: '/session-invites/[id]',
                    params: { id: invite.id },
                  })
                }
                onQuickDecline={() => handleQuickDecline(invite)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  list: {
    gap: Spacing.md,
  },
  inviteCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  invitationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  invitationText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  clubName: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
  },
  sessionType: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 13,
  },
  notes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  declineButton: {
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
  },
  acceptButton: {
    flexDirection: 'row',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  pendingBannerText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
