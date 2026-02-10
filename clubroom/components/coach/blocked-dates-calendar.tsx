/**
 * MiniCalendar — Date range picker for BlockedDatesEditor.
 */
import { memo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, Shadows, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { toDateStr } from '@/utils/format';
import { addDays, getDaysInMonth, getFirstDayOfMonth, type BlockedDateRange } from '@/hooks/use-blocked-dates';
import { Row } from '@/components/primitives';

const WEEKDAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface MiniCalendarProps {
  selectedStart: string | null;
  selectedEnd: string | null;
  onSelectDate: (date: string) => void;
  blockedDates: BlockedDateRange[];
}

function MiniCalendarInner({ selectedStart, selectedEnd, onSelectDate, blockedDates }: MiniCalendarProps) {
  const { colors, scheme } = useTheme();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = toDateStr(today);

  const blockedSet = new Set<string>();
  for (const bd of blockedDates) {
    let cur = bd.startDate;
    while (cur <= bd.endDate) { blockedSet.add(cur); cur = addDays(cur, 1); }
  }

  const selectedSet = new Set<string>();
  if (selectedStart && selectedEnd) {
    let cur = selectedStart <= selectedEnd ? selectedStart : selectedEnd;
    const end = selectedStart <= selectedEnd ? selectedEnd : selectedStart;
    while (cur <= end) { selectedSet.add(cur); cur = addDays(cur, 1); }
  } else if (selectedStart) { selectedSet.add(selectedStart); }

  const prevMonth = () => { if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); } else { setViewMonth((m) => m - 1); } };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); } else { setViewMonth((m) => m + 1); } };

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push(`${viewYear}-${m}-${dd}`);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
      <Row style={styles.header}>
        <Clickable onPress={prevMonth} hitSlop={12}><Ionicons name="chevron-back" size={20} color={colors.text} /></Clickable>
        <Text style={[styles.monthTitle, { color: colors.text }]}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <Clickable onPress={nextMonth} hitSlop={12}><Ionicons name="chevron-forward" size={20} color={colors.text} /></Clickable>
      </Row>
      <Row style={styles.weekRow}>
        {WEEKDAY_HEADERS.map((d) => (<View key={d} style={styles.weekCell}><Text style={[styles.weekText, { color: colors.muted }]}>{d}</Text></View>))}
      </Row>
      <Row style={styles.daysGrid}>
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <View key={`empty-${idx}`} style={styles.dayCell} />;
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          const isBlocked = blockedSet.has(dateStr);
          const isSelected = selectedSet.has(dateStr);
          const dayNum = parseInt(dateStr.split('-')[2], 10);
          return (
            <Clickable key={dateStr} style={[styles.dayCell, isSelected ? { backgroundColor: colors.tint } : undefined, isBlocked && !isSelected ? { backgroundColor: withAlpha(colors.error, 0.09) } : undefined]} onPress={() => !isPast && onSelectDate(dateStr)} disabled={isPast}>
              <Text style={[styles.dayText, { color: colors.text }, isPast ? { color: colors.border } : undefined, isToday ? { fontWeight: '700', color: colors.tint } : undefined, isSelected ? { color: colors.surface, fontWeight: '600' } : undefined, isBlocked && !isSelected ? { color: colors.error } : undefined]}>{dayNum}</Text>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
}

export const MiniCalendar = memo(MiniCalendarInner);

const styles = StyleSheet.create({
  container: { borderRadius: Radii.card, padding: Spacing.sm },
  header: { alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  monthTitle: { ...Typography.bodySemiBold },
  weekRow: { marginBottom: Spacing.xxs },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xxs },
  weekText: { ...Typography.caption },
  daysGrid: { flexWrap: 'wrap' },
  dayCell: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.sm },
  dayText: { ...Typography.body },
});
