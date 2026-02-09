/**
 * WizardStepReview — Step 3: Review schedule and confirm.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DAYS_FULL_MAP, formatTime, type DayHours } from '@/hooks/use-availability-wizard';
import type { SessionTemplate } from '@/constants/session-types';

interface WizardStepReviewProps {
  selectedDays: boolean[];
  selectedCount: number;
  totalHoursLive: number;
  getHoursForDay: (index: number) => DayHours;
  location: string;
  linkedSessionTemplate?: SessionTemplate;
  saving: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

function WizardStepReviewInner({
  selectedDays, selectedCount, totalHoursLive, getHoursForDay,
  location, linkedSessionTemplate, saving, onConfirm, onBack,
}: WizardStepReviewProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      <View style={styles.stepHeader}>
        <View style={[styles.stepBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <ThemedText style={[styles.stepBadgeText, { color: palette.success }]}>Step 3 of 3</ThemedText>
        </View>
        <ThemedText type="subtitle" style={styles.stepTitle}>Review your schedule</ThemedText>
        <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
          {totalHoursLive} hours/week across {selectedCount} day{selectedCount !== 1 ? 's' : ''}
        </ThemedText>
      </View>

      <View style={styles.reviewList}>
        {selectedDays.map((selected, i) => {
          if (!selected) return null;
          const hours = getHoursForDay(i);
          return (
            <View key={DAYS_FULL_MAP[i]} style={[styles.reviewRow, { borderColor: palette.border }]}>
              <ThemedText type="defaultSemiBold">{DAYS_FULL_MAP[i]}</ThemedText>
              <View style={[styles.reviewTimeBadge, { backgroundColor: withAlpha(palette.success, 0.07) }]}>
                <Ionicons name="time-outline" size={14} color={palette.success} />
                <ThemedText style={[styles.reviewTimeText, { color: palette.success }]}>
                  {formatTime(hours.start)} - {formatTime(hours.end)}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </View>

      {(location || linkedSessionTemplate) && (
        <View style={styles.reviewExtras}>
          {location ? (
            <View style={[styles.reviewExtraBadge, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
              <Ionicons name="location-outline" size={14} color={palette.tint} />
              <ThemedText style={[styles.reviewExtraText, { color: palette.tint }]}>{location}</ThemedText>
            </View>
          ) : null}
          {linkedSessionTemplate ? (
            <View style={[styles.reviewExtraBadge, { backgroundColor: withAlpha(palette.accent, 0.07) }]}>
              <Ionicons name={linkedSessionTemplate.capacity === 1 ? 'person-outline' : 'people-outline'} size={14} color={palette.accent} />
              <ThemedText style={[styles.reviewExtraText, { color: palette.accent }]}>{linkedSessionTemplate.name}</ThemedText>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.navRow}>
        <Clickable onPress={onBack} style={[styles.backBtn, { borderColor: palette.border }]} accessibilityLabel="Back to hours">
          <Ionicons name="arrow-back" size={18} color={palette.text} />
          <ThemedText>Back</ThemedText>
        </Clickable>
        <Clickable onPress={onConfirm} disabled={saving} style={[styles.confirmBtn, { backgroundColor: palette.success, flex: 1, opacity: saving ? 0.6 : 1 }]} accessibilityLabel={saving ? 'Saving schedule' : 'Confirm schedule'}>
          <Ionicons name="checkmark" size={20} color={palette.onPrimary} />
          <ThemedText style={[styles.confirmBtnText, { color: palette.onPrimary }]}>
            {saving ? 'Saving...' : 'Confirm'}
          </ThemedText>
        </Clickable>
      </View>
    </>
  );
}

export const WizardStepReview = memo(WizardStepReviewInner);

const styles = StyleSheet.create({
  stepHeader: { gap: Spacing.xs },
  stepBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  stepBadgeText: { ...Typography.caption, fontWeight: '600' },
  stepTitle: { marginTop: Spacing.xs },
  stepSubtitle: { ...Typography.body },
  reviewList: { gap: Spacing.sm },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, minHeight: 44 },
  reviewTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  reviewTimeText: { ...Typography.smallSemiBold },
  reviewExtras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  reviewExtraBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  reviewExtraText: { ...Typography.smallSemiBold },
  navRow: { flexDirection: 'row', gap: Spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: Radii.md, borderWidth: 1, minHeight: 52 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radii.md, minHeight: 52 },
  confirmBtnText: { fontWeight: '600', fontSize: Typography.body.fontSize },
});
