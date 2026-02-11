import { View, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

import {
  TimelineEmptyState,
  TimelineEventRow,
  HorizontalTimelineItem,
  styles,
} from './session-timeline-sections';
import type { SessionEvent } from './session-timeline-sections';

// Re-export for consumers
export type { SessionEvent };

interface SessionTimelineProps {
  events: SessionEvent[];
  title?: string;
  onEventPress?: (event: SessionEvent) => void;
  maxItems?: number;
}

export function SessionTimeline({
  events,
  title = 'Recent Activity',
  onEventPress,
  maxItems,
}: SessionTimelineProps) {
  const { colors: palette } = useTheme();

  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  if (events.length === 0) {
    return <TimelineEmptyState palette={palette} />;
  }

  // Group events by month
  const groupedEvents = displayEvents.reduce(
    (acc, event) => {
      const monthKey = new Date(event.date).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      });
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(event);
      return acc;
    },
    {} as Record<string, SessionEvent[]>,
  );

  return (
    <View style={styles.container}>
      {title && (
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
      )}

      {Object.entries(groupedEvents).map(([month, monthEvents]) => (
        <View key={month} style={styles.monthGroup}>
          <ThemedText style={[styles.monthLabel, { color: palette.muted }]}>{month}</ThemedText>

          <View style={styles.eventsContainer}>
            {monthEvents.map((event, index) => (
              <TimelineEventRow
                key={event.id}
                event={event}
                isLast={index === monthEvents.length - 1}
                onPress={onEventPress}
                palette={palette}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// Compact horizontal timeline for quick overview
interface HorizontalTimelineProps {
  events: SessionEvent[];
  onEventPress?: (event: SessionEvent) => void;
}

export function HorizontalTimeline({ events, onEventPress }: HorizontalTimelineProps) {
  const { colors: palette } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalContainer}
    >
      {events.map((event, index) => (
        <HorizontalTimelineItem
          key={event.id}
          event={event}
          showConnector={index > 0}
          onPress={onEventPress}
          palette={palette}
        />
      ))}
    </ScrollView>
  );
}
