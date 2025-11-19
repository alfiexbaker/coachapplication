import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, SlideInLeft, SlideInRight } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { ChatMessage } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

function AttachmentCard({ title, subtitle }: { title: string; subtitle?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View
      style={[styles.attachment, { borderColor: palette.border, backgroundColor: palette.surface }]}
      accessibilityRole="button"
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}>
      <IconSymbol name="doc.text" size={20} color={palette.icon} />
      <View style={styles.attachmentCopy}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        {subtitle ? <ThemedText style={styles.attachmentSubtitle}>{subtitle}</ThemedText> : null}
      </View>
      <IconSymbol name="chevron.right" size={18} color={palette.icon} />
    </View>
  );
}

function MessageBubbleComponent({ message, isOwnMessage }: MessageBubbleProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const bubbleColor = isOwnMessage ? palette.tint : palette.surface;
  const textColor = isOwnMessage ? '#FFFFFF' : palette.text;

  return (
    <Animated.View
      entering={isOwnMessage ? SlideInRight.springify() : SlideInLeft.springify()}
      style={[styles.wrapper, isOwnMessage ? styles.alignRight : styles.alignLeft]}
    >
      <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
        <ThemedText style={[styles.body, { color: textColor }]}>{message.body}</ThemedText>
        {message.attachments?.map((attachment) => (
          <AttachmentCard key={attachment.id} title={attachment.title} subtitle={attachment.subtitle} />
        ))}
      </View>
      <ThemedText style={[styles.timestamp, { alignSelf: isOwnMessage ? 'flex-end' : 'flex-start' }]}>
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </ThemedText>
    </Animated.View>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
    gap: 2,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  body: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.5,
    marginHorizontal: Spacing.sm,
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
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
