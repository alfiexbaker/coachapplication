import { useCallback, useEffect, useMemo, useRef, type ElementRef } from 'react';
import { RefreshControl, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { CelebrationOverlay, type CelebrationOverlayRef } from '@/components/celebration-overlay';
import { ThemedText } from '@/components/themed-text';
import {
  AttendanceHeatmap,
  BadgeWall,
  CharacterBar,
  CoachSaysCard,
  GoalsCompact,
  LevelUpCeremony,
  PLAYER_CARD_TIER_CONFIG,
  PositionPentagon,
  PositionToggle,
  PlayerCard,
  type LevelUpCeremonyRef,
  PastSessionsTimeline,
  ParentValueSummary,
} from '@/components/progress';
import { LinearGradient } from 'expo-linear-gradient';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography, withAlpha, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMyProgress } from '@/hooks/use-my-progress';
import { useScrollAnimations, useSectionRevealStyle } from '@/hooks/use-scroll-animations';
import { Routes } from '@/navigation/routes';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { progressTermlyReportService } from '@/services/progress/progress-termly-report-service';
import { uiFeedback } from '@/services/ui-feedback';

const DEFAULT_FEEDBACK_MEDIA_DIMENSION = 1080;
type AnimatedScrollViewRef = ElementRef<typeof Animated.ScrollView>;

export default function MyProgressScreen() {
  const { colors, scheme } = useTheme();
  const celebrationRef = useRef<CelebrationOverlayRef>(null);
  const scrollRef = useRef<AnimatedScrollViewRef>(null);
  const levelUpRef = useRef<LevelUpCeremonyRef>(null);
  const scrollAnimations = useScrollAnimations();

  // Section reveal styles for each zone
  const summaryLineStyle = useSectionRevealStyle(scrollAnimations, 'summary-line');
  const playerCardStyle = useSectionRevealStyle(scrollAnimations, 'player-card');
  const pentagonStyle = useSectionRevealStyle(scrollAnimations, 'corners');
  const coachStyle = useSectionRevealStyle(scrollAnimations, 'coach-says');
  const attendanceStyle = useSectionRevealStyle(scrollAnimations, 'attendance');
  const sessionsStyle = useSectionRevealStyle(scrollAnimations, 'past-sessions');
  const goalsStyle = useSectionRevealStyle(scrollAnimations, 'goals');
  const badgesStyle = useSectionRevealStyle(scrollAnimations, 'badges');
  const summaryStyle = useSectionRevealStyle(scrollAnimations, 'summary');

  const {
    currentUser,
    loading,
    status,
    error,
    refreshing,
    progress,
    feedback,
    allBadges,
    media,
    pentagonData,
    selectedPosition,
    setSelectedPosition,
    availablePositions,
    universalSkills,
    monthSummary,
    pastSessions,
    playerCard,
    latestFeedback,
    latestCoachBadge,
    latestHomeworkFeedback,
    homeworkCompleted,
    latestHomeworkProof,
    skillVelocityHighlight,
    attendanceDates,
    coachFocus,
    familyHighlights,
    isParentContext,
    switcherChildren,
    subjectOptions,
    selectedAthleteId,
    selectedAthleteName,
    handleSelectNextChild,
    handleRefresh,
    generateTermlyReport,
    retry,
  } = useMyProgress();

  useEffect(() => {
    const unsubs = [
      onTyped(ServiceEvents.BADGE_EARNED, ({ badgeLabel }) => {
        celebrationRef.current?.celebrate({
          variant: 'badge_earned',
          title: 'Badge Unlocked!',
          subtitle: badgeLabel ?? 'New achievement',
          icon: 'ribbon',
          iconColor: colors.success,
        });
      }),
      onTyped(ServiceEvents.SKILL_LEVEL_UP, ({ skill }) => {
        celebrationRef.current?.celebrate({
          variant: 'skill_level_up',
          title: 'Skill Improved',
          subtitle: `${skill} level increased`,
          icon: 'trending-up',
          iconColor: colors.info,
        });
      }),
      onTyped(ServiceEvents.STREAK_MILESTONE, ({ streakWeeks }) => {
        celebrationRef.current?.celebrate({
          variant: 'streak_milestone',
          title: 'Streak Milestone',
          subtitle: `${streakWeeks} week streak`,
          icon: 'flame',
          iconColor: colors.warning,
        });
      }),
      onTyped(ServiceEvents.LEVEL_UP, ({ newLevelName }) => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        levelUpRef.current?.show({
          levelName: newLevelName,
          tier: playerCard.tier,
        });
      }),
    ];
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [colors.info, colors.success, colors.tint, colors.warning, playerCard.tier]);

  const isSelfSubject = Boolean(currentUser?.id && selectedAthleteId === currentUser.id);
  const showChildFocusCard = isParentContext && Boolean(selectedAthleteId);
  const pageTitle = isParentContext ? 'Progress' : 'My Progress';
  const stageGlow = PLAYER_CARD_TIER_CONFIG[playerCard.tier].accent;
  const nextSubjectLabel = useMemo(() => {
    if (!selectedAthleteId || subjectOptions.length <= 1) {
      return null;
    }
    const currentIndex = subjectOptions.findIndex((option) => option.id === selectedAthleteId);
    const nextOption = subjectOptions[(currentIndex + 1) % subjectOptions.length];
    return nextOption?.name ?? null;
  }, [selectedAthleteId, subjectOptions]);
  const childFocusCard = showChildFocusCard ? (
    <View style={styles.childFocusWrap}>
      <View
        style={[
          styles.childFocusCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Row align="center" justify="space-between" gap="sm">
          <Row align="center" gap="xs">
            <Ionicons name="person-circle-outline" size={18} color={colors.tint} />
            {!isSelfSubject ? (
              <ThemedText style={[styles.childLabel, { color: colors.muted }]}>Kid</ThemedText>
            ) : null}
            <ThemedText style={styles.childName}>{selectedAthleteName}</ThemedText>
          </Row>
          {subjectOptions.length > 1 ? (
            <Clickable
              onPress={handleSelectNextChild}
              accessibilityLabel="Switch progress subject"
              style={[
                styles.switchSubjectButton,
                {
                  backgroundColor: withAlpha(colors.tint, 0.08),
                  borderColor: withAlpha(colors.tint, 0.16),
                },
              ]}
            >
              <Row align="center" gap="xxs">
                <Ionicons name="swap-horizontal-outline" size={15} color={colors.tint} />
                <ThemedText style={[styles.switchSubjectText, { color: colors.tint }]}>
                  {nextSubjectLabel ? `Switch to ${nextSubjectLabel}` : 'Switch'}
                </ThemedText>
              </Row>
            </Clickable>
          ) : null}
        </Row>
      </View>
    </View>
  ) : null;

  const handleViewAllFeedback = useCallback(() => {
    if (selectedAthleteId) {
      router.push(
        Routes.developmentSessionHistory({
          athleteId: selectedAthleteId,
        }),
      );
    }
  }, [selectedAthleteId]);

  const handleViewOlderSessions = useCallback(() => {
    if (selectedAthleteId) {
      router.push(
        Routes.developmentSessionHistory({
          athleteId: selectedAthleteId,
        }),
      );
    }
  }, [selectedAthleteId]);

  const handleOpenMediaGallery = useCallback(() => {
    if (selectedAthleteId) {
      router.push(
        Routes.developmentMediaGallery({
          athleteId: selectedAthleteId,
        }),
      );
    }
  }, [selectedAthleteId]);

  const handleAskCoachAboutThis = useCallback(() => {
    if (!isParentContext || !selectedAthleteId) {
      uiFeedback.showToast('Switch to a child profile to contact a coach.');
      return;
    }

    if (!latestFeedback?.coachId) {
      uiFeedback.alert(
        'No coach to message yet',
        'Complete a session first to message the coach about this progress update.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Find Coach', onPress: () => router.push(Routes.DISCOVER_MAP) },
        ],
      );
      return;
    }
    router.push(
      Routes.messagesWith({
        coachId: latestFeedback.coachId,
        athleteId: selectedAthleteId,
      }),
    );
  }, [isParentContext, latestFeedback?.coachId, selectedAthleteId]);

  const latestFeedbackMedia = useMemo(() => {
    if (!latestFeedback?.sessionId) {
      return null;
    }
    const storedMedia = media.find((entry) => entry.sessionId === latestFeedback.sessionId) ?? null;
    if (storedMedia) {
      return storedMedia;
    }

    const fallbackPhotoUrls = latestFeedback.photoUrls ?? [];
    if (fallbackPhotoUrls.length === 0) {
      return null;
    }
    return {
      sessionId: latestFeedback.sessionId,
      athleteId: latestFeedback.athleteId,
      coachId: latestFeedback.coachId,
      createdAt: latestFeedback.createdAt,
      photos: fallbackPhotoUrls.map((uri, index) => ({
        uri,
        thumbnailUri: uri,
        width: DEFAULT_FEEDBACK_MEDIA_DIMENSION,
        height: DEFAULT_FEEDBACK_MEDIA_DIMENSION,
        capturedAt: new Date(
          new Date(latestFeedback.createdAt).getTime() + index * 1000,
        ).toISOString(),
      })),
      video: null,
    };
  }, [
    latestFeedback?.athleteId,
    latestFeedback?.coachId,
    latestFeedback?.createdAt,
    latestFeedback?.photoUrls,
    latestFeedback?.sessionId,
    media,
  ]);

  const canOpenFeedbackHistory = Boolean(selectedAthleteId);

  // Build homework data for CoachSaysCard
  const homeworkData = useMemo(() => {
    if (!latestHomeworkFeedback) {
      return null;
    }
    return {
      homework: latestHomeworkFeedback.homework,
      coachName: latestHomeworkFeedback.coachName,
      setAt: latestHomeworkFeedback.createdAt,
      completed: homeworkCompleted,
      completedAt: latestHomeworkProof?.completedAt,
      proofUri: latestHomeworkProof?.proofUri,
      proofType: latestHomeworkProof?.proofType,
    };
  }, [
    homeworkCompleted,
    latestHomeworkFeedback,
    latestHomeworkProof?.completedAt,
    latestHomeworkProof?.proofType,
    latestHomeworkProof?.proofUri,
  ]);

  const progressSummary = useMemo(() => {
    if (!latestFeedback) {
      return null;
    }

    const sessionDate = new Date(latestFeedback.createdAt);
    const dateLabel = Number.isNaN(sessionDate.getTime())
      ? 'recently'
      : sessionDate.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
    const coachName = latestFeedback.coachName?.trim() || 'Coach';
    const coachLabel = coachName.toLowerCase().startsWith('coach ')
      ? coachName
      : `Coach ${coachName.split(' ')[0]}`;

    const previousWithCorners = [...feedback]
      .filter((entry) => entry.id !== latestFeedback.id && entry.fourCorners)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const technicalNow = latestFeedback.fourCorners?.technical ?? null;
    const technicalPrevious = previousWithCorners?.fourCorners?.technical ?? null;
    const technicalDelta =
      typeof technicalNow === 'number' && typeof technicalPrevious === 'number'
        ? technicalNow - technicalPrevious
        : null;

    return {
      dateLabel,
      coachLabel,
      technicalNow,
      technicalDelta,
    };
  }, [feedback, latestFeedback]);

  const parentCoachQuotes = useMemo(() => {
    if (!isParentContext) {
      return [];
    }
    return feedback
      .map((entry) => entry.publicSummary.trim())
      .filter((entry) => entry.length > 0)
      .filter((entry, index, all) => all.indexOf(entry) === index)
      .slice(0, 3);
  }, [feedback, isParentContext]);

  const parentMonthTitle = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const handleShareTermlyReport = useCallback(async () => {
    const reportResult = await generateTermlyReport();
    if (!reportResult.success) {
      uiFeedback.showToast(reportResult.error.message, 'error');
      return;
    }

    try {
      await Share.share({
        title: `${selectedAthleteName} Termly Progress Report`,
        message: progressTermlyReportService.buildShareMessage(reportResult.data),
      });
    } catch {
      uiFeedback.showToast('Could not share the termly report right now.', 'error');
    }
  }, [generateTermlyReport, selectedAthleteName]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >

        <PageHeader title={pageTitle} showBack centerTitle onBackPress={() => router.back()} />
        {childFocusCard}
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >

        <PageHeader title={pageTitle} showBack centerTitle onBackPress={() => router.back()} />
        {childFocusCard}
        <ErrorState message={error?.message ?? 'Unable to load progress.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (!currentUser || status === 'empty' || !progress) {
    const isParentWithoutChildren = isParentContext && switcherChildren.length === 0;
    const emptyTitle = isParentWithoutChildren ? 'No child linked yet' : 'No progress yet';
    const emptyMessage = isParentWithoutChildren
      ? 'Progress appears here once a child profile is linked to your family account.'
      : isParentContext
        ? 'Book and complete a session to start tracking progress here.'
        : 'Complete sessions to start tracking progress here.';
    const emptyActionLabel = isParentWithoutChildren
      ? 'Open My Children'
      : isParentContext
        ? 'Book a Session'
        : 'Find a Coach';

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >

        <PageHeader title={pageTitle} showBack centerTitle onBackPress={() => router.back()} />
        {childFocusCard}
        <EmptyState
          icon={isParentWithoutChildren ? 'people-outline' : 'analytics-outline'}
          title={emptyTitle}
          message={emptyMessage}
          actionLabel={emptyActionLabel}
          onPressAction={() => {
            if (isParentWithoutChildren) {
              router.push(Routes.CHILDREN);
            } else if (isParentContext) {
              router.push(Routes.BOOK_COACH);
            } else {
              router.push(Routes.BOOK_COACH);
            }
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title={pageTitle} showBack centerTitle onBackPress={() => router.back()} />

      {childFocusCard}

      <Animated.ScrollView
        ref={scrollRef}
        onLayout={scrollAnimations.onViewportLayout}
        onScroll={scrollAnimations.scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {progressSummary ? (
          <Animated.View
            style={summaryLineStyle}
            onLayout={scrollAnimations.createSectionLayoutHandler('summary-line')}
          >
            <Row
              wrap
              align="center"
              style={[
                styles.summaryLine,
                {
                  borderColor: withAlpha(colors.border, 0.88),
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <ThemedText style={[styles.summaryLineText, { color: colors.muted }]}>
                {progressSummary.dateLabel} with{' '}
              </ThemedText>
              <ThemedText style={[styles.summaryLineCoach, { color: colors.text }]}>
                {progressSummary.coachLabel}
              </ThemedText>
              {typeof progressSummary.technicalNow === 'number' ? (
                <>
                  <ThemedText style={[styles.summaryLineText, { color: colors.muted }]}>
                    {' · Technical '}
                  </ThemedText>
                  <ThemedText style={[styles.summaryLineScore, { color: colors.text }]}>
                    {progressSummary.technicalNow}/5
                  </ThemedText>
                  {typeof progressSummary.technicalDelta === 'number' && progressSummary.technicalDelta > 0 ? (
                    <ThemedText
                      style={[
                        styles.summaryLineDelta,
                        { color: colors.success },
                      ]}
                    >
                      {' '}+{progressSummary.technicalDelta}
                    </ThemedText>
                  ) : null}
                </>
              ) : null}
            </Row>
          </Animated.View>
        ) : null}

        <Animated.View
          style={playerCardStyle}
          onLayout={scrollAnimations.createSectionLayoutHandler('player-card')}
        >
          <View style={styles.cardStage}>
            <LinearGradient
              colors={[
                withAlpha(stageGlow, scheme === 'dark' ? 0.18 : 0.12),
                withAlpha(stageGlow, scheme === 'dark' ? 0.07 : 0.04),
                'transparent',
              ]}
              style={styles.cardStageGradient}
            />
            <PlayerCard data={playerCard} />
          </View>
        </Animated.View>

        {pentagonData.attributes.some((attribute) => attribute.value > 0) ? (
          <Animated.View
            style={[pentagonStyle, styles.pentagonCluster]}
            onLayout={scrollAnimations.createSectionLayoutHandler('corners')}
          >
            {availablePositions.length > 1 ? (
              <PositionToggle
                positions={availablePositions}
                selected={selectedPosition}
                onChange={setSelectedPosition}
              />
            ) : null}
            <PositionPentagon
              data={pentagonData}
              velocityHighlight={skillVelocityHighlight}
            />
            <CharacterBar universalSkills={universalSkills} />
          </Animated.View>
        ) : null}

        {latestFeedback ? (
          <Animated.View
            style={coachStyle}
            onLayout={scrollAnimations.createSectionLayoutHandler('coach-says')}
          >
            <CoachSaysCard
              feedback={latestFeedback}
              coachBadge={latestCoachBadge}
              media={latestFeedbackMedia}
              homework={homeworkData}
              focusNarrative={coachFocus?.narrative}
              onAskCoachAboutThis={isParentContext ? handleAskCoachAboutThis : undefined}
              onViewAll={canOpenFeedbackHistory ? handleViewAllFeedback : undefined}
              onOpenMediaGallery={handleOpenMediaGallery}
            />
          </Animated.View>
        ) : null}

        {attendanceDates.length > 0 ? (
          <Animated.View
            style={attendanceStyle}
            onLayout={scrollAnimations.createSectionLayoutHandler('attendance')}
          >
            <AttendanceHeatmap dates={attendanceDates} />
          </Animated.View>
        ) : null}

        {pastSessions.length > 0 ? (
          <Animated.View
            style={sessionsStyle}
            onLayout={scrollAnimations.createSectionLayoutHandler('past-sessions')}
          >
            <PastSessionsTimeline
              sessions={pastSessions}
              onViewOlder={handleViewOlderSessions}
              onOpenMediaGallery={handleOpenMediaGallery}
            />
          </Animated.View>
        ) : null}
        <Animated.View
          style={goalsStyle}
          onLayout={scrollAnimations.createSectionLayoutHandler('goals')}
        >
          <GoalsCompact
            activeGoals={progress.activeGoals}
            completedGoals={progress.completedGoals}
            athleteId={selectedAthleteId}
            actorId={currentUser.id}
            actorRole={currentUser.role}
            onRefresh={handleRefresh}
          />
        </Animated.View>

        <Animated.View
          style={badgesStyle}
          onLayout={scrollAnimations.createSectionLayoutHandler('badges')}
        >
          <BadgeWall
            badges={allBadges}
            athleteName={selectedAthleteName}
          />
        </Animated.View>

        {/* ═══ PARENT-ONLY ZONE ═══ */}
        {isParentContext ? (
          <Animated.View
            style={summaryStyle}
            onLayout={scrollAnimations.createSectionLayoutHandler('summary')}
          >
            <ParentValueSummary
              summary={monthSummary}
              monthTitle={parentMonthTitle}
              media={media}
              coachQuotes={parentCoachQuotes}
              familyHighlights={familyHighlights}
              onShare={handleShareTermlyReport}
            />
          </Animated.View>
        ) : null}
      </Animated.ScrollView>

      <CelebrationOverlay ref={celebrationRef} />
      <LevelUpCeremony ref={levelUpRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  childFocusWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  childFocusCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
  },
  childLabel: {
    ...Typography.caption,
  },
  childName: {
    ...Typography.bodySmallSemiBold,
  },
  switchSubjectButton: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
  },
  switchSubjectText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  cardStage: {
    position: 'relative',
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  cardStageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  pentagonCluster: {
    gap: Spacing.sm,
  },
  sectionBreak: {
    height: Spacing.xs,
  },
  summaryLine: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  summaryLineText: {
    ...Typography.caption,
  },
  summaryLineCoach: {
    ...Typography.caption,
    fontWeight: '700',
  },
  summaryLineScore: {
    ...Typography.caption,
    fontWeight: '700',
  },
  summaryLineDelta: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
