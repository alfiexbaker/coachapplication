import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Alert, RefreshControl, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { PageHeader } from '@/components/primitives/page-header';
import { ChildSwitcher } from '@/components/family/child-switcher';
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
  PositionPentagon,
  PositionToggle,
  PlayerCard,
  type LevelUpCeremonyRef,
  PastSessionsTimeline,
  ParentValueSummary,
} from '@/components/progress';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMyProgress } from '@/hooks/use-my-progress';
import { useScrollAnimations, useSectionRevealStyle } from '@/hooks/use-scroll-animations';
import { Routes } from '@/navigation/routes';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { progressTermlyReportService } from '@/services/progress/progress-termly-report-service';

export default function MyProgressScreen() {
  const { colors } = useTheme();
  const celebrationRef = useRef<CelebrationOverlayRef>(null);
  const scrollRef = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const levelUpRef = useRef<LevelUpCeremonyRef>(null);
  const [homeworkProofSubmitting, setHomeworkProofSubmitting] = useState(false);
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
    markHomeworkDone,
    coachFocus,
    familyHighlights,
    isParentContext,
    switcherChildren,
    selectedAthleteId,
    selectedAthleteName,
    activeChildId,
    handleSelectChild,
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

  const showChildSwitcher =
    isParentContext && switcherChildren.length > 1 && Boolean(selectedAthleteId);
  const pageTitle = isParentContext ? 'Progress' : 'My Progress';
  const backgroundDecor = (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha(colors.tint, 0.12),
          withAlpha(colors.background, 0.6),
          colors.background,
        ]}
        locations={[0, 0.3, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bgOrb,
          styles.bgOrbTop,
          { backgroundColor: withAlpha(colors.tint, 0.1) },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bgOrb,
          styles.bgOrbBottom,
          { backgroundColor: withAlpha(colors.info, 0.08) },
        ]}
      />
    </>
  );

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
    if (!isParentContext || !selectedAthleteId || !latestFeedback?.coachId) {
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
        width: 1080,
        height: 1080,
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

  const handleViewAllGoals = useCallback(() => {
    router.push(Routes.GOALS);
  }, []);

  const handleViewAllBadges = useCallback(() => {
    if (isParentContext && selectedAthleteId) {
      router.push(Routes.childBadges(selectedAthleteId));
      return;
    }
    router.push(Routes.BADGES);
  }, [isParentContext, selectedAthleteId]);

  const handleHomeworkProofUpload = useCallback(
    async (proofType: 'photo' | 'video') => {
      if (isParentContext || !latestHomeworkFeedback || homeworkCompleted || homeworkProofSubmitting) {
        return;
      }

      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('Permission needed', 'Allow media access to upload homework proof.');
          return;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            proofType === 'video'
              ? ImagePicker.MediaTypeOptions.Videos
              : ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: false,
          quality: 0.8,
        });

        if (pickerResult.canceled || !pickerResult.assets[0]?.uri) {
          return;
        }

        const selectedAsset = pickerResult.assets[0];
        if (proofType === 'video' && (selectedAsset.duration ?? 0) > 10_000) {
          Alert.alert('Video too long', 'Upload a clip up to 10 seconds.');
          return;
        }

        setHomeworkProofSubmitting(true);
        await markHomeworkDone({
          proofType,
          proofUri: selectedAsset.uri,
        });
      } catch {
        Alert.alert('Upload failed', 'Could not upload homework proof right now.');
      } finally {
        setHomeworkProofSubmitting(false);
      }
    },
    [
      homeworkCompleted,
      homeworkProofSubmitting,
      isParentContext,
      latestHomeworkFeedback,
      markHomeworkDone,
    ],
  );

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
      isSubmittingProof: homeworkProofSubmitting,
      onAddPhotoProof: isParentContext ? undefined : () => void handleHomeworkProofUpload('photo'),
      onAddVideoProof: isParentContext ? undefined : () => void handleHomeworkProofUpload('video'),
    };
  }, [
    handleHomeworkProofUpload,
    homeworkCompleted,
    homeworkProofSubmitting,
    isParentContext,
    latestHomeworkFeedback,
    latestHomeworkProof?.completedAt,
    latestHomeworkProof?.proofType,
    latestHomeworkProof?.proofUri,
  ]);

  const progressSummaryLine = useMemo(() => {
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
    const technicalNow = latestFeedback.fourCorners?.technical;
    const technicalPrevious = previousWithCorners?.fourCorners?.technical;
    const technicalDelta =
      typeof technicalNow === 'number' && typeof technicalPrevious === 'number'
        ? technicalNow - technicalPrevious
        : null;

    const segments = [`Last session: ${dateLabel} with ${coachLabel}`];
    if (typeof technicalNow === 'number') {
      const deltaSuffix =
        typeof technicalDelta === 'number' && technicalDelta !== 0
          ? ` (${technicalDelta > 0 ? `+${technicalDelta}` : technicalDelta})`
          : '';
      segments.push(`Technical ${technicalNow}/5${deltaSuffix}`);
    }
    return segments.join(' · ');
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
      Alert.alert('Unable to generate report', reportResult.error.message);
      return;
    }

    try {
      await Share.share({
        title: `${selectedAthleteName} Termly Progress Report`,
        message: progressTermlyReportService.buildShareMessage(reportResult.data),
      });
    } catch {
      Alert.alert('Share failed', 'Could not share the termly report right now.');
    }
  }, [generateTermlyReport, selectedAthleteName]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {backgroundDecor}
        <PageHeader title={pageTitle} showBack centerTitle onBackPress={() => router.back()} />
        {showChildSwitcher ? (
          <View style={styles.switcherWrap}>
            <ChildSwitcher
              options={switcherChildren}
              selectedId={selectedAthleteId ?? undefined}
              onSelect={handleSelectChild}
              activeChildId={activeChildId}
            />
          </View>
        ) : null}
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
        {backgroundDecor}
        <PageHeader title={pageTitle} showBack centerTitle onBackPress={() => router.back()} />
        {showChildSwitcher ? (
          <View style={styles.switcherWrap}>
            <ChildSwitcher
              options={switcherChildren}
              selectedId={selectedAthleteId ?? undefined}
              onSelect={handleSelectChild}
              activeChildId={activeChildId}
            />
          </View>
        ) : null}
        <ErrorState message={error?.message ?? 'Unable to load progress.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (!currentUser || status === 'empty' || !progress) {
    const isParentWithoutChildren = isParentContext && switcherChildren.length === 0;
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {backgroundDecor}
        <PageHeader title={pageTitle} showBack centerTitle onBackPress={() => router.back()} />
        {showChildSwitcher ? (
          <View style={styles.switcherWrap}>
            <ChildSwitcher
              options={switcherChildren}
              selectedId={selectedAthleteId ?? undefined}
              onSelect={handleSelectChild}
              activeChildId={activeChildId}
            />
          </View>
        ) : null}
        <EmptyState
          icon={isParentWithoutChildren ? 'people-outline' : 'analytics-outline'}
          title={isParentWithoutChildren ? 'No children linked yet' : 'No progress yet'}
          message={
            isParentWithoutChildren
              ? 'Add a child profile to start tracking progress and badges.'
              : 'Complete sessions to start tracking progress.'
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {backgroundDecor}
      <PageHeader title={pageTitle} showBack centerTitle onBackPress={() => router.back()} />

      {showChildSwitcher ? (
        <View style={styles.switcherWrap}>
          <ChildSwitcher
            options={switcherChildren}
            selectedId={selectedAthleteId ?? undefined}
            onSelect={handleSelectChild}
            activeChildId={activeChildId}
          />
        </View>
      ) : null}

      <Animated.ScrollView
        ref={scrollRef}
        onLayout={scrollAnimations.onViewportLayout}
        onScroll={scrollAnimations.scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {progressSummaryLine ? (
          <Animated.View
            style={summaryLineStyle}
            onLayout={scrollAnimations.createSectionLayoutHandler('summary-line')}
          >
            <View
              style={[
                styles.summaryLine,
                {
                  borderColor: withAlpha(colors.border, 0.65),
                  backgroundColor: withAlpha(colors.surface, 0.78),
                },
              ]}
            >
              <ThemedText style={[styles.summaryLineText, { color: colors.muted }]}>
                {progressSummaryLine}
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View
          style={playerCardStyle}
          onLayout={scrollAnimations.createSectionLayoutHandler('player-card')}
        >
          <PlayerCard data={playerCard} />
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
              isParentView={isParentContext}
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
            onViewAll={handleViewAllGoals}
          />
        </Animated.View>

        <Animated.View
          style={badgesStyle}
          onLayout={scrollAnimations.createSectionLayoutHandler('badges')}
        >
          <BadgeWall
            badges={allBadges}
            athleteName={selectedAthleteName}
            onViewFull={handleViewAllBadges}
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
  switcherWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  pentagonCluster: {
    gap: Spacing.xs,
  },
  summaryLine: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  summaryLineText: {
    ...Typography.bodySmall,
    letterSpacing: 0.1,
  },
  bgOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  bgOrbTop: {
    width: 280,
    height: 280,
    top: -120,
    right: -80,
  },
  bgOrbBottom: {
    width: 220,
    height: 220,
    bottom: 80,
    left: -110,
  },
});
