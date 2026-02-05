import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Radii, Spacing, Components } from '@/constants/theme';
import { CoachProfile } from '@/constants/types';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDistance, formatPriceRange } from '@/utils/format';

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

  // Show only primary focus for cleaner UI
  const primaryFocus = coach.footballFocuses[0];

  return (
    <Animated.View entering={FadeInDown.duration(300).springify()}>
      <SurfaceCard
        accessibilityHint="View coach details"
        onPress={handlePress}
        outlineGradient={
          active ? [palette.premium, palette.premium] : undefined
        }
        style={[styles.card, styles.pressable, active ? { borderColor: palette.premium } : undefined]}
        gradientPadding={active ? 2 : 0}>
          <View style={styles.row}>
            <Image
              source={{ uri: coach.profilePhotoUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={styles.meta}>
              <ThemedText type="subtitle" style={styles.coachName}>{coach.fullName}</ThemedText>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={14} color={palette.icon} />
                <ThemedText style={[styles.infoText, { color: palette.muted }]}>
                  {formatDistance(coach.distanceMiles)}
                </ThemedText>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color={palette.premium} />
                  <ThemedText style={[styles.ratingText, { color: palette.text }]}>
                    {coach.rating.average.toFixed(1)}
                  </ThemedText>
                </View>
                {primaryFocus && (
                  <>
                    <View style={styles.divider} />
                    <View style={[styles.focusBadge, { backgroundColor: palette.surfaceSecondary }]}>
                      <ThemedText style={[styles.focusText, { color: palette.muted }]}>
                        {primaryFocus}
                      </ThemedText>
                    </View>
                  </>
                )}
              </View>
            </View>
            <View style={styles.priceColumn}>
              <ThemedText type="defaultSemiBold" style={styles.price}>{formatPriceRange(coach.priceRange)}</ThemedText>
              <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>per session</ThemedText>
            </View>
          </View>
      </SurfaceCard>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  pressable: {
    marginBottom: Spacing.sm,
  },
  card: {
    padding: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  meta: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  coachName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: -2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
  },
  focusBadge: {
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  focusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Radii.md,
  },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  location: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
