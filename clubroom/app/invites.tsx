/**
 * Invites Screen
 *
 * Inbox for parents/athletes to view and respond to session invites from coaches.
 *
 * USER STORY:
 * "As a parent, I want to receive session invites from coaches so I can
 * easily book coaching for my child without searching for coaches."
 *
 * FLOW:
 * 1. Coach creates session invite selecting specific athletes
 * 2. Parent gets notification and sees invite in this inbox
 * 3. Parent can Accept (select time slot), Decline, or Counter-propose
 * 4. On Accept, booking is automatically created
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { inviteService as sessionInviteService, inviteRsvpService } from '@/services/invite';
import type { SessionInvite, TimeSlot } from '@/constants/types';
import { RsvpButtonGroup } from '@/components/invite/rsvp-button-group';
import { createLogger } from '@/utils/logger';

const logger = createLogger('InvitesScreen');

type TabFilter = 'pending' | 'maybe' | 'responded';

export default function InvitesScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [invites, setInvites] = useState<SessionInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tabFilter, setTabFilter] = useState<TabFilter>('pending');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!currentUser) return;

    try {
      const parentInvites = await sessionInviteService.getParentInvites(currentUser.id);
      setInvites(parentInvites);
      setError(null);
      logger.debug('Loaded invites', { count: parentInvites.length });
    } catch (err) {
      logger.error('Failed to load invites', err);
      setError('Failed to load invites. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  useFocusEffect(
    useCallback(() => {
      loadInvites();
    }, [loadInvites])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvites();
  };

  const filteredInvites = invites.filter(invite => {
    if (tabFilter === 'pending') {
      return invite.status === 'PENDING' && new Date(invite.expiresAt) > new Date();
    }
    if (tabFilter === 'maybe') {
      return invite.status === 'MAYBE';
    }
    return invite.status !== 'PENDING' && invite.status !== 'MAYBE';
  });

  const pendingCount = invites.filter(
    i => i.status === 'PENDING' && new Date(i.expiresAt) > new Date()
  ).length;

  const maybeCount = invites.filter(i => i.status === 'MAYBE').length;

  const handleAcceptInvite = async (invite: SessionInvite, selectedSlot: TimeSlot) => {
    setRespondingTo(invite.id);
    try {
      const result = await sessionInviteService.respondToInvite({
        inviteId: invite.id,
        response: 'ACCEPTED',
        selectedSlot,
      });

      if (!result.success) {
        Alert.alert(
          'Booking Failed',
          result.error?.message ?? 'Could not create the booking. Please try again.',
        );
        logger.error('Invite acceptance failed', { inviteId: invite.id, error: result.error?.message });
        return;
      }

      Alert.alert(
        'Booking Confirmed',
        `Session with ${invite.coachName} on ${new Date(selectedSlot.date).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })} at ${selectedSlot.startTime} has been booked.`,
        [{ text: 'Great!' }]
      );

      loadInvites();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept invite. Please try again.');
      logger.error('Failed to accept invite', error);
    } finally {
      setRespondingTo(null);
    }
  };

  const handleDeclineInvite = (invite: SessionInvite) => {
    Alert.alert(
      'Decline Invite',
      `Are you sure you want to decline this invite from ${invite.coachName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setRespondingTo(invite.id);
            try {
              await sessionInviteService.respondToInvite({
                inviteId: invite.id,
                response: 'DECLINED',
              });
              loadInvites();
            } catch (error) {
              Alert.alert('Error', 'Failed to decline invite.');
              logger.error('Failed to decline invite', error);
            } finally {
              setRespondingTo(null);
            }
          },
        },
      ]
    );
  };

  const showSlotPicker = (invite: SessionInvite) => {
    if (invite.proposedSlots.length === 1) {
      handleAcceptInvite(invite, invite.proposedSlots[0]);
      return;
    }

    // For multiple slots, show selection
    Alert.alert(
      'Select Time Slot',
      'Choose a time that works for you:',
      [
        ...invite.proposedSlots.map((slot, index) => ({
          text: `${new Date(slot.date).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })} at ${slot.startTime}`,
          onPress: () => handleAcceptInvite(invite, slot),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const formatExpiresIn = (expiresAt: string): string => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return 'Expires today';
    if (diffDays <= 7) return `Expires in ${diffDays} days`;
    return `Expires ${expires.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  };

  const handleRsvp = useCallback(async (inviteId: string, rsvpStatus: 'going' | 'maybe' | 'cant_go') => {
    if (!currentUser) return;
    try {
      const result = await inviteRsvpService.respondToInvite(
        inviteId,
        currentUser.id,
        currentUser.fullName || currentUser.username || 'User',
        rsvpStatus,
        undefined,
        undefined,
        currentUser.avatar,
      );
      if (!result.success) {
        Alert.alert('Error', result.error.message);
        return;
      }
      loadInvites();
    } catch (error) {
      Alert.alert('Error', 'Failed to respond. Please try again.');
      logger.error('Failed to RSVP', error);
    }
  }, [currentUser, loadInvites]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return { text: 'Accepted', color: palette.success };
      case 'DECLINED':
        return { text: 'Declined', color: palette.error };
      case 'COUNTERED':
        return { text: 'Counter Sent', color: palette.warning };
      case 'EXPIRED':
        return { text: 'Expired', color: palette.muted };
      case 'MAYBE':
        return { text: 'Maybe', color: palette.warning };
      default:
        return { text: 'Pending', color: palette.tint };
    }
  };

  const renderInvite = ({ item: invite }: { item: SessionInvite }) => {
    const isPending = invite.status === 'PENDING';
    const isExpired = new Date(invite.expiresAt) <= new Date();
    const isResponding = respondingTo === invite.id;
    const statusBadge = getStatusBadge(isExpired && isPending ? 'EXPIRED' : invite.status);

    return (
      <SurfaceCard style={styles.inviteCard}>
        {/* Header */}
        <View style={styles.inviteHeader}>
          <View style={styles.coachInfo}>
            {invite.coachPhotoUrl ? (
              <Image
                source={{ uri: invite.coachPhotoUrl }}
                style={styles.coachPhoto}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.coachPhoto, styles.coachPhotoPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                <ThemedText style={[styles.coachInitial, { color: palette.tint }]}>
                  {invite.coachName.charAt(0)}
                </ThemedText>
              </View>
            )}
            <View style={styles.coachDetails}>
              <ThemedText type="defaultSemiBold">{invite.coachName}</ThemedText>
              {invite.clubName && (
                <ThemedText style={[styles.clubName, { color: palette.muted }]}>
                  {invite.clubName}
                </ThemedText>
              )}
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusBadge.color, 0.09) }]}>
            <ThemedText style={[styles.statusText, { color: statusBadge.color }]}>
              {statusBadge.text}
            </ThemedText>
          </View>
        </View>

        {/* Athletes */}
        <View style={styles.athleteRow}>
          <Ionicons name="person-outline" size={16} color={palette.icon} />
          <ThemedText style={[styles.athleteNames, { color: palette.muted }]}>
            For: {invite.athleteNames.join(', ')}
          </ThemedText>
        </View>

        {/* Session Info */}
        <View style={styles.sessionInfo}>
          <ThemedText type="defaultSemiBold" style={styles.sessionType}>
            {invite.sessionType}
          </ThemedText>
          {invite.focus && (
            <View style={[styles.focusBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <ThemedText style={[styles.focusText, { color: palette.tint }]}>
                {invite.focus}
              </ThemedText>
            </View>
          )}
        </View>

        {invite.notes && (
          <ThemedText style={[styles.notes, { color: palette.muted }]} numberOfLines={2}>
            &quot;{invite.notes}&quot;
          </ThemedText>
        )}

        {/* Proposed Slots */}
        <View style={styles.slotsSection}>
          <ThemedText style={[styles.slotsLabel, { color: palette.muted }]}>
            Proposed time{invite.proposedSlots.length > 1 ? 's' : ''}:
          </ThemedText>
          <View style={styles.slotsList}>
            {invite.proposedSlots.slice(0, 3).map((slot, index) => (
              <View key={index} style={[styles.slotChip, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Ionicons name="calendar-outline" size={14} color={palette.icon} />
                <ThemedText style={styles.slotText}>
                  {new Date(slot.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })} {slot.startTime}
                </ThemedText>
              </View>
            ))}
            {invite.proposedSlots.length > 3 && (
              <ThemedText style={[styles.moreSlots, { color: palette.muted }]}>
                +{invite.proposedSlots.length - 3} more
              </ThemedText>
            )}
          </View>
        </View>

        {/* Price & Expiry */}
        <View style={styles.metaRow}>
          {invite.priceUsd !== undefined && invite.priceUsd > 0 && (
            <ThemedText type="defaultSemiBold" style={[styles.price, { color: palette.tint }]}>
              £{invite.priceUsd}
            </ThemedText>
          )}
          {isPending && !isExpired && (
            <ThemedText style={[styles.expires, { color: palette.warning }]}>
              {formatExpiresIn(invite.expiresAt)}
            </ThemedText>
          )}
        </View>

        {/* RSVP actions for pending/maybe invites */}
        {(isPending || invite.status === 'MAYBE') && !isExpired && (
          <View style={styles.rsvpSection}>
            <RsvpButtonGroup
              currentStatus={invite.status === 'MAYBE' ? 'maybe' : undefined}
              onRespond={(rsvpStatus) => handleRsvp(invite.id, rsvpStatus)}
              disabled={isResponding}
              compact
            />
            {isPending && (
              <View style={styles.actions}>
                <Pressable
                  style={[styles.declineButton, { borderColor: palette.border }]}
                  onPress={() => handleDeclineInvite(invite)}
                  disabled={isResponding}
                >
                  <ThemedText style={[styles.declineText, { color: palette.muted }]}>
                    Decline
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.acceptButton, { backgroundColor: palette.tint }]}
                  onPress={() => showSlotPicker(invite)}
                  disabled={isResponding}
                >
                  {isResponding ? (
                    <ThemedText style={[styles.acceptText, { color: palette.onPrimary }]}>Booking...</ThemedText>
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color={palette.onPrimary} />
                      <ThemedText style={[styles.acceptText, { color: palette.onPrimary }]}>Accept</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Show accepted slot */}
        {invite.status === 'ACCEPTED' && invite.selectedSlot && (
          <View style={[styles.confirmedSlot, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
            <Ionicons name="checkmark-circle" size={18} color={palette.success} />
            <ThemedText style={[styles.confirmedText, { color: palette.success }]}>
              Booked: {new Date(invite.selectedSlot.date).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })} at {invite.selectedSlot.startTime}
            </ThemedText>
          </View>
        )}
      </SurfaceCard>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title="Session Invites"
        subtitle={pendingCount > 0 ? `${pendingCount} pending invite${pendingCount !== 1 ? 's' : ''}` : 'From your coaches'}
        showBack
        onBackPress={() => router.back()}
      />

      {/* Tab Filter */}
      <View style={styles.tabRow}>
        <Pressable
          style={[
            styles.tab,
            {
              borderColor: tabFilter === 'pending' ? palette.tint : palette.border,
              backgroundColor: tabFilter === 'pending' ? withAlpha(palette.tint, 0.06) : 'transparent',
            },
          ]}
          onPress={() => setTabFilter('pending')}
        >
          <ThemedText
            style={[
              styles.tabText,
              { color: tabFilter === 'pending' ? palette.tint : palette.muted },
            ]}
          >
            Pending {pendingCount > 0 && `(${pendingCount})`}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            {
              borderColor: tabFilter === 'maybe' ? palette.tint : palette.border,
              backgroundColor: tabFilter === 'maybe' ? withAlpha(palette.tint, 0.06) : 'transparent',
            },
          ]}
          onPress={() => setTabFilter('maybe')}
        >
          <ThemedText
            style={[
              styles.tabText,
              { color: tabFilter === 'maybe' ? palette.tint : palette.muted },
            ]}
          >
            Maybe {maybeCount > 0 && `(${maybeCount})`}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            {
              borderColor: tabFilter === 'responded' ? palette.tint : palette.border,
              backgroundColor: tabFilter === 'responded' ? withAlpha(palette.tint, 0.06) : 'transparent',
            },
          ]}
          onPress={() => setTabFilter('responded')}
        >
          <ThemedText
            style={[
              styles.tabText,
              { color: tabFilter === 'responded' ? palette.tint : palette.muted },
            ]}
          >
            History
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={filteredInvites}
        keyExtractor={item => item.id}
        renderItem={renderInvite}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(error ? palette.error : palette.muted, 0.06) }]}>
              <Ionicons
                name={error ? 'alert-circle-outline' : tabFilter === 'pending' ? 'mail-outline' : tabFilter === 'maybe' ? 'help-circle-outline' : 'time-outline'}
                size={40}
                color={error ? palette.error : palette.muted}
              />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              {loading
                ? 'Loading invites...'
                : error
                  ? 'Something went wrong'
                  : tabFilter === 'pending'
                    ? 'No pending invites'
                    : tabFilter === 'maybe'
                      ? 'No maybe invites'
                      : 'No invite history'}
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              {error
                ? error
                : tabFilter === 'pending'
                  ? 'When coaches invite you to sessions, they will appear here'
                  : tabFilter === 'maybe'
                    ? 'Invites you marked as "maybe" will appear here'
                    : 'Your responded invites will show here'}
            </ThemedText>
            {error && !loading && (
              <Pressable
                style={[styles.retryButton, { borderColor: palette.tint }]}
                onPress={loadInvites}
              >
                <Ionicons name="refresh" size={18} color={palette.tint} />
                <ThemedText style={[styles.retryText, { color: palette.tint }]}>Retry</ThemedText>
              </Pressable>
            )}
          </View>
        }
        ItemSeparatorComponent={ItemSeparator}
      />
    </SafeAreaView>
  );
}

const ItemSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  tabText: {
    ...Typography.bodySmallSemiBold,
  },
  list: {
    padding: Spacing.md,
  },
  inviteCard: {
    gap: Spacing.sm,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  coachPhoto: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
  },
  coachPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitial: {
    ...Typography.heading,
  },
  coachDetails: {
    flex: 1,
  },
  clubName: {
    ...Typography.small,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  statusText: {
    ...Typography.caption,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  athleteNames: {
    ...Typography.small,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sessionType: {
    ...Typography.subheading,
  },
  focusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  focusText: {
    ...Typography.caption,
  },
  notes: {
    ...Typography.bodySmall,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  slotsSection: {
    gap: Spacing.xs,
  },
  slotsLabel: {
    ...Typography.caption,
  },
  slotsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  slotText: {
    ...Typography.small,
  },
  moreSlots: {
    ...Typography.caption,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    ...Typography.heading,
  },
  expires: {
    ...Typography.smallSemiBold,
  },
  rsvpSection: {
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  declineButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  declineText: {
    ...Typography.bodySemiBold,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  acceptText: {
    ...Typography.bodySemiBold,
  },
  confirmedSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  confirmedText: {
    ...Typography.bodySmallSemiBold,
  },
  separator: {
    height: Spacing.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.heading,
  },
  emptyText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
    marginTop: Spacing.sm,
  },
  retryText: {
    ...Typography.bodySemiBold,
  },
});
