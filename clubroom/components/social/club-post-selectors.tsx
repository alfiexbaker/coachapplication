import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { POST_TYPES } from '@/hooks/use-create-club-post';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ClubPostType } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface PostTypeSelectorProps {
  postType: ClubPostType;
  onSelect: (postType: ClubPostType) => void;
}

export function PostTypeSelector({ postType, onSelect }: PostTypeSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: colors.muted }]}>Type</ThemedText>
      <Row gap="sm">
        {POST_TYPES.map((type) => {
          const selected = postType === type.key;
          return (
            <Clickable
              key={type.key}
              accessibilityLabel={`${type.label} post`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onSelect(type.key)}
              style={[
                styles.option,
                {
                  borderColor: selected ? colors.tint : colors.border,
                  backgroundColor: selected ? withAlpha(colors.tint, 0.08) : colors.background,
                },
              ]}
            >
              <ThemedText
                style={[styles.optionLabel, { color: selected ? colors.tint : colors.text }]}
              >
                {type.label}
              </ThemedText>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
}

interface PostAsSelectorProps {
  postAs: 'self' | 'club';
  onSelect: (postAs: 'self' | 'club') => void;
}

export function PostAsSelector({ postAs, onSelect }: PostAsSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: colors.muted }]}>Author</ThemedText>
      <Row gap="sm">
        {(['club', 'self'] as const).map((value) => {
          const selected = postAs === value;
          const label = value === 'club' ? 'Club' : 'You';
          return (
            <Clickable
              key={value}
              accessibilityLabel={`Post as ${label.toLowerCase()}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onSelect(value)}
              style={[
                styles.option,
                {
                  borderColor: selected ? colors.tint : colors.border,
                  backgroundColor: selected ? withAlpha(colors.tint, 0.08) : colors.background,
                },
              ]}
            >
              <ThemedText
                style={[styles.optionLabel, { color: selected ? colors.tint : colors.text }]}
              >
                {label}
              </ThemedText>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  sectionLabel: { ...Typography.caption, marginBottom: Spacing.xs },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  optionLabel: { ...Typography.bodySmallSemiBold },
});
