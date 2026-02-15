/**
 * Onboarding Screen — Multi-step wizard for user registration.
 * Steps: Account type -> Basic info -> Location -> Role details -> Complete
 */
import { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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
import { Row } from '@/components/primitives';

interface OnboardingScreenProps {
  onComplete: () => void;
  onBackToLogin: () => void;
}

export default function OnboardingScreen({ onComplete, onBackToLogin }: OnboardingScreenProps) {
  const { colors: palette } = useTheme();
  const {
    state,
    fadeOpacity,
    stepTranslateX,
    stepScale,
    dispatch,
    handleNext,
    handleBack,
    getStepNumber,
    getTotalSteps,
  } = useOnboarding(onComplete, onBackToLogin);

  const stepContext = useMemo(() => {
    switch (state.step) {
      case 'account-type':
        return {
          label: 'Account setup',
          title: 'Choose your path',
          description: 'Pick your role so we tailor the full onboarding journey.',
          icon: 'compass-outline' as const,
        };
      case 'basic-info':
        return {
          label: 'Identity',
          title: 'Create your profile',
          description: 'Add secure sign-in details and your core account info.',
          icon: 'id-card-outline' as const,
        };
      case 'location':
        return {
          label: 'Location',
          title: 'Set your base',
          description: 'We use this to personalize coaches, athletes, and booking matches.',
          icon: 'location-outline' as const,
        };
      case 'athlete-details':
        return {
          label: 'Athlete profile',
          title: 'Tell coaches your level',
          description: 'Share sport and experience so recommendations are immediately relevant.',
          icon: 'fitness-outline' as const,
        };
      case 'coach-details':
        return {
          label: 'Coach profile',
          title: 'Present your services',
          description: 'Set expertise and positioning so families can trust and book quickly.',
          icon: 'briefcase-outline' as const,
        };
      default:
        return {
          label: 'Complete',
          title: 'You are in',
          description: 'Finalizing your account setup.',
          icon: 'checkmark-done-outline' as const,
        };
    }
  }, [state.step]);

  const animatedFade = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ translateX: stepTranslateX.value }, { scale: stepScale.value }],
  }));

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
            onSelectAccountType={(type) =>
              dispatch({ type: 'SET_ACCOUNT_TYPE', accountType: type })
            }
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
            addressLine={state.addressLine}
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        {/* Header */}
        {state.step !== 'complete' && (
          <Row style={styles.header}>
            <Clickable
              onPress={handleBack}
              style={[styles.backButton, { backgroundColor: withAlpha(palette.text, 0.04) }]}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={palette.foreground} />
            </Clickable>
            <OnboardingProgressBar
              stepNumber={getStepNumber()}
              totalSteps={getTotalSteps()}
              stepLabel={stepContext.label}
            />
          </Row>
        )}

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {state.step !== 'complete' && (
            <Row
              style={[
                styles.contextCard,
                {
                  backgroundColor: withAlpha(palette.tint, 0.05),
                  borderColor: withAlpha(palette.tint, 0.12),
                },
              ]}
            >
              <View
                style={[
                  styles.contextIcon,
                  {
                    backgroundColor: withAlpha(palette.tint, 0.1),
                  },
                ]}
              >
                <Ionicons name={stepContext.icon} size={18} color={palette.tint} />
              </View>
              <View style={styles.contextCopy}>
                <ThemedText style={styles.contextTitle}>{stepContext.title}</ThemedText>
                <ThemedText style={[styles.contextDescription, { color: palette.muted }]}>
                  {stepContext.description}
                </ThemedText>
              </View>
            </Row>
          )}

          <Animated.View style={animatedFade}>{renderCurrentStep()}</Animated.View>

          {/* Error */}
          {state.error && (
            <Row
              style={[
                styles.errorCard,
                {
                  backgroundColor: withAlpha(palette.error, 0.06),
                  borderColor: withAlpha(palette.error, 0.16),
                },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={palette.error} />
              <ThemedText style={[styles.errorText, { color: palette.error }]}>
                {state.error}
              </ThemedText>
            </Row>
          )}
        </ScrollView>

        {/* Footer */}
        {state.step !== 'complete' && (
          <View
            style={[
              styles.footer,
              {
                borderTopColor: withAlpha(palette.border, 0.8),
                backgroundColor: withAlpha(palette.background, 0.95),
              },
            ]}
          >
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
                {state.isSubmitting ? 'Setting up account...' : isLastStep ? 'Create Account' : 'Continue'}
              </ThemedText>
              <Ionicons
                name={isLastStep ? 'sparkles-outline' : 'arrow-forward'}
                size={20}
                color={palette.onPrimary}
              />
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
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
    borderRadius: Radii.lg,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  contextCard: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
  },
  contextIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  contextTitle: {
    ...Typography.bodySemiBold,
  },
  contextDescription: {
    ...Typography.small,
  },
  errorCard: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
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
