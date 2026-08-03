/**
 * Add Child Flow
 *
 * Three-step registration: player details → support needs → safety.
 * All state/logic in useAddChild hook with pre-built step props.
 */

import { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import { AddChildBasicStep } from '@/components/family/add-child-basic-step';
import { AddChildMedicalStep } from '@/components/family/add-child-medical-step';
import { AddChildEmergencyStep } from '@/components/family/add-child-emergency-step';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAddChild, useCanCreateChild, STEPS, STEP_TITLES } from '@/hooks/use-add-child';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
import { RouteAccessGate } from '@/components/auth/route-access-gate';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';

export default function AddChildScreen() {
  const { currentUser } = useAuth();
  const { canCreateChild, checkingCreateChildAccess } = useCanCreateChild();

  if (checkingCreateChildAccess) {
    return null;
  }

  const redirectHref =
    currentUser?.role === 'USER' &&
    !currentUser.hasChildren &&
    (currentUser.children?.length ?? 0) === 0
      ? Routes.DEVELOPMENT_MY_PROGRESS
      : Routes.ROOT;

  return (
    <RouteAccessGate allowed={canCreateChild} redirectHref={redirectHref}>
      <AddChildForm />
    </RouteAccessGate>
  );
}

function AddChildForm() {
  const { colors: palette } = useTheme();
  const c = useAddChild();
  const modalRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  useFocusTrap(modalRef, 'Add child modal');

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (Platform.OS === 'web') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [c.currentStep]);

  const renderStep = () => {
    switch (c.currentStep) {
      case 'basic':
        return <AddChildBasicStep {...c.basicProps} />;
      case 'special_needs':
        return <AddChildMedicalStep {...c.medicalProps} />;
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
        title={STEP_TITLES[c.currentStep]}
        showBack
        backIcon={c.isFirstStep ? 'close' : 'arrow-back'}
        onBackPress={c.goBack}
        right={
          <ThemedText
            style={[styles.stepCount, { color: palette.muted }]}
            accessibilityLabel={`Step ${c.stepIndex + 1} of ${STEPS.length}`}
          >
            {c.stepIndex + 1} / {STEPS.length}
          </ThemedText>
        }
        containerStyle={styles.header}
      />

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${STEP_TITLES[c.currentStep]}, step ${c.stepIndex + 1} of ${STEPS.length}`}
        accessibilityValue={{ min: 1, max: STEPS.length, now: c.stepIndex + 1 }}
        style={[styles.progressTrack, { backgroundColor: palette.border }]}
      >
        <View
          style={[
            styles.progressValue,
            {
              backgroundColor: palette.tint,
              width: `${((c.stepIndex + 1) / STEPS.length) * 100}%`,
            },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          key={c.currentStep}
          ref={scrollRef}
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

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {c.isLastStep ? (
          <Button
            onPress={c.handleSave}
            disabled={c.saving}
            style={{ flex: 1 }}
            label={c.saving ? 'Adding child…' : 'Add child'}
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
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  progressTrack: {
    height: 2,
    marginHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  progressValue: {
    height: '100%',
  },
  stepCount: {
    ...Typography.smallSemiBold,
    minWidth: 44,
    textAlign: 'right',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
});
