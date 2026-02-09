import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.question}>{item.question}</ThemedText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </View>
      {expanded && (
        <ThemedText style={[styles.answer, { color: colors.muted }]}>{item.answer}</ThemedText>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  question: { flex: 1, ...Typography.body },
  answer: { ...Typography.bodySmall },
});
