import { View, StyleSheet, FlatList, type ListRenderItemInfo } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ClubSquad } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface TeamsPanelProps {
  squads: ClubSquad[];
  canManageTeams: boolean;
  clubId?: string;
}

export function TeamsPanel({ squads, canManageTeams, clubId }: TeamsPanelProps) {
  const { colors: palette } = useTheme();
  const teamItems = getTeamItems(squads, canManageTeams, palette);

  if (squads.length === 0 && !canManageTeams) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Row style={styles.header}>
        <ThemedText type="subtitle">Teams</ThemedText>
        {canManageTeams && (
          <Clickable
            style={[styles.addButton, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
            onPress={() =>
              router.push(clubId ? Routes.clubSquadCreate(clubId) : Routes.CLUB_SQUAD_CREATE)
            }
          >
            <Ionicons name="add" size={16} color={palette.tint} />
            <ThemedText style={[styles.addButtonText, { color: palette.tint }]}>
              New Team
            </ThemedText>
          </Clickable>
        )}
      </Row>

      {squads.length > 0 ? (
        <FlatList
          horizontal
          data={teamItems}
          keyExtractor={keyTeamItem}
          renderItem={renderTeamItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      ) : (
        <SurfaceCard style={styles.emptyCard}>
          <Ionicons name="people-outline" size={32} color={palette.muted} />
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            Create teams to organize your athletes by age group or skill level
          </ThemedText>
        </SurfaceCard>
      )}
    </View>
  );
}

interface TeamItem {
  key: string;
  squad: ClubSquad;
  canManageTeams: boolean;
  palette: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}

function getTeamItems(
  squads: ClubSquad[],
  canManageTeams: boolean,
  palette: ReturnType<typeof useTheme>['colors'],
): TeamItem[] {
  return squads.map((squad) => ({
    key: squad.id,
    squad,
    canManageTeams,
    palette,
    onPress: () => router.push(Routes.clubSquad(squad.id)),
  }));
}

function keyTeamItem(item: TeamItem) {
  return item.key;
}

function renderTeamItem({ item }: ListRenderItemInfo<TeamItem>) {
  const { squad, palette, canManageTeams } = item;
  return (
    <SurfaceCard
      style={styles.teamCard}
      onPress={item.onPress}
      accessibilityLabel={`${canManageTeams ? 'Manage' : 'View'} ${squad.name}`}
    >
      <View style={[styles.teamIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name="people" size={24} color={palette.tint} />
      </View>
      <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.teamName}>
        {squad.name}
      </ThemedText>
      <ThemedText style={[styles.teamMeta, { color: palette.muted }]}>
        {squad.memberCount} athletes
      </ThemedText>
      {squad.primaryCoach && (
        <Row style={styles.coachRow}>
          <Ionicons name="person-circle-outline" size={12} color={palette.muted} />
          <ThemedText style={[styles.coachName, { color: palette.muted }]} numberOfLines={1}>
            {squad.primaryCoach}
          </ThemedText>
        </Row>
      )}
      {squad.nextSession && (
        <Row
          style={[styles.nextSessionBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}
        >
          <Ionicons name="calendar" size={10} color={palette.success} />
          <ThemedText style={[styles.nextSessionText, { color: palette.success }]}>
            {formatNextSession(squad.nextSession)}
          </ThemedText>
        </Row>
      )}
      <Row style={styles.manageRow}>
        <ThemedText style={[styles.manageText, { color: palette.tint }]}>
          {canManageTeams ? 'Manage squad' : 'View squad'}
        </ThemedText>
        <Ionicons name="chevron-forward" size={14} color={palette.tint} />
      </Row>
    </SurfaceCard>
  );
}

function formatNextSession(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return date.toLocaleDateString('en-GB', { weekday: 'short' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  addButton: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  addButtonText: { ...Typography.smallSemiBold },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  teamCard: {
    width: 140,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxs,
  },
  teamName: { ...Typography.bodySmall, textAlign: 'center' },
  teamMeta: { ...Typography.caption },
  coachRow: {
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  coachName: { ...Typography.caption, maxWidth: 100 },
  nextSessionBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  nextSessionText: { ...Typography.micro },
  manageRow: {
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  manageText: { ...Typography.micro },
  emptyCard: {
    marginHorizontal: Spacing.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.small,
    textAlign: 'center',
    lineHeight: Typography.caption.lineHeight,
  },
});
