/**
 * Extracted sub-components for availability-grid.
 *
 * DayScheduleView — detailed day view with slot cards (edit/delete).
 * Constants — DAYS, FULL_DAYS, HOURS.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AvailabilityTemplate } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Constants ──────────────────────────────────────────────────────────────

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const FULL_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am to 8pm

// ─── SlotCard ───────────────────────────────────────────────────────────────

interface SlotCardProps {
  template: AvailabilityTemplate;
  onEdit: (template: AvailabilityTemplate) => void;
  onDelete: (templateId: string) => void;
}

const SlotCard = memo(function SlotCard({ template, onEdit, onDelete }: SlotCardProps) {
  const { colors: palette } = useTheme();

  return (
    <Row
      style={[styles.slotCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={[styles.slotTime, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
        <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
          {template.startTime}
        </ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>to</ThemedText>
        <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
          {template.endTime}
        </ThemedText>
      </View>

      <View style={styles.slotInfo}>
        {template.location && (
          <Row style={styles.slotDetail}>
            <Ionicons name="location-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.slotDetailText, { color: palette.text }]}>
              {template.location}
            </ThemedText>
          </Row>
        )}
        <Row style={styles.slotDetail}>
          <Ionicons name="people-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.slotDetailText, { color: palette.muted }]}>
            Max {template.maxConcurrent} booking{template.maxConcurrent !== 1 ? 's' : ''}
          </ThemedText>
        </Row>
        <Row style={styles.slotDetail}>
          <Ionicons name="time-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.slotDetailText, { color: palette.muted }]}>
            {template.bufferMinutes} min buffer
          </ThemedText>
        </Row>
      </View>

      <Row style={styles.slotActions}>
        <Clickable
          onPress={() => onEdit(template)}
          style={[styles.slotActionButton, { borderColor: palette.border }]}
        >
          <Ionicons name="pencil-outline" size={16} color={palette.tint} />
        </Clickable>
        <Clickable
          accessibilityLabel="Delete availability template"
          onPress={() => onDelete(template.id)}
          style={[styles.slotActionButton, { borderColor: palette.border }]}
        >
          <Ionicons name="trash-outline" size={16} color={palette.error} />
        </Clickable>
      </Row>
    </Row>
  );
});

// ─── DayScheduleView ────────────────────────────────────────────────────────

interface DayScheduleViewProps {
  dayOfWeek: number;
  templates: AvailabilityTemplate[];
  onEditTemplate: (template: AvailabilityTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onAddTemplate: () => void;
}

export function DayScheduleView({
  dayOfWeek,
  templates,
  onEditTemplate,
  onDeleteTemplate,
  onAddTemplate,
}: DayScheduleViewProps) {
  const { colors: palette } = useTheme();

  const dayTemplates = templates.filter((t) => t.dayOfWeek === dayOfWeek);

  return (
    <View style={styles.daySchedule}>
      <Row style={styles.dayScheduleHeader}>
        <ThemedText type="subtitle">{FULL_DAYS[dayOfWeek]}</ThemedText>
        <Clickable
          onPress={onAddTemplate}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={18} color={palette.onPrimary} />
          <ThemedText style={{ ...Typography.smallSemiBold, color: palette.onPrimary }}>
            Add Slot
          </ThemedText>
        </Clickable>
      </Row>

      {dayTemplates.length === 0 ? (
        <View style={[styles.emptyDay, { backgroundColor: palette.surface }]}>
          <Ionicons name="calendar-outline" size={32} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
            No availability set for this day
          </ThemedText>
        </View>
      ) : (
        <View style={styles.slotsList}>
          {dayTemplates
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((template) => (
              <SlotCard
                key={template.id}
                template={template}
                onEdit={onEditTemplate}
                onDelete={onDeleteTemplate}
              />
            ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  daySchedule: {
    gap: Spacing.md,
  },
  dayScheduleHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  emptyDay: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Radii.md,
  },
  slotsList: {
    gap: Spacing.sm,
  },
  slotCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  slotTime: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
  },
  slotInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  slotDetail: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  slotDetailText: { ...Typography.small },
  slotActions: {
    gap: Spacing.xs,
  },
  slotActionButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
