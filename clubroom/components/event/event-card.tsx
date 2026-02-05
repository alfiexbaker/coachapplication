import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { ClubEvent } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

interface EventCardProps {
  event: ClubEvent;
  onPress?: () => void;
  compact?: boolean;
}

export function EventCard({ event, onPress, compact = false }: EventCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const typeColor = eventService.getEventTypeColor(event.eventType);
  const typeIcon = eventService.getEventTypeIcon(event.eventType);
  const { going, maybe, totalGuests } = eventService.getAttendeeCounts(event.attendees);
  const isFull = eventService.isEventFull(event);
  const rsvpClosed = eventService.isRSVPClosed(event);

  const formatDate = () => {
    const d = new Date(event.date);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  if (compact) {
    return (
      <SurfaceCard style={styles.compactCard} onPress={onPress}>
        <View style={[styles.compactTypeIndicator, { backgroundColor: typeColor }]} />
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <ThemedText type="defaultSemiBold" style={styles.compactTitle} numberOfLines={1}>
              {event.title}
            </ThemedText>
            {event.price > 0 && (
              <ThemedText style={[styles.compactPrice, { color: palette.tint }]}>
                {eventService.formatPrice(event.price, event.currency)}
              </ThemedText>
            )}
          </View>
          <View style={styles.compactDetails}>
            <View style={styles.compactDetailItem}>
              <Ionicons name="calendar-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.compactDetailText, { color: palette.muted }]}>
                {formatDate()} at {event.startTime}
              </ThemedText>
            </View>
            <View style={styles.compactDetailItem}>
              <Ionicons name="location-outline" size={14} color={palette.muted} />
              <ThemedText
                style={[styles.compactDetailText, { color: palette.muted }]}
                numberOfLines={1}
              >
                {event.venue}
              </ThemedText>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {event.imageUrl && (
        <Image source={{ uri: event.imageUrl }} style={styles.image} />
      )}

      <View style={styles.content}>
        {/* Type badge */}
        <View style={styles.header}>
          <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
            <Ionicons name={typeIcon as keyof typeof Ionicons.glyphMap} size={14} color={typeColor} />
            <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>
              {eventService.formatEventType(event.eventType)}
            </ThemedText>
          </View>
          {event.isVirtual && (
            <View style={[styles.virtualBadge, { backgroundColor: `${palette.accent}15` }]}>
              <Ionicons name="videocam" size={12} color={palette.accent} />
              <ThemedText style={[styles.virtualBadgeText, { color: palette.accent }]}>
                Virtual
              </ThemedText>
            </View>
          )}
        </View>

        {/* Title */}
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {event.title}
        </ThemedText>

        {/* Description */}
        <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
          {event.description}
        </ThemedText>

        {/* Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={palette.icon} />
            <ThemedText style={styles.detailText}>
              {formatDate()} at {event.startTime}
              {event.endTime && ` - ${event.endTime}`}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={palette.icon} />
            <ThemedText style={styles.detailText} numberOfLines={1}>
              {event.venue}
            </ThemedText>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Attendance info */}
          <View style={styles.attendanceInfo}>
            <Ionicons name="people-outline" size={16} color={palette.muted} />
            <ThemedText style={[styles.attendanceText, { color: palette.muted }]}>
              {going + totalGuests} going
              {maybe > 0 && ` (${maybe} maybe)`}
            </ThemedText>
          </View>

          {/* Price or status */}
          <View style={styles.footerRight}>
            {isFull && (
              <View style={[styles.statusBadge, { backgroundColor: `${palette.error}15` }]}>
                <ThemedText style={[styles.statusText, { color: palette.error }]}>
                  FULL
                </ThemedText>
              </View>
            )}
            {rsvpClosed && !isFull && (
              <View style={[styles.statusBadge, { backgroundColor: `${palette.warning}15` }]}>
                <ThemedText style={[styles.statusText, { color: palette.warning }]}>
                  RSVP CLOSED
                </ThemedText>
              </View>
            )}
            {event.price > 0 && (
              <ThemedText style={styles.price}>
                {eventService.formatPrice(event.price, event.currency)}
              </ThemedText>
            )}
            {event.price === 0 && !isFull && !rsvpClosed && (
              <View style={[styles.freeBadge, { backgroundColor: `${palette.success}15` }]}>
                <ThemedText style={[styles.freeText, { color: palette.success }]}>
                  FREE
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  virtualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  virtualBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  title: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: scaleFont(24),
  },
  description: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  detailsContainer: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: scaleFont(14),
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendanceText: {
    fontSize: scaleFont(13),
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  price: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: scaleFont(11),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  freeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  freeText: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  compactTypeIndicator: {
    width: 4,
    height: '100%',
    minHeight: 48,
    borderRadius: 2,
  },
  compactContent: {
    flex: 1,
    gap: 4,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  compactTitle: {
    flex: 1,
    fontSize: scaleFont(15),
  },
  compactPrice: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  compactDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  compactDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactDetailText: {
    fontSize: scaleFont(12),
  },
});
