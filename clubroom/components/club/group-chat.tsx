import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GroupChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  isPinned?: boolean;
  imageUri?: string;
}

export interface GroupChatProps {
  messages: GroupChatMessage[];
  currentUserId: string;
  pinnedMessage?: GroupChatMessage | null;
  unreadCount?: number;
  onSend: (text: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onAttachPhoto?: () => void;
  onDismissPinned?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GroupChat({
  messages,
  currentUserId,
  pinnedMessage,
  unreadCount = 0,
  onSend,
  onPinMessage,
  onUnpinMessage,
  onAttachPhoto,
  onDismissPinned,
}: GroupChatProps) {
  const { colors: palette } = useTheme();

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<GroupChatMessage>>(null);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInputText('');
  }, [inputText, onSend]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = useCallback(
    ({ item }: { item: GroupChatMessage }) => {
      const isOwn = item.senderId === currentUserId;
      return (
        <View style={[styles.messageLine, isOwn ? styles.messageLineOwn : styles.messageLineOther]}>
          {/* Avatar placeholder for others */}
          {!isOwn ? (
            <View style={[styles.avatarSmall, { backgroundColor: withAlpha(palette.tint, 0.15) }]}>
              <ThemedText style={[styles.avatarInitial, { color: palette.tint }]}>
                {item.senderName.charAt(0).toUpperCase()}
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
                {item.senderName}
              </ThemedText>
            ) : null}
            <ThemedText style={[styles.messageBody, { color: palette.text }]}>{item.body}</ThemedText>
            <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
              {formatTime(item.createdAt)}
            </ThemedText>
          </View>
        </View>
      );
    },
    [currentUserId, palette],
  );

  const keyExtractor = useCallback((item: GroupChatMessage) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Pinned message banner */}
      {pinnedMessage ? (
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
          {onDismissPinned ? (
            <Pressable onPress={onDismissPinned} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={Components.icon.md} color={palette.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Unread count badge */}
      {unreadCount > 0 ? (
        <View style={[styles.unreadBadge, { backgroundColor: palette.tint }]}>
          <ThemedText style={[styles.unreadText, { color: palette.onPrimary }]}>
            {unreadCount} new message{unreadCount !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      ) : null}

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Input bar */}
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
          onChangeText={setInputText}
          placeholder="Message..."
          placeholderTextColor={palette.muted}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />

        <Clickable
          onPress={handleSend}
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
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
