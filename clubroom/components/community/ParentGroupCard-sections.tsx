/**
 * Extracted sub-components for ParentGroupCard.
 *
 * getGroupTypeIcon, getGroupTypeLabel, formatTimeAgo — helpers.
 * CompactGroupCardContent — compact row variant.
 * FullGroupCardContent — full card variant with description + last message.
 */

import { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ParentGroup, GroupType } from '@/constants/types';
import { Row } from '@/components/primitives';
import { styles } from './parent-group-card-styles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getGroupTypeIcon(type: GroupType): string {
  switch (type) {
    case 'CLUB':
      return 'football-outline';
    case 'SESSION':
      return 'calendar-outline';
    case 'CARPOOL':
      return 'car-outline';
    case 'SQUAD':
      return 'people';
    case 'GENERAL':
    default:
      return 'chatbubbles-outline';
  }
}

export function getGroupTypeLabel(type: GroupType): string {
  switch (type) {
    case 'CLUB':
      return 'Club';
    case 'SESSION':
      return 'Session';
    case 'CARPOOL':
      return 'Carpool';
    case 'SQUAD':
      return 'Squad';
    case 'GENERAL':
    default:
      return 'General';
  }
}

export function formatTimeAgo(dateString: string | undefined): string {
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

// ─── CompactGroupCardContent ─────────────────────────────────────────────────

interface CompactGroupCardContentProps {
  group: ParentGroup;
  onPress?: () => void;
  palette: ThemeColors;
}

export const CompactGroupCardContent = memo(function CompactGroupCardContent({
  group,
  onPress,
  palette,
}: CompactGroupCardContentProps) {
  const typeIcon = getGroupTypeIcon(group.type);
  const hasUnread = (group.unreadCount ?? 0) > 0;

  return (
    <SurfaceCard style={styles.compactCard} onPress={onPress}>
      <View style={[styles.avatarContainer, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons
          name={typeIcon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={palette.tint}
        />
      </View>
      <View style={styles.compactContent}>
        <Row style={styles.compactHeader}>
          <ThemedText type="defaultSemiBold" style={styles.compactTitle} numberOfLines={1}>
            {group.name}
          </ThemedText>
          {group.lastMessageAt && (
            <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>
              {formatTimeAgo(group.lastMessageAt)}
            </ThemedText>
          )}
        </Row>
        <Row style={styles.compactDetails}>
          <ThemedText style={[styles.previewText, { color: palette.muted }]} numberOfLines={1}>
            {group.lastMessagePreview || `${group.members.length} members`}
          </ThemedText>
          {hasUnread && (
            <View style={[styles.unreadBadge, { backgroundColor: palette.tint }]}>
              <ThemedText style={[styles.unreadText, { color: palette.onPrimary }]}>
                {group.unreadCount! > 99 ? '99+' : group.unreadCount}
              </ThemedText>
            </View>
          )}
        </Row>
      </View>
      <Ionicons name="chevron-forward" size={20} color={palette.muted} />
    </SurfaceCard>
  );
});

// ─── FullGroupCardContent ────────────────────────────────────────────────────

interface FullGroupCardContentProps {
  group: ParentGroup;
  onPress?: () => void;
  palette: ThemeColors;
}

export const FullGroupCardContent = memo(function FullGroupCardContent({
  group,
  onPress,
  palette,
}: FullGroupCardContentProps) {
  const typeIcon = getGroupTypeIcon(group.type);
  const typeLabel = getGroupTypeLabel(group.type);
  const hasUnread = (group.unreadCount ?? 0) > 0;

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <Row style={styles.header}>
        <View style={[styles.avatarLarge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons
            name={typeIcon as keyof typeof Ionicons.glyphMap}
            size={28}
            color={palette.tint}
          />
        </View>
        <View style={styles.headerInfo}>
          <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
            {group.name}
          </ThemedText>
          <Row style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
              <ThemedText style={[styles.typeBadgeText, { color: palette.accent }]}>
                {typeLabel}
              </ThemedText>
            </View>
            <Row style={styles.memberInfo}>
              <Ionicons name="people-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.memberCount, { color: palette.muted }]}>
                {group.members.length}
              </ThemedText>
            </Row>
          </Row>
        </View>
        {hasUnread && (
          <View style={[styles.unreadBadgeLarge, { backgroundColor: palette.tint }]}>
            <ThemedText style={[styles.unreadTextLarge, { color: palette.onPrimary }]}>
              {group.unreadCount! > 99 ? '99+' : group.unreadCount}
            </ThemedText>
          </View>
        )}
      </Row>

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
          <Row style={styles.lastMessageRow}>
            <ThemedText style={[styles.lastMessageText, { color: palette.text }]} numberOfLines={1}>
              {group.lastMessagePreview}
            </ThemedText>
            {group.lastMessageAt && (
              <ThemedText style={[styles.lastMessageTime, { color: palette.muted }]}>
                {formatTimeAgo(group.lastMessageAt)}
              </ThemedText>
            )}
          </Row>
        </View>
      )}
    </SurfaceCard>
  );
});

export { styles };
