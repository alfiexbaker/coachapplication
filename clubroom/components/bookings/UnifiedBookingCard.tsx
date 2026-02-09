/**
 * UnifiedBookingCard
 *
 * Single component for all booking card variants.
 * Replaces: booking-card.tsx, compact-booking-card.tsx, booking-card-enhanced.tsx
 *
 * Usage:
 *   <UnifiedBookingCard booking={booking} variant="compact" />
 *   <UnifiedBookingCard booking={booking} variant="standard" />
 *   <UnifiedBookingCard booking={booking} variant="detailed" />
 */

import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { BookingSummary } from '@/constants/types';
import { formatPrice } from '@/constants/styles';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UnifiedBookingCard');

export type BookingCardVariant = 'compact' | 'standard' | 'detailed';

interface UnifiedBookingCardProps {
  booking: BookingSummary;
  variant?: BookingCardVariant;
  onPress?: () => void;
  showActions?: boolean;
}

interface ExtendedBooking extends BookingSummary {
  athleteId?: string;
  price?: number;
  duration?: number;
  notes?: string;
}

export function UnifiedBookingCard({
  booking,
  variant = 'standard',
  onPress,
  showActions = false,
}: UnifiedBookingCardProps) {
  const { currentUser } = useAuth();
  const { colors: palette } = useTheme();
  const extendedBooking = booking as ExtendedBooking;

  const isCoach = currentUser?.role === 'COACH';

  const getStatusColor = () => {
    switch (booking.status) {
      case 'Confirmed': return palette.success;
      case 'Pending': return palette.warning;
      case 'Completed': return palette.muted;
      default: return palette.muted;
    }
  };

  const formatDateTime = () => {
    const date = new Date(booking.start);
    return {
      day: date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    };
  };

  const { day, time, full } = formatDateTime();
  const statusColor = getStatusColor();
  const coachPhotoUrl = extendedBooking.coach?.photoUrl || `https://i.pravatar.cc/100?u=${booking.coachId || 'default'}`;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      logger.press('BookingCard', { bookingId: booking.id, variant });
      router.push(Routes.booking(booking.id));
    }
  };

  const handleAthletePress = () => {
    const athleteId = extendedBooking.athleteId;
    if (athleteId && isCoach) {
      logger.press('AthleteLink', { athleteId });
      router.push(Routes.developmentAthlete(athleteId));
    }
  };

  // COMPACT VARIANT - Minimal, single row
  if (variant === 'compact') {
    return (
      <Pressable onPress={handlePress} style={({ pressed }) => pressed && styles.pressed}>
        <SurfaceCard style={styles.compactCard}>
          <View style={styles.compactRow}>
            <Image source={{ uri: coachPhotoUrl }} style={styles.avatarSmall} />
            <View style={styles.compactContent}>
              <ThemedText style={styles.compactTitle} numberOfLines={1}>
                {booking.service}
              </ThemedText>
              <ThemedText style={[styles.compactMeta, { color: palette.muted }]} numberOfLines={1}>
                {booking.coachName} · {day}
              </ThemedText>
              {booking.locationLabel ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color={palette.tint} />
                  <ThemedText style={[styles.compactLocation, { color: palette.tint }]} numberOfLines={1}>
                    {booking.locationLabel}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
        </SurfaceCard>
      </Pressable>
    );
  }

  // DETAILED VARIANT - Full info with all metadata
  if (variant === 'detailed') {
    return (
      <Pressable onPress={handlePress} style={({ pressed }) => pressed && styles.pressed}>
        <SurfaceCard style={styles.detailedCard}>
          {/* Header */}
          <View style={styles.detailedHeader}>
            <Image source={{ uri: coachPhotoUrl }} style={styles.avatarMedium} />
            <View style={styles.detailedHeaderContent}>
              <ThemedText style={styles.detailedTitle}>{booking.service}</ThemedText>
              <ThemedText style={[styles.detailedSubtitle, { color: palette.muted }]}>
                with {booking.coachName}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {booking.status}
              </ThemedText>
            </View>
          </View>

          {/* Meta rows */}
          <View style={[styles.metaSection, { borderTopColor: palette.border }]}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={palette.muted} />
              <ThemedText style={styles.metaText}>{full}</ThemedText>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={palette.muted} />
              <ThemedText style={styles.metaText}>
                {time}{extendedBooking.duration ? ` (${extendedBooking.duration} mins)` : ''}
              </ThemedText>
            </View>
            {booking.locationLabel && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.metaText, { color: palette.tint, fontWeight: '600' }]}>{booking.locationLabel}</ThemedText>
              </View>
            )}
            {booking.childName && (
              <Pressable
                style={styles.metaRow}
                onPress={isCoach ? handleAthletePress : undefined}
                disabled={!isCoach}
              >
                <Ionicons name="person-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.metaText, { color: palette.tint }]}>
                  {booking.childName}
                </ThemedText>
                {isCoach && <Ionicons name="chevron-forward" size={14} color={palette.tint} />}
              </Pressable>
            )}
          </View>

          {/* Price */}
          {extendedBooking.price !== undefined && extendedBooking.price > 0 && (
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceText}>
                {formatPrice(extendedBooking.price)}
              </ThemedText>
            </View>
          )}

          {/* Actions */}
          {showActions && booking.status === 'Completed' && (
            <View style={[styles.actionsRow, { borderTopColor: palette.border }]}>
              <Clickable
                style={[styles.actionButton, { borderColor: palette.tint }]}
                onPress={() => router.push(Routes.review(booking.id))}
              >
                <Ionicons name="star-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.actionText, { color: palette.tint }]}>
                  Rate Session
                </ThemedText>
              </Clickable>
            </View>
          )}
        </SurfaceCard>
      </Pressable>
    );
  }

  // STANDARD VARIANT (default) - Balanced info
  return (
    <Pressable onPress={handlePress} style={({ pressed }) => pressed && styles.pressed}>
      <SurfaceCard style={styles.standardCard}>
        <View style={styles.standardRow}>
          <Image source={{ uri: coachPhotoUrl }} style={styles.avatarMedium} />

          <View style={styles.standardContent}>
            <ThemedText style={styles.standardTitle} numberOfLines={1}>
              {booking.service}
            </ThemedText>
            <ThemedText style={[styles.standardSubtitle, { color: palette.muted }]} numberOfLines={1}>
              with {booking.coachName}
            </ThemedText>

            {booking.childName && (
              <View style={styles.childRow}>
                <Ionicons name="person" size={14} color={palette.tint} />
                <ThemedText style={[styles.childText, { color: palette.tint }]}>
                  {booking.childName}
                </ThemedText>
              </View>
            )}

            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.dateText, { color: palette.muted }]}>
                {day} · {time}
              </ThemedText>
            </View>

            {booking.locationLabel ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={palette.tint} />
                <ThemedText style={[styles.locationText, { color: palette.tint }]} numberOfLines={1}>
                  {booking.locationLabel}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.standardRight}>
            <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {booking.status}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </View>
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },

  // Avatars
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
  },
  avatarMedium: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
  },

  // Status
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: { ...Typography.caption, textTransform: 'uppercase',
    letterSpacing: 0.3 },

  // COMPACT
  compactCard: {
    padding: Spacing.xs,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  compactTitle: { ...Typography.bodySemiBold },
  compactMeta: { ...Typography.small },

  // STANDARD
  standardCard: {
    padding: Spacing.sm,
  },
  standardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  standardContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  standardTitle: { ...Typography.subheading },
  standardSubtitle: { ...Typography.bodySmall },
  standardRight: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  childText: { ...Typography.smallSemiBold },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  dateText: { ...Typography.caption },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  locationText: { ...Typography.smallSemiBold },
  compactLocation: { ...Typography.caption, fontWeight: '600' },

  // DETAILED
  detailedCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  detailedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailedHeaderContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  detailedTitle: { ...Typography.heading },
  detailedSubtitle: { ...Typography.bodySmall },
  metaSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: { ...Typography.bodySmall, flex: 1 },
  priceRow: {
    alignItems: 'flex-end',
  },
  priceText: { ...Typography.heading },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  actionText: { ...Typography.bodySmallSemiBold },
});
