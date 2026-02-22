import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface NextChallengePlaceholderProps {
  totalSessions: number;
}

export const NextChallengePlaceholder = memo(function NextChallengePlaceholder({
  totalSessions,
}: NextChallengePlaceholderProps) {
  const { colors } = useTheme();
  const empty = totalSessions === 0;

  return (
    <SurfaceCard
      style={[
        styles.card,
        {
          borderColor: withAlpha(colors.tint, 0.2),
          backgroundColor: withAlpha(colors.tint, 0.06),
        },
      ]}
    >
      <Column gap="xs">
        <Row align="center" gap="xxs">
          <Ionicons name="flag-outline" size={16} color={colors.tint} />
          <ThemedText style={styles.title}>Next Challenge</ThemedText>
        </Row>
        <ThemedText style={[styles.body, { color: colors.muted }]}>
          {empty
            ? 'Complete your first session to unlock challenges.'
            : 'Challenge missions arrive in Sprint 4.'}
        </ThemedText>
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    gap: Spacing.xs,
  },
  title: {
    ...Typography.subheading,
  },
  body: {
    ...Typography.bodySmall,
  },
});
