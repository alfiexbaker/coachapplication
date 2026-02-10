/**
 * SchedulingRulesModal — Composition root.
 * Coach scheduling rules editor modal with chip selectors, toggles, and cancellation policy.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, withAlpha } from '@/constants/theme';
import { schedulingRulesService, POLICY_TEMPLATES } from '@/services/scheduling-rules-service';
import type { CancellationPolicy } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';

import { ChipSection, ToggleCard, CancellationSection, SettingsSummary } from './scheduling-rules-sections';
import { Row } from '@/components/primitives';

const logger = createLogger('SchedulingRulesModal');

const NOTICE_OPTIONS = [
  { value: 0, label: 'None' }, { value: 2, label: '2h' }, { value: 6, label: '6h' },
  { value: 24, label: '24h' }, { value: 48, label: '48h' }, { value: 72, label: '3d' },
];
const BUFFER_OPTIONS = [
  { value: 0, label: 'None' }, { value: 10, label: '10m' }, { value: 15, label: '15m' },
  { value: 30, label: '30m' }, { value: 45, label: '45m' }, { value: 60, label: '1h' },
];
const WINDOW_OPTIONS = [
  { value: 7, label: '1 week' }, { value: 14, label: '2 weeks' }, { value: 30, label: '1 month' },
  { value: 60, label: '2 months' }, { value: 90, label: '3 months' },
];

interface SchedulingRulesModalProps {
  visible: boolean;
  onClose: () => void;
  coachId: string;
  onSaved?: () => void;
}

export function SchedulingRulesModal({ visible, onClose, coachId, onSaved }: SchedulingRulesModalProps) {
  const { colors: palette } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minimumAdvanceHours, setMinimumAdvanceHours] = useState(24);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [allowSameDayBookings, setAllowSameDayBookings] = useState(true);
  const [allowRescheduling, setAllowRescheduling] = useState(true);
  const [rescheduleDeadlineHours, setRescheduleDeadlineHours] = useState(24);
  const [cancellationPreset, setCancellationPreset] = useState('standard');

  const loadRules = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      const [data, policy] = await Promise.all([
        schedulingRulesService.getCoachRules(coachId),
        schedulingRulesService.getCancellationPolicy(coachId),
      ]);
      if (data) {
        setMinimumAdvanceHours(data.minimumAdvanceBookingHours);
        setMaxAdvanceDays(data.maxAdvanceBookingDays);
        setBufferMinutes(data.bufferMinutesDefault);
        setAllowSameDayBookings(data.allowSameDayBookings);
        setAllowRescheduling(data.allowRescheduling);
        setRescheduleDeadlineHours(data.rescheduleDeadlineHours);
      }
      if (policy) {
        const pName = policy.name.toLowerCase();
        setCancellationPreset(pName === 'flexible' || pName === 'standard' || pName === 'strict' ? pName : 'standard');
      }
    } catch (error) {
      logger.error('Failed to load scheduling rules', error);
    } finally {
      setLoading(false);
    }
  }, [coachId, visible]);

  useEffect(() => { if (visible) loadRules(); }, [visible, loadRules]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await Promise.all([
        schedulingRulesService.updateCoachRules(coachId, {
          minimumAdvanceBookingHours: minimumAdvanceHours, maxAdvanceBookingDays: maxAdvanceDays,
          bufferMinutesDefault: bufferMinutes, maxConcurrentDefault: 1,
          allowSameDayBookings, allowRescheduling, rescheduleDeadlineHours,
        }),
        schedulingRulesService.setCancellationPolicy(coachId, cancellationPreset as keyof typeof POLICY_TEMPLATES),
      ]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.();
      onClose();
    } catch (error) {
      logger.error('Failed to save scheduling rules', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [coachId, minimumAdvanceHours, maxAdvanceDays, bufferMinutes, allowSameDayBookings, allowRescheduling, rescheduleDeadlineHours, cancellationPreset, onSaved, onClose]);

  const handlePresetChange = useCallback((preset: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCancellationPreset(preset);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <Row style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={onClose} disabled={saving}><ThemedText style={{ color: palette.muted }}>Cancel</ThemedText></Clickable>
          <ThemedText type="subtitle">Scheduling Rules</ThemedText>
          <Clickable onPress={handleSave} disabled={saving || loading}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>{saving ? 'Saving...' : 'Save'}</ThemedText>
          </Clickable>
        </Row>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Row style={[styles.summaryBanner, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
            <Ionicons name="information-circle" size={20} color={palette.tint} />
            <ThemedText style={[styles.summaryText, { color: palette.muted }]}>These rules control how athletes can book sessions with you</ThemedText>
          </Row>

          <ChipSection icon="time-outline" iconColor={palette.warning} title="Minimum Notice" hint="Required time before session" options={NOTICE_OPTIONS} selected={minimumAdvanceHours} onSelect={setMinimumAdvanceHours} compact />
          <ChipSection icon="pause-outline" iconColor={palette.tint} title="Buffer Between Sessions" hint="Break time between bookings" options={BUFFER_OPTIONS} selected={bufferMinutes} onSelect={setBufferMinutes} compact />
          <ChipSection icon="calendar-outline" iconColor={palette.success} title="Booking Window" hint="How far ahead can they book?" options={WINDOW_OPTIONS} selected={maxAdvanceDays} onSelect={setMaxAdvanceDays} />

          <ToggleCard allowSameDayBookings={allowSameDayBookings} allowRescheduling={allowRescheduling} rescheduleDeadlineHours={rescheduleDeadlineHours}
            onSameDayChange={setAllowSameDayBookings} onRescheduleChange={setAllowRescheduling} onDeadlineChange={setRescheduleDeadlineHours} />

          <CancellationSection preset={cancellationPreset} onPresetChange={handlePresetChange} />

          <SettingsSummary minimumAdvanceHours={minimumAdvanceHours} bufferMinutes={bufferMinutes}
            maxAdvanceDays={maxAdvanceDays} allowSameDayBookings={allowSameDayBookings} cancellationPreset={cancellationPreset} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing['2xl'] },
  summaryBanner: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: 12 },
  summaryText: { fontSize: 13, lineHeight: 20, flex: 1 },
});
