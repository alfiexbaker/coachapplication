/**
 * useOnboarding — Drives the multi-step onboarding wizard.
 *
 * Manages step transitions, per-step validation, and final registration
 * via useAuth().registerFromOnboarding().
 */

import { useReducer, useCallback, useMemo, useEffect, useState } from 'react';

import type {
  OnboardingState,
  OnboardingAction,
  OnboardingStep,
} from '@/components/auth/onboarding-types';
import { INITIAL_STATE } from '@/components/auth/onboarding-types';
import type { OnboardingData } from '@/services/auth-service';
import { useAuth } from '@/hooks/use-auth';
import { POSITION_LABELS } from '@/constants/position-skills';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useOnboarding');

// ============================================================================
// STEP FLOW
// ============================================================================

const STEP_ORDER_COACH: OnboardingStep[] = [
  'account-type',
  'basic-info',
  'location',
  'coach-details',
  'complete',
];

const STEP_ORDER_ATHLETE: OnboardingStep[] = [
  'account-type',
  'basic-info',
  'location',
  'athlete-details',
  'complete',
];

const STEP_ORDER_PARENT: OnboardingStep[] = [
  'account-type',
  'basic-info',
  'location',
  'parent-details',
  'complete',
];

function getStepOrder(accountType: OnboardingState['accountType']): OnboardingStep[] {
  if (accountType === 'COACH') return STEP_ORDER_COACH;
  if (accountType === 'PARENT') return STEP_ORDER_PARENT;
  return STEP_ORDER_ATHLETE;
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  'account-type': 'Account Type',
  'basic-info': 'Your Details',
  location: 'Location',
  'coach-details': 'Coach Profile',
  'athlete-details': 'Athlete Profile',
  'parent-details': 'Your Family',
  complete: 'All Done',
};

const EMAIL_REGEX = /^(?!\.)(?!.*\.\.)([A-Za-z0-9._%+-]+)@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// ============================================================================
// REDUCER
// ============================================================================

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'HYDRATE_STATE':
      return action.state;
    case 'SET_STEP':
      return { ...state, step: action.step, error: null };
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
    case 'TOGGLE_SPECIALIZATION': {
      const has = state.specializations.includes(action.spec);
      return {
        ...state,
        specializations: has
          ? state.specializations.filter((s) => s !== action.spec)
          : [...state.specializations, action.spec],
      };
    }
    case 'TOGGLE_HAS_CHILDREN':
      return { ...state, hasChildren: !state.hasChildren };
    case 'TOGGLE_IS_ORGANIZATION':
      return { ...state, isOrganization: !state.isOrganization };
    default:
      return state;
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateStep(state: OnboardingState): string | null {
  switch (state.step) {
    case 'account-type':
      if (!state.accountType) return 'Please select an account type';
      return null;

    case 'basic-info': {
      if (!state.firstName.trim()) return 'First name is required';
      if (!state.lastName.trim()) return 'Last name is required';
      if (!EMAIL_REGEX.test(state.email.trim())) return 'Please enter a valid email';
      if (state.password.length < 6) return 'Password must be at least 6 characters';
      if (state.password !== state.confirmPassword) return 'Passwords do not match';
      return null;
    }

    case 'location':
      if (!state.city.trim()) return 'City is required';
      return null;

    case 'athlete-details':
      if (!state.sport.trim()) return 'Please select a sport';
      if (!state.skillLevel) return 'Please select your skill level';
      return null;

    case 'coach-details':
      return null; // All enrichment, nothing required

    case 'parent-details':
      return null; // Children are added post-signup via add-child flow

    case 'complete':
      return null;
  }
}

// ============================================================================
// HOOK
// ============================================================================

interface UseOnboardingOptions {
  onComplete: () => void;
  onBackToLogin: () => void;
}

interface OnboardingDraft {
  state: OnboardingState;
  timestamp: number;
}

function hasOnboardingProgress(state: OnboardingState): boolean {
  return state.step !== 'account-type' || state.accountType !== null;
}

function sanitizeHydratedState(state: OnboardingState): OnboardingState {
  return {
    ...state,
    isSubmitting: false,
    error: null,
  };
}

export function useOnboarding({ onComplete, onBackToLogin }: UseOnboardingOptions) {
  const [state, dispatch] = useReducer(onboardingReducer, INITIAL_STATE);
  const { registerFromOnboarding } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedDraftTimestamp, setSavedDraftTimestamp] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadDraft = async () => {
      try {
        const draft = await apiClient.get<OnboardingDraft | null>(STORAGE_KEYS.ONBOARDING_PROGRESS, null);
        if (isCancelled || !draft) {
          return;
        }

        const hydrated = sanitizeHydratedState(draft.state);
        dispatch({ type: 'HYDRATE_STATE', state: hydrated });
        setSavedDraftTimestamp(draft.timestamp);
        if (hasOnboardingProgress(hydrated)) {
          setShowResumePrompt(true);
        }
      } catch (error) {
        logger.warn('Failed to load onboarding draft', error);
      } finally {
        if (!isCancelled) {
          setIsHydrated(true);
        }
      }
    };

    void loadDraft();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasOnboardingProgress(state) || state.step === 'complete') return;

    const timeoutId = setTimeout(() => {
      const draft: OnboardingDraft = {
        state: sanitizeHydratedState(state),
        timestamp: Date.now(),
      };
      void apiClient
        .set(STORAGE_KEYS.ONBOARDING_PROGRESS, draft)
        .catch((error) => logger.warn('Failed to save onboarding draft', error));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state, isHydrated]);

  const stepOrder = useMemo(() => getStepOrder(state.accountType), [state.accountType]);
  const stepIndex = stepOrder.indexOf(state.step);
  const stepNumber = stepIndex + 1;
  const totalSteps = stepOrder.length;
  const stepLabel = STEP_LABELS[state.step];
  const isLastContentStep = stepIndex === totalSteps - 2; // step before 'complete'
  const isComplete = state.step === 'complete';

  const canAdvance = useMemo(() => validateStep(state) === null, [state]);

  const dismissResumePrompt = useCallback(() => {
    setShowResumePrompt(false);
  }, []);

  const discardSavedDraft = useCallback(async () => {
    dispatch({ type: 'HYDRATE_STATE', state: INITIAL_STATE });
    setShowResumePrompt(false);
    setSavedDraftTimestamp(null);
    try {
      await apiClient.remove(STORAGE_KEYS.ONBOARDING_PROGRESS);
    } catch (error) {
      logger.warn('Failed to discard onboarding draft', error);
    }
  }, []);

  const next = useCallback(async () => {
    const validationError = validateStep(state);
    if (validationError) {
      dispatch({ type: 'SET_ERROR', error: validationError });
      return;
    }

    // If on the step before 'complete', register the user
    if (isLastContentStep) {
      dispatch({ type: 'SET_SUBMITTING', value: true });
      dispatch({ type: 'SET_ERROR', error: null });

      const data: OnboardingData = {
        accountType: state.accountType!,
        firstName: state.firstName.trim(),
        lastName: state.lastName.trim(),
        email: state.email.trim(),
        phone: state.phone.trim(),
        password: state.password,
        dateOfBirth: state.dateOfBirth || undefined,
        addressLine: state.addressLine.trim() || undefined,
        city: state.city.trim() || undefined,
        postcode: state.postcode.trim() || undefined,
        country: state.country || undefined,
        skillLevel: state.skillLevel || undefined,
        position: state.position ? POSITION_LABELS[state.position] : undefined,
        sport: state.sport || undefined,
        goals: state.goals.length > 0 ? state.goals : undefined,
        hasChildren: state.hasChildren || undefined,
        isOrganization: state.isOrganization || undefined,
        organizationName: state.organizationName.trim() || undefined,
        yearsExperience: state.yearsExperience ? Number(state.yearsExperience) : undefined,
        specializations: state.specializations.length > 0 ? state.specializations : undefined,
        bio: state.bio.trim() || undefined,
        hourlyRate: state.hourlyRate ? Number(state.hourlyRate) : undefined,
        childrenCount: state.accountType === 'PARENT' ? state.childrenCount : undefined,
      };

      try {
        const success = await registerFromOnboarding(data);

        if (success) {
          void apiClient.remove(STORAGE_KEYS.ONBOARDING_PROGRESS).catch((error) => {
            logger.warn('Failed to clear onboarding draft after completion', error);
          });
          setShowResumePrompt(false);
          setSavedDraftTimestamp(null);
          dispatch({ type: 'SET_STEP', step: 'complete' });
        } else {
          dispatch({ type: 'SET_ERROR', error: 'Registration failed. Email may already be in use.' });
        }
      } catch (error) {
        logger.error('Unexpected onboarding registration failure', error);
        dispatch({ type: 'SET_ERROR', error: 'Registration failed. Please try again.' });
      } finally {
        dispatch({ type: 'SET_SUBMITTING', value: false });
      }
      return;
    }

    // Normal step advance
    const nextStep = stepOrder[stepIndex + 1];
    if (nextStep) {
      dispatch({ type: 'SET_STEP', step: nextStep });
    }
  }, [state, stepOrder, stepIndex, isLastContentStep, registerFromOnboarding]);

  const back = useCallback(() => {
    if (stepIndex <= 0) {
      onBackToLogin();
      return;
    }
    dispatch({ type: 'SET_STEP', step: stepOrder[stepIndex - 1] });
  }, [stepIndex, stepOrder, onBackToLogin]);

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return {
    state,
    isHydrated,
    dispatch,
    canAdvance,
    next,
    back,
    finish,
    stepNumber,
    totalSteps,
    stepLabel,
    isSubmitting: state.isSubmitting,
    isComplete,
    error: state.error,
    showResumePrompt,
    savedDraftTimestamp,
    dismissResumePrompt,
    discardSavedDraft,
  };
}
