import { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { ReviewHeader, ExistingReplyCard } from './review-response-sections';
export type { ReviewHeaderProps, ExistingReplyCardProps } from './review-response-sections';

import { ReviewHeader, ExistingReplyCard } from './review-response-sections';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewResponseProps {
  reviewId: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
  existingReply?: string;
  maxCharacters?: number;
  onPostReply: (reviewId: string, reply: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEFAULT_MAX_CHARS = 500;

export function ReviewResponse({
  reviewId,
  reviewerName,
  rating,
  reviewText,
  reviewDate,
  existingReply,
  maxCharacters = DEFAULT_MAX_CHARS,
  onPostReply,
}: ReviewResponseProps) {
  const { colors: palette } = useTheme();

  const [replyText, setReplyText] = useState('');
  const hasExistingReply = typeof existingReply === 'string' && existingReply.length > 0;
  const charCount = replyText.length;
  const canSubmit = charCount > 0 && charCount <= maxCharacters;

  const handlePost = () => {
    if (!canSubmit) return;
    onPostReply(reviewId, replyText.trim());
    setReplyText('');
  };

  const formattedDate = (() => {
    try {
      return new Date(reviewDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return reviewDate;
    }
  })();

  return (
    <SurfaceCard style={styles.card}>
      <ReviewHeader reviewerName={reviewerName} rating={rating} formattedDate={formattedDate} palette={palette} />

      <ThemedText style={[Typography.body, { color: palette.text }]}>{reviewText}</ThemedText>

      {hasExistingReply ? (
        <ExistingReplyCard reply={existingReply!} palette={palette} />
      ) : (
        <View style={styles.replySection}>
          <TextInput
            style={[styles.input, { color: palette.text, backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}
            placeholder="Write a reply..."
            placeholderTextColor={palette.muted}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={maxCharacters}
            textAlignVertical="top"
          />
          <View style={styles.replyFooter}>
            <ThemedText style={[Typography.small, { color: charCount > maxCharacters ? palette.error : palette.muted }]}>
              {charCount}/{maxCharacters}
            </ThemedText>
            <Clickable
              disabled={!canSubmit}
              onPress={handlePost}
              style={[
                styles.postButton,
                { backgroundColor: canSubmit ? palette.tint : palette.border },
              ]}
            >
              <ThemedText style={[Typography.bodySemiBold, { color: canSubmit ? palette.onPrimary : palette.muted }]}>
                Post Reply
              </ThemedText>
            </Clickable>
          </View>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.sm, gap: Spacing.sm },
  replySection: { gap: Spacing.xs },
  input: {
    ...Typography.body,
    minHeight: 88,
    maxHeight: 160,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Components.input.paddingHorizontal,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  replyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postButton: { height: Components.button.height, paddingHorizontal: Spacing.md, borderRadius: Radii.button, alignItems: 'center', justifyContent: 'center' },
});
