import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { ChatMessage } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  onLongPress?: () => void;
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

function MessageBubbleComponent({ message, isOwnMessage, onLongPress }: MessageBubbleProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const bubbleColor = isOwnMessage
    ? scheme === 'dark'
      ? palette.secondary
      : palette.tint
    : palette.surface;
  const textColor = isOwnMessage
    ? scheme === 'dark'
      ? '#FFFFFF'
      : '#FFFFFF'
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.md,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  statusText: {
    fontSize: 11,
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
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
