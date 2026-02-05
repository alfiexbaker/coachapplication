import { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewResponseProps {
  /** Unique review identifier. */
  reviewId: string;
  /** Reviewer display name. */
  reviewerName: string;
  /** Star rating (1-5). */
  rating: number;
  /** Review body text. */
  reviewText: string;
  /** ISO date string for the review. */
  reviewDate: string;
  /** Existing coach reply (if already responded). */
  existingReply?: string;
  /** Maximum character count for the reply. */
  maxCharacters?: number;
  /** Called when the coach posts a reply. */
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [replyText, setReplyText] = useState('');
  const hasExistingReply = typeof existingReply === 'string' && existingReply.length > 0;
  const charCount = replyText.length;
  const canSubmit = charCount > 0 && charCount <= maxCharacters;

  const handlePost = () => {
    if (!canSubmit) return;
    onPostReply(reviewId, replyText.trim());
    setReplyText('');
  };

  // Format date
  const formattedDate = (() => {
    try {
      return new Date(reviewDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return reviewDate;
    }
  })();

  return (
    <SurfaceCard style={styles.card}>
      {/* Review header */}
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: palette.tint + '18' }]}>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
              {reviewerName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.reviewerMeta}>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
              {reviewerName}
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              {formattedDate}
            </ThemedText>
          </View>
        </View>
        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={rating >= star ? 'star' : 'star-outline'}
              size={Components.icon.sm}
              color={rating >= star ? palette.warning : palette.border}
            />
          ))}
        </View>
      </View>

      {/* Review text */}
      <ThemedText style={[Typography.body, { color: palette.text }]}>
        {reviewText}
      </ThemedText>

      {/* Existing reply or reply input */}
      {hasExistingReply ? (
        <View style={[styles.existingReply, { backgroundColor: palette.surfaceSecondary }]}>
          <View style={styles.replyHeader}>
            <Ionicons name="return-down-forward" size={Components.icon.sm} color={palette.muted} />
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>
              Your Reply
            </ThemedText>
          </View>
          <ThemedText style={[Typography.body, { color: palette.text }]}>
            {existingReply}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.replySection}>
          <TextInput
            style={[
              styles.input,
              {
                color: palette.text,
                backgroundColor: palette.surfaceSecondary,
                borderColor: palette.border,
              },
            ]}
            placeholder="Write a reply..."
            placeholderTextColor={palette.muted}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={maxCharacters}
            textAlignVertical="top"
          />

          <View style={styles.replyFooter}>
            <ThemedText
              style={[
                Typography.small,
                {
                  color: charCount > maxCharacters ? palette.error : palette.muted,
                },
              ]}
            >
              {charCount}/{maxCharacters}
            </ThemedText>

            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={handlePost}
              style={({ pressed }) => [
                styles.postButton,
                {
                  backgroundColor: canSubmit
                    ? pressed
                      ? palette.tintPressed
                      : palette.tint
                    : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  Typography.bodySemiBold,
                  { color: canSubmit ? '#FFFFFF' : palette.muted },
                ]}
              >
                Post Reply
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </SurfaceCard>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatarPlaceholder: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerMeta: {
    gap: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  existingReply: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: Spacing.xs,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  replySection: {
    gap: Spacing.xs,
  },
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
  replyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postButton: {
    height: Components.button.height,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
