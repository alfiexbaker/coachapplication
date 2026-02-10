/**
 * Add Availability Template Screen
 *
 * Form for coaches to create recurring availability slots.
 * All state/logic in useAddTemplate hook.
 */

import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { DAY_NAMES } from '@/constants/booking-types';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useAddTemplate, TIME_OPTIONS, BUFFER_OPTIONS, MAX_SLOTS_OPTIONS } from '@/hooks/use-add-template';

export default function AddTemplateScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const c = useAddTemplate();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader title="Add Availability" showBack onBackPress={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Day of Week</ThemedText>
          <Row style={styles.dayGrid}>
            {DAY_NAMES.map((day, index) => (
              <Clickable key={day} onPress={() => c.handleDaySelect(index)}
                style={[styles.dayButton, {
                  borderColor: c.dayOfWeek === index ? palette.tint : palette.border,
                  backgroundColor: c.dayOfWeek === index ? palette.tint : 'transparent',
                }]}>
                <ThemedText style={[styles.dayButtonText, { color: c.dayOfWeek === index ? palette.onPrimary : palette.text }]}>
                  {day.slice(0, 3)}
                </ThemedText>
              </Clickable>
            ))}
          </Row>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Time Window</ThemedText>
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <ThemedText style={[styles.label, { color: palette.muted }]}>Start</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Row style={styles.timeOptions}>
                  {TIME_OPTIONS.map((time) => (
                    <Clickable key={`start-${time}`} onPress={() => c.setStartTime(time)}
                      style={[styles.timeOption, {
                        borderColor: c.startTime === time ? palette.tint : palette.border,
                        backgroundColor: c.startTime === time ? withAlpha(palette.tint, 0.09) : 'transparent',
                      }]}>
                      <ThemedText style={{ color: c.startTime === time ? palette.tint : palette.text }}>{time}</ThemedText>
                    </Clickable>
                  ))}
                </Row>
              </ScrollView>
            </View>
          </View>
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <ThemedText style={[styles.label, { color: palette.muted }]}>End</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Row style={styles.timeOptions}>
                  {TIME_OPTIONS.map((time) => (
                    <Clickable key={`end-${time}`} onPress={() => c.setEndTime(time)}
                      style={[styles.timeOption, {
                        borderColor: c.endTime === time ? palette.tint : palette.border,
                        backgroundColor: c.endTime === time ? withAlpha(palette.tint, 0.09) : 'transparent',
                      }]}>
                      <ThemedText style={{ color: c.endTime === time ? palette.tint : palette.text }}>{time}</ThemedText>
                    </Clickable>
                  ))}
                </Row>
              </ScrollView>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Capacity</ThemedText>
          <View style={styles.optionRow}>
            <ThemedText>Max concurrent bookings</ThemedText>
            <Row style={styles.optionButtons}>
              {MAX_SLOTS_OPTIONS.map((num) => (
                <Clickable key={num} onPress={() => c.setMaxSlots(num)}
                  style={[styles.optionButton, {
                    borderColor: c.maxSlots === num ? palette.tint : palette.border,
                    backgroundColor: c.maxSlots === num ? palette.tint : 'transparent',
                  }]}>
                  <ThemedText style={{ color: c.maxSlots === num ? palette.onPrimary : palette.text }}>{num}</ThemedText>
                </Clickable>
              ))}
            </Row>
          </View>
          <View style={styles.optionRow}>
            <ThemedText>Buffer between sessions</ThemedText>
            <Row style={styles.optionButtons}>
              {BUFFER_OPTIONS.map((mins) => (
                <Clickable key={mins} onPress={() => c.setBufferMinutes(mins)}
                  style={[styles.optionButton, {
                    borderColor: c.bufferMinutes === mins ? palette.tint : palette.border,
                    backgroundColor: c.bufferMinutes === mins ? palette.tint : 'transparent',
                  }]}>
                  <ThemedText style={{ color: c.bufferMinutes === mins ? palette.onPrimary : palette.text }}>
                    {mins === 0 ? 'None' : `${mins}m`}
                  </ThemedText>
                </Clickable>
              ))}
            </Row>
          </View>
        </SurfaceCard>

        <SurfaceCard style={[styles.section, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
          <Row style={styles.previewHeader}>
            <Ionicons name="calendar" size={20} color={palette.tint} />
            <ThemedText type="defaultSemiBold">Preview</ThemedText>
          </Row>
          <ThemedText style={{ color: palette.muted }}>
            Every {DAY_NAMES[c.dayOfWeek]}, {c.startTime} - {c.endTime}
          </ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {c.maxSlots} slot{c.maxSlots > 1 ? 's' : ''} available{c.bufferMinutes > 0 ? `, ${c.bufferMinutes}min buffer` : ''}
          </ThemedText>
        </SurfaceCard>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Clickable style={[styles.saveButton, { backgroundColor: c.saving ? palette.muted : palette.tint }]}
          onPress={c.handleSave} disabled={c.saving}>
          {c.saving ? <ActivityIndicator size="small" color={palette.onPrimary} /> : (
            <Row align="center" justify="center" gap="sm">
              <Ionicons name="checkmark-circle" size={22} color={palette.onPrimary} />
              <ThemedText style={[styles.saveButtonText, { color: palette.onPrimary }]}>Add Availability</ThemedText>
            </Row>
          )}
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  contentInner: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  section: { padding: Spacing.md, gap: Spacing.sm },
  dayGrid: { flexWrap: 'wrap', gap: Spacing.xs },
  dayButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1.5 },
  dayButtonText: { ...Typography.bodySmallSemiBold },
  timeRow: { marginTop: Spacing.sm },
  timeCol: { gap: 8 },
  label: { ...Typography.smallSemiBold },
  timeOptions: { gap: Spacing.xs },
  timeOption: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.sm, borderWidth: 1.5 },
  optionRow: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  optionButtons: { gap: Spacing.xs },
  optionButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.sm, borderWidth: 1.5, minWidth: 50, alignItems: 'center' },
  previewHeader: { alignItems: 'center', gap: Spacing.sm },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  saveButton: { paddingVertical: Spacing.md, borderRadius: Radii.md },
  saveButtonText: { ...Typography.heading },
});
