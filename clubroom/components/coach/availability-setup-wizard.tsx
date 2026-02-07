/**
 * Availability Setup Wizard
 *
 * Shown inline when a coach has 0 availability templates.
 * Three steps: pick days, set hours, review & confirm.
 */

import { useState } from 'react';
import { View, StyleSheet, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { availabilityService } from '@/services/availability-service';
import { createLogger } from '@/utils/logger';
import type { SessionTemplate } from '@/constants/session-types';

const logger = createLogger('AvailabilitySetupWizard');

const COMMON_LOCATIONS = [
  'Hackney Marshes',
  'Victoria Park',
  'London Fields',
  'Indoor Facility',
  'Online Session',
];

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Map display index → dayOfWeek (0=Sun..6=Sat)
const DAY_OF_WEEK_MAP: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [1, 2, 3, 4, 5, 6, 0];
const DAYS_FULL_MAP = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface AvailabilitySetupWizardProps {
  coachId: string;
  onComplete: () => void;
  /** Pass existing templates to pre-populate for bulk edit mode */
  existingTemplates?: import('@/constants/types').AvailabilityTemplate[];
  /** Title override for edit mode */
  title?: string;
  /** Available session templates for type selection */
  sessionTemplates?: SessionTemplate[];
}

interface DayHours {
  start: string;
  end: string;
}

export function AvailabilitySetupWizard({ coachId, onComplete, existingTemplates, title, sessionTemplates }: AvailabilitySetupWizardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isEditMode = (existingTemplates?.length ?? 0) > 0;

  // Build initial state from existing templates
  const buildInitialState = () => {
    if (!existingTemplates || existingTemplates.length === 0) {
      return {
        days: Array(7).fill(false) as boolean[],
        same: true,
        global: { start: '09:00', end: '17:00' } as DayHours,
        perDay: Array(7).fill(null).map(() => ({ start: '09:00', end: '17:00' })) as DayHours[],
      };
    }

    const days = Array(7).fill(false) as boolean[];
    const perDay = Array(7).fill(null).map(() => ({ start: '09:00', end: '17:00' })) as DayHours[];
    let allSame = true;
    let firstStart = '';
    let firstEnd = '';

    for (const tmpl of existingTemplates) {
      // Map dayOfWeek (0=Sun..6=Sat) → display index (0=Mon..6=Sun)
      const displayIndex = tmpl.dayOfWeek === 0 ? 6 : tmpl.dayOfWeek - 1;
      days[displayIndex] = true;
      perDay[displayIndex] = { start: tmpl.startTime, end: tmpl.endTime };
      if (!firstStart) {
        firstStart = tmpl.startTime;
        firstEnd = tmpl.endTime;
      } else if (tmpl.startTime !== firstStart || tmpl.endTime !== firstEnd) {
        allSame = false;
      }
    }

    return {
      days,
      same: allSame,
      global: { start: firstStart || '09:00', end: firstEnd || '17:00' },
      perDay,
    };
  };

  const initial = buildInitialState();

  const [step, setStep] = useState(1);
  const [selectedDays, setSelectedDays] = useState<boolean[]>(initial.days);
  const [sameHours, setSameHours] = useState(initial.same);
  const [globalHours, setGlobalHours] = useState<DayHours>(initial.global);
  const [perDayHours, setPerDayHours] = useState<DayHours[]>(initial.perDay);
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [sessionTemplateId, setSessionTemplateId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const selectedCount = selectedDays.filter(Boolean).length;

  const toggleDay = (index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const applyPreset = (preset: 'weekdays' | 'weekends') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (preset === 'weekdays') {
      setSelectedDays([true, true, true, true, true, false, false]);
    } else {
      setSelectedDays([false, false, false, false, false, true, true]);
    }
  };

  const getHoursForDay = (index: number): DayHours => {
    return sameHours ? globalHours : perDayHours[index];
  };

  const updateDayHours = (index: number, field: 'start' | 'end', value: string) => {
    if (sameHours) {
      setGlobalHours(prev => ({ ...prev, [field]: value }));
    } else {
      setPerDayHours(prev => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    }
  };

  const calculateTotalHours = (): number => {
    let total = 0;
    selectedDays.forEach((selected, i) => {
      if (!selected) return;
      const hours = getHoursForDay(i);
      const [sh, sm] = hours.start.split(':').map(Number);
      const [eh, em] = hours.end.split(':').map(Number);
      total += ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    });
    return Math.round(total * 10) / 10;
  };

  const formatTime = (time: string): string => {
    const [h] = time.split(':').map(Number);
    if (h === 12) return '12pm';
    if (h === 0) return '12am';
    return h > 12 ? `${h - 12}pm` : `${h}am`;
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // In edit mode, check for conflicts on days being removed
      if (isEditMode && existingTemplates) {
        const removedDays: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [];
        for (const tmpl of existingTemplates) {
          const displayIndex = tmpl.dayOfWeek === 0 ? 6 : tmpl.dayOfWeek - 1;
          if (!selectedDays[displayIndex]) {
            removedDays.push(tmpl.dayOfWeek);
          }
        }

        if (removedDays.length > 0) {
          // Check next 4 weeks for conflicts on removed days
          let totalConflicts = 0;
          for (const dow of removedDays) {
            const result = await availabilityService.checkRecurringConflicts(coachId, dow);
            totalConflicts += result.bookingCount + result.holdCount;
          }

          if (totalConflicts > 0) {
            const proceed = await new Promise<boolean>((resolve) => {
              Alert.alert(
                'Appointments on Removed Days',
                `You have ${totalConflicts} appointment${totalConflicts !== 1 ? 's' : ''} on days you're removing. Existing appointments won't be cancelled, but no new ones can be booked.`,
                [
                  { text: 'Go Back', style: 'cancel', onPress: () => resolve(false) },
                  { text: 'Continue', onPress: () => resolve(true) },
                ]
              );
            });
            if (!proceed) {
              setSaving(false);
              return;
            }
          }

          // Delete templates for removed days
          for (const tmpl of existingTemplates) {
            const displayIndex = tmpl.dayOfWeek === 0 ? 6 : tmpl.dayOfWeek - 1;
            if (!selectedDays[displayIndex]) {
              await availabilityService.deleteTemplate(tmpl.id);
            }
          }
        }
      }

      // Save/update templates for selected days
      for (let i = 0; i < 7; i++) {
        if (!selectedDays[i]) continue;
        const hours = getHoursForDay(i);
        const dayOfWeek = DAY_OF_WEEK_MAP[i];

        // In edit mode, try to update existing template for this day
        const existingForDay = existingTemplates?.find((t) => t.dayOfWeek === dayOfWeek);

        await availabilityService.saveTemplate({
          ...(existingForDay ? { id: existingForDay.id } : {}),
          coachId,
          dayOfWeek,
          startTime: hours.start,
          endTime: hours.end,
          isRecurring: true,
          maxConcurrent: existingForDay?.maxConcurrent ?? 1,
          bufferMinutes: existingForDay?.bufferMinutes ?? 15,
          location: location || existingForDay?.location,
          sessionTemplateId: sessionTemplateId || existingForDay?.sessionTemplateId,
        });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.info(isEditMode ? 'Bulk availability updated' : 'Setup wizard completed', { days: selectedCount });
      onComplete();
    } catch (error) {
      logger.error('Failed to save templates', error);
      Alert.alert('Error', 'Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalHoursLive = calculateTotalHours();

  // Step 1: Which days do you coach?
  if (step === 1) {
    return (
      <SurfaceCard style={styles.card}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.stepBadgeText, { color: palette.tint }]}>Step 1 of 3</ThemedText>
          </View>
          <ThemedText type="subtitle" style={styles.stepTitle}>Which days do you coach?</ThemedText>
          <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
            Select the days you want to be available for bookings
          </ThemedText>
        </View>

        {/* Preset buttons */}
        <View style={styles.presetRow}>
          <Clickable
            onPress={() => applyPreset('weekdays')}
            style={[styles.presetBtn, { borderColor: palette.border }]}
          >
            <ThemedText style={[styles.presetText, { color: palette.tint }]}>Weekdays</ThemedText>
          </Clickable>
          <Clickable
            onPress={() => applyPreset('weekends')}
            style={[styles.presetBtn, { borderColor: palette.border }]}
          >
            <ThemedText style={[styles.presetText, { color: palette.tint }]}>Weekends</ThemedText>
          </Clickable>
        </View>

        {/* Day grid */}
        <View style={styles.dayGrid}>
          {DAYS_SHORT.map((day, index) => (
            <Clickable
              key={day}
              onPress={() => toggleDay(index)}
              style={[
                styles.dayCell,
                {
                  backgroundColor: selectedDays[index] ? palette.tint : palette.background,
                  borderColor: selectedDays[index] ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.dayCellText,
                  { color: selectedDays[index] ? Colors.light.onPrimary : palette.text },
                ]}
              >
                {day}
              </ThemedText>
            </Clickable>
          ))}
        </View>

        <Clickable
          onPress={() => selectedCount > 0 && setStep(2)}
          style={[
            styles.nextBtn,
            { backgroundColor: selectedCount > 0 ? palette.tint : palette.border },
          ]}
        >
          <ThemedText style={[styles.nextBtnText, { color: Colors.light.onPrimary }]}>
            Continue ({selectedCount} day{selectedCount !== 1 ? 's' : ''})
          </ThemedText>
          <Ionicons name="arrow-forward" size={18} color={Colors.light.onPrimary} />
        </Clickable>
      </SurfaceCard>
    );
  }

  // Step 2: What hours?
  if (step === 2) {
    return (
      <SurfaceCard style={styles.card}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.stepBadgeText, { color: palette.tint }]}>Step 2 of 3</ThemedText>
          </View>
          <ThemedText type="subtitle" style={styles.stepTitle}>What hours?</ThemedText>
          <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
            Set your coaching hours for each day
          </ThemedText>
        </View>

        {/* Live weekly hours counter */}
        <View style={[
          styles.hoursBanner,
          {
            backgroundColor: withAlpha(
              totalHoursLive > 20 ? palette.warning : totalHoursLive >= 5 ? palette.tint : palette.muted,
              0.08
            ),
          },
        ]}>
          <Ionicons
            name="time-outline"
            size={18}
            color={totalHoursLive > 20 ? palette.warning : totalHoursLive >= 5 ? palette.tint : palette.muted}
          />
          <ThemedText style={[
            styles.hoursBannerText,
            { color: totalHoursLive > 20 ? palette.warning : totalHoursLive >= 5 ? palette.tint : palette.muted },
          ]}>
            {totalHoursLive > 0
              ? `${totalHoursLive} hrs/week across ${selectedCount} day${selectedCount !== 1 ? 's' : ''}`
              : 'Set your available hours'}
          </ThemedText>
        </View>

        {/* Same hours toggle */}
        <Clickable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSameHours(!sameHours);
          }}
          style={[styles.toggleRow, { borderColor: palette.border }]}
        >
          <View style={[
            styles.toggleSwitch,
            { backgroundColor: sameHours ? palette.tint : palette.border },
          ]}>
            <View style={[
              styles.toggleThumb,
              { transform: [{ translateX: sameHours ? 18 : 2 }] },
            ]} />
          </View>
          <ThemedText style={styles.toggleLabel}>Same hours for all days</ThemedText>
        </Clickable>

        {sameHours ? (
          <View style={styles.hoursRow}>
            <DateTimeField
              mode="time"
              label="Start"
              value={globalHours.start}
              onChange={(v) => setGlobalHours(prev => ({ ...prev, start: v }))}
              minuteInterval={15}
              style={styles.timePicker}
            />
            <DateTimeField
              mode="time"
              label="End"
              value={globalHours.end}
              onChange={(v) => setGlobalHours(prev => ({ ...prev, end: v }))}
              minuteInterval={15}
              style={styles.timePicker}
            />
          </View>
        ) : (
          <View style={styles.perDayList}>
            {selectedDays.map((selected, i) => {
              if (!selected) return null;
              return (
                <View key={DAYS_SHORT[i]} style={[styles.perDayRow, { borderColor: palette.border }]}>
                  <ThemedText type="defaultSemiBold" style={styles.perDayLabel}>
                    {DAYS_SHORT[i]}
                  </ThemedText>
                  <DateTimeField
                    mode="time"
                    value={perDayHours[i].start}
                    onChange={(v) => updateDayHours(i, 'start', v)}
                    minuteInterval={15}
                    style={styles.timePickerSmall}
                  />
                  <ThemedText style={{ color: palette.muted }}>to</ThemedText>
                  <DateTimeField
                    mode="time"
                    value={perDayHours[i].end}
                    onChange={(v) => updateDayHours(i, 'end', v)}
                    minuteInterval={15}
                    style={styles.timePickerSmall}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Location */}
        <View style={styles.sectionBlock}>
          <ThemedText type="defaultSemiBold">Location (Optional)</ThemedText>
          <View style={styles.chipRow}>
            {COMMON_LOCATIONS.map((loc) => {
              const isSelected = location === loc;
              return (
                <Clickable
                  key={loc}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLocation(isSelected ? '' : loc);
                    setShowLocationInput(false);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.background,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={loc === 'Online Session' ? 'videocam-outline' : 'location-outline'}
                    size={14}
                    color={isSelected ? palette.tint : palette.muted}
                  />
                  <ThemedText style={[styles.chipText, { color: isSelected ? palette.tint : palette.text }]}>
                    {loc}
                  </ThemedText>
                </Clickable>
              );
            })}
            <Clickable
              onPress={() => {
                setShowLocationInput(true);
                setLocation('');
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: showLocationInput ? withAlpha(palette.tint, 0.09) : palette.background,
                  borderColor: showLocationInput ? palette.tint : palette.border,
                },
              ]}
            >
              <Ionicons name="add" size={14} color={showLocationInput ? palette.tint : palette.muted} />
              <ThemedText style={[styles.chipText, { color: showLocationInput ? palette.tint : palette.text }]}>
                Custom
              </ThemedText>
            </Clickable>
          </View>
          {showLocationInput && (
            <View style={[styles.customInput, { borderColor: palette.border, backgroundColor: palette.background }]}>
              <Ionicons name="location-outline" size={18} color={palette.muted} />
              <TextInput
                style={[styles.customInputText, { color: palette.text }]}
                placeholder="Enter custom location"
                placeholderTextColor={palette.muted}
                value={location}
                onChangeText={setLocation}
                autoFocus
              />
            </View>
          )}
        </View>

        {/* Session Template */}
        {sessionTemplates && sessionTemplates.length > 0 && (
          <View style={styles.sectionBlock}>
            <ThemedText type="defaultSemiBold">Session Type (Optional)</ThemedText>
            <View style={styles.chipRow}>
              <Clickable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSessionTemplateId(undefined);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: !sessionTemplateId ? withAlpha(palette.tint, 0.09) : palette.background,
                    borderColor: !sessionTemplateId ? palette.tint : palette.border,
                  },
                ]}
              >
                <Ionicons name="apps-outline" size={14} color={!sessionTemplateId ? palette.tint : palette.muted} />
                <ThemedText style={[styles.chipText, { color: !sessionTemplateId ? palette.tint : palette.text }]}>
                  Any Type
                </ThemedText>
              </Clickable>
              {sessionTemplates.map((st) => {
                const isSelected = sessionTemplateId === st.id;
                return (
                  <Clickable
                    key={st.id}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSessionTemplateId(isSelected ? undefined : st.id);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? withAlpha(palette.accent, 0.09) : palette.background,
                        borderColor: isSelected ? palette.accent : palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={st.capacity === 1 ? 'person-outline' : 'people-outline'}
                      size={14}
                      color={isSelected ? palette.accent : palette.muted}
                    />
                    <ThemedText style={[styles.chipText, { color: isSelected ? palette.accent : palette.text }]}>
                      {st.name}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.navRow}>
          <Clickable
            onPress={() => setStep(1)}
            style={[styles.backBtn, { borderColor: palette.border }]}
          >
            <Ionicons name="arrow-back" size={18} color={palette.text} />
            <ThemedText>Back</ThemedText>
          </Clickable>
          <Clickable
            onPress={() => setStep(3)}
            style={[styles.nextBtn, { backgroundColor: palette.tint, flex: 1 }]}
          >
            <ThemedText style={[styles.nextBtnText, { color: Colors.light.onPrimary }]}>
              Review
            </ThemedText>
            <Ionicons name="arrow-forward" size={18} color={Colors.light.onPrimary} />
          </Clickable>
        </View>
      </SurfaceCard>
    );
  }

  // Step 3: Review
  const linkedSessionTemplate = sessionTemplateId
    ? sessionTemplates?.find(st => st.id === sessionTemplateId)
    : undefined;

  return (
    <SurfaceCard style={styles.card}>
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
            <View key={DAYS_SHORT[i]} style={[styles.reviewRow, { borderColor: palette.border }]}>
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

      {/* Review extras */}
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
              <Ionicons
                name={linkedSessionTemplate.capacity === 1 ? 'person-outline' : 'people-outline'}
                size={14}
                color={palette.accent}
              />
              <ThemedText style={[styles.reviewExtraText, { color: palette.accent }]}>
                {linkedSessionTemplate.name}
              </ThemedText>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.navRow}>
        <Clickable
          onPress={() => setStep(2)}
          style={[styles.backBtn, { borderColor: palette.border }]}
        >
          <Ionicons name="arrow-back" size={18} color={palette.text} />
          <ThemedText>Back</ThemedText>
        </Clickable>
        <Clickable
          onPress={handleConfirm}
          style={[styles.nextBtn, { backgroundColor: palette.success, flex: 1, opacity: saving ? 0.6 : 1 }]}
        >
          <Ionicons name="checkmark" size={20} color={Colors.light.onPrimary} />
          <ThemedText style={[styles.nextBtnText, { color: Colors.light.onPrimary }]}>
            {saving ? 'Saving...' : 'Confirm'}
          </ThemedText>
        </Clickable>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  stepHeader: {
    gap: Spacing.xs,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  stepBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  stepTitle: {
    marginTop: Spacing.xs,
  },
  stepSubtitle: {
    ...Typography.body,
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  presetBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  presetText: {
    ...Typography.smallSemiBold,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  dayCell: {
    width: '13%',
    minWidth: 42,
    aspectRatio: 1,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellText: {
    ...Typography.smallSemiBold,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  nextBtnText: {
    fontWeight: '600',
    fontSize: Typography.body.fontSize,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  toggleSwitch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  toggleLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  hoursRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timePicker: {
    flex: 1,
  },
  timePickerSmall: {
    flex: 1,
  },
  perDayList: {
    gap: Spacing.sm,
  },
  perDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  perDayLabel: {
    width: 36,
  },
  navRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  reviewList: {
    gap: Spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  reviewTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  reviewTimeText: {
    ...Typography.smallSemiBold,
  },
  hoursBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  hoursBannerText: {
    ...Typography.bodySmallSemiBold,
  },
  sectionBlock: {
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.smallSemiBold,
  },
  customInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  customInputText: {
    flex: 1,
    ...Typography.body,
    padding: 0,
  },
  reviewExtras: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  reviewExtraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  reviewExtraText: {
    ...Typography.smallSemiBold,
  },
});
