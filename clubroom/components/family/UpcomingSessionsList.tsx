import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import type { FamilyCalendarEvent } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { SessionCard, styles } from './upcoming-sessions-sections';

interface UpcomingSessionsListProps {
  sessions: FamilyCalendarEvent[];
  onSessionPress?: (session: FamilyCalendarEvent) => void;
  onViewAllPress?: () => void;
  limit?: number;
  showHeader?: boolean;
  title?: string;
}

export function UpcomingSessionsList({
  sessions,
  onSessionPress,
  onViewAllPress,
  limit = 5,
  showHeader = true,
  title = 'Upcoming Sessions',
}: UpcomingSessionsListProps) {
  const { colors: palette } = useTheme();

  const displaySessions = sessions.slice(0, limit);
  const hasMore = sessions.length > limit;

  if (sessions.length === 0) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {title}
          </ThemedText>
        )}
        <EmptyState
          icon="calendar-outline"
          title="No Upcoming Sessions"
          message="Book a session to see it here"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {title}
          </ThemedText>
          {hasMore && onViewAllPress && (
            <Clickable onPress={onViewAllPress}>
              <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
                View All ({sessions.length})
              </ThemedText>
            </Clickable>
          )}
        </View>
      )}

      <View style={styles.sessionsList}>
        {displaySessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onPress={onSessionPress ? () => onSessionPress(session) : undefined}
            palette={palette}
          />
        ))}
      </View>

      {hasMore && onViewAllPress && (
        <Clickable
          onPress={onViewAllPress}
          style={[styles.viewAllButton, { borderColor: palette.border }]}
        >
          <ThemedText style={[styles.viewAllButtonText, { color: palette.tint }]}>
            View All Sessions ({sessions.length})
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={palette.tint} />
        </Clickable>
      )}
    </View>
  );
}
