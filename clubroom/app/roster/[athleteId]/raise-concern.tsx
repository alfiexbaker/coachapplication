/**
 * Raise Concern Screen
 *
 * Allows coaches to flag incidents, behavioral issues, or safeguarding
 * concerns about an athlete.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
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
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { RaiseConcernHeader } from '@/components/roster/raise-concern-header';
import { RaiseConcernForm } from '@/components/roster/raise-concern-form';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('RaiseConcern');

function toConcernLoadError(error: unknown): ServiceError {
  if (error && typeof error === 'object') {
    const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
    if (typeof candidate.code === 'string' && typeof candidate.message === 'string') {
      return candidate as ServiceError;
    }
  }
  return serviceError('UNKNOWN', 'Failed to load athlete details.', error);
}

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

  const coachId = currentUser?.id ?? null;
  const hasVerifiedCoachAccess =
    Boolean(coachId) && currentUser?.role === 'COACH' && currentUser.isVerified;
  const { data, status, error, retry } = useScreen<{
    athleteName: string | null;
    parentId: string | null;
  }>({
    load: async () => {
      if (!coachId || !hasVerifiedCoachAccess) {
        return err(
          serviceError(
            'UNAUTHORIZED',
            'A verified coach account is required to raise a concern for a player.',
          ),
        );
      }

      try {
        if (!athleteId) {
          return err(serviceError('NOT_FOUND', 'This player is not available from your roster.'));
        }
        const entry = await rosterService.getRosterEntry(coachId, athleteId);
        if (!entry) {
          return err(serviceError('NOT_FOUND', 'This player is not available from your roster.'));
        }
        return ok<{ athleteName: string | null; parentId: string | null }>({
          athleteName: getRosterAthleteName(entry),
          parentId: entry.parentId ?? null,
        });
      } catch (loadError) {
        return err(toConcernLoadError(loadError));
      }
    },
    deps: [coachId, athleteId, currentUser?.role, currentUser?.isVerified],
    isEmpty: (value) => !value.athleteName,
    refetchOnFocus: true,
    dataKey: `raise-concern:${coachId ?? 'missing'}:${currentUser?.isVerified ? 'verified' : 'unverified'}:${athleteId ?? 'missing'}`,
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
      <RaiseConcernHeader
        colors={colors}
        athleteName={headerAthleteName}
        onBack={() => router.back()}
      />
      {content}
    </SafeAreaView>
  );

  const handleSubmit = async () => {
    if (!canSubmit || !type) return;
    if (!coachId || !hasVerifiedCoachAccess || !athleteId) {
      uiFeedback.showToast(
        'A verified coach account is required to raise a concern for a player.',
        'error',
      );
      return;
    }
    if (isEscalationRisk && actionTaken.trim().length < 8) {
      uiFeedback.showToast(
        'For high-risk concerns, include immediate action taken before submitting.',
        'error',
      );
      return;
    }

    setSubmitting(true);

    await runAsyncTryCatchFinally(
      async () => {
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
          uiFeedback.showToast(
            escalated
              ? `Your concern about ${athleteName} has been escalated for urgent follow-up.`
              : `Your concern about ${athleteName} has been recorded.`,
          );
          router.back();
        } else {
          uiFeedback.showToast(result.error.message, 'error');
        }
      },
      async (submitError) => {
        logger.error('Failed to submit concern', submitError);
        uiFeedback.showToast('Failed to submit concern. Please try again.', 'error');
      },
      () => {
        setSubmitting(false);
      },
    );
  };

  if (status === 'loading') {
    return renderShell('', <LoadingState variant="form" />);
  }

  if (status === 'error') {
    const terminalAccessError = error?.code === 'NOT_FOUND' || error?.code === 'UNAUTHORIZED';
    return renderShell(
      '',
      <ErrorState
        title={terminalAccessError ? 'Concern access unavailable' : undefined}
        message={
          error?.code === 'UNAUTHORIZED'
            ? 'A verified coach account is required to raise a concern for a player.'
            : terminalAccessError
              ? 'This player is not available from your roster.'
              : error?.message || 'Failed to load player details.'
        }
        onRetry={terminalAccessError ? undefined : retry}
      />,
    );
  }

  if (status === 'empty') {
    return renderShell(
      '',
      <ErrorState
        title="Concern access unavailable"
        message="This player is not available from your roster."
      />,
    );
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
