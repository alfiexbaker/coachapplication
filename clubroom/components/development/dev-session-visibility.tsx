import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { FeedbackVisibility } from '@/hooks/use-dev-session';

const OPTIONS: { value: FeedbackVisibility; label: string; icon: string }[] = [
  { value: 'parent', label: 'Parents & Athlete', icon: 'people' },
  { value: 'athlete', label: 'Athlete Only', icon: 'person' },
  { value: 'coach_only', label: 'Coach Only', icon: 'lock-closed' },
];

export interface DevSessionVisibilityProps {
  visibility: FeedbackVisibility;
  onVisibilityChange: (v: FeedbackVisibility) => void;
  colors: ThemeColors;
}

export const DevSessionVisibility = memo(function DevSessionVisibility({
  visibility,
  onVisibilityChange,
  colors,
}: DevSessionVisibilityProps) {
  return (
    <Column gap="sm">
      <ThemedText type="subtitle" style={Typography.subheading}>
        Who Can See This Feedback?
      </ThemedText>
      <Row gap="xs">
        {OPTIONS.map((option) => (
          <Clickable
            key={option.value}
            onPress={() => onVisibilityChange(option.value)}
            style={[
              styles.option,
              {
                backgroundColor:
                  visibility === option.value ? withAlpha(colors.tint, 0.09) : colors.surface,
                borderColor: visibility === option.value ? colors.tint : colors.border,
              },
            ]}
          >
            <Ionicons
              name={option.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={visibility === option.value ? colors.tint : colors.muted}
            />
            <ThemedText
              style={[
                Typography.caption,
                { color: visibility === option.value ? colors.tint : colors.foreground },
              ]}
            >
              {option.label}
            </ThemedText>
          </Clickable>
        ))}
      </Row>
    </Column>
  );
});

const styles = StyleSheet.create({
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
});
