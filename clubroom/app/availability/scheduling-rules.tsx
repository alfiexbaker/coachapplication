import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { useTheme } from '@/hooks/useTheme';
import {
  useSchedulingRules,
  NOTICE_OPTIONS,
  BUFFER_OPTIONS,
  ADVANCE_BOOKING_OPTIONS,
  RESCHEDULE_OPTIONS,
} from '@/hooks/use-scheduling-rules';
import { SchedulingOptionPicker } from '@/components/coach/scheduling-option-picker';
import { SchedulingRulesSummary } from '@/components/coach/scheduling-rules-summary';

function SectionHead({ icon, color, title, sub, palette }: { icon: string; color: string; title: string; sub: string; palette: ThemeColors }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: withAlpha(color, 0.09) }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={color} />
      </View>
      <View style={styles.sectionTitleContainer}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>{sub}</ThemedText>
      </View>
    </View>
  );
}

export default function SchedulingRulesScreen() {
  const { colors: palette } = useTheme();
  const {
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
    handleSave,
    updateField,
    handleBack,
  } = useSchedulingRules();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title="Scheduling Rules"
        subtitle="Control how athletes can book with you"
        showBack
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Minimum Booking Notice */}
        <SurfaceCard style={styles.section}>
          <SectionHead icon="time-outline" color={palette.warning} title="Minimum Notice" sub="How much notice do you need before a session?" palette={palette} />
          <SchedulingOptionPicker
            options={NOTICE_OPTIONS}
            selectedValue={minimumAdvanceHours}
            onSelect={updateField(setMinimumAdvanceHours)}
          />
          {minimumAdvanceHours === 0 && (
            <View style={[styles.warningBanner, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
              <Ionicons name="warning-outline" size={18} color={palette.warning} />
              <ThemedText style={[styles.warningText, { color: palette.warning }]}>
                Athletes can book at any time, even last minute
              </ThemedText>
            </View>
          )}
        </SurfaceCard>

        {/* Buffer Time */}
        <SurfaceCard style={styles.section}>
          <SectionHead icon="pause-outline" color={palette.tint} title="Buffer Between Sessions" sub="Time gap automatically added between bookings" palette={palette} />
          <SchedulingOptionPicker
            options={BUFFER_OPTIONS}
            selectedValue={bufferMinutes}
            onSelect={updateField(setBufferMinutes)}
          />
          <View style={[styles.tipBanner, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
            <Ionicons name="bulb-outline" size={18} color={palette.success} />
            <ThemedText style={[styles.tipText, { color: palette.muted }]}>
              Use buffer time to travel between locations, rest, or prepare equipment
            </ThemedText>
          </View>
        </SurfaceCard>

        {/* Advance Booking Window */}
        <SurfaceCard style={styles.section}>
          <SectionHead icon="calendar-outline" color={palette.accent} title="Booking Window" sub="How far in advance can athletes book?" palette={palette} />
          <SchedulingOptionPicker
            options={ADVANCE_BOOKING_OPTIONS}
            selectedValue={maxAdvanceDays}
            onSelect={updateField(setMaxAdvanceDays)}
          />
        </SurfaceCard>

        {/* Same Day Bookings */}
        <SurfaceCard style={styles.toggleSection}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                <Ionicons name="today-outline" size={20} color={palette.success} />
              </View>
              <View style={styles.toggleTextContainer}>
                <ThemedText type="defaultSemiBold">Same-Day Bookings</ThemedText>
                <ThemedText style={[styles.toggleSubtext, { color: palette.muted }]}>
                  Allow athletes to book sessions for today
                </ThemedText>
              </View>
            </View>
            <Switch
              value={allowSameDayBookings}
              onValueChange={(value) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateField(setAllowSameDayBookings)(value);
              }}
              trackColor={{ false: palette.border, true: palette.success }}
              thumbColor={palette.surface}
            />
          </View>
          {!allowSameDayBookings && (
            <ThemedText style={[styles.toggleNote, { color: palette.muted }]}>
              Bookings for today won&apos;t be allowed, regardless of minimum notice
            </ThemedText>
          )}
        </SurfaceCard>

        {/* Rescheduling */}
        <SurfaceCard style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <Ionicons name="swap-horizontal-outline" size={20} color={palette.tint} />
              </View>
              <View style={styles.toggleTextContainer}>
                <ThemedText type="defaultSemiBold">Allow Rescheduling</ThemedText>
                <ThemedText style={[styles.toggleSubtext, { color: palette.muted }]}>
                  Let athletes move their booking to a new time
                </ThemedText>
              </View>
            </View>
            <Switch
              value={allowRescheduling}
              onValueChange={(value) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateField(setAllowRescheduling)(value);
              }}
              trackColor={{ false: palette.border, true: palette.tint }}
              thumbColor={palette.surface}
            />
          </View>
          {allowRescheduling && (
            <>
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
              <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
                Reschedule Deadline
              </ThemedText>
              <ThemedText style={[styles.toggleSubtext, { color: palette.muted, marginBottom: Spacing.md }]}>
                Cutoff for when rescheduling is allowed
              </ThemedText>
              <SchedulingOptionPicker
                options={RESCHEDULE_OPTIONS}
                selectedValue={rescheduleDeadlineHours}
                onSelect={updateField(setRescheduleDeadlineHours)}
              />
            </>
          )}
        </SurfaceCard>

        {/* Summary */}
        <SchedulingRulesSummary
          colors={palette}
          minimumAdvanceHours={minimumAdvanceHours}
          bufferMinutes={bufferMinutes}
          maxAdvanceDays={maxAdvanceDays}
          allowSameDayBookings={allowSameDayBookings}
        />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
        <Clickable
          onPress={handleSave}
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
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={palette.onPrimary} />
              <ThemedText style={[styles.saveButtonText, { color: palette.onPrimary }]}>Save Rules</ThemedText>
            </>
          )}
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.lg },
  section: { padding: Spacing.lg, borderRadius: Radii.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  sectionIcon: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  sectionTitleContainer: { flex: 1, gap: Spacing.micro },
  sectionSubtitle: { ...Typography.small },
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md, marginTop: Spacing.md },
  warningText: { flex: 1, ...Typography.small },
  tipBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md, marginTop: Spacing.md },
  tipText: { flex: 1, ...Typography.small },
  toggleSection: { padding: Spacing.lg, borderRadius: Radii.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  toggleIcon: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  toggleTextContainer: { flex: 1 },
  toggleSubtext: { ...Typography.small, marginTop: Spacing.micro },
  toggleNote: { ...Typography.caption, marginTop: Spacing.sm, fontStyle: 'italic' },
  divider: { height: 1, marginVertical: Spacing.md },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, paddingBottom: Spacing.xl + 8, borderTopWidth: 1 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: Radii.lg },
  saveButtonText: { ...Typography.subheading },
});
