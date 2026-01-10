import { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, Keyboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Attachment } from '@/constants/types';

interface MessageComposerProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onAttachPress: () => void;
  onCameraPress?: () => void;
  onVoicePress?: () => void;
  attachments?: Attachment[];
  onRemoveAttachment?: (index: number) => void;
  placeholder?: string;
  disabled?: boolean;
  replyingTo?: { id: string; preview: string } | null;
  onCancelReply?: () => void;
}

export function MessageComposer({
  onSend,
  onAttachPress,
  onCameraPress,
  onVoicePress,
  attachments = [],
  onRemoveAttachment,
  placeholder = 'Type a message...',
  disabled = false,
  replyingTo,
  onCancelReply,
}: MessageComposerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const canSend = text.trim().length > 0 || attachments.length > 0;

  const handleSend = () => {
    if (!canSend || disabled) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(text.trim(), attachments);
    setText('');
    setIsExpanded(false);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    // Auto-expand for multi-line
    setIsExpanded(value.includes('\n') || value.length > 100);
  };

  const getAttachmentIcon = (type: Attachment['type']) => {
    switch (type) {
      case 'IMAGE':
        return 'image';
      case 'VIDEO':
        return 'videocam';
      case 'DOCUMENT':
        return 'document';
      default:
        return 'attach';
    }
  };

  return (
    <View style={styles.container}>
      {/* Reply Preview */}
      {replyingTo && (
        <View style={[styles.replyPreview, { backgroundColor: palette.surface, borderLeftColor: palette.tint }]}>
          <View style={styles.replyContent}>
            <ThemedText style={[styles.replyLabel, { color: palette.tint }]}>
              Replying to
            </ThemedText>
            <ThemedText style={styles.replyText} numberOfLines={1}>
              {replyingTo.preview}
            </ThemedText>
          </View>
          <Clickable onPress={onCancelReply}>
            <Ionicons name="close" size={20} color={palette.muted} />
          </Clickable>
        </View>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <View style={styles.attachmentsRow}>
          {attachments.map((attachment, index) => (
            <View
              key={index}
              style={[styles.attachmentPreview, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Ionicons
                name={getAttachmentIcon(attachment.type)}
                size={16}
                color={palette.tint}
              />
              <ThemedText style={styles.attachmentName} numberOfLines={1}>
                {attachment.name || `File ${index + 1}`}
              </ThemedText>
              {onRemoveAttachment && (
                <Clickable onPress={() => onRemoveAttachment(index)}>
                  <Ionicons name="close-circle" size={16} color={palette.muted} />
                </Clickable>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Composer Row */}
      <View style={[styles.composerRow, { borderColor: palette.border, backgroundColor: palette.card }]}>
        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <Clickable
            onPress={onAttachPress}
            style={styles.actionButton}
            hitSlop={8}
          >
            <Ionicons name="attach" size={22} color={palette.icon} />
          </Clickable>

          {onCameraPress && (
            <Clickable
              onPress={onCameraPress}
              style={styles.actionButton}
              hitSlop={8}
            >
              <Ionicons name="camera-outline" size={22} color={palette.icon} />
            </Clickable>
          )}
        </View>

        {/* Text Input */}
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: palette.text,
                maxHeight: isExpanded ? 120 : 40,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={palette.muted}
            value={text}
            onChangeText={handleTextChange}
            multiline
            editable={!disabled}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => !text && setIsExpanded(false)}
          />
        </View>

        {/* Send/Voice Button */}
        {canSend ? (
          <Clickable
            onPress={handleSend}
            disabled={disabled}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: pressed ? palette.tintPressed : palette.tint,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons
              name="send"
              size={18}
              color={scheme === 'light' ? '#FFFFFF' : '#000000'}
            />
          </Clickable>
        ) : onVoicePress ? (
          <Clickable
            onPress={onVoicePress}
            style={[styles.voiceButton, { borderColor: palette.border }]}
          >
            <Ionicons name="mic" size={20} color={palette.icon} />
          </Clickable>
        ) : (
          <View style={styles.sendPlaceholder} />
        )}
      </View>
    </View>
  );
}

// Quick actions bar for common responses
interface QuickActionsBarProps {
  actions: { label: string; icon?: string; onPress: () => void }[];
}

export function QuickActionsBar({ actions }: QuickActionsBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.quickActionsContainer}>
      {actions.map((action, index) => (
        <Clickable
          key={index}
          onPress={action.onPress}
          style={[styles.quickAction, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          {action.icon && (
            <Ionicons name={action.icon as any} size={14} color={palette.tint} />
          )}
          <ThemedText style={[styles.quickActionText, { color: palette.text }]}>
            {action.label}
          </ThemedText>
        </Clickable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderRadius: Radii.sm,
    borderLeftWidth: 3,
    gap: Spacing.sm,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyText: {
    fontSize: 13,
    marginTop: 2,
  },
  attachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    maxWidth: 150,
  },
  attachmentName: {
    flex: 1,
    fontSize: 12,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendPlaceholder: {
    width: 40,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
