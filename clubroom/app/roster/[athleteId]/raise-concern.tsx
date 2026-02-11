/**
 * Raise Concern Screen
 *
 * Allows coaches to flag incidents, behavioral issues, or safeguarding
 * concerns about an athlete.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { rosterService } from '@/services/roster-service';
import {
  concernService,
  type ConcernType,
  type ConcernSeverity,
} from '@/services/concern-service';
import { createLogger } from '@/utils/logger';
import { getRosterAthleteName } from '@/utils/roster-display';
import { err, ok, serviceError } from '@/types/result';
import { RaiseConcernHeader } from '@/components/roster/raise-concern-header';
import { RaiseConcernForm } from '@/components/roster/raise-concern-form';

const logger = createLogger('RaiseConcern');

export default function RaiseConcernScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { colors } = useTheme();
  const { currentUser } = useAuth();

  const [type, setType] = useState<ConcernType | null>(null);
  const [severity, setSeverity] = useState<ConcernSeverity>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const coachId = currentUser?.id || 'coach_1';
  const { data, status, error, retry } = useScreen<{ athleteName: string | null }>({
    load: async () => {
      try {
        if (!athleteId) {
          return ok<{ athleteName: string | null }>({ athleteName: null });
        }
        const entry = await rosterService.getRosterEntry(coachId, athleteId);
        return ok<{ athleteName: string | null }>({
          athleteName: entry ? getRosterAthleteName(entry) : null,
        });
      } catch (loadError) {
        return err(serviceError('UNKNOWN', 'Failed to load athlete details.', loadError));
      }
    },
    deps: [coachId, athleteId],
    isEmpty: (value) => !value.athleteName,
    refetchOnFocus: true,
  });

  const athleteName = data?.athleteName || '';
  const canSubmit = type !== null && title.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !type) return;

    setSubmitting(true);
    try {
      const result = await concernService.raiseConcern({
        coachId,
        athleteId,
        athleteName,
        type,
        severity,
        title: title.trim(),
        description: description.trim(),
        actionTaken: actionTaken.trim() || undefined,
      });

      if (result.success) {
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('Concern Recorded', `Your concern about ${athleteName} has been recorded.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error.message);
      }
    } catch (submitError) {
      logger.error('Failed to submit concern', submitError);
      Alert.alert('Error', 'Failed to submit concern. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, type, coachId, athleteId, athleteName, severity, title, description, actionTaken]);

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <RaiseConcernHeader colors={colors} athleteName="" onBack={() => router.back()} />
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <RaiseConcernHeader colors={colors} athleteName="" onBack={() => router.back()} />
        <ErrorState message={error?.message || 'Failed to load athlete details.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <RaiseConcernHeader colors={colors} athleteName="" onBack={() => router.back()} />
        <ErrorState message="Athlete not found in your roster." onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <RaiseConcernHeader colors={colors} athleteName={athleteName} onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <RaiseConcernForm
          colors={colors}
          type={type}
          onTypeChange={setType}
          severity={severity}
          onSeverityChange={setSeverity}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          actionTaken={actionTaken}
          onActionTakenChange={setActionTaken}
          canSubmit={canSubmit}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  bottomSpacer: {
    height: 40,
  },
});
