import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives';
import { Spacing, withAlpha } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import type { Session } from '@/constants/app-types';
import { formatDate } from '@/hooks/use-coach-development';
import { useTheme } from '@/hooks/useTheme';
import { getSessionAthleteName } from '@/utils/session-display';
import { styles } from './development-section-styles';

interface RecentSessionsSectionProps {
  sessions: Session[];
  athleteDirectory: Record<string, { name: string; avatar?: string }>;
  logger: { press: (event: string, data: Record<string, unknown>) => void };
}

export function RecentSessionsSection({
  sessions,
  athleteDirectory,
  logger,
}: RecentSessionsSectionProps) {
  const { colors: palette } = useTheme();
  return (
    <SurfaceCard style={styles.sectionCard}>
      <Row style={styles.sectionHeaderRow}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Recent sessions
        </ThemedText>
      </Row>
      <View style={{ gap: Spacing.xs }}>
        {sessions.map((session) => {
          const athlete = athleteDirectory[session.athleteId];
          const athleteName = athlete?.name || getSessionAthleteName(session);
          const athleteAvatar = athlete?.avatar || athleteName.charAt(0).toUpperCase();
          return (
            <Clickable
              key={session.id}
              style={[styles.recentRow, { borderColor: palette.border }]}
              onPress={() => {
                logger.press('SessionFeedbackOpen', {
                  sessionId: session.id,
                  athleteId: session.athleteId,
                  source: 'RecentSessions',
                });
                router.push(Routes.developmentAthlete(session.athleteId));
              }}
            >
              <Row style={styles.rowLeft}>
                <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                  <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                    {athleteAvatar}
                  </ThemedText>
                </View>
                <View style={styles.rowContent}>
                  <ThemedText type="defaultSemiBold" style={styles.athleteName} numberOfLines={1}>
                    {athleteName}
                  </ThemedText>
                  <ThemedText
                    style={[styles.athleteMetadata, { color: palette.muted }]}
                    numberOfLines={1}
                  >
                    {formatDate(session.completedAt)} · Rated {session.performanceRating}
                  </ThemedText>
                </View>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={palette.muted} />
            </Clickable>
          );
        })}
      </View>
    </SurfaceCard>
  );
}
