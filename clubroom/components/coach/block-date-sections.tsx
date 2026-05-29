import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { toDateStr } from '@/utils/format';
import { BLOCK_REASONS, HOLIDAY_PRESETS, formatBlockDate } from './block-date-helpers';
import { Row, Column } from '@/components/primitives';

// --- ModeSelector ---
type BlockMode = 'single' | 'range' | 'holiday';
const MODE_OPTIONS = [
  { id: 'single' as const, label: 'Single Day', icon: 'today-outline' },
  { id: 'range' as const, label: 'Date Range', icon: 'calendar-outline' },
  { id: 'holiday' as const, label: 'Holidays', icon: 'gift-outline' },
];

export const ModeSelector = function ModeSelector({
  mode,
  onSelect,
}: {
  mode: BlockMode;
  onSelect: (m: BlockMode) => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <Row style={styles.modeSelector}>
      {MODE_OPTIONS.map((m) => {
        const isActive = mode === m.id;
        return (
          <Clickable
            key={m.id}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(m.id);
            }}
            style={[
              styles.modeButton,
              {
                backgroundColor: isActive ? palette.tint : palette.surface,
                borderColor: isActive ? palette.tint : palette.border,
              },
            ]}
          >
            <Ionicons
              name={m.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={isActive ? palette.onPrimary : palette.muted}
            />
            <ThemedText
              style={[
                styles.modeButtonText,
                { color: isActive ? palette.onPrimary : palette.text },
              ]}
            >
              {m.label}
            </ThemedText>
          </Clickable>
        );
      })}
    </Row>
  );
};

// --- QuickDates ---
export const QuickDates = function QuickDates({
  startDate,
  onSelect,
}: {
  startDate: Date;
  onSelect: (d: Date) => void;
}) {
  const { colors: palette } = useTheme();
  const quickDates = (() => {
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
  })();
  return (
    <Row style={styles.quickDates}>
      {quickDates.map((qd) => {
        const isSelected = toDateStr(startDate) === toDateStr(qd.date);
        return (
          <Clickable
            key={qd.id}
            onPress={() => onSelect(qd.date)}
            style={[
              styles.quickDateChip,
              {
                backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                borderColor: isSelected ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[styles.quickDateText, { color: isSelected ? palette.tint : palette.text }]}
            >
              {qd.label}
            </ThemedText>
          </Clickable>
        );
      })}
    </Row>
  );
};

// --- HolidayPresets ---
export const HolidayPresetsGrid = function HolidayPresetsGrid({
  selectedPreset,
  onSelect,
}: {
  selectedPreset: string | null;
  onSelect: (id: string, range: { start: Date; end: Date }) => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <Row style={styles.holidayGrid}>
      {HOLIDAY_PRESETS.map((preset) => {
        const isSelected = selectedPreset === preset.id;
        const dateRange = preset.dates();
        return (
          <Clickable
            key={preset.id}
            onPress={() => onSelect(preset.id, dateRange)}
            style={[
              styles.holidayCard,
              {
                backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
                borderColor: isSelected ? palette.tint : palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.holidayIcon,
                {
                  backgroundColor: isSelected
                    ? withAlpha(palette.tint, 0.12)
                    : withAlpha(palette.muted, 0.09),
                },
              ]}
            >
              <Ionicons name="gift" size={20} color={isSelected ? palette.tint : palette.muted} />
            </View>
            <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
              {preset.label}
            </ThemedText>
            <ThemedText style={[styles.holidayDates, { color: palette.muted }]}>
              {formatBlockDate(dateRange.start)} - {formatBlockDate(dateRange.end)}
            </ThemedText>
            {isSelected && (
              <View style={[styles.selectedBadge, { backgroundColor: palette.tint }]}>
                <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
              </View>
            )}
          </Clickable>
        );
      })}
    </Row>
  );
};

// --- DatePicker ---
interface DatePickerSectionProps {
  mode: BlockMode;
  startDate: Date;
  endDate: Date;
  onAdjust: (target: 'start' | 'end', days: number) => void;
}

export const DatePickerSection = function DatePickerSection({
  mode,
  startDate,
  endDate,
  onAdjust,
}: DatePickerSectionProps) {
  const { colors: palette } = useTheme();
  return (
    <SurfaceCard style={styles.dateCard}>
      <DateRow
        label={mode === 'single' ? 'Date' : 'From'}
        date={startDate}
        color={palette.tint}
        onBack={() => onAdjust('start', -1)}
        onForward={() => onAdjust('start', 1)}
      />
      {mode !== 'single' && (
        <>
          <Divider spacing={Spacing.md} />
          <DateRow
            label="To"
            date={endDate}
            color={palette.error}
            onBack={() => onAdjust('end', -1)}
            onForward={() => onAdjust('end', 1)}
          />
        </>
      )}
    </SurfaceCard>
  );
};

function DateRow({
  label,
  date,
  color,
  onBack,
  onForward,
}: {
  label: string;
  date: Date;
  color: string;
  onBack: () => void;
  onForward: () => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <Row style={styles.dateRow}>
      <View style={[styles.dateIcon, { backgroundColor: withAlpha(color, 0.09) }]}>
        <Ionicons name="calendar" size={18} color={color} />
      </View>
      <View style={styles.dateInfo}>
        <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>{label}</ThemedText>
        <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>
          {formatBlockDate(date)}
        </ThemedText>
      </View>
      <Row style={styles.dateAdjust}>
        <Clickable
          accessibilityLabel="Go back"
          onPress={onBack}
          style={[styles.adjustButton, { borderColor: palette.border }]}
        >
          <Ionicons name="chevron-back" size={18} color={palette.text} />
        </Clickable>
        <Clickable
          accessibilityLabel="Next"
          onPress={onForward}
          style={[styles.adjustButton, { borderColor: palette.border }]}
        >
          <Ionicons name="chevron-forward" size={18} color={palette.text} />
        </Clickable>
      </Row>
    </Row>
  );
}

// --- ReasonSelector ---
export const ReasonSelector = function ReasonSelector({
  reason,
  onSelect,
}: {
  reason: string;
  onSelect: (id: string) => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <Row style={styles.reasonGrid}>
      {BLOCK_REASONS.map((r) => {
        const isSelected = reason === r.id;
        return (
          <Clickable
            key={r.id}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(r.id);
            }}
            style={[
              styles.reasonChip,
              {
                backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                borderColor: isSelected ? palette.tint : palette.border,
              },
            ]}
          >
            <Ionicons
              name={r.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={isSelected ? palette.tint : palette.muted}
            />
            <ThemedText
              style={[styles.reasonText, { color: isSelected ? palette.tint : palette.text }]}
            >
              {r.label}
            </ThemedText>
          </Clickable>
        );
      })}
    </Row>
  );
};

// --- Summary ---
export const BlockSummary = function BlockSummary({
  startDate,
  endDate,
  reason,
  isSameDay,
  dayCount,
}: {
  startDate: Date;
  endDate: Date;
  reason: string;
  isSameDay: boolean;
  dayCount: number;
}) {
  const { colors: palette } = useTheme();
  return (
    <SurfaceCard style={[styles.summaryCard, { backgroundColor: withAlpha(palette.error, 0.03) }]}>
      <Row style={styles.summaryRow}>
        <Ionicons name="alert-circle" size={20} color={palette.error} />
        <Column flex>
          <ThemedText type="defaultSemiBold" style={{ color: palette.error }}>
            Time Off Summary
          </ThemedText>
          <ThemedText style={[styles.summaryText, { color: palette.muted }]}>
            {isSameDay
              ? `${formatBlockDate(startDate)} will be blocked`
              : `${dayCount} days from ${formatBlockDate(startDate)} to ${formatBlockDate(endDate)} will be blocked`}
          </ThemedText>
          <ThemedText style={[styles.summaryText, { color: palette.muted }]}>
            Reason: {BLOCK_REASONS.find((r) => r.id === reason)?.label}
          </ThemedText>
        </Column>
      </Row>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  modeSelector: { gap: Spacing.xs },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  modeButtonText: { ...Typography.smallSemiBold },
  quickDates: { gap: Spacing.xs },
  quickDateChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  quickDateText: { fontWeight: '600' },
  holidayGrid: { flexWrap: 'wrap', gap: Spacing.sm },
  holidayCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 156,
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
    top: Spacing.xs,
    right: Spacing.xs,
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCard: { padding: Spacing.md },
  dateRow: { alignItems: 'center', gap: Spacing.md },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfo: { flex: 1 },
  dateLabel: { ...Typography.caption },
  dateAdjust: { gap: Spacing.xs },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonGrid: { flexWrap: 'wrap', gap: Spacing.xs },
  reasonChip: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  reasonText: { ...Typography.smallSemiBold },
  summaryCard: { padding: Spacing.md },
  summaryRow: { gap: Spacing.md },
  summaryText: { ...Typography.small, marginTop: Spacing.micro },
});
