/**
 * Squad Specific Invite Screen
 *
 * Dedicated screen for sending bulk invites from a specific squad.
 * Accessed via /squads/[squadId]/invite
 *
 * Similar to the general squad invite screen but pre-populated with
 * the squad from the URL parameter.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SquadMemberSelect } from '@/components/squad/SquadMemberSelect';
import { BulkInviteButton } from '@/components/squad/BulkInviteButton';
import { InviteResultCard } from '@/components/squad/InviteResultCard';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { squadBulkInviteService } from '@/services/squad-bulk-invite-service';
import { squadService } from '@/services/squad-service';
import type {
  ClubSquad,
  SquadMember,
  TimeSlot,
  BulkInviteResult,
  SquadSessionInvite,
  SquadInviteHistoryEntry,
} from '@/constants/types';

const SESSION_TYPES = ['1:1 Coaching', 'Group Session', 'Assessment', 'Training'];
const FOCUSES = ['Dribbling', 'Passing', 'Finishing', 'Defending', 'Goalkeeping', 'Conditioning'];

type ViewMode = 'form' | 'sending' | 'result';

export default function SquadInviteScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { id: squadId } = useLocalSearchParams<{ id: string }>();

  // Data state
  const [squad, setSquad] = useState<ClubSquad | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [inviteHistory, setInviteHistory] = useState<SquadInviteHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [sessionType, setSessionType] = useState(SESSION_TYPES[0]);
  const [focus, setFocus] = useState(FOCUSES[0]);
  const [sessionTitle, setSessionTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [proposedSlots, setProposedSlots] = useState<TimeSlot[]>([]);

  // Time slot form
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotLocation, setSlotLocation] = useState('');

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    squadInvite: SquadSessionInvite;
    result: BulkInviteResult;
  } | null>(null);

  useEffect(() => {
    if (squadId) {
      loadSquadData();
    }
  }, [squadId]);

  const loadSquadData = async () => {
    if (!squadId) return;
    setLoading(true);
    try {
      const [squadData, membersData, historyData] = await Promise.all([
        squadService.getSquad(squadId),
        squadService.getSquadMembers(squadId),
        squadBulkInviteService.getSquadInviteHistory(squadId),
      ]);

      setSquad(squadData);
      setMembers(membersData);
      setInviteHistory(historyData);

      if (squadData) {
        setSessionTitle(`${squadData.name} Training`);
      }

      // Select all members by default
      setSelectedMemberIds(membersData.map((m) => m.id));
    } catch (error) {
      console.error('Failed to load squad data:', error);
      Alert.alert('Error', 'Failed to load squad data');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = useCallback(() => {
    if (!slotDate || !slotStartTime || !slotEndTime) {
      Alert.alert('Missing fields', 'Please fill in date, start time, and end time');
      return;
    }
    const newSlot: TimeSlot = {
      date: slotDate,
      startTime: slotStartTime,
      endTime: slotEndTime,
      location: slotLocation || undefined,
    };
    setProposedSlots((prev) => [...prev, newSlot]);
    setSlotDate('');
    setSlotStartTime('');
    setSlotEndTime('');
    setSlotLocation('');
  }, [slotDate, slotStartTime, slotEndTime, slotLocation]);

  const removeTimeSlot = useCallback((index: number) => {
    setProposedSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uniqueParentCount = useMemo(() => {
    const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));
    const uniqueParents = new Set(selectedMembers.map((m) => m.parentId));
    return uniqueParents.size;
  }, [members, selectedMemberIds]);

  const canSend = useMemo(() => {
    return (
      selectedMemberIds.length > 0 &&
      sessionTitle.trim() !== '' &&
      sessionType !== '' &&
      focus !== '' &&
      proposedSlots.length > 0
    );
  }, [selectedMemberIds, sessionTitle, sessionType, focus, proposedSlots]);

  const sendBulkInvites = async () => {
    if (!currentUser || !squadId || !canSend) return;

    setSendingInvites(true);
    setViewMode('sending');

    try {
      const sessionId = `session_${Date.now()}`;
      const result = await squadBulkInviteService.createBulkInvite({
        squadId,
        sessionId,
        sessionTitle,
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        clubName: squad?.name,
        proposedSlots,
        sessionType,
        focus,
        notes: notes || undefined,
        priceUsd: price ? parseFloat(price) : undefined,
        expiresInDays: 7,
      });

      setInviteResult(result);
      setViewMode('result');
    } catch (error) {
      console.error('Failed to send bulk invites:', error);
      Alert.alert('Error', 'Failed to send invites. Please try again.');
      setViewMode('form');
    } finally {
      setSendingInvites(false);
    }
  };

  const handleDone = () => {
    router.back();
  };

  const handleViewInvites = () => {
    router.push('/session-invites');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading squad...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!squad) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={palette.error} />
          <ThemedText style={{ color: palette.error, marginTop: Spacing.md }}>
            Squad not found
          </ThemedText>
          <Clickable onPress={() => router.back()} style={[styles.backButton, { borderColor: palette.border }]}>
            <ThemedText>Go Back</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  if (viewMode === 'result' && inviteResult) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <ThemedText type="title">Invites Sent</ThemedText>
          <Clickable onPress={handleDone} hitSlop={8}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <InviteResultCard
            result={inviteResult.result}
            invitedMembers={inviteResult.squadInvite.invitedMembers}
            squadName={squad.name}
            sessionTitle={sessionTitle}
            onViewInvites={handleViewInvites}
            onDone={handleDone}
            showDetails
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title">Invite Squad</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {/* Squad Info Banner */}
      <View style={[styles.squadBanner, { backgroundColor: `${palette.tint}10` }]}>
        <View style={[styles.squadBannerIcon, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="people" size={20} color={palette.tint} />
        </View>
        <View style={styles.squadBannerInfo}>
          <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
          <ThemedText style={[styles.squadBannerMeta, { color: palette.muted }]}>
            {members.length} athletes {'\u2022'} {squad.level}
          </ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Recent Invites */}
        {inviteHistory.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Recent Invites
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {inviteHistory.slice(0, 3).map((entry) => (
                <View
                  key={entry.id}
                  style={[styles.historyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ fontSize: 13 }}>
                    {entry.sessionTitle}
                  </ThemedText>
                  <ThemedText style={[styles.historyMeta, { color: palette.muted }]}>
                    {entry.inviteCount} sent {'\u2022'} {entry.acceptedCount} accepted
                  </ThemedText>
                  <ThemedText style={[styles.historyDate, { color: palette.muted }]}>
                    {new Date(entry.sentAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Session Details */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Session Details
          </ThemedText>

          <View style={styles.formRow}>
            <ThemedText style={styles.formLabel}>Title</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text, borderColor: palette.border }]}
              placeholder="Session title"
              placeholderTextColor={palette.muted}
              value={sessionTitle}
              onChangeText={setSessionTitle}
            />
          </View>

          <View style={styles.formRow}>
            <ThemedText style={styles.formLabel}>Type</ThemedText>
            <View style={styles.optionsRow}>
              {SESSION_TYPES.map((type) => (
                <Clickable
                  key={type}
                  onPress={() => setSessionType(type)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: sessionType === type ? palette.tint : palette.surface,
                      borderColor: sessionType === type ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={{ color: sessionType === type ? '#fff' : palette.text, fontSize: 12 }}
                  >
                    {type}
                  </ThemedText>
                </Clickable>
              ))}
            </View>
          </View>

          <View style={styles.formRow}>
            <ThemedText style={styles.formLabel}>Focus</ThemedText>
            <View style={styles.optionsRow}>
              {FOCUSES.map((f) => (
                <Clickable
                  key={f}
                  onPress={() => setFocus(f)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: focus === f ? palette.tint : palette.surface,
                      borderColor: focus === f ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText style={{ color: focus === f ? '#fff' : palette.text, fontSize: 12 }}>
                    {f}
                  </ThemedText>
                </Clickable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Time Slots */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Time Slots
          </ThemedText>

          <SurfaceCard style={styles.slotFormCard}>
            <View style={styles.slotFormRow}>
              <View style={[styles.slotInput, { flex: 1 }]}>
                <TextInput
                  style={[styles.input, { color: palette.text, borderColor: palette.border }]}
                  placeholder="Date (2026-01-15)"
                  placeholderTextColor={palette.muted}
                  value={slotDate}
                  onChangeText={setSlotDate}
                />
              </View>
            </View>
            <View style={styles.slotFormRow}>
              <View style={styles.slotInput}>
                <TextInput
                  style={[styles.input, { color: palette.text, borderColor: palette.border }]}
                  placeholder="Start (16:00)"
                  placeholderTextColor={palette.muted}
                  value={slotStartTime}
                  onChangeText={setSlotStartTime}
                />
              </View>
              <View style={styles.slotInput}>
                <TextInput
                  style={[styles.input, { color: palette.text, borderColor: palette.border }]}
                  placeholder="End (17:00)"
                  placeholderTextColor={palette.muted}
                  value={slotEndTime}
                  onChangeText={setSlotEndTime}
                />
              </View>
            </View>
            <View style={styles.slotFormRow}>
              <View style={[styles.slotInput, { flex: 1 }]}>
                <TextInput
                  style={[styles.input, { color: palette.text, borderColor: palette.border }]}
                  placeholder="Location (optional)"
                  placeholderTextColor={palette.muted}
                  value={slotLocation}
                  onChangeText={setSlotLocation}
                />
              </View>
              <Clickable
                onPress={addTimeSlot}
                style={[styles.addButton, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </Clickable>
            </View>
          </SurfaceCard>

          {proposedSlots.length > 0 && (
            <View style={styles.slotsList}>
              {proposedSlots.map((slot, index) => (
                <View
                  key={index}
                  style={[styles.slotItem, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <View style={styles.slotInfo}>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 13 }}>
                      {new Date(slot.date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </ThemedText>
                    <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                      {slot.startTime} - {slot.endTime}
                      {slot.location && ` at ${slot.location}`}
                    </ThemedText>
                  </View>
                  <Clickable onPress={() => removeTimeSlot(index)}>
                    <Ionicons name="close-circle" size={20} color={palette.error} />
                  </Clickable>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Members Selection */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Select Athletes
          </ThemedText>

          <SquadMemberSelect
            squadId={squadId}
            selectedMemberIds={selectedMemberIds}
            onSelectionChange={setSelectedMemberIds}
            showSelectAll
            showNotificationCount
            maxHeight={300}
          />
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <BulkInviteButton
          selectedCount={selectedMemberIds.length}
          notificationCount={uniqueParentCount}
          onPress={sendBulkInvites}
          loading={sendingInvites}
          disabled={!canSend}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  backButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  squadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  squadBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadBannerInfo: {
    flex: 1,
    gap: 2,
  },
  squadBannerMeta: {
    fontSize: 12,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    marginBottom: Spacing.xs,
  },
  historyCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginRight: Spacing.sm,
    minWidth: 160,
    gap: 4,
  },
  historyMeta: {
    fontSize: 11,
  },
  historyDate: {
    fontSize: 10,
  },
  formRow: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  slotFormCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  slotFormRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  slotInput: {
    flex: 1,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotsList: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  slotInfo: {
    flex: 1,
    gap: 2,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
