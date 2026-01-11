import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Badge } from '@/components/primitives/badge';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export type BookingCardData = {
  id: string;
  title: string;
  coachName: string;
  childName?: string;
  date: string;
  time: string;
  location?: string;
  status: BookingStatus;
  price?: string;
};

type SwipeAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

type Props = {
  booking: BookingCardData;
  onPress?: () => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  /** Labels for action buttons */
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  /** Swipe actions for gesture-based interactions */
  swipeActions?: SwipeAction[];
  /** Whether swipe is enabled */
  swipeable?: boolean;
};

/**
 * Consolidated BookingCard component.
 * Supports both button-based actions and swipe gestures.
 *
 * @example
 * ```tsx
 * // Basic usage with button actions
 * <BookingCard
 *   booking={bookingData}
 *   onPress={() => navigate(booking.id)}
 *   onPrimaryAction={() => confirm(booking.id)}
 * />
 *
 * // With swipe actions
 * <BookingCard
 *   booking={bookingData}
 *   swipeable
 *   swipeActions={[
 *     { label: 'Reschedule', icon: 'refresh', color: palette.tint, onPress: reschedule },
 *     { label: 'Cancel', icon: 'close', color: palette.error, onPress: cancel },
 *   ]}
 * />
 * ```
 */
export function BookingCard({
  booking,
  onPress,
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel = 'Take action',
  secondaryActionLabel = 'Details',
  swipeActions,
  swipeable = false,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const statusTone = getStatusTone(booking.status);

  const renderRightActions = () => {
    if (!swipeActions?.length) return null;
    return (
      <View style={styles.actionsContainer}>
        {swipeActions.map((action, index) => (
          <Clickable
            key={index}
            onPress={action.onPress}
            style={[styles.swipeActionButton, { backgroundColor: action.color }]}>
            <Ionicons name={action.icon} size={18} color="#FFFFFF" />
            <ThemedText style={styles.swipeActionLabel} lightColor="#FFFFFF" darkColor="#FFFFFF">
              {action.label}
            </ThemedText>
          </Clickable>
        ))}
      </View>
    );
  };

  const cardContent = (
    <Clickable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <SurfaceCard style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleArea}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {booking.title}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              with {booking.coachName}
            </ThemedText>
          </View>
          <Badge label={booking.status} tone={statusTone} />
        </View>

        <View style={styles.metaRow}>
          <Meta icon="calendar" text={booking.date} />
          <Meta icon="time" text={booking.time} />
          {booking.location ? <Meta icon="location" text={booking.location} /> : null}
        </View>

        {booking.childName ? (
          <View style={styles.metaRow}>
            <Meta icon="person" text={`For ${booking.childName}`} />
            {booking.price ? <Meta icon="card" text={booking.price} /> : null}
          </View>
        ) : null}

        {(onPrimaryAction || onSecondaryAction) && (
          <View style={styles.actions}>
            {onSecondaryAction ? (
              <Clickable
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  onSecondaryAction();
                }}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: pressed ? palette.surface : 'transparent',
                  },
                ]}
              >
                <ThemedText style={[styles.actionLabel, { color: palette.text }]}>
                  {secondaryActionLabel}
                </ThemedText>
              </Clickable>
            ) : null}

            {onPrimaryAction ? (
              <Clickable
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  onPrimaryAction();
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: pressed ? palette.tintPressed : palette.tint },
                ]}
              >
                <ThemedText style={[styles.actionLabel, { color: '#fff' }]}>
                  {primaryActionLabel}
                </ThemedText>
              </Clickable>
            ) : null}
          </View>
        )}
      </SurfaceCard>
    </Clickable>
  );

  if (swipeable && swipeActions?.length) {
    return (
      <Swipeable renderRightActions={renderRightActions} friction={2}>
        {cardContent}
      </Swipeable>
    );
  }

  return cardContent;
}

function getStatusTone(status: BookingStatus): 'success' | 'warning' | 'default' {
  switch (status) {
    case 'Confirmed':
    case 'Completed':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Cancelled':
    default:
      return 'default';
  }
}

function Meta({ icon, text }: { icon: string; text: string }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon as any} size={14} color={palette.icon} />
      <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  titleArea: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#f8fafc',
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 160,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
  },
  primaryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.button,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.button,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  swipeActionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.xs / 2,
  },
  swipeActionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// Re-export for backward compatibility
export { BookingCard as BookingCardEnhanced };
export type { BookingCardData as EnhancedBooking };
