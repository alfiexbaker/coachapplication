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
import { SurfaceCard } from '@/components/primitives/surface-card';
import { OnboardingProgressBar } from '@/components/auth/onboarding-progress-bar';
import { StepAccountType } from '@/components/auth/onboarding-step-account-type';
import { StepBasicInfo } from '@/components/auth/onboarding-step-basic-info';
import { StepLocation } from '@/components/auth/onboarding-step-location';
import { StepAthleteDetails } from '@/components/auth/onboarding-step-athlete';
import { StepCoachDetails } from '@/components/auth/onboarding-step-coach';
import { StepParentDetails } from '@/components/auth/onboarding-step-parent';
import { StepComplete } from '@/components/auth/onboarding-step-complete';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { OnboardingState } from '@/components/auth/onboarding-types';
import type { PositionRole } from '@/types/progress-types';

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
    isHydrated,
    showResumePrompt,
    savedDraftTimestamp,
    dismissResumePrompt,
    discardSavedDraft,
  } = useOnboarding({ onComplete, onBackToLogin });

  const handleChangeField = (field: string, value: string) => {
    dispatch({ type: 'SET_FIELD', field: field as keyof OnboardingState, value });
  };

  const handleSelectSport = (sport: string) => dispatch({ type: 'SET_FIELD', field: 'sport', value: sport });

  const handleSelectSkillLevel = (level: OnboardingState['skillLevel']) => {
    if (level) dispatch({ type: 'SET_SKILL_LEVEL', value: level });
  };

  const handleChangePosition = (position: PositionRole | null) =>
    dispatch({ type: 'SET_FIELD', field: 'position', value: position });

  const handleToggleHasChildren = () => dispatch({ type: 'TOGGLE_HAS_CHILDREN' });

  const handleToggleIsOrganization = () => dispatch({ type: 'TOGGLE_IS_ORGANIZATION' });

  const handleToggleSpecialization = (spec: string) => dispatch({ type: 'TOGGLE_SPECIALIZATION', spec });

  const handleSelectAccountType = (type: NonNullable<OnboardingState['accountType']>) =>
    dispatch({ type: 'SET_ACCOUNT_TYPE', accountType: type });

  const handleChangeChildrenCount = (count: number) =>
    dispatch({ type: 'SET_FIELD', field: 'childrenCount', value: count });

  // Button label changes based on step
  const buttonLabel = isComplete
    ? 'Get Started'
    : stepNumber === totalSteps - 1
      ? 'Create Account'
      : 'Continue';

  const handlePress = () => {
    if (isComplete) {
      finish();
    } else {
      next();
    }
  };

  const handleResumeDraft = () => {
    dismissResumePrompt();
  };

  const handleDiscardDraft = () => {
    void discardSavedDraft();
  };

  if (!isHydrated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.flex, styles.centered]}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Spacer size={Spacing.sm} />
          <ThemedText style={Typography.small}>Loading onboarding…</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

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
          {showResumePrompt ? (
            <SurfaceCard style={styles.resumeCard}>
              <ThemedText>
                Resume your previous onboarding draft
                {savedDraftTimestamp
                  ? ` (${new Date(savedDraftTimestamp).toLocaleDateString()})`
                  : ''}
                ?
              </ThemedText>
              <Row gap={Spacing.sm} style={styles.resumeActions}>
                <Button variant="secondary" size="small" onPress={handleDiscardDraft} label="Start Fresh" />
                <Button variant="primary" size="small" onPress={handleResumeDraft} label="Resume" />
              </Row>
            </SurfaceCard>
          ) : null}

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
              showDateOfBirth={state.accountType === 'ATHLETE' || state.accountType === 'PARENT'}
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

          {state.step === 'parent-details' && (
            <StepParentDetails
              childrenCount={state.childrenCount}
              onChangeChildrenCount={handleChangeChildrenCount}
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

export default OnboardingScreenInner;

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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  headerSpacer: {
    width: 24,
  },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    flexGrow: 1,
  },
  resumeCard: {
    marginBottom: Spacing.sm,
  },
  resumeActions: {
    marginTop: Spacing.sm,
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
