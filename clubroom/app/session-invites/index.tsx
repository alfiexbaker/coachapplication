import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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

function InviteCard({
  invite,
  index,
  mode,
  onPress,
}: {
  invite: SessionInvite;
  index: number;
  mode: ViewMode;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isExpired = new Date(invite.expiresAt) < new Date();
  const status = isExpired && invite.status === 'PENDING' ? 'EXPIRED' : invite.status;

  const statusColors: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#FEF3C7', text: '#92400E' },
    ACCEPTED: { bg: '#D1FAE5', text: '#065F46' },
    DECLINED: { bg: '#FEE2E2', text: '#991B1B' },
    EXPIRED: { bg: '#F3F4F6', text: '#6B7280' },
    COUNTERED: { bg: '#DBEAFE', text: '#1E40AF' },
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

  const firstSlot = invite.proposedSlots[0];
  const slotDate = firstSlot
    ? new Date(firstSlot.date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.inviteCard} onPress={onPress}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: `${palette.tint}10` }]}>
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {initials}
            </ThemedText>
          </View>

          <View style={styles.headerContent}>
            <ThemedText type="defaultSemiBold" style={styles.name}>
              {displayName}
            </ThemedText>
            <ThemedText style={[styles.sessionType, { color: palette.muted }]}>
              {invite.sessionType} · {invite.focus}
            </ThemedText>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
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

        {mode === 'received' && status === 'PENDING' && (
          <View style={styles.actionsRow}>
            <Clickable
              style={[styles.actionButton, styles.declineButton, { borderColor: palette.border }]}
              onPress={() => {}}
            >
              <ThemedText style={[styles.actionText, { color: palette.text }]}>
                Decline
              </ThemedText>
            </Clickable>
            <Clickable
              style={[styles.actionButton, styles.acceptButton, { backgroundColor: palette.tint }]}
              onPress={() => {}}
            >
              <ThemedText style={[styles.actionText, { color: '#fff' }]}>Accept</ThemedText>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvites();
  }, [currentUser?.id, mode]);

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

  const pendingCount = invites.filter(
    (i) => i.status === 'PENDING' && new Date(i.expiresAt) > new Date()
  ).length;

  const isCoach = currentUser?.role === 'COACH';

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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {invites.length === 0 ? (
          <EmptyState
            icon={mode === 'sent' ? 'paper-plane-outline' : 'mail-outline'}
            title={mode === 'sent' ? 'No invites sent' : 'No invites received'}
            message={
              mode === 'sent'
                ? 'Invite athletes to sessions from their profile or your roster'
                : 'Session invites from coaches will appear here'
            }
          />
        ) : (
          <View style={styles.list}>
            {invites.map((invite, index) => (
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
  },
  acceptButton: {},
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
