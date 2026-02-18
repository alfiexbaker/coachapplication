/**
 * Session Completion Screen
 *
 * 4-step wizard for coaches to complete a session:
 * 1. Mark attendance per athlete (present/absent)
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

import { useCallback, useState } from 'react';
import { Alert, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Components, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSessionCompletion } from '@/hooks/use-session-completion';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';

import {
  AttendanceStep,
  BadgesStep,
  GroupCompletionBoard,
  NotesStep,
  ReviewStep,
} from '@/components/session';
import { CompletionStepIndicator } from '@/components/session/completion-step-indicator';
import { WizardNavButtons } from '@/components/session/wizard-nav-buttons';

const logger = createLogger('SessionComplete');

// ============================================================================
// SCREEN
// ============================================================================

export default function SessionCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const [groupMessage, setGroupMessage] = useState('');

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
    videoUrls,
    imageUrls,
    shareNotesWithParents,
    setShareNotesWithParents,
    shareAttendance,
    setShareAttendance,
    currentStep,
    currentStepIndex,
    isGroupCompletion,
    attendance,
    attendanceStepData,
    parentNameByRegistration,
    presentAthletes,
    presentCount,
    absentCount,
    totalBadgesAwarded,
    loadSession,
    updateAttendanceStatus,
    setAllAttendanceStatus,
    sendGroupBroadcast,
    sendMessageParent,
    addImage,
    addVideo,
    removeImage,
    removeVideo,
    toggleBadge,
    goToNextStep,
    goToPrevStep,
    handleBackPress,
    handleComplete,
  } = useSessionCompletion(id);

  const handleSendGroupMessage = async () => {
    const sent = await sendGroupBroadcast(groupMessage);
    if (!sent) {
      Alert.alert('Add a message', 'Write a group update before sending.');
      return;
    }
    setGroupMessage('');
    Alert.alert('Sent', 'Update pushed to the group thread.');
  };

  const handlePersonalFeedback = useCallback(
    async (registrationId: string) => {
      const athleteStep = attendanceStepData.find((a) => a.registrationId === registrationId);
      const athleteRecord = attendance[registrationId];
      if (!athleteStep || !athleteRecord || !session || !currentUser) return;

      const athleteUserId = athleteRecord.registration.userId;
      const sessionId = `session-${Date.now()}`;
      const sessionRecord = {
        id: sessionId,
        athleteId: athleteUserId,
        athleteName: athleteStep.userName,
        coachId: currentUser.id,
        bookingId: session.id,
        completedAt: new Date().toISOString(),
        performanceRating: 3,
        skillsWorkedOn: [],
        notes: '',
        videoUrls: [],
        imageUrls: [],
        attendance: 'ATTENDED',
      };

      const sessions = await apiClient.get<Record<string, unknown>[]>('coach_sessions', []);
      sessions.push(sessionRecord);
      await apiClient.set('coach_sessions', sessions);
      logger.info('Personal feedback session created', { sessionId, athlete: athleteStep.userName });

      router.push(Routes.developmentSession(sessionId));
    },
    [attendance, attendanceStepData, session, currentUser],
  );

  const handleSendMessage = async (registrationId: string) => {
    const result = await sendMessageParent(registrationId);
    if (!result.ok) {
      Alert.alert('Unable to message', result.reason || 'Message could not be sent.');
      return;
    }
    Alert.alert('Sent', `Message sent to ${result.targetName}.`);
  };

  // ==========================================================================
  // VISUAL STATES
  // ==========================================================================

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Complete Session" showBack onBackPress={() => router.back()} />
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Complete Session" showBack onBackPress={() => router.back()} />
        <ErrorState message={error} onRetry={loadSession} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Complete Session" showBack onBackPress={() => router.back()} />
        <ErrorState message="Session not found" onRetry={loadSession} />
      </SafeAreaView>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Complete Session"
        subtitle={session.title}
        showBack
        onBackPress={handleBackPress}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.contentInner,
            isGroupCompletion ? styles.contentWithStickyFooter : undefined,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isGroupCompletion ? (
            <>
              <GroupCompletionBoard
                colors={colors}
                athletes={attendanceStepData}
                parentNameByRegistration={parentNameByRegistration}
                groupMessage={groupMessage}
                videoUrls={videoUrls}
                imageUrls={imageUrls}
                onGroupMessageChange={setGroupMessage}
                onUpdateStatus={updateAttendanceStatus}
                onSelectAll={() => setAllAttendanceStatus('present')}
                onSendGroupMessage={handleSendGroupMessage}
                onPersonalFeedback={handlePersonalFeedback}
                onMessage={handleSendMessage}
                onAddVideo={addVideo}
                onRemoveVideo={removeVideo}
                onAddImage={addImage}
                onRemoveImage={removeImage}
              />

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
            </>
          ) : (
            <>
              <CompletionStepIndicator
                currentStep={currentStep}
                currentStepIndex={currentStepIndex}
                colors={colors}
              />

              {currentStep === 'attendance' && (
                <AttendanceStep
                  athletes={attendanceStepData}
                  colors={colors}
                  onUpdateStatus={updateAttendanceStatus}
                />
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
                <BadgesStep
                  presentAthletes={presentAthletes}
                  availableBadges={availableBadges}
                  colors={colors}
                  onToggleBadge={toggleBadge}
                />
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
            </>
          )}
        </ScrollView>

        {isGroupCompletion && (
          <View
            style={[
              styles.groupStickyFooter,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Clickable
              style={[
                styles.groupCompleteButton,
                { backgroundColor: submitting ? colors.muted : colors.tint },
              ]}
              onPress={handleComplete}
              disabled={submitting}
              accessibilityLabel="Complete group session"
              accessibilityRole="button"
            >
              <Row align="center" justify="center" gap="sm">
                {submitting ? (
                  <ThemedText style={[styles.groupCompleteText, { color: colors.onPrimary }]}>
                    Saving...
                  </ThemedText>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
                    <ThemedText style={[styles.groupCompleteText, { color: colors.onPrimary }]}>
                      Complete Session
                    </ThemedText>
                  </>
                )}
              </Row>
            </Clickable>
          </View>
        )}
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
  contentWithStickyFooter: {
    paddingBottom: 120,
  },
  groupStickyFooter: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  groupCompleteButton: {
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
  },
  groupCompleteText: {
    ...Typography.subheading,
  },
});
