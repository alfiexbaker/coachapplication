/**
 * InjuryForm Component
 *
 * Multi-step form for logging a new injury: body part → severity → details.
 */

import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { BodyPartSelector } from './BodyPartSelector';
import { SeverityPicker } from './SeverityPicker';
import { InjuryStepIndicator } from './injury-step-indicator';
import { InjuryDetailsStep } from './injury-details-step';
import { Spacing } from '@/constants/theme';
import type { BodyPart, InjurySeverity, LogInjuryInput } from '@/constants/types';

interface InjuryFormProps {
  onSubmit: (data: LogInjuryInput) => void;
  onCancel?: () => void;
  loading?: boolean;
}

type FormStep = 'body_part' | 'severity' | 'details';

export function InjuryForm({ onSubmit, onCancel, loading = false }: InjuryFormProps) {
  const [step, setStep] = useState<FormStep>('body_part');
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(null);
  const [severity, setSeverity] = useState<InjurySeverity | null>(null);
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [expectedRecovery, setExpectedRecovery] = useState<Date | null>(null);
  const [sharedWithCoach, setSharedWithCoach] = useState(true);
  const [showOccurredPicker, setShowOccurredPicker] = useState(false);
  const [showRecoveryPicker, setShowRecoveryPicker] = useState(false);

  const canProceedFromBodyPart = bodyPart !== null;
  const canProceedFromSeverity = severity !== null;
  const canSubmit = bodyPart && severity && description.trim().length > 0;

  const handleNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 'body_part' && canProceedFromBodyPart) setStep('severity');
    else if (step === 'severity' && canProceedFromSeverity) setStep('details');
  };

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'severity') setStep('body_part');
    else if (step === 'details') setStep('severity');
  };

  const handleSubmit = () => {
    if (!canSubmit || !bodyPart || !severity) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit({
      bodyPart,
      severity,
      description: description.trim(),
      occurredAt: occurredAt.toISOString(),
      expectedRecovery: expectedRecovery?.toISOString(),
      sharedWithCoach,
    });
  };

  return (
    <View style={styles.container}>
      <InjuryStepIndicator currentStep={step} />

      {step === 'body_part' && (
        <View style={styles.stepContent}>
          <ThemedText type="subtitle" style={styles.stepTitle}>Where is the injury?</ThemedText>
          <BodyPartSelector selectedPart={bodyPart} onSelect={setBodyPart} />
        </View>
      )}

      {step === 'severity' && (
        <View style={styles.stepContent}>
          <ThemedText type="subtitle" style={styles.stepTitle}>How severe is it?</ThemedText>
          <SeverityPicker selectedSeverity={severity} onSelect={setSeverity} />
        </View>
      )}

      {step === 'details' && (
        <InjuryDetailsStep
          bodyPart={bodyPart}
          severity={severity}
          description={description}
          occurredAt={occurredAt}
          expectedRecovery={expectedRecovery}
          sharedWithCoach={sharedWithCoach}
          showOccurredPicker={showOccurredPicker}
          showRecoveryPicker={showRecoveryPicker}
          onDescriptionChange={setDescription}
          onOccurredAtChange={setOccurredAt}
          onExpectedRecoveryChange={setExpectedRecovery}
          onSharedWithCoachChange={setSharedWithCoach}
          onShowOccurredPicker={setShowOccurredPicker}
          onShowRecoveryPicker={setShowRecoveryPicker}
        />
      )}

      {/* Navigation buttons */}
      <View style={styles.buttonRow}>
        {step !== 'body_part' ? (
          <Button variant="secondary" onPress={handleBack} style={styles.button}>Back</Button>
        ) : onCancel ? (
          <Button variant="secondary" onPress={onCancel} style={styles.button}>Cancel</Button>
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
          <Button onPress={handleSubmit} disabled={!canSubmit || loading} style={styles.button}>
            {loading ? 'Saving...' : 'Log Injury'}
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stepContent: { flex: 1, paddingHorizontal: Spacing.lg },
  stepTitle: { marginBottom: Spacing.md },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  button: { flex: 1 },
});
