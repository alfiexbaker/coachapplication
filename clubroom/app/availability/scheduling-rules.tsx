import { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { schedulingRulesService, SCHEDULING_PRESETS } from '@/services/scheduling-rules-service';
import type { CoachSchedulingRules } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SchedulingRules');

// Pre-defined options for notice period
const NOTICE_OPTIONS = [
  { value: 0, label: 'No minimum', description: 'Allow immediate bookings' },
  { value: 2, label: '2 hours', description: 'Gives you a heads up' },
  { value: 6, label: '6 hours', description: 'Half day notice' },
  { value: 24, label: '24 hours', description: 'A full day ahead' },
  { value: 48, label: '48 hours', description: 'Two days notice' },
  { value: 72, label: '3 days', description: 'More prep time' },
];

// Buffer time options
const BUFFER_OPTIONS = [
  { value: 0, label: 'No buffer', description: 'Back-to-back sessions' },
  { value: 10, label: '10 mins', description: 'Quick break' },
  { value: 15, label: '15 mins', description: 'Standard break' },
  { value: 30, label: '30 mins', description: 'Time to reset' },
  { value: 45, label: '45 mins', description: 'Extended break' },
  { value: 60, label: '1 hour', description: 'Full hour between' },
];

// Max advance booking options
const ADVANCE_BOOKING_OPTIONS = [
  { value: 7, label: '1 week', description: '7 days ahead' },
  { value: 14, label: '2 weeks', description: '14 days ahead' },
  { value: 30, label: '1 month', description: '30 days ahead' },
  { value: 60, label: '2 months', description: '60 days ahead' },
  { value: 90, label: '3 months', description: '90 days ahead' },
];

// Reschedule deadline options
const RESCHEDULE_OPTIONS = [
  { value: 2, label: '2 hours before', description: 'Very flexible' },
  { value: 6, label: '6 hours before', description: 'Same-day changes OK' },
  { value: 24, label: '24 hours before', description: 'Day before cutoff' },
  { value: 48, label: '48 hours before', description: 'Two-day notice' },
];

interface OptionPickerProps<T> {
  options: Array<{ value: T; label: string; description: string }>;
  selectedValue: T;
  onSelect: (value: T) => void;
}

function OptionPicker<T extends number>({ options, selectedValue, onSelect }: OptionPickerProps<T>) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.optionsGrid}>
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <Clickable
            key={option.value}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(option.value as T);
            }}
            style={[
              styles.optionCard,
              {
                backgroundColor: isSelected ? `${palette.tint}12` : palette.background,
                borderColor: isSelected ? palette.tint : palette.border,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
          >
            <ThemedText
              type="defaultSemiBold"
              style={[styles.optionLabel, { color: isSelected ? palette.tint : palette.text }]}
            >
              {option.label}
            </ThemedText>
            <ThemedText style={[styles.optionDesc, { color: palette.muted }]}>
              {option.description}
            </ThemedText>
            {isSelected && (
              <View style={[styles.checkCircle, { backgroundColor: palette.tint }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </Clickable>
        );
      })}
    </View>
  );
}

export default function SchedulingRulesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [minimumAdvanceHours, setMinimumAdvanceHours] = useState(24);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [allowSameDayBookings, setAllowSameDayBookings] = useState(true);
  const [allowRescheduling, setAllowRescheduling] = useState(true);
  const [rescheduleDeadlineHours, setRescheduleDeadlineHours] = useState(24);

  const coachId = currentUser?.id || 'coach_1';

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await schedulingRulesService.getCoachRules(coachId);
      if (data) {
        setRules(data);
        setMinimumAdvanceHours(data.minimumAdvanceBookingHours);
        setMaxAdvanceDays(data.maxAdvanceBookingDays);
        setBufferMinutes(data.bufferMinutesDefault);
        setAllowSameDayBookings(data.allowSameDayBookings);
        setAllowRescheduling(data.allowRescheduling);
        setRescheduleDeadlineHours(data.rescheduleDeadlineHours);
      }
    } catch (error) {
      logger.error('Failed to load scheduling rules', error);
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await schedulingRulesService.updateCoachRules(coachId, {
        minimumAdvanceBookingHours: minimumAdvanceHours,
        maxAdvanceBookingDays: maxAdvanceDays,
        bufferMinutesDefault: bufferMinutes,
        maxConcurrentDefault: 1,
        allowSameDayBookings,
        allowRescheduling,
        rescheduleDeadlineHours,
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasChanges(false);
      Alert.alert('Saved', 'Your scheduling rules have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      logger.error('Failed to save scheduling rules', error);
      Alert.alert('Error', 'Failed to save scheduling rules. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (setter: (value: any) => void) => (value: any) => {
    setter(value);
    setHasChanges(true);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title="Scheduling Rules"
        subtitle="Control how athletes can book with you"
        showBack
        onBack={() => {
          if (hasChanges) {
            Alert.alert(
              'Unsaved Changes',
              'You have unsaved changes. Are you sure you want to leave?',
              [
                { text: 'Stay', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: () => router.back() },
              ]
            );
          } else {
            router.back();
          }
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Minimum Booking Notice */}
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${palette.warning}15` }]}>
              <Ionicons name="time-outline" size={22} color={palette.warning} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <ThemedText type="subtitle">Minimum Notice</ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                How much notice do you need before a session?
              </ThemedText>
            </View>
          </View>

          <OptionPicker
            options={NOTICE_OPTIONS}
            selectedValue={minimumAdvanceHours}
            onSelect={updateField(setMinimumAdvanceHours)}
          />

          {minimumAdvanceHours === 0 && (
            <View style={[styles.warningBanner, { backgroundColor: `${palette.warning}10` }]}>
              <Ionicons name="warning-outline" size={18} color={palette.warning} />
              <ThemedText style={[styles.warningText, { color: palette.warning }]}>
                Athletes can book at any time, even last minute
              </ThemedText>
            </View>
          )}
        </SurfaceCard>

        {/* Buffer Time */}
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="pause-outline" size={22} color={palette.tint} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <ThemedText type="subtitle">Buffer Between Sessions</ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                Time gap automatically added between bookings
              </ThemedText>
            </View>
          </View>

          <OptionPicker
            options={BUFFER_OPTIONS}
            selectedValue={bufferMinutes}
            onSelect={updateField(setBufferMinutes)}
          />

          <View style={[styles.tipBanner, { backgroundColor: `${palette.success}08` }]}>
            <Ionicons name="bulb-outline" size={18} color={palette.success} />
            <ThemedText style={[styles.tipText, { color: palette.muted }]}>
              Use buffer time to travel between locations, rest, or prepare equipment
            </ThemedText>
          </View>
        </SurfaceCard>

        {/* Advance Booking Window */}
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${palette.accent}15` }]}>
              <Ionicons name="calendar-outline" size={22} color={palette.accent} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <ThemedText type="subtitle">Booking Window</ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                How far in advance can athletes book?
              </ThemedText>
            </View>
          </View>

          <OptionPicker
            options={ADVANCE_BOOKING_OPTIONS}
            selectedValue={maxAdvanceDays}
            onSelect={updateField(setMaxAdvanceDays)}
          />
        </SurfaceCard>

        {/* Same Day Bookings */}
        <SurfaceCard style={styles.toggleSection}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: `${palette.success}15` }]}>
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
              thumbColor="#fff"
            />
          </View>

          {!allowSameDayBookings && (
            <ThemedText style={[styles.toggleNote, { color: palette.muted }]}>
              Bookings for today won't be allowed, regardless of minimum notice
            </ThemedText>
          )}
        </SurfaceCard>

        {/* Rescheduling */}
        <SurfaceCard style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: `${palette.tint}15` }]}>
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
              thumbColor="#fff"
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
              <OptionPicker
                options={RESCHEDULE_OPTIONS}
                selectedValue={rescheduleDeadlineHours}
                onSelect={updateField(setRescheduleDeadlineHours)}
              />
            </>
          )}
        </SurfaceCard>

        {/* Summary */}
        <SurfaceCard style={[styles.summaryCard, { backgroundColor: `${palette.tint}08` }]}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>
            Summary
          </ThemedText>
          <View style={styles.summaryList}>
            <View style={styles.summaryItem}>
              <Ionicons name="checkmark-circle" size={16} color={palette.success} />
              <ThemedText style={[styles.summaryText, { color: palette.text }]}>
                Athletes must book at least{' '}
                <ThemedText type="defaultSemiBold">
                  {minimumAdvanceHours === 0 ? 'anytime' : `${minimumAdvanceHours} hours`}
                </ThemedText>{' '}
                before
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="checkmark-circle" size={16} color={palette.success} />
              <ThemedText style={[styles.summaryText, { color: palette.text }]}>
                <ThemedText type="defaultSemiBold">{bufferMinutes} minutes</ThemedText> between sessions
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="checkmark-circle" size={16} color={palette.success} />
              <ThemedText style={[styles.summaryText, { color: palette.text }]}>
                Booking up to{' '}
                <ThemedText type="defaultSemiBold">{maxAdvanceDays} days</ThemedText> in advance
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons
                name={allowSameDayBookings ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={allowSameDayBookings ? palette.success : palette.muted}
              />
              <ThemedText style={[styles.summaryText, { color: palette.text }]}>
                Same-day bookings{' '}
                <ThemedText type="defaultSemiBold">
                  {allowSameDayBookings ? 'allowed' : 'not allowed'}
                </ThemedText>
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>
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
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <ThemedText style={styles.saveButtonText}>Save Rules</ThemedText>
            </>
          )}
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
    gap: Spacing.lg,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleContainer: {
    flex: 1,
    gap: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionCard: {
    width: '31%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    position: 'relative',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  checkCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  toggleSection: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  toggleNote: {
    fontSize: 12,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  summaryList: {
    gap: Spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryText: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 8,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radii.lg,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
