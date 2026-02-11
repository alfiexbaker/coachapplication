/**
 * useCoachWelcome — State and handlers for coach onboarding wizard.
 */
import { useCallback, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { SCREEN_WIDTH, TOTAL_SCREENS } from '@/components/onboarding/coach-welcome-data';

export function useCoachWelcome(onComplete: () => void) {
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Form state
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [rate, setRate] = useState('');
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  }, []);

  const goToPage = useCallback((page: number) => {
    scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
  }, []);

  const handleNext = useCallback(() => {
    if (currentPage < TOTAL_SCREENS - 1) goToPage(currentPage + 1);
    else onComplete();
  }, [currentPage, goToPage, onComplete]);

  const toggleSpecialty = useCallback((specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty) ? prev.filter((s) => s !== specialty) : [...prev, specialty],
    );
  }, []);

  const toggleAvailability = useCallback((day: string, period: string) => {
    const key = `${day}_${period}`;
    setAvailability((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isLastPage = currentPage === TOTAL_SCREENS - 1;

  return {
    scrollRef,
    currentPage,
    isLastPage,
    headline,
    setHeadline,
    bio,
    setBio,
    rate,
    setRate,
    selectedSpecialties,
    toggleSpecialty,
    availability,
    toggleAvailability,
    handleScroll,
    handleNext,
  };
}
