/**
 * DevProgressTab — Skills overview and recent sessions list.
 */
import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
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
import { SkillsSummary } from '@/components/analytics/skill-progress-bar';
import { EmptyMetrics } from '@/components/analytics/enhanced-stats';
import { formatShortDateWithYear } from '@/utils/format';
import { createLogger } from '@/utils/logger';
import type { SkillProgress } from '@/constants/types';

const logger = createLogger('DevProgressTab');

interface Session {
  id: string;
  bookingId: string;
  coachName: string;
  athleteId: string;
  completedAt: string;
  performanceRating: number;
  skillsWorkedOn?: string[];
}

interface DevProgressTabProps {
  skills: SkillProgress[];
  sessions: Session[];
  sortedSessions: Session[];
  showFamilyContext?: boolean;
  childNameById?: Record<string, string>;
}

function DevProgressTabInner({
  skills,
  sessions,
  sortedSessions,
  showFamilyContext,
  childNameById,
}: DevProgressTabProps) {
  const { colors: palette } = useTheme();

  const handleSessionPress = useCallback((session: Session) => {
    logger.press('SessionCard', { sessionId: session.id });
    router.push(Routes.booking(session.bookingId));
  }, []);

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {skills.length > 0 ? (
        <>
          <SkillsSummary skills={skills} />
          <SkillRadar skills={skills} title="Skill Overview" showDetailedList={true} />
        </>
      ) : (
        <EmptyMetrics
          icon="analytics-outline"
          title="No Skill Data Yet"
          description="Skills will be tracked after completing training sessions"
        />
      )}

      <View style={styles.section}>
        <Row align="center" justify="space-between">
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Recent Sessions
          </ThemedText>
          <ThemedText style={[styles.sectionCount, { color: palette.muted }]}>
            {sessions.length} total
          </ThemedText>
        </Row>

        {sessions.length === 0 ? (
          <EmptyMetrics
            icon="calendar-outline"
            title="No Sessions Yet"
            description="Sessions will appear here once completed"
          />
        ) : (
          <View style={styles.list}>
            {sortedSessions.slice(0, 5).map((session, index) => (
              <Animated.View key={session.id} entering={FadeInDown.delay(index * 50).springify()}>
                <Clickable onPress={() => handleSessionPress(session)}>
                  <SurfaceCard style={styles.card}>
                    <Row justify="space-between" align="flex-start">
                      <View style={styles.cardInfo}>
                        <ThemedText type="defaultSemiBold">
                          {session.coachName}
                        </ThemedText>
                        {showFamilyContext && childNameById?.[session.athleteId] && (
                          <ThemedText style={[styles.contextText, { color: palette.muted }]}>
                            For {childNameById[session.athleteId]}
                          </ThemedText>
                        )}
                        <ThemedText style={[styles.date, { color: palette.muted }]}>
                          {formatShortDateWithYear(session.completedAt)}
                        </ThemedText>
                      </View>
                      <Row align="center" gap="xxs">
                        <ThemedText type="defaultSemiBold" style={styles.ratingValue}>
                          {session.performanceRating.toFixed(1)}
                        </ThemedText>
                        <Ionicons name="star" size={14} color={palette.warning} />
                      </Row>
                    </Row>
                    {session.skillsWorkedOn && session.skillsWorkedOn.length > 0 && (
                      <Row wrap gap="xs">
                        {session.skillsWorkedOn.slice(0, 3).map((skill, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.skillPill,
                              { backgroundColor: withAlpha(palette.tint, 0.07) },
                            ]}
                          >
                            <ThemedText style={[styles.skillText, { color: palette.tint }]}>
                              {skill}
                            </ThemedText>
                          </View>
                        ))}
                      </Row>
                    )}
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

export const DevProgressTab = memo(DevProgressTabInner);

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  sectionCount: { ...Typography.caption },
  list: { gap: Spacing.sm },
  card: { padding: Spacing.md, gap: Spacing.sm },
  cardInfo: { flex: 1, gap: Spacing.micro },
  contextText: { ...Typography.micro },
  date: { ...Typography.caption },
  ratingValue: { ...Typography.subheading },
  skillPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  skillText: { ...Typography.caption },
});
