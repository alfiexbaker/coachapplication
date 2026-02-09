import { useState, useRef, useCallback } from 'react';
import { View, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import type { Attachment } from '@/constants/types';

import {
  ReplyPreview,
  AttachmentsPreview,
  ComposerInputRow,
  QuickActionsBarInner,
  styles,
} from './message-composer-sections';

// ─── Types ──────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────

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
  const { colors: palette, scheme } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const canSend = text.trim().length > 0 || attachments.length > 0;

  const handleSend = useCallback(() => {
    if (!canSend || disabled) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(text.trim(), attachments);
    setText('');
    setIsExpanded(false);
  }, [canSend, disabled, text, attachments, onSend]);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    setIsExpanded(value.includes('\n') || value.length > 100);
  }, []);

  const handleFocus = useCallback(() => setIsExpanded(true), []);
  const handleBlur = useCallback(() => {
    if (!text) setIsExpanded(false);
  }, [text]);

  return (
    <View style={styles.container}>
      {replyingTo && (
        <ReplyPreview
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
          palette={palette}
        />
      )}

      <AttachmentsPreview
        attachments={attachments}
        onRemoveAttachment={onRemoveAttachment}
        palette={palette}
      />

      <ComposerInputRow
        inputRef={inputRef}
        text={text}
        isExpanded={isExpanded}
        canSend={canSend}
        disabled={disabled}
        placeholder={placeholder}
        scheme={scheme}
        onTextChange={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSend={handleSend}
        onAttachPress={onAttachPress}
        onCameraPress={onCameraPress}
        onVoicePress={onVoicePress}
        palette={palette}
      />
    </View>
  );
}

// Backward-compat wrapper
export function QuickActionsBar({ actions }: { actions: { label: string; icon?: string; onPress: () => void }[] }) {
  const { colors: palette } = useTheme();
  return <QuickActionsBarInner actions={actions} palette={palette} />;
}
