import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { InviteAthleteModal, type Athlete, type Squad } from '@/components/coach/invite-athlete-modal';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { sessionInviteService } from '@/services/session-invite-service';
import { rosterService } from '@/services/roster-service';
import type { TimeSlot, RosterEntry } from '@/constants/types';

const SESSION_TYPES = ['1:1 Coaching', 'Group Session', 'Assessment', 'Trial'];
const FOCUSES = ['Dribbling', 'Passing', 'Finishing', 'Defending', 'Goalkeeping', 'Conditioning'];

type Step = 'target' | 'athletes' | 'type' | 'slots' | 'preview' | 'confirm';
type TargetType = 'individual' | 'squad' | 'custom';

// Mock squads for demonstration
const MOCK_SQUADS: Squad[] = [
  { id: 'squad_1', name: 'U12 Eagles' },
  { id: 'squad_2', name: 'U14 Hawks' },
  { id: 'squad_3', name: 'Beginners Group' },
];

export default function GroupInviteScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [step, setStep] = useState<Step>('target');
  const [targetType, setTargetType] = useState<TargetType | null>(null);
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [showAthleteModal, setShowAthleteModal] = useState(false);
  const [sessionType, setSessionType] = useState('');
  const [focus, setFocus] = useState('');
  const [proposedSlots, setProposedSlots] = useState<TimeSlot[]>([]);
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  // Time slot form
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotLocation, setSlotLocation] = useState('');

  // Roster data
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  useEffect(() => {
    loadRoster();
  }, [currentUser?.id]);

  const loadRoster = async () => {
    if (!currentUser?.id) return;
    setLoadingRoster(true);
    try {
      const data = await rosterService.getRoster(currentUser.id, { status: 'ACTIVE' });
      setRoster(data);
    } catch (error) {
      console.error('Failed to load roster:', error);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Convert roster entries to Athlete format
  const rosterAsAthletes: Athlete[] = roster.map((r) => ({
    id: r.athleteId,
    name: r.athleteName,
    parentId: r.parentId,
    parentName: r.parentName,
    age: r.athleteAge,
    skillLevel: r.athleteSkillLevel,
    photoUrl: r.athletePhotoUrl,
    squadId: r.tags.find((t) => t.startsWith('squad:'))?.replace('squad:', '') || undefined,
    squadName: r.tags.find((t) => t.startsWith('squad:'))?.replace('squad:', '') || undefined,
    tags: r.tags,
  }));

  const handleTargetSelect = (type: TargetType) => {
    setTargetType(type);
    if (type === 'individual' || type === 'custom') {
      setShowAthleteModal(true);
    }
  };

  const handleSquadSelect = (squadId: string) => {
    setSelectedSquadId(squadId);
    // Select all athletes in this squad
    const squadAthletes = rosterAsAthletes.filter((a) => a.squadId === squadId || a.tags?.includes(squadId));
    setSelectedAthletes(squadAthletes.length > 0 ? squadAthletes : rosterAsAthletes);
    setStep('type');
  };

  const handleAthletesSelected = (athletes: Athlete[]) => {
    setSelectedAthletes(athletes);
    setShowAthleteModal(false);
    if (athletes.length > 0) {
      setStep('type');
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

  const canProceed = () => {
    switch (step) {
      case 'target':
        return targetType !== null;
      case 'athletes':
        return selectedAthletes.length > 0;
      case 'type':
        return sessionType && focus;
      case 'slots':
        return proposedSlots.length > 0;
      case 'preview':
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['target', 'athletes', 'type', 'slots', 'preview', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      // Skip athletes step if we already have athletes selected
      if (step === 'target' && selectedAthletes.length > 0) {
        setStep('type');
      } else {
        setStep(steps[currentIndex + 1]);
      }
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['target', 'athletes', 'type', 'slots', 'preview', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  const submitBulkInvites = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const groupId = `group_${Date.now()}`;

      // Group athletes by parent for sending invites
      const parentMap = new Map<string, Athlete[]>();
      selectedAthletes.forEach((athlete) => {
        const existing = parentMap.get(athlete.parentId) || [];
        parentMap.set(athlete.parentId, [...existing, athlete]);
      });

      // Create bulk invites
      const inviteInputs = Array.from(parentMap.entries()).map(([parentId, athletes]) => ({
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        athleteIds: athletes.map((a) => a.id),
        athleteNames: athletes.map((a) => a.name),
        parentId,
        parentName: athletes[0].parentName,
        proposedSlots,
        sessionType,
        focus,
        notes: notes || undefined,
        priceUsd: price ? parseFloat(price) : undefined,
        expiresInDays: 7,
        groupId,
      }));

      await sessionInviteService.createBulk(inviteInputs);

      Alert.alert(
        'Invites Sent',
        `Successfully sent ${inviteInputs.length} invite${inviteInputs.length !== 1 ? 's' : ''} to ${selectedAthletes.length} athlete${selectedAthletes.length !== 1 ? 's' : ''}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to create bulk invites:', error);
      Alert.alert('Error', 'Failed to send invites. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ['target', 'type', 'slots', 'preview', 'confirm'];
    const currentIndex = steps.indexOf(step);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, index) => (
          <View key={s} style={styles.stepItem}>
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

  const renderTargetStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Who do you want to invite?
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Select how you want to choose athletes for this session
      </ThemedText>

      <View style={styles.targetOptions}>
        <Clickable
          onPress={() => handleTargetSelect('individual')}
          style={[
            styles.targetCard,
            {
              backgroundColor: targetType === 'individual' ? `${palette.tint}10` : palette.surface,
              borderColor: targetType === 'individual' ? palette.tint : palette.border,
            },
          ]}
        >
          <View style={[styles.targetIcon, { backgroundColor: `${palette.tint}15` }]}>
            <Ionicons name="person" size={24} color={palette.tint} />
          </View>
          <View style={styles.targetInfo}>
            <ThemedText type="defaultSemiBold">Individual Athletes</ThemedText>
            <ThemedText style={[styles.targetDescription, { color: palette.muted }]}>
              Pick specific athletes from your roster
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Clickable>

        <Clickable
          onPress={() => {
            setTargetType('squad');
          }}
          style={[
            styles.targetCard,
            {
              backgroundColor: targetType === 'squad' ? `${palette.tint}10` : palette.surface,
              borderColor: targetType === 'squad' ? palette.tint : palette.border,
            },
          ]}
        >
          <View style={[styles.targetIcon, { backgroundColor: `${palette.tint}15` }]}>
            <Ionicons name="people" size={24} color={palette.tint} />
          </View>
          <View style={styles.targetInfo}>
            <ThemedText type="defaultSemiBold">Entire Squad</ThemedText>
            <ThemedText style={[styles.targetDescription, { color: palette.muted }]}>
              Invite all athletes in a specific group
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Clickable>

        <Clickable
          onPress={() => handleTargetSelect('custom')}
          style={[
            styles.targetCard,
            {
              backgroundColor: targetType === 'custom' ? `${palette.tint}10` : palette.surface,
              borderColor: targetType === 'custom' ? palette.tint : palette.border,
            },
          ]}
        >
          <View style={[styles.targetIcon, { backgroundColor: `${palette.tint}15` }]}>
            <Ionicons name="filter" size={24} color={palette.tint} />
          </View>
          <View style={styles.targetInfo}>
            <ThemedText type="defaultSemiBold">Custom Selection</ThemedText>
            <ThemedText style={[styles.targetDescription, { color: palette.muted }]}>
              Filter by skill level, age, or other criteria
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Clickable>
      </View>

      {/* Squad selector when squad type is selected */}
      {targetType === 'squad' && (
        <Animated.View entering={FadeInDown.springify()} style={styles.squadSelector}>
          <ThemedText style={styles.formLabel}>Select a Squad</ThemedText>
          <View style={styles.squadList}>
            {MOCK_SQUADS.map((squad) => (
              <Clickable
                key={squad.id}
                onPress={() => handleSquadSelect(squad.id)}
                style={[
                  styles.squadItem,
                  {
                    backgroundColor: selectedSquadId === squad.id ? `${palette.tint}10` : palette.surface,
                    borderColor: selectedSquadId === squad.id ? palette.tint : palette.border,
                  },
                ]}
              >
                <Ionicons name="people" size={18} color={palette.tint} />
                <ThemedText style={{ flex: 1 }}>{squad.name}</ThemedText>
                {selectedSquadId === squad.id && (
                  <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                )}
              </Clickable>
            ))}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderTypeStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Session Details
      </ThemedText>

      {/* Selected athletes summary */}
      <View style={[styles.athletesSummary, { backgroundColor: `${palette.tint}10` }]}>
        <Ionicons name="people" size={18} color={palette.tint} />
        <ThemedText style={{ color: palette.tint, flex: 1 }}>
          {selectedAthletes.length} athlete{selectedAthletes.length !== 1 ? 's' : ''} selected
        </ThemedText>
        <Clickable onPress={() => setShowAthleteModal(true)}>
          <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Edit</ThemedText>
        </Clickable>
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
        <ThemedText style={styles.formLabel}>Price per Athlete (optional)</ThemedText>
        <TextInput
          style={[styles.input, { color: palette.text, borderColor: palette.border }]}
          placeholder="e.g., 50"
          placeholderTextColor={palette.muted}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Notes for Parents</ThemedText>
        <TextInput
          style={[styles.textArea, { color: palette.text, borderColor: palette.border }]}
          placeholder="e.g., Please bring water and shin guards..."
          placeholderTextColor={palette.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>
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
          <ThemedText style={styles.formLabel}>Proposed Slots</ThemedText>
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

  const renderPreviewStep = () => {
    // Group by parent for display
    const parentMap = new Map<string, Athlete[]>();
    selectedAthletes.forEach((athlete) => {
      const existing = parentMap.get(athlete.parentId) || [];
      parentMap.set(athlete.parentId, [...existing, athlete]);
    });

    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Preview Invites
        </ThemedText>
        <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
          Review before sending. Each parent will receive one invite with their athlete(s).
        </ThemedText>

        <View style={styles.previewStats}>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ThemedText type="title" style={{ color: palette.tint }}>
              {parentMap.size}
            </ThemedText>
            <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
              Invite{parentMap.size !== 1 ? 's' : ''}
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ThemedText type="title" style={{ color: palette.tint }}>
              {selectedAthletes.length}
            </ThemedText>
            <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
              Athlete{selectedAthletes.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>
        </View>

        <View style={styles.previewList}>
          {Array.from(parentMap.entries()).map(([parentId, athletes]) => (
            <View
              key={parentId}
              style={[styles.previewItem, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={styles.previewHeader}>
                <Ionicons name="mail-outline" size={16} color={palette.muted} />
                <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
                  {athletes[0].parentName}
                </ThemedText>
              </View>
              <View style={styles.previewAthletes}>
                {athletes.map((athlete) => (
                  <View key={athlete.id} style={styles.previewAthlete}>
                    <View style={[styles.previewDot, { backgroundColor: palette.tint }]} />
                    <ThemedText style={{ fontSize: 13 }}>{athlete.name}</ThemedText>
                    {athlete.age && (
                      <ThemedText style={{ fontSize: 12, color: palette.muted }}>
                        (Age {athlete.age})
                      </ThemedText>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <SurfaceCard style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="football-outline" size={18} color={palette.muted} />
            <ThemedText>
              {sessionType} - {focus}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={18} color={palette.muted} />
            <ThemedText>{proposedSlots.length} time slot(s) proposed</ThemedText>
          </View>
          {price && (
            <View style={styles.summaryRow}>
              <Ionicons name="pricetag-outline" size={18} color={palette.muted} />
              <ThemedText>${price} per athlete</ThemedText>
            </View>
          )}
        </SurfaceCard>
      </Animated.View>
    );
  };

  const renderConfirmStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <View style={styles.confirmContent}>
        <View style={[styles.confirmIcon, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="paper-plane" size={48} color={palette.tint} />
        </View>
        <ThemedText type="subtitle" style={styles.confirmTitle}>
          Ready to Send?
        </ThemedText>
        <ThemedText style={[styles.confirmText, { color: palette.muted }]}>
          You are about to send {Array.from(new Set(selectedAthletes.map((a) => a.parentId))).length} invite
          {Array.from(new Set(selectedAthletes.map((a) => a.parentId))).length !== 1 ? 's' : ''} for{' '}
          {selectedAthletes.length} athlete{selectedAthletes.length !== 1 ? 's' : ''}.
        </ThemedText>
        <ThemedText style={[styles.disclaimer, { color: palette.muted }]}>
          Parents will receive a notification and have 7 days to respond. You can cancel the
          invites anytime before they respond.
        </ThemedText>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={prevStep} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title">Group Invite</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'target' && renderTargetStep()}
        {step === 'type' && renderTypeStep()}
        {step === 'slots' && renderSlotsStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'confirm' && renderConfirmStep()}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {step === 'confirm' ? (
          <Clickable
            onPress={submitBulkInvites}
            disabled={loading}
            style={[styles.nextButton, { backgroundColor: palette.tint, opacity: loading ? 0.6 : 1 }]}
          >
            <Ionicons name="paper-plane" size={18} color="#fff" />
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
              {loading ? 'Sending...' : `Send ${Array.from(new Set(selectedAthletes.map((a) => a.parentId))).length} Invite${Array.from(new Set(selectedAthletes.map((a) => a.parentId))).length !== 1 ? 's' : ''}`}
            </ThemedText>
          </Clickable>
        ) : (
          <Clickable
            onPress={nextStep}
            disabled={!canProceed()}
            style={[
              styles.nextButton,
              { backgroundColor: palette.tint, opacity: canProceed() ? 1 : 0.5 },
            ]}
          >
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Continue</ThemedText>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Clickable>
        )}
      </View>

      <InviteAthleteModal
        visible={showAthleteModal}
        onClose={() => setShowAthleteModal(false)}
        onSelect={handleAthletesSelected}
        athletes={rosterAsAthletes}
        squads={MOCK_SQUADS}
        multiSelect={true}
        title="Select Athletes"
      />
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
  stepItem: {
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
    width: 40,
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
  targetOptions: {
    gap: Spacing.sm,
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  targetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetInfo: {
    flex: 1,
  },
  targetDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  squadSelector: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  squadList: {
    gap: Spacing.xs,
  },
  squadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  athletesSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  formSection: {
    gap: Spacing.xs,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
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
  previewStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  previewList: {
    gap: Spacing.sm,
  },
  previewItem: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewAthletes: {
    paddingLeft: Spacing.lg,
    gap: 4,
  },
  previewAthlete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summaryCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  confirmContent: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  confirmTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  confirmText: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  disclaimer: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
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
