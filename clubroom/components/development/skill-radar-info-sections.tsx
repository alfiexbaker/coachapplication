import React, { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

import type { ImprovementItem } from './skill-radar-helpers';
import { styles } from './skill-radar-styles';

interface RadarLegendProps {
  palette: ThemeColors;
}

export const RadarLegend = memo(function RadarLegend({ palette }: RadarLegendProps) {
  return (
    <Row style={styles.legend}>
      <Row style={styles.legendItem}>
        <View style={[styles.legendDotFilled, { backgroundColor: palette.success }]} />
        <ThemedText style={[styles.legendText, { color: palette.text }]}>Current</ThemedText>
      </Row>
      <Row style={styles.legendItem}>
        <View
          style={[
            styles.legendDotOutline,
            { borderColor: palette.muted, backgroundColor: palette.surface },
          ]}
        />
        <ThemedText style={[styles.legendText, { color: palette.muted }]}>Previous</ThemedText>
      </Row>
    </Row>
  );
});

interface RadarCalloutsProps {
  improvements: ImprovementItem[];
  palette: ThemeColors;
}

export const RadarCallouts = memo(function RadarCallouts({ improvements, palette }: RadarCalloutsProps) {
  if (improvements.length === 0) return null;

  return (
    <View style={[styles.callouts, { borderTopColor: palette.border }]}>
      {improvements.map((item) => (
        <Row key={item.name} style={styles.calloutRow}>
          <Ionicons
            name={item.positive ? 'trending-up' : 'trending-down'}
            size={16}
            color={item.positive ? palette.success : palette.error}
          />
          <ThemedText
            style={[styles.calloutText, { color: item.positive ? palette.success : palette.error }]}
          >
            {item.label}
          </ThemedText>
        </Row>
      ))}
    </View>
  );
});
