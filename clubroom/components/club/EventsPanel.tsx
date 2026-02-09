import { StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ClubFeedPost } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

export interface EventCardProps {
  event: ClubFeedPost;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const { colors: palette } = useTheme();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Pressable
      style={({pressed}) => [styles.eventCard, { borderColor: palette.border }, pressed && {opacity: 0.7}]}
      onPress={onPress}
    >
      <View style={styles.eventCardHeader}>
        <View style={[styles.eventIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="calendar" size={20} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
            {event.title}
          </ThemedText>
          {event.eventDate && (
            <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
              {formatDate(event.eventDate)}
            </ThemedText>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </View>

      {event.body && (
        <ThemedText style={{ ...Typography.small, color: palette.text }} numberOfLines={2}>
          {event.body}
        </ThemedText>
      )}

      {event.eventLocation && (
        <View style={styles.eventLocation}>
          <Ionicons name="location-outline" size={14} color={palette.muted} />
          <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
            {event.eventLocation}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

export interface EventsPanelProps {
  events: ClubFeedPost[];
  isCoach: boolean;
  clubId: string;
  onCreateEvent?: () => void;
}

export function EventsPanel({ events, isCoach, clubId, onCreateEvent }: EventsPanelProps) {
  const { colors: palette } = useTheme();

  const handleCreateEvent = () => {
    if (onCreateEvent) {
      onCreateEvent();
    } else {
      router.push(Routes.MODAL_CREATE_CLUB_POST);
    }
  };

  // Filter only event-type posts
  const eventPosts = events.filter(post => post.postType === 'event');

  if (eventPosts.length === 0 && !isCoach) {
    return null;
  }

  return (
    <SurfaceCard style={styles.eventsCard}>
      <View style={styles.eventsSectionHeader}>
        <View style={styles.eventsHeaderLeft}>
          <Ionicons name="calendar" size={20} color={palette.tint} />
          <ThemedText type="defaultSemiBold">Club Events</ThemedText>
        </View>
        {isCoach && (
          <Pressable
            style={[styles.addEventButton, { backgroundColor: palette.tint }]}
            onPress={handleCreateEvent}
          >
            <Ionicons name="add" size={16} color={palette.onPrimary} />
            <ThemedText style={{ ...Typography.caption, color: palette.onPrimary }}>Add</ThemedText>
          </Pressable>
        )}
      </View>

      {eventPosts.length > 0 ? (
        <View style={styles.eventsList}>
          {eventPosts.slice(0, 3).map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(Routes.EVENTS)}
            />
          ))}
          {eventPosts.length > 3 && (
            <Pressable
              style={styles.viewAllButton}
              onPress={() => router.push(Routes.EVENTS)}
            >
              <ThemedText style={{ ...Typography.small, color: palette.tint }}>
                View all {eventPosts.length} events
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={palette.tint} />
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.emptyEvents}>
          <Ionicons name="calendar-outline" size={32} color={palette.muted} />
          <ThemedText style={{ ...Typography.small, color: palette.muted, textAlign: 'center' }}>
            No upcoming events
          </ThemedText>
          {isCoach && (
            <Pressable
              style={[styles.createEventButton, { borderColor: palette.tint }]}
              onPress={handleCreateEvent}
            >
              <ThemedText style={ { color: palette.tint, ...Typography.smallSemiBold }}>
                Create Event
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  eventsCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  eventsList: {
    gap: Spacing.sm,
  },
  eventCard: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.xs,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
  },
  emptyEvents: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  createEventButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
});
