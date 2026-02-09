/**
 * Edit Availability Template Screen
 *
 * Allows coaches to modify existing availability templates.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { DAY_NAMES } from '@/constants/booking-types';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilityTemplate } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('EditTemplate');

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00',
];

const BUFFER_OPTIONS = [0, 10, 15, 30, 45];
const MAX_SLOTS_OPTIONS = [1, 2, 3, 4, 5];

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<AvailabilityTemplate | null>(null);

  const [dayOfWeek, setDayOfWeek] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [maxSlots, setMaxSlots] = useState(1);
  const [bufferMinutes, setBufferMinutes] = useState(15);

  const loadTemplate = useCallback(async () => {
    if (!id || !currentUser?.id) return;

    try {
      const templates = await availabilityService.getTemplates(currentUser.id);
      const found = templates.find(t => t.id === id);

      if (found) {
        setTemplate(found);
        setDayOfWeek(found.dayOfWeek);
        setStartTime(found.startTime);
        setEndTime(found.endTime);
        setMaxSlots(found.maxConcurrent);
        setBufferMinutes(found.bufferMinutes);
      }
    } catch (error) {
      logger.error('Failed to load template', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handleSave = async () => {
    if (!currentUser?.id || !template) return;

    if (startTime >= endTime) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      await availabilityService.saveTemplate({
        id: template.id,
        coachId: template.coachId,
        dayOfWeek,
        startTime,
        endTime,
        isRecurring: true,
        maxConcurrent: maxSlots,
        bufferMinutes,
      });

      Alert.alert('Template Updated', 'Your availability has been updated', [
        { text: 'OK', onPress: () => router.back() },
      ]);

      logger.success('TemplateUpdated', { templateId: template.id });
    } catch (error) {
      logger.error('Failed to update template', error);
      Alert.alert('Error', 'Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!template) return;

    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this availability slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await availabilityService.deleteTemplate(template.id);
              Alert.alert('Deleted', 'Template removed');
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Edit Availability" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Edit Availability" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ThemedText>Template not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader title="Edit Availability" showBack onBackPress={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Day Selection */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Day of Week</ThemedText>
          <View style={styles.dayGrid}>
            {DAY_NAMES.map((day, index) => (
              <Pressable
                key={day}
                style={[
                  styles.dayButton,
                  {
                    borderColor: dayOfWeek === index ? palette.tint : palette.border,
                    backgroundColor: dayOfWeek === index ? palette.tint : 'transparent',
                  },
                ]}
                onPress={() => setDayOfWeek(index as 0 | 1 | 2 | 3 | 4 | 5 | 6)}
              >
                <ThemedText
                  style={[styles.dayButtonText, { color: dayOfWeek === index ? palette.onPrimary : palette.text }]}
                >
                  {day.slice(0, 3)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </SurfaceCard>

        {/* Time Selection */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Time Window</ThemedText>

          <View style={styles.timeRow}>
            <ThemedText style={[styles.label, { color: palette.muted }]}>Start</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.timeOptions}>
                {TIME_OPTIONS.map((time) => (
                  <Pressable
                    key={`start-${time}`}
                    style={[
                      styles.timeOption,
                      {
                        borderColor: startTime === time ? palette.tint : palette.border,
                        backgroundColor: startTime === time ? withAlpha(palette.tint, 0.09) : 'transparent',
                      },
                    ]}
                    onPress={() => setStartTime(time)}
                  >
                    <ThemedText style={{ color: startTime === time ? palette.tint : palette.text }}>
                      {time}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.timeRow}>
            <ThemedText style={[styles.label, { color: palette.muted }]}>End</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.timeOptions}>
                {TIME_OPTIONS.map((time) => (
                  <Pressable
                    key={`end-${time}`}
                    style={[
                      styles.timeOption,
                      {
                        borderColor: endTime === time ? palette.tint : palette.border,
                        backgroundColor: endTime === time ? withAlpha(palette.tint, 0.09) : 'transparent',
                      },
                    ]}
                    onPress={() => setEndTime(time)}
                  >
                    <ThemedText style={{ color: endTime === time ? palette.tint : palette.text }}>
                      {time}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </SurfaceCard>

        {/* Slots & Buffer */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Capacity</ThemedText>

          <View style={styles.optionRow}>
            <ThemedText>Max concurrent bookings</ThemedText>
            <View style={styles.optionButtons}>
              {MAX_SLOTS_OPTIONS.map((num) => (
                <Pressable
                  key={num}
                  style={[
                    styles.optionButton,
                    {
                      borderColor: maxSlots === num ? palette.tint : palette.border,
                      backgroundColor: maxSlots === num ? palette.tint : 'transparent',
                    },
                  ]}
                  onPress={() => setMaxSlots(num)}
                >
                  <ThemedText style={{ color: maxSlots === num ? palette.onPrimary : palette.text }}>
                    {num}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.optionRow}>
            <ThemedText>Buffer between sessions</ThemedText>
            <View style={styles.optionButtons}>
              {BUFFER_OPTIONS.map((mins) => (
                <Pressable
                  key={mins}
                  style={[
                    styles.optionButton,
                    {
                      borderColor: bufferMinutes === mins ? palette.tint : palette.border,
                      backgroundColor: bufferMinutes === mins ? palette.tint : 'transparent',
                    },
                  ]}
                  onPress={() => setBufferMinutes(mins)}
                >
                  <ThemedText style={{ color: bufferMinutes === mins ? palette.onPrimary : palette.text }}>
                    {mins === 0 ? 'None' : `${mins}m`}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </SurfaceCard>

        {/* Delete Button */}
        <Pressable
          style={[styles.deleteButton, { borderColor: palette.error }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color={palette.error} />
          <ThemedText style={[styles.deleteButtonText, { color: palette.error }]}>
            Delete Template
          </ThemedText>
        </Pressable>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Pressable
          style={[styles.saveButton, { backgroundColor: saving ? palette.muted : palette.tint }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={palette.onPrimary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={palette.onPrimary} />
              <ThemedText style={[styles.saveButtonText, { color: palette.onPrimary }]}>Save Changes</ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  contentInner: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  section: { padding: Spacing.md, gap: Spacing.sm },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  dayButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  dayButtonText: { ...Typography.bodySmallSemiBold },
  timeRow: { marginTop: Spacing.sm, gap: 8 },
  label: { ...Typography.smallSemiBold },
  timeOptions: { flexDirection: 'row', gap: Spacing.xs },
  timeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
  },
  optionRow: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  optionButtons: { flexDirection: 'row', gap: Spacing.xs },
  optionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    minWidth: 50,
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  deleteButtonText: { ...Typography.bodySemiBold },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  saveButtonText: { ...Typography.heading },
});
