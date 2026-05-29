import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { toDateStr } from '@/utils/format';
import { REASONS, formatDateDisplay } from '@/hooks/use-time-off-form';
import { Row } from '@/components/primitives';

interface TimeOffFormStepProps {
  isEditing: boolean;
  mode: 'single' | 'range';
  startDate: Date;
  endDate: Date;
  reason: string;
  isSameDay: boolean;
  dayCount: number;
  checking: boolean;
  quickDates: { label: string; date: Date }[];
  onSelectMode: (m: 'single' | 'range') => void;
  onSelectQuickDate: (date: Date) => void;
  onAdjustDate: (target: 'start' | 'end', days: number) => void;
  onSelectReason: (id: string) => void;
  onCheckConflicts: () => void;
  onGoToRemove: () => void;
}

function TimeOffFormStepInner({
  isEditing,
  mode,
  startDate,
  endDate,
  reason,
  isSameDay,
  dayCount,
  checking,
  quickDates,
  onSelectMode,
  onSelectQuickDate,
  onAdjustDate,
  onSelectReason,
  onCheckConflicts,
  onGoToRemove,
}: TimeOffFormStepProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.content}>
      {/* Mode Toggle */}
      {!isEditing && (
        <Row style={styles.modeRow}>
          {(['single', 'range'] as const).map((m) => {
            const isActive = mode === m;
            return (
              <Clickable
                key={m}
                onPress={() => onSelectMode(m)}
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
                <ThemedText
                  style={[
                    styles.modeBtnText,
                    { color: isActive ? palette.onPrimary : palette.text },
                  ]}
                >
                  {m === 'single' ? 'Single Day' : 'Date Range'}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      )}

      {/* Quick Dates */}
      {mode === 'single' && !isEditing && (
        <Row style={styles.quickRow}>
          {quickDates.map((qd) => {
            const isSelected = toDateStr(startDate) === toDateStr(qd.date);
            return (
              <Clickable
                key={qd.label}
                onPress={() => onSelectQuickDate(qd.date)}
                accessibilityLabel={qd.label}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: isSelected
                      ? withAlpha(palette.tint, 0.09)
                      : palette.background,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.quickChipText,
                    { color: isSelected ? palette.tint : palette.text },
                  ]}
                >
                  {qd.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      )}

      {/* Date Selector */}
      <SurfaceCard style={styles.dateCard}>
        <Row style={styles.dateRow}>
          <View style={[styles.dateIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <Ionicons name="calendar" size={18} color={palette.tint} />
          </View>
          <View style={styles.dateInfo}>
            <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>
              {mode === 'single' ? 'Date' : 'From'}
            </ThemedText>
            <ThemedText type="defaultSemiBold">{formatDateDisplay(startDate)}</ThemedText>
          </View>
          {!isEditing && (
            <Row style={styles.dateAdjust}>
              <Clickable
                onPress={() => onAdjustDate('start', -1)}
                style={[styles.adjustBtn, { borderColor: palette.border }]}
                hitSlop={4}
                accessibilityLabel="Previous day"
              >
                <Ionicons name="chevron-back" size={16} color={palette.text} />
              </Clickable>
              <Clickable
                onPress={() => onAdjustDate('start', 1)}
                style={[styles.adjustBtn, { borderColor: palette.border }]}
                hitSlop={4}
                accessibilityLabel="Next day"
              >
                <Ionicons name="chevron-forward" size={16} color={palette.text} />
              </Clickable>
            </Row>
          )}
        </Row>

        {mode === 'range' && (
          <>
            <View style={[styles.dateDivider, { backgroundColor: palette.border }]} />
            <Row style={styles.dateRow}>
              <View style={[styles.dateIcon, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                <Ionicons name="calendar" size={18} color={palette.error} />
              </View>
              <View style={styles.dateInfo}>
                <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>To</ThemedText>
                <ThemedText type="defaultSemiBold">{formatDateDisplay(endDate)}</ThemedText>
              </View>
              <Row style={styles.dateAdjust}>
                <Clickable
                  onPress={() => onAdjustDate('end', -1)}
                  style={[styles.adjustBtn, { borderColor: palette.border }]}
                  hitSlop={4}
                  accessibilityLabel="Previous end day"
                >
                  <Ionicons name="chevron-back" size={16} color={palette.text} />
                </Clickable>
                <Clickable
                  onPress={() => onAdjustDate('end', 1)}
                  style={[styles.adjustBtn, { borderColor: palette.border }]}
                  hitSlop={4}
                  accessibilityLabel="Next end day"
                >
                  <Ionicons name="chevron-forward" size={16} color={palette.text} />
                </Clickable>
              </Row>
            </Row>
          </>
        )}
      </SurfaceCard>

      {!isSameDay && (
        <Row style={[styles.dayCountBadge, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
          <Ionicons name="time-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.dayCountText, { color: palette.warning }]}>
            {dayCount} day{dayCount !== 1 ? 's' : ''} off
          </ThemedText>
        </Row>
      )}

      {/* Reason Pills */}
      <View style={styles.reasonSection}>
        <ThemedText style={[styles.reasonTitle, { color: palette.muted }]}>Reason</ThemedText>
        <Row style={styles.reasonGrid}>
          {REASONS.map((r) => {
            const isSelected = reason === r.id;
            return (
              <Clickable
                key={r.id}
                onPress={() => onSelectReason(r.id)}
                accessibilityLabel={`Reason: ${r.label}`}
                style={[
                  styles.reasonChip,
                  {
                    backgroundColor: isSelected
                      ? withAlpha(palette.tint, 0.09)
                      : palette.background,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <Ionicons
                  name={r.icon}
                  size={14}
                  color={isSelected ? palette.tint : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.reasonChipText,
                    { color: isSelected ? palette.tint : palette.text },
                  ]}
                >
                  {r.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </View>

      {/* Actions */}
      <Clickable
        onPress={onCheckConflicts}
        disabled={checking}
        style={[styles.primaryBtn, { backgroundColor: palette.tint }]}
        accessibilityLabel={checking ? 'Checking for conflicts' : 'Check and confirm time off'}
      >
        <Ionicons name="shield-checkmark-outline" size={18} color={palette.onPrimary} />
        <ThemedText style={[styles.primaryBtnText, { color: palette.onPrimary }]}>
          {checking ? 'Checking...' : 'Check & Confirm'}
        </ThemedText>
      </Clickable>

      {isEditing && (
        <Clickable
          onPress={onGoToRemove}
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
  );
}

export const TimeOffFormStep = TimeOffFormStepInner;

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  modeRow: { gap: Spacing.xs },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minHeight: 44,
  },
  modeBtnText: { ...Typography.smallSemiBold },
  quickRow: { gap: Spacing.xs },
  quickChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  quickChipText: { ...Typography.smallSemiBold },
  dateCard: { padding: Spacing.md },
  dateRow: { alignItems: 'center', gap: Spacing.md },
  dateIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfo: { flex: 1 },
  dateLabel: { ...Typography.caption },
  dateAdjust: { gap: Spacing.xs },
  adjustBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDivider: { height: 1, marginVertical: Spacing.sm },
  dayCountBadge: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  dayCountText: { ...Typography.smallSemiBold },
  reasonSection: { gap: Spacing.xs },
  reasonTitle: { ...Typography.caption, textTransform: 'uppercase' },
  reasonGrid: { flexWrap: 'wrap', gap: Spacing.xs },
  reasonChip: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
  },
  reasonChipText: { ...Typography.smallSemiBold },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 52,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  primaryBtnText: { ...Typography.bodySemiBold },
  removeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  removeBtnText: { ...Typography.bodySemiBold },
});
