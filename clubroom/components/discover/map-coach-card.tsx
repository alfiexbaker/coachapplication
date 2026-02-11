import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Radii, Spacing, Typography, Components } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { MapCoach } from './map-view-placeholder';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────────────────

type MiniCoachCardProps = {
  coach: MapCoach;
  isSelected: boolean;
  onPress: () => void;
  onBookNow: () => void;
  palette: ThemeColors;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const MiniCoachCard = memo(function MiniCoachCard({
  coach,
  isSelected,
  onPress,
  onBookNow,
  palette,
}: MiniCoachCardProps) {
  return (
    <SurfaceCard
      onPress={onPress}
      style={[styles.card, isSelected && { borderColor: palette.tint, borderWidth: 2 }]}
    >
      <Row style={styles.row}>
        {/* Avatar placeholder */}
        <View style={[styles.avatar, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="person" size={Components.icon.lg} color={palette.muted} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <ThemedText style={[styles.name, { color: palette.text }]} numberOfLines={1}>
            {coach.fullName}
          </ThemedText>
          <Row style={styles.metaRow}>
            <Ionicons name="star" size={Components.icon.sm} color={palette.warning} />
            <ThemedText style={[styles.metaText, { color: palette.text }]}>
              {coach.rating.toFixed(1)}
            </ThemedText>
            <View style={[styles.dot, { backgroundColor: palette.border }]} />
            <Ionicons name="location-outline" size={Components.icon.sm} color={palette.muted} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {coach.distanceMiles.toFixed(1)} mi
            </ThemedText>
          </Row>
          <ThemedText style={[styles.price, { color: palette.text }]}>
            {'\u00A3'}
            {coach.pricePerHour}/hr
          </ThemedText>
        </View>

        {/* Book Now */}
        <Clickable
          accessibilityLabel={`Book ${coach.fullName}`}
          onPress={onBookNow}
          style={[styles.bookButton, { backgroundColor: palette.tint }]}
        >
          <ThemedText style={[styles.bookText, { color: palette.onPrimary }]}>Book</ThemedText>
        </Clickable>
      </Row>
    </SurfaceCard>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { width: 260, padding: Spacing.sm },
  row: { alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: Spacing.xs / 2 },
  name: { ...Typography.bodySemiBold },
  metaRow: { alignItems: 'center', gap: Spacing.xs / 2 },
  metaText: { ...Typography.caption },
  dot: { width: 3, height: 3, borderRadius: Radii.pill },
  price: { ...Typography.bodySemiBold, fontWeight: '700' },
  bookButton: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookText: { ...Typography.caption, fontWeight: '700' },
});
