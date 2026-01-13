/**
 * Squad Bulk Invite Screen
 *
 * Allows coaches to send bulk session invites to an entire squad.
 * Flow:
 * 1. Select squad(s)
 * 2. Configure session details (type, focus, time slots)
 * 3. Preview members and optionally exclude some
 * 4. Send invites with one tap
 * 5. See results
 */

import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { InlineSquadSelector } from '@/components/squad/squad-picker';
import { SquadMemberSelect } from '@/components/squad/SquadMemberSelect';
import { BulkInviteButton } from '@/components/squad/BulkInviteButton';
import { InviteResultCard } from '@/components/squad/InviteResultCard';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { inviteService as squadBulkInviteService } from '@/services/invite-service';
import { squadService } from '@/services/squad-service';
import { createLogger } from '@/utils/logger';
import type { TimeSlot, BulkInviteResult, ClubSquad, SquadSessionInvite, SquadInvitedMember } from '@/constants/types';

const logger = createLogger('SquadBulkInvite');

const SESSION_TYPES = ['1:1 Coaching', 'Group Session', 'Assessment', 'Training'];
const FOCUSES = ['Dribbling', 'Passing', 'Finishing', 'Defending', 'Goalkeeping', 'Conditioning'];

type Step = 'squad' | 'details' | 'members' | 'slots' | 'confirm' | 'result';

export default function SquadBulkInviteScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ squadId?: string; sessionId?: string }>();

  // State
  const [step, setStep] = useState<Step>('squad');
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>(
    params.squadId ? [params.squadId] : []
  );
  const [selectedSquad, setSelectedSquad] = useState<ClubSquad | null>(null);
  const [sessionType, setSessionType] = useState(SESSION_TYPES[0]);
  const [focus, setFocus] = useState(FOCUSES[0]);
  const [sessionTitle, setSessionTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [proposedSlots, setProposedSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    squadInvite: SquadSessionInvite;
    result: BulkInviteResult;
  } | null>(null);

  // Time slot form state
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotLocation, setSlotLocation] = useState('');

  // Get club ID from current user's club membership
  const clubId = currentUser?.clubId || currentUser?.primaryClubId || 'default_club';

  // Load squad when ID changes
  useEffect(() => {
    if (selectedSquadIds.length === 1) {
      loadSquad(selectedSquadIds[0]);
    } else {
      setSelectedSquad(null);
    }
  }, [selectedSquadIds]);

  const loadSquad = async (squadId: string) => {
    setLoading(true);
    try {
      const squad = await squadService.getSquad(squadId);
      setSelectedSquad(squad);
      if (squad) {
        setSessionTitle(`${squad.name} Training Session`);
      }
    } catch (error) {
      logger.error('Failed to load squad', error);
      Alert.alert('Error', 'Failed to load squad details');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = () => {
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
    setProposedSlots([...proposedSlots, newSlot]);
    setSlotDate('');
    setSlotStartTime('');
    setSlotEndTime('');
    setSlotLocation('');
  };

  const removeTimeSlot = (index: number) => {
    setProposedSlots(proposedSlots.filter((_, i) => i !== index));
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case 'squad':
        return selectedSquadIds.length > 0;
      case 'details':
        return sessionType && focus && sessionTitle.trim();
      case 'members':
        return selectedMemberIds.length > 0;
      case 'slots':
        return proposedSlots.length > 0;
      case 'confirm':
        return true;
      default:
        return false;
    }
  }, [step, selectedSquadIds, sessionType, focus, sessionTitle, selectedMemberIds, proposedSlots]);

  const nextStep = () => {
    const steps: Step[] = ['squad', 'details', 'members', 'slots', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['squad', 'details', 'members', 'slots', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  const uniqueParentCount = useMemo(() => {
    // This will be calculated properly when we have the members loaded
    // For now, approximate as 70-80% of selected members
    return Math.ceil(selectedMemberIds.length * 0.75);
  }, [selectedMemberIds]);

  const sendBulkInvites = async () => {
    if (!currentUser || selectedSquadIds.length === 0) return;

    setSendingInvites(true);
    try {
      const sessionId = params.sessionId || `session_${Date.now()}`;
      const result = await squadBulkInviteService.createBulkInvite({
        squadId: selectedSquadIds[0],
        sessionId,
        sessionTitle,
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        clubName: selectedSquad?.name,
        proposedSlots,
        sessionType,
        focus,
        notes: notes || undefined,
        priceUsd: price ? parseFloat(price) : undefined,
        expiresInDays: 7,
      });

      setInviteResult(result);
      setStep('result');
    } catch (error) {
      console.error('Failed to send bulk invites:', error);
      Alert.alert('Error', 'Failed to send invites. Please try again.');
    } finally {
      setSendingInvites(false);
    }
  };

  const handleViewInvites = () => {
    router.push('/session-invites');
  };

  const handleDone = () => {
    router.back();
  };

  const renderSquadStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Select Squad
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Choose a squad to invite to your training session
      </ThemedText>

      <InlineSquadSelector
        clubId={clubId}
        selectedSquadIds={selectedSquadIds}
        onSelectionChange={setSelectedSquadIds}
        multiSelect={false}
        label=""
      />

      {selectedSquad && (
        <SurfaceCard style={styles.squadPreview}>
          <View style={styles.squadPreviewHeader}>
            <View style={[styles.squadIcon, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="people" size={24} color={palette.tint} />
            </View>
            <View style={styles.squadPreviewInfo}>
              <ThemedText type="defaultSemiBold">{selectedSquad.name}</ThemedText>
              <ThemedText style={[styles.squadMeta, { color: palette.muted }]}>
                {selectedSquad.memberCount} athletes {'\u2022'} {selectedSquad.level}
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>
      )}
    </Animated.View>
  );

  const renderDetailsStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Session Details
      </ThemedText>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Session Title</ThemedText>
        <TextInput
          style={[styles.input, { color: palette.text, borderColor: palette.border }]}
          placeholder="e.g., U15 Squad Training"
          placeholderTextColor={palette.muted}
          value={sessionTitle}
          onChangeText={setSessionTitle}
        />
      </View>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Session Type</ThemedText>
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
                style={{ color: sessionType === type ? '#fff' : palette.text, fontSize: 13 }}
              >
                {type}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Focus Area</ThemedText>
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
              <ThemedText style={{ color: focus === f ? '#fff' : palette.text, fontSize: 13 }}>
                {f}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Notes (optional)</ThemedText>
        <TextInput
          style={[styles.textArea, { color: palette.text, borderColor: palette.border }]}
          placeholder="Additional details about the session..."
          placeholderTextColor={palette.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Price (optional)</ThemedText>
        <TextInput
          style={[styles.input, { color: palette.text, borderColor: palette.border }]}
          placeholder="e.g., 25"
          placeholderTextColor={palette.muted}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
      </View>
    </Animated.View>
  );

  const renderMembersStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Select Members
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Choose which squad members to invite
      </ThemedText>

      {selectedSquadIds.length > 0 && (
        <SquadMemberSelect
          squadId={selectedSquadIds[0]}
          sessionId={params.sessionId}
          selectedMemberIds={selectedMemberIds}
          onSelectionChange={setSelectedMemberIds}
          showSelectAll
          showNotificationCount
          maxHeight={350}
        />
      )}
    </Animated.View>
  );

  const renderSlotsStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Propose Time Slots
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Add one or more time options for parents to choose from
      </ThemedText>

      <SurfaceCard style={styles.addSlotCard}>
        <View style={styles.slotFormRow}>
          <View style={styles.slotInput}>
            <ThemedText style={styles.inputLabel}>Date</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text, borderColor: palette.border }]}
              placeholder="2026-01-15"
              placeholderTextColor={palette.muted}
              value={slotDate}
              onChangeText={setSlotDate}
            />
          </View>
        </View>
        <View style={styles.slotFormRow}>
          <View style={styles.slotInput}>
            <ThemedText style={styles.inputLabel}>Start</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text, borderColor: palette.border }]}
              placeholder="16:00"
              placeholderTextColor={palette.muted}
              value={slotStartTime}
              onChangeText={setSlotStartTime}
            />
          </View>
          <View style={styles.slotInput}>
            <ThemedText style={styles.inputLabel}>End</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text, borderColor: palette.border }]}
              placeholder="17:00"
              placeholderTextColor={palette.muted}
              value={slotEndTime}
              onChangeText={setSlotEndTime}
            />
          </View>
        </View>
        <View style={styles.slotFormRow}>
          <View style={[styles.slotInput, { flex: 1 }]}>
            <ThemedText style={styles.inputLabel}>Location (optional)</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text, borderColor: palette.border }]}
              placeholder="e.g., Hackney Marshes"
              placeholderTextColor={palette.muted}
              value={slotLocation}
              onChangeText={setSlotLocation}
            />
          </View>
        </View>
        <Clickable
          onPress={addTimeSlot}
          style={[styles.addSlotButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Add Time Slot</ThemedText>
        </Clickable>
      </SurfaceCard>

      {proposedSlots.length > 0 && (
        <View style={styles.slotsList}>
          <ThemedText style={styles.formLabel}>Proposed Slots ({proposedSlots.length})</ThemedText>
          {proposedSlots.map((slot, index) => (
            <View
              key={index}
              style={[styles.slotItem, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={styles.slotInfo}>
                <ThemedText type="defaultSemiBold">
                  {new Date(slot.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </ThemedText>
                <ThemedText style={{ color: palette.muted }}>
                  {slot.startTime} - {slot.endTime}
                  {slot.location && ` at ${slot.location}`}
                </ThemedText>
              </View>
              <Clickable onPress={() => removeTimeSlot(index)}>
                <Ionicons name="close-circle" size={22} color={palette.error} />
              </Clickable>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );

  const renderConfirmStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Confirm & Send
      </ThemedText>

      <View style={[styles.summaryBanner, { backgroundColor: `${palette.tint}10` }]}>
        <Ionicons name="paper-plane" size={24} color={palette.tint} />
        <View style={styles.summaryBannerText}>
          <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
            Ready to send {uniqueParentCount} invite{uniqueParentCount !== 1 ? 's' : ''}
          </ThemedText>
          <ThemedText style={{ color: palette.tint, fontSize: 12 }}>
            to {selectedMemberIds.length} athlete{selectedMemberIds.length !== 1 ? 's' : ''} in {selectedSquad?.name}
          </ThemedText>
        </View>
      </View>

      <SurfaceCard style={styles.confirmCard}>
        <View style={styles.confirmRow}>
          <Ionicons name="football-outline" size={18} color={palette.muted} />
          <ThemedText style={{ flex: 1 }}>{sessionTitle}</ThemedText>
        </View>
        <View style={styles.confirmRow}>
          <Ionicons name="fitness-outline" size={18} color={palette.muted} />
          <ThemedText style={{ flex: 1 }}>
            {sessionType} - {focus}
          </ThemedText>
        </View>
        <View style={styles.confirmRow}>
          <Ionicons name="calendar-outline" size={18} color={palette.muted} />
          <ThemedText style={{ flex: 1 }}>{proposedSlots.length} time slot(s) proposed</ThemedText>
        </View>
        <View style={styles.confirmRow}>
          <Ionicons name="people-outline" size={18} color={palette.muted} />
          <ThemedText style={{ flex: 1 }}>
            {selectedMemberIds.length} athlete{selectedMemberIds.length !== 1 ? 's' : ''} selected
          </ThemedText>
        </View>
        {price && (
          <View style={styles.confirmRow}>
            <Ionicons name="pricetag-outline" size={18} color={palette.muted} />
            <ThemedText style={{ flex: 1 }}>${price}</ThemedText>
          </View>
        )}
        {notes && (
          <View style={styles.confirmRow}>
            <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
            <ThemedText style={{ flex: 1 }} numberOfLines={2}>
              {notes}
            </ThemedText>
          </View>
        )}
      </SurfaceCard>

      <ThemedText style={[styles.disclaimer, { color: palette.muted }]}>
        Parents will receive a notification and have 7 days to respond. They can accept one of the
        proposed time slots, decline, or suggest alternative times.
      </ThemedText>
    </Animated.View>
  );

  const renderResultStep = () => {
    if (!inviteResult) return null;

    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
        <InviteResultCard
          result={inviteResult.result}
          invitedMembers={inviteResult.squadInvite.invitedMembers}
          squadName={selectedSquad?.name}
          sessionTitle={sessionTitle}
          onViewInvites={handleViewInvites}
          onDone={handleDone}
          showDetails
        />
      </Animated.View>
    );
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ['squad', 'details', 'members', 'slots', 'confirm'];
    if (step === 'result') return null;

    const currentIndex = steps.indexOf(step);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, index) => (
          <View key={s} style={styles.stepIndicatorItem}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: index <= currentIndex ? palette.tint : palette.border,
                },
              ]}
            >
              {index < currentIndex && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: index < currentIndex ? palette.tint : palette.border },
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={step === 'result' ? handleDone : prevStep} hitSlop={8}>
          <Ionicons
            name={step === 'squad' || step === 'result' ? 'close' : 'arrow-back'}
            size={24}
            color={palette.text}
          />
        </Clickable>
        <ThemedText type="title">Squad Bulk Invite</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'squad' && renderSquadStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'members' && renderMembersStep()}
        {step === 'slots' && renderSlotsStep()}
        {step === 'confirm' && renderConfirmStep()}
        {step === 'result' && renderResultStep()}
      </ScrollView>

      {/* Footer */}
      {step !== 'result' && (
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          {step === 'confirm' ? (
            <BulkInviteButton
              selectedCount={selectedMemberIds.length}
              notificationCount={uniqueParentCount}
              onPress={sendBulkInvites}
              loading={sendingInvites}
              disabled={!canProceed}
            />
          ) : (
            <Clickable
              onPress={nextStep}
              disabled={!canProceed}
              style={[
                styles.nextButton,
                { backgroundColor: palette.tint, opacity: canProceed ? 1 : 0.5 },
              ]}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Continue</ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Clickable>
          )}
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 32,
    height: 2,
    marginHorizontal: 4,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: Spacing['2xl'],
  },
  stepContent: {
    gap: Spacing.md,
  },
  stepTitle: {
    fontSize: 20,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  squadPreview: {
    marginTop: Spacing.sm,
  },
  squadPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  squadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadPreviewInfo: {
    flex: 1,
    gap: 2,
  },
  squadMeta: {
    fontSize: 12,
  },
  formSection: {
    gap: Spacing.xs,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  addSlotCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  slotFormRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  slotInput: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  slotsList: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  slotInfo: {
    flex: 1,
    gap: 2,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  summaryBannerText: {
    flex: 1,
    gap: 2,
  },
  confirmCard: {
    gap: Spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  disclaimer: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
});
