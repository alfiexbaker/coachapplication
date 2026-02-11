/**
 * Match Detail Screen
 *
 * Displays match information, availability, lineup, and actions.
 * Coach view: set lineup, record result, cancel match.
 * Parent view: respond to availability.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { router, Stack } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { LineupSelector } from '@/components/match/lineup-selector';
import { AvailabilityResponse } from '@/components/match/availability-response';
import { MatchHeaderCard } from '@/components/match/match-header-card';
import { MatchAvailabilityStats } from '@/components/match/match-availability-stats';
import { MatchPlayerList } from '@/components/match/match-player-list';
import { MatchCoachActions } from '@/components/match/match-coach-actions';
import { Spacing } from '@/constants/theme';
import { useMatchDetail } from '@/hooks/use-match-detail';

export default function MatchDetailScreen() {
  const {
    match, status, error, refreshing, onRefresh, retry, showLineupSelector, isSubmitting,
    isCoach, currentPlayerInfo, isUpcoming, isComplete, isCancelled,
    setShowLineupSelector,
    handleSetLineup, handlePlayerResponse,
    handleRecordResult, handleCancelMatch,
  } = useMatchDetail();

  if (status === 'loading') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PageContainer header={<PageHeader title="Loading..." showBack onBackPress={() => router.back()} />}>
          <LoadingState variant="detail" />
        </PageContainer>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PageContainer header={<PageHeader title="Match Details" showBack onBackPress={() => router.back()} />}>
          <ErrorState message={error?.message || 'Failed to load match details.'} onRetry={retry} />
        </PageContainer>
      </>
    );
  }

  if (status === 'empty' || !match) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PageContainer header={<PageHeader title="Match Details" showBack onBackPress={() => router.back()} />}>
          <EmptyState
            icon="football-outline"
            title="Match not found"
            message="This match could not be loaded."
            actionLabel="Go Back"
            onPressAction={() => router.back()}
          />
        </PageContainer>
      </>
    );
  }

  if (showLineupSelector && isCoach) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PageContainer
          header={<PageHeader title="Set Lineup" subtitle={match.title} showBack onBackPress={() => setShowLineupSelector(false)} />}
          gap={0} horizontalSpacing={Spacing.md}
        >
          <LineupSelector match={match} onSetLineup={handleSetLineup} isLoading={isSubmitting} />
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PageContainer
        header={<PageHeader title="Match Details" subtitle={match.clubId} showBack onBackPress={() => router.back()} />}
        gap={0} horizontalSpacing={0}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

          <MatchHeaderCard match={match} isUpcoming={!!isUpcoming} />

          {!isCoach && currentPlayerInfo && isUpcoming && (
            <View style={styles.section}>
              <AvailabilityResponse match={match} player={currentPlayerInfo} onRespond={handlePlayerResponse} isLoading={isSubmitting} />
            </View>
          )}

          {isCoach && isUpcoming && (
            <View style={styles.section}>
              <MatchAvailabilityStats match={match} onSetLineup={() => setShowLineupSelector(true)} />
            </View>
          )}

          {match.selectedPlayers.length > 0 && (
            <View style={styles.section}>
              <MatchPlayerList match={match} />
            </View>
          )}

          {isCoach && (
            <View style={styles.section}>
              <MatchCoachActions
                isComplete={!!isComplete} isUpcoming={!!isUpcoming} isCancelled={!!isCancelled}
                hasResult={!!match.result} onRecordResult={handleRecordResult} onCancelMatch={handleCancelMatch}
              />
            </View>
          )}
        </ScrollView>
      </PageContainer>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: Spacing.xl * 2 },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
});
