/**
 * Time Off Sheet
 *
 * Bottom sheet for marking time off (single day or date range).
 * Uses availabilityService.blockDate/unblockDate/checkConflicts.
 *
 * Edit mode: shows confirmation-based removal flow (no Alert.alert — works on all platforms).
 * Create mode: step form → conflict check → confirm & save.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
  const [step, setStep] = useState<'form' | 'confirm' | 'confirmRemove'>('form');
  const [conflicts, setConflicts] = useState<{
    bookingCount: number;
    holdCount: number;
    bookings: { id: string; date: string; time: string; athleteName?: string }[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const hapticTap = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

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
      setRemoving(false);
    }
  }, [visible, preselectedDate, existingOverride]);

  const isSameDay = toDateStr(startDate) === toDateStr(endDate);
  const dayCount = getDaysBetween(startDate, endDate);
  const isEditing = !!existingOverride;

  const adjustDate = useCallback((target: 'start' | 'end', days: number) => {
    hapticTap();
    if (target === 'start') {
      setStartDate((prev) => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + days);
        setEndDate((prevEnd) => (newDate > prevEnd ? newDate : prevEnd));
        return newDate;
      });
    } else {
      setEndDate((prev) => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + days);
        return newDate >= startDate ? newDate : prev;
      });
    }
  }, [hapticTap, startDate]);

  const handleCheckConflicts = useCallback(async () => {
    hapticTap();
    setChecking(true);
    try {
      const dates = expandDateRange(startDate, endDate);
      const result = await availabilityService.checkConflicts(coachId, dates);
      setConflicts(result);
      setStep('confirm');
    } catch (error) {
      logger.error('Failed to check conflicts', error);
    } finally {
      setChecking(false);
    }
  }, [hapticTap, startDate, endDate, coachId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const dates = expandDateRange(startDate, endDate);
      const reasonLabel = REASONS.find(r => r.id === reason)?.label || reason;

      for (const date of dates) {
        await availabilityService.blockDate(coachId, date, reasonLabel);
      }

      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      await onSaved().catch(e => logger.warn('Post-save refresh failed', e));
    } catch (error) {
      logger.error('Failed to save time off', error);
    } finally {
      setSaving(false);
    }
  }, [startDate, endDate, reason, coachId, onClose, onSaved]);

  const handleRemoveConfirm = useCallback(async () => {
    if (!existingOverride) return;
    setRemoving(true);
    try {
      await availabilityService.unblockDate(coachId, existingOverride.date);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      await onSaved().catch(e => logger.warn('Post-removal refresh failed', e));
    } catch (error) {
      logger.error('Failed to remove time off', error);
      setRemoving(false);
      setStep('form');
    }
  }, [existingOverride, coachId, onClose, onSaved]);

  const handleClose = useCallback(() => {
    if (removing) return;
    setStep('form');
    setConflicts(null);
    onClose();
  }, [removing, onClose]);

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

  const removeDate = existingOverride
    ? formatDate(new Date(existingOverride.date + 'T12:00:00'))
    : '';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.4) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle">
              {step === 'confirmRemove'
                ? 'Remove Time Off'
                : isEditing
                  ? 'Time Off'
                  : 'Take Time Off'}
            </ThemedText>
            <Clickable
              onPress={handleClose}
              disabled={removing}
              hitSlop={8}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ========== CONFIRM REMOVE STEP ========== */}
            {step === 'confirmRemove' && existingOverride && (
              <View style={styles.formContent}>
                <SurfaceCard style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <View style={[styles.removeIconCircle, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                      <Ionicons name="airplane-outline" size={22} color={palette.error} />
                    </View>
                    <View style={styles.removeDetails}>
                      <ThemedText type="defaultSemiBold">{removeDate}</ThemedText>
                      {existingOverride.reason ? (
                        <ThemedText style={[styles.removeReason, { color: palette.muted }]}>
                          {existingOverride.reason}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                </SurfaceCard>

                <View style={[styles.removeWarning, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
                  <Ionicons name="information-circle-outline" size={18} color={palette.warning} />
                  <ThemedText style={[styles.removeWarningText, { color: palette.warning }]}>
                    This day will become available for bookings again.
                  </ThemedText>
                </View>

                {/* Confirm Remove */}
                <Clickable
                  onPress={handleRemoveConfirm}
                  disabled={removing}
                  style={[styles.primaryBtn, { backgroundColor: palette.error }]}
                  accessibilityLabel="Confirm remove time off"
                >
                  {removing ? (
                    <ThemedText style={[styles.primaryBtnText, { color: palette.onPrimary }]}>
                      Removing...
                    </ThemedText>
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color={palette.onPrimary} />
                      <ThemedText style={[styles.primaryBtnText, { color: palette.onPrimary }]}>
                        Yes, Remove Time Off
                      </ThemedText>
                    </>
                  )}
                </Clickable>

                {/* Cancel */}
                <Clickable
                  onPress={() => { hapticTap(); setStep('form'); }}
                  disabled={removing}
                  style={styles.backBtn}
                  accessibilityLabel="Cancel removal"
                >
                  <Ionicons name="arrow-back" size={16} color={palette.muted} />
                  <ThemedText style={[styles.backBtnText, { color: palette.muted }]}>
                    Keep Time Off
                  </ThemedText>
                </Clickable>
              </View>
            )}

            {/* ========== FORM STEP ========== */}
            {step === 'form' && (
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
                          accessibilityLabel={m === 'single' ? 'Single day mode' : 'Date range mode'}
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
                          accessibilityLabel={qd.label}
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
                        <Clickable onPress={() => adjustDate('start', -1)} style={[styles.adjustBtn, { borderColor: palette.border }]} hitSlop={4} accessibilityLabel="Previous day">
                          <Ionicons name="chevron-back" size={16} color={palette.text} />
                        </Clickable>
                        <Clickable onPress={() => adjustDate('start', 1)} style={[styles.adjustBtn, { borderColor: palette.border }]} hitSlop={4} accessibilityLabel="Next day">
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
                          <Clickable onPress={() => adjustDate('end', -1)} style={[styles.adjustBtn, { borderColor: palette.border }]} hitSlop={4} accessibilityLabel="Previous end day">
                            <Ionicons name="chevron-back" size={16} color={palette.text} />
                          </Clickable>
                          <Clickable onPress={() => adjustDate('end', 1)} style={[styles.adjustBtn, { borderColor: palette.border }]} hitSlop={4} accessibilityLabel="Next end day">
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
                    <ThemedText style={[styles.dayCountText, { color: palette.warning }]}>
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
                          accessibilityLabel={`Reason: ${r.label}`}
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
                  accessibilityLabel={checking ? 'Checking for conflicts' : 'Check and confirm time off'}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.primaryBtnText, { color: palette.onPrimary }]}>
                    {checking ? 'Checking...' : 'Check & Confirm'}
                  </ThemedText>
                </Clickable>

                {/* Remove (edit mode only) — navigates to confirmRemove step */}
                {isEditing && (
                  <Clickable
                    onPress={() => {
                      hapticTap();
                      setStep('confirmRemove');
                    }}
                    style={[styles.removeBtn, { borderColor: withAlpha(palette.error, 0.2) }]}
                    accessibilityLabel="Remove time off"
                  >
                    <Ionicons name="trash-outline" size={16} color={palette.error} />
                    <ThemedText style={[styles.removeBtnText, { color: palette.error }]}>
                      Remove Time Off
                    </ThemedText>
                  </Clickable>
                )}
              </View>
            )}

            {/* ========== CONFIRM SAVE STEP ========== */}
            {step === 'confirm' && (
              <View style={styles.formContent}>
                {/* Summary */}
                <SurfaceCard style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Ionicons name="airplane-outline" size={20} color={palette.tint} />
                    <View style={styles.summaryInfo}>
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
                    <ThemedText style={[styles.allClearText, { color: palette.success }]}>
                      No sessions affected
                    </ThemedText>
                  </View>
                )}

                {/* Confirm / Back */}
                <Clickable
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.primaryBtn, { backgroundColor: palette.error }]}
                  accessibilityLabel={saving ? 'Saving time off' : 'Confirm time off'}
                >
                  <Ionicons name="airplane-outline" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.primaryBtnText, { color: palette.onPrimary }]}>
                    {saving ? 'Saving...' : 'Confirm Time Off'}
                  </ThemedText>
                </Clickable>

                <Clickable
                  onPress={() => { hapticTap(); setStep('form'); }}
                  style={styles.backBtn}
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="arrow-back" size={16} color={palette.muted} />
                  <ThemedText style={[styles.backBtnText, { color: palette.muted }]}>Back</ThemedText>
                </Clickable>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
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
    height: Spacing.xxs,
    borderRadius: Spacing.micro,
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
    minHeight: 44,
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
    minHeight: 44,
    justifyContent: 'center',
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
    width: 36,
    height: 36,
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
  dayCountText: {
    ...Typography.smallSemiBold,
  },
  // Reason
  reasonSection: {
    gap: Spacing.xs,
  },
  reasonTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
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
    minHeight: 44,
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
    minHeight: 52,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  primaryBtnText: {
    ...Typography.bodySemiBold,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  removeBtnText: {
    ...Typography.bodySemiBold,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 44,
  },
  backBtnText: {
    ...Typography.bodySmall,
  },
  // Confirm remove step
  removeIconCircle: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDetails: {
    flex: 1,
    gap: Spacing.micro,
  },
  removeReason: {
    ...Typography.bodySmall,
  },
  removeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  removeWarningText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  // Confirm save step
  summaryCard: {
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryInfo: {
    flex: 1,
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
  allClearText: {
    ...Typography.smallSemiBold,
  },
});
