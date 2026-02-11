import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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
  const { colors: palette } = useTheme();

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
      <Row style={styles.headerRow}>
        <Row style={styles.typeRow}>
          <Ionicons name="calendar-outline" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={[styles.typeLabel, { color: palette.tint }]}>
            Upcoming Event
          </ThemedText>
        </Row>
      </Row>

      {/* Event title */}
      <ThemedText style={[styles.eventTitle, { color: palette.text }]}>{data.title}</ThemedText>

      {/* Details grid */}
      <View
        style={[
          styles.detailsContainer,
          { backgroundColor: palette.surfaceSecondary, borderColor: palette.border },
        ]}
      >
        <Row style={styles.detailRow}>
          <Ionicons name="calendar" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={[styles.detailText, { color: palette.text }]}>
            {formatDate(data.date)}
          </ThemedText>
        </Row>
        <Row style={styles.detailRow}>
          <Ionicons name="time-outline" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={[styles.detailText, { color: palette.text }]}>{data.time}</ThemedText>
        </Row>
        <Row style={styles.detailRow}>
          <Ionicons name="location-outline" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={[styles.detailText, { color: palette.text }]}>
            {data.location}
          </ThemedText>
        </Row>
      </View>

      {/* RSVP count + CTA */}
      <Row style={styles.rsvpRow}>
        <Row style={styles.rsvpCount}>
          <Ionicons name="people-outline" size={Components.icon.sm} color={palette.muted} />
          <ThemedText style={[styles.rsvpText, { color: palette.muted }]}>
            {data.rsvpCount}
            {data.totalInvited ? `/${data.totalInvited}` : ''} attending
          </ThemedText>
        </Row>

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
      </Row>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
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
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.body,
  },
  rsvpRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  rsvpCount: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  rsvpText: {
    ...Typography.small,
  },
});
