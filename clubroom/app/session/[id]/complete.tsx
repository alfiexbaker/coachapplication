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

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform, View } from 'react-native';
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
import { useQuickRate } from '@/hooks/use-quick-rate';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { buildFeedbackPrefillFromQuickRate } from '@/utils/feedback-prefill';
import { BadgeAwardModal } from '@/components/badges/badge-award-modal';
import type { BadgeAward } from '@/constants/types';
import type { CompletionSummaryData } from '@/hooks/use-session-completion';
import type { QuickRateInput } from '@/types/progress-types';

import {
  AttendanceStep,
  BadgesStep,
  CompletionSummary,
  GroupCompletionBoard,
  NotesStep,
  QuickRateStep,
  ReviewStep,
} from '@/components/session';
import { CompletionStepIndicator } from '@/components/session/completion-step-indicator';
import { WizardNavButtons } from '@/components/session/wizard-nav-buttons';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('SessionComplete');

// ============================================================================
// SCREEN
// ============================================================================

export default function SessionCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const [groupMessage, setGroupMessage] = useState('');
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [completionSummaryData, setCompletionSummaryData] = useState<CompletionSummaryData | null>(null);
  const [quickRateBadgeAthleteId, setQuickRateBadgeAthleteId] = useState<string | null>(null);

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
    improvements,
    setImprovements,
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
    updateAthleteEffort,
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

  const quickRateAthletes = useMemo(
    () =>
      attendanceStepData
        .filter((athlete) => athlete.status === 'present')
        .map((athlete) => {
          const athleteRecord = attendance[athlete.registrationId];
          if (!athleteRecord?.registration.userId) {
            return null;
          }
          return {
            athleteId: athleteRecord.registration.userId,
            athleteName: athlete.userName,
          };
        })
        .filter((athlete): athlete is { athleteId: string; athleteName: string } => athlete !== null),
    [attendance, attendanceStepData],
  );

  const effortByAthleteId = useMemo(() => {
    const next: Record<string, number> = {};
    for (const athlete of Object.values(attendance)) {
      if (athlete.status !== 'present') {
        continue;
      }
      if (!athlete.registration.userId) {
        continue;
      }
      next[athlete.registration.userId] = athlete.effort;
    }
    return next;
  }, [attendance]);

  const quickRateEnabledAthletes = quickRateAthletes;

  const quickRate = useQuickRate({
    athletes: quickRateEnabledAthletes,
    sessionId: session?.id ?? '',
    coachId: currentUser?.id ?? '',
    effortByAthleteId,
  });

  const effectiveQuickRateByAthleteId = useMemo<Record<string, QuickRateInput>>(
    () => (quickRate.isSkippedAll ? {} : quickRate.ratingsByAthleteId),
    [quickRate.isSkippedAll, quickRate.ratingsByAthleteId],
  );

  const completionAthletes = useMemo(
    () =>
      presentAthletes
        .map((athlete) => {
          const athleteRecord = attendance[athlete.registrationId];
          if (!athleteRecord?.registration.userId) {
            return null;
          }
          return {
            registrationId: athlete.registrationId,
            athleteId: athleteRecord.registration.userId,
            athleteName: athlete.userName,
          };
        })
        .filter(
          (
            athlete,
          ): athlete is { registrationId: string; athleteId: string; athleteName: string } =>
            athlete !== null,
        ),
    [attendance, presentAthletes],
  );

  const selectedQuickRateAthlete = useMemo(
    () =>
      quickRateEnabledAthletes.find((athlete) => athlete.athleteId === quickRateBadgeAthleteId) ??
      null,
    [quickRateEnabledAthletes, quickRateBadgeAthleteId],
  );

  const quickRateBadgeCount = useMemo(
    () =>
      Object.values(effectiveQuickRateByAthleteId).filter((rating) => Boolean(rating.badgeId)).length,
    [effectiveQuickRateByAthleteId],
  );
  const handleExit = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(Routes.SCHEDULE);
  }, []);

  const handleSendGroupMessage = async () => {
    const sent = await sendGroupBroadcast(groupMessage);
    if (!sent) {
      uiFeedback.alert('Add a message', 'Write a group update before sending.');
      return;
    }
    setGroupMessage('');
    uiFeedback.alert('Sent', 'Update pushed to the group thread.');
  };

  const handlePersonalFeedback = useCallback(
    async (registrationId: string) => {
      const athleteStep = attendanceStepData.find((a) => a.registrationId === registrationId);
      const athleteRecord = attendance[registrationId];
      if (!athleteStep || !athleteRecord || !session || !currentUser) return;

      const athleteUserId = athleteRecord.registration.userId;
      const quickRateInput = effectiveQuickRateByAthleteId[athleteUserId];
      const prefill = quickRateInput ? buildFeedbackPrefillFromQuickRate(quickRateInput) : null;
      const sessionId = `session-${Date.now()}`;
      const sessionRecord = {
        id: sessionId,
        athleteId: athleteUserId,
        athleteName: athleteStep.userName,
        coachId: currentUser.id,
        bookingId: session.id,
        sourceSessionId: session.id,
        completedAt: new Date().toISOString(),
        performanceRating: prefill?.performanceRating ?? athleteRecord.effort,
        skillsWorkedOn: prefill?.skillsWorkedOn ?? [],
        notes: prefill?.sessionSummary ?? '',
        videoUrls: [],
        imageUrls: [],
        effortRating: prefill?.effortRating ?? athleteRecord.effort,
        prefillSkillRatings: [],
        attendance: 'ATTENDED',
      };

      const sessions = await apiClient.get<Record<string, unknown>[]>(STORAGE_KEYS.COACH_SESSIONS, []);
      sessions.push(sessionRecord);
      await apiClient.set(STORAGE_KEYS.COACH_SESSIONS, sessions);
      logger.info('Personal feedback session created', { sessionId, athlete: athleteStep.userName });

      router.push(
        Routes.developmentSession(sessionId, {
          prefillFromQuickRate: 'true',
          athleteId: athleteUserId,
        }),
      );
    },
    [attendance, attendanceStepData, currentUser, effectiveQuickRateByAthleteId, session],
  );

  const handleQuickRateBadgePress = useCallback(
    (athleteId: string) => {
      setQuickRateBadgeAthleteId(athleteId);
    },
    [],
  );

  const handleQuickRateBadgeAwarded = useCallback(
    (award: BadgeAward) => {
      if (quickRateBadgeAthleteId) {
        quickRate.setBadge(quickRateBadgeAthleteId, award.badgeId);
      }
      setQuickRateBadgeAthleteId(null);
    },
    [quickRate.setBadge, quickRateBadgeAthleteId],
  );

  const handleSkipQuickRate = useCallback(() => {
    quickRate.clearAllRatings();
    goToNextStep();
  }, [goToNextStep, quickRate.clearAllRatings]);

  const handleCompleteWithQuickRate = useCallback(async () => {
    const completionResult = await handleComplete(effectiveQuickRateByAthleteId);
    if (completionResult) {
      setCompletionSummaryData(completionResult);
      setShowCompletionSummary(true);
    }
  }, [effectiveQuickRateByAthleteId, handleComplete]);

  const handleSendMessage = async (registrationId: string) => {
    const result = await sendMessageParent(registrationId);
    if (!result.ok) {
      uiFeedback.alert('Unable to message', result.reason || 'Message could not be sent.');
      return;
    }
    uiFeedback.alert('Sent', `Message sent to ${result.targetName}.`);
  };

  const handleRaiseConcernByRegistration = useCallback(
    (registrationId: string) => {
      const athlete = attendance[registrationId];
      const athleteId = athlete?.registration.userId;
      if (!athleteId) {
        uiFeedback.alert('Unable to open', 'Athlete details are missing for this registration.');
        return;
      }
      router.push(Routes.rosterAthleteConcern(athleteId));
    },
    [attendance],
  );

  const handleRaiseConcernByAthlete = useCallback((athleteId: string) => {
    if (!athleteId) {
      uiFeedback.alert('Unable to open', 'Athlete details are missing for this action.');
      return;
    }
    router.push(Routes.rosterAthleteConcern(athleteId));
  }, []);
  const renderScreenShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Complete Session" showBack onBackPress={handleExit} />
      {content}
    </SafeAreaView>
  );

  // ==========================================================================
  // VISUAL STATES
  // ==========================================================================

  if (loading) {
    return renderScreenShell(<LoadingState variant="form" />);
  }

  if (error) {
    return renderScreenShell(<ErrorState message={error} onRetry={loadSession} />);
  }

  if (!session) {
    return renderScreenShell(<ErrorState message="Session not found" onRetry={loadSession} />);
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="Complete Session"
          subtitle={session.title}
          showBack
          onBackPress={showCompletionSummary ? () => setShowCompletionSummary(false) : handleBackPress}
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
            {showCompletionSummary ? (
              <CompletionSummary
                ratedAthletes={completionSummaryData?.ratedAthletes ?? 0}
                photosCaptured={completionSummaryData?.photosCaptured ?? 0}
                videosRecorded={completionSummaryData?.videosRecorded ?? 0}
                badgesAwarded={
                  completionSummaryData?.badgesAwarded ?? totalBadgesAwarded + quickRateBadgeCount
                }
                athletes={completionSummaryData?.athletes ?? completionAthletes}
                onOpenAthlete={(athlete) => {
                  void handlePersonalFeedback(athlete.registrationId);
                }}
                onRaiseConcern={(athlete) => {
                  handleRaiseConcernByAthlete(athlete.athleteId);
                }}
                onDone={handleExit}
              />
            ) : isGroupCompletion ? (
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
                  onRaiseConcern={handleRaiseConcernByRegistration}
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
                  improvements={improvements}
                  onImprovementsChange={setImprovements}
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
                {currentStep === 'quickRate' && (
                  <QuickRateStep
                    athletes={quickRateEnabledAthletes}
                    ratingsByAthleteId={quickRate.ratingsByAthleteId}
                    currentIndex={quickRate.currentIndex}
                    isPrefilling={quickRate.isPrefilling}
                    onIndexChange={quickRate.setIndex}
                    onPositionChange={quickRate.updatePosition}
                    onSkillChange={quickRate.updateSkillRating}
                    onEffortChange={(athleteId, value) => {
                      quickRate.updateEffort(athleteId, value);
                      updateAthleteEffort(athleteId, value);
                    }}
                    onBadgePress={handleQuickRateBadgePress}
                    onMediaIdsChange={quickRate.setMediaIds}
                    onSkipAll={handleSkipQuickRate}
                    isSubmitting={submitting}
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
                    improvements={improvements}
                    onImprovementsChange={setImprovements}
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
                  onComplete={() => {
                    void handleCompleteWithQuickRate();
                  }}
                />
              </>
            )}
          </ScrollView>

          {isGroupCompletion && !showCompletionSummary && (
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
                onPress={() => {
                  void handleCompleteWithQuickRate();
                }}
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

      {session && currentUser && selectedQuickRateAthlete ? (
        <BadgeAwardModal
          visible={Boolean(selectedQuickRateAthlete)}
          athleteId={selectedQuickRateAthlete.athleteId}
          athleteName={selectedQuickRateAthlete.athleteName}
          coachId={currentUser.id}
          coachName={currentUser.fullName || currentUser.name || 'Coach'}
          sessionId={session.id}
          sessionLabel={session.title}
          onClose={() => setQuickRateBadgeAthleteId(null)}
          onAwarded={handleQuickRateBadgeAwarded}
        />
      ) : null}
    </>
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
