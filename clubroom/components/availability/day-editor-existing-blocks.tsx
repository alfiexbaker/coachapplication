import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AvailabilityTemplate } from '@/constants/types';
import { Row } from '@/components/primitives';

interface DayEditorExistingBlocksProps {
  dayName: string;
  existingTemplatesForDay: AvailabilityTemplate[];
  currentTemplateId?: string;
}

function DayEditorExistingBlocksInner({
  dayName,
  existingTemplatesForDay,
  currentTemplateId,
}: DayEditorExistingBlocksProps) {
  const { colors: palette } = useTheme();

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: withAlpha(palette.tint, 0.04), borderColor: palette.border },
      ]}
    >
      <Row style={styles.header}>
        <Ionicons name="layers-outline" size={14} color={palette.muted} />
        <ThemedText style={[styles.title, { color: palette.muted }]}>
          {existingTemplatesForDay.length === 1
            ? '1 time block'
            : `${existingTemplatesForDay.length} time blocks`}{' '}
          on {dayName}
        </ThemedText>
      </Row>
      {Array.from(existingTemplatesForDay)
        .toSorted((a, b) => a.startTime.localeCompare(b.startTime))
        .map((t) => {
          const isCurrentEdit = currentTemplateId === t.id;
          return (
            <Row
              key={t.id}
              style={[
                styles.row,
                { backgroundColor: isCurrentEdit ? withAlpha(palette.tint, 0.08) : 'transparent' },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isCurrentEdit ? palette.tint : palette.muted },
                ]}
              />
              <ThemedText
                style={[styles.time, { color: isCurrentEdit ? palette.tint : palette.text }]}
              >
                {t.startTime} – {t.endTime}
              </ThemedText>
              {t.location ? (
                <ThemedText style={[styles.location, { color: palette.muted }]} numberOfLines={1}>
                  {t.location}
                </ThemedText>
              ) : null}
              {isCurrentEdit && (
                <View
                  style={[styles.editingBadge, { backgroundColor: withAlpha(palette.tint, 0.12) }]}
                >
                  <ThemedText style={[styles.editingText, { color: palette.tint }]}>
                    editing
                  </ThemedText>
                </View>
              )}
            </Row>
          );
        })}
    </View>
  );
}

export const DayEditorExistingBlocks = DayEditorExistingBlocksInner;

const styles = StyleSheet.create({
  section: { padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, gap: Spacing.xxs },
  header: { alignItems: 'center', gap: Spacing.xxs, marginBottom: Spacing.xxs },
  title: { ...Typography.micro, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.sm,
  },
  dot: { width: 6, height: 6, borderRadius: Radii.xs },
  time: { ...Typography.smallSemiBold },
  location: { ...Typography.small, flex: 1 },
  editingBadge: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.pill },
  editingText: { ...Typography.micro },
});
