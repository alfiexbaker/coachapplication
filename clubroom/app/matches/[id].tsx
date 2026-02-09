import { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { createLogger } from '@/utils/logger';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { LineupSelector } from '@/components/match/lineup-selector';
import { AvailabilityResponse } from '@/components/match/availability-response';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import type { Match } from '@/constants/types';
import { matchService } from '@/services/match-service';

const logger = createLogger('MatchDetailScreen');

// Decorative: match lineup selected status color
const SELECTED_STATUS_COLOR = SELECTED_STATUS_COLOR;

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLineupSelector, setShowLineupSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  // For parent view, find their child in the match
  const currentPlayerInfo = match?.selectedPlayers.find(
    (p) => p.parentId === currentUser?.id || p.parentId === 'parent_1' // demo fallback
  );

  const loadMatch = useCallback(async () => {
    try {
      if (!id) return;
      const data = await matchService.getMatch(id);
      setMatch(data);
    } catch (error) {
      logger.error('Failed to load match:', error);
    }
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    loadMatch().finally(() => setIsLoading(false));
  }, [loadMatch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMatch();
    setIsRefreshing(false);
  };

  const handleSetLineup = async (
    lineup: {
      athleteId: string;
      position?: string;
      jerseyNumber?: number;
      isReserve?: boolean;
    }[]
  ) => {
    if (!match) return;
    setIsSubmitting(true);

    try {
      const result = await matchService.setLineup({
        matchId: match.id,
        lineup });
      if (!result.success) {
        logger.error('Failed to set lineup:', result.error);
        Alert.alert('Error', 'Failed to set lineup. Please try again.');
        return;
      }
      setMatch(result.data);
      setShowLineupSelector(false);
      Alert.alert('Lineup Set', 'The lineup has been confirmed and players notified.');
    } catch (error) {
      logger.error('Failed to set lineup:', error);
      Alert.alert('Error', 'Failed to set lineup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayerResponse = async (status: 'AVAILABLE' | 'UNAVAILABLE', note?: string) => {
    if (!match || !currentPlayerInfo) return;
    setIsSubmitting(true);

    try {
      const result = await matchService.respondToMatch({
        matchId: match.id,
        athleteId: currentPlayerInfo.athleteId,
        parentId: currentPlayerInfo.parentId,
        status,
        note });
      if (!result.success) {
        logger.error('Failed to respond:', result.error);
        throw new Error(result.error.message);
      }
      setMatch(result.data);
    } catch (error) {
      logger.error('Failed to respond:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordResult = () => {
    Alert.prompt(
      'Record Result',
      'Enter the final score (home-away, e.g., 3-1)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (score: string | undefined) => {
            if (!score || !match) return;
            const [home, away] = score.split('-').map(Number);
            if (isNaN(home) || isNaN(away)) {
              Alert.alert('Invalid Score', 'Please enter a valid score like 3-1');
              return;
            }
            try {
              const result = await matchService.recordResult(match.id, { home, away });
              if (!result.success) {
                Alert.alert('Error', 'Failed to record result.');
                return;
              }
              setMatch(result.data);
              Alert.alert('Result Recorded', 'The match result has been saved.');
            } catch {
              Alert.alert('Error', 'Failed to record result.');
            }
          } },
      ],
      'plain-text'
    );
  };

  const handleCancelMatch = () => {
    Alert.alert(
      'Cancel Match',
      'Are you sure you want to cancel this match? All players will be notified.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Match',
          style: 'destructive',
          onPress: async () => {
            if (!match) return;
            try {
              const result = await matchService.cancelMatch(match.id);
              if (!result.success) {
                Alert.alert('Error', 'Failed to cancel match.');
                return;
              }
              setMatch(result.data);
            } catch {
              Alert.alert('Error', 'Failed to cancel match.');
            }
          } },
      ]
    );
  };

  if (isLoading || !match) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PageContainer
          header={<PageHeader title="Loading..." showBack onBackPress={() => router.back()} />}
        >
          <View style={styles.loadingContainer}>
            <ThemedText style={{ color: palette.muted }}>Loading match details...</ThemedText>
          </View>
        </PageContainer>
      </>
    );
  }

  const matchDate = new Date(match.date);
  const dateLabel = matchDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric' });

  const typeColor = matchService.getMatchTypeColor(match.matchType);
  const statusColor = matchService.getStatusColor(match.status);
  const availability = matchService.getAvailabilitySummary(match);

  const isUpcoming = match.status === 'SCHEDULED' || match.status === 'LINEUP_SET';
  const isComplete = match.status === 'COMPLETED';
  const isCancelled = match.status === 'CANCELLED';

  // Show lineup selector view
  if (showLineupSelector && isCoach) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PageContainer
          header={
            <PageHeader
              title="Set Lineup"
              subtitle={match.title}
              showBack
              onBackPress={() => setShowLineupSelector(false)}
            />
          }
          gap={0}
          horizontalSpacing={Spacing.md}
        >
          <LineupSelector
            match={match}
            onSetLineup={handleSetLineup}
            isLoading={isSubmitting}
          />
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PageContainer
        header={
          <PageHeader
            title="Match Details"
            subtitle={match.clubName}
            showBack
            onBackPress={() => router.back()}
          />
        }
        gap={0}
        horizontalSpacing={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Match header card */}
          <SurfaceCard
            style={styles.headerCard}
            outlineGradient={isUpcoming ? [typeColor, withAlpha(typeColor, 0.38)] : undefined}
          >
            {/* Status badges */}
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: withAlpha(typeColor, 0.09) }]}>
                <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>
                  {matchService.formatMatchType(match.matchType)}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
                <ThemedText style={[styles.statusBadgeText, { color: statusColor }]}>
                  {matchService.formatStatus(match.status)}
                </ThemedText>
              </View>
              <View style={[styles.homeAwayBadge, { backgroundColor: palette.surface }]}>
                <Ionicons
                  name={match.isHome ? 'home' : 'airplane'}
                  size={12}
                  color={palette.muted}
                />
                <ThemedText style={[styles.homeAwayText, { color: palette.muted }]}>
                  {match.isHome ? 'Home' : 'Away'}
                </ThemedText>
              </View>
            </View>

            {/* Title and opponent */}
            <ThemedText type="title" style={styles.title}>{match.title}</ThemedText>
            <View style={styles.opponentRow}>
              <ThemedText style={[styles.vsText, { color: palette.muted }]}>vs</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.opponent}>
                {match.opponent}
              </ThemedText>
            </View>

            {/* Result if completed */}
            {match.result && (
              <View style={styles.resultContainer}>
                <View style={[styles.resultBox, { backgroundColor: palette.surface }]}>
                  <ThemedText style={styles.resultScore}>
                    {match.isHome
                      ? `${match.result.home} - ${match.result.away}`
                      : `${match.result.away} - ${match.result.home}`}
                  </ThemedText>
                  <ThemedText style={[styles.resultLabel, { color: palette.muted }]}>
                    Final Score
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Schedule details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={20} color={palette.tint} />
                <ThemedText style={styles.detailText}>{dateLabel}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="time" size={20} color={palette.tint} />
                <ThemedText style={styles.detailText}>
                  Kickoff: {match.kickoffTime}
                  {match.meetTime && (
                    <ThemedText style={{ color: palette.muted }}>
                      {' '}(Meet: {match.meetTime})
                    </ThemedText>
                  )}
                </ThemedText>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color={palette.tint} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.detailText}>{match.venue}</ThemedText>
                  {match.address && (
                    <ThemedText style={[styles.addressText, { color: palette.muted }]}>
                      {match.address}
                    </ThemedText>
                  )}
                </View>
              </View>
              {match.squadName && (
                <View style={styles.detailRow}>
                  <Ionicons name="people" size={20} color={palette.tint} />
                  <ThemedText style={styles.detailText}>{match.squadName}</ThemedText>
                </View>
              )}
            </View>

            {/* Notes */}
            {match.notes && (
              <View style={[styles.notesBox, { backgroundColor: palette.surface }]}>
                <Ionicons name="chatbubble-outline" size={16} color={palette.muted} />
                <ThemedText style={styles.notesText}>{match.notes}</ThemedText>
              </View>
            )}
          </SurfaceCard>

          {/* Parent view - availability response */}
          {!isCoach && currentPlayerInfo && isUpcoming && (
            <View style={styles.section}>
              <AvailabilityResponse
                match={match}
                player={currentPlayerInfo}
                onRespond={handlePlayerResponse}
                isLoading={isSubmitting}
              />
            </View>
          )}

          {/* Coach view - availability stats and actions */}
          {isCoach && isUpcoming && (
            <View style={styles.section}>
              <SurfaceCard style={styles.statsCard}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Squad Availability
                </ThemedText>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: palette.success }]} />
                    <ThemedText type="title" style={{ color: palette.success }}>
                      {availability.available}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                      Available
                    </ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: palette.error }]} />
                    <ThemedText type="title" style={{ color: palette.error }}>
                      {availability.unavailable}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                      Unavailable
                    </ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: palette.warning }]} />
                    <ThemedText type="title" style={{ color: palette.warning }}>
                      {availability.pending}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                      Pending
                    </ThemedText>
                  </View>
                  {match.status === 'LINEUP_SET' && (
                    <View style={styles.statItem}>
                      <View style={[styles.statDot, { backgroundColor: SELECTED_STATUS_COLOR }]} />
                      <ThemedText type="title" style={{ color: SELECTED_STATUS_COLOR }}>
                        {availability.selected}
                      </ThemedText>
                      <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                        Selected
                      </ThemedText>
                    </View>
                  )}
                </View>

                {match.status === 'SCHEDULED' && availability.available > 0 && (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: palette.tint }]}
                    onPress={() => setShowLineupSelector(true)}
                  >
                    <Ionicons name="people" size={20} color={palette.onPrimary} />
                    <ThemedText style={[styles.actionButtonText, { color: palette.onPrimary }]}>Set Lineup</ThemedText>
                  </Pressable>
                )}
              </SurfaceCard>
            </View>
          )}

          {/* Player list */}
          {match.selectedPlayers.length > 0 && (
            <View style={styles.section}>
              <SurfaceCard style={styles.playersCard}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  {match.status === 'LINEUP_SET' ? 'Match Day Squad' : 'Invited Players'}
                </ThemedText>
                <View style={styles.playersList}>
                  {match.selectedPlayers.map((player) => {
                    const statusColor = matchService.getPlayerStatusColor(player.status);
                    return (
                      <View
                        key={player.athleteId}
                        style={[styles.playerRow, { borderBottomColor: palette.border }]}
                      >
                        <View
                          style={[styles.playerAvatar, { backgroundColor: withAlpha(statusColor, 0.09) }]}
                        >
                          <ThemedText style={[styles.avatarText, { color: statusColor }]}>
                            {player.athleteName.slice(0, 2).toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={styles.playerInfo}>
                          <ThemedText type="defaultSemiBold">{player.athleteName}</ThemedText>
                          {player.position && (
                            <ThemedText style={[styles.playerPosition, { color: palette.muted }]}>
                              {player.position}
                              {player.jerseyNumber && ` #${player.jerseyNumber}`}
                            </ThemedText>
                          )}
                        </View>
                        <View
                          style={[styles.statusPill, { backgroundColor: withAlpha(statusColor, 0.09) }]}
                        >
                          <ThemedText style={[styles.statusPillText, { color: statusColor }]}>
                            {matchService.formatPlayerStatus(player.status)}
                          </ThemedText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </SurfaceCard>
            </View>
          )}

          {/* Coach actions */}
          {isCoach && (
            <View style={styles.section}>
              <View style={styles.coachActions}>
                {isComplete && !match.result && (
                  <Pressable
                    style={[styles.secondaryButton, { borderColor: palette.tint }]}
                    onPress={handleRecordResult}
                  >
                    <Ionicons name="trophy" size={18} color={palette.tint} />
                    <ThemedText style={[styles.secondaryButtonText, { color: palette.tint }]}>
                      Record Result
                    </ThemedText>
                  </Pressable>
                )}
                {isUpcoming && !isCancelled && (
                  <Pressable
                    style={[styles.secondaryButton, { borderColor: palette.error }]}
                    onPress={handleCancelMatch}
                  >
                    <Ionicons name="close-circle" size={18} color={palette.error} />
                    <ThemedText style={[styles.secondaryButtonText, { color: palette.error }]}>
                      Cancel Match
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </PageContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center' },
  scrollView: {
    flex: 1 },
  scrollContent: {
    paddingBottom: Spacing.xl * 2 },
  headerCard: {
    margin: Spacing.md,
    gap: Spacing.sm },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill },
  typeBadgeText: {
    ...Typography.caption,
    textTransform: 'uppercase' },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill },
  statusBadgeText: {
    ...Typography.caption },
  homeAwayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill },
  homeAwayText: {
    ...Typography.caption },
  title: {
    ...Typography.title,
    marginTop: Spacing.xs },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs },
  vsText: {
    ...Typography.bodySmall },
  opponent: {
    ...Typography.subheading },
  resultContainer: {
    alignItems: 'center',
    marginVertical: Spacing.sm },
  resultBox: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center' },
  resultScore: {
    ...Typography.display },
  resultLabel: {
    ...Typography.caption,
    marginTop: Spacing.xxs },
  detailsSection: {
    gap: Spacing.sm,
    marginTop: Spacing.sm },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm },
  detailText: {
    ...Typography.bodySmall,
    flex: 1 },
  addressText: {
    ...Typography.small,
    marginTop: Spacing.micro },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm },
  notesText: {
    ...Typography.small,
    flex: 1,
    fontStyle: 'italic' },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md },
  sectionTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.sm },
  statsCard: {
    gap: Spacing.sm },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around' },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xxs },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs },
  statLabel: {
    ...Typography.caption },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.sm },
  actionButtonText: {
    ...Typography.bodySemiBold },
  playersCard: {
    gap: Spacing.sm },
  playersList: {
    gap: 0 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center' },
  avatarText: {
    ...Typography.bodySmallSemiBold },
  playerInfo: {
    flex: 1 },
  playerPosition: {
    ...Typography.caption },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill },
  statusPillText: {
    ...Typography.caption },
  coachActions: {
    gap: Spacing.sm },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1 },
  secondaryButtonText: {
    ...Typography.bodySemiBold } });