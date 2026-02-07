/**
 * Session Type Chips
 *
 * Horizontal scrollable row of session type pills.
 * Shown in the Availability segment of the Schedule tab.
 */

import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionTemplate, SessionType } from '@/constants/session-types';

const TYPE_META: Record<SessionType, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  '1-to-1': { color: '#4F86F7', icon: 'person-outline' },
  'small-group': { color: '#34C759', icon: 'people-outline' },
  'clinic': { color: '#FF9500', icon: 'fitness-outline' },
  'assessment': { color: '#AF52DE', icon: 'clipboard-outline' },
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

  const hapticTap = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (templates.length === 0) {
    return (
      <Clickable
        onPress={() => { hapticTap(); onAdd(); }}
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
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Session Types</ThemedText>
        <Clickable
          onPress={() => { hapticTap(); onAdd(); }}
          style={[styles.headerAddBtn, { backgroundColor: withAlpha(palette.tint, 0.1) }]}
        >
          <Ionicons name="add" size={16} color={palette.tint} />
          <ThemedText style={[styles.headerAddBtnText, { color: palette.tint }]}>New</ThemedText>
        </Clickable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {templates.map((template) => {
          const meta = TYPE_META[template.type] || { color: palette.tint, icon: 'ellipse-outline' as const };
          const isSelected = selectedId === template.id;

          return (
            <Clickable
              key={template.id}
              onPress={() => { hapticTap(); onPress(template); }}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? withAlpha(meta.color, 0.12)
                    : withAlpha(meta.color, 0.06),
                  borderColor: isSelected ? meta.color : withAlpha(meta.color, 0.2),
                },
              ]}
            >
              <View style={[styles.chipIcon, { backgroundColor: withAlpha(meta.color, 0.12) }]}>
                <Ionicons name={meta.icon} size={16} color={meta.color} />
              </View>
              <View style={styles.chipContent}>
                <ThemedText style={[styles.chipName, { color: palette.text }]} numberOfLines={1}>
                  {template.name}
                </ThemedText>
                <ThemedText style={[styles.chipDetail, { color: palette.muted }]} numberOfLines={1}>
                  {template.duration}m · {template.defaultPrice > 0 ? `£${template.defaultPrice}` : 'Free'}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={14} color={palette.muted} />
            </Clickable>
          );
        })}
        {/* Add chip */}
        <Clickable
          onPress={() => { hapticTap(); onAdd(); }}
          style={[
            styles.addChip,
            { borderColor: palette.border, backgroundColor: palette.background },
          ]}
        >
          <Ionicons name="add" size={18} color={palette.tint} />
          <ThemedText style={[styles.addChipText, { color: palette.tint }]}>Add</ThemedText>
        </Clickable>
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
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  headerAddBtnText: {
    ...Typography.smallSemiBold,
  },
  chipRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
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
    gap: 2,
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
