import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PastSessionsPlaceholderProps {
  sessions: number;
  onViewHistory?: () => void;
}

export const PastSessionsPlaceholder = memo(function PastSessionsPlaceholder({
  sessions,
  onViewHistory,
}: PastSessionsPlaceholderProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="xs">
        <Row align="center" justify="between">
          <Row align="center" gap="xxs">
            <Ionicons name="albums-outline" size={16} color={colors.tint} />
            <ThemedText style={styles.title}>Past Sessions</ThemedText>
          </Row>
          <ThemedText style={[styles.count, { color: colors.muted }]}>
            {sessions} total
          </ThemedText>
        </Row>

        <ThemedText style={[styles.body, { color: colors.muted }]}>
          Session timeline and media strip land in Sprint 2.
        </ThemedText>

        {onViewHistory ? (
          <Clickable
            style={[
              styles.button,
              {
                borderColor: withAlpha(colors.tint, 0.35),
                backgroundColor: withAlpha(colors.tint, 0.08),
              },
            ]}
            onPress={onViewHistory}
            accessibilityLabel="Open feedback history"
            accessibilityRole="button"
          >
            <Row align="center" justify="center" gap="xxs">
              <ThemedText style={[styles.buttonText, { color: colors.tint }]}>
                Open feedback history
              </ThemedText>
              <Ionicons name="arrow-forward" size={14} color={colors.tint} />
            </Row>
          </Clickable>
        ) : null}
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
  },
  count: {
    ...Typography.caption,
  },
  body: {
    ...Typography.bodySmall,
  },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  buttonText: {
    ...Typography.bodySmallSemiBold,
  },
});
