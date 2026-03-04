/**
 * DiscoverCoachList — List of nearby coaches with availability and specialties.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { formatGBP } from '@/utils/format';
import { createLogger } from '@/utils/logger';
import type { AvailabilitySlot } from '@/constants/types';

const logger = createLogger('DiscoverCoachList');

interface CoachWithDistance {
  id: string;
  name: string;
  avatar?: string;
  distance: number;
  profile: {
    rating?: number;
    sessionRate?: number;
    specialties?: string[];
  };
}

interface DiscoverCoachListProps {
  coaches: CoachWithDistance[];
  postcode: string;
  selectedChildId: string | undefined;
  nextAvailableSlots: Record<string, AvailabilitySlot | null>;
}

const formatNextAvailable = (slot: AvailabilitySlot | null): string => {
  if (!slot) return 'Check availability';
  const slotDate = new Date(slot.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (slotDate.toDateString() === today.toDateString()) return `Today at ${slot.startTime}`;
  if (slotDate.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${slot.startTime}`;
  const dayName = slotDate.toLocaleDateString('en-GB', { weekday: 'short' });
  return `${dayName} at ${slot.startTime}`;
};

function DiscoverCoachListInner({
  coaches,
  postcode,
  selectedChildId,
  nextAvailableSlots,
}: DiscoverCoachListProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.coachList}>
      <ThemedText style={[styles.resultsText, { color: palette.muted }]}>
        {coaches.length} {coaches.length === 1 ? 'coach' : 'coaches'} near {postcode}
      </ThemedText>

      {coaches.map((coach) => (
        <Clickable
          key={coach.id}
          onPress={() => {
            logger.press('CoachCard', { coachId: coach.id, selectedChildId });
            router.push(
              Routes.bookCoach(coach.id, {
                source: 'discover_coach_list',
                childId: selectedChildId,
              }),
            );
          }}
          style={({ pressed }) => [styles.coachCard, { opacity: pressed ? 0.7 : 1 }]}
        >
          <SurfaceCard style={styles.cardContent}>
            <Row align="center" gap="md">
              <Row
                align="center"
                justify="center"
                style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
              >
                <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                  {coach.avatar || coach.name.charAt(0)}
                </ThemedText>
              </Row>
              <View style={styles.coachInfo}>
                <ThemedText type="defaultSemiBold" style={styles.coachName} numberOfLines={1}>
                  {coach.name}
                </ThemedText>
                <Row gap="md">
                  <Row align="center" gap={4}>
                    <Ionicons name="location" size={13} color={palette.muted} />
                    <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                      {coach.distance.toFixed(1)}mi
                    </ThemedText>
                  </Row>
                  <Row align="center" gap={4}>
                    <Ionicons name="star" size={13} color={palette.warning} />
                    <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                      {coach.profile.rating?.toFixed(1) || '5.0'}
                    </ThemedText>
                  </Row>
                </Row>
              </View>
              <View style={styles.priceInfo}>
                <ThemedText style={[styles.price, { color: palette.text }]}>
                  {formatGBP(coach.profile.sessionRate || 120)}
                </ThemedText>
                <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>
                  per session
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </Row>

            <Row
              align="center"
              gap="xs"
              style={[styles.nextAvailable, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
            >
              <Ionicons name="time-outline" size={14} color={palette.tint} />
              <ThemedText style={[styles.nextAvailableText, { color: palette.tint }]}>
                {formatNextAvailable(nextAvailableSlots[coach.id])}
              </ThemedText>
            </Row>

            {coach.profile.specialties && coach.profile.specialties.length > 0 && (
              <Row wrap gap="xs">
                {coach.profile.specialties.slice(0, 3).map((focus: string, idx: number) => (
                  <View
                    key={idx}
                    style={[
                      styles.focusPill,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                    ]}
                  >
                    <ThemedText style={[styles.focusText, { color: palette.secondary }]}>
                      {focus}
                    </ThemedText>
                  </View>
                ))}
              </Row>
            )}
          </SurfaceCard>
        </Clickable>
      ))}
    </View>
  );
}

export const DiscoverCoachList = memo(DiscoverCoachListInner);

const styles = StyleSheet.create({
  coachList: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingTop: Spacing.md },
  resultsText: { ...Typography.smallSemiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  coachCard: {},
  cardContent: { padding: Spacing.md, gap: Spacing.sm },
  avatar: { width: 52, height: 52, borderRadius: Radii['2xl'] },
  avatarText: { ...Typography.title },
  coachInfo: { flex: 1, gap: Spacing.xs / 2 },
  coachName: { ...Typography.subheading, letterSpacing: -0.2 },
  metaText: { ...Typography.smallSemiBold },
  priceInfo: { alignItems: 'flex-end' },
  price: { ...Typography.heading, letterSpacing: -0.3 },
  priceLabel: { ...Typography.caption },
  nextAvailable: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  nextAvailableText: { ...Typography.caption },
  focusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  focusText: { ...Typography.caption },
});
