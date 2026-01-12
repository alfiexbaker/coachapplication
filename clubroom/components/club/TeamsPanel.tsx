import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ClubSquad } from '@/constants/types';

interface TeamsPanelProps {
  squads: ClubSquad[];
  isCoach: boolean;
  clubId?: string;
}

export function TeamsPanel({ squads, isCoach, clubId }: TeamsPanelProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (squads.length === 0 && !isCoach) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Teams</ThemedText>
        {isCoach && (
          <Pressable
            style={[styles.addButton, { backgroundColor: `${palette.tint}15` }]}
            onPress={() => router.push('/academy/create')}
          >
            <Ionicons name="add" size={16} color={palette.tint} />
            <ThemedText style={[styles.addButtonText, { color: palette.tint }]}>
              New Team
            </ThemedText>
          </Pressable>
        )}
      </View>

      {squads.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {squads.map((squad) => (
            <Pressable
              key={squad.id}
              onPress={() => router.push(`/club/${squad.clubId}/squad/${squad.id}`)}
            >
              <SurfaceCard style={styles.teamCard}>
                <View style={[styles.teamIcon, { backgroundColor: `${palette.tint}15` }]}>
                  <Ionicons name="people" size={24} color={palette.tint} />
                </View>
                <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.teamName}>
                  {squad.name}
                </ThemedText>
                <ThemedText style={[styles.teamMeta, { color: palette.muted }]}>
                  {squad.memberCount} athletes
                </ThemedText>
                {squad.primaryCoach && (
                  <View style={styles.coachRow}>
                    <Ionicons name="person-circle-outline" size={12} color={palette.muted} />
                    <ThemedText style={[styles.coachName, { color: palette.muted }]} numberOfLines={1}>
                      {squad.primaryCoach}
                    </ThemedText>
                  </View>
                )}
                {squad.nextSession && (
                  <View style={[styles.nextSessionBadge, { backgroundColor: `${palette.success}15` }]}>
                    <Ionicons name="calendar" size={10} color={palette.success} />
                    <ThemedText style={[styles.nextSessionText, { color: palette.success }]}>
                      {formatNextSession(squad.nextSession)}
                    </ThemedText>
                  </View>
                )}
              </SurfaceCard>
            </Pressable>
          ))}
        </ScrollView>
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
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  teamCard: {
    width: 140,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  teamName: {
    fontSize: 14,
    textAlign: 'center',
  },
  teamMeta: {
    fontSize: 12,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  coachName: {
    fontSize: 11,
    maxWidth: 100,
  },
  nextSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
  nextSessionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
