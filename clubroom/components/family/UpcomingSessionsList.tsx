import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FamilyCalendarEvent } from '@/constants/types';

interface UpcomingSessionsListProps {
  /** List of upcoming sessions */
  sessions: FamilyCalendarEvent[];
  /** Session press handler */
  onSessionPress?: (session: FamilyCalendarEvent) => void;
  /** View all press handler */
  onViewAllPress?: () => void;
  /** Maximum sessions to show */
  limit?: number;
  /** Show header */
  showHeader?: boolean;
  /** Title override */
  title?: string;
}

/**
 * UpcomingSessionsList shows the next scheduled sessions for all children.
 * Color-coded by child for quick visual identification.
 */
export function UpcomingSessionsList({
  sessions,
  onSessionPress,
  onViewAllPress,
  limit = 5,
  showHeader = true,
  title = 'Upcoming Sessions',
}: UpcomingSessionsListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const displaySessions = sessions.slice(0, limit);
  const hasMore = sessions.length > limit;

  // Format date for display
  const formatSessionDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      return date.toLocaleDateString('en-GB', { weekday: 'long' });
    }

    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // Format time for display
  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge props
  const getStatusBadge = (status: FamilyCalendarEvent['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return { label: 'Confirmed', color: palette.success };
      case 'PENDING':
        return { label: 'Pending', color: palette.warning };
      case 'CANCELLED':
        return { label: 'Cancelled', color: palette.error };
      default:
        return { label: status, color: palette.muted };
    }
  };

  // Check if session is happening today
  const isToday = (dateStr: string): boolean => {
    return new Date(dateStr).toDateString() === new Date().toDateString();
  };

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
        {displaySessions.map((session, index) => {
          const statusBadge = getStatusBadge(session.status);
          const today = isToday(session.start);

          return (
            <Clickable
              key={session.id}
              onPress={() => onSessionPress?.(session)}
            >
              <SurfaceCard
                style={[
                  styles.sessionCard,
                  today ? { borderColor: session.colorCode, borderWidth: 1 } : undefined,
                ]}
              >
                {/* Color Bar */}
                <View
                  style={[styles.colorBar, { backgroundColor: session.colorCode }]}
                />

                {/* Content */}
                <View style={styles.sessionContent}>
                  {/* Header Row */}
                  <View style={styles.sessionHeader}>
                    <View style={styles.dateTime}>
                      <ThemedText type="defaultSemiBold" style={styles.dateText}>
                        {formatSessionDate(session.start)}
                      </ThemedText>
                      <ThemedText style={[styles.timeText, { color: palette.muted }]}>
                        {formatTime(session.start)}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: withAlpha(statusBadge.color, 0.09) },
                      ]}
                    >
                      <View
                        style={[styles.statusDot, { backgroundColor: statusBadge.color }]}
                      />
                      <ThemedText
                        style={[styles.statusText, { color: statusBadge.color }]}
                      >
                        {statusBadge.label}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Session Info */}
                  <View style={styles.sessionInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.sessionTitle}>
                      {session.title}
                    </ThemedText>
                    {session.description && (
                      <ThemedText
                        style={[styles.sessionDescription, { color: palette.muted }]}
                        numberOfLines={1}
                      >
                        {session.description}
                      </ThemedText>
                    )}
                  </View>

                  {/* Meta Row */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <View
                        style={[styles.childDot, { backgroundColor: session.colorCode }]}
                      />
                      <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                        {session.childName}
                      </ThemedText>
                    </View>
                    {session.coachName && (
                      <View style={styles.metaItem}>
                        <Ionicons name="person" size={12} color={palette.muted} />
                        <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                          {session.coachName}
                        </ThemedText>
                      </View>
                    )}
                    {session.location && (
                      <View style={styles.metaItem}>
                        <Ionicons name="location" size={12} color={palette.muted} />
                        <ThemedText
                          style={[styles.metaText, { color: palette.muted }]}
                          numberOfLines={1}
                        >
                          {session.location}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  {/* Price */}
                  {session.price !== undefined && (
                    <View style={styles.priceRow}>
                      <ThemedText type="defaultSemiBold" style={styles.priceText}>
                        {'\u00A3'}{session.price.toFixed(2)}
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Chevron */}
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                </View>
              </SurfaceCard>
            </Clickable>
          );
        })}
      </View>

      {/* View All Button */}
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

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { ...Typography.bodySmall },
  viewAllText: { ...Typography.smallSemiBold },
  sessionsList: {
    gap: Spacing.sm,
  },
  sessionCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 0,
  },
  colorBar: {
    width: 4,
  },
  sessionContent: {
    flex: 1,
    padding: Spacing.sm,
    gap: 8,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTime: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  dateText: { ...Typography.bodySmall },
  timeText: { ...Typography.caption },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  statusText: { ...Typography.caption },
  sessionInfo: {
    gap: Spacing.micro,
  },
  sessionTitle: { ...Typography.body },
  sessionDescription: { ...Typography.small },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  childDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  metaText: { ...Typography.caption },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  priceText: { ...Typography.bodySmall },
  chevronContainer: {
    justifyContent: 'center',
    paddingRight: Spacing.sm,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.lg,
    marginTop: Spacing.xs,
  },
  viewAllButtonText: { ...Typography.bodySmallSemiBold },
});
