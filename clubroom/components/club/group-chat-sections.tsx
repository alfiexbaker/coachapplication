/**
 * Extracted sub-components for GroupChat.
 *
 * PinnedBanner — pinned message banner with dismiss.
 * UnreadBadge — new messages count badge.
 * ChatMessageBubble — individual chat message with avatar + bubble + timestamp.
 * ChatInputBar — text input + attach + send button.
 */

import React, { memo } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Components, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { GroupChatMessage } from './group-chat';
import { styles } from './group-chat-styles';
import { Row } from '@/components/primitives';

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
    <Row
      style={[
        styles.pinnedBanner,
        { backgroundColor: palette.surface, borderBottomColor: palette.border },
      ]}
    >
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
    </Row>
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
    <Row style={[styles.messageLine, isOwn ? styles.messageLineOwn : styles.messageLineOther]}>
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
            : [
                styles.bubbleOther,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ],
        ]}
      >
        {!isOwn ? (
          <ThemedText style={[styles.senderName, { color: palette.tint }]}>
            {message.senderName}
          </ThemedText>
        ) : null}
        <ThemedText style={[styles.messageBody, { color: palette.text }]}>
          {message.body}
        </ThemedText>
        <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
          {formatChatTime(message.createdAt)}
        </ThemedText>
      </View>
    </Row>
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
    <Row
      style={[
        styles.inputBar,
        { backgroundColor: palette.surface, borderTopColor: palette.border },
      ]}
    >
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
    </Row>
  );
});

export { styles };
