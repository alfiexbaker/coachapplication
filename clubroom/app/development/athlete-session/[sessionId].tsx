/**
 * Athlete Session Detail Screen
 *
 * Shows session details: date, coach, performance rating,
 * skills worked on, coach notes, next focus areas, and videos.
 */

import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAthleteSessionDetail } from '@/hooks/use-athlete-session-detail';
import { formatDate } from '@/constants/mock-data';

export default function AthleteSessionDetailScreen() {
  const { colors: palette } = useTheme();
  const { session, hasNotes, hasVideos, hasSkills, hasNextFocus, ratingLabel } = useAthleteSessionDetail();

  if (!session) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Row align="center" justify="space-between" style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.foreground} />
          </Clickable>
          <ThemedText type="title" style={Typography.title}>Session Details</ThemedText>
          <View style={{ width: 24 }} />
        </Row>

        {/* Session Info */}
        <SurfaceCard style={styles.infoCard}>
          <View style={{ gap: Spacing.md }}>
            <Row gap="sm" align="center">
              <Ionicons name="calendar" size={20} color={palette.tint} />
              <ThemedText style={Typography.body}>{formatDate(session.completedAt)}</ThemedText>
            </Row>
            <Row gap="sm" align="center">
              <Ionicons name="person" size={20} color={palette.tint} />
              <ThemedText style={Typography.body}>Coach {session.coachName}</ThemedText>
            </Row>
          </View>
        </SurfaceCard>

        {/* Performance Rating */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={Typography.heading}>Performance Rating</ThemedText>
          <SurfaceCard style={styles.ratingCard}>
            <Row gap="sm" justify="center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons key={star} name={star <= session.performanceRating ? 'star' : 'star-outline'} size={40} color={star <= session.performanceRating ? palette.rating : palette.muted} />
              ))}
            </Row>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.muted }]}>{ratingLabel}</ThemedText>
          </SurfaceCard>
        </View>

        {/* Skills Worked On */}
        {hasSkills && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={Typography.heading}>Skills Worked On</ThemedText>
            <SurfaceCard style={styles.cardPadded}>
              <View style={styles.skillsGrid}>
                {session.skillsWorkedOn.map((skill, index) => (
                  <View key={index} style={[styles.skillChip, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                    <ThemedText style={[Typography.bodySmallSemiBold, { color: palette.tint }]}>{skill}</ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          </View>
        )}

        {/* Coach Notes */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={Typography.heading}>Coach&apos;s Notes</ThemedText>
          {hasNotes ? (
            <SurfaceCard style={styles.cardPadded}>
              <ThemedText style={Typography.body}>{session.notes}</ThemedText>
            </SurfaceCard>
          ) : (
            <SurfaceCard style={styles.emptyNotes}>
              <Ionicons name="document-text-outline" size={32} color={palette.muted} />
              <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>No notes added yet</ThemedText>
            </SurfaceCard>
          )}
        </View>

        {/* Next Focus Areas */}
        {hasNextFocus && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={Typography.heading}>Next Session Focus</ThemedText>
            <SurfaceCard style={styles.cardPadded}>
              <View style={{ gap: Spacing.md }}>
                {session.nextFocusAreas!.map((area, index) => (
                  <Row key={index} gap="sm" align="center">
                    <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                    <ThemedText style={[Typography.body, { flex: 1 }]}>{area}</ThemedText>
                  </Row>
                ))}
              </View>
            </SurfaceCard>
          </View>
        )}

        {/* Videos */}
        {hasVideos && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={Typography.heading}>Session Videos</ThemedText>
            <View style={{ gap: Spacing.sm }}>
              {session.videoUrls!.map((url, index) => (
                <SurfaceCard key={index} style={styles.videoCard}>
                  <Row gap="sm" align="center" style={{ flex: 1 }}>
                    <Ionicons name="videocam" size={20} color={palette.tint} />
                    <ThemedText style={[Typography.bodySmall, { flex: 1 }]}>Video {index + 1}</ThemedText>
                  </Row>
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
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing['2xl'], gap: Spacing.lg },
  header: { paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  backButton: { padding: Spacing.xs },
  infoCard: { padding: Spacing.lg },
  section: { gap: Spacing.sm },
  ratingCard: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.md },
  cardPadded: { padding: Spacing.lg },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  skillChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  emptyNotes: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  videoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
});
