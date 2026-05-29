import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives';
import { withAlpha } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import type { AthleteRosterEntry } from '@/hooks/use-coach-development';
import { formatDate } from '@/hooks/use-coach-development';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './development-section-styles';

interface AttentionSectionProps {
  athletes: AthleteRosterEntry[];
  logger: { press: (event: string, data: Record<string, unknown>) => void };
}

export function AttentionSection({ athletes, logger }: AttentionSectionProps) {
  const { colors: palette } = useTheme();
  return (
    <SurfaceCard style={styles.sectionCard}>
      <Row style={styles.sectionHeaderRow}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Needs attention
        </ThemedText>
      </Row>
      {athletes.length === 0 ? (
        <Row style={styles.emptyStateInline}>
          <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
            <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
          </View>
          <View style={styles.emptyCopy}>
            <ThemedText type="defaultSemiBold">All caught up</ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              No athletes need follow-up right now.
            </ThemedText>
          </View>
        </Row>
      ) : (
        <View style={styles.attentionList}>
          {athletes.map((entry) => (
            <Clickable
              key={entry.athlete.id}
              onPress={() => {
                logger.press('AttentionAthlete', {
                  athleteId: entry.athlete.id,
                  athleteName: entry.athlete.name,
                  needsNotes: entry.needsNotes,
                  sessionId: entry.prioritySessionId,
                });
                if (entry.prioritySessionId) {
                  router.push(Routes.developmentSession(entry.prioritySessionId));
                  return;
                }
                router.push(Routes.developmentAthlete(entry.athlete.id));
              }}
              style={[styles.rowCard, { borderColor: palette.border }]}
            >
              <Row style={styles.rowTop}>
                <Row style={styles.rowLeft}>
                  <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                    <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                      {entry.athlete.avatar || entry.athlete.name.charAt(0)}
                    </ThemedText>
                    {entry.needsNotes && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: palette.error, borderColor: palette.surface },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.rowContent}>
                    <ThemedText type="defaultSemiBold" style={styles.athleteName} numberOfLines={1}>
                      {entry.athlete.name}
                    </ThemedText>
                    <ThemedText
                      style={[styles.subtleMeta, { color: palette.muted }]}
                      numberOfLines={1}
                    >
                      {entry.sessionCount} sessions · Last {formatDate(entry.lastSession)}
                    </ThemedText>
                  </View>
                </Row>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} />
              </Row>
              <Row style={styles.actionRow}>
                {entry.needsNotes && (
                  <Row style={[styles.pill, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
                    <Ionicons name="document-text" size={12} color={palette.error} />
                    <ThemedText style={[styles.pillLabel, { color: palette.error }]}>
                      Add notes
                    </ThemedText>
                  </Row>
                )}
                {entry.averageRating < 4 && (
                  <Row style={[styles.pill, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                    <Ionicons name="trending-up" size={12} color={palette.tint} />
                    <ThemedText style={[styles.pillLabel, { color: palette.tint }]}>
                      Boost rating
                    </ThemedText>
                  </Row>
                )}
                {entry.daysSinceLast >= 10 && (
                  <Row style={[styles.pill, { backgroundColor: withAlpha(palette.icon, 0.06) }]}>
                    <Ionicons name="time" size={12} color={palette.icon} />
                    <ThemedText style={[styles.pillLabel, { color: palette.icon }]}>
                      Reach out
                    </ThemedText>
                  </Row>
                )}
              </Row>
            </Clickable>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
}
