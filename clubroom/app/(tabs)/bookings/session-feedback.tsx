import { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/services/api-client';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { FootballObjective } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SessionFeedbackScreen');

export default function SessionFeedbackScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams();
  const { currentUser } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  // Get athlete's objectives from params
  const athleteObjectivesParam = params.athleteObjectives as string;
  const athleteObjectives: FootballObjective[] = useMemo(() =>
    athleteObjectivesParam ? JSON.parse(athleteObjectivesParam) : [],
    [athleteObjectivesParam]
  );
  const athleteName = (params.athleteName as string) || 'the athlete';
  const athleteId = params.athleteId as string;
  const bookingId = params.bookingId as string;

  // Create session record and navigate to detail screen
  useEffect(() => {
    const createSessionAndNavigate = async () => {
      if (isCreating) return;
      setIsCreating(true);

      try {
        // Create minimal session record
        const sessionId = `session-${Date.now()}`;
        const sessionRecord = {
          id: sessionId,
          athleteId,
          athleteName,
          coachId: currentUser?.id,
          bookingId,
          completedAt: new Date().toISOString(),
          performanceRating: 3, // Default, coach will update
          skillsWorkedOn: athleteObjectives, // Pre-populate with booking objectives
          notes: '',
          videoUrls: [],
          imageUrls: [],
          attendance: 'ATTENDED',
        };

        // Save to storage
        const sessions = await apiClient.get<any[]>('coach_sessions', []);
        sessions.push(sessionRecord);
        await apiClient.set('coach_sessions', sessions);

        logger.success('Session created', {
          sessionId,
          athleteId,
          prePopulatedSkills: athleteObjectives.length,
        });

        // Update booking status
        const bookings = await apiClient.get<any[]>('session_bookings', []);
        if (bookings.length > 0) {
          const updatedBookings = bookings.map((booking: any) =>
            booking.id === bookingId
              ? { ...booking, status: 'COMPLETED', sessionId }
              : booking
          );
          await apiClient.set('session_bookings', updatedBookings);
        }

        // Navigate to session detail screen to add notes/media
        router.replace(`/development/session/${sessionId}` as any);
      } catch (error) {
        logger.error('Failed to create session', error);
        Alert.alert('Error', 'Failed to create session. Please try again.');
        router.back();
      }
    };

    createSessionAndNavigate();
  }, [athleteId, athleteName, currentUser, bookingId, athleteObjectives, isCreating]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.loadingText}>Creating session...</ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
