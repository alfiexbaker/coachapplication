import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface TrendArrowProps {
  delta: number;
  suffix?: string;
  compact?: boolean;
}

/**
 * Inline arrow + percentage. Green up / amber flat / red down.
 * Used next to skill names, corner labels, metric rows.
 */
export const TrendArrow = function TrendArrow({
  delta,
  suffix = '',
  compact = false,
}: TrendArrowProps) {
  const { colors } = useTheme();

  const isUp = delta > 0;
  const isDown = delta < 0;
  const color = isUp ? colors.success : isDown ? colors.error : colors.muted;
  const icon = isUp ? 'caret-up' : isDown ? 'caret-down' : 'remove';
  const sign = isUp ? '+' : '';
  const displayValue = delta === 0 ? '—' : `${sign}${delta}${suffix}`;

  return (
    <Row align="center" gap="micro">
      <Ionicons name={icon} size={compact ? 10 : 12} color={color} />
      <ThemedText style={[compact ? styles.textCompact : styles.text, { color }]}>
        {displayValue}
      </ThemedText>
    </Row>
  );
};

const styles = StyleSheet.create({
  text: {
    ...Typography.caption,
    fontWeight: '600',
  },
  textCompact: {
    ...Typography.micro,
    fontWeight: '600',
  },
});
