import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { ChatMessage } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showSenderLabel?: boolean;
  onLongPress?: () => void;
}

function AttachmentCard({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors: palette, scheme } = useTheme();
  return (
    <View
      style={[styles.attachment, { borderColor: palette.border, backgroundColor: palette.surface }]}
      accessibilityRole="button"
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}>
      <IconSymbol name="doc.text" size={20} color={palette.icon} />
      <View style={styles.attachmentCopy}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        {subtitle ? <ThemedText style={[styles.attachmentSubtitle, { color: palette.muted }]}>{subtitle}</ThemedText> : null}
      </View>
      <IconSymbol name="chevron.right" size={18} color={palette.icon} />
    </View>
  );
}

function MessageBubbleComponent({ message, isOwnMessage, onLongPress, showSenderLabel }: MessageBubbleProps) {
  const { colors: palette, scheme } = useTheme();
  const bubbleColor = isOwnMessage
    ? scheme === 'dark'
      ? palette.secondary
      : palette.tint
    : palette.surface;
  const textColor = isOwnMessage
    ? scheme === 'dark'
      ? palette.onPrimary
      : palette.onPrimary
    : palette.text;

  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(400).springify()}
      style={[styles.wrapper, isOwnMessage ? styles.alignRight : styles.alignLeft]}
      onTouchEnd={(e) => {
        if (e.nativeEvent.touches.length === 0 && onLongPress) {
          // fallback gesture for long-press equivalent on web
          onLongPress();
        }
      }}
    >
      {showSenderLabel && message.senderName ? (
        <ThemedText style={[styles.senderLabel, { color: palette.muted }]}>{message.senderName}</ThemedText>
      ) : null}
      <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
        <ThemedText style={[styles.body, { color: textColor }]}>{message.body}</ThemedText>
        {message.attachments?.map((attachment) => (
          <AttachmentCard key={attachment.id} title={attachment.title} subtitle={attachment.subtitle} />
        ))}
      </View>
      <View style={[styles.footerRow, { alignSelf: isOwnMessage ? 'flex-end' : 'flex-start' }]}> 
        <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </ThemedText>
        {isOwnMessage && (
          <SurfaceCard style={[styles.statusPill, { backgroundColor: palette.surface }]}> 
            <ThemedText style={[styles.statusText, { color: palette.muted }]}>{message.status}</ThemedText>
          </SurfaceCard>
        )}
      </View>
    </Animated.View>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  senderLabel: {
    ...Typography.caption,
    fontWeight: '700',
    marginLeft: Spacing.md,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  body: {
    ...Typography.subheading,
  },
  timestamp: {
    ...Typography.caption,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.md,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  attachmentCopy: {
    flex: 1,
  },
  attachmentSubtitle: {
    ...Typography.caption,
    // color set inline for dynamic theming
    marginTop: Spacing.micro,
  },
});
