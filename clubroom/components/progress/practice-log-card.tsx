import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PracticeLogCardProps {
  todayMinutes: number;
  weeklyMinutes: number;
  onLogMinutes: (minutes: number) => void;
  disabled?: boolean;
}

const QUICK_OPTIONS = [10, 20, 30, 45] as const;

export const PracticeLogCard = function PracticeLogCard({
  todayMinutes,
  weeklyMinutes,
  onLogMinutes,
  disabled = false,
}: PracticeLogCardProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <Row align="center" justify="between">
          <Column gap="micro">
            <ThemedText style={styles.title}>Practice Log</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
              Non-session reps still count.
            </ThemedText>
          </Column>
          <Ionicons name="stopwatch-outline" size={18} color={colors.tint} />
        </Row>

        <Row gap="md">
          <Column gap="micro" style={styles.metricCell}>
            <ThemedText style={[styles.metricLabel, { color: colors.muted }]}>Today</ThemedText>
            <ThemedText style={styles.metricValue}>{todayMinutes} min</ThemedText>
          </Column>
          <Column gap="micro" style={styles.metricCell}>
            <ThemedText style={[styles.metricLabel, { color: colors.muted }]}>Last 7 days</ThemedText>
            <ThemedText style={styles.metricValue}>{weeklyMinutes} min</ThemedText>
          </Column>
        </Row>

        <Row wrap gap="xs">
          {QUICK_OPTIONS.map((minutes) => (
            <Clickable
              key={minutes}
              style={[
                styles.quickButton,
                {
                  backgroundColor: withAlpha(colors.tint, 0.1),
                  borderColor: withAlpha(colors.tint, 0.24),
                },
              ]}
              onPress={() => onLogMinutes(minutes)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Log ${minutes} minutes of practice`}
              accessibilityState={{ disabled }}
            >
              <ThemedText style={[styles.quickButtonText, { color: colors.tint }]}>
                +{minutes}m
              </ThemedText>
            </Clickable>
          ))}
        </Row>
      </Column>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
  },
  metricCell: {
    flex: 1,
  },
  metricLabel: {
    ...Typography.caption,
  },
  metricValue: {
    ...Typography.bodySemiBold,
  },
  quickButton: {
    minWidth: 66,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  quickButtonText: {
    ...Typography.bodySmallSemiBold,
  },
});
