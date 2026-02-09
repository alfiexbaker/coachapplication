/**
 * Extracted sub-components for GroupChat.
 *
 * PinnedBanner — pinned message banner with dismiss.
 * UnreadBadge — new messages count badge.
 * ChatMessageBubble — individual chat message with avatar + bubble + timestamp.
 * ChatInputBar — text input + attach + send button.
 */

import React, { memo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { GroupChatMessage } from './group-chat';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatChatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── PinnedBanner ────────────────────────────────────────────────────────────

interface PinnedBannerProps {
  pinnedMessage: GroupChatMessage;
  onDismiss?: () => void;
  palette: ThemeColors;
}

export const PinnedBanner = memo(function PinnedBanner({
  pinnedMessage,
  onDismiss,
  palette,
}: PinnedBannerProps) {
  return (
    <View style={[styles.pinnedBanner, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
      <Ionicons name="pin" size={Components.icon.sm} color={palette.tint} />
      <View style={styles.pinnedContent}>
        <ThemedText style={[styles.pinnedSender, { color: palette.tint }]} numberOfLines={1}>
          {pinnedMessage.senderName}
        </ThemedText>
        <ThemedText style={[styles.pinnedBody, { color: palette.muted }]} numberOfLines={1}>
          {pinnedMessage.body}
        </ThemedText>
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={Components.icon.md} color={palette.muted} />
        </Pressable>
      ) : null}
    </View>
  );
});

// ─── UnreadBadge ─────────────────────────────────────────────────────────────

interface UnreadBadgeProps {
  count: number;
  palette: ThemeColors;
}

export const UnreadBadge = memo(function UnreadBadge({ count, palette }: UnreadBadgeProps) {
  if (count === 0) return null;

  return (
    <View style={[styles.unreadBadge, { backgroundColor: palette.tint }]}>
      <ThemedText style={[styles.unreadText, { color: palette.onPrimary }]}>
        {count} new message{count !== 1 ? 's' : ''}
      </ThemedText>
    </View>
  );
});

// ─── ChatMessageBubble ───────────────────────────────────────────────────────

interface ChatMessageBubbleProps {
  message: GroupChatMessage;
  isOwn: boolean;
  palette: ThemeColors;
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  isOwn,
  palette,
}: ChatMessageBubbleProps) {
  return (
    <View style={[styles.messageLine, isOwn ? styles.messageLineOwn : styles.messageLineOther]}>
      {!isOwn ? (
        <View style={[styles.avatarSmall, { backgroundColor: withAlpha(palette.tint, 0.15) }]}>
          <ThemedText style={[styles.avatarInitial, { color: palette.tint }]}>
            {message.senderName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      ) : null}

      <View
        style={[
          styles.bubble,
          isOwn
            ? [styles.bubbleOwn, { backgroundColor: withAlpha(palette.tint, 0.15) }]
            : [styles.bubbleOther, { backgroundColor: palette.surface, borderColor: palette.border }],
        ]}
      >
        {!isOwn ? (
          <ThemedText style={[styles.senderName, { color: palette.tint }]}>
            {message.senderName}
          </ThemedText>
        ) : null}
        <ThemedText style={[styles.messageBody, { color: palette.text }]}>{message.body}</ThemedText>
        <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
          {formatChatTime(message.createdAt)}
        </ThemedText>
      </View>
    </View>
  );
});

// ─── GroupChatInputBar ───────────────────────────────────────────────────────

interface GroupChatInputBarProps {
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachPhoto?: () => void;
  palette: ThemeColors;
}

export const GroupChatInputBar = memo(function GroupChatInputBar({
  inputText,
  onChangeText,
  onSend,
  onAttachPhoto,
  palette,
}: GroupChatInputBarProps) {
  return (
    <View style={[styles.inputBar, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
      <Pressable
        style={styles.attachButton}
        onPress={onAttachPhoto}
        accessibilityLabel="Attach photo"
      >
        <Ionicons name="image-outline" size={Components.icon.lg} color={palette.muted} />
      </Pressable>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: palette.background,
            color: palette.text,
            borderColor: palette.border,
          },
        ]}
        value={inputText}
        onChangeText={onChangeText}
        placeholder="Message..."
        placeholderTextColor={palette.muted}
        multiline
        maxLength={2000}
        returnKeyType="default"
      />

      <Clickable
        onPress={onSend}
        disabled={!inputText.trim()}
        accessibilityLabel="Send message"
        accessibilityRole="button"
        style={{
          width: Components.button.height,
          height: Components.button.height,
          borderRadius: Radii.button,
          backgroundColor: inputText.trim() ? palette.tint : palette.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="send" size={Components.icon.md} color={palette.onPrimary} />
      </Clickable>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
  },
  pinnedContent: {
    flex: 1,
  },
  pinnedSender: {
    ...Typography.caption,
    fontWeight: '600',
  },
  pinnedBody: {
    ...Typography.small,
  },
  unreadBadge: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    marginVertical: Spacing.xs,
  },
  unreadText: {
    ...Typography.caption,
  },
  listContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  messageLine: {
    flexDirection: 'row',
    marginBottom: Spacing.xs / 2,
  },
  messageLineOwn: {
    justifyContent: 'flex-end',
  },
  messageLineOther: {
    justifyContent: 'flex-start',
    gap: Spacing.xs,
  },
  avatarSmall: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...Typography.caption,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.micro,
  },
  bubbleOwn: {
    borderRadius: Radii.card,
    borderBottomRightRadius: Radii.sm,
  },
  bubbleOther: {
    borderRadius: Radii.card,
    borderBottomLeftRadius: Radii.sm,
    borderWidth: 1,
  },
  senderName: {
    ...Typography.caption,
    fontWeight: '600',
  },
  messageBody: {
    ...Typography.body,
  },
  timestamp: {
    ...Typography.caption,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
  },
  attachButton: {
    width: Components.button.height,
    height: Components.button.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: Components.input.height,
    maxHeight: 120,
    borderRadius: Radii.md,
    paddingHorizontal: Components.input.paddingHorizontal,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    ...Typography.body,
  },
});
