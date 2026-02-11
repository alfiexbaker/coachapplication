/**
 * GroupConversationRow — A group chat thread card.
 *
 * Shows group avatar, title, member count, scope label, group type chip,
 * last message preview, posting-as options, and unread mentions badge.
 * Animated entry with FadeInDown. Memoized for FlatList usage.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ChatThreadSummary } from '@/constants/types';

interface GroupConversationRowProps {
  thread: ChatThreadSummary;
  index: number;
  onPress: () => void;
}

export const GroupConversationRow = memo(function GroupConversationRow({
  thread,
  index,
  onPress,
}: GroupConversationRowProps) {
  const { colors: palette } = useTheme();
  const unreadMentions = thread.unreadMentions || 0;
  const displayName = thread.title || thread.serviceName || 'Group';

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <SurfaceCard style={styles.groupCard}>
        <Row gap="md" align="center">
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.avatarText, { color: palette.text }]}>
              {displayName
                .split(' ')
                .map((n: string) => n[0])
                .join('')}
            </ThemedText>
          </View>
          <Column gap={Spacing.xs / 2} style={styles.flex}>
            <Row justify="between" align="center">
              <ThemedText type="defaultSemiBold" style={styles.coachName} numberOfLines={1}>
                {displayName}
              </ThemedText>
              <Chip dense>{thread.groupType || 'group'}</Chip>
            </Row>
            <ThemedText style={[styles.serviceName, { color: palette.muted }]} numberOfLines={1}>
              {thread.subtitle || thread.serviceName}
            </ThemedText>
            <Row align="center">
              <ThemedText style={[styles.metaPill, { color: palette.icon }]}>
                <Ionicons name="person" size={13} color={palette.icon} />{' '}
                {thread.memberCount ?? '\u2014'} members
              </ThemedText>
              {thread.scopeLabel ? (
                <ThemedText style={[styles.metaPill, { color: palette.icon }]}>
                  <Ionicons name="flag" size={13} color={palette.icon} /> {thread.scopeLabel}
                </ThemedText>
              ) : null}
            </Row>
          </Column>
          <Clickable
            style={[styles.secondaryButton, { borderColor: palette.tint }]}
            onPress={onPress}
            accessibilityLabel={`Open ${displayName} group`}
          >
            <ThemedText style={{ color: palette.tint, ...Typography.bodySemiBold }}>
              Open
            </ThemedText>
          </Clickable>
        </Row>
        {thread.lastMessageSnippet ? (
          <Row gap="sm" align="center">
            <Ionicons name="chatbubbles-outline" size={16} color={palette.icon} />
            <ThemedText numberOfLines={1} style={styles.flex}>
              {thread.lastMessageSender ? `${thread.lastMessageSender}: ` : ''}
              {thread.lastMessageSnippet}
            </ThemedText>
          </Row>
        ) : null}
        <Row justify="between" align="center">
          <Row gap="xs" wrap>
            <Chip dense>
              {thread.postingAsOptions?.length
                ? 'Post as: ' + thread.postingAsOptions.join(' / ')
                : 'Post as yourself'}
            </Chip>
            {unreadMentions > 0 ? (
              <Chip dense active>
                @{unreadMentions} mentions
              </Chip>
            ) : null}
          </Row>
          <Clickable onPress={onPress} accessibilityLabel={`Jump into ${displayName}`}>
            <ThemedText style={{ color: palette.premium, ...Typography.bodySemiBold }}>
              Jump in
            </ThemedText>
          </Clickable>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  groupCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.subheading,
  },
  flex: {
    flex: 1,
  },
  coachName: {
    flex: 1,
    ...Typography.subheading,
  },
  serviceName: {
    ...Typography.smallSemiBold,
  },
  metaPill: {
    ...Typography.smallSemiBold,
  },
  secondaryButton: {
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
});
