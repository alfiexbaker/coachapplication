import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_SESSIONS, formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AthleteSessionDetailScreen');

export default function AthleteSessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const session = MOCK_SESSIONS.find(s => s.id === sessionId);

  if (!session) {
    return null;
  }

  const hasNotes = session.notes && session.notes.trim() !== '';
  const hasVideos = session.videoUrls && session.videoUrls.length > 0;
  const hasSkills = session.skillsWorkedOn && session.skillsWorkedOn.length > 0;

  logger.debug('Athlete session detail rendered', {
    sessionId,
    hasNotes,
    hasVideos,
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
                {session.skillsWorkedOn.map((skill, index) => (
                  <View
                    key={index}
                    style={[styles.skillChip, { backgroundColor: withAlpha(palette.tint, 0.12) }]}
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
              Coach&apos;s Notes
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
              Coach&apos;s Notes
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
              {session.nextFocusAreas.map((area, index) => (
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
            <View style={styles.videoList}>
              {session.videoUrls!.map((url, index) => (
                <SurfaceCard key={index} style={styles.videoCard}>
                  <View style={styles.videoInfo}>
                    <Ionicons name="videocam" size={20} color={palette.tint} />
                    <ThemedText style={styles.videoName}>
                      Video {index + 1}
                    </ThemedText>
                  </View>
                  <Ionicons name="play-circle-outline" size={24} color={palette.tint} />
                </SurfaceCard>
              ))}
            </View>
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
    ...Typography.title,
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
    ...Typography.body,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.heading,
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
    ...Typography.bodySemiBold,
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
    ...Typography.bodySmallSemiBold,
  },
  notesCard: {
    padding: Spacing.lg,
  },
  notesText: {
    ...Typography.body,
  },
  emptyNotes: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodySmall,
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
    ...Typography.body,
    flex: 1,
  },
  videoList: {
    gap: Spacing.sm,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  videoName: {
    ...Typography.bodySmall,
    flex: 1,
  },
});
