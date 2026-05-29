import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { emitTyped, ServiceEvents } from '@/services/event-bus';

type ChatInputProps = {
  onAttach?: () => void;
  onSend?: (message: string) => void;
  disabled?: boolean;
  initialValue?: string;
  threadId?: string;
  currentUserId?: string;
  currentUserName?: string;
};

export function ChatInput({
  onAttach,
  onSend,
  disabled,
  initialValue,
  threadId,
  currentUserId,
  currentUserName,
}: ChatInputProps) {
  const { colors: palette, scheme } = useTheme();
  const [value, setValue] = useState(initialValue ?? '');
  const isTypingRef = useRef(false);
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeholderColor = palette.muted;
  const canAttach = Boolean(onAttach) && !disabled;

  const emitStoppedTyping = () => {
    if (!threadId || !currentUserId) return;
    emitTyped(ServiceEvents.USER_STOPPED_TYPING, {
      threadId,
      userId: currentUserId,
    });
  };

  const clearStopTypingTimer = () => {
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current);
      stopTypingTimerRef.current = null;
    }
  };

  const scheduleStopTyping = () => {
    clearStopTypingTimer();
    stopTypingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitStoppedTyping();
      stopTypingTimerRef.current = null;
    }, 2000);
  };

  const handleTextChange = (text: string) => {
    setValue(text);

    if (!threadId || !currentUserId) return;

    if (text.trim().length === 0) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emitStoppedTyping();
      }
      clearStopTypingTimer();
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyped(ServiceEvents.USER_TYPING, {
        threadId,
        userId: currentUserId,
        userName: currentUserName || 'Someone',
      });
    }

    scheduleStopTyping();
  };

  useEffect(
    () => () => {
      if (stopTypingTimerRef.current) {
        clearTimeout(stopTypingTimerRef.current);
        stopTypingTimerRef.current = null;
      }
      if (isTypingRef.current && threadId && currentUserId) {
        emitTyped(ServiceEvents.USER_STOPPED_TYPING, {
          threadId,
          userId: currentUserId,
        });
      }
    },
    [threadId, currentUserId],
  );

  return (
    <Row
      align="flex-end"
      gap="sm"
      style={[styles.container, { borderColor: palette.border, backgroundColor: palette.card }]}
      accessibilityRole="none"
    >
      <Clickable
        accessibilityRole="button"
        accessibilityLabel="Attach media or file"
        accessibilityState={{ disabled: !canAttach }}
        style={[styles.iconButton, !canAttach && { opacity: 0.45 }]}
        onPress={canAttach ? onAttach : undefined}
        disabled={!canAttach}
      >
        <IconSymbol name="paperclip" size={22} color={palette.icon} />
      </Clickable>
      <TextInput
        style={[styles.input, { color: palette.text }]}
        placeholder="Drop a note, media, or PDF"
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={handleTextChange}
        multiline
        editable={!disabled}
        maxLength={500}
      />
      <Clickable
        accessibilityRole="button"
        accessibilityLabel={value ? 'Send message' : 'Record voice message'}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: value
              ? pressed
                ? palette.tintPressed
                : palette.tint
              : palette.surface,
            borderColor: value ? 'transparent' : palette.border,
          },
        ]}
        disabled={!value || disabled}
        accessibilityState={{ disabled: !value || Boolean(disabled) }}
        onPress={() => {
          const trimmed = value.trim();
          if (!trimmed || disabled) return;
          onSend?.(trimmed);
          clearStopTypingTimer();
          if (isTypingRef.current) {
            isTypingRef.current = false;
            emitStoppedTyping();
          }
          setValue('');
        }}
      >
        {value ? (
          <IconSymbol
            name="paperplane.fill"
            size={18}
            color={scheme === 'light' ? palette.onPrimary : palette.text}
          />
        ) : (
          <IconSymbol name="mic.fill" size={20} color={palette.icon} />
        )}
      </Clickable>
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
  },
  iconButton: {
    height: 36,
    width: 36,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: { ...Typography.subheading, flex: 1, paddingVertical: Spacing.xs },
  sendButton: {
    height: 40,
    width: 40,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
