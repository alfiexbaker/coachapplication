import React from 'react';
import { View, ScrollView, StyleSheet, Switch, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import {
  NOTICE_OPTIONS,
  BUFFER_OPTIONS,
  ADVANCE_BOOKING_OPTIONS,
  RESCHEDULE_OPTIONS,
} from '@/hooks/use-scheduling-rules';
import { SchedulingOptionPicker } from '@/components/coach/scheduling-option-picker';
import { SchedulingRulesSummary } from '@/components/coach/scheduling-rules-summary';

function SectionHead({
  icon,
  color,
  title,
  sub,
  palette,
}: {
  icon: string;
  color: string;
  title: string;
  sub: string;
  palette: ThemeColors;
}) {
  return (
    <Row style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: withAlpha(color, 0.09) }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={color} />
      </View>
      <View style={styles.sectionTitleContainer}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>{sub}</ThemedText>
      </View>
    </Row>
  );
}

type Props = {
  palette: ThemeColors;
  refreshing: boolean;
  onRefresh: () => void;
  saving: boolean;
  hasChanges: boolean;
  minimumAdvanceHours: number;
  maxAdvanceDays: number;
  bufferMinutes: number;
  allowSameDayBookings: boolean;
  allowRescheduling: boolean;
  rescheduleDeadlineHours: number;
  setMinimumAdvanceHours: (value: number) => void;
  setMaxAdvanceDays: (value: number) => void;
  setBufferMinutes: (value: number) => void;
  setAllowSameDayBookings: (value: boolean) => void;
  setAllowRescheduling: (value: boolean) => void;
  setRescheduleDeadlineHours: (value: number) => void;
  updateField: <T>(setter: (value: T) => void) => (value: T) => void;
  onSave: () => void;
};

export const SchedulingRulesForm = React.memo(function SchedulingRulesForm({
  palette,
  refreshing,
  onRefresh,
  saving,
  hasChanges,
  minimumAdvanceHours,
  maxAdvanceDays,
  bufferMinutes,
  allowSameDayBookings,
  allowRescheduling,
  rescheduleDeadlineHours,
  setMinimumAdvanceHours,
  setMaxAdvanceDays,
  setBufferMinutes,
  setAllowSameDayBookings,
  setAllowRescheduling,
  setRescheduleDeadlineHours,
  updateField,
  onSave,
}: Props) {
  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        <SurfaceCard style={styles.section}>
          <SectionHead
            icon="time-outline"
            color={palette.warning}
            title="Minimum Notice"
            sub="How early athletes can book."
            palette={palette}
          />
          <SchedulingOptionPicker
            options={NOTICE_OPTIONS}
            selectedValue={minimumAdvanceHours}
            onSelect={updateField(setMinimumAdvanceHours)}
          />
          {minimumAdvanceHours === 0 ? (
            <Row
              style={[styles.warningBanner, { backgroundColor: withAlpha(palette.warning, 0.06) }]}
            >
              <Ionicons name="warning-outline" size={18} color={palette.warning} />
              <ThemedText style={[styles.warningText, { color: palette.warning }]}>
                Athletes can book up to kickoff time.
              </ThemedText>
            </Row>
          ) : null}
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <SectionHead
            icon="pause-outline"
            color={palette.tint}
            title="Buffer Between Sessions"
            sub="Automatic gap between sessions."
            palette={palette}
          />
          <SchedulingOptionPicker
            options={BUFFER_OPTIONS}
            selectedValue={bufferMinutes}
            onSelect={updateField(setBufferMinutes)}
          />
          <Row style={[styles.tipBanner, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
            <Ionicons name="bulb-outline" size={18} color={palette.success} />
            <ThemedText style={[styles.tipText, { color: palette.muted }]}>
              Build in travel, prep, and recovery time.
            </ThemedText>
          </Row>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <SectionHead
            icon="calendar-outline"
            color={palette.accent}
            title="Booking Window"
            sub="How far ahead athletes can book."
            palette={palette}
          />
          <SchedulingOptionPicker
            options={ADVANCE_BOOKING_OPTIONS}
            selectedValue={maxAdvanceDays}
            onSelect={updateField(setMaxAdvanceDays)}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.toggleSection}>
          <Row style={styles.toggleRow}>
            <Row style={styles.toggleInfo}>
              <View
                style={[styles.toggleIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}
              >
                <Ionicons name="today-outline" size={20} color={palette.success} />
              </View>
              <View style={styles.toggleTextContainer}>
                <ThemedText type="defaultSemiBold">Same-Day Bookings</ThemedText>
                <ThemedText style={[styles.toggleSubtext, { color: palette.muted }]}>
                  Allow athletes to book sessions for today
                </ThemedText>
              </View>
            </Row>
            <Switch
              value={allowSameDayBookings}
              onValueChange={(value) => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                updateField(setAllowSameDayBookings)(value);
              }}
              trackColor={{ false: palette.border, true: palette.success }}
              thumbColor={palette.surface}
            />
          </Row>
          {!allowSameDayBookings ? (
            <ThemedText style={[styles.toggleNote, { color: palette.muted }]}>
              Today bookings are blocked.
            </ThemedText>
          ) : null}
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <Row style={styles.toggleRow}>
            <Row style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <Ionicons name="swap-horizontal-outline" size={20} color={palette.tint} />
              </View>
              <View style={styles.toggleTextContainer}>
                <ThemedText type="defaultSemiBold">Allow Rescheduling</ThemedText>
                <ThemedText style={[styles.toggleSubtext, { color: palette.muted }]}>
                  Let athletes move bookings to a new slot.
                </ThemedText>
              </View>
            </Row>
            <Switch
              value={allowRescheduling}
              onValueChange={(value) => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                updateField(setAllowRescheduling)(value);
              }}
              trackColor={{ false: palette.border, true: palette.tint }}
              thumbColor={palette.surface}
            />
          </Row>
          {allowRescheduling ? (
            <>
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
              <ThemedText
                type="defaultSemiBold"
                style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}
              >
                Reschedule Deadline
              </ThemedText>
              <ThemedText
                style={[styles.toggleSubtext, { color: palette.muted, marginBottom: Spacing.md }]}
              >
                Latest time a change is allowed.
              </ThemedText>
              <SchedulingOptionPicker
                options={RESCHEDULE_OPTIONS}
                selectedValue={rescheduleDeadlineHours}
                onSelect={updateField(setRescheduleDeadlineHours)}
              />
            </>
          ) : null}
        </SurfaceCard>

        <SchedulingRulesSummary
          colors={palette}
          minimumAdvanceHours={minimumAdvanceHours}
          bufferMinutes={bufferMinutes}
          maxAdvanceDays={maxAdvanceDays}
          allowSameDayBookings={allowSameDayBookings}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: palette.border, backgroundColor: palette.background },
        ]}
      >
        <Clickable
          onPress={onSave}
          disabled={saving || !hasChanges}
          style={[
            styles.saveButton,
            {
              backgroundColor: hasChanges ? palette.tint : palette.border,
              opacity: saving ? 0.7 : 1,
            },
          ]}
        >
          {saving ? (
            <ThemedText style={styles.saveButtonText}>Saving...</ThemedText>
          ) : (
            <Row align="center" justify="center" gap="sm">
              <Ionicons name="checkmark-circle-outline" size={20} color={palette.onPrimary} />
              <ThemedText style={[styles.saveButtonText, { color: palette.onPrimary }]}>
                Save Rules
              </ThemedText>
            </Row>
          )}
        </Clickable>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.md },
  section: { padding: Spacing.md, borderRadius: Radii.lg },
  sectionHeader: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleContainer: { flex: 1, gap: Spacing.micro },
  sectionSubtitle: { ...Typography.small },
  warningBanner: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  warningText: { flex: 1, ...Typography.small },
  tipBanner: {
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  tipText: { flex: 1, ...Typography.small },
  toggleSection: { padding: Spacing.md, borderRadius: Radii.lg },
  toggleRow: { alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo: { alignItems: 'center', gap: Spacing.md, flex: 1 },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextContainer: { flex: 1 },
  toggleSubtext: { ...Typography.small, marginTop: Spacing.micro },
  toggleNote: { ...Typography.caption, marginTop: Spacing.sm },
  divider: { height: 1, marginVertical: Spacing.md },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 8,
    borderTopWidth: 1,
  },
  saveButton: { paddingVertical: 14, borderRadius: Radii.lg },
  saveButtonText: { ...Typography.subheading },
});
