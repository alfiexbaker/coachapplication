import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { CoachProfile } from '@/constants/types';
import { SurfaceCard } from '@/components/primitives/surface-card';
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

  const handlePress = () => {
    onPress?.();
  };

  return (
    <SurfaceCard
      accessibilityHint="Focus coach on map"
      onPress={handlePress}
      style={[
        styles.card,
        styles.pressable,
        active && { borderColor: palette.tint, backgroundColor: `${palette.tint}08` },
      ]}
      animateElevation={false}>
      <View style={styles.row}>
        <Image source={{ uri: coach.profilePhotoUrl }} style={styles.avatar} contentFit="cover" />
        <View style={styles.meta}>
          <ThemedText type="subtitle">{coach.fullName}</ThemedText>
          <ThemedText style={styles.bio} numberOfLines={2}>
            {coach.shortBio}
          </ThemedText>
          <View style={styles.metaRow}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={palette.secondary} />
              <ThemedText type="defaultSemiBold" style={styles.ratingValue}>
                {coach.rating.average.toFixed(1)}
              </ThemedText>
              <ThemedText style={styles.ratingMeta}>({coach.rating.reviewCount})</ThemedText>
            </View>
            <ThemedText type="defaultSemiBold">{formatPriceRange(coach.priceRange)}</ThemedText>
          </View>
          <ThemedText style={styles.nextSlot}>
            Next slot {formatNextAvailability(coach.nextAvailability)} · {formatDistance(coach.distanceMiles)} away
          </ThemedText>
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: Spacing.sm,
  },
  card: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  meta: {
    flex: 1,
    gap: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  ratingValue: {
    marginLeft: 2,
  },
  ratingMeta: {
    opacity: 0.7,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: Radii.md,
  },
  bio: {
    opacity: 0.85,
  },
  nextSlot: {
    opacity: 0.7,
  },
});
