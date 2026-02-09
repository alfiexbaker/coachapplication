/**
 * Session Completion Screen
 *
 * 4-step wizard for coaches to complete a session:
 * 1. Mark attendance per athlete (present/late/absent)
 * 2. Add session notes, skills, effort rating, homework
 * 3. Award badges to present athletes
 * 4. Review summary and configure sharing preferences
 *
 * Emits SESSION_COMPLETED event, creates AttendanceRecord entries,
 * triggers parent notifications, and queues review prompts.
 *
 * USER STORY:
 * "As a coach, I want to mark attendance and add notes after a session
 * so I can track athlete progress and provide feedback."
 */

import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSessionCompletion } from '@/hooks/use-session-completion';

import { AttendanceStep, NotesStep, BadgesStep, ReviewStep } from '@/components/session';
import { CompletionStepIndicator } from '@/components/session/completion-step-indicator';
import { WizardNavButtons } from '@/components/session/wizard-nav-buttons';

// ============================================================================
// SCREEN
// ============================================================================

export default function SessionCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const {
    session,
    loading,
    error,
    submitting,
    availableBadges,
    sessionSummary,
    setSessionSummary,
    skillsFocused,
    setSkillsFocused,
    overallEffort,
    setOverallEffort,
    homework,
    setHomework,
    shareNotesWithParents,
    setShareNotesWithParents,
    shareAttendance,
    setShareAttendance,
    currentStep,
    currentStepIndex,
    attendanceStepData,
    presentAthletes,
    presentCount,
    absentCount,
    totalBadgesAwarded,
    loadSession,
    updateAttendanceStatus,
    toggleBadge,
    goToNextStep,
    goToPrevStep,
    handleBackPress,
    handleComplete,
  } = useSessionCompletion(id);

  // ==========================================================================
  // VISUAL STATES
  // ==========================================================================

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <PageHeader title="Complete Session" showBack onBackPress={() => router.back()} />
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <PageHeader title="Complete Session" showBack onBackPress={() => router.back()} />
        <ErrorState message={error} onRetry={loadSession} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <PageHeader title="Complete Session" showBack onBackPress={() => router.back()} />
        <ErrorState message="Session not found" onRetry={loadSession} />
      </SafeAreaView>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <PageHeader
        title="Complete Session"
        subtitle={session.title}
        showBack
        onBackPress={handleBackPress}
      />

      <CompletionStepIndicator
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        colors={colors}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 'attendance' && (
            <AttendanceStep athletes={attendanceStepData} colors={colors} onUpdateStatus={updateAttendanceStatus} />
          )}
          {currentStep === 'notes' && (
            <NotesStep
              colors={colors}
              sessionSummary={sessionSummary}
              onSessionSummaryChange={setSessionSummary}
              skillsFocused={skillsFocused}
              onSkillsFocusedChange={setSkillsFocused}
              overallEffort={overallEffort}
              onOverallEffortChange={setOverallEffort}
              homework={homework}
              onHomeworkChange={setHomework}
            />
          )}
          {currentStep === 'badges' && (
            <BadgesStep presentAthletes={presentAthletes} availableBadges={availableBadges} colors={colors} onToggleBadge={toggleBadge} />
          )}
          {currentStep === 'summary' && (
            <ReviewStep
              colors={colors}
              presentCount={presentCount}
              absentCount={absentCount}
              sessionSummary={sessionSummary}
              skillsFocused={skillsFocused}
              totalBadgesAwarded={totalBadgesAwarded}
              overallEffort={overallEffort}
              shareNotesWithParents={shareNotesWithParents}
              onShareNotesChange={setShareNotesWithParents}
              shareAttendance={shareAttendance}
              onShareAttendanceChange={setShareAttendance}
            />
          )}

          <WizardNavButtons
            colors={colors}
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            submitting={submitting}
            onNext={goToNextStep}
            onPrev={goToPrevStep}
            onComplete={handleComplete}
          />
        </ScrollView>
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
  contentInner: {
    padding: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
});
