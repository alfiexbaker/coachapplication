import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { sessionInviteService } from '@/services/session-invite-service';
import type { TimeSlot } from '@/constants/types';

const SESSION_TYPES = ['1:1 Coaching', 'Group Session', 'Assessment', 'Trial'];
const FOCUSES = ['Dribbling', 'Passing', 'Finishing', 'Defending', 'Goalkeeping', 'Conditioning'];

type Step = 'athlete' | 'type' | 'slots' | 'details' | 'confirm';

const MOCK_ATHLETES = [
  { id: 'athlete_1', name: 'Tom Baker', parentId: 'parent_1', parentName: 'Sarah Baker' },
  { id: 'athlete_2', name: 'Lucy Baker', parentId: 'parent_1', parentName: 'Sarah Baker' },
  { id: 'athlete_3', name: 'James Wilson', parentId: 'parent_2', parentName: 'Mike Wilson' },
];

export default function CreateSessionInviteScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [step, setStep] = useState<Step>('athlete');
  const [selectedAthletes, setSelectedAthletes] = useState<typeof MOCK_ATHLETES>([]);
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

  const toggleAthlete = (athlete: typeof MOCK_ATHLETES[0]) => {
    const isSelected = selectedAthletes.some((a) => a.id === athlete.id);
    if (isSelected) {
      setSelectedAthletes(selectedAthletes.filter((a) => a.id !== athlete.id));
    } else {
      setSelectedAthletes([...selectedAthletes, athlete]);
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
      case 'athlete':
        return selectedAthletes.length > 0;
      case 'type':
        return sessionType && focus;
      case 'slots':
        return proposedSlots.length > 0;
      case 'details':
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['athlete', 'type', 'slots', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['athlete', 'type', 'slots', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  const submitInvite = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Group by parent
      const parentId = selectedAthletes[0].parentId;
      const parentName = selectedAthletes[0].parentName;

      await sessionInviteService.createInvite({
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        athleteIds: selectedAthletes.map((a) => a.id),
        athleteNames: selectedAthletes.map((a) => a.name),
        parentId,
        parentName,
        proposedSlots,
        sessionType,
        focus,
        notes: notes || undefined,
        priceUsd: price ? parseFloat(price) : undefined,
        expiresInDays: 7,
      });

      Alert.alert('Invite Sent', 'Your session invite has been sent to the parent.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to create invite:', error);
      Alert.alert('Error', 'Failed to send invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ['athlete', 'type', 'slots', 'details', 'confirm'];
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

  const renderAthleteStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Select Athletes
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Choose which athletes you want to invite to this session
      </ThemedText>

      <View style={styles.athleteList}>
        {MOCK_ATHLETES.map((athlete) => {
          const isSelected = selectedAthletes.some((a) => a.id === athlete.id);
          return (
            <Clickable
              key={athlete.id}
              onPress={() => toggleAthlete(athlete)}
              style={[
                styles.athleteItem,
                {
                  backgroundColor: isSelected ? `${palette.tint}10` : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              <View style={[styles.athleteAvatar, { backgroundColor: `${palette.tint}15` }]}>
                <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                  {athlete.name.charAt(0)}
                </ThemedText>
              </View>
              <View style={styles.athleteInfo}>
                <ThemedText type="defaultSemiBold">{athlete.name}</ThemedText>
                <ThemedText style={[styles.parentName, { color: palette.muted }]}>
                  Parent: {athlete.parentName}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: isSelected ? palette.tint : 'transparent',
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </Clickable>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderTypeStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Session Details
      </ThemedText>

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
    </Animated.View>
  );

  const renderSlotsStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Propose Time Slots
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Add one or more time options for the parent to choose from
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

  const renderDetailsStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Additional Details
      </ThemedText>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Notes for Parent</ThemedText>
        <TextInput
          style={[styles.textArea, { color: palette.text, borderColor: palette.border }]}
          placeholder="e.g., Looking forward to working on finishing skills..."
          placeholderTextColor={palette.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Price (optional)</ThemedText>
        <TextInput
          style={[styles.input, { color: palette.text, borderColor: palette.border }]}
          placeholder="e.g., 50"
          placeholderTextColor={palette.muted}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
      </View>
    </Animated.View>
  );

  const renderConfirmStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Review & Send
      </ThemedText>

      <SurfaceCard style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="people-outline" size={18} color={palette.muted} />
          <ThemedText>{selectedAthletes.map((a) => a.name).join(', ')}</ThemedText>
        </View>
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
            <ThemedText>${price}</ThemedText>
          </View>
        )}
        {notes && (
          <View style={styles.summaryRow}>
            <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
            <ThemedText numberOfLines={2}>{notes}</ThemedText>
          </View>
        )}
      </SurfaceCard>

      <ThemedText style={[styles.disclaimer, { color: palette.muted }]}>
        The parent will receive a notification and have 7 days to respond. You can cancel the
        invite anytime before they respond.
      </ThemedText>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={prevStep} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title">Create Invite</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'athlete' && renderAthleteStep()}
        {step === 'type' && renderTypeStep()}
        {step === 'slots' && renderSlotsStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'confirm' && renderConfirmStep()}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {step === 'confirm' ? (
          <Clickable
            onPress={submitInvite}
            disabled={loading}
            style={[styles.nextButton, { backgroundColor: palette.tint, opacity: loading ? 0.6 : 1 }]}
          >
            <Ionicons name="paper-plane" size={18} color="#fff" />
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
              {loading ? 'Sending...' : 'Send Invite'}
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
  athleteList: {
    gap: Spacing.sm,
  },
  athleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  athleteAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  athleteInfo: {
    flex: 1,
  },
  parentName: {
    fontSize: 13,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 15,
    textAlignVertical: 'top',
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
  summaryCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  summaryRow: {
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
