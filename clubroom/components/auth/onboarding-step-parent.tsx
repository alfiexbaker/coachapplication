/**
 * StepParentDetails — Parent-specific details step of onboarding.
 *
 * Lightweight step: asks how many children, then previews the
 * post-signup setup flow (add children, emergency contacts, consents).
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const CHILDREN_OPTIONS = [1, 2, 3, 4] as const;

const NEXT_STEPS = [
  { icon: 'person-add' as const, label: 'Add your children with name and date of birth' },
  { icon: 'medkit' as const, label: 'Set up emergency contacts and medical info' },
  { icon: 'shield-checkmark' as const, label: 'Configure photo and video consent' },
  { icon: 'search' as const, label: 'Find verified coaches near you' },
];

interface StepParentDetailsProps {
  childrenCount: number;
  onChangeChildrenCount: (count: number) => void;
}

function StepParentDetailsInner({
  childrenCount,
  onChangeChildrenCount,
}: StepParentDetailsProps) {
  const { colors: palette } = useTheme();

  const handleSelect = useCallback(
    (count: number) => onChangeChildrenCount(count),
    [onChangeChildrenCount],
  );

  return (
    <View style={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Tell us about your family
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        {"We'll help you set up profiles for each child after signup."}
      </ThemedText>

      {/* Children count selector */}
      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>How many children will use Clubroom?</ThemedText>
        <Row style={styles.countRow}>
          {CHILDREN_OPTIONS.map((count) => {
            const isSelected = childrenCount === count;
            return (
              <Clickable
                key={count}
                onPress={() => handleSelect(count)}
                accessibilityLabel={`${count} ${count === 1 ? 'child' : 'children'}`}
                accessibilityRole="button"
                style={[
                  styles.countCard,
                  {
                    backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.card,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    styles.countNumber,
                    { color: isSelected ? palette.tint : palette.foreground },
                  ]}
                >
                  {count === 4 ? '4+' : String(count)}
                </ThemedText>
                <ThemedText style={[styles.countLabel, { color: palette.muted }]}>
                  {count === 1 ? 'child' : 'children'}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </View>

      {/* What happens next */}
      <View
        style={[
          styles.nextStepsCard,
          {
            backgroundColor: withAlpha(palette.tint, 0.04),
            borderColor: withAlpha(palette.tint, 0.14),
          },
        ]}
      >
        <Row style={styles.nextStepsHeader}>
          <Ionicons name="sparkles" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={styles.nextStepsTitle}>What happens next</ThemedText>
        </Row>
        <View style={styles.nextStepsList}>
          {NEXT_STEPS.map((step) => (
            <Row key={step.label} style={styles.nextStepItem}>
              <View
                style={[
                  styles.nextStepIcon,
                  { backgroundColor: withAlpha(palette.tint, 0.1) },
                ]}
              >
                <Ionicons name={step.icon} size={14} color={palette.tint} />
              </View>
              <ThemedText style={[styles.nextStepText, { color: palette.foreground }]}>
                {step.label}
              </ThemedText>
            </Row>
          ))}
        </View>
      </View>
    </View>
  );
}

export const StepParentDetails = memo(StepParentDetailsInner);

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
  },
  title: {
    ...Typography.title,
  },
  subtitle: {
    ...Typography.body,
    marginTop: -Spacing.xs,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
  countRow: {
    gap: Spacing.xs,
  },
  countCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.xxs,
    minHeight: 44,
    justifyContent: 'center',
  },
  countNumber: {
    ...Typography.heading,
  },
  countLabel: {
    ...Typography.caption,
  },
  nextStepsCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  nextStepsHeader: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  nextStepsTitle: {
    ...Typography.bodySemiBold,
  },
  nextStepsList: {
    gap: Spacing.sm,
  },
  nextStepItem: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nextStepIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepText: {
    ...Typography.small,
    flex: 1,
  },
});
