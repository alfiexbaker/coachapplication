import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SessionEvent {
  id: string;
  date: string;
  type: 'SESSION' | 'GOAL_SET' | 'GOAL_COMPLETED' | 'MILESTONE' | 'VIDEO' | 'ASSESSMENT';
  title: string;
  subtitle?: string;
  coach?: string;
  rating?: number;
  focus?: string;
}

interface SessionTimelineProps {
  events: SessionEvent[];
  title?: string;
  onEventPress?: (event: SessionEvent) => void;
  maxItems?: number;
}

const EVENT_ICONS: Record<SessionEvent['type'], { icon: string; color: string }> = {
  SESSION: { icon: 'football', color: '#4CAF50' },
  GOAL_SET: { icon: 'flag', color: '#2196F3' },
  GOAL_COMPLETED: { icon: 'trophy', color: '#FFB800' },
  MILESTONE: { icon: 'checkmark-circle', color: '#9C27B0' },
  VIDEO: { icon: 'videocam', color: '#E91E63' },
  ASSESSMENT: { icon: 'clipboard', color: '#00BCD4' },
};

export function SessionTimeline({
  events,
  title = 'Recent Activity',
  onEventPress,
  maxItems,
}: SessionTimelineProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={32} color={palette.muted} />
        <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
          No recent activity
        </ThemedText>
      </View>
    );
  }

  // Group events by month
  const groupedEvents = displayEvents.reduce((acc, event) => {
    const monthKey = new Date(event.date).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(event);
    return acc;
  }, {} as Record<string, SessionEvent[]>);

  return (
    <View style={styles.container}>
      {title && (
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
      )}

      {Object.entries(groupedEvents).map(([month, monthEvents]) => (
        <View key={month} style={styles.monthGroup}>
          <ThemedText style={[styles.monthLabel, { color: palette.muted }]}>
            {month}
          </ThemedText>

          <View style={styles.eventsContainer}>
            {monthEvents.map((event, index) => {
              const iconConfig = EVENT_ICONS[event.type];
              const isLast = index === monthEvents.length - 1;

              return (
                <Clickable
                  key={event.id}
                  onPress={() => onEventPress?.(event)}
                  disabled={!onEventPress}
                  style={styles.eventRow}
                >
                  {/* Timeline Line */}
                  <View style={styles.timelineColumn}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: `${iconConfig.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={iconConfig.icon as any}
                        size={16}
                        color={iconConfig.color}
                      />
                    </View>
                    {!isLast && (
                      <View style={[styles.timelineLine, { backgroundColor: palette.border }]} />
                    )}
                  </View>

                  {/* Event Content */}
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <ThemedText type="defaultSemiBold" style={styles.eventTitle}>
                        {event.title}
                      </ThemedText>
                      <ThemedText style={[styles.eventDate, { color: palette.muted }]}>
                        {new Date(event.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </ThemedText>
                    </View>

                    {event.subtitle && (
                      <ThemedText style={[styles.eventSubtitle, { color: palette.muted }]}>
                        {event.subtitle}
                      </ThemedText>
                    )}

                    <View style={styles.eventMeta}>
                      {event.coach && (
                        <View style={styles.metaItem}>
                          <Ionicons name="person-outline" size={12} color={palette.muted} />
                          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                            {event.coach}
                          </ThemedText>
                        </View>
                      )}
                      {event.focus && (
                        <View style={styles.metaItem}>
                          <Ionicons name="football-outline" size={12} color={palette.muted} />
                          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                            {event.focus}
                          </ThemedText>
                        </View>
                      )}
                      {event.rating && (
                        <View style={styles.metaItem}>
                          <Ionicons name="star" size={12} color="#FFB800" />
                          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                            {event.rating.toFixed(1)}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                </Clickable>
              );
            })}
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalContainer}
    >
      {events.map((event, index) => {
        const iconConfig = EVENT_ICONS[event.type];

        return (
          <View key={event.id} style={styles.horizontalItem}>
            {index > 0 && (
              <View style={[styles.horizontalLine, { backgroundColor: palette.border }]} />
            )}

            <Clickable
              onPress={() => onEventPress?.(event)}
              disabled={!onEventPress}
              style={[styles.horizontalCard, { backgroundColor: palette.surface }]}
            >
              <View
                style={[styles.horizontalIcon, { backgroundColor: `${iconConfig.color}15` }]}
              >
                <Ionicons name={iconConfig.icon as any} size={18} color={iconConfig.color} />
              </View>
              <ThemedText style={styles.horizontalDate}>
                {new Date(event.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </ThemedText>
              <ThemedText style={styles.horizontalTitle} numberOfLines={2}>
                {event.title}
              </ThemedText>
            </Clickable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  monthGroup: {
    gap: Spacing.sm,
  },
  monthLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventsContainer: {
    gap: 0,
  },
  eventRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timelineColumn: {
    alignItems: 'center',
    width: 32,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    minHeight: 20,
    marginVertical: 4,
  },
  eventContent: {
    flex: 1,
    paddingBottom: Spacing.md,
    gap: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
  },
  eventDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  eventSubtitle: {
    fontSize: 13,
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  horizontalContainer: {
    paddingVertical: Spacing.sm,
    gap: 0,
  },
  horizontalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalLine: {
    width: 20,
    height: 2,
  },
  horizontalCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    width: 100,
    gap: Spacing.xs,
  },
  horizontalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  horizontalTitle: {
    fontSize: 11,
    textAlign: 'center',
  },
});
