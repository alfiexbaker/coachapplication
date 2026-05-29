/**
 * Add Child Flow
 *
 * Multi-step wizard: Child Details → Support Needs → Safety Essentials.
 * All state/logic in useAddChild hook with pre-built step props.
 */

import { useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import { AddChildBasicStep } from '@/components/family/add-child-basic-step';
import { AddChildMedicalStep } from '@/components/family/add-child-medical-step';
import { AddChildEmergencyStep } from '@/components/family/add-child-emergency-step';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAddChild, STEPS, STEP_TITLES } from '@/hooks/use-add-child';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';

export default function AddChildScreen() {
  const { colors: palette } = useTheme();
  const c = useAddChild();
  const modalRef = useRef<View>(null);
  useFocusTrap(modalRef, 'Add child modal');

  const renderStep = () => {
    switch (c.currentStep) {
      case 'basic':
        return <AddChildBasicStep {...c.basicProps} />;
      case 'special_needs':
        return <AddChildMedicalStep variant="special_needs" {...c.medicalProps} />;
      case 'safety':
        return <AddChildEmergencyStep {...c.safetyProps} />;
    }
  };

  return (
    <SafeAreaView
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="none"
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Add Child"
        showBack
        backIcon={c.isFirstStep ? 'close' : 'arrow-back'}
        onBackPress={c.goBack}
        centerTitle
        containerStyle={[styles.header, { borderBottomColor: palette.border }]}
      />

      {/* Step Indicator */}
      <Row style={styles.stepIndicator}>
        {STEPS.map((step, index) => (
          <Row key={step} style={styles.stepDotContainer}>
            <View
              style={[
                styles.stepDot,
                { backgroundColor: index <= c.stepIndex ? palette.tint : palette.border },
              ]}
            >
              {index < c.stepIndex && (
                <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
              )}
            </View>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: index < c.stepIndex ? palette.tint : palette.border },
                ]}
              />
            )}
          </Row>
        ))}
      </Row>

      {/* Step Title */}
      <View style={styles.stepHeader}>
        <ThemedText type="title" style={styles.stepTitle}>
          {STEP_TITLES[c.currentStep]}
        </ThemedText>
        <ThemedText style={[styles.stepCount, { color: palette.muted }]}>
          Step {c.stepIndex + 1} of {STEPS.length}
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {c.validationMessage ? (
            <StatusBanner
              variant="error"
              message={c.validationMessage}
              onDismiss={c.clearValidationMessage}
            />
          ) : null}
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {c.isLastStep ? (
          <Button
            onPress={c.handleSave}
            disabled={c.saving}
            style={{ flex: 1 }}
            label={c.saving ? 'Creating Profile...' : `Add ${c.firstName || 'Child'}`}
          />
        ) : (
          <Button onPress={c.goNext} style={{ flex: 1 }} label="Continue" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  stepIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  stepDotContainer: { alignItems: 'center' },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { width: 40, height: 2, marginHorizontal: Spacing.xxs },
  stepHeader: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  stepTitle: { ...Typography.title, fontSize: Typography.title.fontSize },
  stepCount: { ...Typography.small },
  content: { padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
});
