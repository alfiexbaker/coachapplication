import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { StatCard } from '@/components/primitives/stat-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserById, getSessionsForCoach, formatDate } from '@/constants/mock-data';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { Session, BadgeAward, BadgeCategory } from '@/constants/types';
import { badgeService } from '@/services/badge-service';
import { BadgeAwardModal, BADGE_REASONS } from '@/components/badges/badge-award-modal';
import { ProgressionLevel } from '@/constants/progression';
import { childService, type ChildProfile } from '@/services/child-service';

const logger = createLogger('AthleteDetailScreen');

export default function AthleteDetailScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [progressionSummary, setProgressionSummary] = useState<{
    totalPoints: number;
    currentLevel: ProgressionLevel;
    nextLevel: ProgressionLevel | null;
    progressPercent: number;
    pointsToNext: number;
    totalBadges: number;
    topCategories: { category: BadgeCategory; label: string; badgeCount: number; totalPoints: number }[];
  } | null>(null);

  const athlete = getUserById(athleteId!);

  // Load sessions from both mock data and AsyncStorage
  useEffect(() => {
    const loadSessions = async () => {
      if (!currentUser) return;

      try {
        // Get mock data sessions
        const mockSessions = getSessionsForCoach(currentUser.id).filter(
          s => s.athleteId === athleteId
        );

        // Get AsyncStorage sessions
        const asyncSessions = await apiClient.get<Session[]>('coach_sessions', []);
        const athleteAsyncSessions = asyncSessions.filter(
          (s) => s.athleteId === athleteId && s.coachId === currentUser.id
        );

        // Combine both sources
        const allSessions = [...mockSessions, ...athleteAsyncSessions];
        setSessions(allSessions);
        logger.debug('Sessions loaded', {
          mockCount: mockSessions.length,
          asyncCount: athleteAsyncSessions.length,
          total: allSessions.length,
        });
      } catch (error) {
        logger.error('Failed to load sessions', error);
        // Fallback to mock data only
        const mockSessions = getSessionsForCoach(currentUser.id).filter(
          s => s.athleteId === athleteId
        );
        setSessions(mockSessions);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [athleteId, currentUser]);

  useEffect(() => {
    if (!athleteId) return;

    // Load awards and progression summary in parallel
    Promise.all([
      badgeService.listAwardsForAthlete(athleteId),
      badgeService.getProgressionSummary(athleteId),
    ]).then(([awardsData, progression]) => {
      setAwards(awardsData);
      setProgressionSummary(progression);
    });
  }, [athleteId]);

  // Load child profile for special needs info (by athlete name)
  useEffect(() => {
    if (!athlete) return;

    const loadChildProfile = async () => {
      try {
        const nameParts = athlete.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        const profile = await childService.getChildByName(firstName, lastName);
        if (profile) {
          setChildProfile(profile);
          logger.debug('Child profile loaded', { athleteId, childId: profile.id, hasSpecialNeeds: profile.hasSpecialNeeds });
        }
      } catch (error) {
        logger.error('Failed to load child profile', error);
      }
    };

    loadChildProfile();
  }, [athlete, athleteId]);

  if (!athlete || !currentUser) {
    return null;
  }

  if (loading) {
    return (
      <PageContainer>
        <ThemedText>Loading...</ThemedText>
      </PageContainer>
    );
  }

  // Calculate progress trend based on last 3 sessions vs previous 3
  const getProgressTrend = () => {
    if (sessions.length < 2) return 'steady';

    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    const recentAvg = sortedSessions.slice(0, 3).reduce((sum, s) => sum + s.performanceRating, 0) / Math.min(3, sortedSessions.length);
    const previousAvg = sortedSessions.slice(3, 6).reduce((sum, s) => sum + s.performanceRating, 0) / Math.min(3, sortedSessions.slice(3, 6).length);

    if (sortedSessions.length < 4) return 'steady';
    if (recentAvg > previousAvg + 0.3) return 'improving';
    if (recentAvg < previousAvg - 0.3) return 'declining';
    return 'steady';
  };

  // Calculate level badge based on total sessions
  const getLevel = () => {
    const count = sessions.length;
    if (count >= 20) return { name: 'Gold', icon: 'trophy-outline' as const, color: '#FFD700' };
    if (count >= 10) return { name: 'Silver', icon: 'medal-outline' as const, color: '#C0C0C0' };
    return { name: 'Bronze', icon: 'ribbon-outline' as const, color: '#CD7F32' };
  };

  const trend = getProgressTrend();
  const level = getLevel();

  const trendIcon = trend === 'improving' ? 'trending-up' : trend === 'declining' ? 'trending-down' : 'pulse';
  const trendText = trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Needs Focus' : 'Steady';
  const trendColor = trend === 'improving' ? Colors.light.success : trend === 'declining' ? Colors.light.error : palette.muted;
  const selectedSessionLabel = selectedSession
    ? `${selectedSession.nextFocusAreas?.[0] ?? 'Coaching session'} · ${formatDate(selectedSession.completedAt)}`
    : undefined;

  // Sort sessions by date (newest first)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  logger.debug('Athlete detail rendered', {
    athleteId,
    sessionCount: sessions.length,
    trend,
    level: level.name,
  });

  return (
    <>
      <PageContainer
        gap={Spacing.lg}
        header={
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={palette.foreground} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>
              Athlete Progress
            </ThemedText>
            <View style={{ width: 24 }} />
          </View>
        }
      >

      {/* Hero Card - Athlete Overview */}
      <SurfaceCard style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {athlete.avatar || athlete.name.charAt(0)}
            </ThemedText>
          </View>
          <View style={styles.heroInfo}>
            <ThemedText type="heading" style={styles.athleteName} numberOfLines={2}>
              {athlete.name}
            </ThemedText>
            <ThemedText style={[styles.sessionCountLabel, { color: palette.muted }]}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} completed
            </ThemedText>
          </View>
        </View>

        {/* Badges Row - separated for better layout */}
        <View style={styles.badgesRow}>
          <View style={styles.badges}>
            <View style={[styles.trendBadge, { backgroundColor: withAlpha(trendColor, 0.09) }]}>
              <View style={styles.badgeRow}>
                <Ionicons name={trendIcon} size={14} color={trendColor} />
                <ThemedText style={[styles.badgeText, { color: trendColor }]}>
                  {trendText}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: withAlpha(level.color, 0.09) }]}>
              <View style={styles.badgeRow}>
                <Ionicons name={level.icon} size={14} color={level.color} />
                <ThemedText style={[styles.badgeText, { color: level.color }]}>
                  {level.name}
                </ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: palette.tint }]}
              onPress={async () => {
                logger.press('LogSession');

                try {
                  // Create new session
                  const sessionId = `session-${Date.now()}`;
                  const sessionRecord = {
                    id: sessionId,
                    athleteId,
                    athleteName: athlete.name,
                    coachId: currentUser.id,
                    bookingId: `manual-${Date.now()}`,
                    completedAt: new Date().toISOString(),
                    performanceRating: 3,
                    skillsWorkedOn: [],
                    notes: '',
                    videoUrls: [],
                    nextFocusAreas: [],
                    attendance: 'ATTENDED' as const,
                  };

                  // Save to AsyncStorage
                  const sessions = await apiClient.get<Session[]>('coach_sessions', []);
                  sessions.push(sessionRecord);
                  await apiClient.set('coach_sessions', sessions);

                  logger.info('Session created', { sessionId, athleteId });

                  // Navigate to session detail
                  router.push(Routes.developmentSession(sessionId));
                } catch (error) {
                  logger.error('Failed to create session', error);
                }
              }}
            >
              <ThemedText style={styles.ctaText}>Log Session</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.awardBadgeButton, { borderColor: palette.warning, backgroundColor: withAlpha(palette.warning, 0.09) }]}
              onPress={() => {
                logger.press('AwardBadgeFromProfile', { athleteId });
                setShowBadgeModal(true);
              }}
            >
              <Ionicons name="ribbon" size={14} color={palette.warning} />
              <ThemedText style={[styles.awardBadgeText, { color: palette.warning }]}>Award Badge</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Divider */}
        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            value={sessions.length}
            label="Total Sessions"
            variant="compact"
          />
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <StatCard
            value={(sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1)}
            label="Avg Rating"
            variant="compact"
            icon={<Ionicons name="star" size={16} color={palette.tint} />}
          />
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <StatCard
            value={sessions.length > 0 ? formatDate(sortedSessions[0].completedAt).split(' ')[0] : '-'}
            label="Last Session"
            variant="compact"
          />
        </View>
      </SurfaceCard>

      {/* Special Needs Summary Card - Always shows with count */}
      <SurfaceCard
        tactile
        onPress={() => {
          logger.press('SpecialNeedsCard', { athleteId });
          router.push(Routes.developmentAthleteSpecialNeeds(athleteId));
        }}
        style={styles.specialNeedsCard}
      >
        <View style={styles.specialNeedsRow}>
          <View style={[
            styles.specialNeedsIcon,
            {
              backgroundColor: childProfile?.hasSpecialNeeds
                ? withAlpha(palette.warning, 0.09)
                : withAlpha(palette.muted, 0.06)
            }
          ]}>
            <Ionicons
              name="accessibility"
              size={Components.icon.md}
              color={childProfile?.hasSpecialNeeds ? palette.warning : palette.muted}
            />
          </View>
          <View style={styles.specialNeedsInfo}>
            <ThemedText type="defaultSemiBold" style={styles.specialNeedsTitle}>
              Special Needs & Notes
            </ThemedText>
            <ThemedText style={[styles.specialNeedsSubtitle, { color: palette.muted }]}>
              {childProfile?.hasSpecialNeeds
                ? `${childProfile.disabilities.length} disabilities, ${childProfile.allergies.length} allergies`
                : 'No accommodations documented'}
            </ThemedText>
          </View>
          <View style={styles.specialNeedsCounters}>
            <View style={[
              styles.counterBadge,
              {
                backgroundColor: (childProfile?.disabilities.length ?? 0) > 0
                  ? palette.warning
                  : withAlpha(palette.muted, 0.12)
              }
            ]}>
              <ThemedText style={[
                styles.counterText,
                { color: (childProfile?.disabilities.length ?? 0) > 0 ? Colors.light.onPrimary : palette.muted }
              ]}>
                {childProfile?.disabilities.length ?? 0}
              </ThemedText>
            </View>
            <View style={[
              styles.counterBadge,
              {
                backgroundColor: (childProfile?.allergies.length ?? 0) > 0
                  ? palette.error
                  : withAlpha(palette.muted, 0.12)
              }
            ]}>
              <ThemedText style={[
                styles.counterText,
                { color: (childProfile?.allergies.length ?? 0) > 0 ? Colors.light.onPrimary : palette.muted }
              ]}>
                {childProfile?.allergies.length ?? 0}
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={Components.icon.md} color={palette.icon} />
        </View>

        {/* Quick preview of key info if has special needs */}
        {childProfile?.hasSpecialNeeds && childProfile.disabilities.length > 0 && (
          <View style={styles.quickPreview}>
            {childProfile.disabilities.slice(0, 2).map((d) => (
              <View key={d.id} style={[styles.previewTag, { backgroundColor: withAlpha(palette.warning, 0.07) }]}>
                <ThemedText style={[styles.previewTagText, { color: palette.warning }]}>{d.type}</ThemedText>
              </View>
            ))}
            {childProfile.allergies.slice(0, 2).map((a, i) => (
              <View key={i} style={[styles.previewTag, { backgroundColor: withAlpha(palette.error, 0.07) }]}>
                <ThemedText style={[styles.previewTagText, { color: palette.error }]}>{a}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>

      {/* Badge Progression Summary */}
      {progressionSummary && (
        <SurfaceCard style={styles.progressionCard}>
          <View style={styles.progressionHeader}>
            <View style={styles.progressionBadge}>
              <Ionicons name="trophy" size={20} color={palette.tint} />
            </View>
            <View style={styles.progressionInfo}>
              <ThemedText type="defaultSemiBold" style={styles.progressionLevel}>
                Level {progressionSummary.currentLevel.level}: {progressionSummary.currentLevel.name}
              </ThemedText>
              <ThemedText style={[styles.progressionPoints, { color: palette.muted }]}>
                {progressionSummary.totalPoints} pts from {progressionSummary.totalBadges} badge{progressionSummary.totalBadges !== 1 ? 's' : ''}
              </ThemedText>
            </View>
          </View>

          {progressionSummary.nextLevel && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: palette.tint,
                      width: `${progressionSummary.progressPercent}%`,
                    },
                  ]}
                />
              </View>
              <ThemedText style={[styles.progressText, { color: palette.muted }]}>
                {progressionSummary.pointsToNext} pts to {progressionSummary.nextLevel.name}
              </ThemedText>
            </View>
          )}

          {progressionSummary.topCategories.length > 0 && (
            <View style={styles.topCategoriesSection}>
              <ThemedText style={[styles.topCategoriesLabel, { color: palette.muted }]}>
                Top categories
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.topCategoriesRow}>
                  {progressionSummary.topCategories.map((cat) => (
                    <View
                      key={cat.category}
                      style={[styles.categoryChip, { backgroundColor: withAlpha(palette.tint, 0.07) }]}
                    >
                      <ThemedText style={[styles.categoryChipText, { color: palette.tint }]}>
                        {cat.label}
                      </ThemedText>
                      <View style={[styles.categoryCountBadge, { backgroundColor: palette.tint }]}>
                        <ThemedText style={styles.categoryCountText}>
                          {cat.badgeCount}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </SurfaceCard>
      )}

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <ThemedText type="heading" style={styles.sectionTitle}>
          Session History
        </ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
          {sortedSessions.length} sessions completed
        </ThemedText>
      </View>

      {/* Session Cards */}
      <View style={styles.sessionList}>
        {sortedSessions.map((session) => {
          const needsNotes = !session.notes || session.notes.trim() === '';
          const sessionAwards = awards.filter((award) => award.sessionId === session.id);

          return (
            <SurfaceCard
              key={session.id}
              tactile
              onPress={() => {
                logger.press('SessionCard', { sessionId: session.id, source: 'AthleteDetail' });
                router.push(Routes.developmentSession(session.id));
              }}
              accessibilityRole="button"
              accessibilityLabel={`Session on ${formatDate(session.completedAt)}`}
              style={styles.sessionCard}
            >
              <View style={styles.sessionHeader}>
                <View style={styles.sessionHeaderLeft}>
                  <ThemedText type="defaultSemiBold" style={styles.sessionDate}>
                    {formatDate(session.completedAt)}
                  </ThemedText>
                  {needsNotes && (
                    <View style={[styles.needsNotesBadge, { backgroundColor: palette.error }]}>
                      <ThemedText style={styles.needsNotesText}>Needs Notes</ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.sessionActions}>
                  <Clickable
                    onPress={() => {
                      logger.info('badge_workspace_deeplink', {
                        sessionId: session.id,
                        athleteId,
                        source: 'AthleteSessionHistory',
                      });
                      setSelectedSession(session);
                    }}
                    accessibilityLabel="Open badges workspace for this session"
                    hitSlop={10}
                  >
                    <View style={[styles.awardChip, styles.workspaceChip, { borderColor: palette.tint, backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                      <Ionicons name="ribbon-outline" size={14} color={palette.tint} />
                    </View>
                  </Clickable>
                  <View style={styles.ratingRow}>
                    <ThemedText style={styles.rating}>{session.performanceRating}</ThemedText>
                    <Ionicons name="star" size={16} color={palette.tint} />
                  </View>
                </View>
              </View>

              {sessionAwards.length > 0 ? (
                <View style={styles.awardRow}>
                  {sessionAwards.map((award) => (
                    <View
                      key={award.id}
                      style={[styles.awardChip, { borderColor: palette.border }]}
                    >
                      <ThemedText style={{ fontWeight: '700' }}>{award.badgeLabel}</ThemedText>
                      <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                        {formatDate(award.awardedAt)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Skills worked on */}
              {session.skillsWorkedOn.length > 0 && (
                <View style={styles.skillsRow}>
                  {session.skillsWorkedOn.map((skill, index) => (
                    <View
                      key={index}
                      style={[styles.skillChip, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
                    >
                      <ThemedText style={[styles.skillText, { color: palette.tint }]}>
                        {skill}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {/* Notes preview */}
              {session.notes && session.notes.trim() !== '' && (
                <ThemedText
                  style={[styles.notesPreview, { color: palette.muted }]}
                  numberOfLines={2}
                >
                  {session.notes}
                </ThemedText>
              )}

              {/* Video indicator */}
              {session.videoUrls && session.videoUrls.length > 0 && (
                <View style={styles.videoIndicator}>
                  <Ionicons name="videocam" size={14} color={palette.tint} />
                  <ThemedText style={[styles.videoText, { color: palette.tint }]}>
                    {session.videoUrls.length}{' '}
                    {session.videoUrls.length === 1 ? 'video' : 'videos'}
                  </ThemedText>
                </View>
              )}

              <Ionicons
                name="chevron-forward"
                size={20}
                color={palette.icon}
                style={styles.chevron}
              />
            </SurfaceCard>
          );
        })}
      </View>
      </PageContainer>

      <BadgeAwardModal
        visible={!!selectedSession || showBadgeModal}
        athleteId={athlete.id}
        athleteName={athlete.name}
        coachId={currentUser.id}
        coachName={currentUser.name}
        sessionId={selectedSession?.id}
        sessionLabel={selectedSession ? selectedSessionLabel : undefined}
        initialReason={selectedSession?.nextFocusAreas?.find((focus) => BADGE_REASONS.includes(focus))}
        onClose={() => {
          setSelectedSession(null);
          setShowBadgeModal(false);
        }}
        onAwarded={(award) => setAwards((prev) => [award, ...prev])}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.lg,
  },

  // Hero Card
  heroCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.title,
  },
  heroInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  athleteName: {
    ...Typography.xl,
  },
  sessionCountLabel: {
    ...Typography.small,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trendBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.sm,
  },
  levelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.sm,
  },
  badgeText: {
    ...Typography.micro,
    textTransform: 'none',
  },
  ctaButton: {
    paddingVertical: Components.pill.paddingVertical,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    height: Components.buttonCompact.height,
    justifyContent: 'center',
  },
  ctaText: {
    ...Typography.small,
    color: Colors.light.onPrimary,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  awardBadgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Components.pill.paddingVertical,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    height: Components.buttonCompact.height,
    justifyContent: 'center',
    borderWidth: 1,
  },
  awardBadgeText: {
    ...Typography.caption,
  },

  // Stats in hero card
  divider: {
    height: 1,
    opacity: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statDivider: {
    width: 1,
    height: Components.avatar.md,
    opacity: 0.5,
  },

  // Section header
  sectionHeader: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.lg,
  },
  sectionSubtitle: {
    ...Typography.small,
  },

  // Session list
  sessionList: {
    gap: Spacing.sm,
  },
  sessionCard: {
    padding: Spacing.sm,
    gap: Spacing.xs,
    position: 'relative',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sessionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sessionDate: {
    ...Typography.body,
  },
  needsNotesBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.sm,
  },
  needsNotesText: {
    ...Typography.micro,
    color: Colors.light.onPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  awardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  awardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  workspaceChip: {
    paddingHorizontal: Spacing.xs,
  },
  rating: {
    ...Typography.body,
    fontVariant: ['tabular-nums'],
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.sm,
  },
  skillText: {
    ...Typography.micro,
    textTransform: 'none',
  },
  notesPreview: {
    ...Typography.small,
  },
  videoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  videoText: {
    ...Typography.caption,
  },
  chevron: {
    position: 'absolute',
    right: Spacing.sm,
    top: Spacing.sm,
  },

  // Badge Progression Summary
  progressionCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  progressionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressionBadge: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressionInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  progressionLevel: {
    ...Typography.body,
  },
  progressionPoints: {
    ...Typography.caption,
  },
  progressBarContainer: {
    gap: Spacing.xs,
  },
  progressBar: {
    height: Spacing.xs,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.sm,
  },
  progressText: {
    ...Typography.micro,
    textTransform: 'none',
    textAlign: 'right',
  },
  topCategoriesSection: {
    gap: Spacing.xs,
  },
  topCategoriesLabel: {
    ...Typography.micro,
  },
  topCategoriesRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  categoryChipText: {
    ...Typography.caption,
  },
  categoryCountBadge: {
    minWidth: Components.icon.md,
    height: Components.icon.md,
    borderRadius: Components.icon.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  categoryCountText: {
    ...Typography.micro,
    color: Colors.light.onPrimary,
  },

  // Special Needs Summary Card
  specialNeedsCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  specialNeedsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  specialNeedsIcon: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialNeedsInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  specialNeedsTitle: {
    ...Typography.body,
  },
  specialNeedsSubtitle: {
    ...Typography.caption,
  },
  specialNeedsCounters: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  counterBadge: {
    minWidth: Components.icon.lg,
    height: Components.icon.lg,
    borderRadius: Components.icon.lg / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  counterText: {
    ...Typography.caption,
  },
  quickPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  previewTag: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.pill,
  },
  previewTagText: {
    ...Typography.micro,
    textTransform: 'none',
  },
});
