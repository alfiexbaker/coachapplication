import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CoachProfile, User } from '@/constants/app-types';

interface CoachSummaryCardProps {
  coach: User;
  coachProfile: CoachProfile;
}

export function CoachSummaryCard({ coach, coachProfile }: CoachSummaryCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}20` }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
            {coach.avatar || coach.name.charAt(0)}
          </ThemedText>
        </View>
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold" style={styles.name}>
            {coach.name}
          </ThemedText>
          <View style={styles.meta}>
            <Ionicons name="star" size={14} color="#fbbf24" />
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
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  name: {
    fontSize: 17,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  metaText: {
    fontSize: 13,
  },
});
