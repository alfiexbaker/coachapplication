/**
 * Extracted sub-components for MessageComposer.
 *
 * ReplyPreview — reply-to banner with cancel button.
 * AttachmentsPreview — row of attachment chips with remove.
 * ComposerInputRow — text input + action buttons + send/voice.
 * QuickActionsBar — quick response buttons.
 */

import React, { memo } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Attachment } from '@/constants/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── ReplyPreview ────────────────────────────────────────────────────────────

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

// ─── AttachmentsPreview ──────────────────────────────────────────────────────

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

// ─── ComposerInputRow ────────────────────────────────────────────────────────

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
        <Clickable onPress={onAttachPress} style={styles.actionButton} hitSlop={8}>
          <Ionicons name="attach" size={22} color={palette.icon} />
        </Clickable>
        {onCameraPress && (
          <Clickable onPress={onCameraPress} style={styles.actionButton} hitSlop={8}>
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

// ─── QuickActionsBar ─────────────────────────────────────────────────────────

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

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  replyPreview: {
    padding: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderRadius: Radii.sm,
    borderLeftWidth: 3,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyText: { ...Typography.small, marginTop: Spacing.micro },
  attachmentsRow: {
    paddingHorizontal: Spacing.md,
  },
  attachmentPreview: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    maxWidth: 150,
  },
  attachmentName: { ...Typography.caption, flex: 1 },
  composerRow: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  actionsRow: {
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
    ...Typography.subheading,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    paddingHorizontal: Spacing.xxs,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendPlaceholder: {
    width: 40,
  },
  quickActionsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickAction: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  quickActionText: { ...Typography.smallSemiBold },
});
