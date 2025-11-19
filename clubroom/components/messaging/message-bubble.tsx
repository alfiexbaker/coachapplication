import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

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
  const bubbleColor = isOwnMessage ? palette.tint : palette.card;
  const textColor = isOwnMessage ? '#FFFFFF' : palette.text;

  return (
    <View style={[styles.wrapper, isOwnMessage ? styles.alignRight : styles.alignLeft]}>
      <SurfaceCard style={[styles.bubble, { backgroundColor: bubbleColor }]} tactile={false} animateElevation={false}>
        <ThemedText style={[styles.body, { color: textColor }]}>{message.body}</ThemedText>
        {message.attachments?.map((attachment) => (
          <AttachmentCard key={attachment.id} title={attachment.title} subtitle={attachment.subtitle} />
        ))}
        <View style={styles.metaRow}>
          <ThemedText style={[styles.timestamp, { color: isOwnMessage ? '#E0ECFF' : palette.muted }]}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>
          {isOwnMessage ? (
            <IconSymbol
              name={message.status === 'seen' ? 'checkmark.seal.fill' : 'paperplane.fill'}
              size={14}
              color={isOwnMessage ? '#E0ECFF' : palette.icon}
            />
          ) : null}
        </View>
      </SurfaceCard>
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '90%',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timestamp: {
    fontSize: 12,
    letterSpacing: 0.2,
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
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
});
