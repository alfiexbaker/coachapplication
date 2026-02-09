import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Typography, Radii } from '@/constants/theme';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── Types ──────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  label: string;
  isComplete: boolean;
  route: string;
}

// ─── ChecklistItemRow ───────────────────────────────────────────

export interface ChecklistItemRowProps {
  item: ChecklistItem;
  onNavigate: (route: string) => void;
  palette: ThemeColors;
}

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  onNavigate,
  palette,
}: ChecklistItemRowProps) {
  return (
    <Clickable
      style={styles.item}
      onPress={() => {
        if (!item.isComplete) onNavigate(item.route);
      }}
      disabled={item.isComplete}
    >
      <View
        style={[
          styles.checkCircle,
          { borderColor: palette.border },
          item.isComplete && { backgroundColor: palette.success, borderColor: palette.success },
        ]}
      >
        {item.isComplete && (
          <Ionicons name="checkmark" size={14} color={palette.surface} />
        )}
      </View>
      <ThemedText
        style={[
          styles.itemLabel,
          { color: palette.text },
          item.isComplete && { color: palette.muted, textDecorationLine: 'line-through' as const },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </ThemedText>
      {!item.isComplete && (
        <Ionicons name="chevron-forward" size={16} color={palette.muted} />
      )}
    </Clickable>
  );
});

// ─── ProgressTrack ──────────────────────────────────────────────

export interface ProgressTrackProps {
  progress: number;
  palette: ThemeColors;
}

export const ProgressTrack = memo(function ProgressTrack({
  progress,
  palette,
}: ProgressTrackProps) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(progress * 100)}%`, backgroundColor: palette.success },
        ]}
      />
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  itemLabel: {
    ...Typography.body,
    flex: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: Radii.xs,
  },
});
