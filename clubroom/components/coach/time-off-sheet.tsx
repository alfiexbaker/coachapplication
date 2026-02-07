/**
 * Time Off Sheet
 *
 * Bottom sheet for marking time off (single day or date range).
 * Uses availabilityService.blockDate/unblockDate/checkConflicts.
 */

import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilityOverride } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';

const logger = createLogger('TimeOffSheet');

const REASONS = [
  { id: 'holiday', label: 'Holiday', icon: 'airplane-outline' as const },
  { id: 'sick', label: 'Sick Day', icon: 'medical-outline' as const },
  { id: 'personal', label: 'Personal', icon: 'person-outline' as const },
  { id: 'training', label: 'Training', icon: 'school-outline' as const },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getDaysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function expandDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(toDateStr(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

interface TimeOffSheetProps {
  visible: boolean;
  onClose: () => void;
  coachId: string;
  preselectedDate?: string;
  existingOverride?: AvailabilityOverride | null;
  onSaved: () => void | Promise<void>;
}

export function TimeOffSheet({
  visible,
  onClose,
  coachId,
  preselectedDate,
  existingOverride,
  onSaved,
}: TimeOffSheetProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reason, setReason] = useState('holiday');
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [conflicts, setConflicts] = useState<{
    bookingCount: number;
    holdCount: number;
    bookings: { id: string; date: string; time: string; athleteName?: string }[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const hapticTap = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Reset form when opening
  useEffect(() => {
    if (visible) {
      if (preselectedDate) {
        const d = new Date(preselectedDate + 'T12:00:00');
        setStartDate(d);
        setEndDate(d);
        setMode('single');
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setStartDate(tomorrow);
        setEndDate(tomorrow);
        setMode('single');
      }
      if (existingOverride?.reason) {
        const match = REASONS.find(r => r.label === existingOverride.reason || r.id === existingOverride.reason);
        setReason(match?.id || 'holiday');
      } else {
        setReason('holiday');
      }
      setStep('form');
      setConflicts(null);
    }
  }, [visible, preselectedDate, existingOverride]);

  const isSameDay = toDateStr(startDate) === toDateStr(endDate);
  const dayCount = getDaysBetween(startDate, endDate);
  const isEditing = !!existingOverride;

  const adjustDate = (target: 'start' | 'end', days: number) => {
    hapticTap();
    if (target === 'start') {
      const newDate = new Date(startDate);
      newDate.setDate(newDate.getDate() + days);
      setStartDate(newDate);
      if (newDate > endDate) setEndDate(newDate);
    } else {
      const newDate = new Date(endDate);
      newDate.setDate(newDate.getDate() + days);
      if (newDate >= startDate) setEndDate(newDate);
    }
  };

  const handleCheckConflicts = async () => {
    hapticTap();
    setChecking(true);
    try {
      const dates = expandDateRange(startDate, endDate);
      const result = await availabilityService.checkConflicts(coachId, dates);
      setConflicts(result);
      setStep('confirm');
    } catch (error) {
      logger.error('Failed to check conflicts', error);
      Alert.alert('Error', 'Failed to check for conflicts.');
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dates = expandDateRange(startDate, endDate);
      const reasonLabel = REASONS.find(r => r.id === reason)?.label || reason;

      for (const date of dates) {
        await availabilityService.blockDate(coachId, date, reasonLabel);
      }

      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      await onSaved();
    } catch (error) {
      logger.error('Failed to save time off', error);
      Alert.alert('Error', 'Failed to save time off. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    if (!existingOverride) return;
    Alert.alert(
      'Remove Time Off?',
      `This will make ${formatDate(new Date(existingOverride.date + 'T12:00:00'))} available again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await availabilityService.unblockDate(coachId, existingOverride.date);
              if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onClose();
              await onSaved();
            } catch (error) {
              logger.error('Failed to remove time off', error);
              Alert.alert('Error', 'Failed to remove time off.');
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setStep('form');
    setConflicts(null);
    onClose();
  };

  // Quick date options
  const quickDates = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
    return [
      { label: 'Tomorrow', date: tomorrow },
      { label: 'Next Mon', date: nextMonday },
    ];
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle">
              {isEditing ? 'Time Off' : 'Take Time Off'}
            </ThemedText>
            <Clickable onPress={handleClose}>
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </View>

          {step === 'form' ? (
            <View style={styles.formContent}>
              {/* Mode Toggle */}
              {!isEditing && (
                <View style={styles.modeRow}>
                  {(['single', 'range'] as const).map((m) => {
                    const isActive = mode === m;
                    return (
                      <Clickable
                        key={m}
                        onPress={() => {
                          hapticTap();
                          setMode(m);
                          if (m === 'single') setEndDate(startDate);
                        }}
                        style={[
                          styles.modeBtn,
                          {
                            backgroundColor: isActive ? palette.tint : palette.background,
                            borderColor: isActive ? palette.tint : palette.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={m === 'single' ? 'today-outline' : 'calendar-outline'}
                          size={16}
                          color={isActive ? palette.onPrimary : palette.muted}
                        />
                        <ThemedText style={[styles.modeBtnText, { color: isActive ? palette.onPrimary : palette.text }]}>
                          {m === 'single' ? 'Single Day' : 'Date Range'}
                        </ThemedText>
                      </Clickable>
                    );
                  })}
                </View>
              )}

              {/* Quick Dates (single mode only, not editing) */}
              {mode === 'single' && !isEditing && (
                <View style={styles.quickRow}>
                  {quickDates.map((qd) => {
                    const isSelected = toDateStr(startDate) === toDateStr(qd.date);
                    return (
                      <Clickable
                        key={qd.label}
                        onPress={() => {
                          hapticTap();
                          setStartDate(qd.date);
                          setEndDate(qd.date);
                        }}
                        style={[
                          styles.quickChip,
                          {
                            backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.background,
                            borderColor: isSelected ? palette.tint : palette.border,
                          },
                        ]}
                      >
                        <ThemedText style={[styles.quickChipText, { color: isSelected ? palette.tint : palette.text }]}>
                          {qd.label}
                        </ThemedText>
                      </Clickable>
                    );
                  })}
                </View>
              )}

              {/* Date Selector */}
              <SurfaceCard style={styles.dateCard}>
                <View style={styles.dateRow}>
                  <View style={[styles.dateIconCircle, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                    <Ionicons name="calendar" size={18} color={palette.tint} />
                  </View>
                  <View style={styles.dateInfo}>
                    <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>
                      {mode === 'single' ? 'Date' : 'From'}
                    </ThemedText>
                    <ThemedText type="defaultSemiBold">{formatDate(startDate)}</ThemedText>
                  </View>
                  {!isEditing && (
                    <View style={styles.dateAdjust}>
                      <Clickable onPress={() => adjustDate('start', -1)} style={[styles.adjustBtn, { borderColor: palette.border }]}>
                        <Ionicons name="chevron-back" size={16} color={palette.text} />
                      </Clickable>
                      <Clickable onPress={() => adjustDate('start', 1)} style={[styles.adjustBtn, { borderColor: palette.border }]}>
                        <Ionicons name="chevron-forward" size={16} color={palette.text} />
                      </Clickable>
                    </View>
                  )}
                </View>

                {mode === 'range' && (
                  <>
                    <View style={[styles.dateDivider, { backgroundColor: palette.border }]} />
                    <View style={styles.dateRow}>
                      <View style={[styles.dateIconCircle, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                        <Ionicons name="calendar" size={18} color={palette.error} />
                      </View>
                      <View style={styles.dateInfo}>
                        <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>To</ThemedText>
                        <ThemedText type="defaultSemiBold">{formatDate(endDate)}</ThemedText>
                      </View>
                      <View style={styles.dateAdjust}>
                        <Clickable onPress={() => adjustDate('end', -1)} style={[styles.adjustBtn, { borderColor: palette.border }]}>
                          <Ionicons name="chevron-back" size={16} color={palette.text} />
                        </Clickable>
                        <Clickable onPress={() => adjustDate('end', 1)} style={[styles.adjustBtn, { borderColor: palette.border }]}>
                          <Ionicons name="chevron-forward" size={16} color={palette.text} />
                        </Clickable>
                      </View>
                    </View>
                  </>
                )}
              </SurfaceCard>

              {/* Day Count */}
              {!isSameDay && (
                <View style={[styles.dayCountBadge, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
                  <Ionicons name="time-outline" size={14} color={palette.warning} />
                  <ThemedText style={{ ...Typography.small, color: palette.warning, fontWeight: '600' }}>
                    {dayCount} day{dayCount !== 1 ? 's' : ''} off
                  </ThemedText>
                </View>
              )}

              {/* Reason Pills */}
              <View style={styles.reasonSection}>
                <ThemedText style={[styles.reasonTitle, { color: palette.muted }]}>Reason</ThemedText>
                <View style={styles.reasonGrid}>
                  {REASONS.map((r) => {
                    const isSelected = reason === r.id;
                    return (
                      <Clickable
                        key={r.id}
                        onPress={() => { hapticTap(); setReason(r.id); }}
                        style={[
                          styles.reasonChip,
                          {
                            backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.background,
                            borderColor: isSelected ? palette.tint : palette.border,
                          },
                        ]}
                      >
                        <Ionicons name={r.icon} size={14} color={isSelected ? palette.tint : palette.muted} />
                        <ThemedText style={[styles.reasonChipText, { color: isSelected ? palette.tint : palette.text }]}>
                          {r.label}
                        </ThemedText>
                      </Clickable>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <Clickable
                onPress={handleCheckConflicts}
                disabled={checking}
                style={[styles.primaryBtn, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={palette.onPrimary} />
                <ThemedText style={styles.primaryBtnText}>
                  {checking ? 'Checking...' : 'Check & Confirm'}
                </ThemedText>
              </Clickable>

              {/* Remove (edit mode only) */}
              {isEditing && (
                <Clickable onPress={handleRemove} style={styles.removeBtn}>
                  <Ionicons name="trash-outline" size={16} color={palette.error} />
                  <ThemedText style={[styles.removeBtnText, { color: palette.error }]}>
                    Remove Time Off
                  </ThemedText>
                </Clickable>
              )}
            </View>
          ) : (
            /* ========== CONFIRM STEP ========== */
            <View style={styles.formContent}>
              {/* Summary */}
              <SurfaceCard style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Ionicons name="airplane-outline" size={20} color={palette.tint} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">
                      {isSameDay ? formatDate(startDate) : `${formatDate(startDate)} - ${formatDate(endDate)}`}
                    </ThemedText>
                    <ThemedText style={[styles.summaryMeta, { color: palette.muted }]}>
                      {REASONS.find(r => r.id === reason)?.label}
                      {!isSameDay ? ` \u00B7 ${dayCount} days` : ''}
                    </ThemedText>
                  </View>
                </View>
              </SurfaceCard>

              {/* Conflict Info */}
              {conflicts && conflicts.bookingCount > 0 ? (
                <SurfaceCard style={[styles.conflictCard, { borderColor: palette.warning }]}>
                  <View style={styles.conflictHeader}>
                    <Ionicons name="warning-outline" size={18} color={palette.warning} />
                    <ThemedText style={[styles.conflictTitle, { color: palette.warning }]}>
                      {conflicts.bookingCount} session{conflicts.bookingCount !== 1 ? 's' : ''} affected
                    </ThemedText>
                  </View>
                  {conflicts.bookings.slice(0, 3).map((b) => (
                    <View key={b.id} style={styles.conflictItem}>
                      <ThemedText style={[styles.conflictItemText, { color: palette.text }]}>
                        {b.athleteName || 'Session'} - {b.date} at {b.time}
                      </ThemedText>
                    </View>
                  ))}
                  {conflicts.bookingCount > 3 && (
                    <ThemedText style={[styles.conflictMore, { color: palette.muted }]}>
                      +{conflicts.bookingCount - 3} more
                    </ThemedText>
                  )}
                  <ThemedText style={[styles.conflictNote, { color: palette.muted }]}>
                    You may need to cancel or reschedule these sessions.
                  </ThemedText>
                </SurfaceCard>
              ) : (
                <View style={[styles.allClearBanner, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={palette.success} />
                  <ThemedText style={{ ...Typography.small, color: palette.success, fontWeight: '600' }}>
                    No sessions affected
                  </ThemedText>
                </View>
              )}

              {/* Confirm / Back */}
              <Clickable
                onPress={handleSave}
                disabled={saving}
                style={[styles.primaryBtn, { backgroundColor: palette.error }]}
              >
                <Ionicons name="airplane-outline" size={18} color={Colors.light.onPrimary} />
                <ThemedText style={styles.primaryBtnText}>
                  {saving ? 'Saving...' : 'Confirm Time Off'}
                </ThemedText>
              </Clickable>

              <Clickable onPress={() => setStep('form')} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={16} color={palette.muted} />
                <ThemedText style={[styles.backBtnText, { color: palette.muted }]}>Back</ThemedText>
              </Clickable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formContent: {
    gap: Spacing.md,
  },
  // Mode toggle
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  modeBtnText: {
    ...Typography.smallSemiBold,
  },
  // Quick dates
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  quickChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  quickChipText: {
    ...Typography.smallSemiBold,
  },
  // Date card
  dateCard: {
    padding: Spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    ...Typography.caption,
  },
  dateAdjust: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  adjustBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  // Day count
  dayCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  // Reason
  reasonSection: {
    gap: Spacing.xs,
  },
  reasonTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  reasonChipText: {
    ...Typography.smallSemiBold,
  },
  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  primaryBtnText: {
    color: Colors.light.onPrimary,
    fontWeight: '600',
    fontSize: Typography.body.fontSize,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  removeBtnText: {
    fontWeight: '600',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  backBtnText: {
    ...Typography.bodySmall,
  },
  // Confirm step
  summaryCard: {
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryMeta: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  conflictCard: {
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  conflictTitle: {
    ...Typography.bodySemiBold,
  },
  conflictItem: {
    paddingLeft: Spacing.lg,
  },
  conflictItemText: {
    ...Typography.small,
  },
  conflictMore: {
    ...Typography.small,
    paddingLeft: Spacing.lg,
  },
  conflictNote: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  allClearBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
});
