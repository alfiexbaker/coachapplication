import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

/* ---------- StarRow ---------- */

export interface StarRowProps {
  rating: number;
  palette: ThemeColors;
}

export const StarRow = memo(function StarRow({ rating, palette }: StarRowProps) {
  return (
    <Row style={styles.starRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < rating ? 'star' : 'star-outline'}
          size={18}
          color={i < rating ? palette.warning : palette.border}
        />
      ))}
    </Row>
  );
});

/* ---------- BadgeBanner ---------- */

export interface BadgeBannerProps {
  badgeName: string;
  palette: ThemeColors;
}

export const BadgeBanner = memo(function BadgeBanner({ badgeName, palette }: BadgeBannerProps) {
  return (
    <Row style={[styles.badgeBanner, { backgroundColor: withAlpha(palette.warning, 0.09), borderColor: withAlpha(palette.warning, 0.25) }]}>
      <Ionicons name="ribbon" size={20} color={palette.warning} />
      <View style={styles.badgeText}>
        <ThemedText style={[styles.badgeLabel, { color: palette.warning }]}>
          Badge Earned!
        </ThemedText>
        <ThemedText type="defaultSemiBold">{badgeName}</ThemedText>
      </View>
    </Row>
  );
});

/* ---------- RecapActions ---------- */

export interface RecapActionsProps {
  onShareWithFamily?: () => void;
  onSave?: () => void;
  palette: ThemeColors;
}

export const RecapActions = memo(function RecapActions({
  onShareWithFamily,
  onSave,
  palette,
}: RecapActionsProps) {
  if (!onShareWithFamily && !onSave) return null;

  return (
    <Row style={styles.actions}>
      {onShareWithFamily && (
        <Clickable onPress={onShareWithFamily} accessibilityLabel="Share with Family">
          <Row style={[styles.button, { backgroundColor: palette.tint }]}>
            <Ionicons name="share-outline" size={18} color={palette.surface} />
            <ThemedText style={[styles.buttonText, { color: palette.surface }]}>
              Share with Family
            </ThemedText>
          </Row>
        </Clickable>
      )}
      {onSave && (
        <Clickable onPress={onSave} accessibilityLabel="Save">
          <View
            style={[styles.button, styles.buttonOutline, { borderColor: palette.border }]}
          >
            <Ionicons name="bookmark-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.buttonText, { color: palette.tint }]}>
              Save
            </ThemedText>
          </View>
        </Clickable>
      )}
    </Row>
  );
});

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  starRow: { gap: Spacing.micro },
  badgeBanner: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  badgeText: {
    flex: 1,
    gap: Spacing.micro,
  },
  badgeLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  actions: {
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
    gap: Spacing.xs,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    ...Typography.bodySemiBold,
  },
});
