import { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AvailabilityTemplate } from '@/constants/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  const [maxConcurrent, setMaxConcurrent] = useState('1');
  const [bufferMinutes, setBufferMinutes] = useState('15');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingTemplate) {
      setDayOfWeek(editingTemplate.dayOfWeek);
      setStartTime(editingTemplate.startTime);
      setEndTime(editingTemplate.endTime);
      setLocation(editingTemplate.location || '');
      setMaxConcurrent(String(editingTemplate.maxConcurrent));
      setBufferMinutes(String(editingTemplate.bufferMinutes));
    } else {
      // Reset to defaults or preselected values
      setDayOfWeek(preselectedDay ?? 1);
      if (preselectedHour !== undefined) {
        setStartTime(`${preselectedHour.toString().padStart(2, '0')}:00`);
        setEndTime(`${(preselectedHour + 2).toString().padStart(2, '0')}:00`);
      } else {
        setStartTime('09:00');
        setEndTime('17:00');
      }
      setLocation('');
      setMaxConcurrent('1');
      setBufferMinutes('15');
    }
  }, [editingTemplate, preselectedDay, preselectedHour, visible]);

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
        maxConcurrent: parseInt(maxConcurrent, 10) || 1,
        bufferMinutes: parseInt(bufferMinutes, 10) || 15,
        location: location || undefined,
      });
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
            <View style={styles.daysGrid}>
              {DAYS.map((day, index) => {
                const isSelected = dayOfWeek === index;
                return (
                  <Clickable
                    key={day}
                    onPress={() => setDayOfWeek(index)}
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
                  </Clickable>
                );
              })}
            </View>
          </View>

          {/* Time Range */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Time Range</ThemedText>
            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  Start Time
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface },
                  ]}
                  placeholder="09:00"
                  placeholderTextColor={palette.muted}
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <Ionicons name="arrow-forward" size={20} color={palette.muted} style={styles.timeArrow} />
              <View style={styles.timeInput}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  End Time
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface },
                  ]}
                  placeholder="17:00"
                  placeholderTextColor={palette.muted}
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Location (Optional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface },
              ]}
              placeholder="e.g., Hackney Marshes"
              placeholderTextColor={palette.muted}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Capacity Settings */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Capacity Settings</ThemedText>

            <SurfaceCard style={styles.settingsCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="people-outline" size={20} color={palette.tint} />
                  <View>
                    <ThemedText type="defaultSemiBold">Max Concurrent Bookings</ThemedText>
                    <ThemedText style={[styles.settingHint, { color: palette.muted }]}>
                      Number of sessions that can be booked at the same time
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.stepper}>
                  <Clickable
                    onPress={() =>
                      setMaxConcurrent(String(Math.max(1, parseInt(maxConcurrent, 10) - 1)))
                    }
                    style={[styles.stepperButton, { borderColor: palette.border }]}
                  >
                    <Ionicons name="remove" size={18} color={palette.text} />
                  </Clickable>
                  <ThemedText style={styles.stepperValue}>{maxConcurrent}</ThemedText>
                  <Clickable
                    onPress={() => setMaxConcurrent(String(parseInt(maxConcurrent, 10) + 1))}
                    style={[styles.stepperButton, { borderColor: palette.border }]}
                  >
                    <Ionicons name="add" size={18} color={palette.text} />
                  </Clickable>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: palette.border }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="time-outline" size={20} color={palette.tint} />
                  <View>
                    <ThemedText type="defaultSemiBold">Buffer Time</ThemedText>
                    <ThemedText style={[styles.settingHint, { color: palette.muted }]}>
                      Break between consecutive sessions (minutes)
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.stepper}>
                  <Clickable
                    onPress={() =>
                      setBufferMinutes(String(Math.max(0, parseInt(bufferMinutes, 10) - 5)))
                    }
                    style={[styles.stepperButton, { borderColor: palette.border }]}
                  >
                    <Ionicons name="remove" size={18} color={palette.text} />
                  </Clickable>
                  <ThemedText style={styles.stepperValue}>{bufferMinutes}</ThemedText>
                  <Clickable
                    onPress={() => setBufferMinutes(String(parseInt(bufferMinutes, 10) + 5))}
                    style={[styles.stepperButton, { borderColor: palette.border }]}
                  >
                    <Ionicons name="add" size={18} color={palette.text} />
                  </Clickable>
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
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  dayButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  timeInput: {
    flex: 1,
    gap: 4,
  },
  timeArrow: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
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
    alignItems: 'flex-start',
    gap: Spacing.sm,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
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
