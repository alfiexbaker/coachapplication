/**
 * ReportFlow — Modal for reporting a user.
 *
 * Presents a list of report types (radio buttons), an optional description
 * text input, and a submit button. Shows a success confirmation after submit.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { ModalStyles, ButtonStyles, InputStyles } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { reportService } from '@/services/report-service';
import { useAuth } from '@/hooks/use-auth';

type ReportType =
  | 'inappropriate'
  | 'safety_concern'
  | 'fake_profile'
  | 'spam'
  | 'other';

interface ReportFlowProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  context: 'profile' | 'message' | 'review';
}

const REPORT_TYPES: { value: ReportType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'inappropriate', label: 'Inappropriate content', icon: 'alert-circle' },
  { value: 'safety_concern', label: 'Safety concern', icon: 'shield' },
  { value: 'fake_profile', label: 'Fake profile', icon: 'person-remove' },
  { value: 'spam', label: 'Spam', icon: 'megaphone' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle' },
];

export function ReportFlow({
  visible,
  onClose,
  reportedUserId,
  context,
}: ReportFlowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType || !currentUser) return;

    setSubmitting(true);
    try {
      await reportService.submitReport({
        reportedUserId,
        reportedByUserId: currentUser.id,
        type: selectedType,
        description: description.trim() || undefined,
        context,
      });
      setSubmitted(true);
    } catch {
      // Silently handle — in production this would show an error toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setDescription('');
    setSubmitting(false);
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={ModalStyles.overlay}>
        <View style={[ModalStyles.container, { backgroundColor: palette.surface }]}>
          {/* Handle */}
          <View style={ModalStyles.handle} />

          {submitted ? (
            /* Success state */
            <View style={styles.successContainer}>
              <View
                style={[
                  styles.successIcon,
                  { backgroundColor: `${palette.success}15` },
                ]}
              >
                <Ionicons name="checkmark-circle" size={48} color={palette.success} />
              </View>
              <ThemedText type="title" style={styles.successTitle}>
                Report Submitted
              </ThemedText>
              <ThemedText style={[styles.successMessage, { color: palette.muted }]}>
                Thank you for helping keep Clubroom safe. Our team will review
                your report and take appropriate action.
              </ThemedText>
              <Pressable
                style={[ButtonStyles.primary, ButtonStyles.fullWidth]}
                onPress={handleClose}
              >
                <ThemedText style={ButtonStyles.primaryText}>Done</ThemedText>
              </Pressable>
            </View>
          ) : (
            /* Report form */
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Header */}
              <View style={ModalStyles.header}>
                <ThemedText type="title" style={ModalStyles.headerTitle}>
                  Report User
                </ThemedText>
                <Pressable onPress={handleClose} hitSlop={8}>
                  <Ionicons name="close" size={24} color={palette.muted} />
                </Pressable>
              </View>

              <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
                Why are you reporting this {context}?
              </ThemedText>

              {/* Report type radio buttons */}
              <View style={styles.optionsList}>
                {REPORT_TYPES.map((type) => {
                  const isSelected = selectedType === type.value;
                  return (
                    <Pressable
                      key={type.value}
                      style={[
                        styles.optionRow,
                        {
                          borderColor: isSelected ? palette.tint : palette.border,
                          backgroundColor: isSelected
                            ? `${palette.tint}08`
                            : palette.surface,
                        },
                      ]}
                      onPress={() => setSelectedType(type.value)}
                    >
                      <View
                        style={[
                          styles.optionIcon,
                          {
                            backgroundColor: isSelected
                              ? `${palette.tint}15`
                              : `${palette.muted}10`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={type.icon}
                          size={18}
                          color={isSelected ? palette.tint : palette.muted}
                        />
                      </View>
                      <ThemedText
                        style={[
                          styles.optionLabel,
                          isSelected && { color: palette.tint, fontWeight: '600' },
                        ]}
                      >
                        {type.label}
                      </ThemedText>
                      <View
                        style={[
                          styles.radio,
                          {
                            borderColor: isSelected ? palette.tint : palette.border,
                          },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.radioInner,
                              { backgroundColor: palette.tint },
                            ]}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Optional description */}
              <View style={styles.descriptionSection}>
                <ThemedText style={[InputStyles.label]}>
                  Additional details (optional)
                </ThemedText>
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
                  onChangeText={setDescription}
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
                onPress={handleSubmit}
                disabled={!selectedType || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <ThemedText style={ButtonStyles.primaryText}>
                    Submit Report
                  </ThemedText>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  optionsList: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1.5,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  descriptionSection: {
    gap: 6,
    marginBottom: Spacing.md,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  submitButton: {
    marginTop: Spacing.xs,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  successTitle: {
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
