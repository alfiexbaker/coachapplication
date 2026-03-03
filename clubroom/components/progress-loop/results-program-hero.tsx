import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import { ReadinessRing } from './readiness-ring';

export interface ResultsProgramHeroMetric {
  label: string;
  value: number;
  tone?: 'default' | 'alert' | 'success';
}

interface ResultsProgramHeroProps {
  title: string;
  subtitle: string;
  score: number;
  ringMeta: string;
  metrics: ResultsProgramHeroMetric[];
  showSwitch?: boolean;
  onSwitchChild?: () => void;
  reduceMotion?: boolean;
}

export const ResultsProgramHero = memo(function ResultsProgramHero({
  title,
  subtitle,
  score,
  ringMeta,
  metrics,
  showSwitch = false,
  onSwitchChild,
  reduceMotion = false,
}: ResultsProgramHeroProps) {
  const { colors, scheme } = useTheme();

  const gradientColors =
    scheme === 'dark'
      ? [withAlpha(colors.tint, 0.24), withAlpha(colors.background, 0.9), colors.background]
      : [withAlpha(colors.tint, 0.16), withAlpha(colors.background, 0.96), colors.background];

  return (
    <LinearGradient colors={gradientColors} style={[styles.container, { borderColor: withAlpha(colors.tint, 0.2) }]}>
      <Column gap="sm">
        <Row align="center" justify="between" gap="sm">
          <Column style={styles.headerText} gap="xxs">
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.muted }]} numberOfLines={2}>
              {subtitle}
            </ThemedText>
          </Column>

          {showSwitch && onSwitchChild ? (
            <Clickable
              onPress={onSwitchChild}
              accessibilityLabel="Switch child"
              style={[
                styles.switchButton,
                {
                  borderColor: withAlpha(colors.tint, 0.3),
                  backgroundColor: withAlpha(colors.tint, 0.08),
                },
              ]}
            >
              <Row align="center" gap="xxs">
                <Ionicons name="swap-horizontal-outline" size={14} color={colors.tint} />
                <ThemedText style={[styles.switchButtonText, { color: colors.tint }]}>Switch</ThemedText>
              </Row>
            </Clickable>
          ) : null}
        </Row>

        <Row align="center" gap="sm">
          <ReadinessRing score={score} meta={ringMeta} reduceMotion={reduceMotion} />

          <Column style={styles.metricGrid} gap="xs">
            <Row gap="xs" wrap>
              {metrics.map((metric) => {
                const metricColor =
                  metric.tone === 'alert'
                    ? colors.error
                    : metric.tone === 'success'
                      ? colors.success
                      : colors.text;

                return (
                  <View
                    key={metric.label}
                    style={[styles.metricWrap, { borderColor: withAlpha(metricColor, 0.24) }]}
                  >
                    <BlurView
                      intensity={24}
                      tint={scheme === 'dark' ? 'dark' : 'light'}
                      style={[styles.metricBlur, { backgroundColor: withAlpha(colors.surface, 0.2) }]}
                    >
                      <ThemedText style={[styles.metricValue, { color: metricColor }]}>
                        {metric.value}
                      </ThemedText>
                      <ThemedText style={[styles.metricLabel, { color: colors.muted }]}>
                        {metric.label}
                      </ThemedText>
                    </BlurView>
                  </View>
                );
              })}
            </Row>
          </Column>
        </Row>
      </Column>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  switchButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  switchButtonText: {
    ...Typography.caption,
  },
  metricGrid: {
    flex: 1,
  },
  metricWrap: {
    flexGrow: 1,
    minWidth: 86,
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  metricBlur: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  metricValue: {
    ...Typography.bodySmallSemiBold,
  },
  metricLabel: {
    ...Typography.caption,
  },
});
