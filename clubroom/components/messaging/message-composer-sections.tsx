import React, { memo } from 'react';
import { TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import type { ThemeColors } from '@/hooks/useTheme';
import { styles } from './message-composer-section-styles';
import type { Attachment } from '@/constants/types';

export function getAttachmentIcon(type: Attachment['type']): string {
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
}

interface ReplyPreviewProps {
  replyingTo: { id: string; preview: string };
  onCancelReply?: () => void;
  palette: ThemeColors;
}

export const ReplyPreview = memo(function ReplyPreview({
  replyingTo,
  onCancelReply,
  palette,
}: ReplyPreviewProps) {
  return (
    <Row align="center" gap="sm" style={[styles.replyPreview, { backgroundColor: palette.surface, borderLeftColor: palette.tint }]}>
      <View style={styles.replyContent}>
        <ThemedText style={[styles.replyLabel, { color: palette.tint }]}>
          Replying to
        </ThemedText>
        <ThemedText style={styles.replyText} numberOfLines={1}>
          {replyingTo.preview}
        </ThemedText>
      </View>
      <Clickable accessibilityLabel="Close" onPress={onCancelReply}>
        <Ionicons name="close" size={20} color={palette.muted} />
      </Clickable>
    </Row>
  );
});

interface AttachmentsPreviewProps {
  attachments: Attachment[];
  onRemoveAttachment?: (index: number) => void;
  palette: ThemeColors;
}

export const AttachmentsPreview = memo(function AttachmentsPreview({
  attachments,
  onRemoveAttachment,
  palette,
}: AttachmentsPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <Row gap="xs" wrap style={styles.attachmentsRow}>
      {attachments.map((attachment, index) => (
        <Row
          key={index}
          align="center"
          gap="xs"
          style={[styles.attachmentPreview, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons
            name={getAttachmentIcon(attachment.type) as keyof typeof Ionicons.glyphMap}
            size={16}
            color={palette.tint}
          />
          <ThemedText style={styles.attachmentName} numberOfLines={1}>
            {attachment.name || `File ${index + 1}`}
          </ThemedText>
          {onRemoveAttachment && (
            <Clickable accessibilityLabel="Remove attachment" onPress={() => onRemoveAttachment(index)}>
              <Ionicons name="close-circle" size={16} color={palette.muted} />
            </Clickable>
          )}
        </Row>
      ))}
    </Row>
  );
});

interface ComposerInputRowProps {
  inputRef: React.RefObject<TextInput | null>;
  text: string;
  isExpanded: boolean;
  canSend: boolean;
  disabled: boolean;
  placeholder: string;
  scheme: 'light' | 'dark';
  onTextChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSend: () => void;
  onAttachPress: () => void;
  onCameraPress?: () => void;
  onVoicePress?: () => void;
  palette: ThemeColors;
}

export const ComposerInputRow = memo(function ComposerInputRow({
  inputRef,
  text,
  isExpanded,
  canSend,
  disabled,
  placeholder,
  scheme,
  onTextChange,
  onFocus,
  onBlur,
  onSend,
  onAttachPress,
  onCameraPress,
  onVoicePress,
  palette,
}: ComposerInputRowProps) {
  return (
    <Row align="flex-end" gap="xs" style={[styles.composerRow, { borderColor: palette.border, backgroundColor: palette.card }]}>
      {/* Action Buttons */}
      <Row align="center" gap="xxs" style={styles.actionsRow}>
        <Clickable
          onPress={onAttachPress}
          accessibilityLabel="Attach file"
          style={styles.actionButton}
          hitSlop={8}
        >
          <Ionicons name="attach" size={22} color={palette.icon} />
        </Clickable>
        {onCameraPress && (
          <Clickable
            onPress={onCameraPress}
            accessibilityLabel="Open camera"
            style={styles.actionButton}
            hitSlop={8}
          >
            <Ionicons name="camera-outline" size={22} color={palette.icon} />
          </Clickable>
        )}
      </Row>

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
          onChangeText={onTextChange}
          multiline
          editable={!disabled}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>

      {/* Send/Voice Button */}
      {canSend ? (
        <Clickable
          onPress={onSend}
          accessibilityLabel="Send message"
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
            color={scheme === 'light' ? palette.onPrimary : palette.text}
          />
        </Clickable>
      ) : onVoicePress ? (
        <Clickable
          onPress={onVoicePress}
          accessibilityLabel="Record voice message"
          style={[styles.voiceButton, { borderColor: palette.border }]}
        >
          <Ionicons name="mic" size={20} color={palette.icon} />
        </Clickable>
      ) : (
        <View style={styles.sendPlaceholder} />
      )}
    </Row>
  );
});

interface QuickActionsBarProps {
  actions: { label: string; icon?: string; onPress: () => void }[];
  palette: ThemeColors;
}

export const QuickActionsBarInner = memo(function QuickActionsBarInner({
  actions,
  palette,
}: QuickActionsBarProps) {
  return (
    <Row gap="xs" wrap style={styles.quickActionsContainer}>
      {actions.map((action, index) => (
        <Clickable
          key={index}
          onPress={action.onPress}
          style={[styles.quickAction, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Row align="center" gap="xs">
            {action.icon && (
              <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={14} color={palette.tint} />
            )}
            <ThemedText style={[styles.quickActionText, { color: palette.text }]}>
              {action.label}
            </ThemedText>
          </Row>
        </Clickable>
      ))}
    </Row>
  );
});

export { styles };
