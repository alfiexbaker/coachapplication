import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives';
import { useTheme } from '@/hooks/useTheme';
import { formatPrice } from './coach-card-services-helpers';

export interface InlinePriceProps {
  pricePerHour?: number;
  priceMin?: number;
  priceMax?: number;
  suffix?: string;
}

export function InlinePrice({
  pricePerHour,
  priceMin,
  priceMax,
  suffix = '/session',
}: InlinePriceProps) {
  const { colors: palette } = useTheme();

  const priceStr = formatPrice(pricePerHour, priceMin, priceMax);

  if (!priceStr) {
    return null;
  }

  return (
    <Row style={styles.inlinePriceContainer}>
      <ThemedText type="defaultSemiBold" style={styles.inlinePrice}>
        {priceStr}
      </ThemedText>
      <ThemedText style={[styles.inlinePriceSuffix, { color: palette.muted }]}>{suffix}</ThemedText>
    </Row>
  );
}

const styles = StyleSheet.create({
  inlinePriceContainer: {
    alignItems: 'baseline',
    gap: Spacing.micro,
  },
  inlinePrice: { ...Typography.subheading, letterSpacing: -0.2 },
  inlinePriceSuffix: { ...Typography.caption },
});
