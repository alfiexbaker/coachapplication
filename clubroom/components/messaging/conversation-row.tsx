/**
 * ConversationRow — A single direct-message thread row.
 *
 * Shows avatar initials, coach/contact name, service name,
 * unread badge, timestamp, and last message preview.
 * Animated entry with FadeInDown. Memoized for FlatList usage.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ChatThreadSummary } from '@/constants/types';

interface ConversationRowProps {
  thread: ChatThreadSummary;
  index: number;
  onPress: () => void;
}

export const ConversationRow = memo(function ConversationRow({
  thread,
  index,
  onPress,
}: ConversationRowProps) {
  const { colors: palette } = useTheme();
  const hasUnread = thread.unreadCount > 0;
  const displayName = thread.title || thread.coachName;
  const subtitle = thread.serviceName || thread.subtitle || '1:1 coaching';

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Clickable
        onPress={onPress}
        style={({ pressed }) => [
          styles.conversationRow,
          {
            backgroundColor: pressed ? palette.surfaceSecondary : 'transparent',
          },
        ]}
        accessibilityLabel={`Message from ${displayName}`}
      >
        <View style={[styles.avatar, { backgroundColor: palette.surface }]}>
          <ThemedText style={[styles.avatarText, { color: palette.text }]}>
            {displayName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </ThemedText>
        </View>
        <Column gap={2} style={styles.conversationContent}>
          <Row justify="between" align="center">
            <ThemedText type="defaultSemiBold" style={styles.coachName} numberOfLines={1}>
              {displayName}
            </ThemedText>
            <ThemedText style={[styles.time, { color: palette.muted }]} numberOfLines={1}>
              {new Date(thread.scheduledFor).toLocaleDateString('en-GB', {
                month: 'short',
                day: 'numeric',
              })}
            </ThemedText>
          </Row>
          <Row justify="between" align="center">
            <ThemedText style={[styles.serviceName, { color: palette.muted }]} numberOfLines={1}>
              {subtitle}
            </ThemedText>
            {hasUnread && (
              <View style={[styles.badge, { backgroundColor: palette.premium }]}>
                <ThemedText style={[styles.badgeText, { color: palette.onPrimary }]}>
                  {thread.unreadCount}
                </ThemedText>
              </View>
            )}
          </Row>
          {thread.lastMessageSnippet ? (
            <ThemedText style={[styles.preview, { color: palette.muted }]} numberOfLines={1}>
              {thread.lastMessageSender ? `${thread.lastMessageSender}: ` : ''}
              {thread.lastMessageSnippet}
            </ThemedText>
          ) : null}
        </Column>
      </Clickable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
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
  conversationContent: {
    flex: 1,
  },
  coachName: {
    flex: 1,
    ...Typography.subheading,
  },
  time: {
    ...Typography.smallSemiBold,
  },
  serviceName: {
    ...Typography.smallSemiBold,
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radii.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  badgeText: {
    ...Typography.caption,
  },
  preview: {
    fontSize: Typography.small.fontSize,
  },
});
