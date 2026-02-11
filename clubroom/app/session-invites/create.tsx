/**
 * CreateSessionInviteScreen — Multi-step wizard for creating session invites.
 *
 * Thin screen file that wires the useCreateInvite hook to step sub-components.
 * All state, handlers, and data loading live in the hook.
 * All step UI lives in components/invite/create-*-step.tsx.
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { WizardStepIndicator } from '@/components/invite/wizard-step-indicator';
import { WizardNavButtons } from '@/components/invite/wizard-nav-buttons';
import { CreateAthleteStep } from '@/components/invite/create-athlete-step';
import { CreateClubStep } from '@/components/invite/create-club-step';
import { CreateModeStep } from '@/components/invite/create-mode-step';
import { CreateExistingStep } from '@/components/invite/create-existing-step';
import { CreateTypeStep } from '@/components/invite/create-type-step';
import { CreateSlotsStep } from '@/components/invite/create-slots-step';
import { CreateDetailsStep } from '@/components/invite/create-details-step';
import { CreateConfirmStep } from '@/components/invite/create-confirm-step';
import { useCreateInvite, type Step } from '@/hooks/use-create-invite';
import { Spacing } from '@/constants/theme';

// ============================================================================
// STEP DISPLAY HELPERS
// ============================================================================

const DISPLAY_STEPS_NEW: readonly string[] = [
  'athlete',
  'mode',
  'type',
  'slots',
  'details',
  'confirm',
];
const DISPLAY_STEPS_EXISTING: readonly string[] = ['athlete', 'mode', 'existing', 'confirm'];

function getIndicatorStep(step: Step): string {
  return step === 'club' ? 'athlete' : step;
}

// ============================================================================
// SCREEN
// ============================================================================

export default function CreateSessionInviteScreen() {
  const { state, handlers } = useCreateInvite();
  const { colors } = state;

  const displaySteps = state.inviteMode === 'existing' ? DISPLAY_STEPS_EXISTING : DISPLAY_STEPS_NEW;
  const indicatorStep = getIndicatorStep(state.step);

  const handleRemoveCoverImage = useCallback(() => {
    handlers.setCoverImageUri(null);
  }, [handlers]);

  const renderStep = useMemo(() => {
    switch (state.step) {
      case 'athlete':
        return (
          <CreateAthleteStep
            athletes={state.athletes}
            selectedAthletes={state.selectedAthletes}
            sentInvites={state.sentInvites}
            onToggleAthlete={handlers.toggleAthlete}
            colors={colors}
          />
        );
      case 'club':
        return (
          <CreateClubStep
            myAcademies={state.myAcademies}
            selectedClub={state.selectedClub}
            onSelectClub={handlers.setSelectedClub}
            colors={colors}
          />
        );
      case 'mode':
        return (
          <CreateModeStep
            inviteMode={state.inviteMode}
            existingSessionCount={state.existingSessions.length}
            onSelectMode={handlers.setInviteMode}
            colors={colors}
          />
        );
      case 'existing':
        return (
          <CreateExistingStep
            existingSessions={state.existingSessions}
            selectedSession={state.selectedExistingSession}
            onSelectSession={handlers.setSelectedExistingSession}
            colors={colors}
          />
        );
      case 'type':
        return (
          <CreateTypeStep
            sessionTemplates={state.sessionTemplates}
            selectedTemplate={state.selectedTemplate}
            focus={state.focus}
            sessionInviteType={state.sessionInviteType}
            price={state.price}
            onSelectTemplate={handlers.setSelectedTemplate}
            onSelectFocus={handlers.setFocus}
            onSelectInviteType={handlers.setSessionInviteType}
            colors={colors}
          />
        );
      case 'slots':
        return state.currentUserId ? (
          <CreateSlotsStep
            coachId={state.currentUserId}
            selectedTemplate={state.selectedTemplate}
            selectedSlots={state.selectedAvailabilitySlots}
            onSelectionChange={handlers.setSelectedAvailabilitySlots}
            colors={colors}
          />
        ) : null;
      case 'details':
        return (
          <CreateDetailsStep
            notes={state.notes}
            price={state.price}
            coverImageUri={state.coverImageUri}
            onChangeNotes={handlers.setNotes}
            onChangePrice={handlers.setPrice}
            onPickCoverImage={handlers.pickCoverImage}
            onRemoveCoverImage={handleRemoveCoverImage}
            colors={colors}
          />
        );
      case 'confirm':
        return <CreateConfirmStep state={state} handlers={handlers} />;
      default:
        return null;
    }
  }, [state, handlers, colors, handleRemoveCoverImage]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <Row align="center" justify="between" paddingH="lg" paddingV="md">
        <Clickable onPress={handlers.prevStep} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title">Create Invite</ThemedText>
        <Clickable disabled style={{ width: 24 }}>
          <ThemedText> </ThemedText>
        </Clickable>
      </Row>

      {/* Step indicator */}
      <WizardStepIndicator steps={displaySteps} currentStep={indicatorStep} colors={colors} />

      {/* Step content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep}
      </ScrollView>

      {/* Footer */}
      <Row style={[styles.footer, { borderTopColor: colors.border }]}>
        <WizardNavButtons
          isConfirmStep={state.step === 'confirm'}
          canProceed={handlers.canProceed()}
          loading={state.loading}
          onNext={handlers.nextStep}
          onSubmit={handlers.submitInvite}
          colors={colors}
        />
      </Row>
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
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
