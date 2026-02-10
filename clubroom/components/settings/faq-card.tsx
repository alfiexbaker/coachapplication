import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { FAQItem } from '@/hooks/use-help-settings';

interface FAQCardProps {
  item: FAQItem;
  expanded: boolean;
  onToggle: () => void;
  colors: ThemeColors;
}

export const FAQCard = memo(function FAQCard({ item, expanded, onToggle, colors }: FAQCardProps) {
  return (
    <SurfaceCard style={styles.card} onPress={onToggle}>
      <Row justify="space-between" align="center" gap="sm">
        <ThemedText type="defaultSemiBold" style={styles.question}>{item.question}</ThemedText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </Row>
      {expanded && (
        <ThemedText style={[styles.answer, { color: colors.muted }]}>{item.answer}</ThemedText>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  header: { /* layout moved to Row */ },
  question: { flex: 1, ...Typography.body },
  answer: { ...Typography.bodySmall },
});
