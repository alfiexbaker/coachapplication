import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';
import type { GroupMessage } from '@/constants/types';

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function shouldShowDateHeader(current: GroupMessage, prev: GroupMessage | undefined): boolean {
  if (!prev) return true;
  return new Date(current.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroupChatSectionProps {
  messages: GroupMessage[];
  parentId: string;
  inputValue: string;
  sending: boolean;
  onInputChange: (text: string) => void;
  onSend: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function GroupChatSectionInner({
  messages,
  parentId,
  inputValue,
  sending,
  onInputChange,
  onSend,
}: GroupChatSectionProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyMessages}>
            <Ionicons name="chatbubbles-outline" size={48} color={palette.muted} />
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              No messages yet. Start the conversation!
            </ThemedText>
          </View>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.senderId === parentId;
            const showDate = shouldShowDateHeader(message, messages[index - 1]);

            return (
              <View key={message.id}>
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
                      {message.senderName}
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
                        { color: isOwnMessage ? Colors.light.onPrimary : palette.text },
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
          })
        )}
      </ScrollView>

      {/* Input */}
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
          <Pressable
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
          >
            {inputValue.trim() ? (
              <IconSymbol name="paperplane.fill" size={18} color={Colors.light.onPrimary} />
            ) : (
              <IconSymbol name="paperplane" size={18} color={palette.muted} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export const GroupChatSection = React.memo(GroupChatSectionInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
    textAlign: 'center',
  },
  dateHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dateHeaderText: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
  messageWrapper: {
    marginBottom: Spacing.sm,
    maxWidth: '85%',
  },
  ownMessageWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
    marginBottom: Spacing.xxs,
    marginLeft: Spacing.sm,
  },
  messageBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
  },
  ownBubble: {
    borderBottomRightRadius: Radii.sm,
  },
  otherBubble: {
    borderBottomLeftRadius: Radii.sm,
  },
  messageText: {
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
  },
  ownFooter: {
    justifyContent: 'flex-end',
  },
  otherFooter: {
    justifyContent: 'flex-start',
  },
  messageTime: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.subheading,
    fontSize: scaleFont(Typography.subheading.fontSize),
    maxHeight: 100,
    paddingVertical: Spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
