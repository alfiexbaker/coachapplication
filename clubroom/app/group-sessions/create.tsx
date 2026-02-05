import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { SquadInviteModal } from '@/components/squad/squad-invite-modal';
import { InlineSquadSelector } from '@/components/squad/squad-picker';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { groupSessionService, CreateGroupSessionInput } from '@/services/group-session-service';
import type { GroupSession, GroupSessionSchedule, FootballObjective } from '@/constants/types';

const logger = createLogger('CreateGroupSessionScreen');

const SESSION_TYPES: { key: GroupSession['sessionType']; label: string; icon: string; forSquad?: boolean }[] = [
  { key: 'CAMP', label: 'Camp', icon: 'sunny' },
  { key: 'CLINIC', label: 'Clinic', icon: 'school' },
  { key: 'TEAM_TRAINING', label: 'Team Training', icon: 'people', forSquad: true },
  { key: 'TRAINING', label: 'Squad Training', icon: 'football', forSquad: true },
  { key: 'OPEN_SESSION', label: 'Open Session', icon: 'fitness' },
  { key: 'TRIAL', label: 'Trial', icon: 'sparkles' },
];

const SKILL_LEVELS: { key: GroupSession['skillLevel']; label: string }[] = [
  { key: 'ALL', label: 'All Levels' },
  { key: 'BEGINNER', label: 'Beginner' },
  { key: 'INTERMEDIATE', label: 'Intermediate' },
  { key: 'ADVANCED', label: 'Advanced' },
];

const FOCUS_OPTIONS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Finishing',
  'Defending',
  'Goalkeeping',
  'Conditioning',
];

type WizardStep = 'type' | 'details' | 'schedule' | 'pricing' | 'review' | 'invite';

// Default club ID for demo (would come from user context in production)
const DEFAULT_CLUB_ID = 'club_lions';

export default function CreateGroupSessionScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [step, setStep] = useState<WizardStep>('type');
  const [loading, setLoading] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);

  // Form state
  const [sessionType, setSessionType] = useState<GroupSession['sessionType']>('OPEN_SESSION');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [skillLevel, setSkillLevel] = useState<GroupSession['skillLevel']>('ALL');
  const [focus, setFocus] = useState<FootballObjective[]>([]);
  const [price, setPrice] = useState('0');
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);

  // Squad linking for team training sessions
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>([]);
  const [showSquadInviteModal, setShowSquadInviteModal] = useState(false);
  const [squadInviteSent, setSquadInviteSent] = useState(false);

  // Schedule state (simplified to single date for MVP)
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('09:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('12:00');

  // Determine if this is a squad-linked session type
  const isSquadSession = SESSION_TYPES.find((t) => t.key === sessionType)?.forSquad || false;

  // Steps change based on session type - squad sessions get invite step
  const steps: WizardStep[] = isSquadSession
    ? ['type', 'details', 'schedule', 'pricing', 'review', 'invite']
    : ['type', 'details', 'schedule', 'pricing', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const canProceed = () => {
    switch (step) {
      case 'type':
        return true;
      case 'details':
        return title.trim().length > 0 && location.trim().length > 0;
      case 'schedule':
        return scheduleDate.trim().length > 0;
      case 'pricing':
        return true;
      case 'review':
        return true;
      case 'invite':
        return true; // Optional step
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1]);
    } else {
      router.back();
    }
  };

  const handleCreate = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const schedule: GroupSessionSchedule[] = [
        {
          date: scheduleDate,
          startTime: scheduleStartTime,
          endTime: scheduleEndTime,
        },
      ];

      const input: CreateGroupSessionInput = {
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        coachPhotoUrl: currentUser.avatar,
        title,
        description,
        sessionType,
        schedule,
        maxParticipants: parseInt(maxParticipants, 10) || 10,
        pricePerParticipant: parseFloat(price) || 0,
        currency: 'GBP',
        ageMin: ageMin ? parseInt(ageMin, 10) : undefined,
        ageMax: ageMax ? parseInt(ageMax, 10) : undefined,
        skillLevel,
        location,
        focus,
        waitlistEnabled,
        // Add squad linking for team sessions
        squadId: selectedSquadIds.length > 0 ? selectedSquadIds[0] : undefined,
      };

      const session = await groupSessionService.createSession(input);
      await groupSessionService.publishSession(session.id);
      setCreatedSessionId(session.id);

      // For squad sessions, go to invite step; otherwise navigate to session
      if (isSquadSession) {
        setStep('invite');
      } else {
        router.replace({
          pathname: '/group-sessions/[id]',
          params: { id: session.id },
        });
      }
    } catch (error) {
      logger.error('Failed to create session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSquadInviteSuccess = (result: { squadInviteId: string; successful: number; failed: number }) => {
    setSquadInviteSent(true);
    Alert.alert(
      'Invites Sent',
      `Successfully sent ${result.successful} invite${result.successful !== 1 ? 's' : ''} to squad members.`,
      [{ text: 'OK' }]
    );
  };

  const handleFinish = () => {
    if (createdSessionId) {
      router.replace({
        pathname: '/group-sessions/[id]',
        params: { id: createdSessionId },
      });
    } else {
      router.back();
    }
  };

  const toggleFocus = (f: FootballObjective) => {
    if (focus.includes(f)) {
      setFocus(focus.filter((x) => x !== f));
    } else {
      setFocus([...focus, f]);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'type':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              What type of session?
            </ThemedText>
            <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
              Choose the format that best fits your training
            </ThemedText>
            <View style={styles.typeGrid}>
              {SESSION_TYPES.map((type) => (
                <Clickable
                  key={type.key}
                  onPress={() => setSessionType(type.key)}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: sessionType === type.key ? `${palette.tint}15` : palette.surface,
                      borderColor: sessionType === type.key ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.typeIcon,
                      {
                        backgroundColor: sessionType === type.key ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={24}
                      color={sessionType === type.key ? '#fff' : palette.muted}
                    />
                  </View>
                  <ThemedText
                    style={[
                      styles.typeLabel,
                      { color: sessionType === type.key ? palette.tint : palette.text },
                    ]}
                  >
                    {type.label}
                  </ThemedText>
                </Clickable>
              ))}
            </View>
          </Animated.View>
        );

      case 'details':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              Session details
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Title *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="e.g., Half-Term Football Camp"
                placeholderTextColor={palette.muted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[styles.textArea, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="Tell parents what to expect..."
                placeholderTextColor={palette.muted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Location *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="e.g., Victoria Park, London"
                placeholderTextColor={palette.muted}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>Age Min</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                  placeholder="e.g., 8"
                  placeholderTextColor={palette.muted}
                  value={ageMin}
                  onChangeText={setAgeMin}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>Age Max</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                  placeholder="e.g., 12"
                  placeholderTextColor={palette.muted}
                  value={ageMax}
                  onChangeText={setAgeMax}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Skill Level</ThemedText>
              <View style={styles.chipRow}>
                {SKILL_LEVELS.map((level) => (
                  <Clickable
                    key={level.key}
                    onPress={() => setSkillLevel(level.key)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: skillLevel === level.key ? palette.tint : palette.surface,
                        borderColor: skillLevel === level.key ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: skillLevel === level.key ? '#fff' : palette.text },
                      ]}
                    >
                      {level.label}
                    </ThemedText>
                  </Clickable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Focus Areas</ThemedText>
              <View style={styles.chipRow}>
                {FOCUS_OPTIONS.map((f) => (
                  <Clickable
                    key={f}
                    onPress={() => toggleFocus(f)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: focus.includes(f) ? palette.tint : palette.surface,
                        borderColor: focus.includes(f) ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.chipText, { color: focus.includes(f) ? '#fff' : palette.text }]}
                    >
                      {f}
                    </ThemedText>
                  </Clickable>
                ))}
              </View>
            </View>

            {/* Squad selector for team training sessions */}
            {isSquadSession && (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Link to Squad (Optional)</ThemedText>
                <ThemedText style={[{ color: palette.muted, fontSize: 12, marginBottom: Spacing.xs }]}>
                  Link this session to a squad for easy invite management
                </ThemedText>
                <InlineSquadSelector
                  clubId={DEFAULT_CLUB_ID}
                  selectedSquadIds={selectedSquadIds}
                  onSelectionChange={setSelectedSquadIds}
                  multiSelect={false}
                />
              </View>
            )}
          </Animated.View>
        );

      case 'schedule':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              When is it?
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Date *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.muted}
                value={scheduleDate}
                onChangeText={setScheduleDate}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>Start Time</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                  placeholder="09:00"
                  placeholderTextColor={palette.muted}
                  value={scheduleStartTime}
                  onChangeText={setScheduleStartTime}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>End Time</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                  placeholder="12:00"
                  placeholderTextColor={palette.muted}
                  value={scheduleEndTime}
                  onChangeText={setScheduleEndTime}
                />
              </View>
            </View>
          </Animated.View>
        );

      case 'pricing':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              Capacity & Pricing
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Max Participants</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="10"
                placeholderTextColor={palette.muted}
                value={maxParticipants}
                onChangeText={setMaxParticipants}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Price per Participant (GBP)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="0 for free"
                placeholderTextColor={palette.muted}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <Clickable
              onPress={() => setWaitlistEnabled(!waitlistEnabled)}
              style={styles.toggleRow}
            >
              <View style={styles.toggleInfo}>
                <ThemedText type="defaultSemiBold">Enable Waitlist</ThemedText>
                <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
                  Allow parents to join a waitlist when full
                </ThemedText>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  {
                    backgroundColor: waitlistEnabled ? palette.tint : palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleHandle,
                    {
                      transform: [{ translateX: waitlistEnabled ? 18 : 2 }],
                    },
                  ]}
                />
              </View>
            </Clickable>
          </Animated.View>
        );

      case 'review':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              Review & Create
            </ThemedText>

            <SurfaceCard style={styles.reviewCard}>
              <View style={styles.reviewRow}>
                <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Type</ThemedText>
                <ThemedText type="defaultSemiBold">
                  {groupSessionService.formatSessionType(sessionType)}
                </ThemedText>
              </View>
              <View style={styles.reviewRow}>
                <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Title</ThemedText>
                <ThemedText type="defaultSemiBold">{title}</ThemedText>
              </View>
              <View style={styles.reviewRow}>
                <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Location</ThemedText>
                <ThemedText>{location}</ThemedText>
              </View>
              <View style={styles.reviewRow}>
                <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Date</ThemedText>
                <ThemedText>{scheduleDate} ({scheduleStartTime} - {scheduleEndTime})</ThemedText>
              </View>
              <View style={styles.reviewRow}>
                <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Capacity</ThemedText>
                <ThemedText>{maxParticipants} participants</ThemedText>
              </View>
              <View style={styles.reviewRow}>
                <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Price</ThemedText>
                <ThemedText type="defaultSemiBold">
                  {groupSessionService.formatPrice(parseFloat(price) || 0, 'GBP')}
                </ThemedText>
              </View>
              {focus.length > 0 && (
                <View style={styles.reviewRow}>
                  <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Focus</ThemedText>
                  <ThemedText>{focus.join(', ')}</ThemedText>
                </View>
              )}
            </SurfaceCard>
          </Animated.View>
        );

      case 'invite':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <View style={styles.inviteHeader}>
              <View style={[styles.successIcon, { backgroundColor: `${palette.success}15` }]}>
                <Ionicons name="checkmark-circle" size={48} color={palette.success} />
              </View>
              <ThemedText type="title" style={styles.stepTitle}>
                Session Created!
              </ThemedText>
              <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
                Would you like to invite your squad?
              </ThemedText>
            </View>

            {selectedSquadIds.length > 0 ? (
              <SurfaceCard style={styles.inviteCard}>
                <View style={styles.inviteCardHeader}>
                  <Ionicons name="people" size={24} color={palette.tint} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">Invite Squad Members</ThemedText>
                    <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                      Send session invites to all athletes in your linked squad
                    </ThemedText>
                  </View>
                </View>

                {squadInviteSent ? (
                  <View style={[styles.inviteSentBadge, { backgroundColor: `${palette.success}15` }]}>
                    <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                    <ThemedText style={{ color: palette.success, fontWeight: '600' }}>
                      Invites sent successfully!
                    </ThemedText>
                  </View>
                ) : (
                  <Clickable
                    onPress={() => setShowSquadInviteModal(true)}
                    style={[styles.inviteButton, { backgroundColor: palette.tint }]}
                  >
                    <Ionicons name="paper-plane" size={18} color="#fff" />
                    <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
                      Invite Squad to Session
                    </ThemedText>
                  </Clickable>
                )}
              </SurfaceCard>
            ) : (
              <SurfaceCard style={styles.inviteCard}>
                <View style={styles.noSquadMessage}>
                  <Ionicons name="information-circle-outline" size={24} color={palette.muted} />
                  <ThemedText style={{ color: palette.muted, flex: 1 }}>
                    No squad linked. You can still invite athletes individually from the session page.
                  </ThemedText>
                </View>
              </SurfaceCard>
            )}

            <ThemedText style={[styles.inviteNote, { color: palette.muted }]}>
              You can also invite athletes later from the session details page.
            </ThemedText>
          </Animated.View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Clickable onPress={goBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center' }}>
            Create Session
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {steps.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                {
                  backgroundColor: i <= currentStepIndex ? palette.tint : palette.border,
                },
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer buttons */}
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          {step === 'invite' ? (
            <Button onPress={handleFinish}>
              {squadInviteSent ? 'View Session' : 'Skip & View Session'}
            </Button>
          ) : step === 'review' ? (
            <Button onPress={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : isSquadSession ? 'Create Session' : 'Create & Publish'}
            </Button>
          ) : (
            <Button onPress={goNext} disabled={!canProceed()}>
              Continue
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Squad Invite Modal */}
      {createdSessionId && currentUser && (
        <SquadInviteModal
          visible={showSquadInviteModal}
          onClose={() => setShowSquadInviteModal(false)}
          onSuccess={handleSquadInviteSuccess}
          clubId={DEFAULT_CLUB_ID}
          inviteType="SESSION"
          targetId={createdSessionId}
          targetTitle={title}
          preSelectedSquadIds={selectedSquadIds}
          multiSelect={false}
          sessionProps={{
            coachId: currentUser.id,
            coachName: currentUser.name || 'Coach',
            coachPhotoUrl: currentUser.avatar,
            proposedSlots: [{
              id: `slot_${Date.now()}`,
              date: scheduleDate,
              startTime: scheduleStartTime,
              endTime: scheduleEndTime,
            }],
            sessionType: groupSessionService.formatSessionType(sessionType),
            focus: focus.length > 0 ? focus.join(', ') : 'General Training',
            notes: description,
            priceUsd: parseFloat(price) || 0,
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  stepSubtitle: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: -Spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  typeCard: {
    width: '45%',
    padding: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  toggleHandle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  reviewCard: {
    gap: Spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  reviewLabel: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  // Invite step styles
  inviteHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  inviteCard: {
    gap: Spacing.md,
  },
  inviteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  inviteSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  noSquadMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inviteNote: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
