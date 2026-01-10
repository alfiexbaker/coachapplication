import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { rosterService } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';

interface AthleteRowProps {
  entry: RosterEntry;
  onPress?: () => void;
}

export function AthleteRow({ entry, onPress }: AthleteRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const statusColor = rosterService.getStatusColor(entry.status);

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <View style={styles.main}>
        {/* Avatar */}
        {entry.athletePhotoUrl ? (
          <Image source={{ uri: entry.athletePhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: palette.border }]}>
            <ThemedText style={styles.avatarText}>
              {entry.athleteName.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.name}>
              {entry.athleteName}
            </ThemedText>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          <ThemedText style={[styles.parentName, { color: palette.muted }]}>
            {entry.parentName} | {entry.athleteAge} yrs
          </ThemedText>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {entry.totalSessions} sessions
              </ThemedText>
            </View>
            {entry.primaryFocus && (
              <View style={[styles.focusBadge, { backgroundColor: `${palette.tint}10` }]}>
                <ThemedText style={[styles.focusText, { color: palette.tint }]}>
                  {entry.primaryFocus}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </View>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <View style={[styles.tagsSection, { borderTopColor: palette.border }]}>
          {entry.tags.slice(0, 4).map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: palette.surfaceSecondary }]}>
              <ThemedText style={[styles.tagText, { color: palette.muted }]}>{tag}</ThemedText>
            </View>
          ))}
          {entry.tags.length > 4 && (
            <View style={[styles.tag, { backgroundColor: palette.surfaceSecondary }]}>
              <ThemedText style={[styles.tagText, { color: palette.muted }]}>
                +{entry.tags.length - 4}
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: 0,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  parentName: {
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
  },
  focusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  focusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
