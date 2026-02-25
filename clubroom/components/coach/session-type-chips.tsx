/**
 * Session Type Chips
 *
 * Horizontal scrollable row of session type pills.
 * Shown in the Availability segment of the Schedule tab.
 */

import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SessionTemplate, SessionType } from '@/constants/session-types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// Session type icons — all use a single tint color for visual consistency
const TYPE_ICONS: Record<SessionType, keyof typeof Ionicons.glyphMap> = {
  '1-to-1': 'person-outline',
  'small-group': 'people-outline',
  clinic: 'fitness-outline',
  assessment: 'clipboard-outline',
};

interface SessionTypeChipsProps {
  templates: SessionTemplate[];
  onPress: (template: SessionTemplate) => void;
  onAdd: () => void;
  selectedId?: string;
}

export function SessionTypeChips({ templates, onPress, onAdd, selectedId }: SessionTypeChipsProps) {
  const { colors: palette } = useTheme();

  const hapticTap = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const handleAdd = useCallback(() => {
    hapticTap();
    onAdd();
  }, [onAdd]);

  if (templates.length === 0) {
    return (
      <Clickable
        onPress={() => {
          hapticTap();
          onAdd();
        }}
        accessibilityRole="button"
        accessibilityLabel="Add your first session type"
        style={[styles.emptyState, { borderColor: palette.tint }]}
      >
        <Ionicons name="add-circle-outline" size={20} color={palette.tint} />
        <ThemedText style={[styles.emptyText, { color: palette.tint }]}>
          Add your first session type
        </ThemedText>
      </Clickable>
    );
  }

  return (
    <View style={styles.container}>
      <Row style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Session Types
        </ThemedText>
      </Row>

      <Row style={styles.chipRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {templates.map((template) => {
            const icon = TYPE_ICONS[template.type] || 'ellipse-outline';
            const isSelected = selectedId === template.id;

            return (
              <Clickable
                key={template.id}
                onPress={() => {
                  hapticTap();
                  onPress(template);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${template.name}, ${template.duration} minutes, ${template.defaultPrice > 0 ? `£${template.defaultPrice}` : 'Free'}`}
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <View style={[styles.chipIcon, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
                  <Ionicons name={icon} size={16} color={palette.tint} />
                </View>
                <View style={styles.chipContent}>
                  <ThemedText style={[styles.chipName, { color: palette.text }]} numberOfLines={1}>
                    {template.name}
                  </ThemedText>
                  <ThemedText style={[styles.chipDetail, { color: palette.muted }]} numberOfLines={1}>
                    {template.duration}m ·{' '}
                    {template.defaultPrice > 0 ? `£${template.defaultPrice}` : 'Free'}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={14} color={palette.muted} />
              </Clickable>
            );
          })}
        </ScrollView>
        <Clickable
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel="Add session type"
          style={[
            styles.addChip,
            { borderColor: palette.border, backgroundColor: palette.background },
          ]}
        >
          <Ionicons name="add" size={18} color={palette.tint} />
          <ThemedText style={[styles.addChipText, { color: palette.tint }]}>Add</ThemedText>
        </Clickable>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...Typography.bodySmallSemiBold,
  },
  chipRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.xs,
  },
  chipRowWrap: {
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  chipScroll: {
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    minWidth: 160,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  chipName: {
    ...Typography.smallSemiBold,
  },
  chipDetail: {
    ...Typography.micro,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    minHeight: 56,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addChipText: {
    ...Typography.smallSemiBold,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...Typography.bodySmallSemiBold,
  },
});
