/**
 * Extracted sub-components for EventCard.
 *
 * CompactEventCard — narrow row variant with type indicator + chevron.
 * FullEventCardContent — full card with image, badges, details, footer.
 */

import React, { memo } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ClubEvent } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { eventService } from '@/services/event-service';
import { Row } from '@/components/primitives';
import { formatEventDate } from './event-card-helpers';
import { styles } from './event-card-styles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface CompactEventCardProps {
  event: ClubEvent;
  onPress?: () => void;
  palette: ThemeColors;
}

export const CompactEventCard = memo(function CompactEventCard({
  event,
  onPress,
  palette,
}: CompactEventCardProps) {
  const typeColor = eventService.getEventTypeColor(event.eventType);

  return (
    <SurfaceCard style={styles.compactCard} onPress={onPress}>
      <View style={[styles.compactTypeIndicator, { backgroundColor: typeColor }]} />
      <View style={styles.compactContent}>
        <Row style={styles.compactHeader}>
          <ThemedText type="defaultSemiBold" style={styles.compactTitle} numberOfLines={1}>
            {event.title}
          </ThemedText>
          {event.price > 0 && (
            <ThemedText style={[styles.compactPrice, { color: palette.tint }]}>
              {eventService.formatPrice(event.price, event.currency)}
            </ThemedText>
          )}
        </Row>
        <View style={styles.compactDetails}>
          <Row style={styles.compactDetailItem}>
            <Ionicons name="calendar-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.compactDetailText, { color: palette.muted }]}>
              {formatEventDate(event.date)} at {event.startTime}
            </ThemedText>
          </Row>
          <Row style={styles.compactDetailItem}>
            <Ionicons name="location-outline" size={14} color={palette.muted} />
            <ThemedText
              style={[styles.compactDetailText, { color: palette.muted }]}
              numberOfLines={1}
            >
              {event.venue}
            </ThemedText>
          </Row>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={palette.muted} />
    </SurfaceCard>
  );
});

// ─── FullEventCardContent ────────────────────────────────────────────────────

interface FullEventCardContentProps {
  event: ClubEvent;
  onPress?: () => void;
  palette: ThemeColors;
}

export const FullEventCardContent = memo(function FullEventCardContent({
  event,
  onPress,
  palette,
}: FullEventCardContentProps) {
  const typeColor = eventService.getEventTypeColor(event.eventType);
  const typeIcon = eventService.getEventTypeIcon(event.eventType);
  const { going, maybe, totalGuests } = eventService.getAttendeeCounts(event.attendees);
  const isFull = eventService.isEventFull(event);
  const rsvpClosed = eventService.isRSVPClosed(event);

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.image} />}

      <View style={styles.content}>
        {/* Type badge */}
        <Row style={styles.header}>
          <Row style={[styles.typeBadge, { backgroundColor: withAlpha(typeColor, 0.12) }]}>
            <Ionicons
              name={typeIcon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={typeColor}
            />
            <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>
              {eventService.formatEventType(event.eventType)}
            </ThemedText>
          </Row>
          {event.isVirtual && (
            <Row
              style={[styles.virtualBadge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}
            >
              <Ionicons name="videocam" size={12} color={palette.accent} />
              <ThemedText style={[styles.virtualBadgeText, { color: palette.accent }]}>
                Virtual
              </ThemedText>
            </Row>
          )}
        </Row>

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
          <Row style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={palette.icon} />
            <ThemedText style={styles.detailText}>
              {formatEventDate(event.date)} at {event.startTime}
              {event.endTime && ` - ${event.endTime}`}
            </ThemedText>
          </Row>
          <Row style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={palette.icon} />
            <ThemedText style={styles.detailText} numberOfLines={1}>
              {event.venue}
            </ThemedText>
          </Row>
        </View>

        {/* Footer */}
        <Row style={[styles.footer, { borderTopColor: palette.border }]}>
          <Row style={styles.attendanceInfo}>
            <Ionicons name="people-outline" size={16} color={palette.muted} />
            <ThemedText style={[styles.attendanceText, { color: palette.muted }]}>
              {going + totalGuests} going
              {maybe > 0 && ` (${maybe} maybe)`}
            </ThemedText>
          </Row>

          <Row style={styles.footerRight}>
            {isFull && (
              <View
                style={[styles.statusBadge, { backgroundColor: withAlpha(palette.error, 0.09) }]}
              >
                <ThemedText style={[styles.statusText, { color: palette.error }]}>FULL</ThemedText>
              </View>
            )}
            {rsvpClosed && !isFull && (
              <View
                style={[styles.statusBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}
              >
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
              <View
                style={[styles.freeBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}
              >
                <ThemedText style={[styles.freeText, { color: palette.success }]}>FREE</ThemedText>
              </View>
            )}
          </Row>
        </Row>
      </View>
    </SurfaceCard>
  );
});

export { styles };
