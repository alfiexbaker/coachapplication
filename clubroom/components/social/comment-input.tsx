import React, { memo, useCallback } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
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

  const handleSend = useCallback(() => {
    if (!hasText) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSubmit();
  }, [value, onSubmit]);

  return (
    <View style={[styles.wrapper, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
      {/* Reply indicator */}
      {replyingTo && (
        <View style={[styles.replyIndicator, { backgroundColor: palette.background }]}>
          <ThemedText style={[styles.replyText, { color: palette.muted }]} numberOfLines={1}>
            Replying to <ThemedText style={styles.replyAuthor}>{replyingTo}</ThemedText>
          </ThemedText>
          <Pressable
            onPress={onCancelReply}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.cancelReply}
          >
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Pressable>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
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
          maxLength={2000}
          returnKeyType="default"
        />
        <Pressable
          onPress={handleSend}
          disabled={!hasText}
          style={[
            styles.sendButton,
            {
              backgroundColor: hasText ? palette.tint : palette.border,
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={palette.onPrimary}
          />
        </Pressable>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
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
