import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';

import type { User } from '@/constants/types';
import { childService, type ChildProfile } from '@/services/child-service';
import { userService } from '@/services/user-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SpecialNeedsScreen');

export function useSpecialNeeds() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const [athlete, setAthlete] = useState<User | null>(null);
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!athleteId) {
        if (isMounted) {
          setAthlete(null);
          setChildProfile(null);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);

        const athleteResult = await userService.getUserById(athleteId);
        if (!athleteResult.success) {
          logger.error('Failed to load athlete', { athleteId, error: athleteResult.error });
          if (isMounted) {
            setAthlete(null);
            setChildProfile(null);
          }
          return;
        }

        const loadedAthlete = athleteResult.data;
        if (!isMounted) {
          return;
        }

        setAthlete(loadedAthlete);

        const nameParts = loadedAthlete.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        const profile = await childService.getChildByName(firstName, lastName);
        if (isMounted) {
          setChildProfile(profile);
        }
      } catch (error) {
        logger.error('Failed to load child profile', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [athleteId]);

  const disabilityCount = childProfile?.disabilities.length ?? 0;
  const specialNeedsCount = childProfile?.specialNeeds.length ?? 0;
  const allergyCount = childProfile?.allergies.length ?? 0;
  const totalCount = disabilityCount + specialNeedsCount;

  return {
    athlete, childProfile, loading,
    disabilityCount, specialNeedsCount, allergyCount, totalCount,
  };
}
