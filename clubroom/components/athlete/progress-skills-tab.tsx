/**
 * ProgressSkillsTab — Skills overview, category groups, and recent sessions list.
 */
import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SkillRadar } from '@/components/analytics/skill-radar';
import { SkillsSummary, SkillCategoryGroup } from '@/components/analytics/skill-progress-bar';
import { EmptyMetrics } from '@/components/analytics/enhanced-stats';
import { formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import type { SkillProgress } from '@/constants/types';

const logger = createLogger('ProgressSkillsTab');

interface Session {
  id: string;
  completedAt: string;
  coachName: string;
  performanceRating: number;
  skillsWorkedOn: string[];
  notes?: string;
  videoUrls?: string[];
}

interface ProgressSkillsTabProps {
  skills: SkillProgress[];
  skillsByCategory: Record<string, SkillProgress[]>;
  sortedSessions: Session[];
}

function ProgressSkillsTabInner({ skills, skillsByCategory, sortedSessions }: ProgressSkillsTabProps) {
  const { colors: palette } = useTheme();

  const handleSessionPress = useCallback((session: Session) => {
    logger.press('SessionCard', { sessionId: session.id, source: 'MyProgress' });
    router.push(Routes.developmentSession(session.id));
  }, []);

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <SkillsSummary skills={skills} />

      {skills.length > 0 && (
        <SkillRadar skills={skills} title="Skill Overview" showDetailedList={true} />
      )}

      {Object.entries(skillsByCategory).length > 0 && (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Skills by Category</ThemedText>
          <View style={styles.categoryList}>
            {Object.entries(skillsByCategory).map(([category, categorySkills], index) => (
              <SkillCategoryGroup key={category} category={category} skills={categorySkills} initialExpanded={index === 0} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Recent Sessions</ThemedText>
          <ThemedText style={[styles.sectionCount, { color: palette.muted }]}>{sortedSessions.length} total</ThemedText>
        </View>

        {sortedSessions.length === 0 ? (
          <EmptyMetrics icon="football-outline" title="No Sessions Yet" description="Book your first session to start tracking your progress" />
        ) : (
          <View style={styles.list}>
            {sortedSessions.slice(0, 5).map((session, index) => (
              <Animated.View key={session.id} entering={FadeInDown.delay(index * 50).springify()}>
                <Clickable onPress={() => handleSessionPress(session)}>
                  <SurfaceCard style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardLeft}>
                        <ThemedText type="defaultSemiBold" style={styles.date}>{formatDate(session.completedAt)}</ThemedText>
                        <ThemedText style={[styles.coach, { color: palette.muted }]}>with {session.coachName}</ThemedText>
                      </View>
                      <View style={styles.rating}>
                        <ThemedText style={styles.ratingValue}>{session.performanceRating}</ThemedText>
                        <Ionicons name="star" size={14} color={palette.warning} />
                      </View>
                    </View>

                    {session.skillsWorkedOn.length > 0 && (
                      <View style={styles.skillsRow}>
                        {session.skillsWorkedOn.map((skill, idx) => (
                          <View key={idx} style={[styles.skillChip, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
                            <ThemedText style={[styles.skillChipText, { color: palette.tint }]}>{skill}</ThemedText>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.footer}>
                      <View style={styles.indicators}>
                        {session.notes && session.notes.trim() !== '' && (
                          <View style={styles.indicator}>
                            <Ionicons name="document-text" size={12} color={palette.muted} />
                            <ThemedText style={[styles.indicatorText, { color: palette.muted }]}>Notes</ThemedText>
                          </View>
                        )}
                        {session.videoUrls && session.videoUrls.length > 0 && (
                          <View style={styles.indicator}>
                            <Ionicons name="videocam" size={12} color={palette.muted} />
                            <ThemedText style={[styles.indicatorText, { color: palette.muted }]}>
                              {session.videoUrls.length} video{session.videoUrls.length > 1 ? 's' : ''}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={palette.icon} />
                    </View>
                  </SurfaceCard>
                </Clickable>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export const ProgressSkillsTab = memo(ProgressSkillsTabInner);

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...Typography.subheading },
  sectionCount: { ...Typography.caption },
  categoryList: { gap: Spacing.sm },
  list: { gap: Spacing.sm },
  card: { padding: Spacing.md, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { gap: Spacing.micro },
  date: { ...Typography.bodySmall },
  coach: { ...Typography.caption },
  rating: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  ratingValue: { ...Typography.subheading },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  skillChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  skillChipText: { ...Typography.caption },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  indicators: { flexDirection: 'row', gap: Spacing.sm },
  indicator: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  indicatorText: { ...Typography.caption },
});
