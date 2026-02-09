import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { DifficultyBadge } from '@/components/drills';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Drill } from '@/constants/types';
import type { DrillAthlete } from '@/hooks/use-drill-assign';

interface AssignDrillFormProps {
  drill: Drill;
  athletes: DrillAthlete[];
  selectedAthlete: DrillAthlete | null;
  daysFromNow: number;
  formattedDate: string;
  priority: 1 | 2 | 3;
  repetitions: string;
  notes: string;
  colors: ThemeColors;
  onAthleteSelect: (athlete: DrillAthlete) => void;
  onDateSelect: (days: number) => void;
  onPrioritySelect: (p: 1 | 2 | 3) => void;
  onRepetitionsChange: (val: string) => void;
  onNotesChange: (val: string) => void;
}

export const AssignDrillForm = memo(function AssignDrillForm({
  drill, athletes, selectedAthlete, daysFromNow, formattedDate,
  priority, repetitions, notes, colors,
  onAthleteSelect, onDateSelect, onPrioritySelect, onRepetitionsChange, onNotesChange,
}: AssignDrillFormProps) {
  const categoryInfo = drillService.getCategoryInfo(drill.category);

  return (
    <>
      {/* Drill Preview */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <SurfaceCard style={styles.drillPreview}>
          <Row align="center" justify="space-between" style={{ marginBottom: Spacing.xs }}>
            <View style={[styles.categoryBadge, { backgroundColor: withAlpha(categoryInfo.color, 0.12) }]}>
              <Ionicons name={categoryInfo.icon as keyof typeof Ionicons.glyphMap} size={14} color={categoryInfo.color} />
              <ThemedText style={[Typography.caption, { color: categoryInfo.color, fontSize: scaleFont(Typography.caption.fontSize) }]}>{categoryInfo.label}</ThemedText>
            </View>
            <DifficultyBadge difficulty={drill.difficulty} size="small" />
          </Row>
          <ThemedText type="defaultSemiBold" style={[Typography.heading, { fontSize: scaleFont(Typography.heading.fontSize), marginBottom: Spacing.xs }]}>{drill.title}</ThemedText>
          <Row gap="md" align="center">
            <Row gap="xxs" align="center">
              <Ionicons name="time-outline" size={14} color={colors.muted} />
              <ThemedText style={[Typography.small, { color: colors.muted, fontSize: scaleFont(Typography.small.fontSize) }]}>{drillService.formatDuration(drill.duration)}</ThemedText>
            </Row>
            {drill.videoUrl && (
              <Row gap="xxs" align="center">
                <Ionicons name="videocam" size={14} color={colors.muted} />
                <ThemedText style={[Typography.small, { color: colors.muted, fontSize: scaleFont(Typography.small.fontSize) }]}>Video included</ThemedText>
              </Row>
            )}
          </Row>
        </SurfaceCard>
      </Animated.View>

      {/* Select Athlete */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Select Athlete *</ThemedText>
          <View style={styles.athleteGrid}>
            {athletes.map((athlete) => {
              const isSelected = selectedAthlete?.id === athlete.id;
              return (
                <Clickable key={athlete.id} onPress={() => onAthleteSelect(athlete)}
                  style={[styles.athleteCard, { backgroundColor: isSelected ? withAlpha(colors.tint, 0.09) : colors.surface, borderColor: isSelected ? colors.tint : colors.border }]}>
                  <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}>
                    <ThemedText style={[Typography.heading, { fontSize: scaleFont(Typography.heading.fontSize) }]}>{athlete.name.charAt(0)}</ThemedText>
                  </View>
                  <ThemedText style={[Typography.bodySmallSemiBold, { color: isSelected ? colors.tint : colors.text, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) }]} numberOfLines={1}>{athlete.name}</ThemedText>
                  {athlete.age && <ThemedText style={[Typography.caption, { color: colors.muted, marginTop: Spacing.micro, fontSize: scaleFont(Typography.caption.fontSize) }]}>Age {athlete.age}</ThemedText>}
                  {isSelected && (
                    <View style={[styles.check, { backgroundColor: colors.tint }]}>
                      <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                    </View>
                  )}
                </Clickable>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Due Date */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Due Date</ThemedText>
          <Row gap="xs" style={{ marginBottom: Spacing.sm }}>
            {[{ days: 1, label: 'Tomorrow' }, { days: 3, label: '3 Days' }, { days: 7, label: '1 Week' }, { days: 14, label: '2 Weeks' }].map((o) => {
              const sel = daysFromNow === o.days;
              return (
                <Clickable key={o.days} onPress={() => onDateSelect(o.days)}
                  style={[styles.dateOption, { flex: 1, backgroundColor: sel ? colors.tint : colors.surface, borderColor: sel ? colors.tint : colors.border }]}>
                  <ThemedText style={[Typography.smallSemiBold, { color: sel ? colors.onPrimary : colors.text, fontSize: scaleFont(Typography.smallSemiBold.fontSize) }]}>{o.label}</ThemedText>
                </Clickable>
              );
            })}
          </Row>
          <Row gap="xs" align="center" style={{ paddingVertical: Spacing.xs }}>
            <Ionicons name="calendar-outline" size={18} color={colors.tint} />
            <ThemedText style={[Typography.bodySemiBold, { color: colors.tint, fontSize: scaleFont(Typography.bodySemiBold.fontSize) }]}>{formattedDate}</ThemedText>
          </Row>
        </View>
      </Animated.View>

      {/* Priority */}
      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Priority</ThemedText>
          <Row gap="sm">
            {([{ value: 1, label: 'High', color: colors.error }, { value: 2, label: 'Normal', color: colors.tint }, { value: 3, label: 'Low', color: colors.muted }] as const).map((o) => {
              const sel = priority === o.value;
              return (
                <Clickable key={o.value} onPress={() => onPrioritySelect(o.value)}
                  style={[styles.priorityOption, { flex: 1, backgroundColor: sel ? withAlpha(o.color, 0.09) : colors.surface, borderColor: sel ? o.color : colors.border }]}>
                  {o.value === 1 && <Ionicons name="alert-circle" size={16} color={o.color} />}
                  <ThemedText style={[Typography.bodySmallSemiBold, { color: sel ? o.color : colors.text, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) }]}>{o.label}</ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </View>
      </Animated.View>

      {/* Repetitions */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Sets / Repetitions</ThemedText>
          <Row gap="xs">
            {['1', '2', '3', '5'].map((r) => {
              const sel = repetitions === r;
              return (
                <Clickable key={r} onPress={() => onRepetitionsChange(r)}
                  style={[styles.repsOption, { backgroundColor: sel ? colors.tint : colors.surface, borderColor: sel ? colors.tint : colors.border }]}>
                  <ThemedText style={[Typography.bodySemiBold, { color: sel ? colors.onPrimary : colors.text, fontSize: scaleFont(Typography.bodySemiBold.fontSize) }]}>{r}</ThemedText>
                </Clickable>
              );
            })}
            <TextInput
              style={[styles.customReps, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Custom" placeholderTextColor={colors.muted}
              value={!['1', '2', '3', '5'].includes(repetitions) ? repetitions : ''}
              onChangeText={onRepetitionsChange} keyboardType="number-pad" maxLength={2}
            />
          </Row>
        </View>
      </Animated.View>

      {/* Notes */}
      <Animated.View entering={FadeInDown.delay(350).springify()}>
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Notes for Athlete (optional)</ThemedText>
          <TextInput
            style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Add specific instructions or encouragement..." placeholderTextColor={colors.muted}
            value={notes} onChangeText={onNotesChange} multiline numberOfLines={3} textAlignVertical="top" maxLength={300}
          />
        </View>
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  drillPreview: { padding: Spacing.md, marginBottom: Spacing.lg },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: 8, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.bodySmall, fontSize: scaleFont(Typography.bodySmall.fontSize), marginBottom: Spacing.sm },
  athleteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  athleteCard: { width: '47%', padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center', position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  check: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  dateOption: { paddingVertical: 10, alignItems: 'center', borderRadius: Radii.md, borderWidth: 1 },
  priorityOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, paddingVertical: Spacing.xs + Spacing.xxs, borderRadius: Radii.md, borderWidth: 1 },
  repsOption: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.sm, borderWidth: 1 },
  customReps: { width: 72, height: 44, borderWidth: 1, borderRadius: Radii.sm, paddingHorizontal: Spacing.sm, ...Typography.bodySmall, fontSize: scaleFont(Typography.bodySmall.fontSize), textAlign: 'center' },
  notesInput: { height: 100, borderWidth: 1, borderRadius: Radii.md, padding: Spacing.sm, ...Typography.body, fontSize: scaleFont(Typography.body.fontSize) },
});
