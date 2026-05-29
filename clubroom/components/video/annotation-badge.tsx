import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { VideoAnnotation } from '@/constants/types';
import { ANNOTATION_TYPES, formatTime } from './video-annotation-helpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnnotationBadgeProps {
  annotation: VideoAnnotation;
  onPress?: () => void;
  compact?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const AnnotationBadge = function AnnotationBadge({
  annotation,
  onPress,
  compact = false,
}: AnnotationBadgeProps) {
  const { colors: palette } = useTheme();
  const typeConfig =
    ANNOTATION_TYPES.find((t) => t.type === annotation.type) || ANNOTATION_TYPES[0];

  if (compact) {
    return (
      <Clickable
        onPress={onPress}
        style={[styles.compactBadge, { backgroundColor: typeConfig.color }]}
      >
        <Ionicons
          name={typeConfig.icon as keyof typeof Ionicons.glyphMap}
          size={10}
          color={palette.onPrimary}
        />
      </Clickable>
    );
  }

  return (
    <Clickable
      onPress={onPress}
      style={[styles.badge, { backgroundColor: palette.surface, borderColor: typeConfig.color }]}
    >
      <View style={[styles.badgeDot, { backgroundColor: typeConfig.color }]} />
      <ThemedText style={styles.badgeLabel}>{annotation.label}</ThemedText>
      <ThemedText style={[styles.badgeTime, { color: palette.muted }]}>
        {formatTime(annotation.timestamp)}
      </ThemedText>
    </Clickable>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactBadge: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  badgeDot: { width: 6, height: 6, borderRadius: Radii.xs },
  badgeLabel: { ...Typography.caption },
  badgeTime: { ...Typography.caption },
});
