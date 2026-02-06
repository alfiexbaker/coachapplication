import { useReducer, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { SquadInviteModal } from '@/components/squad/squad-invite-modal';
import { CreateSessionTypeStep } from '@/components/group/create-session-type-step';
import { CreateSessionDetailsStep } from '@/components/group/create-session-details-step';
import { CreateSessionScheduleStep } from '@/components/group/create-session-schedule-step';
import { CreateSessionPricingStep } from '@/components/group/create-session-pricing-step';
import { CreateSessionReviewStep } from '@/components/group/create-session-review-step';
import { CreateSessionInviteStep } from '@/components/group/create-session-invite-step';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { groupSessionService, CreateGroupSessionInput } from '@/services/group-session-service';
import { createLogger } from '@/utils/logger';
import type { GroupSession, GroupSessionSchedule, FootballObjective, SessionInviteType } from '@/constants/types';

const logger = createLogger('CreateGroupSessionScreen');

const SESSION_TYPE_META: Record<string, { forSquad?: boolean }> = {
  TEAM_TRAINING: { forSquad: true },
  TRAINING: { forSquad: true },
};

const DEFAULT_CLUB_ID = 'club_lions';

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

interface SessionFormState {
  sessionType: GroupSession['sessionType'];
  inviteType: SessionInviteType;
  title: string;
  description: string;
  location: string;
  maxParticipants: string;
  ageMin: string;
  ageMax: string;
  skillLevel: GroupSession['skillLevel'];
  focus: FootballObjective[];
  price: string;
  waitlistEnabled: boolean;
  selectedSquadIds: string[];
  scheduleDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  isRecurring: boolean;
  recurringDayOfWeek: number;
  recurringUntil: string;
}

type SessionFormAction =
  | { type: 'SET_FIELD'; field: keyof SessionFormState; value: unknown }
  | { type: 'RESET' };

const initialState: SessionFormState = {
  sessionType: 'OPEN_SESSION',
  inviteType: 'OPEN' as SessionInviteType,
  title: '',
  description: '',
  location: '',
  maxParticipants: '10',
  ageMin: '',
  ageMax: '',
  skillLevel: 'ALL',
  focus: [],
  price: '0',
  waitlistEnabled: true,
  selectedSquadIds: [],
  scheduleDate: '',
  scheduleStartTime: '09:00',
  scheduleEndTime: '12:00',
  isRecurring: false,
  recurringDayOfWeek: -1,
  recurringUntil: '',
};

function sessionFormReducer(state: SessionFormState, action: SessionFormAction): SessionFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return initialState;
  }
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

type WizardStep = 'type' | 'details' | 'schedule' | 'pricing' | 'review' | 'invite';

export default function CreateGroupSessionScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [form, dispatch] = useReducer(sessionFormReducer, initialState);
  const [step, setStep] = useState<WizardStep>('type');
  const [loading, setLoading] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [showSquadInviteModal, setShowSquadInviteModal] = useState(false);
  const [squadInviteSent, setSquadInviteSent] = useState(false);

  const isSquadSession = !!SESSION_TYPE_META[form.sessionType]?.forSquad;

  const steps: WizardStep[] = isSquadSession
    ? ['type', 'details', 'schedule', 'pricing', 'review', 'invite']
    : ['type', 'details', 'schedule', 'pricing', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const setField = (field: string, value: unknown) =>
    dispatch({ type: 'SET_FIELD', field: field as keyof SessionFormState, value });

  const canProceed = (): boolean => {
    switch (step) {
      case 'type': return true;
      case 'details': return form.title.trim().length > 0 && form.location.trim().length > 0;
      case 'schedule':
        if (form.isRecurring) return form.recurringDayOfWeek >= 0 && form.recurringDayOfWeek <= 6;
        return form.scheduleDate.trim().length > 0;
      case 'pricing': return true;
      case 'review': return true;
      case 'invite': return true;
      default: return false;
    }
  };

  const goNext = () => {
    const next = currentStepIndex + 1;
    if (next < steps.length) setStep(steps[next]);
  };

  const goBack = () => {
    if (currentStepIndex > 0) setStep(steps[currentStepIndex - 1]);
    else router.back();
  };

  const handleCreate = async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      const schedule: GroupSessionSchedule[] = form.isRecurring
        ? [] // Service auto-generates from recurringPattern
        : [{
            date: form.scheduleDate,
            startTime: form.scheduleStartTime,
            endTime: form.scheduleEndTime,
          }];

      const input: CreateGroupSessionInput = {
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        coachPhotoUrl: currentUser.avatar,
        title: form.title,
        description: form.description,
        sessionType: form.sessionType,
        inviteType: form.inviteType,
        schedule,
        maxParticipants: parseInt(form.maxParticipants, 10) || 10,
        pricePerParticipant: parseFloat(form.price) || 0,
        currency: 'GBP',
        ageMin: form.ageMin ? parseInt(form.ageMin, 10) : undefined,
        ageMax: form.ageMax ? parseInt(form.ageMax, 10) : undefined,
        skillLevel: form.skillLevel,
        location: form.location,
        focus: form.focus,
        waitlistEnabled: form.waitlistEnabled,
        squadId: form.selectedSquadIds.length > 0 ? form.selectedSquadIds[0] : undefined,
        isRecurring: form.isRecurring || undefined,
        recurringPattern: form.isRecurring ? {
          dayOfWeek: form.recurringDayOfWeek,
          startTime: form.scheduleStartTime,
          endTime: form.scheduleEndTime,
          until: form.recurringUntil || undefined,
        } : undefined,
      };

      const session = await groupSessionService.createSession(input);
      await groupSessionService.publishSession(session.id);
      setCreatedSessionId(session.id);

      if (isSquadSession) {
        setStep('invite');
      } else {
        router.replace(Routes.groupSession(session.id));
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
      router.replace(Routes.groupSession(createdSessionId));
    } else {
      router.back();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'type':
        return (
          <CreateSessionTypeStep
            sessionType={form.sessionType}
            inviteType={form.inviteType}
            onSessionTypeChange={(t) => setField('sessionType', t)}
            onInviteTypeChange={(t) => setField('inviteType', t)}
          />
        );
      case 'details':
        return (
          <CreateSessionDetailsStep
            title={form.title}
            description={form.description}
            location={form.location}
            ageMin={form.ageMin}
            ageMax={form.ageMax}
            skillLevel={form.skillLevel}
            focus={form.focus}
            isSquadSession={isSquadSession}
            clubId={DEFAULT_CLUB_ID}
            selectedSquadIds={form.selectedSquadIds}
            onFieldChange={setField}
          />
        );
      case 'schedule':
        return (
          <CreateSessionScheduleStep
            scheduleDate={form.scheduleDate}
            scheduleStartTime={form.scheduleStartTime}
            scheduleEndTime={form.scheduleEndTime}
            isRecurring={form.isRecurring}
            recurringDayOfWeek={form.recurringDayOfWeek}
            recurringUntil={form.recurringUntil}
            onFieldChange={setField}
          />
        );
      case 'pricing':
        return (
          <CreateSessionPricingStep
            maxParticipants={form.maxParticipants}
            price={form.price}
            waitlistEnabled={form.waitlistEnabled}
            onFieldChange={setField}
          />
        );
      case 'review':
        return (
          <CreateSessionReviewStep
            sessionType={form.sessionType}
            inviteType={form.inviteType}
            title={form.title}
            location={form.location}
            scheduleDate={form.scheduleDate}
            scheduleStartTime={form.scheduleStartTime}
            scheduleEndTime={form.scheduleEndTime}
            maxParticipants={form.maxParticipants}
            price={form.price}
            focus={form.focus}
            isRecurring={form.isRecurring}
            recurringDayOfWeek={form.recurringDayOfWeek}
            recurringUntil={form.recurringUntil}
          />
        );
      case 'invite':
        return (
          <CreateSessionInviteStep
            selectedSquadIds={form.selectedSquadIds}
            squadInviteSent={squadInviteSent}
            onInvitePress={() => setShowSquadInviteModal(true)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Clickable onPress={goBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center' }}>
            Create Session
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.progressContainer}>
          {steps.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                { backgroundColor: i <= currentStepIndex ? palette.tint : palette.border },
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>

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

      {createdSessionId && currentUser && (
        <SquadInviteModal
          visible={showSquadInviteModal}
          onClose={() => setShowSquadInviteModal(false)}
          onSuccess={handleSquadInviteSuccess}
          clubId={DEFAULT_CLUB_ID}
          inviteType="SESSION"
          targetId={createdSessionId}
          targetTitle={form.title}
          preSelectedSquadIds={form.selectedSquadIds}
          multiSelect={false}
          sessionProps={{
            coachId: currentUser.id,
            coachName: currentUser.name || 'Coach',
            coachPhotoUrl: currentUser.avatar,
            proposedSlots: [{
              id: `slot_${Date.now()}`,
              date: form.scheduleDate,
              startTime: form.scheduleStartTime,
              endTime: form.scheduleEndTime,
            }],
            sessionType: groupSessionService.formatSessionType(form.sessionType),
            focus: form.focus.length > 0 ? form.focus.join(', ') : 'General Training',
            notes: form.description,
            priceUsd: parseFloat(form.price) || 0,
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
    borderRadius: Radii.xs,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
