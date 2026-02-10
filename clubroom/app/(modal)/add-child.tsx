/**
 * Add Child Flow
 *
 * Multi-step wizard: Basic Info → Special Needs → Medical → Emergency → Consents.
 * All state/logic in useAddChild hook with pre-built step props.
 */

import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { AddChildBasicStep } from '@/components/family/add-child-basic-step';
import { AddChildMedicalStep } from '@/components/family/add-child-medical-step';
import { AddChildEmergencyStep, AddChildConsentsStep } from '@/components/family/add-child-emergency-step';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAddChild, STEPS, STEP_TITLES } from '@/hooks/use-add-child';

export default function AddChildScreen() {
  const { colors: palette } = useTheme();
  const c = useAddChild();

  const renderStep = () => {
    switch (c.currentStep) {
      case 'basic': return <AddChildBasicStep {...c.basicProps} />;
      case 'special_needs': return <AddChildMedicalStep variant="special_needs" {...c.medicalProps} />;
      case 'medical': return <AddChildMedicalStep variant="medical" {...c.medicalProps} />;
      case 'emergency': return <AddChildEmergencyStep {...c.emergencyProps} />;
      case 'consents': return <AddChildConsentsStep {...c.consentsProps} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Row style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={c.goBack} hitSlop={8}>
          <Ionicons name={c.isFirstStep ? 'close' : 'arrow-back'} size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="subtitle">Add Child</ThemedText>
        <View style={{ width: 24 }} />
      </Row>

      {/* Step Indicator */}
      <Row style={styles.stepIndicator}>
        {STEPS.map((step, index) => (
          <Row key={step} style={styles.stepDotContainer}>
            <View style={[styles.stepDot, { backgroundColor: index <= c.stepIndex ? palette.tint : palette.border }]}>
              {index < c.stepIndex && <Ionicons name="checkmark" size={12} color={palette.onPrimary} />}
            </View>
            {index < STEPS.length - 1 && (
              <View style={[styles.stepLine, { backgroundColor: index < c.stepIndex ? palette.tint : palette.border }]} />
            )}
          </Row>
        ))}
      </Row>

      {/* Step Title */}
      <View style={styles.stepHeader}>
        <ThemedText type="title" style={styles.stepTitle}>{STEP_TITLES[c.currentStep]}</ThemedText>
        <ThemedText style={[styles.stepCount, { color: palette.muted }]}>Step {c.stepIndex + 1} of {STEPS.length}</ThemedText>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {c.isLastStep ? (
          <Button onPress={c.handleSave} disabled={c.saving} style={{ flex: 1 }}>
            {c.saving ? 'Creating Profile...' : `Add ${c.firstName || 'Child'}`}
          </Button>
        ) : (
          <Button onPress={c.goNext} style={{ flex: 1 }}>Continue</Button>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  stepIndicator: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  stepDotContainer: { alignItems: 'center' },
  stepDot: { width: 24, height: 24, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 40, height: 2, marginHorizontal: Spacing.xxs },
  stepHeader: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  stepTitle: { ...Typography.title, fontSize: 24 },
  stepCount: { ...Typography.small },
  content: { padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
});
