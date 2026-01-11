import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ClubFeedPost } from '@/constants/types';

export interface EventCardProps {
  event: ClubFeedPost;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      style={[styles.eventCard, { borderColor: palette.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.eventCardHeader}>
        <View style={[styles.eventIcon, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="calendar" size={20} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
            {event.title}
          </ThemedText>
          {event.eventDate && (
            <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
              {formatDate(event.eventDate)}
            </ThemedText>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </View>

      {event.body && (
        <ThemedText style={{ color: palette.text, fontSize: 13 }} numberOfLines={2}>
          {event.body}
        </ThemedText>
      )}

      {event.eventLocation && (
        <View style={styles.eventLocation}>
          <Ionicons name="location-outline" size={14} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
            {event.eventLocation}
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
}

export interface EventsPanelProps {
  events: ClubFeedPost[];
  isCoach: boolean;
  clubId: string;
  onCreateEvent?: () => void;
}

export function EventsPanel({ events, isCoach, clubId, onCreateEvent }: EventsPanelProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const handleCreateEvent = () => {
    if (onCreateEvent) {
      onCreateEvent();
    } else {
      router.push({
        pathname: '/(modal)/create-club-post',
        params: { clubId, postType: 'event' },
      });
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
          <TouchableOpacity
            style={[styles.addEventButton, { backgroundColor: palette.tint }]}
            onPress={handleCreateEvent}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Add</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {eventPosts.length > 0 ? (
        <View style={styles.eventsList}>
          {eventPosts.slice(0, 3).map((event) => (
            <EventCard
              key={event.id}
              event={event}
            />
          ))}
          {eventPosts.length > 3 && (
            <TouchableOpacity style={styles.viewAllButton}>
              <ThemedText style={{ color: palette.tint, fontSize: 13 }}>
                View all {eventPosts.length} events
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={palette.tint} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.emptyEvents}>
          <Ionicons name="calendar-outline" size={32} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, fontSize: 13, textAlign: 'center' }}>
            No upcoming events
          </ThemedText>
          {isCoach && (
            <TouchableOpacity
              style={[styles.createEventButton, { borderColor: palette.tint }]}
              onPress={handleCreateEvent}
            >
              <ThemedText style={{ color: palette.tint, fontSize: 13, fontWeight: '600' }}>
                Create Event
              </ThemedText>
            </TouchableOpacity>
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
    gap: 4,
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
