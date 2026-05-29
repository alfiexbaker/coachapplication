import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { UpcomingSession } from '@/hooks/use-invite-session-flow';
import { formatDateTime } from '@/hooks/use-invite-session-flow';
import { styles } from './invite-session-step-styles';

export interface SessionListStepProps {
  sessions: UpcomingSession[];
  onSelect: (session: UpcomingSession) => void;
  onCreateNew: () => void;
}

export function SessionListStep({ sessions, onSelect, onCreateNew }: SessionListStepProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.sessionList}>
      <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
        Select an upcoming session to add athletes to
      </ThemedText>
      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No upcoming sessions found
          </ThemedText>
          <Clickable
            style={[styles.createButton, { backgroundColor: palette.tint }]}
            onPress={onCreateNew}
          >
            <Ionicons name="add" size={18} color={palette.onPrimary} />
            <ThemedText style={[styles.createButtonText, { color: palette.onPrimary }]}>
              Create New Session
            </ThemedText>
          </Clickable>
        </View>
      ) : (
        sessions.map((session) => {
          const { dayName, date, time } = formatDateTime(session.scheduledAt);
          const spotsLeft = session.maxAthletes
            ? session.maxAthletes - (session.currentAthletes || 0)
            : null;
          return (
            <Clickable
              key={session.id}
              style={[
                styles.sessionCard,
                { backgroundColor: palette.background, borderColor: palette.border },
              ]}
              onPress={() => onSelect(session)}
            >
              <View
                style={[styles.sessionDate, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
              >
                <ThemedText style={[styles.sessionDayName, { color: palette.tint }]}>
                  {dayName}
                </ThemedText>
                <ThemedText style={[styles.sessionDateStr, { color: palette.tint }]}>
                  {date}
                </ThemedText>
              </View>
              <View style={styles.sessionInfo}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {session.title || 'Coaching Session'}
                </ThemedText>
                <Row style={styles.sessionMeta}>
                  <Ionicons name="time-outline" size={14} color={palette.muted} />
                  <ThemedText style={[styles.sessionMetaText, { color: palette.muted }]}>
                    {time}
                  </ThemedText>
                  {session.location && (
                    <>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={palette.muted}
                        style={{ marginLeft: Spacing.xs }}
                      />
                      <ThemedText
                        style={[styles.sessionMetaText, { color: palette.muted }]}
                        numberOfLines={1}
                      >
                        {session.location}
                      </ThemedText>
                    </>
                  )}
                </Row>
                {spotsLeft !== null && (
                  <View
                    style={[
                      styles.spotsBadge,
                      {
                        backgroundColor:
                          spotsLeft > 0
                            ? withAlpha(palette.success, 0.09)
                            : withAlpha(palette.error, 0.09),
                      },
                    ]}
                  >
                    <ThemedText
                      style={{
                        ...Typography.caption,
                        color: spotsLeft > 0 ? palette.success : palette.error,
                        fontWeight: '600',
                      }}
                    >
                      {spotsLeft > 0
                        ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} available`
                        : 'Full'}
                    </ThemedText>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </Clickable>
          );
        })
      )}
    </View>
  );
}
