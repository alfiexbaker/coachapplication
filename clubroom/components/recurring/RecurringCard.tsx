/**
 * RecurringCard — Composition root.
 * Displays a recurring booking subscription with pause/resume/cancel actions.
 */
import { useState, useCallback, memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { RecurringBooking } from '@/constants/types';
import { getFrequencyLabel } from '@/services/recurring-booking-service';
import { useTheme } from '@/hooks/useTheme';
import { getStatusColor } from './recurring-card-helpers';
import { RecurringConfirmModal } from './recurring-card-modals';
import { HeaderRow, ScheduleRow, StatsRow, ActionsRow } from './recurring-card-content';
import {
  getRecurringAthleteName,
  getRecurringCoachName,
  getRecurringUserName,
} from '@/utils/recurring-display';
import { uiFeedback } from '@/services/ui-feedback';

interface RecurringCardProps {
  recurring: RecurringBooking;
  onPause?: (id: string, reason?: string) => Promise<void>;
  onResume?: (id: string) => Promise<void>;
  onCancel?: (id: string, reason?: string) => Promise<void>;
  onPress?: (recurring: RecurringBooking) => void;
  loading?: boolean;
}

export const RecurringCard = memo(function RecurringCard({
  recurring,
  onPause,
  onResume,
  onCancel,
  onPress,
  loading = false,
}: RecurringCardProps) {
  const { colors: palette } = useTheme();
  const statusColor = getStatusColor(recurring.status, palette);
  const coachName = getRecurringCoachName(recurring);
  const athleteName = getRecurringAthleteName(recurring);
  const bookingUserName = getRecurringUserName(recurring);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handlePauseConfirm = useCallback(async () => {
    if (!onPause) return;
    setActionLoading(true);
    try {
      await onPause(recurring.id, pauseReason || undefined);
      setShowPauseModal(false);
      setPauseReason('');
    } finally {
      setActionLoading(false);
    }
  }, [onPause, recurring.id, pauseReason]);

  const handleCancelConfirm = useCallback(async () => {
    if (!onCancel) return;
    setActionLoading(true);
    try {
      await onCancel(recurring.id, cancelReason || undefined);
      setShowCancelModal(false);
      setCancelReason('');
    } finally {
      setActionLoading(false);
    }
  }, [onCancel, recurring.id, cancelReason]);

  const handleResume = useCallback(() => {
    if (!onResume) return;
    uiFeedback.showToast(
      `Resuming your ${getFrequencyLabel(recurring.frequency).toLowerCase()} sessions with ${coachName}.`,
      'success',
    );
    void (async () => {
      setActionLoading(true);
      try {
        await onResume(recurring.id);
      } finally {
        setActionLoading(false);
      }
    })();
  }, [onResume, recurring, coachName]);

  const handleCardPress = useCallback(() => onPress?.(recurring), [onPress, recurring]);

  const startDateLabel = new Date(recurring.startDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const freqLabel = getFrequencyLabel(recurring.frequency).toLowerCase();

  return (
    <>
      <SurfaceCard
        style={styles.card}
        onPress={handleCardPress}
        loading={loading || actionLoading}
        outlineGradient={
          recurring.status === 'ACTIVE' ? [statusColor, withAlpha(statusColor, 0.4)] : undefined
        }
      >
        <HeaderRow recurring={recurring} />
        <ScheduleRow recurring={recurring} />

        {/* Location */}
        <Row align="center" gap="xxs">
          <Ionicons name="location-outline" size={16} color={palette.icon} />
          <ThemedText style={styles.locationText} numberOfLines={1}>
            {recurring.location}
          </ThemedText>
        </Row>

        {/* Athlete Badge */}
        {athleteName && athleteName !== bookingUserName && (
          <Row
            align="center"
            gap="xxs"
            style={[styles.athleteBadge, { backgroundColor: withAlpha(palette.tint, 0.1) }]}
          >
            <Ionicons name="person" size={14} color={palette.tint} />
            <ThemedText style={[styles.athleteText, { color: palette.tint }]}>
              For: {athleteName}
            </ThemedText>
          </Row>
        )}

        <StatsRow recurring={recurring} startDateLabel={startDateLabel} />

        {/* Pause Reason */}
        {recurring.status === 'PAUSED' && recurring.pauseReason && (
          <Row
            align="center"
            gap="xs"
            style={[styles.reasonBox, { backgroundColor: withAlpha(palette.warning, 0.1) }]}
          >
            <Ionicons name="information-circle" size={16} color={palette.warning} />
            <ThemedText style={[styles.reasonText, { color: palette.warning }]}>
              Paused: {recurring.pauseReason}
            </ThemedText>
          </Row>
        )}

        <ActionsRow
          status={recurring.status}
          onPause={onPause ? () => setShowPauseModal(true) : undefined}
          onResume={onResume ? handleResume : undefined}
          onCancel={onCancel ? () => setShowCancelModal(true) : undefined}
        />
      </SurfaceCard>

      <RecurringConfirmModal
        visible={showPauseModal}
        title="Pause Subscription"
        description={`Your ${freqLabel} sessions with ${coachName} will be paused. You can resume anytime.`}
        reason={pauseReason}
        onReasonChange={setPauseReason}
        placeholder="Reason for pausing (optional)"
        confirmLabel="Pause Subscription"
        loadingLabel="Pausing..."
        loading={actionLoading}
        onConfirm={handlePauseConfirm}
        onCancel={() => setShowPauseModal(false)}
      />

      <RecurringConfirmModal
        visible={showCancelModal}
        title="Cancel Subscription"
        description={`Are you sure you want to cancel your ${freqLabel} sessions with ${coachName}? This cannot be undone.`}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        placeholder="Reason for cancelling (optional)"
        confirmLabel="Cancel Subscription"
        loadingLabel="Cancelling..."
        loading={actionLoading}
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelModal(false)}
        destructive
      />
    </>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.sm, gap: Spacing.sm },
  locationText: { ...Typography.small, flex: 1 },
  athleteBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  athleteText: { ...Typography.caption, fontWeight: '600' },
  reasonBox: { padding: Spacing.sm, borderRadius: Radii.sm },
  reasonText: { ...Typography.small, flex: 1 },
});
