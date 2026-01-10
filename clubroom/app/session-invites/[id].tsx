import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { sessionInviteService } from '@/services/session-invite-service';
import type { SessionInvite, TimeSlot } from '@/constants/types';

export default function SessionInviteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [invite, setInvite] = useState<SessionInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const isCoach = currentUser?.role === 'COACH';
  const isOwner = invite?.coachId === currentUser?.id;
  const isRecipient = invite?.parentId === currentUser?.id;

  useEffect(() => {
    loadInvite();
  }, [id]);

  const loadInvite = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await sessionInviteService.getInvite(id);
      setInvite(data);
    } catch (error) {
      console.error('Failed to load invite:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invite || selectedSlot === null) {
      Alert.alert('Select a time', 'Please select one of the proposed time slots');
      return;
    }
    setResponding(true);
    try {
      await sessionInviteService.respondToInvite({
        inviteId: invite.id,
        response: 'ACCEPTED',
        selectedSlot: invite.proposedSlots[selectedSlot],
      });
      Alert.alert('Accepted!', 'The session has been confirmed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to accept invite:', error);
      Alert.alert('Error', 'Failed to accept invite. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = () => {
    Alert.alert('Decline Invite', 'Are you sure you want to decline this session invite?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          if (!invite) return;
          setResponding(true);
          try {
            await sessionInviteService.respondToInvite({
              inviteId: invite.id,
              response: 'DECLINED',
            });
            Alert.alert('Declined', 'The invite has been declined.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error) {
            console.error('Failed to decline invite:', error);
          } finally {
            setResponding(false);
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Invite', 'Are you sure you want to cancel this invite?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          if (!invite) return;
          try {
            await sessionInviteService.cancelInvite(invite.id);
            Alert.alert('Cancelled', 'The invite has been cancelled.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error) {
            console.error('Failed to cancel invite:', error);
          }
        },
      },
    ]);
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#FEF3C7', text: '#92400E' },
    ACCEPTED: { bg: '#D1FAE5', text: '#065F46' },
    DECLINED: { bg: '#FEE2E2', text: '#991B1B' },
    EXPIRED: { bg: '#F3F4F6', text: '#6B7280' },
    COUNTERED: { bg: '#DBEAFE', text: '#1E40AF' },
  };

  if (loading || !invite) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isExpired = new Date(invite.expiresAt) < new Date();
  const status = isExpired && invite.status === 'PENDING' ? 'EXPIRED' : invite.status;
  const statusConfig = statusColors[status] || statusColors.PENDING;
  const canRespond = status === 'PENDING' && isRecipient;

  // Build invitation message
  const coachFirstName = invite.coachName.split(' ')[0];
  const athleteDisplay = invite.athleteNames.length === 1
    ? invite.athleteNames[0]
    : `${invite.athleteNames.length} athletes`;
  const invitationMessage = invite.clubName
    ? `Coach ${coachFirstName} has invited ${athleteDisplay} to ${invite.clubName}`
    : `Coach ${coachFirstName} has invited ${athleteDisplay} to a ${invite.sessionType.toLowerCase()}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title">Session Invite</ThemedText>
        {isOwner && status === 'PENDING' && (
          <Clickable onPress={handleCancel} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={palette.error} />
          </Clickable>
        )}
        {!isOwner && <View style={{ width: 24 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.statusBanner, { backgroundColor: statusConfig.bg }]}
        >
          <Ionicons
            name={
              status === 'ACCEPTED'
                ? 'checkmark-circle'
                : status === 'DECLINED'
                ? 'close-circle'
                : status === 'EXPIRED'
                ? 'time'
                : 'hourglass'
            }
            size={20}
            color={statusConfig.text}
          />
          <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
            {status === 'PENDING'
              ? 'Awaiting Response'
              : status === 'ACCEPTED'
              ? 'Session Confirmed'
              : status === 'DECLINED'
              ? 'Invite Declined'
              : status === 'EXPIRED'
              ? 'Invite Expired'
              : 'Counter Proposal Sent'}
          </ThemedText>
        </Animated.View>

        {/* Invitation Message */}
        {!isCoach && (
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <View style={[styles.invitationBanner, { backgroundColor: `${palette.tint}10` }]}>
              <Ionicons name="mail-outline" size={20} color={palette.tint} />
              <ThemedText style={[styles.invitationText, { color: palette.text }]}>
                {invitationMessage}
              </ThemedText>
            </View>
          </Animated.View>
        )}

        {/* Coach/Parent Info */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.infoCard}>
            <View style={styles.personRow}>
              <View style={[styles.avatar, { backgroundColor: `${palette.tint}10` }]}>
                <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                  {isCoach
                    ? invite.athleteNames[0]?.charAt(0) || 'A'
                    : invite.coachName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                </ThemedText>
              </View>
              <View style={styles.personInfo}>
                <ThemedText style={[styles.roleLabel, { color: palette.muted }]}>
                  {isCoach ? 'Athletes' : 'Coach'}
                </ThemedText>
                <ThemedText type="subtitle">
                  {isCoach ? invite.athleteNames.join(', ') : `Coach ${invite.coachName}`}
                </ThemedText>
                {invite.clubName && !isCoach && (
                  <ThemedText style={[styles.clubName, { color: palette.tint }]}>
                    {invite.clubName}
                  </ThemedText>
                )}
                {isCoach && (
                  <ThemedText style={[styles.roleLabel, { color: palette.muted }]}>
                    Parent: {invite.parentName}
                  </ThemedText>
                )}
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Session Details */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <SurfaceCard style={styles.detailsCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Session Details
            </ThemedText>

            <View style={styles.detailRow}>
              <Ionicons name="football-outline" size={18} color={palette.muted} />
              <View style={styles.detailContent}>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Type & Focus</ThemedText>
                <ThemedText>
                  {invite.sessionType} - {invite.focus}
                </ThemedText>
              </View>
            </View>

            {invite.priceUsd && (
              <View style={styles.detailRow}>
                <Ionicons name="pricetag-outline" size={18} color={palette.muted} />
                <View style={styles.detailContent}>
                  <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Price</ThemedText>
                  <ThemedText>${invite.priceUsd}</ThemedText>
                </View>
              </View>
            )}

            {invite.notes && (
              <View style={styles.detailRow}>
                <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
                <View style={styles.detailContent}>
                  <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Notes</ThemedText>
                  <ThemedText>{invite.notes}</ThemedText>
                </View>
              </View>
            )}
          </SurfaceCard>
        </Animated.View>

        {/* Time Slots */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SurfaceCard style={styles.slotsCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {canRespond ? 'Select a Time Slot' : 'Proposed Times'}
            </ThemedText>

            {invite.proposedSlots.map((slot, index) => {
              const isSelected = selectedSlot === index;
              const slotDate = new Date(slot.date);

              return (
                <Clickable
                  key={index}
                  onPress={() => canRespond && setSelectedSlot(index)}
                  disabled={!canRespond}
                  style={[
                    styles.slotItem,
                    {
                      backgroundColor: isSelected ? `${palette.tint}10` : palette.surface,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <View style={styles.slotDate}>
                    <ThemedText style={[styles.slotDay, { color: palette.tint }]}>
                      {slotDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </ThemedText>
                    <ThemedText type="heading">{slotDate.getDate()}</ThemedText>
                    <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                      {slotDate.toLocaleDateString('en-GB', { month: 'short' })}
                    </ThemedText>
                  </View>

                  <View style={styles.slotDetails}>
                    <ThemedText type="defaultSemiBold">
                      {slot.startTime} - {slot.endTime}
                    </ThemedText>
                    {slot.location && (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={palette.muted} />
                        <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                          {slot.location}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  {canRespond && (
                    <View
                      style={[
                        styles.radioButton,
                        {
                          backgroundColor: isSelected ? palette.tint : 'transparent',
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  )}
                </Clickable>
              );
            })}
          </SurfaceCard>
        </Animated.View>

        {/* Expiry Info */}
        {status === 'PENDING' && (
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <View style={[styles.expiryBanner, { backgroundColor: `${palette.warning}10` }]}>
              <Ionicons name="time-outline" size={16} color={palette.warning} />
              <ThemedText style={{ color: palette.warning, fontSize: 13 }}>
                Expires {new Date(invite.expiresAt).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </ThemedText>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {canRespond && (
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <Clickable
            onPress={handleDecline}
            disabled={responding}
            style={[styles.declineButton, { borderColor: palette.border }]}
          >
            <ThemedText style={{ fontWeight: '600' }}>Decline</ThemedText>
          </Clickable>
          <Clickable
            onPress={handleAccept}
            disabled={responding || selectedSlot === null}
            style={[
              styles.acceptButton,
              {
                backgroundColor: palette.tint,
                opacity: responding || selectedSlot === null ? 0.5 : 1,
              },
            ]}
          >
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
              {responding ? 'Accepting...' : 'Accept & Confirm'}
            </ThemedText>
          </Clickable>
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  statusText: {
    fontWeight: '600',
  },
  invitationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  invitationText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
  },
  clubName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  infoCard: {
    padding: Spacing.md,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  personInfo: {
    flex: 1,
    gap: 2,
  },
  roleLabel: {
    fontSize: 12,
  },
  detailsCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  slotsCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  slotDate: {
    alignItems: 'center',
    width: 50,
  },
  slotDay: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  slotDetails: {
    flex: 1,
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
  },
  declineButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  acceptButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radii.md,
  },
});
