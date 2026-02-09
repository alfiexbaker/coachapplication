/**
 * CompactCard — Minimal coach card for map selection or list items.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Spacing, Typography } from '@/constants/theme';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { CoachAvatar } from './coach-card-header';
import { RatingDisplay } from './coach-card-reviews';
import { DistanceDisplay } from './coach-card-availability';
import { FocusBadge, formatPrice } from './coach-card-services';
import type { CompactVariantProps } from './coach-card-shared';

function CompactCardInner({ coach, active, onPress, index = 0 }: CompactVariantProps) {
  const { colors: palette } = useTheme();
  const primaryFocus = coach.footballFocuses?.[0] || coach.specialties?.[0];
  const priceStr = formatPrice(coach.pricePerHour, coach.priceMin, coach.priceMax);

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 50).springify()}>
      <SurfaceCard
        accessibilityHint="View coach details"
        onPress={onPress}
        outlineGradient={active ? [palette.premium, palette.premium] : undefined}
        style={[styles.card, active && { borderColor: palette.premium }]}
        gradientPadding={active ? 2 : 0}
      >
        <View style={styles.row}>
          <CoachAvatar profilePhotoUrl={coach.profilePhotoUrl} size="lg" />
          <View style={styles.meta}>
            <ThemedText type="subtitle" style={styles.name}>{coach.fullName}</ThemedText>
            {coach.distanceMiles !== undefined && <DistanceDisplay distanceMiles={coach.distanceMiles} />}
            <View style={styles.metaRow}>
              {coach.rating !== undefined && <RatingDisplay rating={coach.rating} showCount={false} />}
              {primaryFocus && (
                <>
                  <Divider vertical style={{ height: 12, opacity: 0.5 }} />
                  <FocusBadge focus={primaryFocus} />
                </>
              )}
            </View>
          </View>
          {priceStr && (
            <View style={styles.priceColumn}>
              <ThemedText type="defaultSemiBold" style={styles.price}>{priceStr}</ThemedText>
              <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>per session</ThemedText>
            </View>
          )}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export const CompactCard = memo(CompactCardInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.sm, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  meta: { flex: 1, gap: Spacing.xs, justifyContent: 'center' },
  name: { ...Typography.heading, letterSpacing: -0.2, marginBottom: -2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  priceColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  price: { ...Typography.heading, letterSpacing: -0.3 },
  priceLabel: { ...Typography.caption, marginTop: 1 },
});
