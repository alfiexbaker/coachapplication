import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { VideoThumbnail, VideoEmptyState, VideoUnavailable } from '@/components/video/video-thumbnail';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_SESSIONS, formatDate } from '@/constants/mock-data';
import { videoService, type LocalVideo } from '@/services/video-service';
import { createLogger } from '@/utils/logger';
import type { Session } from '@/constants/app-types';

const logger = createLogger('AthleteSessionDetailScreen');

export default function AthleteSessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionVideos, setSessionVideos] = useState<LocalVideo[]>([]);
  const [unavailableVideos, setUnavailableVideos] = useState<string[]>([]);

  // Load session from AsyncStorage or mock data
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Try AsyncStorage first (for real sessions)
        const storedSessions = await AsyncStorage.getItem('coach_sessions');
        let foundSession: Session | undefined;

        if (storedSessions) {
          const sessions = JSON.parse(storedSessions);
          foundSession = sessions.find((s: Session) => s.id === sessionId);
        }

        // Fallback to mock data if not in AsyncStorage
        if (!foundSession) {
          foundSession = MOCK_SESSIONS.find(s => s.id === sessionId);
        }

        if (foundSession) {
          setSession(foundSession);

          // Load real videos for this session
          const videos = await videoService.getVideosBySession(sessionId!);
          setSessionVideos(videos);

          logger.debug('Session and videos loaded', {
            sessionId,
            videoCount: videos.length,
          });
        }
      } catch (error) {
        logger.error('Failed to load session', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  const handleVideoError = (videoTitle: string) => {
    Alert.alert(
      'Video Unavailable',
      `"${videoTitle}" could not be loaded. The video file may have been moved or deleted.`
    );
  };

  const handleRemoveUnavailableVideo = async (videoId: string) => {
    Alert.alert(
      'Remove Video Reference',
      'This will remove the broken video reference. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await videoService.deleteLocalVideo(videoId);
            setSessionVideos(prev => prev.filter(v => v.id !== videoId));
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading session...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Session not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const hasNotes = session.notes && session.notes.trim() !== '';
  // Now check for real videos, not just legacy videoUrls
  const hasVideos = sessionVideos.length > 0 || (session.videoUrls && session.videoUrls.length > 0);
  const hasSkills = session.skillsWorkedOn && session.skillsWorkedOn.length > 0;

  logger.debug('Athlete session detail rendered', {
    sessionId,
    hasNotes,
    hasVideos,
    videoCount: sessionVideos.length,
    hasSkills,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.foreground} />
          </Clickable>
          <ThemedText type="title" style={styles.title}>
            Session Details
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Session Info */}
        <SurfaceCard style={styles.infoCard}>
          <View style={styles.sessionInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color={palette.tint} />
              <ThemedText style={styles.infoText}>
                {formatDate(session.completedAt)}
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color={palette.tint} />
              <ThemedText style={styles.infoText}>
                Coach {session.coachName}
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* Performance Rating */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Performance Rating
          </ThemedText>
          <SurfaceCard style={styles.ratingCard}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= session.performanceRating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= session.performanceRating ? '#FFD700' : palette.muted}
                />
              ))}
            </View>
            <ThemedText style={[styles.ratingLabel, { color: palette.muted }]}>
              {session.performanceRating === 5 ? 'Excellent' : session.performanceRating === 4 ? 'Good' : session.performanceRating === 3 ? 'Average' : session.performanceRating === 2 ? 'Needs Work' : 'Keep Practicing'}
            </ThemedText>
          </SurfaceCard>
        </View>

        {/* Skills Worked On */}
        {hasSkills && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Skills Worked On
            </ThemedText>
            <SurfaceCard style={styles.skillsCard}>
              <View style={styles.skillsGrid}>
                {session.skillsWorkedOn.map((skill: string, index: number) => (
                  <View
                    key={index}
                    style={[styles.skillChip, { backgroundColor: palette.tint + '20' }]}
                  >
                    <ThemedText style={[styles.skillText, { color: palette.tint }]}>
                      {skill}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          </View>
        )}

        {/* Coach Notes */}
        {hasNotes ? (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Coach's Notes
            </ThemedText>
            <SurfaceCard style={styles.notesCard}>
              <ThemedText style={styles.notesText}>
                {session.notes}
              </ThemedText>
            </SurfaceCard>
          </View>
        ) : (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Coach's Notes
            </ThemedText>
            <SurfaceCard style={styles.emptyNotes}>
              <Ionicons name="document-text-outline" size={32} color={palette.muted} />
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                No notes added yet
              </ThemedText>
            </SurfaceCard>
          </View>
        )}

        {/* Next Focus Areas */}
        {session.nextFocusAreas && session.nextFocusAreas.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Next Session Focus
            </ThemedText>
            <SurfaceCard style={styles.focusCard}>
              {session.nextFocusAreas.map((area: string, index: number) => (
                <View key={index} style={styles.focusItem}>
                  <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                  <ThemedText style={styles.focusText}>{area}</ThemedText>
                </View>
              ))}
            </SurfaceCard>
          </View>
        )}

        {/* Videos */}
        {hasVideos && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Session Videos
            </ThemedText>
            <ThemedText style={[styles.videoHint, { color: palette.muted }]}>
              Tap a video to watch
            </ThemedText>
            <View style={styles.videoList}>
              {/* Real videos from videoService */}
              {sessionVideos.map((video) => (
                <VideoThumbnail
                  key={video.id}
                  video={video}
                  onPlaybackError={() => handleVideoError(video.title)}
                  showTitle
                />
              ))}

              {/* Legacy video URLs (for backward compatibility) */}
              {sessionVideos.length === 0 && session.videoUrls && session.videoUrls.map((url: string, index: number) => {
                // Convert legacy URL to LocalVideo format for thumbnail
                const legacyVideo: LocalVideo = {
                  id: `legacy_${index}`,
                  localUri: url,
                  title: `Session Video ${index + 1}`,
                  athleteId: session.athleteId,
                  athleteIds: [session.athleteId],
                  athleteNames: [],
                  coachId: '',
                  coachName: session.coachName || 'Coach',
                  sessionId: session.id,
                  createdAt: session.completedAt,
                  tags: [],
                  visibility: 'SHARED',
                  sharedWith: [],
                  sharedToFeed: false,
                };
                return (
                  <VideoThumbnail
                    key={`legacy_${index}`}
                    video={legacyVideo}
                    onPlaybackError={() => handleVideoError(`Video ${index + 1}`)}
                    showTitle
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* No videos message when session has no videos */}
        {!hasVideos && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Session Videos
            </ThemedText>
            <VideoEmptyState message="No videos have been added to this session yet" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  infoCard: {
    padding: Spacing.lg,
  },
  sessionInfo: {
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoText: {
    fontSize: 15,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  ratingCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  stars: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  skillsCard: {
    padding: Spacing.lg,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  skillChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  skillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesCard: {
    padding: Spacing.lg,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 24,
  },
  emptyNotes: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
  },
  focusCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  focusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  focusText: {
    fontSize: 15,
    flex: 1,
  },
  videoList: {
    gap: Spacing.md,
  },
  videoHint: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
