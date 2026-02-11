/**
 * Hook for the Create Squad modal screen.
 * Manages squad creation form state, validation, and submission.
 */

import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';

export const AGE_GROUPS = [
  { label: 'U8', min: 5, max: 8 },
  { label: 'U10', min: 8, max: 10 },
  { label: 'U12', min: 10, max: 12 },
  { label: 'U14', min: 12, max: 14 },
  { label: 'U16', min: 14, max: 16 },
  { label: 'U18', min: 16, max: 18 },
  { label: 'Adults', min: 18, max: 99 },
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

export const SQUAD_LEVELS = [
  'Development',
  'Competitive',
  'Elite',
  'Performance',
  'Foundation',
  'Fun Football',
] as const;

export const SKILL_TAGS = [
  'Ball Mastery',
  'Finishing',
  'Tactics',
  'Teamwork',
  'Confidence',
  'Technical',
  'Conditioning',
  'Goalkeeping',
  'Match Play',
] as const;

export function useCreateSquad() {
  const { currentUser } = useAuth();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();

  const [squadName, setSquadName] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [meetLocation, setMeetLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clubs = useMemo(
    () => (currentUser?.id ? socialFeedService.getUserClubs(currentUser.id) : []),
    [currentUser?.id],
  );

  const club = useMemo(() => clubs.find((candidate) => candidate.id === clubId), [clubs, clubId]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length < 3) return [...prev, tag];
      return prev;
    });
  }, []);

  const isValid = Boolean(squadName.trim() && selectedAgeGroup && selectedLevel);

  const handleCreate = useCallback(async () => {
    if (!squadName.trim()) {
      Alert.alert('Error', 'Please enter a squad name');
      return;
    }
    if (!selectedAgeGroup) {
      Alert.alert('Error', 'Please select an age group');
      return;
    }
    if (!selectedLevel) {
      Alert.alert('Error', 'Please select a level');
      return;
    }

    setIsSubmitting(true);
    try {
      const newSquad = await squadService.createSquad({
        clubId: clubId!,
        name: squadName.trim(),
        level: `${selectedAgeGroup.label} · ${selectedLevel}`,
        description: selectedTags.length > 0 ? `Focus: ${selectedTags.join(', ')}` : undefined,
        meetingLocation: meetLocation.trim() || undefined,
        ageGroup: selectedAgeGroup.label,
        skillLevel: selectedLevel,
        focusAreas: selectedTags,
      });
      Alert.alert('Squad Created', `${newSquad.name} has been created successfully!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create squad. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [squadName, selectedAgeGroup, selectedLevel, meetLocation, selectedTags, clubId]);

  return {
    club,
    clubId,
    squadName,
    selectedAgeGroup,
    selectedLevel,
    meetLocation,
    selectedTags,
    isSubmitting,
    isValid,
    setSquadName,
    setSelectedAgeGroup,
    setSelectedLevel,
    setMeetLocation,
    toggleTag,
    handleCreate,
  };
}
