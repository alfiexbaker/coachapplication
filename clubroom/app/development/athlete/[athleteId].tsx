import { View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageContainer } from '@/components/primitives/page-container';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, EmptyState } from '@/components/ui/screen-states';
import { DevAthleteHero } from '@/components/development/dev-athlete-hero';
import { DevSpecialNeedsCard } from '@/components/development/dev-special-needs-card';
import { DevProgressionCard } from '@/components/development/dev-progression-card';
import { DevSessionCard } from '@/components/development/dev-session-card';
import { BadgeAwardModal, BADGE_REASONS } from '@/components/badges/badge-award-modal';
import { Spacing } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useAthleteDevelopment } from '@/hooks/use-athlete-development';
import { Routes } from '@/navigation/routes';
import { Clickable } from '@/components/primitives/clickable';

export default function AthleteDetailScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId?: string | string[] }>();
  const resolvedAthleteId = Array.isArray(athleteId) ? athleteId[0] : athleteId;
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    athlete,
    currentUser,
    loading,
    sortedSessions,
    sessions,
    awards,
    selectedSession,
    showBadgeModal,
    childProfile,
    progressionSummary,
    trend,
    level,
    selectedSessionLabel,
    handleLogSession,
    handleOpenBadgeModal,
    handleSelectSession,
    handleCloseModal,
    handleOnAwarded,
  } = useAthleteDevelopment(resolvedAthleteId ?? '');

  if (!resolvedAthleteId) {
    return (
      <PageContainer>
        <EmptyState
          icon="alert-circle-outline"
          title="Athlete link is invalid"
          message="Open this athlete again from the roster."
        />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (!athlete || !currentUser) {
    return (
      <PageContainer>
        <EmptyState
          icon="person-outline"
          title="Athlete not found"
          message="This athlete profile is unavailable."
        />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        gap={Spacing.lg}
        header={
          <Row
            align="center"
            justify="space-between"
            style={{
              paddingHorizontal: Spacing.lg,
              paddingTop: Spacing.md,
              paddingBottom: Spacing.sm,
            }}
          >
            <Clickable onPress={() => router.back()} style={{ padding: Spacing.xs }}>
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </Clickable>
            <ThemedText type="title">Athlete Progress</ThemedText>
            <View style={{ width: 24 }} />
          </Row>
        }
      >
        <DevAthleteHero
          athleteName={athlete.name}
          avatar={athlete.avatar}
          sessions={sessions}
          sortedSessions={sortedSessions}
          trend={trend}
          level={level}
          colors={colors}
          onLogSession={handleLogSession}
          onAwardBadge={handleOpenBadgeModal}
        />

        <DevSpecialNeedsCard
          childProfile={childProfile}
          colors={colors}
          onPress={() => router.push(Routes.developmentAthleteSpecialNeeds(resolvedAthleteId))}
        />

        {progressionSummary && <DevProgressionCard summary={progressionSummary} colors={colors} />}

        <Column gap="xs" style={{ marginTop: Spacing.xs }}>
          <ThemedText type="heading">Session History</ThemedText>
          <ThemedText style={{ color: colors.muted }}>
            {sortedSessions.length} sessions completed. Tap any card to open feedback.
          </ThemedText>
        </Column>

        <Column gap="sm">
          {sortedSessions.map((session) => (
            <DevSessionCard
              key={session.id}
              session={session}
              awards={awards}
              colors={colors}
              onSelectForBadge={handleSelectSession}
            />
          ))}
        </Column>
      </PageContainer>

      <BadgeAwardModal
        visible={!!selectedSession || showBadgeModal}
        athleteId={athlete.id}
        athleteName={athlete.name}
        coachId={currentUser.id}
        coachName={currentUser.name}
        sessionId={selectedSession?.id}
        sessionLabel={selectedSession ? selectedSessionLabel : undefined}
        initialReason={selectedSession?.nextFocusAreas?.find((focus) =>
          BADGE_REASONS.includes(focus),
        )}
        onClose={handleCloseModal}
        onAwarded={handleOnAwarded}
      />
    </>
  );
}
