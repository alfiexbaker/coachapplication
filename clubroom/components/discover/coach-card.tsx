import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { CoachProfile } from '@/constants/types';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Badge } from '@/components/primitives/badge';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDistance, formatNextAvailability, formatPriceRange } from '@/utils/format';

interface CoachCardProps {
  coach: CoachProfile;
  active?: boolean;
  onPress?: () => void;
}

export function CoachCard({ coach, active, onPress }: CoachCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Pressable onPress={onPress} style={styles.pressable} accessibilityHint="Focus coach on map">
      <SurfaceCard
        style={[
          styles.card,
          active && {
            borderColor: palette.tint,
          },
        ]}>
        <View style={styles.row}>
          <Image source={{ uri: coach.profilePhotoUrl }} style={styles.avatar} contentFit="cover" />
          <View style={styles.meta}>
            <ThemedText type="subtitle">{coach.fullName}</ThemedText>
            <View style={styles.inlineRow}>
              <ThemedText style={styles.location}>{coach.city}, {coach.state}</ThemedText>
              <View style={[styles.dot, { backgroundColor: palette.border }]} />
              <ThemedText style={styles.location}>{formatDistance(coach.distanceMiles)}</ThemedText>
            </View>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color={palette.secondary} />
              <ThemedText type="defaultSemiBold" style={styles.ratingValue}>
                {coach.rating.average.toFixed(1)}
              </ThemedText>
              <ThemedText style={styles.ratingMeta}>({coach.rating.reviewCount})</ThemedText>
            </View>
          </View>
          <View style={[styles.pricePill, { borderColor: palette.border }]}>
            <ThemedText type="defaultSemiBold">{formatPriceRange(coach.priceRange)}</ThemedText>
            <ThemedText style={styles.priceHint}>Next slot {formatNextAvailability(coach.nextAvailability)}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.bio}>{coach.shortBio}</ThemedText>
        <View style={styles.badgeRow}>
          {coach.badges.map((badge) => (
            <Badge key={badge.id} label={badge.label} tone={badge.tone} />
          ))}
        </View>
        <View style={styles.formatRow}>
          {coach.sessionFormats.map((format) => (
            <View key={format} style={[styles.formatPill, { backgroundColor: `${palette.tint}10` }]}>
              <ThemedText style={[Typography.sm, styles.formatLabel]}>{format}</ThemedText>
            </View>
          ))}
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: Spacing.md,
  },
  card: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  meta: {
    flex: 1,
    gap: Spacing.xs,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingValue: {
    marginLeft: 2,
  },
  ratingMeta: {
    opacity: 0.7,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radii.md,
  },
  location: {
    opacity: 0.8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 4,
  },
  pricePill: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: 160,
  },
  priceHint: {
    opacity: 0.7,
    marginTop: 2,
  },
  bio: {
    opacity: 0.9,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  formatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  formatPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  formatLabel: {
    fontWeight: '600',
  },
});
