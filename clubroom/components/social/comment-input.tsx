import React, { memo, useCallback } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text?: string) => void;
  replyingTo?: string | null; // Author name being replied to
  onCancelReply?: () => void;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CommentInputInner({
  value,
  onChangeText,
  onSubmit,
  replyingTo,
  onCancelReply,
  placeholder = 'Add a comment...',
}: CommentInputProps) {
  const { colors: palette } = useTheme();

  const hasText = value.trim().length > 0;
  const maxLength = 2000;
  const warnThreshold = Math.floor(maxLength * 0.9);

  const handleSend = useCallback(() => {
    if (!hasText) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSubmit(value.trim());
  }, [hasText, onSubmit, value]);

  return (
    <View
      style={[styles.wrapper, { backgroundColor: palette.surface, borderTopColor: palette.border }]}
    >
      {/* Reply indicator */}
      {replyingTo && (
        <Row
          align="center"
          justify="between"
          style={[styles.replyIndicator, { backgroundColor: palette.background }]}
        >
          <ThemedText style={[styles.replyText, { color: palette.muted }]} numberOfLines={1}>
            Replying to <ThemedText style={styles.replyAuthor}>{replyingTo}</ThemedText>
          </ThemedText>
          <Clickable
            accessibilityLabel="Cancel reply"
            onPress={onCancelReply}
            hitSlop={10}
            style={styles.cancelReply}
          >
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Clickable>
        </Row>
      )}

      {/* Input row */}
      <Row align="flex-end" gap="xs">
        <TextInput
          style={[
            styles.input,
            {
              color: palette.text,
              backgroundColor: palette.background,
              borderColor: palette.border,
            },
          ]}
          placeholder={replyingTo ? `Reply to ${replyingTo}...` : placeholder}
          placeholderTextColor={palette.muted}
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={maxLength}
          returnKeyType="default"
          accessibilityLabel={replyingTo ? `Reply to ${replyingTo}` : 'Add a comment'}
        />
        <Clickable
          onPress={handleSend}
          disabled={!hasText}
          style={[
            styles.sendButton,
            {
              backgroundColor: hasText ? palette.tint : palette.border,
            },
          ]}
          hitSlop={8}
          accessibilityLabel="Send comment"
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasText }}
        >
          <Ionicons name="arrow-up" size={18} color={palette.onPrimary} />
        </Clickable>
      </Row>
      <ThemedText
        style={[
          Typography.caption,
          {
            color: value.length > warnThreshold ? palette.error : palette.muted,
            textAlign: 'right',
            marginTop: Spacing.xxs,
          },
        ]}
      >
        {value.length}/{maxLength}
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  replyIndicator: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    marginBottom: Spacing.xs,
  },
  replyText: {
    ...Typography.caption,
    flex: 1,
  },
  replyAuthor: {
    ...Typography.caption,
    fontWeight: '600',
  },
  cancelReply: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // inputRow replaced by Row primitive
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    maxHeight: 100,
    ...Typography.bodySmall,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const CommentInput = memo(CommentInputInner);
export default CommentInput;
