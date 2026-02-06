import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing , withAlpha } from '@/constants/theme';
import type { ParentGroup, GroupType } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

interface ParentGroupCardProps {
  group: ParentGroup;
  onPress?: () => void;
  compact?: boolean;
}

function getGroupTypeIcon(type: GroupType): string {
  switch (type) {
    case 'CLUB':
      return 'football-outline';
    case 'SESSION':
      return 'calendar-outline';
    case 'CARPOOL':
      return 'car-outline';
    case 'GENERAL':
    default:
      return 'chatbubbles-outline';
  }
}

function getGroupTypeLabel(type: GroupType): string {
  switch (type) {
    case 'CLUB':
      return 'Club';
    case 'SESSION':
      return 'Session';
    case 'CARPOOL':
      return 'Carpool';
    case 'GENERAL':
    default:
      return 'General';
  }
}

function formatTimeAgo(dateString: string | undefined): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function ParentGroupCardComponent({ group, onPress, compact = false }: ParentGroupCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const typeIcon = getGroupTypeIcon(group.type);
  const typeLabel = getGroupTypeLabel(group.type);
  const hasUnread = (group.unreadCount ?? 0) > 0;

  if (compact) {
    return (
      <SurfaceCard style={styles.compactCard} onPress={onPress}>
        <View style={[styles.avatarContainer, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name={typeIcon as keyof typeof Ionicons.glyphMap} size={20} color={palette.tint} />
        </View>
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <ThemedText type="defaultSemiBold" style={styles.compactTitle} numberOfLines={1}>
              {group.name}
            </ThemedText>
            {group.lastMessageAt && (
              <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>
                {formatTimeAgo(group.lastMessageAt)}
              </ThemedText>
            )}
          </View>
          <View style={styles.compactDetails}>
            <ThemedText
              style={[styles.previewText, { color: palette.muted }]}
              numberOfLines={1}
            >
              {group.lastMessagePreview || `${group.members.length} members`}
            </ThemedText>
            {hasUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: palette.tint }]}>
                <ThemedText style={styles.unreadText}>
                  {group.unreadCount! > 99 ? '99+' : group.unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.avatarLarge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name={typeIcon as keyof typeof Ionicons.glyphMap} size={28} color={palette.tint} />
        </View>
        <View style={styles.headerInfo}>
          <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
            {group.name}
          </ThemedText>
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
              <ThemedText style={[styles.typeBadgeText, { color: palette.accent }]}>
                {typeLabel}
              </ThemedText>
            </View>
            <View style={styles.memberInfo}>
              <Ionicons name="people-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.memberCount, { color: palette.muted }]}>
                {group.members.length}
              </ThemedText>
            </View>
          </View>
        </View>
        {hasUnread && (
          <View style={[styles.unreadBadgeLarge, { backgroundColor: palette.tint }]}>
            <ThemedText style={styles.unreadTextLarge}>
              {group.unreadCount! > 99 ? '99+' : group.unreadCount}
            </ThemedText>
          </View>
        )}
      </View>

      {group.description && (
        <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
          {group.description}
        </ThemedText>
      )}

      {group.lastMessagePreview && (
        <View style={[styles.lastMessage, { borderTopColor: palette.border }]}>
          <ThemedText style={[styles.lastMessageLabel, { color: palette.muted }]}>
            Last message
          </ThemedText>
          <View style={styles.lastMessageRow}>
            <ThemedText
              style={[styles.lastMessageText, { color: palette.text }]}
              numberOfLines={1}
            >
              {group.lastMessagePreview}
            </ThemedText>
            {group.lastMessageAt && (
              <ThemedText style={[styles.lastMessageTime, { color: palette.muted }]}>
                {formatTimeAgo(group.lastMessageAt)}
              </ThemedText>
            )}
          </View>
        </View>
      )}
    </SurfaceCard>
  );
}

export const ParentGroupCard = memo(ParentGroupCardComponent);

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  title: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  memberCount: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  description: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  lastMessage: {
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    gap: Spacing.xxs,
  },
  lastMessageLabel: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  lastMessageText: {
    flex: 1,
    fontSize: scaleFont(14),
  },
  lastMessageTime: {
    fontSize: scaleFont(12),
  },
  unreadBadgeLarge: {
    minWidth: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  unreadTextLarge: {
    color: Colors.light.onPrimary,
    fontSize: scaleFont(12),
    fontWeight: '700',
  },

  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  compactTitle: {
    flex: 1,
    fontSize: scaleFont(15),
  },
  compactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  previewText: {
    flex: 1,
    fontSize: scaleFont(13),
  },
  timeLabel: {
    fontSize: scaleFont(12),
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: Colors.light.onPrimary,
    fontSize: scaleFont(11),
    fontWeight: '700',
  },
});
