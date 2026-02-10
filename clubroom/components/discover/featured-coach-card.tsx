import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, Components, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { CoachCardData } from '@/components/coach';
import { Row } from '@/components/primitives';

// ─── Constants ──────────────────────────────────────────────────────────────

export const CARD_WIDTH = 220;

// ─── Types ──────────────────────────────────────────────────────────────────

type FeaturedCardProps = {
  coach: CoachCardData;
  index: number;
  palette: ThemeColors;
  isFavourited: boolean;
  onPress: () => void;
  onBookNow: () => void;
  onToggleFavourite: () => void;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const FeaturedCard = memo(function FeaturedCard({
  coach,
  index,
  palette,
  isFavourited,
  onPress,
  onBookNow,
  onToggleFavourite,
}: FeaturedCardProps) {
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(300).springify()}>
      <SurfaceCard onPress={onPress} style={styles.card}>
        {/* Top section: avatar + badges */}
        <View style={styles.topSection}>
          <Image source={{ uri: coach.profilePhotoUrl }} style={styles.avatar} contentFit="cover" />
          {coach.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: palette.tint }]}>
              <Ionicons name="checkmark" size={10} color={palette.onPrimary} />
            </View>
          )}
          <Clickable onPress={onToggleFavourite} accessibilityLabel="Toggle favourite" style={styles.favButton} hitSlop={8}>
            <View style={[styles.favCircle, { backgroundColor: withAlpha(palette.surface, 0.9) }]}>
              <Ionicons
                name={isFavourited ? 'heart' : 'heart-outline'}
                size={Components.icon.md}
                color={isFavourited ? palette.error : palette.muted}
              />
            </View>
          </Clickable>
          {coach.trialAvailable && (
            <View style={[styles.trialPill, { backgroundColor: palette.success }]}>
              <ThemedText style={[styles.trialText, { color: palette.onPrimary }]}>FREE TRIAL</ThemedText>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <ThemedText style={[styles.name, { color: palette.text }]} numberOfLines={1}>
            {coach.fullName}
          </ThemedText>
          <Row style={styles.ratingRow}>
            <Ionicons name="star" size={Components.icon.sm} color={palette.rating} />
            <ThemedText style={[styles.ratingText, { color: palette.text }]}>
              {coach.rating?.toFixed(1)}
            </ThemedText>
            <ThemedText style={[styles.reviewCount, { color: palette.muted }]}>
              ({coach.reviewCount})
            </ThemedText>
            <View style={[styles.dot, { backgroundColor: palette.border }]} />
            <ThemedText style={[styles.distance, { color: palette.muted }]}>
              {coach.distanceMiles?.toFixed(1)} mi
            </ThemedText>
          </Row>
          <Row style={styles.bottomRow}>
            <ThemedText style={[styles.price, { color: palette.text }]}>
              {'\u00A3'}{coach.pricePerHour}/hr
            </ThemedText>
            <Clickable
              onPress={onBookNow}
              style={[
                styles.bookBtn,
                { backgroundColor: palette.tint },
              ]}
            >
              <ThemedText style={[styles.bookBtnText, { color: palette.onPrimary }]}>Book Now</ThemedText>
            </Clickable>
          </Row>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, padding: 0, overflow: 'hidden' },
  topSection: { position: 'relative', height: 140 },
  avatar: { width: '100%', height: '100%', borderTopLeftRadius: Radii.card, borderTopRightRadius: Radii.card },
  verifiedBadge: { position: 'absolute', top: Spacing.xs, left: Spacing.xs, width: 20, height: 20, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  favButton: { position: 'absolute', top: Spacing.xs, right: Spacing.xs },
  favCircle: { width: 32, height: 32, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  trialPill: { position: 'absolute', bottom: Spacing.xs, left: Spacing.xs, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  trialText: { ...Typography.micro, fontSize: 9 },
  infoSection: { padding: Spacing.sm, gap: Spacing.xs / 2 },
  name: { ...Typography.bodySemiBold },
  ratingRow: { alignItems: 'center', gap: Spacing.xs / 2 },
  ratingText: { ...Typography.caption, fontWeight: '700' },
  reviewCount: { ...Typography.caption },
  dot: { width: 3, height: 3, borderRadius: Radii.pill },
  distance: { ...Typography.caption },
  bottomRow: { alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs },
  price: { ...Typography.bodySemiBold, fontWeight: '700' },
  bookBtn: { paddingHorizontal: Spacing.sm, minHeight: 44, justifyContent: 'center', borderRadius: Radii.button },
  bookBtnText: { ...Typography.caption, fontWeight: '700' },
});
