import { useCallback, useRef, useState } from 'react';
import { AccessibleListCell } from '@/components/ui/list-accessibility';
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

import {
  PinnedBanner,
  UnreadBadge,
  ChatMessageBubble,
  GroupChatInputBar,
  styles,
} from './group-chat-sections';

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

  const renderMessage = useCallback(
    ({ item }: { item: GroupChatMessage }) => (
      <ChatMessageBubble message={item} isOwn={item.senderId === currentUserId} palette={palette} />
    ),
    [currentUserId, palette],
  );

  const keyExtractor = useCallback((item: GroupChatMessage) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {pinnedMessage ? (
        <PinnedBanner pinnedMessage={pinnedMessage} onDismiss={onDismissPinned} palette={palette} />
      ) : null}

      {unreadCount > 0 ? <UnreadBadge count={unreadCount} palette={palette} /> : null}

      <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <GroupChatInputBar
        inputText={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        onAttachPhoto={onAttachPhoto}
        palette={palette}
      />
    </KeyboardAvoidingView>
  );
}
