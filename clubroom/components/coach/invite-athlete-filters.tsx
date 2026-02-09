/**
 * InviteAthlete — Filter panel and quick select actions.
 */
import { memo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Squad, SkillFilter, AgeFilter } from '@/hooks/use-invite-athletes';

// ---------------------------------------------------------------------------
// Filter Panel
// ---------------------------------------------------------------------------

interface FilterPanelProps {
  skillFilter: SkillFilter;
  ageFilter: AgeFilter;
  squadFilter: string;
  availableSquads: Squad[];
  hasActiveFilters: boolean;
  onSkillFilter: (v: SkillFilter) => void;
  onAgeFilter: (v: AgeFilter) => void;
  onSquadFilter: (v: string) => void;
  onReset: () => void;
}

function FilterPanelInner(p: FilterPanelProps) {
  const { colors: palette } = useTheme();

  const renderChipRow = <T extends string>(label: string, options: T[], current: T, onSelect: (v: T) => void, format?: (v: T) => string) => (
    <View style={styles.filterRow}>
      <ThemedText style={styles.filterLabel}>{label}</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterChips}>
          {options.map((opt) => (
            <Clickable key={opt} onPress={() => onSelect(opt)}
              style={[styles.filterChip, { backgroundColor: current === opt ? palette.tint : 'transparent', borderColor: current === opt ? palette.tint : palette.border }]}>
              <ThemedText style={{ ...Typography.caption, color: current === opt ? palette.onPrimary : palette.text }}>
                {format ? format(opt) : opt === 'ALL' ? 'All' : opt.charAt(0) + opt.slice(1).toLowerCase()}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {renderChipRow('Skill Level', ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as SkillFilter[], p.skillFilter, p.onSkillFilter)}
      {renderChipRow('Age Group', ['ALL', 'U8', 'U10', 'U12', 'U14', 'U16', '16+'] as AgeFilter[], p.ageFilter, p.onAgeFilter, (v) => v === 'ALL' ? 'All' : v)}
      {p.availableSquads.length > 0 && renderChipRow(
        'Squad',
        ['ALL', ...p.availableSquads.map((s) => s.id)],
        p.squadFilter,
        p.onSquadFilter,
        (v) => v === 'ALL' ? 'All' : p.availableSquads.find((s) => s.id === v)?.name ?? v,
      )}
      {p.hasActiveFilters && (
        <Clickable onPress={p.onReset} style={styles.resetButton}>
          <Ionicons name="refresh" size={14} color={palette.tint} />
          <ThemedText style={{ color: palette.tint, ...Typography.caption }}>Reset Filters</ThemedText>
        </Clickable>
      )}
    </View>
  );
}

export const FilterPanel = memo(FilterPanelInner);

// ---------------------------------------------------------------------------
// Quick Select Actions
// ---------------------------------------------------------------------------

interface QuickSelectProps {
  filteredCount: number;
  availableSquads: Squad[];
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectBySquad: (id: string) => void;
  onSelectBySkill: (level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => void;
}

function QuickSelectInner(p: QuickSelectProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.quickContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.quickActions}>
          <Clickable onPress={p.onSelectAll} style={[styles.quickButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <Ionicons name="checkmark-done" size={14} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, ...Typography.caption }}>Select All ({p.filteredCount})</ThemedText>
          </Clickable>
          <Clickable onPress={p.onSelectNone} style={[styles.quickButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}>
            <ThemedText style={{ ...Typography.caption, color: palette.text }}>Select None</ThemedText>
          </Clickable>
          {p.availableSquads.map((squad) => (
            <Clickable key={squad.id} onPress={() => p.onSelectBySquad(squad.id)}
              style={[styles.quickButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}>
              <Ionicons name="people" size={14} color={palette.muted} />
              <ThemedText style={{ ...Typography.caption, color: palette.text }}>All in {squad.name}</ThemedText>
            </Clickable>
          ))}
          <Clickable onPress={() => p.onSelectBySkill('BEGINNER')}
            style={[styles.quickButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}>
            <ThemedText style={{ ...Typography.caption, color: palette.text }}>Beginners only</ThemedText>
          </Clickable>
        </View>
      </ScrollView>
    </View>
  );
}

export const QuickSelect = memo(QuickSelectInner);

const styles = StyleSheet.create({
  panel: { marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, gap: Spacing.sm },
  filterRow: { gap: Spacing.xs },
  filterLabel: { ...Typography.caption },
  filterChips: { flexDirection: 'row', gap: Spacing.xs },
  filterChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm, borderWidth: 1 },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs, marginTop: Spacing.xs },
  quickContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  quickActions: { flexDirection: 'row', gap: Spacing.xs },
  quickButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.md },
});
