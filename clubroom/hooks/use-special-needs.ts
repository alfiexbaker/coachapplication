import { useLocalSearchParams } from 'expo-router';

import type { User } from '@/constants/types';
import { childService, type ChildProfile } from '@/services/child-service';
import { createLogger } from '@/utils/logger';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { canReadAthleteDevelopment } from '@/hooks/use-athlete-development';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { ServiceEvents } from '@/services/event-bus';

const logger = createLogger('SpecialNeedsScreen');

interface SpecialNeedsData {
  athlete: User | null;
  childProfile: ChildProfile | null;
}

function mapChildProfileToAthlete(child: ChildProfile): User {
  const name = child.nickname?.trim() || `${child.firstName} ${child.lastName}`.trim() || 'Athlete';
  return {
    id: child.id,
    email: '',
    role: 'USER',
    name,
    avatar: child.photoUrl,
    postcode: '',
    dateOfBirth: child.dateOfBirth ?? '',
  };
}

export function useSpecialNeeds() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { currentUser } = useAuth();

  const loadData = async () => {
    if (!athleteId) {
      return err(serviceError('VALIDATION', 'Missing athlete id for special needs.'));
    }
    if (!currentUser) {
      return err(serviceError('UNAUTHORIZED', 'Sign in to view player needs and notes.'));
    }

    try {
      const accessResult = await canReadAthleteDevelopment(athleteId, currentUser);
      if (!accessResult.success) {
        return accessResult;
      }
      if (!accessResult.data) {
        return err(serviceError('UNAUTHORIZED', 'You do not have permission to view this player.'));
      }

      const profile = await childService.getChild(athleteId);
      if (!profile) {
        logger.warn('Special needs profile unavailable');
        return err(serviceError('NOT_FOUND', 'Special needs profile unavailable.'));
      }

      return ok<SpecialNeedsData>({
        athlete: mapChildProfileToAthlete(profile),
        childProfile: profile,
      });
    } catch (error) {
      logger.error('Failed to load child profile', error);
      return err(serviceError('UNKNOWN', 'Failed to load special needs profile.', error));
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<SpecialNeedsData>({
    load: loadData,
    deps: [
      athleteId,
      currentUser?.id,
      currentUser?.role,
      currentUser?.accountType,
      currentUser?.children?.map((child) => child.childId).join(','),
    ],
    isEmpty: (value) => !value.athlete,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey:
      athleteId && currentUser?.id
        ? `special-needs:${currentUser.id}:${athleteId}`
        : 'special-needs:missing',
    events: [
      ServiceEvents.CHILD_SEN_UPDATED,
      ServiceEvents.COACH_OBSERVATION_CREATED,
      ServiceEvents.COACH_OBSERVATION_UPDATED,
      ServiceEvents.COACH_OBSERVATION_DELETED,
    ],
  });

  const athlete = data?.athlete ?? null;
  const childProfile = data?.childProfile ?? null;

  const disabilityCount = childProfile?.disabilities.length ?? 0;
  const specialNeedsCount = childProfile?.specialNeeds.length ?? 0;
  const allergyCount = childProfile?.allergies.length ?? 0;
  const conditionCount = childProfile?.medicalConditions.length ?? 0;
  const medicationCount = childProfile?.medications.length ?? 0;
  const parentNoteCount =
    Number(Boolean(childProfile?.communicationNotes)) +
    Number(Boolean(childProfile?.behavioralNotes));
  const totalCount =
    disabilityCount +
    specialNeedsCount +
    allergyCount +
    conditionCount +
    medicationCount +
    parentNoteCount;

  return {
    athlete,
    childProfile,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    disabilityCount,
    specialNeedsCount,
    allergyCount,
    conditionCount,
    medicationCount,
    parentNoteCount,
    totalCount,
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
    conditionCount: number;
    medicationCount: number;
    parentNoteCount: number;
    totalCount: number;
  };
}
