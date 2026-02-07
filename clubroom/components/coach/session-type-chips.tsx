/**
 * Session Type Chips
 *
 * Horizontal scrollable row of session type presets.
 * Shown in the Availability segment of the Schedule tab.
 */

import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionTemplate, SessionType } from '@/constants/session-types';

const TYPE_COLORS: Record<SessionType, string> = {
  '1-to-1': '#4F86F7',
  'small-group': '#34C759',
  'clinic': '#FF9500',
  'assessment': '#AF52DE',
};

interface SessionTypeChipsProps {
  templates: SessionTemplate[];
  onPress: (template: SessionTemplate) => void;
  onAdd: () => void;
  selectedId?: string;
}

export function SessionTypeChips({ templates, onPress, onAdd, selectedId }: SessionTypeChipsProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (templates.length === 0) {
    return (
      <Clickable onPress={onAdd} style={[styles.emptyState, { borderColor: palette.tint }]}>
        <Ionicons name="add-circle-outline" size={20} color={palette.tint} />
        <ThemedText style={[styles.emptyText, { color: palette.tint }]}>
          Add your first session type
        </ThemedText>
      </Clickable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Session Types</ThemedText>
        <Clickable onPress={onAdd} style={[styles.addBtn, { borderColor: palette.border }]}>
          <Ionicons name="add" size={18} color={palette.tint} />
        </Clickable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {templates.map((template) => {
          const typeColor = TYPE_COLORS[template.type] || palette.tint;
          const isSelected = selectedId === template.id;

          return (
            <Clickable
              key={template.id}
              onPress={() => onPress(template)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? withAlpha(typeColor, 0.1) : palette.background,
                  borderColor: isSelected ? typeColor : palette.border,
                  borderLeftColor: typeColor,
                  borderLeftWidth: 3,
                },
              ]}
            >
              <ThemedText style={[styles.chipName, { color: palette.text }]} numberOfLines={1}>
                {template.name}
              </ThemedText>
              <View style={styles.chipMeta}>
                <View style={[styles.chipBadge, { backgroundColor: withAlpha(palette.muted, 0.08) }]}>
                  <ThemedText style={[styles.chipBadgeText, { color: palette.muted }]}>
                    {template.duration}m
                  </ThemedText>
                </View>
                <View style={[styles.chipBadge, { backgroundColor: withAlpha(palette.muted, 0.08) }]}>
                  <ThemedText style={[styles.chipBadgeText, { color: palette.muted }]}>
                    {template.defaultPrice > 0 ? `£${template.defaultPrice}` : 'Free'}
                  </ThemedText>
                </View>
              </View>
            </Clickable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...Typography.bodySmallSemiBold,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  chip: {
    padding: Spacing.sm,
    paddingLeft: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    minWidth: 140,
    gap: Spacing.xs,
  },
  chipName: {
    ...Typography.smallSemiBold,
  },
  chipMeta: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  chipBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  chipBadgeText: {
    ...Typography.micro,
    fontWeight: '600',
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
