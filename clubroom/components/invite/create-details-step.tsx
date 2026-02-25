/**
 * CreateDetailsStep — Additional details step for the create invite wizard.
 *
 * Cover image picker, notes text area, and price input.
 */

import React, { memo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Column } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

export interface CreateDetailsStepProps {
  notes: string;
  price: string;
  coverImageUri: string | null;
  onChangeNotes: (notes: string) => void;
  onChangePrice: (price: string) => void;
  onPickCoverImage: () => void;
  onRemoveCoverImage: () => void;
  colors: ThemeColors;
}

export const CreateDetailsStep = memo(function CreateDetailsStep({
  notes,
  price,
  coverImageUri,
  onChangeNotes,
  onChangePrice,
  onPickCoverImage,
  onRemoveCoverImage,
  colors,
}: CreateDetailsStepProps) {
  const priceError = (() => {
    const raw = price.trim();
    if (!raw) return null;
    if (!/^\d+$/.test(raw)) return 'Price must be between £10 and £200 (whole pounds only)';
    const parsed = Number.parseInt(raw, 10);
    if (parsed < 10 || parsed > 200) return 'Price must be between £10 and £200 (whole pounds only)';
    return null;
  })();
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Additional Details
        </ThemedText>

        {/* Cover Image Picker */}
        <Column gap="xs">
          <ThemedText style={styles.formLabel}>Cover Photo (optional)</ThemedText>
          {coverImageUri ? (
            <View style={styles.coverImagePreview}>
              <Image source={{ uri: coverImageUri }} style={styles.coverImage} contentFit="cover" />
              <Clickable
                onPress={onRemoveCoverImage}
                style={[
                  styles.removeCoverButton,
                  { backgroundColor: withAlpha(colors.error, 0.9) },
                ]}
                accessibilityLabel="Remove cover photo"
              >
                <Ionicons name="close" size={16} color={colors.onError} />
              </Clickable>
            </View>
          ) : (
            <Clickable
              onPress={onPickCoverImage}
              style={[
                styles.coverImagePicker,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              accessibilityLabel="Add cover photo"
            >
              <Ionicons name="image-outline" size={32} color={colors.muted} />
              <ThemedText style={[styles.coverImagePickerText, { color: colors.muted }]}>
                Add Cover Photo
              </ThemedText>
            </Clickable>
          )}
        </Column>

        {/* Notes */}
        <Column gap="xs">
          <ThemedText style={styles.formLabel}>Notes for Parent</ThemedText>
          <TextInput
            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., Looking forward to working on finishing skills..."
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={onChangeNotes}
            multiline
            numberOfLines={4}
            accessibilityLabel="Notes for parent"
          />
        </Column>

        {/* Price */}
        <Column gap="xs">
          <ThemedText style={styles.formLabel}>Price (optional)</ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: priceError ? colors.error : colors.border },
            ]}
            placeholder="e.g., 50"
            placeholderTextColor={colors.muted}
            value={price}
            onChangeText={(value) => onChangePrice(value.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            accessibilityLabel="Session price"
          />
          <ThemedText style={[Typography.caption, { color: priceError ? colors.error : colors.muted }]}>
            {priceError ?? 'Whole pounds only (£10-£200)'}
          </ThemedText>
        </Column>
      </Column>
    </Animated.View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  stepTitle: {
    ...Typography.title,
  },
  formLabel: {
    ...Typography.bodySmallSemiBold,
    marginBottom: Spacing.xxs,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
    textAlignVertical: 'top',
  },
  coverImagePreview: {
    position: 'relative',
    height: 180,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  removeCoverButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  coverImagePicker: {
    height: 120,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 44,
  },
  coverImagePickerText: {
    ...Typography.bodySmallSemiBold,
  },
});
