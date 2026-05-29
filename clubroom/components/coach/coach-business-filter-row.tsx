import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  getCoachBusinessFilterLabel,
  type CoachBusinessFilter,
} from '@/utils/coach-business-context';

const FILTERS: CoachBusinessFilter[] = ['all', 'org', 'independent'];

interface CoachBusinessFilterRowProps {
  value: CoachBusinessFilter;
  onChange: (filter: CoachBusinessFilter) => void;
  counts?: Partial<Record<CoachBusinessFilter, number>>;
  style?: ViewStyle;
}

function CoachBusinessFilterRowInner({
  value,
  onChange,
  counts,
  style,
}: CoachBusinessFilterRowProps) {
  const { colors } = useTheme();

  const handlePress = (filter: CoachBusinessFilter) => {
    if (filter === value) return;
    onChange(filter);
  };

  return (
    <Row gap="xs" style={[styles.row, style]}>
      {FILTERS.map((filter) => {
        const selected = value === filter;
        const count = counts?.[filter];

        return (
          <Clickable
            key={filter}
            onPress={() => handlePress(filter)}
            accessibilityRole="button"
            accessibilityLabel={`${getCoachBusinessFilterLabel(filter)} filter`}
          >
            <View
              style={[
                styles.pill,
                {
                  borderColor: selected ? colors.tint : colors.border,
                  backgroundColor: selected ? withAlpha(colors.tint, 0.1) : colors.surface,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.label,
                  { color: selected ? colors.tint : colors.muted },
                ]}
              >
                {getCoachBusinessFilterLabel(filter)}
                {typeof count === 'number' ? ` (${count})` : ''}
              </ThemedText>
            </View>
          </Clickable>
        );
      })}
    </Row>
  );
}

export const CoachBusinessFilterRow = CoachBusinessFilterRowInner;

const styles = StyleSheet.create({
  row: {
    flexWrap: 'wrap',
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  label: {
    ...Typography.bodySmallSemiBold,
  },
});
