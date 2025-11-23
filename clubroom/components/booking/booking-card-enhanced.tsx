import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { StatusBadge, BookingStatus } from '@/components/booking/status-badge';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type EnhancedBooking = {
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

type Props = {
  booking: EnhancedBooking;
  onPress?: () => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

export function BookingCardEnhanced({ booking, onPress, onPrimaryAction, onSecondaryAction }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Clickable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <SurfaceCard style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleArea}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {booking.title}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>with {booking.coachName}</ThemedText>
          </View>
          <StatusBadge status={booking.status} />
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
                <ThemedText style={[styles.actionLabel, { color: palette.text }]}>Details</ThemedText>
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
                <ThemedText style={[styles.actionLabel, { color: '#fff' }]}>Take action</ThemedText>
              </Clickable>
            ) : null}
          </View>
        )}
      </SurfaceCard>
    </Clickable>
  );
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
});

