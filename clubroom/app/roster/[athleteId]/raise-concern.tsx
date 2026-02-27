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
import { concernService, type ConcernType, type ConcernSeverity } from '@/services/concern-service';
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
  const { data, status, error, retry } = useScreen<{
    athleteName: string | null;
    parentId: string | null;
  }>({
    load: async () => {
      try {
        if (!athleteId) {
          return ok<{ athleteName: string | null; parentId: string | null }>({
            athleteName: null,
            parentId: null,
          });
        }
        const entry = await rosterService.getRosterEntry(coachId, athleteId);
        return ok<{ athleteName: string | null; parentId: string | null }>({
          athleteName: entry ? getRosterAthleteName(entry) : null,
          parentId: entry?.parentId ?? null,
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
  const parentId = data?.parentId ?? undefined;
  const canSubmit = type !== null && title.trim().length > 0 && description.trim().length > 0;
  const isEscalationRisk =
    severity === 'URGENT' ||
    (severity === 'HIGH' && (type === 'SAFEGUARDING' || type === 'MEDICAL'));
  const renderShell = (headerAthleteName: string, content: React.ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <RaiseConcernHeader colors={colors} athleteName={headerAthleteName} onBack={() => router.back()} />
      {content}
    </SafeAreaView>
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !type) return;
    if (isEscalationRisk && actionTaken.trim().length < 8) {
      Alert.alert(
        'Action required',
        'For high-risk concerns, include immediate action taken before submitting.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await concernService.raiseConcern({
        coachId,
        athleteId,
        parentId,
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
        const escalated = result.data.status === 'ESCALATED';
        Alert.alert(
          escalated ? 'Concern Escalated' : 'Concern Recorded',
          escalated
            ? `Your concern about ${athleteName} has been escalated for urgent follow-up.`
            : `Your concern about ${athleteName} has been recorded.`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Error', result.error.message);
      }
    } catch (submitError) {
      logger.error('Failed to submit concern', submitError);
      Alert.alert('Error', 'Failed to submit concern. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    type,
    isEscalationRisk,
    coachId,
    athleteId,
    parentId,
    athleteName,
    severity,
    title,
    description,
    actionTaken,
  ]);

  if (status === 'loading') {
    return renderShell('', <LoadingState variant="form" />);
  }

  if (status === 'error') {
    return renderShell(
      '',
      <ErrorState message={error?.message || 'Failed to load athlete details.'} onRetry={retry} />,
    );
  }

  if (status === 'empty') {
    return renderShell('', <ErrorState message="Athlete not found in your roster." onRetry={retry} />);
  }

  return renderShell(
    athleteName,
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
        isEscalationRisk={isEscalationRisk}
        canSubmit={canSubmit}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
      <View style={styles.bottomSpacer} />
    </ScrollView>,
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
