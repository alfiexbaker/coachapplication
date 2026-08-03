import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, TextInput, View } from 'react-native';
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
  onSubmit: (text: string) => void;
  replyingTo?: string | null; // Author name being replied to
  onCancelReply?: () => void;
  placeholder?: string;
  submitting?: boolean;
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
  placeholder = 'Comment',
  submitting = false,
}: CommentInputProps) {
  const { colors: palette } = useTheme();

  const hasText = value.trim().length > 0;
  const maxLength = 2000;
  const warnThreshold = Math.floor(maxLength * 0.9);

  const handleSend = () => {
    if (!hasText || submitting) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSubmit(value.trim());
  };

  return (
    <View
      style={[styles.wrapper, { backgroundColor: palette.surface, borderTopColor: palette.border }]}
    >
      {replyingTo && (
        <Row align="center" justify="between" style={styles.replyIndicator}>
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
          editable={!submitting}
          returnKeyType="default"
          accessibilityLabel={replyingTo ? `Reply to ${replyingTo}` : 'Add a comment'}
          accessibilityState={{ disabled: submitting }}
        />
        <Clickable
          onPress={handleSend}
          disabled={!hasText || submitting}
          style={[
            styles.sendButton,
            {
              backgroundColor: hasText && !submitting ? palette.tint : palette.border,
            },
          ]}
          hitSlop={8}
          accessibilityLabel="Send comment"
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasText || submitting, busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={palette.onPrimary} />
          ) : (
            <Ionicons name="arrow-up" size={18} color={palette.onPrimary} />
          )}
        </Clickable>
      </Row>
      {value.length > warnThreshold ? (
        <ThemedText style={[styles.characterCount, { color: palette.error }]}>
          {value.length}/{maxLength}
        </ThemedText>
      ) : null}
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
    minHeight: 44,
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
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // inputRow replaced by Row primitive
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.lg,
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
  characterCount: {
    ...Typography.caption,
    textAlign: 'right',
    marginTop: Spacing.xxs,
  },
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const CommentInput = CommentInputInner;
export default CommentInput;
