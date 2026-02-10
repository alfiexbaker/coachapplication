/**
 * Hook for the Emergency Quick Access screen.
 * Manages emergency data loading, refresh, and call actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { createLogger } from '@/utils/logger';
import { useAuth } from '@/hooks/use-auth';
import { safetyService, AthleteEmergencyQuickView } from '@/services/safety-service';
import { rosterService } from '@/services/roster-service';

const logger = createLogger('EmergencyQuickAccessScreen');

export function useEmergencyAccess() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { currentUser } = useAuth();
  const coachId = currentUser?.id || 'coach_1';

  const [emergencyData, setEmergencyData] = useState<AthleteEmergencyQuickView | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!athleteId) return;
    try {
      setError(null);
      const entry = await rosterService.getRosterEntry(coachId, athleteId);
      const dataResult = await safetyService.getAthleteEmergency(athleteId, entry?.athleteName);
      if (!dataResult.success) {
        setError(dataResult.error.message);
        setEmergencyData(null);
        return;
      }
      setEmergencyData(dataResult.data);
    } catch (err) {
      logger.error('Failed to load emergency data:', err);
      setError('Failed to load emergency information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [athleteId, coachId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const handleCallContact = useCallback(async (phone: string, name: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Call Emergency Contact', `Call ${name} at ${phone}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: async () => {
        try {
          const url = `tel:${phone.replace(/\s+/g, '')}`;
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) await Linking.openURL(url);
          else Alert.alert('Error', 'Unable to make phone calls on this device');
        } catch { Alert.alert('Error', 'Failed to initiate call'); }
      }},
    ]);
  }, []);

  const handleCallDoctor = useCallback(async () => {
    if (!emergencyData?.doctorPhone) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Call Doctor', `Call ${emergencyData.doctorName || 'Doctor'} at ${emergencyData.doctorPhone}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: async () => {
        try {
          const url = `tel:${emergencyData.doctorPhone!.replace(/\s+/g, '')}`;
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) await Linking.openURL(url);
        } catch { Alert.alert('Error', 'Failed to initiate call'); }
      }},
    ]);
  }, [emergencyData]);

  return {
    emergencyData, loading, refreshing, error,
    loadData, handleRefresh, handleCallContact, handleCallDoctor,
  };
}
