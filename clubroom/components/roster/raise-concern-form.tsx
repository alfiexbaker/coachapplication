import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ConcernType, ConcernSeverity } from '@/services/concern-service';
import { ConcernTypePicker, SeverityPicker } from '@/components/roster/raise-concern-pickers';

type FormProps = {
  colors: ThemeColors;
  type: ConcernType | null;
  onTypeChange: (type: ConcernType) => void;
  severity: ConcernSeverity;
  onSeverityChange: (severity: ConcernSeverity) => void;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  actionTaken: string;
  onActionTakenChange: (value: string) => void;
  isEscalationRisk: boolean;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
};

export const RaiseConcernForm = React.memo(function RaiseConcernForm({
  colors,
  type,
  onTypeChange,
  severity,
  onSeverityChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  actionTaken,
  onActionTakenChange,
  isEscalationRisk,
  canSubmit,
  submitting,
  onSubmit,
}: FormProps) {
  return (
    <>
      <Animated.View entering={FadeInDown.springify()}>
        <ConcernTypePicker colors={colors} selected={type} onSelect={onTypeChange} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <SeverityPicker colors={colors} selected={severity} onSelect={onSeverityChange} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Column gap="xs">
          <ThemedText type="defaultSemiBold">Title</ThemedText>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: colors.surfaceSecondary, color: colors.text },
            ]}
            placeholder="Brief summary of the concern..."
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={onTitleChange}
            maxLength={100}
            accessibilityLabel="Concern title"
          />
        </Column>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <Column gap="xs">
          <ThemedText type="defaultSemiBold">Description</ThemedText>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surfaceSecondary, color: colors.text },
            ]}
            placeholder="Describe the concern in detail. What happened? When? Who was involved?"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={onDescriptionChange}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Concern description"

            maxLength={500}
          />
        </Column>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Column gap="xs">
          <ThemedText type="defaultSemiBold">
            Action Taken {isEscalationRisk ? '(Required for high-risk concerns)' : '(Optional)'}
          </ThemedText>
          {isEscalationRisk && (
            <ThemedText style={[styles.helper, { color: colors.warning }]}>
              Include immediate safeguarding steps. High-risk concerns are auto-escalated.
            </ThemedText>
          )}
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surfaceSecondary, color: colors.text, minHeight: 60 },
            ]}
            placeholder="What steps have you already taken?"
            placeholderTextColor={colors.muted}
            value={actionTaken}
            onChangeText={onActionTakenChange}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            accessibilityLabel="Action taken"

            maxLength={500}
          />
        </Column>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <Button onPress={onSubmit} disabled={!canSubmit || submitting} variant="primary">
          {submitting ? 'Submitting...' : 'Record Concern'}
        </Button>
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  textInput: {
    ...Typography.body,
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  textArea: {
    ...Typography.body,
    minHeight: 100,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  helper: {
    ...Typography.caption,
  },
});
