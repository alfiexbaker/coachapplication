import { View, StyleSheet, TextInput, Platform } from 'react-native';
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
  const { colors: palette } = useTheme();

  return (
    <View style={styles.stepContent}>
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

      {showOccurredPicker && (
        <DateTimePicker
          value={occurredAt}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            onShowOccurredPicker(Platform.OS === 'ios');
            if (date) onOccurredAtChange(date);
          }}
          maximumDate={new Date()}
        />
      )}
      {showRecoveryPicker && expectedRecovery && (
        <DateTimePicker
          value={expectedRecovery}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            onShowRecoveryPicker(Platform.OS === 'ios');
            if (date) onExpectedRecoveryChange(date);
          }}
          minimumDate={occurredAt}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
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
});
