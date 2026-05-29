import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

type HeaderProps = {
  colors: ThemeColors;
  athleteName: string;
  onBack: () => void;
};

export const RaiseConcernHeader = function RaiseConcernHeader({
  colors,
  athleteName,
  onBack,
}: HeaderProps) {
  return (
    <Row gap="md" align="center" style={[styles.headerRow, { borderBottomColor: colors.border }]}>
      <Clickable onPress={onBack} hitSlop={8} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <Column gap="micro" style={styles.flex1}>
        <ThemedText type="title">Raise Concern</ThemedText>
        {athleteName ? (
          <ThemedText style={[styles.headerSubtitle, { color: colors.muted }]}>
            {athleteName}
          </ThemedText>
        ) : null}
      </Column>
    </Row>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  headerRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerSubtitle: {
    ...Typography.caption,
  },
});
