import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import type { User } from '@/constants/types';
import { childService, type ChildProfile } from '@/services/child-service';
import { userService } from '@/services/user-service';
import { createLogger } from '@/utils/logger';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('SpecialNeedsScreen');

interface SpecialNeedsData {
  athlete: User | null;
  childProfile: ChildProfile | null;
}

export function useSpecialNeeds() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();

  const loadData = useCallback(async () => {
    if (!athleteId) {
      return err(serviceError('VALIDATION', 'Missing athlete id for special needs.'));
    }

    try {
      const athleteResult = await userService.getUserById(athleteId);
      if (!athleteResult.success) {
        logger.error('Failed to load athlete', { athleteId, error: athleteResult.error });
        return err(athleteResult.error);
      }

      const loadedAthlete = athleteResult.data;
      const nameParts = loadedAthlete.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      const profile = await childService.getChildByName(firstName, lastName);
      return ok<SpecialNeedsData>({
        athlete: loadedAthlete,
        childProfile: profile,
      });
    } catch (error) {
      logger.error('Failed to load child profile', error);
      return err(serviceError('UNKNOWN', 'Failed to load special needs profile.', error));
    }
  }, [athleteId]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<SpecialNeedsData>({
    load: loadData,
    deps: [athleteId],
    isEmpty: (value) => !value.athlete,
    refetchOnFocus: true,
  });

  const athlete = data?.athlete ?? null;
  const childProfile = data?.childProfile ?? null;

  const disabilityCount = childProfile?.disabilities.length ?? 0;
  const specialNeedsCount = childProfile?.specialNeeds.length ?? 0;
  const allergyCount = childProfile?.allergies.length ?? 0;
  const totalCount = disabilityCount + specialNeedsCount;

  return {
    athlete, childProfile, loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    disabilityCount, specialNeedsCount, allergyCount, totalCount,
  } satisfies {
    athlete: User | null;
    childProfile: ChildProfile | null;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    disabilityCount: number;
    specialNeedsCount: number;
    allergyCount: number;
    totalCount: number;
  };
}
