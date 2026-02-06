import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface EventReminderData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  rsvpCount: number;
  totalInvited?: number;
  hasRsvped?: boolean;
}

export interface EventReminderCardProps {
  data: EventReminderData;
  onRsvp?: () => void;
  onPress?: () => void;
}

export function EventReminderCard({ data, onRsvp, onPress }: EventReminderCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.typeRow}>
          <Ionicons name="calendar-outline" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={[styles.typeLabel, { color: palette.tint }]}>Upcoming Event</ThemedText>
        </View>
      </View>

      {/* Event title */}
      <ThemedText style={[styles.eventTitle, { color: palette.text }]}>{data.title}</ThemedText>

      {/* Details grid */}
      <View style={[styles.detailsContainer, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={[styles.detailText, { color: palette.text }]}>{formatDate(data.date)}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={[styles.detailText, { color: palette.text }]}>{data.time}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={[styles.detailText, { color: palette.text }]}>{data.location}</ThemedText>
        </View>
      </View>

      {/* RSVP count + CTA */}
      <View style={styles.rsvpRow}>
        <View style={styles.rsvpCount}>
          <Ionicons name="people-outline" size={Components.icon.sm} color={palette.muted} />
          <ThemedText style={[styles.rsvpText, { color: palette.muted }]}>
            {data.rsvpCount}{data.totalInvited ? `/${data.totalInvited}` : ''} attending
          </ThemedText>
        </View>

        <Clickable
          onPress={onRsvp}
          accessibilityLabel="RSVP Now"
          style={{
            backgroundColor: data.hasRsvped ? palette.surfaceSecondary : palette.tint,
            height: Components.button.height,
            borderRadius: Radii.button,
            paddingHorizontal: Spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.xs / 2,
          }}
        >
          <Ionicons
            name={data.hasRsvped ? 'checkmark-circle' : 'hand-right-outline'}
            size={Components.icon.md}
            color={data.hasRsvped ? palette.success : palette.onPrimary}
          />
          <ThemedText
            style={{
              ...Typography.bodySemiBold,
              color: data.hasRsvped ? palette.success : palette.onPrimary,
            }}
          >
            {data.hasRsvped ? 'Going' : 'RSVP Now'}
          </ThemedText>
        </Clickable>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  typeLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  eventTitle: {
    ...Typography.heading,
  },
  detailsContainer: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.body,
  },
  rsvpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  rsvpCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  rsvpText: {
    ...Typography.small,
  },
});
