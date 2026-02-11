/**
 * Create Session Screen
 *
 * 4-step wizard for coaches to create a new session offering:
 * 1. Type & Details — session type, title, duration, focus areas
 * 2. Schedule & Pricing — frequency, date/time, location, price
 * 3. Review — summary card of all details
 * 4. Invite — visibility (open/closed/squad) + athlete selection
 *
 * All form state lives in useCreateSession hook.
 * Each step is a separate memoized component in components/session/.
 *
 * USER STORY:
 * "As a coach, I want to create sessions with full details
 * so athletes can discover and book my training."
 */

import { useCallback } from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives';
import { Spacing } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useCreateSession } from '@/hooks/use-create-session';
import { ok } from '@/types/result';

import { CreateStepIndicator } from '@/components/session/create-step-indicator';
import { CreateDetailsStep } from '@/components/session/create-details-step';
import { CreateScheduleStep } from '@/components/session/create-schedule-step';
import { CreateReviewStep } from '@/components/session/create-review-step';
import { CreateInviteStep } from '@/components/session/create-invite-step';
import { CreateFooterBar } from '@/components/session/create-footer-bar';

// ============================================================================
// SCREEN
// ============================================================================

export default function CreateSessionScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const state = useCreateSession();

  const handleCancel = useCallback(() => router.back(), []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <Row align="center" justify="between" paddingH="lg" paddingV="md">
          <Clickable
            onPress={state.goBack}
            hitSlop={8}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <Row flex align="center" justify="center">
            <ThemedText type="subtitle">Create Session</ThemedText>
          </Row>
          <Clickable
            onPress={handleCancel}
            hitSlop={8}
            accessibilityLabel="Cancel session creation"
          >
            <ThemedText style={{ color: colors.muted }}>Cancel</ThemedText>
          </Clickable>
        </Row>

        {/* Step Indicator */}
        <CreateStepIndicator
          currentStep={state.step}
          currentStepIndex={state.currentStepIndex}
          colors={colors}
        />

        {/* Content */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {state.step === 'details' && (
            <CreateDetailsStep
              colors={colors}
              sessionType={state.sessionType}
              title={state.title}
              description={state.description}
              duration={state.duration}
              focusAreas={state.focusAreas}
              maxParticipants={state.maxParticipants}
              defaultMaxParticipants={state.getDefaultMaxParticipants()}
              onSessionTypeChange={state.setSessionType}
              onTitleChange={state.setTitle}
              onDescriptionChange={state.setDescription}
              onDurationChange={state.setDuration}
              onToggleFocusArea={state.toggleFocusArea}
              onMaxParticipantsChange={state.setMaxParticipants}
            />
          )}
          {state.step === 'schedule' && (
            <CreateScheduleStep
              colors={colors}
              recurrence={state.recurrence}
              selectedDate={state.selectedDate}
              selectedTime={state.selectedTime}
              location={state.location}
              price={state.price}
              savedLocations={state.savedLocations}
              onRecurrenceChange={state.setRecurrence}
              onDateChange={state.setSelectedDate}
              onTimeChange={state.setSelectedTime}
              onLocationChange={state.setLocation}
              onPriceChange={state.setPrice}
            />
          )}
          {state.step === 'review' && (
            <CreateReviewStep
              colors={colors}
              sessionType={state.sessionType}
              title={state.title}
              description={state.description}
              duration={state.duration}
              selectedDate={state.selectedDate}
              selectedTime={state.selectedTime}
              recurrence={state.recurrence}
              location={state.location}
              price={state.price}
              focusAreas={state.focusAreas}
              maxParticipants={state.maxParticipants}
              inviteType={state.inviteType}
              defaultMaxParticipants={state.getDefaultMaxParticipants()}
            />
          )}
          {state.step === 'invite' && (
            <CreateInviteStep
              colors={colors}
              inviteType={state.inviteType}
              selectedAthletes={state.selectedAthletes}
              pastAthletes={state.pastAthletes}
              onInviteTypeChange={state.setInviteType}
              onToggleAthlete={state.toggleAthleteSelection}
            />
          )}
        </ScrollView>

        {/* Footer */}
        <CreateFooterBar
          colors={colors}
          step={state.step}
          loading={state.loading}
          canProceed={state.canProceed()}
          onNext={state.goNext}
          onCreate={state.handleCreate}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
