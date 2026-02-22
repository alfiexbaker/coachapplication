import { memo, type ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { POSITION_LABELS } from '@/constants/position-skills';
import { useTheme } from '@/hooks/useTheme';
import type { PositionRole } from '@/types/progress-types';

interface PositionSelectorProps {
  value: PositionRole | null;
  onChange: (position: PositionRole) => void;
}

const POSITION_OPTIONS: Array<{
  key: PositionRole;
  shortLabel: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}> = [
  { key: 'GK', shortLabel: 'GK', icon: 'hand-left-outline' },
  { key: 'DEF', shortLabel: 'DEF', icon: 'shield-outline' },
  { key: 'MID', shortLabel: 'MID', icon: 'swap-horizontal-outline' },
  { key: 'ATT', shortLabel: 'ATT', icon: 'football-outline' },
];

export const PositionSelector = memo(function PositionSelector({ value, onChange }: PositionSelectorProps) {
  const { colors } = useTheme();

  return (
    <Row gap="xs" wrap>
      {POSITION_OPTIONS.map((option) => {
        const active = option.key === value;
        return (
          <Clickable
            key={option.key}
            style={[
              styles.option,
              {
                borderColor: active ? colors.tint : colors.border,
                backgroundColor: active ? withAlpha(colors.tint, 0.14) : colors.background,
              },
            ]}
            onPress={() => onChange(option.key)}
            accessibilityLabel={`Set position to ${POSITION_LABELS[option.key]}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Row align="center" justify="center" gap="xxs">
              <Ionicons
                name={option.icon}
                size={14}
                color={active ? colors.tint : colors.muted}
              />
              <ThemedText style={[styles.shortLabel, { color: active ? colors.tint : colors.text }]}>
                {option.shortLabel}
              </ThemedText>
            </Row>
          </Clickable>
        );
      })}
    </Row>
  );
});

const styles = StyleSheet.create({
  option: {
    minHeight: 44,
    minWidth: 68,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortLabel: {
    ...Typography.bodySmallSemiBold,
  },
});
