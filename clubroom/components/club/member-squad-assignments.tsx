import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ClubSquad } from '@/constants/types';

interface MemberSquadAssignmentsProps {
  squads: ClubSquad[];
  memberSquadIds: string[];
  onToggle: (squadId: string) => void;
}

export const MemberSquadAssignments = memo(function MemberSquadAssignments({ squads, memberSquadIds, onToggle }: MemberSquadAssignmentsProps) {
  const { colors } = useTheme();

  if (squads.length === 0) return null;

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="xs" align="center">
        <Ionicons name="layers-outline" size={20} color={colors.tint} />
        <ThemedText type="defaultSemiBold" style={Typography.subheading}>Squad Assignments</ThemedText>
      </Row>
      <ThemedText style={[Typography.small, { color: colors.muted }]}>Tap to add or remove from squads</ThemedText>
      <View style={styles.list}>
        {squads.map((squad) => {
          const isIn = memberSquadIds.includes(squad.id);
          return (
            <Clickable key={squad.id} onPress={() => onToggle(squad.id)}
              style={[styles.row, { borderColor: isIn ? colors.tint : colors.border, backgroundColor: isIn ? withAlpha(colors.tint, 0.03) : colors.surface }]}>
              <View style={[styles.icon, { backgroundColor: isIn ? withAlpha(colors.tint, 0.09) : withAlpha(colors.muted, 0.06) }]}>
                <Ionicons name="people" size={18} color={isIn ? colors.tint : colors.muted} />
              </View>
              <View style={{ flex: 1, gap: Spacing.micro }}>
                <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
                <ThemedText style={[Typography.small, { color: colors.muted }]}>{squad.level} -- {squad.memberCount} members</ThemedText>
              </View>
              <View style={[styles.toggle, { backgroundColor: isIn ? colors.tint : colors.border }]}>
                <Ionicons name={isIn ? 'checkmark' : 'add'} size={16} color={colors.surface} />
              </View>
            </Clickable>
          );
        })}
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  list: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  toggle: { width: 28, height: 28, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
});
