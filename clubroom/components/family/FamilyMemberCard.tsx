import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import type { FamilyMember } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface FamilyMemberCardProps {
  /** Family member data */
  member: FamilyMember;
  /** Optional click handler */
  onPress?: (member: FamilyMember) => void;
  /** Show detailed stats */
  showStats?: boolean;
  /** Compact view mode */
  compact?: boolean;
}

/**
 * FamilyMemberCard displays a child's information in the family dashboard.
 * Shows avatar, name, age, and optionally stats like sessions and badges.
 */
export function FamilyMemberCard({
  member,
  onPress,
  showStats = true,
  compact = false,
}: FamilyMemberCardProps) {
  const { colors: palette } = useTheme();

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRelationshipLabel = (relationship: FamilyMember['relationship']): string => {
    switch (relationship) {
      case 'son':
        return 'Son';
      case 'daughter':
        return 'Daughter';
      case 'ward':
        return 'Ward';
      default:
        return 'Child';
    }
  };

  const content = (
    <SurfaceCard style={[styles.card, compact ? styles.cardCompact : undefined]}>
      <View style={styles.header}>
        {/* Avatar */}
        {member.avatar ? (
          <Image source={{ uri: member.avatar }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: withAlpha(member.colorCode, 0.12) },
            ]}
          >
            <ThemedText
              style={[styles.avatarText, { color: member.colorCode }]}
            >
              {getInitials(member.name)}
            </ThemedText>
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold" style={styles.name}>
              {member.name}
            </ThemedText>
            <View
              style={[styles.colorDot, { backgroundColor: member.colorCode }]}
            />
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={[styles.meta, { color: palette.muted }]}>
              {member.age} years old
            </ThemedText>
            <ThemedText style={[styles.metaDivider, { color: palette.muted }]}>
              {' '}
              {'\u00B7'}{' '}
            </ThemedText>
            <ThemedText style={[styles.meta, { color: palette.muted }]}>
              {getRelationshipLabel(member.relationship)}
            </ThemedText>
          </View>
          {member.skillLevel && (
            <Chip dense style={styles.skillChip}>
              {member.skillLevel}
            </Chip>
          )}
        </View>

        {/* Chevron */}
        {onPress && (
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        )}
      </View>

      {/* Stats Row */}
      {showStats && !compact && (
        <View style={[styles.statsRow, { borderTopColor: palette.border }]}>
          <View style={styles.stat}>
            <Ionicons name="calendar-outline" size={16} color={member.colorCode} />
            <ThemedText style={styles.statValue}>
              {member.totalSessions || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              sessions
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="ribbon-outline" size={16} color={palette.rating} />
            <ThemedText style={styles.statValue}>
              {member.totalBadges || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              badges
            </ThemedText>
          </View>
          {member.primarySport && (
            <View style={styles.stat}>
              <Ionicons name="football-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                {member.primarySport}
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </SurfaceCard>
  );

  if (onPress) {
    return (
      <Clickable onPress={() => onPress(member)}>
        {content}
      </Clickable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    padding: Components.card.padding,
    gap: Spacing.md,
  },
  cardCompact: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.title },
  info: {
    flex: 1,
    gap: Spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: { ...Typography.subheading },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: { ...Typography.small },
  metaDivider: { ...Typography.small },
  skillChip: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xxs,
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statValue: { ...Typography.bodySmallSemiBold },
  statLabel: { ...Typography.caption },
});
