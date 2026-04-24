import React from 'react';
import { ScrollView, StyleSheet, View, type DimensionValue } from 'react-native';

import type { ChatThreadSummary } from '@/constants/types';
import { Row } from '@/components/primitives/row';
import { Skeleton, SkeletonCircle, SkeletonCluster, SkeletonPill, SkeletonText } from '@/components/ui/skeleton';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ChatPostingAsSelector, ChatSafetyBanner, ChatScreenHeader } from './chat-screen-sections';
import { MessagesSearchBar } from './messages-search-bar';
import { MessagesViewToggle } from './messages-view-toggle';

function ConversationRowSkeleton({
  index,
  showUnread = false,
}: {
  index: number;
  showUnread?: boolean;
}) {
  return (
    <View style={styles.conversationRow}>
      <Row align="center" gap="md">
        <SkeletonCircle
          size={48}
          accessibilityLabel={`Loading conversation avatar ${index + 1}`}
        />
        <View style={styles.flex}>
          <View style={styles.rowTop}>
            <Skeleton
              width="46%"
              height={18}
              accessibilityLabel={`Loading conversation title ${index + 1}`}
            />
            <Skeleton
              width={44}
              height={10}
              accessibilityLabel={`Loading conversation time ${index + 1}`}
            />
          </View>
          <View style={styles.rowMiddle}>
            <Skeleton
              width="32%"
              height={12}
              accessibilityLabel={`Loading conversation subtitle ${index + 1}`}
            />
            {showUnread ? (
              <SkeletonPill
                width={20}
                height={20}
                accessibilityLabel={`Loading unread badge ${index + 1}`}
              />
            ) : (
              <Skeleton width={12} height={12} accessibilityLabel={`Loading conversation status ${index + 1}`} />
            )}
          </View>
          <Skeleton
            width={index % 2 === 0 ? '74%' : '58%'}
            height={12}
            accessibilityLabel={`Loading conversation preview ${index + 1}`}
          />
        </View>
      </Row>
    </View>
  );
}

export function MessagesScreenLoadingState() {
  return (
    <View pointerEvents="none">
      <SkeletonCluster
        gap={Spacing.sm}
        style={styles.messagesScreen}
        accessibilityLabel="Loading conversations"
      >
        <MessagesSearchBar value="" onChangeText={() => {}} />
        <MessagesViewToggle viewMode="direct" onViewModeChange={() => {}} />
        <View style={styles.rows}>
          {Array.from({ length: 5 }).map((_, index) => (
            <ConversationRowSkeleton key={index} index={index} showUnread={index === 1 || index === 3} />
          ))}
        </View>
      </SkeletonCluster>
    </View>
  );
}

function ChatMessageSkeleton({
  align,
  bubbleWidth,
  showSenderLabel = false,
  showStatus = false,
  showAttachment = false,
}: {
  align: 'left' | 'right';
  bubbleWidth: DimensionValue;
  showSenderLabel?: boolean;
  showStatus?: boolean;
  showAttachment?: boolean;
}) {
  const alignRight = align === 'right';
  const { colors: palette } = useTheme();
  const bubbleBackground = alignRight ? withAlpha(palette.tint, 0.16) : palette.surface;
  const attachmentBackground = withAlpha(palette.surface, 0.8);

  return (
    <View style={[styles.messageBlock, alignRight ? styles.messageBlockRight : styles.messageBlockLeft]}>
      {showSenderLabel ? (
        <Skeleton width={68} height={10} accessibilityLabel="Loading sender label" />
      ) : null}
      <View style={[styles.messageBubble, { width: bubbleWidth, backgroundColor: bubbleBackground }]}>
        <SkeletonText
          lines={showAttachment ? 2 : 3}
          widths={showAttachment ? ['100%', '76%'] : ['100%', '82%', '54%']}
          lineHeight={14}
          accessibilityLabel="Loading conversation message"
        />
        {showAttachment ? (
          <View style={[styles.attachmentRow, { backgroundColor: attachmentBackground }]}>
            <SkeletonCircle size={18} accessibilityLabel="Loading attachment icon" />
            <View style={styles.flex}>
              <Skeleton width="62%" height={12} accessibilityLabel="Loading attachment title" />
              <Skeleton width="48%" height={10} accessibilityLabel="Loading attachment subtitle" />
            </View>
            <SkeletonCircle size={16} accessibilityLabel="Loading attachment action" />
          </View>
        ) : null}
      </View>
      <View style={[styles.messageMeta, alignRight ? styles.messageMetaRight : styles.messageMetaLeft]}>
        <Skeleton width={42} height={10} accessibilityLabel="Loading message time" />
        {showStatus ? (
          <SkeletonPill width={54} height={18} accessibilityLabel="Loading message status" />
        ) : null}
      </View>
    </View>
  );
}

function ChatHeaderSkeleton() {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.chatHeader, { borderBottomColor: palette.border }]}>
      <SkeletonCircle size={40} accessibilityLabel="Loading back button" />
      <View style={styles.flex}>
        <Skeleton width="44%" height={22} accessibilityLabel="Loading conversation title" />
        <Skeleton width="58%" height={12} accessibilityLabel="Loading conversation subtitle" />
      </View>
      <SkeletonCircle size={36} accessibilityLabel="Loading conversation menu" />
    </View>
  );
}

export function ChatScreenLoadingState({
  previewThread,
}: {
  previewThread?: ChatThreadSummary | null;
}) {
  const { colors: palette } = useTheme();
  const showPostingAs =
    previewThread?.kind === 'group' && (previewThread.postingAsOptions?.length ?? 0) > 0;

  return (
    <View style={styles.chatScreen} pointerEvents="none" accessibilityLabel="Loading conversation">
      {previewThread ? (
        <ChatScreenHeader
          colors={palette}
          thread={previewThread}
          onBack={() => {}}
          onOpenMenu={() => {}}
        />
      ) : (
        <ChatHeaderSkeleton />
      )}

      <ChatSafetyBanner colors={palette} showSafetyBanner onDismiss={() => {}} />

      {showPostingAs && previewThread ? (
        <ChatPostingAsSelector
          colors={palette}
          thread={previewThread}
          postingAs={previewThread.postingAsOptions?.[0]}
          onSelect={() => {}}
        />
      ) : null}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.chatContent}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      >
        <SkeletonCluster gap={Spacing.sm} accessibilityLabel="Loading message transcript">
          <ChatMessageSkeleton
            align="left"
            bubbleWidth="64%"
            showSenderLabel={previewThread?.kind === 'group'}
          />
          <ChatMessageSkeleton align="right" bubbleWidth="56%" showStatus />
          <ChatMessageSkeleton
            align="left"
            bubbleWidth="78%"
            showSenderLabel={previewThread?.kind === 'group'}
            showAttachment
          />
          <ChatMessageSkeleton align="right" bubbleWidth="48%" showStatus />
        </SkeletonCluster>
      </ScrollView>

      <View style={[styles.chatInput, { borderTopColor: palette.border }]}>
        <View style={[styles.chatInputShell, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <SkeletonCircle size={36} accessibilityLabel="Loading attachment action" />
          <View style={styles.flex}>
            <Skeleton
              height={20}
              radius={Radii.md}
              accessibilityLabel="Loading message composer"
            />
          </View>
          <SkeletonCircle size={40} accessibilityLabel="Loading send action" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  chatContent: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  chatInput: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.md,
  },
  chatInputShell: {
    alignItems: 'flex-end',
    borderRadius: Radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  chatScreen: {
    flex: 1,
  },
  conversationRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  messageBlock: {
    gap: Spacing.xs,
    maxWidth: '100%',
  },
  messageBlockLeft: {
    alignItems: 'flex-start',
  },
  messageBlockRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    borderRadius: Radii.lg,
    gap: Spacing.sm,
    maxWidth: '80%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  messageMeta: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginHorizontal: Spacing.md,
  },
  messageMetaLeft: {
    alignSelf: 'flex-start',
  },
  messageMetaRight: {
    alignSelf: 'flex-end',
  },
  messagesScreen: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  rowMiddle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  rows: {
    gap: Spacing.xxs,
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
});
