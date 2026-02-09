/**
 * DayEditorSheet Component
 *
 * Bottom sheet for editing a single day's availability.
 * Supports three scopes: recurring, just-this-date, next-n-weeks.
 * Uses PanResponder + Animated (pure RN) following map-bottom-sheet pattern.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated as RNAnimated,
  PanResponder,
  Dimensions,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Spacing, Radii, Typography, withAlpha, Components } from '@/constants/theme';
import type { AvailabilityTemplate, AvailabilityOverride, CoachVenue } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';

const logger = createLogger('DayEditorSheet');

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.7;

const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export type DayEditorScope = 'recurring' | 'just-this-date' | 'next-n-weeks';

/** Parses HH:MM to total minutes */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Formats total minutes to HH:MM */
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Checks if two time ranges overlap */
function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

interface DayEditorSheetProps {
  visible: boolean;
  onClose: () => void;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dateStr?: string;
  template?: AvailabilityTemplate | null;
  existingOverride?: AvailabilityOverride | null;
  existingTemplatesForDay?: AvailabilityTemplate[];
  venues: CoachVenue[];
  defaultScope?: DayEditorScope;
  onSaveRecurring: (data: { dayOfWeek: number; startTime: string; endTime: string; location?: string }) => void;
  onSaveOverride: (data: { date: string; startTime: string; endTime: string; location?: string }) => void;
  onSaveRepeatedOverride: (data: { date: string; startTime: string; endTime: string; location?: string; repeatWeeks: number }) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onAddVenue?: (label: string) => void;
  coachId: string;
}

export function DayEditorSheet({
  visible,
  onClose,
  dayOfWeek,
  dateStr,
  template,
  existingOverride,
  existingTemplatesForDay,
  venues,
  defaultScope,
  onSaveRecurring,
  onSaveOverride,
  onSaveRepeatedOverride,
  onDeleteTemplate,
  onAddVenue,
  coachId,
}: DayEditorSheetProps) {
  const { colors: palette } = useTheme();

  const dayName = DAYS_FULL[dayOfWeek];

  // Form state
  const [scope, setScope] = useState<DayEditorScope>(defaultScope ?? 'recurring');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState<string>('');
  const [showAddVenueInput, setShowAddVenueInput] = useState(false);
  const [newVenueLabel, setNewVenueLabel] = useState('');

  // Animation
  const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new RNAnimated.Value(0)).current;

  // Sync form state with props when they change
  useEffect(() => {
    if (!visible) return;

    setScope(defaultScope ?? 'recurring');

    if (template) {
      setStartTime(template.startTime);
      setEndTime(template.endTime);
      setLocation(template.location ?? '');
    } else if (existingOverride?.customSlots?.length) {
      const slot = existingOverride.customSlots[0];
      setStartTime(slot.startTime);
      setEndTime(slot.endTime);
      setLocation(slot.location ?? '');
    } else if (existingTemplatesForDay && existingTemplatesForDay.length > 0) {
      // Smart default: start 15 min after the last existing slot's end
      const sorted = [...existingTemplatesForDay].sort((a, b) =>
        a.endTime.localeCompare(b.endTime)
      );
      const lastEnd = sorted[sorted.length - 1].endTime;
      const lastEndMins = timeToMinutes(lastEnd);
      const smartStart = Math.min(lastEndMins + 15, 23 * 60 + 45);
      const smartEnd = Math.min(smartStart + 120, 24 * 60);
      setStartTime(minutesToTime(smartStart));
      setEndTime(minutesToTime(smartEnd));
      setLocation('');
    } else {
      setStartTime('09:00');
      setEndTime('17:00');
      setLocation('');
    }
    setShowAddVenueInput(false);
    setNewVenueLabel('');
  }, [visible, template, existingOverride, existingTemplatesForDay, defaultScope]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      RNAnimated.parallel([
        RNAnimated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        RNAnimated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      RNAnimated.parallel([
        RNAnimated.spring(slideAnim, {
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        RNAnimated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayOpacity]);

  // Pan responder for drag-to-dismiss on handle
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          slideAnim.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80) {
          // Dismiss
          RNAnimated.parallel([
            RNAnimated.spring(slideAnim, {
              toValue: SCREEN_HEIGHT,
              useNativeDriver: true,
              damping: 20,
              stiffness: 200,
            }),
            RNAnimated.timing(overlayOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start(() => onClose());
        } else {
          // Snap back
          RNAnimated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
          }).start();
        }
      },
    })
  ).current;

  // Validation
  const isValid = useMemo(() => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return endH * 60 + endM > startH * 60 + startM;
  }, [startTime, endTime]);

  // Overlap validation: check if current time range overlaps any sibling template
  const overlapWarning = useMemo(() => {
    if (!existingTemplatesForDay || existingTemplatesForDay.length === 0) return null;
    const currentStart = timeToMinutes(startTime);
    const currentEnd = timeToMinutes(endTime);
    if (currentEnd <= currentStart) return null;

    // Filter out the template being edited (if any)
    const siblings = template
      ? existingTemplatesForDay.filter((t) => t.id !== template.id)
      : existingTemplatesForDay;

    for (const sibling of siblings) {
      const sibStart = timeToMinutes(sibling.startTime);
      const sibEnd = timeToMinutes(sibling.endTime);
      if (rangesOverlap(currentStart, currentEnd, sibStart, sibEnd)) {
        return `Overlaps with ${sibling.startTime} - ${sibling.endTime}${sibling.location ? ` (${sibling.location})` : ''}`;
      }
    }
    return null;
  }, [startTime, endTime, existingTemplatesForDay, template]);

  // Is this a "new time block" being added to a day that already has templates?
  const isNewTimeBlock = !template && (existingTemplatesForDay?.length ?? 0) > 0;

  // Duration badge
  const durationLabel = useMemo(() => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const mins = (endH * 60 + endM) - (startH * 60 + startM);
    if (mins <= 0) return null;
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    if (remainder === 0) return `${hours}h`;
    return `${hours}h ${remainder}m`;
  }, [startTime, endTime]);

  // Format date for display
  const formattedDate = useMemo(() => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }, [dateStr]);

  // Save button label
  const saveLabel = useMemo(() => {
    if (scope === 'recurring') return `Save for Every ${dayName}`;
    return `Save for This ${dayName}`;
  }, [scope, dayName]);

  // Handle auto-adjust end time when start time changes
  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    const [newStartH, newStartM] = newTime.split(':').map(Number);
    const [currentEndH, currentEndM] = endTime.split(':').map(Number);
    const newStartMins = newStartH * 60 + newStartM;
    const currentEndMins = currentEndH * 60 + currentEndM;
    if (currentEndMins <= newStartMins) {
      const newEndMins = Math.min(newStartMins + 120, 20 * 60);
      const h = Math.floor(newEndMins / 60);
      const m = newEndMins % 60;
      setEndTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  };

  // Handlers
  const handleSave = () => {
    if (!isValid) return;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const loc = location || undefined;

    if (scope === 'recurring') {
      onSaveRecurring({ dayOfWeek, startTime, endTime, location: loc });
    } else if (scope === 'just-this-date' && dateStr) {
      onSaveOverride({ date: dateStr, startTime, endTime, location: loc });
    }
  };

  const handleDelete = () => {
    if (!template || !onDeleteTemplate) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDeleteTemplate(template.id);
  };

  const handleAddVenue = () => {
    if (!newVenueLabel.trim() || !onAddVenue) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddVenue(newVenueLabel.trim());
    setLocation(newVenueLabel.trim());
    setNewVenueLabel('');
    setShowAddVenueInput(false);
  };

  const handleScopeChange = (newScope: DayEditorScope) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScope(newScope);
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay */}
      <RNAnimated.View style={[styles.overlay, { opacity: overlayOpacity, backgroundColor: withAlpha(palette.text, 0.4) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </RNAnimated.View>

      {/* Sheet */}
      <RNAnimated.View
        style={[
          styles.sheet,
          {
            backgroundColor: palette.surface,
            maxHeight: SHEET_MAX_HEIGHT,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {/* Handle */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            bounces={false}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <ThemedText style={[styles.headerTitle, { color: palette.text }]}>
                {isNewTimeBlock ? `${dayName} \u2014 New Time Block` : dayName}
              </ThemedText>
              <Clickable onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={palette.muted} />
              </Clickable>
            </View>

            {/* Existing Time Blocks on this day */}
            {existingTemplatesForDay && existingTemplatesForDay.length > 0 && (
              <View style={[styles.existingBlocksSection, { backgroundColor: withAlpha(palette.tint, 0.04), borderColor: palette.border }]}>
                <View style={styles.existingBlocksHeader}>
                  <Ionicons name="layers-outline" size={14} color={palette.muted} />
                  <ThemedText style={[styles.existingBlocksTitle, { color: palette.muted }]}>
                    {existingTemplatesForDay.length === 1 ? '1 time block' : `${existingTemplatesForDay.length} time blocks`} on {dayName}
                  </ThemedText>
                </View>
                {[...existingTemplatesForDay]
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((t) => {
                    const isCurrentEdit = template && template.id === t.id;
                    return (
                      <View
                        key={t.id}
                        style={[
                          styles.existingBlockRow,
                          { backgroundColor: isCurrentEdit ? withAlpha(palette.tint, 0.08) : 'transparent' },
                        ]}
                      >
                        <View style={[styles.existingBlockDot, { backgroundColor: isCurrentEdit ? palette.tint : palette.muted }]} />
                        <ThemedText style={[styles.existingBlockTime, { color: isCurrentEdit ? palette.tint : palette.text }]}>
                          {t.startTime} – {t.endTime}
                        </ThemedText>
                        {t.location ? (
                          <ThemedText style={[styles.existingBlockLocation, { color: palette.muted }]} numberOfLines={1}>
                            {t.location}
                          </ThemedText>
                        ) : null}
                        {isCurrentEdit && (
                          <View style={[styles.editingBadge, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                            <ThemedText style={[styles.editingBadgeText, { color: palette.tint }]}>editing</ThemedText>
                          </View>
                        )}
                      </View>
                    );
                  })}
              </View>
            )}

            {/* Scope Selector — two pills: "Every {day}" and "This {day}" */}
            <View style={styles.scopeRow}>
              <Clickable
                onPress={() => handleScopeChange('recurring')}
                style={[
                  styles.scopePill,
                  {
                    backgroundColor: scope === 'recurring' ? withAlpha(palette.tint, 0.12) : palette.background,
                    borderColor: scope === 'recurring' ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.scopePillText,
                    { color: scope === 'recurring' ? palette.tint : palette.muted },
                  ]}
                >
                  Every {dayName}
                </ThemedText>
              </Clickable>

              {dateStr && (
                <Clickable
                  onPress={() => handleScopeChange('just-this-date')}
                  style={[
                    styles.scopePill,
                    {
                      backgroundColor: scope === 'just-this-date' ? withAlpha(palette.tint, 0.12) : palette.background,
                      borderColor: scope === 'just-this-date' ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.scopePillText,
                      { color: scope === 'just-this-date' ? palette.tint : palette.muted },
                    ]}
                  >
                    This {dayName}
                  </ThemedText>
                </Clickable>
              )}
            </View>

            {/* Time Pickers */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Time Range</ThemedText>
              <View style={styles.timeRow}>
                <DateTimeField
                  mode="time"
                  label="Start"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  minuteInterval={15}
                  style={{ flex: 1 }}
                />
                <View style={styles.timeArrow}>
                  <Ionicons name="arrow-forward" size={16} color={palette.muted} />
                </View>
                <DateTimeField
                  mode="time"
                  label="End"
                  value={endTime}
                  onChange={setEndTime}
                  minuteInterval={15}
                  style={{ flex: 1 }}
                />
              </View>
              {durationLabel && isValid && (
                <View style={[styles.durationBadge, { backgroundColor: withAlpha(palette.success, 0.08) }]}>
                  <Ionicons name="time-outline" size={14} color={palette.success} />
                  <ThemedText style={[styles.durationText, { color: palette.success }]}>
                    {durationLabel}
                  </ThemedText>
                </View>
              )}
              {!isValid && (
                <ThemedText style={[styles.errorText, { color: palette.error }]}>
                  End time must be after start time
                </ThemedText>
              )}
              {isValid && overlapWarning && (
                <View style={[styles.overlapWarning, { backgroundColor: withAlpha(palette.warning, 0.08) }]}>
                  <Ionicons name="warning-outline" size={14} color={palette.warning} />
                  <ThemedText style={[styles.overlapWarningText, { color: palette.warning }]}>
                    {overlapWarning}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Location Chips */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Location</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueChipsScroll}>
                {venues.map((v) => {
                  const isSelected = location === v.label;
                  return (
                    <Clickable
                      key={v.id}
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setLocation(isSelected ? '' : v.label);
                      }}
                      style={[
                        styles.venueChip,
                        {
                          backgroundColor: isSelected ? withAlpha(palette.tint, 0.12) : palette.background,
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      {v.icon && (
                        <Ionicons
                          name={(v.icon as keyof typeof Ionicons.glyphMap) || 'location-outline'}
                          size={14}
                          color={isSelected ? palette.tint : palette.muted}
                        />
                      )}
                      <ThemedText
                        style={[styles.venueChipText, { color: isSelected ? palette.tint : palette.text }]}
                        numberOfLines={1}
                      >
                        {v.label}
                      </ThemedText>
                    </Clickable>
                  );
                })}
                {/* Add venue chip */}
                <Clickable
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAddVenueInput(!showAddVenueInput);
                  }}
                  style={[
                    styles.venueChip,
                    {
                      backgroundColor: showAddVenueInput ? withAlpha(palette.tint, 0.12) : palette.background,
                      borderColor: showAddVenueInput ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <Ionicons name="add" size={14} color={showAddVenueInput ? palette.tint : palette.muted} />
                  <ThemedText style={[styles.venueChipText, { color: showAddVenueInput ? palette.tint : palette.muted }]}>
                    Add
                  </ThemedText>
                </Clickable>
              </ScrollView>
              {showAddVenueInput && (
                <View style={[styles.addVenueRow, { borderColor: palette.border, backgroundColor: palette.background }]}>
                  <Ionicons name="location-outline" size={16} color={palette.muted} />
                  <TextInput
                    style={[styles.addVenueInput, { color: palette.text }]}
                    placeholder="New venue name"
                    placeholderTextColor={palette.muted}
                    value={newVenueLabel}
                    onChangeText={setNewVenueLabel}
                    onSubmitEditing={handleAddVenue}
                    autoFocus
                    returnKeyType="done"
                  />
                  <Clickable onPress={handleAddVenue} style={[styles.addVenueBtn, { backgroundColor: palette.tint }]}>
                    <Ionicons name="checkmark" size={16} color={palette.onPrimary} />
                  </Clickable>
                </View>
              )}
            </View>

            {/* Save Button */}
            <Clickable
              onPress={handleSave}
              disabled={!isValid}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: isValid ? palette.tint : palette.border,
                  opacity: isValid ? 1 : 0.5,
                },
              ]}
            >
              <ThemedText style={[styles.saveBtnText, { color: palette.onPrimary }]}>
                {saveLabel}
              </ThemedText>
            </Clickable>

            {/* Delete slot */}
            {template && onDeleteTemplate && (
              <Clickable onPress={handleDelete} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color={palette.error} />
                <ThemedText style={[styles.deleteBtnText, { color: palette.error }]}>
                  Remove This Slot
                </ThemedText>
              </Clickable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </RNAnimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor set inline with palette.text for dark mode support
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radii.card,
    borderTopRightRadius: Radii.card,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: Radii.pill,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl + 34, // safe area
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...Typography.title,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Existing blocks
  existingBlocksSection: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xxs,
  },
  existingBlocksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginBottom: Spacing.xxs,
  },
  existingBlocksTitle: {
    ...Typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  existingBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.sm,
  },
  existingBlockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  existingBlockTime: {
    ...Typography.smallSemiBold,
  },
  existingBlockLocation: {
    ...Typography.small,
    flex: 1,
  },
  editingBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  editingBadgeText: {
    ...Typography.micro,
  },
  // Scope
  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  scopePill: {
    paddingHorizontal: Spacing.sm,
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopePillText: {
    ...Typography.smallSemiBold,
  },
  // Sections
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Time
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  timeArrow: {
    paddingBottom: Spacing.sm,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  durationText: {
    ...Typography.smallSemiBold,
  },
  errorText: {
    ...Typography.small,
  },
  overlapWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
  },
  overlapWarningText: {
    ...Typography.small,
    flex: 1,
  },
  // Venues
  venueChipsScroll: {
    gap: Spacing.xs,
    paddingVertical: Spacing.micro,
  },
  venueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  venueChipText: {
    ...Typography.smallSemiBold,
  },
  addVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  addVenueInput: {
    flex: 1,
    ...Typography.body,
    padding: 0,
    minHeight: 44,
  },
  addVenueBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Save
  saveBtn: {
    minHeight: Components.button.height,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  saveBtnText: {
    ...Typography.bodySemiBold,
  },
  // Delete
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    minHeight: 44,
  },
  deleteBtnText: {
    ...Typography.bodySemiBold,
  },
});
