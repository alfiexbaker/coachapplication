import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Components, Typography  , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingRequestProps {
  /** Unique booking identifier. */
  bookingId: string;
  /** Parent / requester name. */
  parentName: string;
  /** Athlete name. */
  athleteName: string;
  /** Session type label (e.g. "1-on-1 Dribbling"). */
  sessionType: string;
  /** Requested date string (pre-formatted). */
  date: string;
  /** Requested time string (pre-formatted). */
  time: string;
  /** Called when coach confirms the booking. */
  onConfirm: (bookingId: string) => void;
  /** Called when coach wants to suggest an alternative. */
  onSuggestAlternative: (bookingId: string) => void;
  /** Called when coach declines. */
  onDecline: (bookingId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingRequest({
  bookingId,
  parentName,
  athleteName,
  sessionType,
  date,
  time,
  onConfirm,
  onSuggestAlternative,
  onDecline,
}: BookingRequestProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      {/* Status badge */}
      <View style={[styles.badge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
        <Ionicons name="time-outline" size={Components.icon.sm} color={palette.warning} />
        <ThemedText style={[Typography.caption, { color: palette.warning }]}>
          Pending Confirmation
        </ThemedText>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <DetailRow
          icon="person-outline"
          label="Parent"
          value={parentName}
          palette={palette}
        />
        <DetailRow
          icon="football-outline"
          label="Athlete"
          value={athleteName}
          palette={palette}
        />
        <DetailRow
          icon="layers-outline"
          label="Session"
          value={sessionType}
          palette={palette}
        />
        <DetailRow
          icon="calendar-outline"
          label="Date"
          value={date}
          palette={palette}
        />
        <DetailRow
          icon="time-outline"
          label="Time"
          value={time}
          palette={palette}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onConfirm(bookingId)}
          style={({ pressed }) => [
            styles.confirmButton,
            {
              backgroundColor: pressed ? withAlpha(palette.success, 0.87) : palette.success,
            },
          ]}
        >
          <Ionicons name="checkmark" size={Components.icon.md} color={palette.onPrimary} />
          <ThemedText style={[styles.confirmLabel, { color: palette.onPrimary }]}>Confirm</ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onSuggestAlternative(bookingId)}
          style={({ pressed }) => [
            styles.alternativeButton,
            {
              backgroundColor: pressed ? palette.overlay : palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Ionicons name="swap-horizontal" size={Components.icon.md} color={palette.foreground} />
          <ThemedText style={[styles.alternativeLabel, { color: palette.foreground }]}>
            Suggest Alternative
          </ThemedText>
        </Pressable>
      </View>

      {/* Decline as text-only */}
      <Pressable
        accessibilityRole="button"
        onPress={() => onDecline(bookingId)}
        style={({ pressed }) => [
          styles.declineButton,
          pressed && { opacity: 0.6 },
        ]}
      >
        <ThemedText style={[Typography.small, { color: palette.error }]}>
          Decline Request
        </ThemedText>
      </Pressable>
    </SurfaceCard>
  );
}

// ---------------------------------------------------------------------------
// Detail row sub-component
// ---------------------------------------------------------------------------

function DetailRow({
  icon,
  label,
  value,
  palette,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  palette: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={Components.icon.sm} color={palette.muted} />
      <ThemedText style={[Typography.small, styles.detailLabel, { color: palette.muted }]}>
        {label}
      </ThemedText>
      <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
        {value}
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },
  details: {
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailLabel: {
    width: 60,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    height: Components.button.height,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs / 2,
  },
  confirmLabel: {
    ...Typography.bodySemiBold,
  },
  alternativeButton: {
    flex: 1,
    flexDirection: 'row',
    height: Components.button.height,
    borderRadius: Radii.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs / 2,
  },
  alternativeLabel: {
    ...Typography.bodySemiBold,
  },
  declineButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
  },
});
