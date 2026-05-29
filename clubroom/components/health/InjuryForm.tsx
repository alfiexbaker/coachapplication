/**
 * InjuryForm Component
 *
 * Multi-step form for logging a new injury: body part → severity → details.
 */

import { useState } from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { BodyPartSelector } from './BodyPartSelector';
import { SeverityPicker } from './SeverityPicker';
import { InjuryStepIndicator } from './injury-step-indicator';
import { InjuryDetailsStep } from './injury-details-step';
import { Spacing } from '@/constants/theme';
import type { BodyPart, InjurySeverity, LogInjuryInput } from '@/constants/types';
import { Row } from '@/components/primitives';

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
  const [dateError, setDateError] = useState<string | null>(null);

  const validateRecoveryDate = (injuryDate: Date, recoveryDate: Date | null) => {
    if (!recoveryDate) return null;
    return recoveryDate < injuryDate ? 'Recovery date must be after injury date' : null;
  };

  const canProceedFromBodyPart = bodyPart !== null;
  const canProceedFromSeverity = severity !== null;
  const canSubmit = Boolean(bodyPart && severity && description.trim().length > 0 && !dateError);

  const handleNext = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 'body_part' && canProceedFromBodyPart) setStep('severity');
    else if (step === 'severity' && canProceedFromSeverity) setStep('details');
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'severity') setStep('body_part');
    else if (step === 'details') setStep('severity');
  };

  const handleSubmit = () => {
    const nextDateError = validateRecoveryDate(occurredAt, expectedRecovery);
    if (nextDateError) {
      setDateError(nextDateError);
      return;
    }
    if (!canSubmit || !bodyPart || !severity) return;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          <ThemedText type="subtitle" style={styles.stepTitle}>
            Where is the injury?
          </ThemedText>
          <BodyPartSelector selectedPart={bodyPart} onSelect={setBodyPart} />
        </View>
      )}

      {step === 'severity' && (
        <ScrollView
          style={styles.stepContent}
          contentContainerStyle={styles.scrollStepContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText type="subtitle" style={styles.stepTitle}>
            How severe is it?
          </ThemedText>
          <SeverityPicker selectedSeverity={severity} onSelect={setSeverity} />
        </ScrollView>
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
          dateError={dateError}
          onDescriptionChange={setDescription}
          onOccurredAtChange={(date) => {
            setOccurredAt(date);
            setDateError(validateRecoveryDate(date, expectedRecovery));
          }}
          onExpectedRecoveryChange={(date) => {
            setExpectedRecovery(date);
            setDateError(validateRecoveryDate(occurredAt, date));
          }}
          onSharedWithCoachChange={setSharedWithCoach}
          onShowOccurredPicker={setShowOccurredPicker}
          onShowRecoveryPicker={setShowRecoveryPicker}
        />
      )}

      {/* Navigation buttons */}
      <Row style={styles.buttonRow}>
        {step !== 'body_part' ? (
          <Button variant="secondary" onPress={handleBack} style={styles.button} label="Back" />
        ) : onCancel ? (
          <Button variant="secondary" onPress={onCancel} style={styles.button} label="Cancel" />
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
            label="Next"
          />
        ) : (
          <Button
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            style={styles.button}
            label={loading ? 'Saving...' : 'Log Injury'}
          />
        )}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stepContent: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs },
  scrollStepContent: { paddingBottom: Spacing.md },
  stepTitle: { marginBottom: Spacing.xs },
  buttonRow: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  button: { flex: 1 },
});
