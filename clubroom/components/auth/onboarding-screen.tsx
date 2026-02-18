/**
 * OnboardingScreen — Multi-step signup wizard.
 *
 * Renders 5 steps (account-type → basic-info → location → details → complete)
 * using the useOnboarding hook for state, validation, and registration.
 */

import { memo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { Spacer } from '@/components/primitives/spacer';
import { OnboardingProgressBar } from '@/components/auth/onboarding-progress-bar';
import { StepAccountType } from '@/components/auth/onboarding-step-account-type';
import { StepBasicInfo } from '@/components/auth/onboarding-step-basic-info';
import { StepLocation } from '@/components/auth/onboarding-step-location';
import { StepAthleteDetails } from '@/components/auth/onboarding-step-athlete';
import { StepCoachDetails } from '@/components/auth/onboarding-step-coach';
import { StepComplete } from '@/components/auth/onboarding-step-complete';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Spacing, Typography, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { OnboardingState } from '@/components/auth/onboarding-types';

interface OnboardingScreenProps {
  onComplete: () => void;
  onBackToLogin: () => void;
}

function OnboardingScreenInner({ onComplete, onBackToLogin }: OnboardingScreenProps) {
  const { colors } = useTheme();
  const {
    state,
    dispatch,
    canAdvance,
    next,
    back,
    finish,
    stepNumber,
    totalSteps,
    stepLabel,
    isSubmitting,
    isComplete,
    error,
  } = useOnboarding({ onComplete, onBackToLogin });

  const handleChangeField = useCallback(
    (field: string, value: string) => {
      dispatch({ type: 'SET_FIELD', field: field as keyof OnboardingState, value });
    },
    [dispatch],
  );

  const handleSelectSport = useCallback(
    (sport: string) => dispatch({ type: 'SET_FIELD', field: 'sport', value: sport }),
    [dispatch],
  );

  const handleSelectSkillLevel = useCallback(
    (level: OnboardingState['skillLevel']) => {
      if (level) dispatch({ type: 'SET_SKILL_LEVEL', value: level });
    },
    [dispatch],
  );

  const handleChangePosition = useCallback(
    (value: string) => dispatch({ type: 'SET_FIELD', field: 'position', value }),
    [dispatch],
  );

  const handleToggleHasChildren = useCallback(
    () => dispatch({ type: 'TOGGLE_HAS_CHILDREN' }),
    [dispatch],
  );

  const handleToggleIsOrganization = useCallback(
    () => dispatch({ type: 'TOGGLE_IS_ORGANIZATION' }),
    [dispatch],
  );

  const handleToggleSpecialization = useCallback(
    (spec: string) => dispatch({ type: 'TOGGLE_SPECIALIZATION', spec }),
    [dispatch],
  );

  const handleSelectAccountType = useCallback(
    (type: NonNullable<OnboardingState['accountType']>) =>
      dispatch({ type: 'SET_ACCOUNT_TYPE', accountType: type }),
    [dispatch],
  );

  // Button label changes based on step
  const buttonLabel = isComplete
    ? 'Get Started'
    : stepNumber === totalSteps - 1
      ? 'Create Account'
      : 'Continue';

  const handlePress = useCallback(() => {
    if (isComplete) {
      finish();
    } else {
      next();
    }
  }, [isComplete, finish, next]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        {!isComplete && (
          <View style={styles.header}>
            <Row style={styles.headerRow}>
              <Clickable
                onPress={back}
                accessibilityLabel="Go back"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </Clickable>
              <View style={styles.progressContainer}>
                <OnboardingProgressBar
                  stepNumber={stepNumber}
                  totalSteps={totalSteps}
                  stepLabel={stepLabel}
                />
              </View>
              {/* Balance the back arrow */}
              <View style={styles.headerSpacer} />
            </Row>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {state.step === 'account-type' && (
            <StepAccountType
              accountType={state.accountType}
              onSelectAccountType={handleSelectAccountType}
            />
          )}

          {state.step === 'basic-info' && (
            <StepBasicInfo
              firstName={state.firstName}
              lastName={state.lastName}
              email={state.email}
              phone={state.phone}
              password={state.password}
              confirmPassword={state.confirmPassword}
              dateOfBirth={state.dateOfBirth}
              showDateOfBirth={state.accountType === 'ATHLETE'}
              onChangeField={handleChangeField}
            />
          )}

          {state.step === 'location' && (
            <StepLocation
              addressLine={state.addressLine}
              city={state.city}
              postcode={state.postcode}
              country={state.country}
              accountType={state.accountType}
              onChangeField={handleChangeField}
            />
          )}

          {state.step === 'athlete-details' && (
            <StepAthleteDetails
              sport={state.sport}
              skillLevel={state.skillLevel}
              position={state.position}
              hasChildren={state.hasChildren}
              onSelectSport={handleSelectSport}
              onSelectSkillLevel={handleSelectSkillLevel}
              onChangePosition={handleChangePosition}
              onToggleHasChildren={handleToggleHasChildren}
            />
          )}

          {state.step === 'coach-details' && (
            <StepCoachDetails
              isOrganization={state.isOrganization}
              organizationName={state.organizationName}
              yearsExperience={state.yearsExperience}
              hourlyRate={state.hourlyRate}
              specializations={state.specializations}
              bio={state.bio}
              onToggleIsOrganization={handleToggleIsOrganization}
              onToggleSpecialization={handleToggleSpecialization}
              onChangeField={handleChangeField}
            />
          )}

          {state.step === 'complete' && <StepComplete accountType={state.accountType} />}

          {error ? (
            <ThemedText style={[styles.errorText, { color: colors.error }]}>{error}</ThemedText>
          ) : null}

          <Spacer size={Spacing.xl} />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            onPress={handlePress}
            disabled={!canAdvance || isSubmitting}
            accessibilityLabel={buttonLabel}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              buttonLabel
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default memo(OnboardingScreenInner);

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  headerRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressContainer: {
    flex: 1,
  },
  headerSpacer: {
    width: 24,
  },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    flexGrow: 1,
  },
  errorText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  footer: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
