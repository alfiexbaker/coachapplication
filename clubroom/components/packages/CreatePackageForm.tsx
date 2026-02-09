import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { packageService, CreatePackageParams } from '@/services/package-service';
import type { SessionPackage, FootballObjective } from '@/constants/types';

/**
 * Props for the CreatePackageForm component
 */
export interface CreatePackageFormProps {
  /** Callback when package is created successfully */
  onSuccess?: (pkg: SessionPackage) => void;
  /** Callback when creation fails */
  onError?: (error: string) => void;
  /** Callback to cancel form */
  onCancel?: () => void;
  /** Existing package data for editing */
  editPackage?: SessionPackage;
}

const SESSION_COUNT_OPTIONS = [3, 5, 10, 15, 20];
const VALIDITY_OPTIONS = [
  { days: 30, label: '30 days' },
  { days: 45, label: '45 days' },
  { days: 60, label: '60 days' },
  { days: 90, label: '90 days' },
  { days: 120, label: '4 months' },
];

const FOCUS_OPTIONS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];

/**
 * Form component for coaches to create or edit session packages.
 */
export function CreatePackageForm({
  onSuccess,
  onError,
  onCancel,
  editPackage,
}: CreatePackageFormProps) {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const isEditing = !!editPackage;

  // Form state
  const [name, setName] = useState(editPackage?.name || '');
  const [description, setDescription] = useState(editPackage?.description || '');
  const [sessionCount, setSessionCount] = useState(editPackage?.sessionCount || 5);
  const [price, setPrice] = useState(editPackage?.price?.toString() || '');
  const [discountPercent, setDiscountPercent] = useState(
    editPackage?.discountPercent?.toString() || ''
  );
  const [validDays, setValidDays] = useState(editPackage?.validDays || 60);
  const [selectedFocus, setSelectedFocus] = useState<FootballObjective[]>(
    (editPackage?.focus as FootballObjective[]) || []
  );
  const [submitting, setSubmitting] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Package name is required';
    }

    if (!price || parseFloat(price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    const discountNum = parseFloat(discountPercent) || 0;
    if (discountNum < 0 || discountNum > 50) {
      newErrors.discountPercent = 'Discount must be 0-50%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !currentUser?.id) return;

    setSubmitting(true);
    try {
      if (isEditing && editPackage) {
        // Update existing package
        const updatedPkg = await packageService.updatePackage(editPackage.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          sessionCount,
          price: parseFloat(price),
          discountPercent: parseFloat(discountPercent) || 0,
          validDays,
          focus: selectedFocus,
        });

        if (updatedPkg) {
          onSuccess?.(updatedPkg);
        } else {
          onError?.('Failed to update package');
        }
      } else {
        // Create new package
        const params: CreatePackageParams = {
          coachId: currentUser.id,
          coachName: currentUser.fullName || currentUser.name || 'Coach',
          name: name.trim(),
          description: description.trim() || undefined,
          sessionCount,
          price: parseFloat(price),
          discountPercent: parseFloat(discountPercent) || 0,
          validDays,
          focus: selectedFocus,
        };

        const newPkg = await packageService.createPackage(params);
        onSuccess?.(newPkg);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFocus = (focus: FootballObjective) => {
    if (selectedFocus.includes(focus)) {
      setSelectedFocus(selectedFocus.filter((f) => f !== focus));
    } else if (selectedFocus.length < 3) {
      setSelectedFocus([...selectedFocus, focus]);
    }
  };

  // Calculate price per session preview
  const priceNum = parseFloat(price) || 0;
  const pricePerSession = sessionCount > 0 ? priceNum / sessionCount : 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Package Name */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Package Name *
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: errors.name ? palette.error : palette.border,
                color: palette.text,
              },
            ]}
            placeholder="e.g., 5 Session Starter Pack"
            placeholderTextColor={palette.muted}
            value={name}
            onChangeText={setName}
          />
          {errors.name && (
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              {errors.name}
            </ThemedText>
          )}
        </View>

        {/* Description */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Description
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            placeholder="Describe what's included..."
            placeholderTextColor={palette.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Session Count */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Number of Sessions
          </ThemedText>
          <View style={styles.optionsRow}>
            {SESSION_COUNT_OPTIONS.map((count) => (
              <Pressable
                key={count}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: sessionCount === count ? palette.tint : palette.surface,
                    borderColor: sessionCount === count ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => setSessionCount(count)}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    { color: sessionCount === count ? palette.onPrimary : palette.text },
                  ]}
                >
                  {count}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Price & Discount */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Package Price *
            </ThemedText>
            <View
              style={[
                styles.inputWithPrefix,
                {
                  backgroundColor: palette.surface,
                  borderColor: errors.price ? palette.error : palette.border,
                },
              ]}
            >
              <ThemedText style={styles.currencyPrefix}>{'\u00A3'}</ThemedText>
              <TextInput
                style={[styles.inputNoBorder, { color: palette.text }]}
                placeholder="0.00"
                placeholderTextColor={palette.muted}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>
            {errors.price && (
              <ThemedText style={[styles.errorText, { color: palette.error }]}>
                {errors.price}
              </ThemedText>
            )}
          </View>

          <View style={[styles.field, { flex: 1 }]}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Discount %
            </ThemedText>
            <View
              style={[
                styles.inputWithSuffix,
                {
                  backgroundColor: palette.surface,
                  borderColor: errors.discountPercent ? palette.error : palette.border,
                },
              ]}
            >
              <TextInput
                style={[styles.inputNoBorder, { color: palette.text }]}
                placeholder="0"
                placeholderTextColor={palette.muted}
                value={discountPercent}
                onChangeText={setDiscountPercent}
                keyboardType="number-pad"
              />
              <ThemedText style={styles.percentSuffix}>%</ThemedText>
            </View>
            {errors.discountPercent && (
              <ThemedText style={[styles.errorText, { color: palette.error }]}>
                {errors.discountPercent}
              </ThemedText>
            )}
          </View>
        </View>

        {/* Price Preview */}
        {priceNum > 0 && (
          <SurfaceCard style={[styles.previewCard, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
            <View style={styles.previewRow}>
              <Ionicons name="calculator-outline" size={16} color={palette.success} />
              <ThemedText style={[styles.previewText, { color: palette.success }]}>
                {'\u00A3'}{pricePerSession.toFixed(2)} per session
              </ThemedText>
            </View>
          </SurfaceCard>
        )}

        {/* Validity Period */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Valid For
          </ThemedText>
          <View style={styles.optionsRow}>
            {VALIDITY_OPTIONS.map((option) => (
              <Pressable
                key={option.days}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: validDays === option.days ? palette.tint : palette.surface,
                    borderColor: validDays === option.days ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => setValidDays(option.days)}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    { color: validDays === option.days ? palette.onPrimary : palette.text },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Focus Areas */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Focus Areas (optional, max 3)
          </ThemedText>
          <View style={styles.focusGrid}>
            {FOCUS_OPTIONS.map((focus) => {
              const isSelected = selectedFocus.includes(focus);
              return (
                <Pressable
                  key={focus}
                  style={[
                    styles.focusChip,
                    {
                      backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                  onPress={() => toggleFocus(focus)}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color={palette.tint} />}
                  <ThemedText
                    style={[styles.focusChipText, { color: isSelected ? palette.tint : palette.text }]}
                  >
                    {focus}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Buttons */}
      <View style={[styles.footer, { backgroundColor: palette.background }]}>
        {onCancel && (
          <Pressable
            style={[styles.cancelButton, { borderColor: palette.border }]}
            onPress={onCancel}
            disabled={submitting}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.submitButton,
            { backgroundColor: palette.tint },
            submitting ? styles.buttonDisabled : undefined,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={palette.onPrimary} />
          ) : (
            <>
              <Ionicons name={isEditing ? 'save-outline' : 'add-circle-outline'} size={20} color={palette.onPrimary} />
              <ThemedText style={[styles.submitButtonText, { color: palette.onPrimary }]}>
                {isEditing ? 'Save Changes' : 'Create Package'}
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: { ...Typography.bodySmall, marginBottom: Spacing.xs },
  input: { ...Typography.subheading, borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  inputNoBorder: { ...Typography.subheading, flex: 1,
    paddingVertical: Spacing.sm },
  currencyPrefix: { ...Typography.heading, marginRight: Spacing.xxs },
  percentSuffix: { ...Typography.subheading, marginLeft: Spacing.xxs },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minWidth: 60,
    alignItems: 'center',
  },
  optionText: { ...Typography.bodySmallSemiBold },
  previewCard: {
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewText: { ...Typography.bodySmallSemiBold },
  focusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  focusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  focusChipText: { ...Typography.smallSemiBold },
  errorText: { ...Typography.caption, marginTop: Spacing.xxs },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  cancelButtonText: { ...Typography.subheading },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  submitButtonText: { ...Typography.subheading },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default CreatePackageForm;
