import { useReducer, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { CreateEventTypeStep } from '@/components/event/create-event-type-step';
import { CreateEventDetailsStep } from '@/components/event/create-event-details-step';
import { CreateEventScheduleStep } from '@/components/event/create-event-schedule-step';
import { CreateEventAudienceStep } from '@/components/event/create-event-audience-step';
import { CreateEventReviewStep } from '@/components/event/create-event-review-step';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { eventService, CreateEventInput } from '@/services/event-service';
import { squadService } from '@/services/squad-service';
import { inviteService as bulkInviteService } from '@/services/invite';
import { createLogger } from '@/utils/logger';
import type { ClubEventType, EventTargetAudience, ClubSquad } from '@/constants/types';

const logger = createLogger('CreateEventScreen');

const DEFAULT_CLUB_ID = 'club_lions';

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

interface EventFormState {
  eventType: ClubEventType;
  title: string;
  description: string;
  venue: string;
  address: string;
  isVirtual: boolean;
  meetingLink: string;
  date: string;
  startTime: string;
  endTime: string;
  targetAudience: EventTargetAudience | 'SQUADS';
  selectedSquadIds: string[];
  maxAttendees: string;
  price: string;
  rsvpRequired: boolean;
  rsvpDeadline: string;
}

type EventFormAction =
  | { type: 'SET_FIELD'; field: keyof EventFormState; value: unknown }
  | { type: 'RESET' };

const initialState: EventFormState = {
  eventType: 'SOCIAL',
  title: '',
  description: '',
  venue: '',
  address: '',
  isVirtual: false,
  meetingLink: '',
  date: '',
  startTime: '10:00',
  endTime: '12:00',
  targetAudience: 'ALL',
  selectedSquadIds: [],
  maxAttendees: '',
  price: '0',
  rsvpRequired: true,
  rsvpDeadline: '',
};

function eventFormReducer(state: EventFormState, action: EventFormAction): EventFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return initialState;
  }
}

// ---------------------------------------------------------------------------
// Wizard steps
// ---------------------------------------------------------------------------

type WizardStep = 'type' | 'details' | 'schedule' | 'audience' | 'review';
const STEPS: WizardStep[] = ['type', 'details', 'schedule', 'audience', 'review'];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CreateEventScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [form, dispatch] = useReducer(eventFormReducer, initialState);
  const [step, setStep] = useState<WizardStep>('type');
  const [loading, setLoading] = useState(false);
  const [squads, setSquads] = useState<ClubSquad[]>([]);

  const currentStepIndex = STEPS.indexOf(step);

  useEffect(() => {
    loadSquads();
  }, []);

  const loadSquads = async () => {
    try {
      const data = await squadService.getSquads(DEFAULT_CLUB_ID);
      setSquads(data.filter((s) => !s.name.toLowerCase().includes('staff')));
    } catch (error) {
      logger.error('Failed to load squads:', error);
    }
  };

  const setField = (field: string, value: unknown) =>
    dispatch({ type: 'SET_FIELD', field: field as keyof EventFormState, value });

  const canProceed = (): boolean => {
    switch (step) {
      case 'type':
        return true;
      case 'details':
        return form.title.trim().length > 0 && (form.venue.trim().length > 0 || form.isVirtual);
      case 'schedule':
        return form.date.trim().length > 0;
      case 'audience':
        return form.targetAudience !== 'SQUADS' || form.selectedSquadIds.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const next = currentStepIndex + 1;
    if (next < STEPS.length) setStep(STEPS[next]);
  };

  const goBack = () => {
    if (currentStepIndex > 0) setStep(STEPS[currentStepIndex - 1]);
    else router.back();
  };

  const handleCreate = async (publish: boolean = false) => {
    if (!currentUser) return;
    setLoading(true);

    try {
      if (form.targetAudience === 'SQUADS' && form.selectedSquadIds.length > 0 && publish) {
        const result = await bulkInviteService.inviteSquadsToEvent({
          clubId: DEFAULT_CLUB_ID,
          clubName: 'Lions FC Academy',
          title: form.title,
          description: form.description,
          eventType: form.eventType,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime || undefined,
          venue: form.isVirtual ? 'Online' : form.venue,
          isVirtual: form.isVirtual,
          squadIds: form.selectedSquadIds,
          createdBy: currentUser.id,
          createdByName: currentUser.name || 'Coach',
          price: parseFloat(form.price) || 0,
          maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees, 10) : undefined,
        });

        Alert.alert(
          'Event Created!',
          `${form.title} created and ${result.inviteResult.successful} invite${result.inviteResult.successful !== 1 ? 's' : ''} sent to squad members.`,
          [{ text: 'OK', onPress: () => router.replace(Routes.event(result.event.id)) }]
        );
      } else {
        const input: CreateEventInput = {
          clubId: DEFAULT_CLUB_ID,
          clubName: 'Lions FC Academy',
          createdBy: currentUser.id,
          createdByName: currentUser.name || 'Coach',
          title: form.title,
          description: form.description,
          eventType: form.eventType,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime || undefined,
          venue: form.isVirtual ? 'Online' : form.venue,
          address: form.isVirtual ? undefined : form.address || undefined,
          isVirtual: form.isVirtual,
          meetingLink: form.isVirtual ? form.meetingLink || undefined : undefined,
          targetAudience: form.targetAudience === 'SQUADS' ? 'ALL' : form.targetAudience,
          maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees, 10) : undefined,
          price: parseFloat(form.price) || 0,
          currency: 'GBP',
          rsvpRequired: form.rsvpRequired,
          rsvpDeadline: form.rsvpDeadline || undefined,
        };

        const event = await eventService.createEvent(input);
        if (publish) {
          await eventService.publishEvent(event.id);
          await eventService.inviteClub(event.id);
        }
        router.replace(Routes.event(event.id));
      }
    } catch (error) {
      logger.error('Failed to create event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'type':
        return (
          <CreateEventTypeStep
            eventType={form.eventType}
            onEventTypeChange={(t) => setField('eventType', t)}
          />
        );
      case 'details':
        return (
          <CreateEventDetailsStep
            title={form.title}
            description={form.description}
            venue={form.venue}
            address={form.address}
            isVirtual={form.isVirtual}
            meetingLink={form.meetingLink}
            onFieldChange={setField}
          />
        );
      case 'schedule':
        return (
          <CreateEventScheduleStep
            date={form.date}
            startTime={form.startTime}
            endTime={form.endTime}
            rsvpDeadline={form.rsvpDeadline}
            onFieldChange={setField}
          />
        );
      case 'audience':
        return (
          <CreateEventAudienceStep
            clubId={DEFAULT_CLUB_ID}
            targetAudience={form.targetAudience}
            selectedSquadIds={form.selectedSquadIds}
            squads={squads}
            maxAttendees={form.maxAttendees}
            price={form.price}
            rsvpRequired={form.rsvpRequired}
            onFieldChange={setField}
          />
        );
      case 'review':
        return (
          <CreateEventReviewStep
            eventType={form.eventType}
            title={form.title}
            description={form.description}
            date={form.date}
            startTime={form.startTime}
            endTime={form.endTime}
            isVirtual={form.isVirtual}
            venue={form.venue}
            targetAudience={form.targetAudience}
            selectedSquadIds={form.selectedSquadIds}
            price={form.price}
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
            Create Event
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.progressContainer}>
          {STEPS.map((s, i) => (
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
          {step === 'review' ? (
            <View style={styles.reviewButtons}>
              <Button variant="outline" onPress={() => handleCreate(false)} disabled={loading} style={styles.reviewButton}>
                Save Draft
              </Button>
              <Button onPress={() => handleCreate(true)} disabled={loading} style={styles.reviewButton}>
                {loading ? 'Creating...' : 'Publish'}
              </Button>
            </View>
          ) : (
            <Button onPress={goNext} disabled={!canProceed()}>
              Continue
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
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
  reviewButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  reviewButton: {
    flex: 1,
  },
});
