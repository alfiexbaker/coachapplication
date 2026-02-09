/**
 * Hook: useCreateAcademy
 *
 * Manages create academy wizard state: steps, form data, validation, submission.
 * Used by app/academy/create.tsx
 */

import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { academyService, CreateAcademyInput } from '@/services/academy-service';
import type { FootballObjective } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useCreateAcademy');

export const SPECIALTY_OPTIONS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Finishing',
  'Defending',
  'Goalkeeping',
  'Conditioning',
];

export type WizardStep = 'basics' | 'details' | 'specialties' | 'review';

const STEPS: WizardStep[] = ['basics', 'details', 'specialties', 'review'];

export function useCreateAcademy() {
  const { currentUser } = useAuth();

  const [step, setStep] = useState<WizardStep>('basics');
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [specialties, setSpecialties] = useState<FootballObjective[]>([]);

  const currentStepIndex = STEPS.indexOf(step);

  const canProceed = useCallback(() => {
    switch (step) {
      case 'basics':
        return name.trim().length > 0 && city.trim().length > 0 && postcode.trim().length > 0;
      case 'details':
      case 'specialties':
      case 'review':
        return true;
      default:
        return false;
    }
  }, [step, name, city, postcode]);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex]);
    }
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setStep(STEPS[currentStepIndex - 1]);
    } else {
      router.back();
    }
  }, [currentStepIndex]);

  const toggleSpecialty = useCallback((s: FootballObjective) => {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }, []);

  const handleCreate = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const input: CreateAcademyInput = {
        name,
        description,
        city,
        postcode,
        ownerId: currentUser.id,
        ownerName: currentUser.name || 'Coach',
        sports: ['Football'],
        specialties,
      };

      const academy = await academyService.createAcademy(input);

      if (email || phone || website) {
        await academyService.updateBranding(academy.id, {
          email: email || undefined,
          phone: phone || undefined,
          website: website || undefined,
        });
      }

      router.replace(Routes.academy(academy.id));
    } catch (error) {
      logger.error('Failed to create academy:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, name, description, city, postcode, email, phone, website, specialties]);

  return {
    step,
    steps: STEPS,
    currentStepIndex,
    loading,
    name,
    description,
    city,
    postcode,
    email,
    phone,
    website,
    specialties,
    setName,
    setDescription,
    setCity,
    setPostcode,
    setEmail,
    setPhone,
    setWebsite,
    canProceed,
    goNext,
    goBack,
    toggleSpecialty,
    handleCreate,
  };
}
