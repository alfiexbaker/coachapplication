/**
 * useOnboarding — Custom hook for onboarding wizard state management.
 *
 * Replaces 25+ useState calls with a single useReducer.
 * Handles step navigation, validation, and form submission.
 */

import { useReducer, useCallback } from 'react';
import { useSharedValue, withTiming, runOnJS, type SharedValue } from 'react-native-reanimated';

import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { OnboardingData } from '@/services/auth-service';
import {
  type OnboardingState,
  type OnboardingAction,
  type OnboardingStep,
  INITIAL_STATE,
} from './onboarding-types';

const logger = createLogger('Onboarding');

// ============================================================================
// REDUCER
// ============================================================================

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_ACCOUNT_TYPE':
      return { ...state, accountType: action.accountType };
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_SKILL_LEVEL':
      return { ...state, skillLevel: action.value };
    case 'TOGGLE_SPECIALIZATION':
      return {
        ...state,
        specializations: state.specializations.includes(action.spec)
          ? state.specializations.filter((s) => s !== action.spec)
          : [...state.specializations, action.spec],
      };
    case 'TOGGLE_HAS_CHILDREN':
      return { ...state, hasChildren: !state.hasChildren };
    case 'TOGGLE_IS_ORGANIZATION':
      return { ...state, isOrganization: !state.isOrganization };
    default:
      return state;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseOnboardingResult {
  state: OnboardingState;
  fadeOpacity: SharedValue<number>;
  dispatch: React.Dispatch<OnboardingAction>;
  handleNext: () => void;
  handleBack: () => void;
  getStepNumber: () => number;
  getTotalSteps: () => number;
}

export function useOnboarding(
  onComplete: () => void,
  onBackToLogin: () => void,
): UseOnboardingResult {
  const { registerFromOnboarding, error: authError } = useAuth();
  const [state, dispatch] = useReducer(onboardingReducer, INITIAL_STATE);
  const fadeOpacity = useSharedValue(1);

  // ---- Navigation helpers ----

  const getNextStep = useCallback((): OnboardingStep => {
    switch (state.step) {
      case 'account-type':
        return 'basic-info';
      case 'basic-info':
        return 'location';
      case 'location':
        if (state.accountType === 'ATHLETE') return 'athlete-details';
        if (state.accountType === 'COACH') return 'coach-details';
        return 'complete';
      case 'athlete-details':
      case 'coach-details':
        return 'complete';
      default:
        return 'complete';
    }
  }, [state.step, state.accountType]);

  const getPrevStep = useCallback((): OnboardingStep | null => {
    switch (state.step) {
      case 'basic-info':
        return 'account-type';
      case 'location':
        return 'basic-info';
      case 'athlete-details':
      case 'coach-details':
        return 'location';
      default:
        return null;
    }
  }, [state.step]);

  const getStepNumber = useCallback((): number => {
    const steps: OnboardingStep[] = ['account-type', 'basic-info', 'location'];
    if (state.accountType === 'ATHLETE') steps.push('athlete-details');
    if (state.accountType === 'COACH') steps.push('coach-details');
    steps.push('complete');
    return steps.indexOf(state.step) + 1;
  }, [state.step, state.accountType]);

  const getTotalSteps = useCallback((): number => {
    return 5; // account-type, basic-info, location, role-specific, complete
  }, []);

  // ---- Animated transition ----

  const animateTransition = useCallback(
    (callback: () => void) => {
      fadeOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) {
          runOnJS(callback)();
          fadeOpacity.value = withTiming(1, { duration: 150 });
        }
      });
    },
    [fadeOpacity],
  );

  // ---- Validation ----

  const fail = useCallback((msg: string) => {
    dispatch({ type: 'SET_ERROR', error: msg });
    return false;
  }, [dispatch]);

  const validateCurrentStep = useCallback((): boolean => {
    const { step: s } = state;
    if (s === 'account-type' && !state.accountType) return fail('Please select an account type');
    if (s === 'basic-info') {
      if (!state.firstName.trim()) return fail('First name is required');
      if (!state.lastName.trim()) return fail('Last name is required');
      if (!state.email.trim() || !state.email.includes('@')) return fail('Valid email is required');
      if (state.password.length < 6) return fail('Password must be at least 6 characters');
      if (state.password !== state.confirmPassword) return fail('Passwords do not match');
    }
    if (s === 'athlete-details') {
      if (!state.skillLevel) return fail('Please select your skill level');
      if (!state.sport) return fail('Please select your sport');
    }
    if (s === 'coach-details' && state.isOrganization && !state.organizationName.trim()) {
      return fail('Organization name is required');
    }
    return true;
  }, [state, fail]);

  // ---- Completion ----

  const handleComplete = useCallback(() => {
    dispatch({ type: 'SET_SUBMITTING', value: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      const data: OnboardingData = {
        accountType: state.accountType!,
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        phone: state.phone,
        password: state.password,
        dateOfBirth: state.dateOfBirth || undefined,
        city: state.city || undefined,
        postcode: state.postcode || undefined,
        country: state.country || undefined,
        skillLevel: state.skillLevel || undefined,
        position: state.position || undefined,
        sport: state.sport || undefined,
        goals: state.goals.length > 0 ? state.goals : undefined,
        hasChildren: state.accountType === 'ATHLETE' ? state.hasChildren : undefined,
        isOrganization: state.isOrganization,
        organizationName: state.organizationName || undefined,
        yearsExperience: state.yearsExperience ? parseInt(state.yearsExperience) : undefined,
        specializations: state.specializations.length > 0 ? state.specializations : undefined,
        bio: state.bio || undefined,
        hourlyRate: state.hourlyRate ? parseFloat(state.hourlyRate) : undefined,
      };

      const success = registerFromOnboarding(data);

      if (success) {
        logger.success('Onboarding complete');
        animateTransition(() => dispatch({ type: 'SET_STEP', step: 'complete' }));
        setTimeout(() => onComplete(), 1500);
      } else {
        dispatch({ type: 'SET_ERROR', error: authError || 'Something went wrong' });
      }
    } catch (err) {
      logger.error('Onboarding failed', err);
      dispatch({ type: 'SET_ERROR', error: 'Something went wrong. Please try again.' });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  }, [state, registerFromOnboarding, authError, animateTransition, onComplete]);

  // ---- Public handlers ----

  const handleNext = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null });

    if (!validateCurrentStep()) return;

    const nextStep = getNextStep();

    if (nextStep === 'complete') {
      handleComplete();
    } else {
      animateTransition(() => dispatch({ type: 'SET_STEP', step: nextStep }));
    }
  }, [validateCurrentStep, getNextStep, handleComplete, animateTransition]);

  const handleBack = useCallback(() => {
    const prevStep = getPrevStep();
    if (prevStep) {
      animateTransition(() => dispatch({ type: 'SET_STEP', step: prevStep }));
    } else {
      onBackToLogin();
    }
  }, [getPrevStep, animateTransition, onBackToLogin]);

  return {
    state,
    fadeOpacity,
    dispatch,
    handleNext,
    handleBack,
    getStepNumber,
    getTotalSteps,
  };
}
