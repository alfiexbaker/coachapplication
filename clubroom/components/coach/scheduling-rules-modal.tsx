import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { schedulingRulesService, POLICY_TEMPLATES } from '@/services/scheduling-rules-service';
import type { CancellationPolicy } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';

const logger = createLogger('SchedulingRulesModal');

// Compact options for modal layout
const NOTICE_OPTIONS = [
  { value: 0, label: 'None', short: true },
  { value: 2, label: '2h', short: true },
  { value: 6, label: '6h', short: true },
  { value: 24, label: '24h', short: true },
  { value: 48, label: '48h', short: true },
  { value: 72, label: '3d', short: true },
];

const BUFFER_OPTIONS = [
  { value: 0, label: 'None', short: true },
  { value: 10, label: '10m', short: true },
  { value: 15, label: '15m', short: true },
  { value: 30, label: '30m', short: true },
  { value: 45, label: '45m', short: true },
  { value: 60, label: '1h', short: true },
];

const BOOKING_WINDOW_OPTIONS = [
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 60, label: '2 months' },
  { value: 90, label: '3 months' },
];

const RESCHEDULE_OPTIONS = [
  { value: 2, label: '2h before' },
  { value: 6, label: '6h before' },
  { value: 24, label: '24h before' },
  { value: 48, label: '48h before' },
];

interface OptionChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  compact?: boolean;
}

function OptionChip({ label, isSelected, onPress, compact }: OptionChipProps) {
  const { colors: palette } = useTheme();

  return (
    <Clickable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        compact ? styles.compactChip : styles.optionChip,
        {
          backgroundColor: isSelected ? palette.tint : palette.surface,
          borderColor: isSelected ? palette.tint : palette.border,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.chipText,
          { color: isSelected ? palette.onPrimary : palette.text, fontSize: compact ? 13 : 14 },
        ]}
      >
        {label}
      </ThemedText>
    </Clickable>
  );
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

  // Form state
  const [minimumAdvanceHours, setMinimumAdvanceHours] = useState(24);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [allowSameDayBookings, setAllowSameDayBookings] = useState(true);
  const [allowRescheduling, setAllowRescheduling] = useState(true);
  const [rescheduleDeadlineHours, setRescheduleDeadlineHours] = useState(24);
  const [cancellationPreset, setCancellationPreset] = useState<string>('standard');
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | null>(null);

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
        setCancellationPolicy(policy);
        // Detect which preset matches
        const pName = policy.name.toLowerCase();
        if (pName === 'flexible' || pName === 'standard' || pName === 'strict') {
          setCancellationPreset(pName);
        } else {
          setCancellationPreset('standard');
        }
      }
    } catch (error) {
      logger.error('Failed to load scheduling rules', error);
    } finally {
      setLoading(false);
    }
  }, [coachId, visible]);

  useEffect(() => {
    if (visible) {
      loadRules();
    }
  }, [visible, loadRules]);

  const handleCancellationPresetChange = async (preset: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCancellationPreset(preset);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        schedulingRulesService.updateCoachRules(coachId, {
          minimumAdvanceBookingHours: minimumAdvanceHours,
          maxAdvanceBookingDays: maxAdvanceDays,
          bufferMinutesDefault: bufferMinutes,
          maxConcurrentDefault: 1,
          allowSameDayBookings,
          allowRescheduling,
          rescheduleDeadlineHours,
        }),
        schedulingRulesService.setCancellationPolicy(
          coachId,
          cancellationPreset as keyof typeof POLICY_TEMPLATES,
        ),
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
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={onClose} disabled={saving}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">Scheduling Rules</ThemedText>
          <Clickable onPress={handleSave} disabled={saving || loading}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
              {saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </Clickable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Summary */}
          <View style={[styles.summaryBanner, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
            <Ionicons name="information-circle" size={20} color={palette.tint} />
            <ThemedText style={[styles.summaryText, { color: palette.muted }]}>
              These rules control how athletes can book sessions with you
            </ThemedText>
          </View>

          {/* Minimum Notice */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                <Ionicons name="time-outline" size={18} color={palette.warning} />
              </View>
              <View style={styles.sectionTitleWrap}>
                <ThemedText type="defaultSemiBold">Minimum Notice</ThemedText>
                <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                  Required time before session
                </ThemedText>
              </View>
            </View>
            <View style={styles.chipRow}>
              {NOTICE_OPTIONS.map((opt) => (
                <OptionChip
                  key={opt.value}
                  label={opt.label}
                  isSelected={minimumAdvanceHours === opt.value}
                  onPress={() => setMinimumAdvanceHours(opt.value)}
                  compact
                />
              ))}
            </View>
          </View>

          {/* Buffer Time */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <Ionicons name="pause-outline" size={18} color={palette.tint} />
              </View>
              <View style={styles.sectionTitleWrap}>
                <ThemedText type="defaultSemiBold">Buffer Between Sessions</ThemedText>
                <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                  Break time between bookings
                </ThemedText>
              </View>
            </View>
            <View style={styles.chipRow}>
              {BUFFER_OPTIONS.map((opt) => (
                <OptionChip
                  key={opt.value}
                  label={opt.label}
                  isSelected={bufferMinutes === opt.value}
                  onPress={() => setBufferMinutes(opt.value)}
                  compact
                />
              ))}
            </View>
          </View>

          {/* Booking Window */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                <Ionicons name="calendar-outline" size={18} color={palette.success} />
              </View>
              <View style={styles.sectionTitleWrap}>
                <ThemedText type="defaultSemiBold">Booking Window</ThemedText>
                <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                  How far ahead can they book?
                </ThemedText>
              </View>
            </View>
            <View style={styles.chipRow}>
              {BOOKING_WINDOW_OPTIONS.map((opt) => (
                <OptionChip
                  key={opt.value}
                  label={opt.label}
                  isSelected={maxAdvanceDays === opt.value}
                  onPress={() => setMaxAdvanceDays(opt.value)}
                />
              ))}
            </View>
          </View>

          {/* Toggles */}
          <SurfaceCard style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={[styles.toggleIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                  <Ionicons name="today-outline" size={16} color={palette.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>Same-Day Bookings</ThemedText>
                  <ThemedText style={[styles.toggleHint, { color: palette.muted }]}>
                    Allow booking for today
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={allowSameDayBookings}
                onValueChange={(value) => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAllowSameDayBookings(value);
                }}
                trackColor={{ false: palette.border, true: palette.success }}
                thumbColor={palette.surface}
              />
            </View>

            <Divider spacing={Spacing.md} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={[styles.toggleIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                  <Ionicons name="swap-horizontal-outline" size={16} color={palette.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>Allow Rescheduling</ThemedText>
                  <ThemedText style={[styles.toggleHint, { color: palette.muted }]}>
                    Let athletes change booking time
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={allowRescheduling}
                onValueChange={(value) => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAllowRescheduling(value);
                }}
                trackColor={{ false: palette.border, true: palette.tint }}
                thumbColor={palette.surface}
              />
            </View>

            {allowRescheduling && (
              <>
                <Divider spacing={Spacing.md} />
                <View style={styles.rescheduleSection}>
                  <ThemedText style={[styles.rescheduleLabel, { color: palette.muted }]}>
                    Reschedule deadline:
                  </ThemedText>
                  <View style={styles.rescheduleChips}>
                    {RESCHEDULE_OPTIONS.map((opt) => (
                      <OptionChip
                        key={opt.value}
                        label={opt.label}
                        isSelected={rescheduleDeadlineHours === opt.value}
                        onPress={() => setRescheduleDeadlineHours(opt.value)}
                        compact
                      />
                    ))}
                  </View>
                </View>
              </>
            )}
          </SurfaceCard>

          {/* Cancellation Policy */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                <Ionicons name="shield-outline" size={18} color={palette.error} />
              </View>
              <View style={styles.sectionTitleWrap}>
                <ThemedText type="defaultSemiBold">Cancellation Policy</ThemedText>
                <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                  Refund rules when athletes cancel
                </ThemedText>
              </View>
            </View>
            <View style={styles.chipRow}>
              {(['flexible', 'standard', 'strict'] as const).map((key) => {
                const tmpl = POLICY_TEMPLATES[key];
                const isSelected = cancellationPreset === key;
                return (
                  <Clickable
                    key={key}
                    onPress={() => handleCancellationPresetChange(key)}
                    style={[
                      styles.policyChip,
                      {
                        backgroundColor: isSelected ? palette.tint : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.policyChipName,
                        { color: isSelected ? palette.onPrimary : palette.text },
                      ]}
                    >
                      {tmpl.name}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.policyChipDesc,
                        { color: isSelected ? withAlpha(palette.onPrimary, 0.7) : palette.muted },
                      ]}
                      numberOfLines={2}
                    >
                      {tmpl.description}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </View>

            {/* Tier summary for selected policy */}
            <View style={[styles.tierSummary, { backgroundColor: palette.surface }]}>
              {POLICY_TEMPLATES[cancellationPreset]?.tiers.map((tier, i) => {
                const color = tier.refundPercentage >= 75 ? palette.success
                  : tier.refundPercentage >= 25 ? palette.warning
                  : palette.error;
                return (
                  <View key={i} style={styles.tierRow}>
                    <View style={[styles.tierDot, { backgroundColor: color }]} />
                    <ThemedText style={[styles.tierText, { color: palette.text }]}>
                      {tier.refundPercentage}% refund
                    </ThemedText>
                    <ThemedText style={[styles.tierHint, { color: palette.muted }]}>
                      {tier.hoursBeforeSession}h+ before
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Current Settings Summary */}
          <SurfaceCard style={[styles.currentSettings, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>
              Current Settings
            </ThemedText>
            <View style={styles.settingsList}>
              <View style={styles.settingItem}>
                <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                <ThemedText style={styles.settingText}>
                  {minimumAdvanceHours === 0 ? 'No minimum notice' : `${minimumAdvanceHours}h minimum notice`}
                </ThemedText>
              </View>
              <View style={styles.settingItem}>
                <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                <ThemedText style={styles.settingText}>
                  {bufferMinutes === 0 ? 'No buffer' : `${bufferMinutes}m buffer between sessions`}
                </ThemedText>
              </View>
              <View style={styles.settingItem}>
                <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                <ThemedText style={styles.settingText}>
                  Book up to {maxAdvanceDays} days ahead
                </ThemedText>
              </View>
              <View style={styles.settingItem}>
                <Ionicons
                  name={allowSameDayBookings ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={allowSameDayBookings ? palette.success : palette.muted}
                />
                <ThemedText style={styles.settingText}>
                  Same-day {allowSameDayBookings ? 'allowed' : 'not allowed'}
                </ThemedText>
              </View>
              <View style={styles.settingItem}>
                <Ionicons name="shield-checkmark" size={14} color={palette.success} />
                <ThemedText style={styles.settingText}>
                  {POLICY_TEMPLATES[cancellationPreset]?.name || 'Standard'} cancellation policy
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  summaryText: { ...Typography.small, flex: 1 },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionHint: { ...Typography.caption },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  compactChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minWidth: 50,
    alignItems: 'center',
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  chipText: {
    fontWeight: '600',
  },
  toggleCard: {
    padding: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  toggleIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleHint: { ...Typography.caption },
  rescheduleSection: {
    gap: Spacing.sm,
  },
  rescheduleLabel: { ...Typography.caption },
  rescheduleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  currentSettings: {
    padding: Spacing.md,
  },
  settingsList: {
    gap: Spacing.xs,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingText: { ...Typography.small },
  // Cancellation policy
  policyChip: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: Spacing.xxs,
    minWidth: 90,
  },
  policyChipName: {
    ...Typography.smallSemiBold,
  },
  policyChipDesc: {
    ...Typography.micro,
    textAlign: 'center',
  },
  tierSummary: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierText: {
    ...Typography.smallSemiBold,
    minWidth: 80,
  },
  tierHint: {
    ...Typography.micro,
  },
});
