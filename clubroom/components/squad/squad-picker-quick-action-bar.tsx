import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface QuickActionBarProps {
  onSelectAll: () => void;
  onClear: () => void;
}

export function QuickActionBar({ onSelectAll, onClear }: QuickActionBarProps) {
  const { colors: palette } = useTheme();

  return (
    <Row gap="xs" style={styles.quickActions}>
      <Clickable
        onPress={onSelectAll}
        style={[styles.quickActionButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
      >
        <Row align="center" gap="xs">
          <Ionicons name="checkmark-done" size={14} color={palette.tint} />
          <ThemedText style={{ color: palette.tint, ...Typography.caption }}>Select All</ThemedText>
        </Row>
      </Clickable>
      <Clickable
        onPress={onClear}
        style={[
          styles.quickActionButton,
          { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 },
        ]}
      >
        <ThemedText style={{ ...Typography.caption, color: palette.text }}>Clear</ThemedText>
      </Clickable>
    </Row>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  quickActionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
});
