import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Platform, ScrollView, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BodyPart, InjurySeverity } from '@/constants/types';
import { scaleFont } from '@/utils/scale';

import { InjurySummaryCard, ShareWithCoachToggle } from './injury-details-sections';
import { Row } from '@/components/primitives';

interface InjuryDetailsStepProps {
  bodyPart: BodyPart | null;
  severity: InjurySeverity | null;
  description: string;
  occurredAt: Date;
  expectedRecovery: Date | null;
  sharedWithCoach: boolean;
  showOccurredPicker: boolean;
  showRecoveryPicker: boolean;
  dateError: string | null;
  onDescriptionChange: (value: string) => void;
  onOccurredAtChange: (date: Date) => void;
  onExpectedRecoveryChange: (date: Date | null) => void;
  onSharedWithCoachChange: (value: boolean) => void;
  onShowOccurredPicker: (value: boolean) => void;
  onShowRecoveryPicker: (value: boolean) => void;
}

export function InjuryDetailsStep({
  bodyPart,
  severity,
  description,
  occurredAt,
  expectedRecovery,
  sharedWithCoach,
  showOccurredPicker,
  showRecoveryPicker,
  dateError,
  onDescriptionChange,
  onOccurredAtChange,
  onExpectedRecoveryChange,
  onSharedWithCoachChange,
  onShowOccurredPicker,
  onShowRecoveryPicker,
}: InjuryDetailsStepProps) {
  const { colors: palette, isDark } = useTheme();
  const defaultRecoveryDate = useMemo(() => {
    const next = new Date(occurredAt);
    next.setDate(next.getDate() + 14);
    return next;
  }, [occurredAt]);
  const [draftOccurredAt, setDraftOccurredAt] = useState(occurredAt);
  const [draftExpectedRecovery, setDraftExpectedRecovery] = useState(expectedRecovery ?? defaultRecoveryDate);

  useEffect(() => {
    if (!showOccurredPicker) return;
    setDraftOccurredAt(occurredAt);
  }, [showOccurredPicker, occurredAt]);

  useEffect(() => {
    if (!showRecoveryPicker) return;
    setDraftExpectedRecovery(expectedRecovery ?? defaultRecoveryDate);
  }, [showRecoveryPicker, expectedRecovery, defaultRecoveryDate]);

  const closeOccurredPicker = () => onShowOccurredPicker(false);
  const closeRecoveryPicker = () => onShowRecoveryPicker(false);

  return (
    <View style={styles.stepContent}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Injury Details
        </ThemedText>

        <InjurySummaryCard bodyPart={bodyPart} severity={severity} />

        <View style={styles.inputSection}>
          <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>Description *</ThemedText>
          <TextInput
            style={[
              styles.textInput,
              styles.textArea,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={description}
            onChangeText={onDescriptionChange}
            placeholder="Describe how the injury occurred and current symptoms..."
            placeholderTextColor={palette.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        <View style={styles.dateSection}>
          <View style={styles.dateRow}>
            <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
              When did it occur?
            </ThemedText>
            <Clickable onPress={() => onShowOccurredPicker(true)}>
              <Row
                style={[
                  styles.dateButton,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Ionicons name="calendar-outline" size={18} color={palette.muted} />
                <ThemedText style={styles.dateButtonText}>
                  {occurredAt.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </ThemedText>
              </Row>
            </Clickable>
          </View>

          <View style={styles.dateRow}>
            <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
              Expected recovery (optional)
            </ThemedText>
            <Clickable
              onPress={() => {
                if (!expectedRecovery) {
                  const defaultRecovery = new Date(occurredAt);
                  defaultRecovery.setDate(defaultRecovery.getDate() + 14);
                  onExpectedRecoveryChange(defaultRecovery);
                }
                onShowRecoveryPicker(true);
              }}
            >
              <Row
                style={[
                  styles.dateButton,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Ionicons name="calendar-outline" size={18} color={palette.muted} />
                <ThemedText style={styles.dateButtonText}>
                  {expectedRecovery
                    ? expectedRecovery.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Set date'}
                </ThemedText>
                {expectedRecovery && (
                  <Clickable
                    accessibilityLabel="Clear recovery date"
                    onPress={() => {
                      onExpectedRecoveryChange(null);
                      onShowRecoveryPicker(false);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={18} color={palette.muted} />
                  </Clickable>
                )}
              </Row>
            </Clickable>
          </View>
        </View>

        {dateError ? (
          <ThemedText style={[Typography.caption, { color: palette.error }]}>
            {dateError}
          </ThemedText>
        ) : null}

        <ShareWithCoachToggle sharedWithCoach={sharedWithCoach} onToggle={onSharedWithCoachChange} />
      </ScrollView>

      {showOccurredPicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" onRequestClose={closeOccurredPicker}>
            <View style={styles.modalOverlay}>
              <Pressable style={styles.modalBackdrop} onPress={closeOccurredPicker} />
              <View style={[styles.modalSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Row style={styles.modalHeader}>
                  <Clickable onPress={closeOccurredPicker}>
                    <ThemedText style={[styles.modalAction, { color: palette.muted }]}>Cancel</ThemedText>
                  </Clickable>
                  <ThemedText style={styles.modalTitle}>Select Date</ThemedText>
                  <Clickable
                    onPress={() => {
                      onOccurredAtChange(draftOccurredAt);
                      closeOccurredPicker();
                    }}
                  >
                    <ThemedText style={[styles.modalAction, { color: palette.tint }]}>Done</ThemedText>
                  </Clickable>
                </Row>
                <DateTimePicker
                  value={draftOccurredAt}
                  mode="date"
                  display="spinner"
                  textColor={palette.text}
                  themeVariant={isDark ? 'dark' : 'light'}
                  onChange={(_, date) => {
                    if (date) setDraftOccurredAt(date);
                  }}
                  maximumDate={new Date()}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={occurredAt}
            mode="date"
            display="default"
            onChange={(_, date) => {
              onShowOccurredPicker(false);
              if (date) onOccurredAtChange(date);
            }}
            maximumDate={new Date()}
          />
        )
      )}
      {showRecoveryPicker && expectedRecovery && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" onRequestClose={closeRecoveryPicker}>
            <View style={styles.modalOverlay}>
              <Pressable style={styles.modalBackdrop} onPress={closeRecoveryPicker} />
              <View style={[styles.modalSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Row style={styles.modalHeader}>
                  <Clickable onPress={closeRecoveryPicker}>
                    <ThemedText style={[styles.modalAction, { color: palette.muted }]}>Cancel</ThemedText>
                  </Clickable>
                  <ThemedText style={styles.modalTitle}>Expected Recovery</ThemedText>
                  <Clickable
                    onPress={() => {
                      onExpectedRecoveryChange(draftExpectedRecovery);
                      closeRecoveryPicker();
                    }}
                  >
                    <ThemedText style={[styles.modalAction, { color: palette.tint }]}>Done</ThemedText>
                  </Clickable>
                </Row>
                <DateTimePicker
                  value={draftExpectedRecovery}
                  mode="date"
                  display="spinner"
                  textColor={palette.text}
                  themeVariant={isDark ? 'dark' : 'light'}
                  onChange={(_, date) => {
                    if (date) setDraftExpectedRecovery(date);
                  }}
                  minimumDate={occurredAt}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={expectedRecovery}
            mode="date"
            display="default"
            onChange={(_, date) => {
              onShowRecoveryPicker(false);
              if (date) onExpectedRecoveryChange(date);
            }}
            minimumDate={occurredAt}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  stepTitle: {
    marginBottom: Spacing.md,
  },
  inputSection: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: scaleFont(15),
  },
  textArea: {
    minHeight: 100,
  },
  dateSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dateRow: {
    gap: Spacing.xs,
  },
  dateButton: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  dateButtonText: {
    flex: 1,
    fontSize: scaleFont(15),
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    borderTopWidth: 1,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  modalAction: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
});
