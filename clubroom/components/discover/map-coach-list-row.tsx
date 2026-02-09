import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, Components, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { MapCoach } from './map-view-placeholder';

// ─── Types ──────────────────────────────────────────────────────────────────

type CoachListRowProps = {
  coach: MapCoach;
  isSelected: boolean;
  onPress: () => void;
  onBookNow: () => void;
  palette: ThemeColors;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const CoachListRow = memo(function CoachListRow({
  coach,
  isSelected,
  onPress,
  onBookNow,
  palette,
}: CoachListRowProps) {
  return (
    <Clickable onPress={onPress} accessibilityLabel={`Select ${coach.fullName}`}>
      <View
        style={[
          styles.row,
          { borderBottomColor: palette.border },
          isSelected && { backgroundColor: withAlpha(palette.tint, 0.03) },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="person" size={Components.icon.lg} color={palette.muted} />
        </View>
        <View style={styles.info}>
          <ThemedText style={[styles.name, { color: palette.text }]}>{coach.fullName}</ThemedText>
          <View style={styles.meta}>
            <Ionicons name="star" size={Components.icon.sm} color={palette.warning} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {coach.rating.toFixed(1)} · {coach.distanceMiles.toFixed(1)} mi
            </ThemedText>
          </View>
        </View>
        <View style={styles.priceCol}>
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
        </View>
      </View>
    </Clickable>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderBottomWidth: 1 },
  avatar: { width: Components.avatar.md, height: Components.avatar.md, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: Spacing.xs / 2 },
  name: { ...Typography.bodySemiBold },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs / 2 },
  metaText: { ...Typography.caption },
  priceCol: { alignItems: 'flex-end', gap: Spacing.xs },
  price: { ...Typography.bodySemiBold, fontWeight: '700' },
  bookBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs / 2, borderRadius: Radii.button },
  bookBtnText: { ...Typography.caption, fontWeight: '700' },
});
