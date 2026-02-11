/**
 * Hook for the Emergency Quick Access screen.
 * Manages emergency data loading, refresh, and call actions.
 */

import { useCallback } from 'react';
import { Linking, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { createLogger } from '@/utils/logger';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { safetyService, AthleteEmergencyQuickView } from '@/services/safety-service';
import { rosterService } from '@/services/roster-service';
import { getRosterAthleteName } from '@/utils/roster-display';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('EmergencyQuickAccessScreen');

export function useEmergencyAccess() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { currentUser } = useAuth();
  const coachId = currentUser?.id || 'coach_1';

  const loadData = useCallback(async () => {
    if (!athleteId) {
      return ok<AthleteEmergencyQuickView | null>(null);
    }

    try {
      const entry = await rosterService.getRosterEntry(coachId, athleteId);
      const dataResult = await safetyService.getAthleteEmergency(
        athleteId,
        entry ? getRosterAthleteName(entry) : undefined,
      );
      if (!dataResult.success) {
        return err(serviceError('UNKNOWN', dataResult.error.message, dataResult.error));
      }

      return ok<AthleteEmergencyQuickView | null>(dataResult.data);
    } catch (loadError) {
      logger.error('Failed to load emergency data:', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load emergency information.', loadError));
    }
  }, [athleteId, coachId]);

  const {
    data: emergencyData,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<AthleteEmergencyQuickView | null>({
    load: loadData,
    deps: [athleteId, coachId],
    isEmpty: (value) => !value,
    refetchOnFocus: true,
  });

  const handleCallContact = useCallback(async (phone: string, name: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Call Emergency Contact', `Call ${name} at ${phone}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call',
        onPress: async () => {
          try {
            const url = `tel:${phone.replace(/\s+/g, '')}`;
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) await Linking.openURL(url);
            else Alert.alert('Error', 'Unable to make phone calls on this device');
          } catch {
            Alert.alert('Error', 'Failed to initiate call');
          }
        },
      },
    ]);
  }, []);

  const handleCallDoctor = useCallback(async () => {
    if (!emergencyData?.doctorPhone) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Call Doctor',
      `Call ${emergencyData.doctorName || 'Doctor'} at ${emergencyData.doctorPhone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            try {
              const url = `tel:${emergencyData.doctorPhone!.replace(/\s+/g, '')}`;
              const canOpen = await Linking.canOpenURL(url);
              if (canOpen) await Linking.openURL(url);
            } catch {
              Alert.alert('Error', 'Failed to initiate call');
            }
          },
        },
      ],
    );
  }, [emergencyData]);

  return {
    emergencyData: emergencyData ?? null,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    loadData: onRefresh,
    handleRefresh: onRefresh,
    retry,
    handleCallContact,
    handleCallDoctor,
  };
}
