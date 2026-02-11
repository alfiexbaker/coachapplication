import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/primitives/chip';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Spacing, Typography  , withAlpha } from '@/constants/theme';
import { ChatThreadSummary } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface ThreadSummaryProps {
  thread: ChatThreadSummary;
}

export function ThreadSummary({ thread }: ThreadSummaryProps) {
  const { colors: palette } = useTheme();
  const displayName = thread.title || thread.serviceName || 'Conversation';
  const subtitle = thread.subtitle || thread.serviceName;
  const isGroup = thread.kind === 'group';

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" gap="sm">
        <View
          style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.13) }]}
          accessibilityLabel={`${displayName} avatar placeholder`}>
          <IconSymbol name="person.circle" size={28} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">{displayName}</ThemedText>
          <Row align="center" gap="xs">
            <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
            {isGroup && thread.scopeLabel ? (
              <View style={[styles.tag, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
                <ThemedText style={styles.tagLabel}>{thread.scopeLabel}</ThemedText>
              </View>
            ) : null}
            {isGroup && thread.groupType ? (
              <View style={[styles.tag, { backgroundColor: withAlpha(palette.secondary, 0.08) }]}>
                <ThemedText style={styles.tagLabel}>{thread.groupType}</ThemedText>
              </View>
            ) : null}
          </Row>
        </View>
        {thread.unreadCount ? (
          <View style={[styles.badge, { backgroundColor: palette.tint }]}>
            <ThemedText style={[styles.badgeLabel, { color: palette.onPrimary }]}>
              {thread.unreadCount}
            </ThemedText>
          </View>
        ) : null}
      </Row>
      <Row gap="sm" align="center">
        <IconSymbol name="calendar" size={18} color={palette.icon} />
        <ThemedText>
          {new Date(thread.scheduledFor).toLocaleString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </ThemedText>
      </Row>
      <Row gap="sm" align="center">
        <IconSymbol name="map.fill" size={18} color={palette.icon} />
        <ThemedText>{thread.location}</ThemedText>
      </Row>
      {thread.pinnedObjectives?.length ? (
        <Row wrap style={styles.objectivesRow}>
          {thread.pinnedObjectives.map((objective) => (
            <Chip key={objective} active>
              {objective}
            </Chip>
          ))}
        </Row>
      ) : null}
      {isGroup && thread.memberCount ? (
        <Row gap="sm" align="center">
          <IconSymbol name="person.3.fill" size={18} color={palette.icon} />
          <ThemedText>{thread.memberCount} members</ThemedText>
          {typeof thread.unreadMentions === 'number' && thread.unreadMentions > 0 ? (
            <View style={[styles.badge, { backgroundColor: palette.secondary }]}>
              <ThemedText style={[styles.badgeLabel, { color: palette.onPrimary }]}>@{thread.unreadMentions}</ThemedText>
            </View>
          ) : null}
        </Row>
      ) : null}
      {thread.lastMessageSnippet ? (
        <Row gap="sm" align="center">
          <IconSymbol name="text.bubble" size={18} color={palette.icon} />
          <ThemedText numberOfLines={1} style={{ flex: 1 }}>
            {thread.lastMessageSender ? `${thread.lastMessageSender}: ` : ''}
            {thread.lastMessageSnippet}
          </ThemedText>
        </Row>
      ) : null}
      <Row
        gap="sm"
        style={[
          styles.safetyBanner,
          { backgroundColor: withAlpha(palette.warning, 0.15) },
        ]}
        accessibilityRole="text">
        <IconSymbol name="shield.checkerboard" size={18} color={palette.secondary} />
        <ThemedText style={styles.safetyCopy}>{thread.safetyCopy}</ThemedText>
      </Row>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    opacity: 0.8,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  tagLabel: { ...Typography.caption, textTransform: 'capitalize' },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  badgeLabel: {
    fontWeight: '600',
  },
  safetyBanner: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  safetyCopy: { ...Typography.small, flex: 1,
    lineHeight: 18 },
  objectivesRow: {
    marginTop: -Spacing.xs,
  },
});
