import React, { memo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { styles } from './report-flow-styles';

export type ReportType = 'inappropriate' | 'safety_concern' | 'fake_profile' | 'spam' | 'other';

export const REPORT_TYPES: {
  value: ReportType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'inappropriate', label: 'Inappropriate content', icon: 'alert-circle' },
  { value: 'safety_concern', label: 'Safety concern', icon: 'shield' },
  { value: 'fake_profile', label: 'Fake profile', icon: 'person-remove' },
  { value: 'spam', label: 'Spam', icon: 'megaphone' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle' },
];

// ─── ReportTypeOption ────────────────────────────────────────────────────────

interface ReportTypeOptionProps {
  type: (typeof REPORT_TYPES)[number];
  isSelected: boolean;
  onSelect: (value: ReportType) => void;
  palette: ThemeColors;
}

export const ReportTypeOption = memo(function ReportTypeOption({
  type,
  isSelected,
  onSelect,
  palette,
}: ReportTypeOptionProps) {
  return (
    <Pressable
      style={[
        styles.optionRow,
        {
          borderColor: isSelected ? palette.tint : palette.border,
          backgroundColor: isSelected ? withAlpha(palette.tint, 0.03) : palette.surface,
        },
      ]}
      onPress={() => onSelect(type.value)}
    >
      <Row align="center" gap="sm">
        <View
          style={[
            styles.optionIcon,
            {
              backgroundColor: isSelected
                ? withAlpha(palette.tint, 0.09)
                : withAlpha(palette.muted, 0.06),
            },
          ]}
        >
          <Ionicons name={type.icon} size={18} color={isSelected ? palette.tint : palette.muted} />
        </View>
        <ThemedText
          style={[
            styles.optionLabel,
            isSelected ? { color: palette.tint, fontWeight: '600' } : undefined,
          ]}
        >
          {type.label}
        </ThemedText>
        <View style={[styles.radio, { borderColor: isSelected ? palette.tint : palette.border }]}>
          {isSelected && <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />}
        </View>
      </Row>
    </Pressable>
  );
});

// ─── ReportFormContent ───────────────────────────────────────────────────────

interface ReportFormContentProps {
  context: 'profile' | 'message' | 'review';
  selectedType: ReportType | null;
  description: string;
  submitting: boolean;
  onSelectType: (value: ReportType) => void;
  onChangeDescription: (text: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  palette: ThemeColors;
  ModalStyles: Record<string, any>;
  ButtonStyles: Record<string, any>;
  InputStyles: Record<string, any>;
}

export const ReportFormContent = memo(function ReportFormContent({
  context,
  selectedType,
  description,
  submitting,
  onSelectType,
  onChangeDescription,
  onSubmit,
  onClose,
  palette,
  ModalStyles,
  ButtonStyles,
  InputStyles,
}: ReportFormContentProps) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
      {/* Header */}
      <View style={ModalStyles.header}>
        <ThemedText type="title" style={ModalStyles.headerTitle}>
          Report User
        </ThemedText>
        <Pressable onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={24} color={palette.muted} />
        </Pressable>
      </View>

      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        Why are you reporting this {context}?
      </ThemedText>

      {/* Report type radio buttons */}
      <View style={styles.optionsList}>
        {REPORT_TYPES.map((type) => (
          <ReportTypeOption
            key={type.value}
            type={type}
            isSelected={selectedType === type.value}
            onSelect={onSelectType}
            palette={palette}
          />
        ))}
      </View>

      {/* Optional description */}
      <View style={styles.descriptionSection}>
        <ThemedText style={InputStyles.label}>Additional details (optional)</ThemedText>
        <TextInput
          style={[
            InputStyles.input,
            InputStyles.multiline,
            {
              borderColor: palette.border,
              backgroundColor: palette.surface,
              color: palette.text,
            },
          ]}
          placeholder="Tell us more about what happened..."
          placeholderTextColor={palette.muted}
          value={description}
          onChangeText={onChangeDescription}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        <ThemedText style={[styles.charCount, { color: palette.muted }]}>
          {description.length}/500
        </ThemedText>
      </View>

      {/* Submit button */}
      <Pressable
        style={[
          ButtonStyles.primary,
          ButtonStyles.fullWidth,
          styles.submitButton,
          !selectedType && { opacity: 0.5 },
        ]}
        onPress={onSubmit}
        disabled={!selectedType || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={palette.surface} size="small" />
        ) : (
          <ThemedText style={ButtonStyles.primaryText}>Submit Report</ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
});

// ─── ReportSuccessView ───────────────────────────────────────────────────────

interface ReportSuccessViewProps {
  onClose: () => void;
  palette: ThemeColors;
  ButtonStyles: Record<string, any>;
}

export const ReportSuccessView = memo(function ReportSuccessView({
  onClose,
  palette,
  ButtonStyles,
}: ReportSuccessViewProps) {
  return (
    <View style={styles.successContainer}>
      <View style={[styles.successIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
        <Ionicons name="checkmark-circle" size={48} color={palette.success} />
      </View>
      <ThemedText type="title" style={styles.successTitle}>
        Report Submitted
      </ThemedText>
      <ThemedText style={[styles.successMessage, { color: palette.muted }]}>
        Thank you for helping keep Clubroom safe. Our team will review your report and take
        appropriate action.
      </ThemedText>
      <Pressable style={[ButtonStyles.primary, ButtonStyles.fullWidth]} onPress={onClose}>
        <ThemedText style={ButtonStyles.primaryText}>Done</ThemedText>
      </Pressable>
    </View>
  );
});

export { styles };
