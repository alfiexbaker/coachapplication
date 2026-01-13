/**
 * Coach Scheduling Settings Screen
 *
 * Allows coaches to configure:
 * - Minimum booking notice
 * - Maximum advance booking window
 * - Buffer time between sessions
 * - Rescheduling rules
 * - Cancellation policy
 *
 * USER STORY:
 * "As a coach, I want to control when clients can book sessions
 * so I can manage my preparation time and availability."
 */

import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  schedulingRulesService,
  SCHEDULING_PRESETS,
} from '@/services/scheduling-rules-service';
import {
  cancellationPolicyService,
  POLICY_TEMPLATES,
} from '@/services/cancellation-policy-service';
import type { CoachSchedulingRules, CancellationPolicy } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SchedulingSettings');

const ADVANCE_NOTICE_OPTIONS = [
  { hours: 2, label: '2 hours' },
  { hours: 6, label: '6 hours' },
  { hours: 12, label: '12 hours' },
  { hours: 24, label: '1 day' },
  { hours: 48, label: '2 days' },
  { hours: 72, label: '3 days' },
];

const MAX_ADVANCE_OPTIONS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
  { days: 60, label: '2 months' },
  { days: 90, label: '3 months' },
];

const BUFFER_OPTIONS = [
  { minutes: 0, label: 'None' },
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
];

export default function SchedulingSettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | null>(null);

  useEffect(() => {
    loadSettings();
  }, [currentUser]);

  const loadSettings = async () => {
    if (!currentUser?.id) return;

    try {
      const [loadedRules, loadedPolicy] = await Promise.all([
        schedulingRulesService.getCoachRules(currentUser.id),
        cancellationPolicyService.getCoachPolicy(currentUser.id),
      ]);

      setRules(loadedRules);
      setCancellationPolicy(loadedPolicy);
    } catch (error) {
      logger.error('Failed to load settings', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.id || !rules) return;

    setSaving(true);
    try {
      await schedulingRulesService.updateCoachRules(currentUser.id, rules);
      Alert.alert('Saved', 'Your scheduling settings have been updated');
      logger.success('SettingsSaved', { coachId: currentUser.id });
    } catch (error) {
      logger.error('Failed to save settings', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePresetSelect = async (presetKey: keyof typeof SCHEDULING_PRESETS) => {
    if (!currentUser?.id) return;

    try {
      const preset = SCHEDULING_PRESETS[presetKey];
      setRules(prev => prev ? { ...prev, ...preset.rules } : null);
    } catch (error) {
      logger.error('Failed to apply preset', error);
    }
  };

  const handleCancellationPolicySelect = async (policyKey: keyof typeof POLICY_TEMPLATES) => {
    if (!currentUser?.id) return;

    try {
      const updated = await cancellationPolicyService.setCoachPolicy(currentUser.id, policyKey);
      setCancellationPolicy(updated);
    } catch (error) {
      logger.error('Failed to update cancellation policy', error);
    }
  };

  const updateRule = <K extends keyof CoachSchedulingRules>(
    key: K,
    value: CoachSchedulingRules[K]
  ) => {
    setRules(prev => prev ? { ...prev, [key]: value } : null);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Scheduling Rules" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!rules) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Scheduling Rules" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ThemedText>Unable to load settings</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const effectivePolicy = cancellationPolicy || cancellationPolicyService.getDefaultPolicy();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader title="Scheduling Rules" showBack onBackPress={() => router.back()} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Presets */}
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={20} color={palette.tint} />
            <ThemedText type="subtitle">Quick Presets</ThemedText>
          </View>
          <ThemedText style={[styles.sectionDesc, { color: palette.muted }]}>
            Choose a preset to quickly configure your scheduling rules
          </ThemedText>

          <View style={styles.presetGrid}>
            {Object.entries(SCHEDULING_PRESETS).map(([key, preset]) => (
              <Pressable
                key={key}
                style={[
                  styles.presetCard,
                  {
                    borderColor: rules.minimumAdvanceBookingHours === preset.rules.minimumAdvanceBookingHours
                      ? palette.tint
                      : palette.border,
                    backgroundColor: rules.minimumAdvanceBookingHours === preset.rules.minimumAdvanceBookingHours
                      ? `${palette.tint}10`
                      : palette.surface,
                  }
                ]}
                onPress={() => handlePresetSelect(key as keyof typeof SCHEDULING_PRESETS)}
              >
                <ThemedText type="defaultSemiBold">{preset.name}</ThemedText>
                <ThemedText style={[styles.presetDesc, { color: palette.muted }]}>
                  {preset.description}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </SurfaceCard>

        {/* Minimum Notice */}
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color={palette.tint} />
            <ThemedText type="subtitle">Minimum Notice</ThemedText>
          </View>
          <ThemedText style={[styles.sectionDesc, { color: palette.muted }]}>
            How much notice do you need before a session?
          </ThemedText>

          <View style={styles.optionGrid}>
            {ADVANCE_NOTICE_OPTIONS.map((option) => (
              <Pressable
                key={option.hours}
                style={[
                  styles.optionButton,
                  {
                    borderColor: rules.minimumAdvanceBookingHours === option.hours
                      ? palette.tint
                      : palette.border,
                    backgroundColor: rules.minimumAdvanceBookingHours === option.hours
                      ? palette.tint
                      : 'transparent',
                  }
                ]}
                onPress={() => updateRule('minimumAdvanceBookingHours', option.hours)}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    { color: rules.minimumAdvanceBookingHours === option.hours ? '#fff' : palette.text }
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </SurfaceCard>

        {/* Maximum Advance Booking */}
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color={palette.tint} />
            <ThemedText type="subtitle">Booking Window</ThemedText>
          </View>
          <ThemedText style={[styles.sectionDesc, { color: palette.muted }]}>
            How far in advance can clients book?
          </ThemedText>

          <View style={styles.optionGrid}>
            {MAX_ADVANCE_OPTIONS.map((option) => (
              <Pressable
                key={option.days}
                style={[
                  styles.optionButton,
                  {
                    borderColor: rules.maxAdvanceBookingDays === option.days
                      ? palette.tint
                      : palette.border,
                    backgroundColor: rules.maxAdvanceBookingDays === option.days
                      ? palette.tint
                      : 'transparent',
                  }
                ]}
                onPress={() => updateRule('maxAdvanceBookingDays', option.days)}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    { color: rules.maxAdvanceBookingDays === option.days ? '#fff' : palette.text }
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </SurfaceCard>

        {/* Buffer Time */}
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pause-outline" size={20} color={palette.tint} />
            <ThemedText type="subtitle">Buffer Time</ThemedText>
          </View>
          <ThemedText style={[styles.sectionDesc, { color: palette.muted }]}>
            Default break between sessions
          </ThemedText>

          <View style={styles.optionGrid}>
            {BUFFER_OPTIONS.map((option) => (
              <Pressable
                key={option.minutes}
                style={[
                  styles.optionButton,
                  {
                    borderColor: rules.bufferMinutesDefault === option.minutes
                      ? palette.tint
                      : palette.border,
                    backgroundColor: rules.bufferMinutesDefault === option.minutes
                      ? palette.tint
                      : 'transparent',
                  }
                ]}
                onPress={() => updateRule('bufferMinutesDefault', option.minutes)}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    { color: rules.bufferMinutesDefault === option.minutes ? '#fff' : palette.text }
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </SurfaceCard>

        {/* Toggles */}
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={20} color={palette.tint} />
            <ThemedText type="subtitle">Additional Options</ThemedText>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText type="defaultSemiBold">Same-day bookings</ThemedText>
              <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
                Allow clients to book on the same day
              </ThemedText>
            </View>
            <Switch
              value={rules.allowSameDayBookings}
              onValueChange={(value) => updateRule('allowSameDayBookings', value)}
              trackColor={{ false: palette.border, true: palette.tint }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText type="defaultSemiBold">Allow rescheduling</ThemedText>
              <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
                Let clients reschedule their bookings
              </ThemedText>
            </View>
            <Switch
              value={rules.allowRescheduling}
              onValueChange={(value) => updateRule('allowRescheduling', value)}
              trackColor={{ false: palette.border, true: palette.tint }}
            />
          </View>
        </SurfaceCard>

        {/* Cancellation Policy */}
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={palette.tint} />
            <ThemedText type="subtitle">Cancellation Policy</ThemedText>
          </View>
          <ThemedText style={[styles.sectionDesc, { color: palette.muted }]}>
            Choose how refunds are handled when clients cancel
          </ThemedText>

          <View style={styles.policyOptions}>
            {Object.entries(POLICY_TEMPLATES).map(([key, template]) => (
              <Pressable
                key={key}
                style={[
                  styles.policyOption,
                  {
                    borderColor: effectivePolicy.name === template.name
                      ? palette.tint
                      : palette.border,
                    backgroundColor: effectivePolicy.name === template.name
                      ? `${palette.tint}10`
                      : palette.surface,
                  }
                ]}
                onPress={() => handleCancellationPolicySelect(key as keyof typeof POLICY_TEMPLATES)}
              >
                <View style={styles.policyHeader}>
                  <View style={[
                    styles.policyRadio,
                    { borderColor: effectivePolicy.name === template.name ? palette.tint : palette.border }
                  ]}>
                    {effectivePolicy.name === template.name && (
                      <View style={[styles.policyRadioInner, { backgroundColor: palette.tint }]} />
                    )}
                  </View>
                  <ThemedText type="defaultSemiBold">{template.name}</ThemedText>
                </View>
                <ThemedText style={[styles.policyDesc, { color: palette.muted }]}>
                  {template.description}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </SurfaceCard>

        {/* Summary */}
        <SurfaceCard style={[styles.section, { backgroundColor: `${palette.tint}08` }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={20} color={palette.success} />
            <ThemedText type="subtitle">Current Settings</ThemedText>
          </View>

          <View style={styles.summaryList}>
            {schedulingRulesService.formatRulesForDisplay(rules).map((item, index) => (
              <View key={index} style={styles.summaryItem}>
                <Ionicons name="checkmark" size={16} color={palette.tint} />
                <ThemedText style={styles.summaryText}>{item}</ThemedText>
              </View>
            ))}
            <View style={styles.summaryItem}>
              <Ionicons name="checkmark" size={16} color={palette.tint} />
              <ThemedText style={styles.summaryText}>
                {effectivePolicy.name} cancellation policy
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Pressable
          style={[styles.saveButton, { backgroundColor: saving ? palette.muted : palette.tint }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <ThemedText style={styles.saveButtonText}>Save Settings</ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.md,
    paddingBottom: 100,
    gap: Spacing.md,
  },
  section: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  presetCard: {
    width: '48%',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: 4,
  },
  presetDesc: {
    fontSize: 12,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    minWidth: 80,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleDesc: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  policyOptions: {
    gap: Spacing.sm,
  },
  policyOption: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: 4,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  policyRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  policyDesc: {
    fontSize: 13,
    marginLeft: 28,
  },
  summaryList: {
    gap: Spacing.xs,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryText: {
    fontSize: 14,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
