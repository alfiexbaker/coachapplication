import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radii, Spacing } from '@/constants/theme';
import type { ParentGroup, GroupMessage } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { communityService } from '@/services/community-service';
import { scaleFont } from '@/utils/scale';
import { createLogger } from '@/utils/logger';

const logger = createLogger('GroupChatScreen');

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const parentId = currentUser?.id ?? 'parent1';
  const parentName = currentUser?.fullName ?? currentUser?.name ?? 'Parent';

  const [group, setGroup] = useState<ParentGroup | undefined>();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    if (!groupId) return;

    try {
      const [groupData, messagesData] = await Promise.all([
        communityService.getGroup(groupId),
        communityService.getGroupMessages(groupId),
      ]);

      setGroup(groupData);
      setMessages(messagesData);

      // Mark messages as read
      if (groupData) {
        await communityService.markMessagesRead(groupId, parentId);
      }
    } catch (error) {
      logger.error('Failed to load group data:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId, parentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !groupId || sending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      await communityService.sendGroupMessage(
        groupId,
        parentId,
        parentName,
        messageText
      );
      await loadData();
    } catch (error) {
      logger.error('Failed to send message:', error);
      setInputValue(messageText); // Restore message on failure
    } finally {
      setSending(false);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await communityService.leaveGroup(groupId!, parentId);
              router.back();
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  const handleShowMembers = () => {
    if (!group) return;

    const memberList = group.members
      .map((m) => `${m.parentName}${m.role === 'ADMIN' ? ' (Admin)' : ''}`)
      .join('\n');

    Alert.alert(`Members (${group.members.length})`, memberList);
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  };

  const shouldShowDateHeader = (currentMsg: GroupMessage, prevMsg: GroupMessage | undefined): boolean => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.createdAt).toDateString();
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    return currentDate !== prevDate;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Group not found</ThemedText>
          <Clickable onPress={() => router.back()}>
            <ThemedText style={{ color: palette.tint }}>Go back</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _isAdmin = group.members.some(
    (m) => m.parentId === parentId && m.role === 'ADMIN'
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <Clickable style={styles.headerInfo} onPress={handleShowMembers}>
          <ThemedText type="subtitle" style={styles.headerName}>
            {group.name}
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>
            {group.members.length} members
          </ThemedText>
        </Clickable>
        <Clickable onPress={handleLeaveGroup} style={styles.moreButton}>
          <Ionicons name="exit-outline" size={22} color={palette.error} />
        </Clickable>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
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
              const showDateHeader = shouldShowDateHeader(message, messages[index - 1]);

              return (
                <View key={message.id}>
                  {showDateHeader && (
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
                          { color: isOwnMessage ? '#FFFFFF' : palette.text },
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
              onChangeText={setInputValue}
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
              onPress={handleSend}
              disabled={!inputValue.trim() || sending}
            >
              {inputValue.trim() ? (
                <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
              ) : (
                <IconSymbol name="paperplane" size={18} color={palette.muted} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: scaleFont(13),
  },
  moreButton: {
    padding: Spacing.xs,
  },
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
    fontSize: scaleFont(14),
    textAlign: 'center',
  },
  dateHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dateHeaderText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
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
    fontSize: scaleFont(12),
    fontWeight: '600',
    marginBottom: 4,
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
    fontSize: scaleFont(15),
    lineHeight: scaleFont(21),
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: Spacing.sm,
  },
  ownFooter: {
    justifyContent: 'flex-end',
  },
  otherFooter: {
    justifyContent: 'flex-start',
  },
  messageTime: {
    fontSize: scaleFont(11),
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
    fontSize: scaleFont(16),
    maxHeight: 100,
    paddingVertical: Spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
