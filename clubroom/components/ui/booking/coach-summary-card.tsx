import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { CoachProfile, User } from '@/constants/app-types';
import { useTheme } from '@/hooks/useTheme';

interface CoachSummaryCardProps {
  coach: User;
  coachProfile: CoachProfile;
}

export function CoachSummaryCard({ coach, coachProfile }: CoachSummaryCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
            {coach.avatar || coach.name.charAt(0)}
          </ThemedText>
        </View>
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold" style={styles.name}>
            {coach.name}
          </ThemedText>
          <View style={styles.meta}>
            <Ionicons name="star" size={14} color={palette.rating} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {coachProfile.rating.toFixed(1)} ({coachProfile.totalReviews} reviews)
            </ThemedText>
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.display },
  info: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  name: { ...Typography.heading },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  metaText: { ...Typography.small },
});
