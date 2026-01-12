/**
 * InjuryForm Component
 *
 * Complete form for logging a new injury including body part selection,
 * severity picker, date pickers, and description input.
 */

import { useState } from 'react';
import { View, StyleSheet, TextInput, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { BodyPartSelector } from './BodyPartSelector';
import { SeverityPicker } from './SeverityPicker';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { BodyPart, InjurySeverity, LogInjuryInput } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';

interface InjuryFormProps {
  onSubmit: (data: LogInjuryInput) => void;
  onCancel?: () => void;
  loading?: boolean;
}

type FormStep = 'body_part' | 'severity' | 'details';

export function InjuryForm({ onSubmit, onCancel, loading = false }: InjuryFormProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Form state
  const [step, setStep] = useState<FormStep>('body_part');
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(null);
  const [severity, setSeverity] = useState<InjurySeverity | null>(null);
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [expectedRecovery, setExpectedRecovery] = useState<Date | null>(null);
  const [sharedWithCoach, setSharedWithCoach] = useState(true);

  // Date picker state
  const [showOccurredPicker, setShowOccurredPicker] = useState(false);
  const [showRecoveryPicker, setShowRecoveryPicker] = useState(false);

  const canProceedFromBodyPart = bodyPart !== null;
  const canProceedFromSeverity = severity !== null;
  const canSubmit = bodyPart && severity && description.trim().length > 0;

  const handleNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 'body_part' && canProceedFromBodyPart) {
      setStep('severity');
    } else if (step === 'severity' && canProceedFromSeverity) {
      setStep('details');
    }
  };

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'severity') {
      setStep('body_part');
    } else if (step === 'details') {
      setStep('severity');
    }
  };

  const handleSubmit = () => {
    if (!canSubmit || !bodyPart || !severity) return;

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const data: LogInjuryInput = {
      bodyPart,
      severity,
      description: description.trim(),
      occurredAt: occurredAt.toISOString(),
      expectedRecovery: expectedRecovery?.toISOString(),
      sharedWithCoach,
    };

    onSubmit(data);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {(['body_part', 'severity', 'details'] as FormStep[]).map((s, index) => {
        const isActive = s === step;
        const isCompleted =
          (s === 'body_part' && (step === 'severity' || step === 'details')) ||
          (s === 'severity' && step === 'details');

        return (
          <View key={s} style={styles.stepContainer}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: isActive
                    ? palette.tint
                    : isCompleted
                      ? palette.success
                      : palette.border,
                },
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              ) : (
                <ThemedText
                  style={[
                    styles.stepNumber,
                    { color: isActive ? '#FFFFFF' : palette.muted },
                  ]}
                >
                  {index + 1}
                </ThemedText>
              )}
            </View>
            {index < 2 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: isCompleted ? palette.success : palette.border },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );

  const renderBodyPartStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Where is the injury?
      </ThemedText>
      <BodyPartSelector selectedPart={bodyPart} onSelect={setBodyPart} />
    </View>
  );

  const renderSeverityStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        How severe is it?
      </ThemedText>
      <SeverityPicker selectedSeverity={severity} onSelect={setSeverity} />
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Injury Details
      </ThemedText>

      {/* Summary of selected options */}
      <View style={[styles.summary, { backgroundColor: palette.surface }]}>
        <View style={styles.summaryRow}>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Body Part
          </ThemedText>
          <ThemedText style={styles.summaryValue}>
            {bodyPart ? injuryService.getBodyPartLabel(bodyPart) : '-'}
          </ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Severity
          </ThemedText>
          <ThemedText
            style={[
              styles.summaryValue,
              severity && { color: injuryService.getSeverityInfo(severity).color },
            ]}
          >
            {severity ? injuryService.getSeverityInfo(severity).label : '-'}
          </ThemedText>
        </View>
      </View>

      {/* Description input */}
      <View style={styles.inputSection}>
        <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
          Description *
        </ThemedText>
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
          onChangeText={setDescription}
          placeholder="Describe how the injury occurred and current symptoms..."
          placeholderTextColor={palette.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Date pickers */}
      <View style={styles.dateSection}>
        <View style={styles.dateRow}>
          <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
            When did it occur?
          </ThemedText>
          <Clickable onPress={() => setShowOccurredPicker(true)}>
            <View style={[styles.dateButton, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Ionicons name="calendar-outline" size={18} color={palette.muted} />
              <ThemedText style={styles.dateButtonText}>
                {occurredAt.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </ThemedText>
            </View>
          </Clickable>
        </View>

        <View style={styles.dateRow}>
          <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
            Expected recovery (optional)
          </ThemedText>
          <Clickable
            onPress={() => {
              if (!expectedRecovery) {
                const defaultRecovery = new Date();
                defaultRecovery.setDate(defaultRecovery.getDate() + 14);
                setExpectedRecovery(defaultRecovery);
              }
              setShowRecoveryPicker(true);
            }}
          >
            <View style={[styles.dateButton, { backgroundColor: palette.surface, borderColor: palette.border }]}>
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
                  onPress={() => {
                    setExpectedRecovery(null);
                    setShowRecoveryPicker(false);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color={palette.muted} />
                </Clickable>
              )}
            </View>
          </Clickable>
        </View>
      </View>

      {/* Share with coach toggle */}
      <SurfaceCard style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="share-social-outline" size={24} color={palette.text} />
            <View style={styles.toggleText}>
              <ThemedText style={styles.toggleLabel}>Share with coach</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>
                Your coach will be able to see this injury
              </ThemedText>
            </View>
          </View>
          <Switch
            value={sharedWithCoach}
            onValueChange={setSharedWithCoach}
            trackColor={{ false: palette.border, true: `${palette.tint}50` }}
            thumbColor={sharedWithCoach ? palette.tint : palette.surface}
          />
        </View>
      </SurfaceCard>

      {/* Date pickers - shown conditionally */}
      {showOccurredPicker && (
        <DateTimePicker
          value={occurredAt}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowOccurredPicker(Platform.OS === 'ios');
            if (date) setOccurredAt(date);
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
            setShowRecoveryPicker(Platform.OS === 'ios');
            if (date) setExpectedRecovery(date);
          }}
          minimumDate={new Date()}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderStepIndicator()}

      {step === 'body_part' && renderBodyPartStep()}
      {step === 'severity' && renderSeverityStep()}
      {step === 'details' && renderDetailsStep()}

      {/* Navigation buttons */}
      <View style={styles.buttonRow}>
        {step !== 'body_part' ? (
          <Button variant="secondary" onPress={handleBack} style={styles.button}>
            Back
          </Button>
        ) : onCancel ? (
          <Button variant="secondary" onPress={onCancel} style={styles.button}>
            Cancel
          </Button>
        ) : (
          <View style={styles.button} />
        )}

        {step !== 'details' ? (
          <Button
            onPress={handleNext}
            disabled={
              (step === 'body_part' && !canProceedFromBodyPart) ||
              (step === 'severity' && !canProceedFromSeverity)
            }
            style={styles.button}
          >
            Next
          </Button>
        ) : (
          <Button
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            style={styles.button}
          >
            {loading ? 'Saving...' : 'Log Injury'}
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepTitle: {
    marginBottom: Spacing.md,
  },
  summary: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: scaleFont(14),
  },
  summaryValue: {
    fontSize: scaleFont(14),
    fontWeight: '600',
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
    flexDirection: 'row',
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
  toggleCard: {
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  toggleDescription: {
    fontSize: scaleFont(13),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  button: {
    flex: 1,
  },
});
