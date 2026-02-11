/**
 * Extracted sub-components for GroupChatSection.
 *
 * formatTime, formatDateHeader, shouldShowDateHeader — date helpers.
 * ChatEmptyState — empty messages placeholder.
 * MessageBubble — single message with sender, bubble, time, status.
 * ChatInputBar — text input + send button.
 */

import React, { memo } from 'react';
import { TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ThemeColors } from '@/hooks/useTheme';
import type { GroupMessage } from '@/constants/types';
import { styles } from './group-chat-section-styles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function shouldShowDateHeader(current: GroupMessage, prev: GroupMessage | undefined): boolean {
  if (!prev) return true;
  return new Date(current.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
}

// ─── ChatEmptyState ──────────────────────────────────────────────────────────

interface ChatEmptyStateProps {
  palette: ThemeColors;
}

export const ChatEmptyState = memo(function ChatEmptyState({ palette }: ChatEmptyStateProps) {
  return (
    <View style={styles.emptyMessages}>
      <Ionicons name="chatbubbles-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        No messages yet. Start the conversation!
      </ThemedText>
    </View>
  );
});

// ─── MessageBubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: GroupMessage;
  isOwnMessage: boolean;
  showDate: boolean;
  palette: ThemeColors;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
  showDate,
  palette,
}: MessageBubbleProps) {
  return (
    <View>
      {showDate && (
        <View style={styles.dateHeader}>
          <ThemedText style={[styles.dateHeaderText, { color: palette.muted }]}>
            {formatDateHeader(message.createdAt)}
          </ThemedText>
        </View>
      )}
      <Animated.View
        entering={FadeInDown.delay(50).duration(300)}
        style={[
          styles.messageWrapper,
          isOwnMessage ? styles.ownMessageWrapper : styles.otherMessageWrapper,
        ]}
      >
        {!isOwnMessage && (
          <ThemedText style={[styles.senderName, { color: palette.tint }]}>
            {message.senderId || 'Member'}
          </ThemedText>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage
              ? [styles.ownBubble, { backgroundColor: palette.tint }]
              : [styles.otherBubble, { backgroundColor: palette.surface }],
          ]}
        >
          <ThemedText
            style={[
              styles.messageText,
              { color: isOwnMessage ? palette.onPrimary : palette.text },
            ]}
          >
            {message.body}
          </ThemedText>
        </View>
        <View
          style={[
            styles.messageFooter,
            isOwnMessage ? styles.ownFooter : styles.otherFooter,
          ]}
        >
          <ThemedText style={[styles.messageTime, { color: palette.muted }]}>
            {formatTime(message.createdAt)}
          </ThemedText>
          {isOwnMessage && (
            <Ionicons
              name={
                message.status === 'seen'
                  ? 'checkmark-done'
                  : message.status === 'delivered'
                  ? 'checkmark-done-outline'
                  : 'checkmark'
              }
              size={14}
              color={message.status === 'seen' ? palette.tint : palette.muted}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
});

// ─── ChatInputBar ────────────────────────────────────────────────────────────

interface ChatInputBarProps {
  inputValue: string;
  sending: boolean;
  onInputChange: (text: string) => void;
  onSend: () => void;
  palette: ThemeColors;
}

export const ChatInputBar = memo(function ChatInputBar({
  inputValue,
  sending,
  onInputChange,
  onSend,
  palette,
}: ChatInputBarProps) {
  return (
    <View style={[styles.inputContainer, { borderTopColor: palette.border }]}>
      <View
        style={[
          styles.inputWrapper,
          { borderColor: palette.border, backgroundColor: palette.card },
        ]}
      >
        <TextInput
          style={[styles.input, { color: palette.text }]}
          placeholder="Type a message..."
          placeholderTextColor={palette.muted}
          value={inputValue}
          onChangeText={onInputChange}
          multiline
          maxLength={1000}
        />
        <Clickable
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: inputValue.trim()
                ? pressed
                  ? palette.tintPressed
                  : palette.tint
                : palette.surface,
              borderColor: inputValue.trim() ? 'transparent' : palette.border,
            },
          ]}
          onPress={onSend}
          disabled={!inputValue.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !inputValue.trim() || sending }}
        >
          {inputValue.trim() ? (
            <IconSymbol name="paperplane.fill" size={18} color={palette.onPrimary} />
          ) : (
            <IconSymbol name="paperplane" size={18} color={palette.muted} />
          )}
        </Clickable>
      </View>
    </View>
  );
});

export { styles };
