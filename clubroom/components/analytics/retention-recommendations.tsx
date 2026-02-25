import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Column } from '@/components/primitives/column';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

const TIPS = [
  {
    icon: 'chatbubble',
    color: 'success',
    title: 'Follow up with clients after sessions',
    sub: 'A quick message shows you care about their progress',
  },
  {
    icon: 'gift',
    color: 'tint',
    title: 'Offer package discounts',
    sub: 'Incentivize commitment with multi-session packages',
  },
  {
    icon: 'trophy',
    color: 'warning',
    title: 'Set and track goals together',
    sub: 'Clients with clear goals are more likely to return',
  },
  {
    icon: 'calendar-outline',
    color: 'error',
    title: 'Reduce cancellation rate',
    sub: 'Send reminders and have a clear cancellation policy',
  },
] as const;

interface RetentionRecommendationsProps {
  colors: ThemeColors;
}

export const RetentionRecommendations = memo(function RetentionRecommendations({
  colors,
}: RetentionRecommendationsProps) {
  return (
    <SurfaceCard style={styles.card}>
      <Row gap="xs" align="center" style={styles.header}>
        <Ionicons name="bulb" size={20} color={colors.warning} />
        <ThemedText style={styles.title}>Tips to Improve Retention</ThemedText>
      </Row>
      <View style={styles.list}>
        {TIPS.map((tip) => (
          <Row key={tip.title} gap="sm">
            <View
              style={[
                styles.tipIcon,
                {
                  backgroundColor: withAlpha(
                    colors[tip.color as keyof ThemeColors] as string,
                    0.12,
                  ),
                },
              ]}
            >
              <Ionicons
                name={tip.icon as never}
                size={16}
                color={colors[tip.color as keyof ThemeColors] as string}
              />
            </View>
            <Column flex>
              <ThemedText style={styles.tipTitle}>{tip.title}</ThemedText>
              <ThemedText style={[styles.tipSub, { color: colors.muted }]}>{tip.sub}</ThemedText>
            </Column>
          </Row>
        ))}
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md },
  header: { marginBottom: Spacing.md },
  title: { ...Typography.subheading },
  list: { gap: Spacing.md },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: { ...Typography.bodySmallSemiBold, marginBottom: Spacing.micro },
  tipSub: { ...Typography.small },
});
