import { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AvailabilityTemplate } from '@/constants/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Time options for picker
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am to 8pm
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
                        backgroundColor: isSelected ? `${palette.tint}15` : 'transparent',
                        borderColor: isSelected ? palette.tint : 'transparent',
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.pickerOptionText,
                        { color: isSelected ? palette.tint : palette.text },
                      ]}
                    >
                      {formatHour(hour)}
                    </ThemedText>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                    )}
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

  const [dayOfWeek, setDayOfWeek] = useState<number>(preselectedDay ?? 1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState('');
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [saving, setSaving] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);

  // Common locations
  const COMMON_LOCATIONS = [
    'Hackney Marshes',
    'Victoria Park',
    'London Fields',
    'Indoor Facility',
    'Online Session',
  ];

  useEffect(() => {
    if (editingTemplate) {
      setDayOfWeek(editingTemplate.dayOfWeek);
      setStartTime(editingTemplate.startTime);
      setEndTime(editingTemplate.endTime);
      setLocation(editingTemplate.location || '');
      setMaxConcurrent(editingTemplate.maxConcurrent);
      setBufferMinutes(editingTemplate.bufferMinutes);
      setShowLocationInput(!!editingTemplate.location && !COMMON_LOCATIONS.includes(editingTemplate.location));
    } else {
      // Reset to defaults or preselected values
      setDayOfWeek(preselectedDay ?? 1);
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

  // Calculate duration
  const calculateDuration = () => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const durationMinutes = endMinutes - startMinutes;

    if (durationMinutes <= 0) return null;

    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;

    if (mins === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    // Auto-adjust end time if needed
    const [newStartH] = newTime.split(':').map(Number);
    const [currentEndH] = endTime.split(':').map(Number);
    if (currentEndH <= newStartH) {
      const newEndH = Math.min(newStartH + 2, 20);
      setEndTime(`${newEndH.toString().padStart(2, '0')}:00`);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!startTime || !endTime) {
      Alert.alert('Missing fields', 'Please fill in start and end times');
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
      await onSave({
        dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        startTime,
        endTime,
        isRecurring: true,
        maxConcurrent,
        bufferMinutes,
        location: location || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
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
            console.error('Failed to delete template:', error);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  const duration = calculateDuration();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={handleClose} disabled={saving}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">
            {editingTemplate ? 'Edit Availability' : 'Add Availability'}
          </ThemedText>
          <Clickable onPress={handleSave} disabled={saving}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
              {saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </Clickable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Day Selection */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Day of Week</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Select which day this availability applies to
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
              <View style={styles.daysRow}>
                {DAYS.map((day, index) => {
                  const isSelected = dayOfWeek === index;
                  const isWeekend = index === 0 || index === 6;
                  return (
                    <Clickable
                      key={day}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDayOfWeek(index);
                      }}
                      style={[
                        styles.dayButton,
                        {
                          backgroundColor: isSelected ? palette.tint : palette.surface,
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.dayButtonText,
                          { color: isSelected ? '#fff' : palette.text },
                        ]}
                      >
                        {day.substring(0, 3)}
                      </ThemedText>
                      {isWeekend && !isSelected && (
                        <View style={[styles.weekendDot, { backgroundColor: palette.warning }]} />
                      )}
                    </Clickable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Time Range with Visual Preview */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Time Range</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Set your available hours for {DAYS[dayOfWeek]}
            </ThemedText>

            <View style={styles.timeRow}>
              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={handleStartTimeChange}
                minHour={6}
              />
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

            {/* Duration Summary */}
            {duration && (
              <View style={[styles.durationBadge, { backgroundColor: `${palette.success}15` }]}>
                <Ionicons name="time-outline" size={16} color={palette.success} />
                <ThemedText style={{ color: palette.success, fontWeight: '600' }}>
                  {duration} availability
                </ThemedText>
              </View>
            )}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Location (Optional)</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Where will sessions take place?
            </ThemedText>

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
                        backgroundColor: isSelected ? `${palette.tint}15` : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={loc === 'Online Session' ? 'videocam-outline' : 'location-outline'}
                      size={14}
                      color={isSelected ? palette.tint : palette.muted}
                    />
                    <ThemedText
                      style={[
                        styles.locationChipText,
                        { color: isSelected ? palette.tint : palette.text },
                      ]}
                    >
                      {loc}
                    </ThemedText>
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={palette.tint} />
                    )}
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
                    backgroundColor: showLocationInput ? `${palette.tint}15` : palette.surface,
                    borderColor: showLocationInput ? palette.tint : palette.border,
                  },
                ]}
              >
                <Ionicons name="add" size={14} color={showLocationInput ? palette.tint : palette.muted} />
                <ThemedText
                  style={[
                    styles.locationChipText,
                    { color: showLocationInput ? palette.tint : palette.text },
                  ]}
                >
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

          {/* Capacity Settings */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Capacity Settings</ThemedText>

            <SurfaceCard style={styles.settingsCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={[styles.settingIcon, { backgroundColor: `${palette.tint}15` }]}>
                    <Ionicons name="people-outline" size={18} color={palette.tint} />
                  </View>
                  <View style={styles.settingText}>
                    <ThemedText type="defaultSemiBold">Concurrent Sessions</ThemedText>
                    <ThemedText style={[styles.settingHint, { color: palette.muted }]}>
                      How many sessions at once?
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.stepper}>
                  <Clickable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMaxConcurrent(Math.max(1, maxConcurrent - 1));
                    }}
                    style={[styles.stepperButton, { borderColor: palette.border, backgroundColor: palette.background }]}
                  >
                    <Ionicons name="remove" size={18} color={palette.text} />
                  </Clickable>
                  <ThemedText style={styles.stepperValue}>{maxConcurrent}</ThemedText>
                  <Clickable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMaxConcurrent(maxConcurrent + 1);
                    }}
                    style={[styles.stepperButton, { borderColor: palette.border, backgroundColor: palette.background }]}
                  >
                    <Ionicons name="add" size={18} color={palette.text} />
                  </Clickable>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: palette.border }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={[styles.settingIcon, { backgroundColor: `${palette.tint}15` }]}>
                    <Ionicons name="timer-outline" size={18} color={palette.tint} />
                  </View>
                  <View style={styles.settingText}>
                    <ThemedText type="defaultSemiBold">Buffer Time</ThemedText>
                    <ThemedText style={[styles.settingHint, { color: palette.muted }]}>
                      Break between sessions
                    </ThemedText>
                  </View>
                </View>
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
                            backgroundColor: isSelected ? palette.tint : palette.background,
                            borderColor: isSelected ? palette.tint : palette.border,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.bufferOptionText,
                            { color: isSelected ? '#fff' : palette.text },
                          ]}
                        >
                          {mins === 0 ? 'None' : `${mins}m`}
                        </ThemedText>
                      </Clickable>
                    );
                  })}
                </View>
              </View>
            </SurfaceCard>
          </View>

          {/* Delete Button */}
          {editingTemplate && onDelete && (
            <Clickable
              onPress={handleDelete}
              disabled={saving}
              style={[styles.deleteButton, { borderColor: palette.error }]}
            >
              <Ionicons name="trash-outline" size={18} color={palette.error} />
              <ThemedText style={{ color: palette.error, fontWeight: '600' }}>
                Delete This Slot
              </ThemedText>
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
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  daysScroll: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dayButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    minWidth: 52,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekendDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  timePickerContainer: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
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
    borderBottomColor: '#E5E7EB',
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
    fontSize: 16,
    fontWeight: '500',
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
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  locationChipText: {
    fontSize: 13,
    fontWeight: '500',
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
  customLocationPlaceholder: {
    flex: 1,
    fontSize: 15,
  },
  customLocationTextInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  settingsCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingHint: {
    fontSize: 12,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  bufferOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  bufferOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minWidth: 48,
    alignItems: 'center',
  },
  bufferOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
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
