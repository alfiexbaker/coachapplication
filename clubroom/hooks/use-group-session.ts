import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { groupSessionService } from '@/services/group-session-service';
import { hasChildren } from '@/utils/user-helpers';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { GroupSession, GroupRegistration } from '@/constants/types';

const logger = createLogger('GroupSessionDetailScreen');

export const SESSION_TYPE_COLORS = {
  CAMP: '#FF6B35',
  CLINIC: '#7B68EE',
  TEAM_TRAINING: '#2E8B57',
  TRAINING: '#2E8B57',
  OPEN_SESSION: '#4169E1',
  TRIAL: '#20B2AA',
} as const;

interface GroupSessionData {
  session: GroupSession | null;
  roster: GroupRegistration[];
}

export interface UseGroupSessionResult {
  id: string | undefined;
  session: GroupSession | null;
  roster: GroupRegistration[];
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  registering: boolean;
  isCoach: boolean;
  userHasChildren: boolean;
  spotsLeft: number;
  isFull: boolean;
  isFree: boolean | undefined;
  handleRegister: () => Promise<void>;
  handleCancel: () => void;
}

export function useGroupSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const [registering, setRegistering] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) {
      return ok<GroupSessionData>({
        session: null,
        roster: [],
      });
    }

    try {
      const [sessionData, rosterData] = await Promise.all([
        groupSessionService.getSession(id),
        groupSessionService.getSessionRoster(id),
      ]);
      return ok<GroupSessionData>({
        session: sessionData,
        roster: rosterData,
      });
    } catch (loadError) {
      logger.error('Failed to load session:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load group session. Pull down to refresh.', loadError),
      );
    }
  }, [id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<GroupSessionData>({
    load: loadData,
    deps: [id],
    isEmpty: (value) => value.session === null,
    refetchOnFocus: true,
  });

  const session = data?.session ?? null;
  const roster = data?.roster ?? [];
  const loading = status === 'loading';
  const isCoach = currentUser?.id === session?.coachId;
  const userHasChildren = hasChildren(currentUser);
  const spotsLeft = session ? session.maxParticipants - session.currentParticipants : 0;
  const isFull = spotsLeft <= 0;
  const isFree = session?.pricePerParticipant === 0;

  const handleRegister = useCallback(async () => {
    if (!session || !currentUser) return;

    setRegistering(true);
    try {
      const result = await groupSessionService.register(
        session.id,
        `athlete_${currentUser.id}`,
        currentUser.id,
      );
      if (!result.success) {
        Alert.alert('Error', result.error.message || 'Failed to register. Please try again.');
        return;
      }
      onRefresh();
      Alert.alert(
        'Success',
        result.data.status === 'WAITLISTED'
          ? 'You have been added to the waitlist!'
          : 'Registration successful!',
      );
    } catch (error) {
      logger.error('Failed to register:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    } finally {
      setRegistering(false);
    }
  }, [session, currentUser, onRefresh]);

  const handleCancel = useCallback(async () => {
    if (!session) return;

    Alert.alert('Cancel Session', 'Are you sure you want to cancel this session?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await groupSessionService.cancelSession(session.id);
            if (!result.success) {
              Alert.alert('Error', result.error.message || 'Failed to cancel session.');
              return;
            }
            router.back();
          } catch (error) {
            logger.error('Failed to cancel:', error);
            Alert.alert('Error', 'Failed to cancel session.');
          }
        },
      },
    ]);
  }, [session]);

  return {
    id,
    session,
    roster,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    registering,
    isCoach,
    userHasChildren,
    spotsLeft,
    isFull,
    isFree,
    handleRegister,
    handleCancel,
  } satisfies UseGroupSessionResult;
}
