import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { groupSessionService } from '@/services/group-session-service';
import { hasChildren } from '@/utils/user-helpers';
import { createLogger } from '@/utils/logger';
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

export function useGroupSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const [session, setSession] = useState<GroupSession | null>(null);
  const [roster, setRoster] = useState<GroupRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const isCoach = currentUser?.id === session?.coachId;
  const userHasChildren = hasChildren(currentUser);
  const spotsLeft = session ? session.maxParticipants - session.currentParticipants : 0;
  const isFull = spotsLeft <= 0;
  const isFree = session?.pricePerParticipant === 0;

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sessionData, rosterData] = await Promise.all([
        groupSessionService.getSession(id),
        groupSessionService.getSessionRoster(id),
      ]);
      setSession(sessionData);
      setRoster(rosterData);
    } catch (error) {
      logger.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegister = useCallback(async () => {
    if (!session || !currentUser) return;

    setRegistering(true);
    try {
      await groupSessionService.register(session.id, `athlete_${currentUser.id}`, currentUser.id);
      await loadData();
      Alert.alert('Success', session.currentParticipants >= session.maxParticipants ? 'You have been added to the waitlist!' : 'Registration successful!');
    } catch (error) {
      logger.error('Failed to register:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    } finally {
      setRegistering(false);
    }
  }, [session, currentUser, loadData]);

  const handleCancel = useCallback(async () => {
    if (!session) return;

    Alert.alert('Cancel Session', 'Are you sure you want to cancel this session?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await groupSessionService.cancelSession(session.id);
            router.back();
          } catch (error) {
            logger.error('Failed to cancel:', error);
          }
        },
      },
    ]);
  }, [session]);

  return {
    id, session, roster, loading, registering,
    isCoach, userHasChildren, spotsLeft, isFull, isFree,
    handleRegister, handleCancel,
  };
}
