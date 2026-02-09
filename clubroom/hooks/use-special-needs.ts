import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { getUserById } from '@/constants/mock-data';
import { childService, type ChildProfile } from '@/services/child-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SpecialNeedsScreen');

export function useSpecialNeeds() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const athlete = getUserById(athleteId!);

  useEffect(() => {
    if (!athlete) return;

    const loadChildProfile = async () => {
      try {
        const nameParts = athlete.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        const profile = await childService.getChildByName(firstName, lastName);
        setChildProfile(profile);
      } catch (error) {
        logger.error('Failed to load child profile', error);
      } finally {
        setLoading(false);
      }
    };

    loadChildProfile();
  }, [athlete]);

  const disabilityCount = childProfile?.disabilities.length ?? 0;
  const specialNeedsCount = childProfile?.specialNeeds.length ?? 0;
  const allergyCount = childProfile?.allergies.length ?? 0;
  const totalCount = disabilityCount + specialNeedsCount;

  return {
    athlete, childProfile, loading,
    disabilityCount, specialNeedsCount, allergyCount, totalCount,
  };
}
