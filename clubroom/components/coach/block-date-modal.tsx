import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const logger = createLogger('BlockDateModal');

// Block reasons
const BLOCK_REASONS = [
  { id: 'holiday', label: 'Holiday / Vacation', icon: 'airplane-outline' },
  { id: 'personal', label: 'Personal Day', icon: 'person-outline' },
  { id: 'illness', label: 'Illness', icon: 'medical-outline' },
  { id: 'training', label: 'Coach Training', icon: 'school-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
] as const;

// Pre-defined holiday presets
const HOLIDAY_PRESETS = [
  { id: 'christmas', label: 'Christmas Week', dates: () => getChristmasWeek() },
  { id: 'easter', label: 'Easter Weekend', dates: () => getEasterWeekend() },
  { id: 'newyear', label: 'New Year', dates: () => getNewYearDates() },
  { id: 'summer', label: 'Summer Break (2 weeks)', dates: () => getSummerBreak() },
] as const;

// Date helpers
function getChristmasWeek(): { start: Date; end: Date } {
  const year = new Date().getFullYear();
  return { start: new Date(year, 11, 23), end: new Date(year, 11, 31) };
}

function getEasterWeekend(): { start: Date; end: Date } {
  // Approximate Easter 2024/2025
  const year = new Date().getFullYear();
  const easter = year === 2024 ? new Date(2024, 2, 29) : new Date(2025, 3, 20);
  const end = new Date(easter);
  end.setDate(end.getDate() + 1);
  return { start: new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000), end };
}

function getNewYearDates(): { start: Date; end: Date } {
  const year = new Date().getFullYear();
  return { start: new Date(year, 11, 31), end: new Date(year + 1, 0, 2) };
}

function getSummerBreak(): { start: Date; end: Date } {
  const year = new Date().getFullYear();
  return { start: new Date(year, 6, 15), end: new Date(year, 6, 28) };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDaysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

interface BlockDateModalProps {
  visible: boolean;
  onClose: () => void;
  onBlock: (dates: string[], reason: string) => Promise<void>;
  preselectedDate?: Date;
}

export function BlockDateModal({
  visible,
  onClose,
  onBlock,
  preselectedDate,
}: BlockDateModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [mode, setMode] = useState<'single' | 'range' | 'holiday'>('single');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reason, setReason] = useState<string>('holiday');
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Quick date options for single mode
  const quickDates = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return [
      { id: 'today', label: 'Today', date: today },
      { id: 'tomorrow', label: 'Tomorrow', date: tomorrow },
      { id: 'nextweek', label: 'Next Week', date: nextWeek },
    ];
  }, []);

  useEffect(() => {
    if (visible) {
      if (preselectedDate) {
        setStartDate(preselectedDate);
        setEndDate(preselectedDate);
        setMode('single');
      } else {
        setStartDate(new Date());
        setEndDate(new Date());
      }
      setReason('holiday');
      setSelectedPreset(null);
    }
  }, [visible, preselectedDate]);

  const handleQuickDate = (date: Date) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStartDate(date);
    setEndDate(date);
    setSelectedPreset(null);
  };

  const handleHolidayPreset = (presetId: string, dateRange: { start: Date; end: Date }) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPreset(presetId);
    setStartDate(dateRange.start);
    setEndDate(dateRange.end);
    setMode('holiday');
    setReason('holiday');
  };

  const adjustDate = (target: 'start' | 'end', days: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    setSelectedPreset(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Generate array of date strings
      const dates: string[] = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        dates.push(formatDateISO(current));
        current.setDate(current.getDate() + 1);
      }

      const reasonLabel = BLOCK_REASONS.find(r => r.id === reason)?.label || reason;
      await onBlock(dates, reasonLabel);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      logger.error('Failed to block dates:', error);
      Alert.alert('Error', 'Failed to block dates. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const dayCount = getDaysBetween(startDate, endDate);
  const isSameDay = formatDateISO(startDate) === formatDateISO(endDate);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={onClose} disabled={saving}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">Block Time Off</ThemedText>
          <Clickable onPress={handleSave} disabled={saving}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
              {saving ? 'Saving...' : 'Block'}
            </ThemedText>
          </Clickable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Mode Selector */}
          <View style={styles.section}>
            <View style={styles.modeSelector}>
              {[
                { id: 'single', label: 'Single Day', icon: 'today-outline' },
                { id: 'range', label: 'Date Range', icon: 'calendar-outline' },
                { id: 'holiday', label: 'Holidays', icon: 'gift-outline' },
              ].map((m) => {
                const isActive = mode === m.id;
                return (
                  <Clickable
                    key={m.id}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMode(m.id as typeof mode);
                      if (m.id === 'single') {
                        setEndDate(startDate);
                        setSelectedPreset(null);
                      }
                    }}
                    style={[
                      styles.modeButton,
                      {
                        backgroundColor: isActive ? palette.tint : palette.surface,
                        borderColor: isActive ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <Ionicons name={m.icon as keyof typeof Ionicons.glyphMap} size={18} color={isActive ? palette.onPrimary : palette.muted} />
                    <ThemedText style={[styles.modeButtonText, { color: isActive ? palette.onPrimary : palette.text }]}>
                      {m.label}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </View>
          </View>

          {/* Single Day - Quick Options */}
          {mode === 'single' && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Quick Select</ThemedText>
              <View style={styles.quickDates}>
                {quickDates.map((qd) => {
                  const isSelected = formatDateISO(startDate) === formatDateISO(qd.date);
                  return (
                    <Clickable
                      key={qd.id}
                      onPress={() => handleQuickDate(qd.date)}
                      style={[
                        styles.quickDateChip,
                        {
                          backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText style={[styles.quickDateText, { color: isSelected ? palette.tint : palette.text }]}>
                        {qd.label}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Holiday Presets */}
          {mode === 'holiday' && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Holiday Presets</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                Quickly block common holiday periods
              </ThemedText>
              <View style={styles.holidayGrid}>
                {HOLIDAY_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  const dateRange = preset.dates();
                  return (
                    <Clickable
                      key={preset.id}
                      onPress={() => handleHolidayPreset(preset.id, dateRange)}
                      style={[
                        styles.holidayCard,
                        {
                          backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <View style={[styles.holidayIcon, { backgroundColor: isSelected ? withAlpha(palette.tint, 0.12) : withAlpha(palette.muted, 0.09) }]}>
                        <Ionicons name="gift" size={20} color={isSelected ? palette.tint : palette.muted} />
                      </View>
                      <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
                        {preset.label}
                      </ThemedText>
                      <ThemedText style={[styles.holidayDates, { color: palette.muted }]}>
                        {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                      </ThemedText>
                      {isSelected && (
                        <View style={[styles.selectedBadge, { backgroundColor: palette.tint }]}>
                          <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
                        </View>
                      )}
                    </Clickable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Date Picker */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              {mode === 'single' ? 'Selected Date' : 'Date Range'}
            </ThemedText>

            <SurfaceCard style={styles.dateCard}>
              {/* Start Date */}
              <View style={styles.dateRow}>
                <View style={[styles.dateIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                  <Ionicons name="calendar" size={18} color={palette.tint} />
                </View>
                <View style={styles.dateInfo}>
                  <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>
                    {mode === 'single' ? 'Date' : 'From'}
                  </ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>
                    {formatDate(startDate)}
                  </ThemedText>
                </View>
                <View style={styles.dateAdjust}>
                  <Clickable
                    onPress={() => adjustDate('start', -1)}
                    style={[styles.adjustButton, { borderColor: palette.border }]}
                  >
                    <Ionicons name="chevron-back" size={18} color={palette.text} />
                  </Clickable>
                  <Clickable
                    onPress={() => adjustDate('start', 1)}
                    style={[styles.adjustButton, { borderColor: palette.border }]}
                  >
                    <Ionicons name="chevron-forward" size={18} color={palette.text} />
                  </Clickable>
                </View>
              </View>

              {/* End Date (for range/holiday) */}
              {mode !== 'single' && (
                <>
                  <Divider spacing={Spacing.md} />
                  <View style={styles.dateRow}>
                    <View style={[styles.dateIcon, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                      <Ionicons name="calendar" size={18} color={palette.error} />
                    </View>
                    <View style={styles.dateInfo}>
                      <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>To</ThemedText>
                      <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>
                        {formatDate(endDate)}
                      </ThemedText>
                    </View>
                    <View style={styles.dateAdjust}>
                      <Clickable
                        onPress={() => adjustDate('end', -1)}
                        style={[styles.adjustButton, { borderColor: palette.border }]}
                      >
                        <Ionicons name="chevron-back" size={18} color={palette.text} />
                      </Clickable>
                      <Clickable
                        onPress={() => adjustDate('end', 1)}
                        style={[styles.adjustButton, { borderColor: palette.border }]}
                      >
                        <Ionicons name="chevron-forward" size={18} color={palette.text} />
                      </Clickable>
                    </View>
                  </View>
                </>
              )}
            </SurfaceCard>

            {/* Day count summary */}
            {!isSameDay && (
              <View style={[styles.daySummary, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
                <Ionicons name="time-outline" size={16} color={palette.warning} />
                <ThemedText style={{ color: palette.warning, fontWeight: '600' }}>
                  Blocking {dayCount} day{dayCount !== 1 ? 's' : ''}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Reason Selection */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Reason</ThemedText>
            <View style={styles.reasonGrid}>
              {BLOCK_REASONS.map((r) => {
                const isSelected = reason === r.id;
                return (
                  <Clickable
                    key={r.id}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setReason(r.id);
                    }}
                    style={[
                      styles.reasonChip,
                      {
                        backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <Ionicons name={r.icon as keyof typeof Ionicons.glyphMap} size={16} color={isSelected ? palette.tint : palette.muted} />
                    <ThemedText style={[styles.reasonText, { color: isSelected ? palette.tint : palette.text }]}>
                      {r.label}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </View>
          </View>

          {/* Summary */}
          <SurfaceCard style={[styles.summaryCard, { backgroundColor: withAlpha(palette.error, 0.03) }]}>
            <View style={styles.summaryRow}>
              <Ionicons name="alert-circle" size={20} color={palette.error} />
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold" style={{ color: palette.error }}>
                  Time Off Summary
                </ThemedText>
                <ThemedText style={[styles.summaryText, { color: palette.muted }]}>
                  {isSameDay
                    ? `${formatDate(startDate)} will be blocked`
                    : `${dayCount} days from ${formatDate(startDate)} to ${formatDate(endDate)} will be blocked`}
                </ThemedText>
                <ThemedText style={[styles.summaryText, { color: palette.muted }]}>
                  Reason: {BLOCK_REASONS.find(r => r.id === reason)?.label}
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
    gap: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: { ...Typography.subheading },
  sectionHint: { ...Typography.small },
  modeSelector: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  modeButtonText: { ...Typography.smallSemiBold },
  quickDates: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  quickDateChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  quickDateText: {
    fontWeight: '600',
  },
  holidayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  holidayCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
    position: 'relative',
  },
  holidayIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  holidayDates: { ...Typography.caption },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCard: {
    padding: Spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: { ...Typography.caption },
  dateAdjust: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
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
  reasonText: { ...Typography.smallSemiBold },
  summaryCard: {
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  summaryText: { ...Typography.small, marginTop: Spacing.micro },
});
