/**
 * SchedulingRulesModal — Composition root.
 * Coach scheduling rules editor modal with chip selectors, toggles, and cancellation policy.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { RefundTier } from '@/constants/types';

import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';

import {
  ChipSection,
  ToggleCard,
  CancellationSection,
  CANCELLATION_TIMEFRAMES,
  SettingsSummary,
} from './scheduling-rules-sections';
import { Row } from '@/components/primitives';

const logger = createLogger('SchedulingRulesModal');

const NOTICE_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 2, label: '2h' },
  { value: 6, label: '6h' },
  { value: 24, label: '24h' },
  { value: 48, label: '48h' },
  { value: 72, label: '3d' },
];
const BUFFER_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 10, label: '10m' },
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1h' },
];
const WINDOW_OPTIONS = [
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 60, label: '2 months' },
  { value: 90, label: '3 months' },
];

function deriveRefundForHours(hoursBeforeSession: number, tiers: RefundTier[]): number {
  const sorted = [...tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);
  for (const tier of sorted) {
    if (hoursBeforeSession >= tier.hoursBeforeSession) {
      return tier.refundPercentage;
    }
  }
  return sorted[sorted.length - 1]?.refundPercentage ?? 0;
}

function toTierDescription(hoursBeforeSession: number, refundPercentage: number): string {
  if (hoursBeforeSession === 0) {
    return `${refundPercentage}% refund at session start`;
  }
  return `${refundPercentage}% refund ${hoursBeforeSession}+ hours before`;
}

function buildEditableCancellationTiers(sourceTiers?: RefundTier[]): RefundTier[] {
  const baseTiers =
    sourceTiers && sourceTiers.length > 0
      ? sourceTiers
      : schedulingRulesService.getDefaultCancellationPolicy().tiers;

  return CANCELLATION_TIMEFRAMES.map((hoursBeforeSession) => {
    const refundPercentage = Math.round(deriveRefundForHours(hoursBeforeSession, baseTiers) / 5) * 5;
    return {
      hoursBeforeSession,
      refundPercentage: Math.max(0, Math.min(100, refundPercentage)),
      description: toTierDescription(hoursBeforeSession, refundPercentage),
    };
  });
}

interface SchedulingRulesModalProps {
  visible: boolean;
  onClose: () => void;
  coachId: string;
  onSaved?: () => void;
}

export function SchedulingRulesModal({
  visible,
  onClose,
  coachId,
  onSaved,
}: SchedulingRulesModalProps) {
  const { colors: palette } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minimumAdvanceHours, setMinimumAdvanceHours] = useState(24);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [allowSameDayBookings, setAllowSameDayBookings] = useState(true);
  const [allowRescheduling, setAllowRescheduling] = useState(true);
  const [rescheduleDeadlineHours, setRescheduleDeadlineHours] = useState(24);
  const [cancellationTiers, setCancellationTiers] = useState<RefundTier[]>(
    buildEditableCancellationTiers(schedulingRulesService.getDefaultCancellationPolicy().tiers),
  );

  const loadRules = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      const [dataResult, policyResult] = await Promise.all([
        schedulingRulesService.getCoachRules(coachId),
        schedulingRulesService.getCancellationPolicy(coachId),
      ]);
      if (dataResult.success) {
        const data = dataResult.data;
        setMinimumAdvanceHours(data.minimumAdvanceBookingHours);
        setMaxAdvanceDays(data.maxAdvanceBookingDays);
        setBufferMinutes(data.bufferMinutesDefault);
        setAllowSameDayBookings(data.allowSameDayBookings);
        setAllowRescheduling(data.allowRescheduling);
        setRescheduleDeadlineHours(data.rescheduleDeadlineHours);
      } else {
        logger.error('Failed to load coach scheduling rules', dataResult.error);
      }
      if (policyResult.success && policyResult.data) {
        setCancellationTiers(buildEditableCancellationTiers(policyResult.data.tiers));
      } else if (policyResult.success) {
        setCancellationTiers(
          buildEditableCancellationTiers(schedulingRulesService.getDefaultCancellationPolicy().tiers),
        );
      } else if (!policyResult.success) {
        logger.error('Failed to load cancellation policy', policyResult.error);
      }
    } catch (error) {
      logger.error('Failed to load scheduling rules', error);
    } finally {
      setLoading(false);
    }
  }, [coachId, visible]);

  useEffect(() => {
    if (visible) loadRules();
  }, [visible, loadRules]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const [rulesResult, policyResult] = await Promise.all([
        schedulingRulesService.updateCoachRules(coachId, {
          minimumAdvanceBookingHours: minimumAdvanceHours,
          maxAdvanceBookingDays: maxAdvanceDays,
          bufferMinutesDefault: bufferMinutes,
          maxConcurrentDefault: 1,
          allowSameDayBookings,
          allowRescheduling,
          rescheduleDeadlineHours,
        }),
        schedulingRulesService.setCancellationPolicy(coachId, 'custom', cancellationTiers),
      ]);
      if (!rulesResult.success) {
        logger.error('Failed to save scheduling rules', rulesResult.error);
        Alert.alert('Error', 'Failed to save scheduling rules. Please try again.');
        return;
      }
      if (!policyResult.success) {
        logger.error('Failed to save cancellation policy', policyResult.error);
        Alert.alert('Error', 'Failed to save cancellation policy. Please try again.');
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.();
      onClose();
    } catch (error) {
      logger.error('Failed to save scheduling rules', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    coachId,
    minimumAdvanceHours,
    maxAdvanceDays,
    bufferMinutes,
    allowSameDayBookings,
    allowRescheduling,
    rescheduleDeadlineHours,
    cancellationTiers,
    onSaved,
    onClose,
  ]);

  const handleTierChange = useCallback((hoursBeforeSession: number, refundPercentage: number) => {
    const roundedRefund = Math.max(0, Math.min(100, Math.round(refundPercentage / 5) * 5));
    setCancellationTiers((prev) =>
      prev.map((tier) =>
        tier.hoursBeforeSession === hoursBeforeSession
          ? {
              ...tier,
              refundPercentage: roundedRefund,
              description: toTierDescription(hoursBeforeSession, roundedRefund),
            }
          : tier,
      ),
    );
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <Row style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={onClose} disabled={saving}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">Booking Rules</ThemedText>
          <Clickable onPress={handleSave} disabled={saving || loading}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
              {saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </Clickable>
        </Row>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ChipSection
            icon="time-outline"
            iconColor={palette.warning}
            title="Minimum Notice"
            hint="Required time before session"
            options={NOTICE_OPTIONS}
            selected={minimumAdvanceHours}
            onSelect={setMinimumAdvanceHours}
            compact
          />
          <ChipSection
            icon="pause-outline"
            iconColor={palette.tint}
            title="Buffer Between Sessions"
            hint="Break time between bookings"
            options={BUFFER_OPTIONS}
            selected={bufferMinutes}
            onSelect={setBufferMinutes}
            compact
          />
          <ChipSection
            icon="calendar-outline"
            iconColor={palette.success}
            title="Booking Window"
            hint="How far ahead can they book?"
            options={WINDOW_OPTIONS}
            selected={maxAdvanceDays}
            onSelect={setMaxAdvanceDays}
          />

          <ToggleCard
            allowSameDayBookings={allowSameDayBookings}
            allowRescheduling={allowRescheduling}
            rescheduleDeadlineHours={rescheduleDeadlineHours}
            onSameDayChange={setAllowSameDayBookings}
            onRescheduleChange={setAllowRescheduling}
            onDeadlineChange={setRescheduleDeadlineHours}
          />

          <CancellationSection tiers={cancellationTiers} onTierChange={handleTierChange} />

          <SettingsSummary
            minimumAdvanceHours={minimumAdvanceHours}
            bufferMinutes={bufferMinutes}
            maxAdvanceDays={maxAdvanceDays}
            allowSameDayBookings={allowSameDayBookings}
            cancellationTiers={cancellationTiers}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing['2xl'] },
});
