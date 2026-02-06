import { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AvailabilityTemplate } from '@/constants/types';

const logger = createLogger('RecurringTemplateModal');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Time options for picker
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am to 8pm

// Common locations - defined outside component to be stable
const COMMON_LOCATIONS = [
  'Hackney Marshes',
  'Victoria Park',
  'London Fields',
  'Indoor Facility',
  'Online Session',
];
const formatHour = (hour: number) => {
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
};

const formatTimeValue = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
};

interface TimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHour?: number;
}

function TimePicker({ label, value, onChange, minHour = 6 }: TimePickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [showPicker, setShowPicker] = useState(false);

  const [currentHour] = value.split(':').map(Number);
  const availableHours = HOURS.filter(h => h >= minHour);

  const handleSelectHour = (hour: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(`${hour.toString().padStart(2, '0')}:00`);
    setShowPicker(false);
  };

  return (
    <View style={styles.timePickerContainer}>
      <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>{label}</ThemedText>
      <Clickable
        onPress={() => setShowPicker(true)}
        style={[styles.timePickerButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Ionicons name="time-outline" size={18} color={palette.tint} />
        <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
          {formatTimeValue(value)}
        </ThemedText>
        <Ionicons name="chevron-down" size={16} color={palette.muted} />
      </Clickable>

      <Modal visible={showPicker} animationType="fade" transparent onRequestClose={() => setShowPicker(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setShowPicker(false)}>
          <View style={[styles.pickerModal, { backgroundColor: palette.surface }]}>
            <View style={styles.pickerHeader}>
              <ThemedText type="subtitle">Select {label}</ThemedText>
              <Clickable onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color={palette.muted} />
              </Clickable>
            </View>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {availableHours.map((hour) => {
                const isSelected = hour === currentHour;
                return (
                  <Clickable
                    key={hour}
                    onPress={() => handleSelectHour(hour)}
                    style={[
                      styles.pickerOption,
                      {
                        backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : 'transparent',
                        borderColor: isSelected ? palette.tint : 'transparent',
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.pickerOptionText, { color: isSelected ? palette.tint : palette.text }]}
                    >
                      {formatHour(hour)}
                    </ThemedText>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={palette.tint} />}
                  </Clickable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// Quick presets for common schedules
const QUICK_PRESETS = [
  { id: 'weekdays', label: 'Weekdays', days: [1, 2, 3, 4, 5], icon: 'briefcase-outline' },
  { id: 'weekends', label: 'Weekends', days: [0, 6], icon: 'sunny-outline' },
  { id: 'mwf', label: 'Mon/Wed/Fri', days: [1, 3, 5], icon: 'calendar-outline' },
  { id: 'tth', label: 'Tue/Thu', days: [2, 4], icon: 'calendar-outline' },
];

interface RecurringTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (template: Omit<AvailabilityTemplate, 'id' | 'coachId'>) => Promise<void>;
  onDelete?: (templateId: string) => Promise<void>;
  editingTemplate?: AvailabilityTemplate | null;
  preselectedDay?: number;
  preselectedHour?: number;
}

export function RecurringTemplateModal({
  visible,
  onClose,
  onSave,
  onDelete,
  editingTemplate,
  preselectedDay,
  preselectedHour,
}: RecurringTemplateModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Multi-day selection (when adding new)
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Default to Monday
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState('');
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [saving, setSaving] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);

  const isEditing = !!editingTemplate;

  useEffect(() => {
    if (!visible) return; // Only run when modal becomes visible

    if (editingTemplate) {
      // Editing single template
      setSelectedDays([editingTemplate.dayOfWeek]);
      setStartTime(editingTemplate.startTime);
      setEndTime(editingTemplate.endTime);
      setLocation(editingTemplate.location || '');
      setMaxConcurrent(editingTemplate.maxConcurrent);
      setBufferMinutes(editingTemplate.bufferMinutes);
      setShowLocationInput(!!editingTemplate.location && !COMMON_LOCATIONS.includes(editingTemplate.location));
    } else {
      // Adding new - reset
      if (preselectedDay !== undefined) {
        setSelectedDays([preselectedDay]);
      } else {
        setSelectedDays([1]); // Default Monday
      }
      if (preselectedHour !== undefined) {
        setStartTime(`${preselectedHour.toString().padStart(2, '0')}:00`);
        const endHour = Math.min(preselectedHour + 2, 20);
        setEndTime(`${endHour.toString().padStart(2, '0')}:00`);
      } else {
        setStartTime('09:00');
        setEndTime('17:00');
      }
      setLocation('');
      setMaxConcurrent(1);
      setBufferMinutes(15);
      setShowLocationInput(false);
    }
  }, [editingTemplate, preselectedDay, preselectedHour, visible]);

  const toggleDay = (dayIndex: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays(prev => {
      if (prev.includes(dayIndex)) {
        // Don't allow deselecting last day
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== dayIndex);
      }
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  const applyPreset = (days: number[]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDays(days);
  };

  const calculateDuration = () => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

    if (durationMinutes <= 0) return null;

    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;

    if (mins === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    const [newStartH] = newTime.split(':').map(Number);
    const [currentEndH] = endTime.split(':').map(Number);
    if (currentEndH <= newStartH) {
      const newEndH = Math.min(newStartH + 2, 20);
      setEndTime(`${newEndH.toString().padStart(2, '0')}:00`);
    }
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      Alert.alert('Select Days', 'Please select at least one day');
      return;
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      Alert.alert('Invalid times', 'End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      // Save template for each selected day
      for (const dayOfWeek of selectedDays) {
        await onSave({
          dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          startTime,
          endTime,
          isRecurring: true,
          maxConcurrent,
          bufferMinutes,
          location: location || undefined,
        });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      logger.error('Failed to save template:', error);
      Alert.alert('Error', 'Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTemplate || !onDelete) return;

    Alert.alert('Delete Slot', 'Are you sure you want to delete this availability slot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await onDelete(editingTemplate.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onClose();
          } catch (error) {
            logger.error('Failed to delete template:', error);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const duration = calculateDuration();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={onClose} disabled={saving}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">
            {isEditing ? 'Edit Availability' : 'Add Availability'}
          </ThemedText>
          <Clickable onPress={handleSave} disabled={saving}>
            <ThemedText style={{ ...Typography.bodySemiBold, color: palette.tint }}>
              {saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </Clickable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Day Selection - Multi-select when adding, single when editing */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              {isEditing ? 'Day' : 'Select Days'}
            </ThemedText>
            {!isEditing && (
              <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                Select multiple days to set the same hours
              </ThemedText>
            )}

            {/* Quick presets - only when adding new */}
            {!isEditing && (
              <View style={styles.presetsRow}>
                {QUICK_PRESETS.map((preset) => {
                  const isActive = preset.days.every(d => selectedDays.includes(d)) &&
                                   selectedDays.every(d => preset.days.includes(d));
                  return (
                    <Clickable
                      key={preset.id}
                      onPress={() => applyPreset(preset.days)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isActive ? palette.tint : palette.surface,
                          borderColor: isActive ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={preset.icon as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color={isActive ? palette.onPrimary : palette.muted}
                      />
                      <ThemedText style={[styles.presetText, { color: isActive ? palette.onPrimary : palette.text }]}>
                        {preset.label}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </View>
            )}

            {/* Day chips - compact circular selectors */}
            <View style={styles.dayChipsRow}>
              {DAYS_SHORT.map((day, index) => {
                const isSelected = selectedDays.includes(index);
                const isWeekend = index === 0 || index === 6;
                return (
                  <Clickable
                    key={day}
                    onPress={() => !isEditing && toggleDay(index)}
                    disabled={isEditing}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: isSelected ? palette.tint : palette.surface,
                        borderColor: isSelected ? palette.tint : isWeekend ? palette.warning : palette.border,
                        opacity: isEditing && !isSelected ? 0.4 : 1,
                      },
                    ]}
                  >
                    <ThemedText style={[styles.dayChipText, { color: isSelected ? palette.onPrimary : palette.text }]}>
                      {day}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </View>

            {/* Selection summary */}
            {!isEditing && selectedDays.length > 0 && (
              <View style={[styles.selectionSummary, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
                <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                <ThemedText style={{ ...Typography.small, color: palette.success }}>
                  {selectedDays.length === 7
                    ? 'Every day'
                    : selectedDays.length === 1
                    ? DAYS[selectedDays[0]]
                    : `${selectedDays.length} days: ${selectedDays.map(d => DAYS_SHORT[d]).join(', ')}`}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Time Range */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Time Range</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              {isEditing
                ? `Set your available hours for ${DAYS[selectedDays[0]]}`
                : `Same hours will apply to all ${selectedDays.length} selected day${selectedDays.length > 1 ? 's' : ''}`}
            </ThemedText>

            <View style={styles.timeRow}>
              <TimePicker label="Start Time" value={startTime} onChange={handleStartTimeChange} minHour={6} />
              <View style={styles.timeArrow}>
                <Ionicons name="arrow-forward" size={20} color={palette.muted} />
              </View>
              <TimePicker
                label="End Time"
                value={endTime}
                onChange={setEndTime}
                minHour={parseInt(startTime.split(':')[0]) + 1}
              />
            </View>

            {duration && (
              <View style={[styles.durationBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                <Ionicons name="time-outline" size={16} color={palette.success} />
                <ThemedText style={{ ...Typography.bodySemiBold, color: palette.success }}>
                  {duration} availability {!isEditing && selectedDays.length > 1 && `× ${selectedDays.length} days`}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Location (Optional)</ThemedText>

            <View style={styles.locationOptions}>
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
                      styles.locationChip,
                      {
                        backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={loc === 'Online Session' ? 'videocam-outline' : 'location-outline'}
                      size={14}
                      color={isSelected ? palette.tint : palette.muted}
                    />
                    <ThemedText style={[styles.locationChipText, { color: isSelected ? palette.tint : palette.text }]}>
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
                  styles.locationChip,
                  {
                    backgroundColor: showLocationInput ? withAlpha(palette.tint, 0.09) : palette.surface,
                    borderColor: showLocationInput ? palette.tint : palette.border,
                  },
                ]}
              >
                <Ionicons name="add" size={14} color={showLocationInput ? palette.tint : palette.muted} />
                <ThemedText style={[styles.locationChipText, { color: showLocationInput ? palette.tint : palette.text }]}>
                  Custom
                </ThemedText>
              </Clickable>
            </View>

            {showLocationInput && (
              <View style={[styles.customLocationInput, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Ionicons name="location-outline" size={18} color={palette.muted} />
                <TextInput
                  style={[styles.customLocationTextInput, { color: palette.text }]}
                  placeholder="Enter custom location"
                  placeholderTextColor={palette.muted}
                  value={location}
                  onChangeText={setLocation}
                  autoFocus
                />
              </View>
            )}
          </View>

          {/* Session Type */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Session Type</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Choose between individual or group sessions
            </ThemedText>

            <View style={styles.sessionTypeRow}>
              <Clickable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMaxConcurrent(1);
                }}
                style={[
                  styles.sessionTypeOption,
                  {
                    backgroundColor: maxConcurrent === 1 ? withAlpha(palette.tint, 0.07) : palette.surface,
                    borderColor: maxConcurrent === 1 ? palette.tint : palette.border,
                    borderWidth: maxConcurrent === 1 ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.sessionTypeIconWrap, { backgroundColor: maxConcurrent === 1 ? withAlpha(palette.tint, 0.12) : palette.background }]}>
                  <Ionicons name="person-outline" size={22} color={maxConcurrent === 1 ? palette.tint : palette.muted} />
                </View>
                <ThemedText style={[styles.sessionTypeLabel, { color: maxConcurrent === 1 ? palette.tint : palette.text }]}>
                  1v1 Session
                </ThemedText>
                <ThemedText style={[styles.sessionTypeDesc, { color: palette.muted }]}>
                  One athlete at a time
                </ThemedText>
              </Clickable>

              <Clickable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (maxConcurrent <= 1) setMaxConcurrent(4);
                }}
                style={[
                  styles.sessionTypeOption,
                  {
                    backgroundColor: maxConcurrent > 1 ? withAlpha(palette.info, 0.07) : palette.surface,
                    borderColor: maxConcurrent > 1 ? palette.info : palette.border,
                    borderWidth: maxConcurrent > 1 ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.sessionTypeIconWrap, { backgroundColor: maxConcurrent > 1 ? withAlpha(palette.info, 0.12) : palette.background }]}>
                  <Ionicons name="people-outline" size={22} color={maxConcurrent > 1 ? palette.info : palette.muted} />
                </View>
                <ThemedText style={[styles.sessionTypeLabel, { color: maxConcurrent > 1 ? palette.info : palette.text }]}>
                  Group Session
                </ThemedText>
                <ThemedText style={[styles.sessionTypeDesc, { color: palette.muted }]}>
                  Multiple athletes
                </ThemedText>
              </Clickable>
            </View>

            {/* Group size stepper - only show when group is selected */}
            {maxConcurrent > 1 && (
              <View style={[styles.groupSizeRow, { backgroundColor: withAlpha(palette.info, 0.03), borderColor: palette.border }]}>
                <ThemedText style={[styles.groupSizeLabel, { color: palette.text }]}>
                  Max group size
                </ThemedText>
                <View style={styles.stepper}>
                  <Clickable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMaxConcurrent(Math.max(2, maxConcurrent - 1));
                    }}
                    style={[styles.stepperButton, { borderColor: palette.border, backgroundColor: palette.surface }]}
                  >
                    <Ionicons name="remove" size={18} color={palette.text} />
                  </Clickable>
                  <ThemedText style={styles.stepperValue}>{maxConcurrent}</ThemedText>
                  <Clickable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMaxConcurrent(maxConcurrent + 1);
                    }}
                    style={[styles.stepperButton, { borderColor: palette.border, backgroundColor: palette.surface }]}
                  >
                    <Ionicons name="add" size={18} color={palette.text} />
                  </Clickable>
                </View>
              </View>
            )}
          </View>

          {/* Buffer Time */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Buffer Time</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Break between sessions
            </ThemedText>

            <View style={styles.bufferOptions}>
              {[0, 15, 30].map((mins) => {
                const isSelected = bufferMinutes === mins;
                return (
                  <Clickable
                    key={mins}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBufferMinutes(mins);
                    }}
                    style={[
                      styles.bufferOption,
                      {
                        backgroundColor: isSelected ? palette.tint : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <ThemedText style={[styles.bufferOptionText, { color: isSelected ? palette.onPrimary : palette.text }]}>
                      {mins === 0 ? 'None' : `${mins} min`}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </View>
          </View>

          {/* Delete Button */}
          {isEditing && onDelete && (
            <Clickable
              onPress={handleDelete}
              disabled={saving}
              style={[styles.deleteButton, { borderColor: palette.error }]}
            >
              <Ionicons name="trash-outline" size={18} color={palette.error} />
              <ThemedText style={{ ...Typography.bodySemiBold, color: palette.error }}>Delete This Slot</ThemedText>
            </Clickable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.subheading,
  },
  sectionHint: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  presetText: {
    ...Typography.caption,
  },
  dayChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  dayChipText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  timePickerContainer: {
    flex: 1,
    gap: Spacing.xxs,
  },
  inputLabel: {
    ...Typography.caption,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 52,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  timeArrow: {
    paddingBottom: Spacing.sm,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  pickerModal: {
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  pickerScroll: {
    padding: Spacing.sm,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  pickerOptionText: {
    ...Typography.subheading,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  locationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  locationChipText: {
    ...Typography.smallSemiBold,
  },
  customLocationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  customLocationTextInput: {
    flex: 1,
    ...Typography.body,
    padding: 0,
  },
  sessionTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sessionTypeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  sessionTypeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTypeLabel: {
    ...Typography.bodySmallSemiBold,
    fontWeight: '700',
  },
  sessionTypeDesc: {
    ...Typography.caption,
    textAlign: 'center',
  },
  groupSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  groupSizeLabel: {
    ...Typography.bodySmallSemiBold,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...Typography.heading,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  bufferOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bufferOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  bufferOptionText: {
    ...Typography.smallSemiBold,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    marginTop: Spacing.md,
  },
});
