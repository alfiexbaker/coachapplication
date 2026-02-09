/**
 * InviteAthlete — Athlete list grouped by parent.
 */
import { memo, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Athlete } from '@/hooks/use-invite-athletes';

interface AthleteListProps {
  groupedByParent: Record<string, { parentName: string; athletes: Athlete[] }>;
  selectedAthletes: Athlete[];
  searchQuery: string;
  filteredCount: number;
  onToggle: (athlete: Athlete) => void;
}

function AthleteListInner({ groupedByParent, selectedAthletes, searchQuery, filteredCount, onToggle }: AthleteListProps) {
  const { colors: palette } = useTheme();

  const isSelected = useCallback((id: string) => selectedAthletes.some((a) => a.id === id), [selectedAthletes]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {Object.entries(groupedByParent).map(([parentId, group]) => (
        <View key={parentId} style={styles.parentGroup}>
          <View style={styles.parentHeader}>
            <Ionicons name="people-outline" size={16} color={palette.muted} />
            <ThemedText style={[styles.parentName, { color: palette.muted }]}>{group.parentName}</ThemedText>
          </View>
          {group.athletes.map((athlete) => {
            const selected = isSelected(athlete.id);
            return (
              <Clickable key={athlete.id} onPress={() => onToggle(athlete)}
                style={[styles.item, { backgroundColor: selected ? withAlpha(palette.tint, 0.06) : palette.surface, borderColor: selected ? palette.tint : palette.border }]}>
                <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                  <ThemedText style={[styles.avatarText, { color: palette.tint }]}>{athlete.name.charAt(0)}</ThemedText>
                </View>
                <View style={styles.info}>
                  <ThemedText type="defaultSemiBold">{athlete.name}</ThemedText>
                  <View style={styles.meta}>
                    {athlete.age != null && <ThemedText style={[styles.age, { color: palette.muted }]}>Age {athlete.age}</ThemedText>}
                    {athlete.skillLevel && (
                      <View style={[styles.skillBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                        <ThemedText style={{ ...Typography.micro, color: palette.tint }}>
                          {athlete.skillLevel.charAt(0) + athlete.skillLevel.slice(1).toLowerCase()}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  {athlete.squadName && <ThemedText style={[styles.squad, { color: palette.muted }]}>{athlete.squadName}</ThemedText>}
                  {athlete.lastSession && <ThemedText style={[styles.lastSess, { color: palette.muted }]}>Last session: {athlete.lastSession}</ThemedText>}
                </View>
                <View style={[styles.checkbox, { backgroundColor: selected ? palette.tint : 'transparent', borderColor: selected ? palette.tint : palette.border }]}>
                  {selected && <Ionicons name="checkmark" size={14} color={palette.onPrimary} />}
                </View>
              </Clickable>
            );
          })}
        </View>
      ))}
      {filteredCount === 0 && (
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={40} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
            {searchQuery ? 'No athletes found' : 'No athletes in your roster'}
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

export const AthleteList = memo(AthleteListInner);

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.lg },
  parentGroup: { gap: Spacing.sm },
  parentHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  parentName: { ...Typography.smallSemiBold },
  item: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5, gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Typography.heading },
  info: { flex: 1, gap: Spacing.micro },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  age: { ...Typography.caption },
  skillBadge: { paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  squad: { ...Typography.caption },
  lastSess: { ...Typography.caption },
  checkbox: { width: 22, height: 22, borderRadius: Radii.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
});
