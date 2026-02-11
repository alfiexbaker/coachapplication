/**
 * CreatePackageForm — Composition root.
 * Coach creates or edits session packages with presets and focus areas.
 */
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreatePackageForm } from '@/hooks/use-create-package-form';
import type { SessionPackage } from '@/constants/types';
import { SESSION_COUNT_OPTIONS, VALIDITY_OPTIONS, FOCUS_OPTIONS } from './create-package-constants';
import {
  OptionPicker,
  FocusAreaPicker,
  PricePreview,
  PackageFormFooter,
} from './create-package-sections';

export interface CreatePackageFormProps {
  onSuccess?: (pkg: SessionPackage) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  editPackage?: SessionPackage;
}

export function CreatePackageForm({
  onSuccess,
  onError,
  onCancel,
  editPackage,
}: CreatePackageFormProps) {
  const { colors: palette } = useTheme();
  const form = useCreatePackageForm({ editPackage, onSuccess, onError });

  const sessionOptions = SESSION_COUNT_OPTIONS.map((c) => ({ value: c, label: String(c) }));
  const validityOptions = VALIDITY_OPTIONS.map((v) => ({ value: v.days, label: v.label }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Package Name *
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: form.errors.name ? palette.error : palette.border,
                color: palette.text,
              },
            ]}
            placeholder="e.g., 5 Session Starter Pack"
            placeholderTextColor={palette.muted}
            value={form.name}
            onChangeText={form.setName}
          />
          {form.errors.name && (
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              {form.errors.name}
            </ThemedText>
          )}
        </View>

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
            value={form.description}
            onChangeText={form.setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Number of Sessions
          </ThemedText>
          <OptionPicker
            options={sessionOptions}
            selected={form.sessionCount}
            onSelect={form.setSessionCount}
          />
        </View>

        <Row gap="md">
          <View style={[styles.field, { flex: 1 }]}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Package Price *
            </ThemedText>
            <Row
              align="center"
              style={[
                styles.inputWithPrefix,
                {
                  backgroundColor: palette.surface,
                  borderColor: form.errors.price ? palette.error : palette.border,
                },
              ]}
            >
              <ThemedText style={styles.currencyPrefix}>{'\u00A3'}</ThemedText>
              <TextInput
                style={[styles.inputNoBorder, { color: palette.text }]}
                placeholder="0.00"
                placeholderTextColor={palette.muted}
                value={form.price}
                onChangeText={form.setPrice}
                keyboardType="decimal-pad"
              />
            </Row>
            {form.errors.price && (
              <ThemedText style={[styles.errorText, { color: palette.error }]}>
                {form.errors.price}
              </ThemedText>
            )}
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Discount %
            </ThemedText>
            <Row
              align="center"
              style={[
                styles.inputWithSuffix,
                {
                  backgroundColor: palette.surface,
                  borderColor: form.errors.discountPercent ? palette.error : palette.border,
                },
              ]}
            >
              <TextInput
                style={[styles.inputNoBorder, { color: palette.text }]}
                placeholder="0"
                placeholderTextColor={palette.muted}
                value={form.discountPercent}
                onChangeText={form.setDiscountPercent}
                keyboardType="number-pad"
              />
              <ThemedText style={styles.percentSuffix}>%</ThemedText>
            </Row>
            {form.errors.discountPercent && (
              <ThemedText style={[styles.errorText, { color: palette.error }]}>
                {form.errors.discountPercent}
              </ThemedText>
            )}
          </View>
        </Row>

        {form.priceNum > 0 && <PricePreview pricePerSession={form.pricePerSession} />}

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Valid For
          </ThemedText>
          <OptionPicker
            options={validityOptions}
            selected={form.validDays}
            onSelect={form.setValidDays}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Focus Areas (optional, max 3)
          </ThemedText>
          <FocusAreaPicker
            options={FOCUS_OPTIONS}
            selected={form.selectedFocus}
            onToggle={form.toggleFocus}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <PackageFormFooter
        onCancel={onCancel}
        onSubmit={form.handleSubmit}
        submitting={form.submitting}
        isEditing={form.isEditing}
      />
    </KeyboardAvoidingView>
  );
}

export default CreatePackageForm;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: Spacing.md },
  field: { marginBottom: Spacing.md },
  label: { ...Typography.bodySmall, marginBottom: Spacing.xs },
  input: {
    ...Typography.subheading,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  inputWithPrefix: { borderWidth: 1.5, borderRadius: Radii.md, paddingHorizontal: Spacing.md },
  inputWithSuffix: { borderWidth: 1.5, borderRadius: Radii.md, paddingHorizontal: Spacing.md },
  inputNoBorder: { ...Typography.subheading, flex: 1, paddingVertical: Spacing.sm },
  currencyPrefix: { ...Typography.heading, marginRight: Spacing.xxs },
  percentSuffix: { ...Typography.subheading, marginLeft: Spacing.xxs },
  errorText: { ...Typography.caption, marginTop: Spacing.xxs },
});
