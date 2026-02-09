/**
 * Onboarding Screen — Multi-step wizard for user registration.
 * Steps: Account type -> Basic info -> Location -> Role details -> Complete
 */
import { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { OnboardingState } from './onboarding-types';
import { useOnboarding } from './use-onboarding';
import { OnboardingProgressBar } from './onboarding-progress-bar';
import { StepAccountType } from './onboarding-step-account-type';
import { StepBasicInfo } from './onboarding-step-basic-info';
import { StepLocation } from './onboarding-step-location';
import { StepAthleteDetails } from './onboarding-step-athlete';
import { StepCoachDetails } from './onboarding-step-coach';
import { StepComplete } from './onboarding-step-complete';

interface OnboardingScreenProps {
  onComplete: () => void;
  onBackToLogin: () => void;
}

export default function OnboardingScreen({ onComplete, onBackToLogin }: OnboardingScreenProps) {
  const { colors: palette } = useTheme();
  const {
    state,
    fadeOpacity,
    dispatch,
    handleNext,
    handleBack,
    getStepNumber,
    getTotalSteps,
  } = useOnboarding(onComplete, onBackToLogin);

  const animatedFade = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      dispatch({ type: 'SET_FIELD', field: field as keyof OnboardingState, value });
    },
    [dispatch],
  );

  const renderCurrentStep = () => {
    switch (state.step) {
      case 'account-type':
        return (
          <StepAccountType
            accountType={state.accountType}
            onSelectAccountType={(type) => dispatch({ type: 'SET_ACCOUNT_TYPE', accountType: type })}
          />
        );
      case 'basic-info':
        return (
          <StepBasicInfo
            firstName={state.firstName}
            lastName={state.lastName}
            email={state.email}
            phone={state.phone}
            password={state.password}
            confirmPassword={state.confirmPassword}
            dateOfBirth={state.dateOfBirth}
            showDateOfBirth={state.accountType === 'ATHLETE'}
            onChangeField={handleFieldChange}
          />
        );
      case 'location':
        return (
          <StepLocation
            city={state.city}
            postcode={state.postcode}
            country={state.country}
            accountType={state.accountType}
            onChangeField={handleFieldChange}
          />
        );
      case 'athlete-details':
        return (
          <StepAthleteDetails
            sport={state.sport}
            skillLevel={state.skillLevel}
            position={state.position}
            hasChildren={state.hasChildren}
            onSelectSport={(s) => dispatch({ type: 'SET_FIELD', field: 'sport', value: s })}
            onSelectSkillLevel={(l) => dispatch({ type: 'SET_SKILL_LEVEL', value: l })}
            onChangePosition={(v) => dispatch({ type: 'SET_FIELD', field: 'position', value: v })}
            onToggleHasChildren={() => dispatch({ type: 'TOGGLE_HAS_CHILDREN' })}
          />
        );
      case 'coach-details':
        return (
          <StepCoachDetails
            isOrganization={state.isOrganization}
            organizationName={state.organizationName}
            yearsExperience={state.yearsExperience}
            hourlyRate={state.hourlyRate}
            specializations={state.specializations}
            bio={state.bio}
            onToggleIsOrganization={() => dispatch({ type: 'TOGGLE_IS_ORGANIZATION' })}
            onToggleSpecialization={(s) => dispatch({ type: 'TOGGLE_SPECIALIZATION', spec: s })}
            onChangeField={handleFieldChange}
          />
        );
      case 'complete':
        return <StepComplete accountType={state.accountType} />;
      default:
        return null;
    }
  };

  const isLastStep = state.step === 'coach-details' || state.step === 'athlete-details';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        {/* Header */}
        {state.step !== 'complete' && (
          <View style={styles.header}>
            <Clickable
              onPress={handleBack}
              style={styles.backButton}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={palette.foreground} />
            </Clickable>
            <OnboardingProgressBar
              stepNumber={getStepNumber()}
              totalSteps={getTotalSteps()}
            />
          </View>
        )}

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={animatedFade}>
            {renderCurrentStep()}
          </Animated.View>

          {/* Error */}
          {state.error && (
            <View style={[styles.errorCard, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
              <Ionicons name="alert-circle" size={20} color={palette.error} />
              <ThemedText style={[styles.errorText, { color: palette.error }]}>{state.error}</ThemedText>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        {state.step !== 'complete' && (
          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <Clickable
              onPress={handleNext}
              disabled={state.isSubmitting}
              accessibilityLabel={isLastStep ? 'Create Account' : 'Continue'}
              style={({ pressed }) => [
                styles.nextButton,
                {
                  backgroundColor: pressed ? palette.tintPressed : palette.tint,
                  opacity: state.isSubmitting ? 0.7 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.nextButtonText, { color: palette.onPrimary }]}>
                {isLastStep ? 'Create Account' : 'Continue'}
              </ThemedText>
              <Ionicons name="arrow-forward" size={20} color={palette.onPrimary} />
            </Clickable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.small,
    flex: 1,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    minHeight: 44,
  },
  nextButtonText: {
    ...Typography.bodySemiBold,
  },
});
