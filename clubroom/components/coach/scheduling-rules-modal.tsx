/**
 * SchedulingRulesModal — Composition root.
 * Coach scheduling rules editor modal with chip selectors, toggles, and cancellation policy.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, ScrollView, Alert, Platform, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { schedulingRulesService, POLICY_TEMPLATES } from '@/services/scheduling-rules-service';
import type { RefundTier } from '@/constants/types';

import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/toast';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';

import {
  ChipSection,
  ToggleCard,
  CancellationSection,
  SettingsSummary,
  type CancellationPreset,
} from './scheduling-rules-sections';
import { Row } from '@/components/primitives';

const logger = createLogger('SchedulingRulesModal');

const NOTICE_OPTIONS = [
  { value: 1, label: '1h' },
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

function detectPreset(tiers: RefundTier[]): CancellationPreset {
  for (const key of ['flexible', 'standard', 'strict'] as const) {
    const template = POLICY_TEMPLATES[key];
    if (template.tiers.length !== tiers.length) continue;
    const sorted = [...tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);
    const templateSorted = [...template.tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);
    const match = sorted.every(
      (t, i) =>
        t.hoursBeforeSession === templateSorted[i].hoursBeforeSession &&
        t.refundPercentage === templateSorted[i].refundPercentage,
    );
    if (match) return key;
  }
  return 'custom';
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
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [minimumAdvanceHours, setMinimumAdvanceHours] = useState(24);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [allowSameDayBookings, setAllowSameDayBookings] = useState(true);
  const [allowRescheduling, setAllowRescheduling] = useState(true);
  const [rescheduleDeadlineHours, setRescheduleDeadlineHours] = useState(24);
  const [cancellationPreset, setCancellationPreset] = useState<CancellationPreset>('standard');
  const [cancellationTiers, setCancellationTiers] = useState<RefundTier[]>(
    schedulingRulesService.getDefaultCancellationPolicy().tiers,
  );

  const loadRules = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [dataResult, policyResult] = await Promise.all([
        schedulingRulesService.getCoachRules(coachId),
        schedulingRulesService.getCancellationPolicy(coachId),
      ]);
      if (dataResult.success) {
        const data = dataResult.data;
        setMinimumAdvanceHours(Math.min(168, Math.max(1, data.minimumAdvanceBookingHours)));
        setMaxAdvanceDays(data.maxAdvanceBookingDays);
        setBufferMinutes(data.bufferMinutesDefault);
        setAllowSameDayBookings(data.allowSameDayBookings);
        setAllowRescheduling(data.allowRescheduling);
        setRescheduleDeadlineHours(data.rescheduleDeadlineHours);
      } else {
        logger.error('Failed to load coach scheduling rules', dataResult.error);
        setLoadError(dataResult.error.message || 'Failed to load booking rules.');
      }
      if (policyResult.success && policyResult.data) {
        const tiers = policyResult.data.tiers;
        setCancellationTiers(tiers);
        setCancellationPreset(detectPreset(tiers));
      } else if (policyResult.success) {
        const defaultTiers = schedulingRulesService.getDefaultCancellationPolicy().tiers;
        setCancellationTiers(defaultTiers);
        setCancellationPreset('standard');
      } else {
        logger.error('Failed to load cancellation policy', policyResult.error);
        setLoadError(
          (prev) => prev ?? (policyResult.error.message || 'Failed to load cancellation policy.'),
        );
      }
    } catch (error) {
      logger.error('Failed to load scheduling rules', error);
      setLoadError('Failed to load booking rules.');
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
      const templateKey = cancellationPreset === 'custom' ? 'custom' : cancellationPreset;
      const [rulesResult, policyResult] = await Promise.all([
        schedulingRulesService.updateCoachRules(coachId, {
          minimumAdvanceBookingHours: Math.min(168, Math.max(1, minimumAdvanceHours)),
          maxAdvanceBookingDays: maxAdvanceDays,
          bufferMinutesDefault: bufferMinutes,
          maxConcurrentDefault: 1,
          allowSameDayBookings,
          allowRescheduling,
          rescheduleDeadlineHours,
        }),
        schedulingRulesService.setCancellationPolicy(
          coachId,
          templateKey,
          templateKey === 'custom' ? cancellationTiers : undefined,
        ),
      ]);
      if (!rulesResult.success) {
        logger.error('Failed to save scheduling rules', rulesResult.error);
        showToast(rulesResult.error.message || 'Failed to save scheduling rules', 'error');
        return;
      }
      if (!policyResult.success) {
        logger.error('Failed to save cancellation policy', policyResult.error);
        showToast(policyResult.error.message || 'Failed to save cancellation policy', 'error');
        return;
      }
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Booking rules saved', 'success');
      onSaved?.();
      Keyboard.dismiss();
      onClose();
    } catch (error) {
      logger.error('Failed to save scheduling rules', error);
      showToast('Failed to save. Please try again.', 'error');
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
    cancellationPreset,
    cancellationTiers,
    onSaved,
    onClose,
  ]);

  const handlePresetChange = useCallback((preset: CancellationPreset) => {
    setCancellationPreset(preset);
    if (preset !== 'custom') {
      const template = POLICY_TEMPLATES[preset];
      if (template) setCancellationTiers([...template.tiers]);
    }
  }, []);

  const handleTiersChange = useCallback((tiers: RefundTier[]) => {
    setCancellationTiers(tiers);
    setCancellationPreset('custom');
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <Row style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={handleClose} disabled={saving}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">Booking Rules</ThemedText>
          <Clickable onPress={handleSave} disabled={saving || loading}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
              {saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </Clickable>
        </Row>

        {loading ? (
          <View style={styles.loadingWrap}>
            <LoadingState variant="form" />
          </View>
        ) : loadError ? (
          <View style={styles.loadingWrap}>
            <ErrorState message={loadError} onRetry={() => void loadRules()} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ChipSection
              icon="time-outline"
              iconColor={palette.warning}
              title="Minimum Notice"
              hint="Required time before session (recommended: 24h)"
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

            <CancellationSection
              tiers={cancellationTiers}
              selectedPreset={cancellationPreset}
              onPresetChange={handlePresetChange}
              onTiersChange={handleTiersChange}
            />

            <SettingsSummary
              minimumAdvanceHours={minimumAdvanceHours}
              bufferMinutes={bufferMinutes}
              maxAdvanceDays={maxAdvanceDays}
              allowSameDayBookings={allowSameDayBookings}
              cancellationTiers={cancellationTiers}
            />
          </ScrollView>
        )}
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
  loadingWrap: { flex: 1 },
});
