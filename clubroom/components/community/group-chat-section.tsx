import React, { useRef } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { GroupMessage } from '@/constants/types';

import {
  shouldShowDateHeader,
  ChatEmptyState,
  MessageBubble,
  ChatInputBar,
  styles,
} from './group-chat-section-sections';

// ─── Types ──────────────────────────────────────────────────────

interface GroupChatSectionProps {
  messages: GroupMessage[];
  parentId: string;
  inputValue: string;
  sending: boolean;
  onInputChange: (text: string) => void;
  onSend: () => void;
}

// ─── Component ──────────────────────────────────────────────────

function GroupChatSectionInner({
  messages,
  parentId,
  inputValue,
  sending,
  onInputChange,
  onSend,
}: GroupChatSectionProps) {
  const { colors: palette } = useTheme();
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
          <ChatEmptyState palette={palette} />
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.senderId === parentId}
              showDate={shouldShowDateHeader(message, messages[index - 1])}
              palette={palette}
            />
          ))
        )}
      </ScrollView>

      <ChatInputBar
        inputValue={inputValue}
        sending={sending}
        onInputChange={onInputChange}
        onSend={onSend}
        palette={palette}
      />
    </KeyboardAvoidingView>
  );
}

export const GroupChatSection = React.memo(GroupChatSectionInner);
