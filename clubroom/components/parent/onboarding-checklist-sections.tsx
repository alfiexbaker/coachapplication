import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';
import { type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography } from '@/constants/theme';
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
  onNavigate: (route: Href) => void;
  palette: ThemeColors;
}

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  onNavigate,
  palette,
}: ChecklistItemRowProps) {
  return (
    <Clickable
      onPress={() => {
        if (!item.isComplete) onNavigate(item.route as Href);
      }}
      disabled={item.isComplete}
    >
      <Row align="center" gap="sm" style={styles.item}>
        <Row
          align="center"
          justify="center"
          style={[
            styles.checkCircle,
            { borderColor: palette.border },
            item.isComplete
              ? { backgroundColor: palette.success, borderColor: palette.success }
              : undefined,
          ]}
        >
          {item.isComplete && <Ionicons name="checkmark" size={14} color={palette.surface} />}
        </Row>
        <ThemedText
          style={[
            styles.itemLabel,
            { color: palette.text },
            item.isComplete
              ? { color: palette.muted, textDecorationLine: 'line-through' }
              : undefined,
          ]}
          numberOfLines={1}
        >
          {item.label}
        </ThemedText>
        {!item.isComplete && <Ionicons name="chevron-forward" size={16} color={palette.muted} />}
      </Row>
    </Clickable>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  item: {
    paddingVertical: Spacing.xs,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { ...Typography.body, flex: 1 },
});
