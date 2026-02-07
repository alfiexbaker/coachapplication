/**
 * Blocked Dates Editor
 *
 * Allows coaches to block date ranges with an optional reason.
 * Supports individual date selection, range selection, and a
 * "Block this week" quick action. Displays all blocked dates in a list.
 * Shows warnings if bookings exist within a blocked range.
 *
 * USER STORY:
 * "As a coach, I want to block off dates when I'm unavailable so
 * parents cannot book sessions during those periods."
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { Colors, Spacing, Radii, Typography, Shadows, Components  , withAlpha } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import type { Booking } from '@/constants/app-types';

const logger = createLogger('BlockedDatesEditor');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockedDateRange {
  id: string;
  coachId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  createdAt: string;
}

interface BlockedDatesEditorProps {
  coachId: string;
  onUpdate?: (blockedDates: BlockedDateRange[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateStr(monday), end: toDateStr(sunday) };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

/** Check if any bookings fall within a date range */
async function getBookingsInRange(
  coachId: string,
  startDate: string,
  endDate: string,
): Promise<{ count: number; dates: string[] }> {
  try {
    const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const matching = bookings.filter((b) => {
      if (b.coachId !== coachId) return false;
      if (b.status === 'CANCELLED' || b.status === 'COMPLETED') return false;
      const bookingDate = (b.scheduledAt || b.start || '').split('T')[0];
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    const dates = [...new Set(matching.map((b) => (b.scheduledAt || b.start || '').split('T')[0]))];
    return { count: matching.length, dates };
  } catch {
    return { count: 0, dates: [] };
  }
}

async function loadBlockedDates(coachId: string): Promise<BlockedDateRange[]> {
  try {
    const allBlocked = await apiClient.get<Record<string, BlockedDateRange[]>>(STORAGE_KEYS.BLOCKED_DATES, {});
    return allBlocked[coachId] || [];
  } catch {
    return [];
  }
}

async function saveBlockedDates(coachId: string, dates: BlockedDateRange[]): Promise<void> {
  const allBlocked = await apiClient.get<Record<string, BlockedDateRange[]>>(STORAGE_KEYS.BLOCKED_DATES, {});
  allBlocked[coachId] = dates;
  await apiClient.set(STORAGE_KEYS.BLOCKED_DATES, allBlocked);
}

// ---------------------------------------------------------------------------
// Mini calendar component
// ---------------------------------------------------------------------------

const WEEKDAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MiniCalendarProps {
  selectedStart: string | null;
  selectedEnd: string | null;
  onSelectDate: (date: string) => void;
  blockedDates: BlockedDateRange[];
}

function MiniCalendar({ selectedStart, selectedEnd, onSelectDate, blockedDates }: MiniCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = toDateStr(today);

  // Build set of blocked dates for quick lookup
  const blockedSet = new Set<string>();
  for (const bd of blockedDates) {
    let cur = bd.startDate;
    while (cur <= bd.endDate) {
      blockedSet.add(cur);
      cur = addDays(cur, 1);
    }
  }

  // Build selection set
  const selectedSet = new Set<string>();
  if (selectedStart && selectedEnd) {
    let cur = selectedStart <= selectedEnd ? selectedStart : selectedEnd;
    const end = selectedStart <= selectedEnd ? selectedEnd : selectedStart;
    while (cur <= end) {
      selectedSet.add(cur);
      cur = addDays(cur, 1);
    }
  } else if (selectedStart) {
    selectedSet.add(selectedStart);
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push(`${viewYear}-${m}-${dd}`);
  }

  return (
    <View style={calStyles.container}>
      {/* Month nav */}
      <View style={calStyles.header}>
        <Pressable onPress={prevMonth} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={calStyles.monthTitle}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <Pressable onPress={nextMonth} hitSlop={12}>
          <Ionicons name="chevron-forward" size={20} color={Colors.light.text} />
        </Pressable>
      </View>

      {/* Weekday headers */}
      <View style={calStyles.weekRow}>
        {WEEKDAY_HEADERS.map((d) => (
          <View key={d} style={calStyles.weekCell}>
            <Text style={calStyles.weekText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={calStyles.daysGrid}>
        {cells.map((dateStr, idx) => {
          if (!dateStr) {
            return <View key={`empty-${idx}`} style={calStyles.dayCell} />;
          }
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          const isBlocked = blockedSet.has(dateStr);
          const isSelected = selectedSet.has(dateStr);
          const dayNum = parseInt(dateStr.split('-')[2], 10);

          return (
            <Pressable
              key={dateStr}
              style={[
                calStyles.dayCell,
                isSelected ? calStyles.dayCellSelected : undefined,
                isBlocked && !isSelected ? calStyles.dayCellBlocked : undefined,
              ]}
              onPress={() => !isPast && onSelectDate(dateStr)}
              disabled={isPast}
            >
              <Text
                style={[
                  calStyles.dayText,
                  isPast ? calStyles.dayTextPast : undefined,
                  isToday ? calStyles.dayTextToday : undefined,
                  isSelected ? calStyles.dayTextSelected : undefined,
                  isBlocked && !isSelected ? calStyles.dayTextBlocked : undefined,
                ]}
              >
                {dayNum}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    ...Shadows.light.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  monthTitle: {
    ...Typography.bodySemiBold,
    color: Colors.light.text,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xxs,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xxs,
  },
  weekText: {
    ...Typography.caption,
    color: Colors.light.muted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
  },
  dayCellSelected: {
    backgroundColor: Colors.light.tint,
  },
  dayCellBlocked: {
    backgroundColor: withAlpha(Colors.light.error, 0.09),
  },
  dayText: {
    ...Typography.body,
    color: Colors.light.text,
  },
  dayTextPast: {
    color: Colors.light.border,
  },
  dayTextToday: {
    fontWeight: '700',
    color: Colors.light.tint,
  },
  dayTextSelected: {
    color: Colors.light.surface,
    fontWeight: '600',
  },
  dayTextBlocked: {
    color: Colors.light.error,
  },
});

// ---------------------------------------------------------------------------
// Booking warning banner
// ---------------------------------------------------------------------------

function BookingWarningBanner({ count, dates }: { count: number; dates: string[] }) {
  if (count === 0) return null;
  return (
    <View style={styles.bookingWarning}>
      <Ionicons name="warning-outline" size={18} color={Colors.light.warning} />
      <View style={styles.bookingWarningContent}>
        <Text style={styles.bookingWarningTitle}>
          {count} booking{count > 1 ? 's' : ''} in this range
        </Text>
        <Text style={styles.bookingWarningText}>
          You have existing bookings on {dates.slice(0, 3).map(formatDate).join(', ')}
          {dates.length > 3 ? ` and ${dates.length - 3} more` : ''}.
          Blocking these dates will not automatically cancel them.
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BlockedDatesEditor({ coachId, onUpdate }: BlockedDatesEditorProps) {
  const [loading, setLoading] = useState(true);
  const [blockedDates, setBlockedDates] = useState<BlockedDateRange[]>([]);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [bookingConflict, setBookingConflict] = useState<{ count: number; dates: string[] }>({
    count: 0,
    dates: [],
  });

  // Load blocked dates
  useEffect(() => {
    (async () => {
      const data = await loadBlockedDates(coachId);
      setBlockedDates(data);
      setLoading(false);
    })();
  }, [coachId]);

  // Check for booking conflicts when selection changes
  useEffect(() => {
    if (!selectedStart) {
      setBookingConflict({ count: 0, dates: [] });
      return;
    }
    const start = selectedEnd
      ? selectedStart <= (selectedEnd ?? selectedStart) ? selectedStart : selectedEnd
      : selectedStart;
    const end = selectedEnd
      ? selectedStart <= selectedEnd ? selectedEnd : selectedStart
      : selectedStart;

    (async () => {
      const result = await getBookingsInRange(coachId, start, end);
      setBookingConflict(result);
    })();
  }, [coachId, selectedStart, selectedEnd]);

  // Date selection (first tap = start, second tap = end)
  const handleDateSelect = useCallback(
    (date: string) => {
      if (!selectedStart || (selectedStart && selectedEnd)) {
        setSelectedStart(date);
        setSelectedEnd(null);
      } else {
        setSelectedEnd(date);
      }
    },
    [selectedStart, selectedEnd],
  );

  // Add blocked range
  const handleAddBlock = useCallback(async () => {
    if (!selectedStart) return;
    const start = selectedEnd && selectedEnd < selectedStart ? selectedEnd : selectedStart;
    const end = selectedEnd
      ? selectedEnd > selectedStart ? selectedEnd : selectedStart
      : selectedStart;

    const newBlock: BlockedDateRange = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      coachId,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...blockedDates, newBlock].sort(
      (a, b) => a.startDate.localeCompare(b.startDate),
    );
    setBlockedDates(updated);
    await saveBlockedDates(coachId, updated);

    // Reset selection
    setSelectedStart(null);
    setSelectedEnd(null);
    setReason('');
    setBookingConflict({ count: 0, dates: [] });
    onUpdate?.(updated);

    logger.debug('Date range blocked', { start, end });
  }, [coachId, selectedStart, selectedEnd, reason, blockedDates, onUpdate]);

  // Helper to actually block the week
  const doBlockWeek = useCallback(
    async (start: string, end: string) => {
      const newBlock: BlockedDateRange = {
        id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        coachId,
        startDate: start,
        endDate: end,
        reason: 'Blocked entire week',
        createdAt: new Date().toISOString(),
      };

      const updated = [...blockedDates, newBlock].sort(
        (a, b) => a.startDate.localeCompare(b.startDate),
      );
      setBlockedDates(updated);
      await saveBlockedDates(coachId, updated);
      onUpdate?.(updated);
      logger.debug('Week blocked', { start, end });
    },
    [coachId, blockedDates, onUpdate],
  );

  // Block this week
  const handleBlockThisWeek = useCallback(async () => {
    const { start, end } = getWeekRange();

    // Check for bookings this week before blocking
    const conflicts = await getBookingsInRange(coachId, start, end);
    if (conflicts.count > 0) {
      Alert.alert(
        'Bookings exist this week',
        `You have ${conflicts.count} booking${conflicts.count > 1 ? 's' : ''} this week. Blocking will not cancel them. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block anyway',
            onPress: async () => {
              await doBlockWeek(start, end);
            },
          },
        ],
      );
    } else {
      await doBlockWeek(start, end);
    }
  }, [coachId, doBlockWeek]);

  // Remove a blocked range
  const handleRemoveBlock = useCallback(
    async (blockId: string) => {
      Alert.alert('Remove blocked dates?', 'Sessions will be bookable again for these dates.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = blockedDates.filter((b) => b.id !== blockId);
            setBlockedDates(updated);
            await saveBlockedDates(coachId, updated);
            onUpdate?.(updated);
          },
        },
      ]);
    },
    [coachId, blockedDates, onUpdate],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.text} />
      </View>
    );
  }

  const hasSelection = !!selectedStart;
  const selectionLabel = selectedStart
    ? selectedEnd
      ? formatDateRange(
          selectedStart <= selectedEnd ? selectedStart : selectedEnd,
          selectedStart <= selectedEnd ? selectedEnd : selectedStart,
        )
      : formatDate(selectedStart)
    : '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Calendar */}
      <MiniCalendar
        selectedStart={selectedStart}
        selectedEnd={selectedEnd}
        onSelectDate={handleDateSelect}
        blockedDates={blockedDates}
      />

      {/* Booking conflict warning */}
      {hasSelection && (
        <BookingWarningBanner count={bookingConflict.count} dates={bookingConflict.dates} />
      )}

      {/* Selection area */}
      {hasSelection && (
        <View style={styles.selectionArea}>
          <View style={styles.selectionInfo}>
            <Ionicons name="calendar" size={16} color={Colors.light.tint} />
            <Text style={styles.selectionLabel}>{selectionLabel}</Text>
          </View>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (optional)"
            placeholderTextColor={Colors.light.border}
          />
          <Pressable style={styles.blockButton} onPress={handleAddBlock}>
            <Ionicons name="close-circle" size={18} color={Colors.light.surface} />
            <Text style={styles.blockButtonText}>Block these dates</Text>
          </Pressable>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <Pressable style={styles.quickAction} onPress={handleBlockThisWeek}>
          <Ionicons name="today-outline" size={18} color={Colors.light.tint} />
          <Text style={styles.quickActionText}>Block this week</Text>
        </Pressable>
      </View>

      {/* Blocked dates list */}
      {blockedDates.length > 0 && (
        <>
          <Text style={styles.listTitle}>Blocked dates</Text>
          <View style={styles.listCard}>
            {blockedDates.map((block, idx) => {
              const isLast = idx === blockedDates.length - 1;
              const isPast = block.endDate < toDateStr(new Date());

              return (
                <View
                  key={block.id}
                  style={[styles.listItem, !isLast ? styles.listItemBorder : undefined]}
                >
                  <View style={styles.listItemInfo}>
                    <Text style={[styles.listItemDate, isPast && styles.listItemDatePast]}>
                      {formatDateRange(block.startDate, block.endDate)}
                    </Text>
                    {block.reason ? (
                      <Text style={styles.listItemReason}>{block.reason}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => handleRemoveBlock(block.id)}
                    hitSlop={12}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.light.error} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      )}

      {blockedDates.length === 0 && !hasSelection && (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={40} color={Colors.light.border} />
          <Text style={styles.emptyTitle}>No blocked dates</Text>
          <Text style={styles.emptySubtitle}>
            Tap dates on the calendar to block off periods when you are unavailable.
          </Text>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Booking warning
  bookingWarning: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: withAlpha(Colors.light.warning, 0.08),
    borderRadius: Radii.card,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: withAlpha(Colors.light.warning, 0.19),
  },
  bookingWarningContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  bookingWarningTitle: {
    ...Typography.bodySemiBold,
    color: Colors.light.warning,
  },
  bookingWarningText: {
    ...Typography.small,
    color: Colors.light.muted,
  },

  // Selection area
  selectionArea: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    ...Shadows.light.subtle,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginBottom: Spacing.xs,
  },
  selectionLabel: {
    ...Typography.bodySemiBold,
    color: Colors.light.text,
  },
  reasonInput: {
    height: 40,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.xs,
    ...Typography.body,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    backgroundColor: Colors.light.error,
  },
  blockButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.light.surface,
  },

  // Quick actions
  quickActions: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 14,
    ...Shadows.light.subtle,
  },
  quickActionText: {
    ...Typography.bodySemiBold,
    color: Colors.light.tint,
  },

  // List
  listTitle: {
    ...Typography.heading,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  listCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    ...Shadows.light.card,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 14,
  },
  listItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemDate: {
    ...Typography.body,
    color: Colors.light.text,
  },
  listItemDatePast: {
    color: Colors.light.muted,
  },
  listItemReason: {
    ...Typography.small,
    color: Colors.light.muted,
    marginTop: Spacing.micro,
  },
  removeBtn: {
    padding: Spacing.xxs,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.heading,
    color: Colors.light.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxs,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.light.muted,
    textAlign: 'center',
  },

  bottomSpacer: {
    height: Spacing.lg,
  },
});
