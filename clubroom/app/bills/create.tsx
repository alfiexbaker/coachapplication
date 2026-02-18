/**
 * Create Bill Screen
 *
 * Form: title, amount (GBP), category chips, vendor, due date, recurring toggle, description.
 */

import { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { PageHeader } from '@/components/primitives/page-header';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { billService } from '@/services/bill-service';
import type { BillCategory } from '@/constants/types';

const CATEGORIES: { value: BillCategory; label: string }[] = [
  { value: 'FACILITY_RENTAL', label: 'Facility' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'CERTIFICATION', label: 'Certification' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'OTHER', label: 'Other' },
];

export default function CreateBillScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<BillCategory>('OTHER');
  const [vendor, setVendor] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && Number(amount) > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    const result = await billService.createBill({
      coachId,
      title: title.trim(),
      amount: Number(amount),
      currency: 'GBP',
      category,
      status: 'PENDING',
      vendor: vendor.trim() || undefined,
      dueDate: dueDate.trim() || undefined,
      isRecurring,
      description: description.trim() || undefined,
    });
    setSubmitting(false);

    if (result.ok) {
      router.back();
    } else {
      Alert.alert('Error', result.error.message);
    }
  }, [canSubmit, submitting, coachId, title, amount, category, vendor, dueDate, isRecurring, description]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <PageHeader title="Add Bill" showBack centerTitle />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <ThemedText style={[styles.label, { color: colors.muted }]}>Title</ThemedText>
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Pitch Hire"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Bill title"
          />

          {/* Amount */}
          <ThemedText style={[styles.label, { color: colors.muted }]}>Amount (£)</ThemedText>
          <TextInput
            style={inputStyle}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            accessibilityLabel="Bill amount in pounds"
          />

          {/* Category */}
          <ThemedText style={[styles.label, { color: colors.muted }]}>Category</ThemedText>
          <Row wrap gap="xs" style={styles.chipRow}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat.value;
              return (
                <Clickable key={cat.value} onPress={() => setCategory(cat.value)}>
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? withAlpha(colors.tint, 0.12) : colors.surface,
                        borderColor: selected ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        Typography.small,
                        { color: selected ? colors.tint : colors.text, fontWeight: selected ? '600' : '400' },
                      ]}
                    >
                      {cat.label}
                    </ThemedText>
                  </View>
                </Clickable>
              );
            })}
          </Row>

          {/* Vendor */}
          <ThemedText style={[styles.label, { color: colors.muted }]}>Vendor (optional)</ThemedText>
          <TextInput
            style={inputStyle}
            value={vendor}
            onChangeText={setVendor}
            placeholder="e.g. Riverside Fields Ltd"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Bill vendor"
          />

          {/* Due Date */}
          <ThemedText style={[styles.label, { color: colors.muted }]}>Due Date (optional)</ThemedText>
          <TextInput
            style={inputStyle}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Bill due date"
          />

          {/* Recurring */}
          <Row align="center" justify="between" style={styles.switchRow}>
            <ThemedText type="defaultSemiBold">Recurring Expense</ThemedText>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: colors.border, true: withAlpha(colors.tint, 0.4) }}
              thumbColor={isRecurring ? colors.tint : colors.muted}
              accessibilityLabel="Toggle recurring expense"
            />
          </Row>

          {/* Description */}
          <ThemedText style={[styles.label, { color: colors.muted }]}>Description (optional)</ThemedText>
          <TextInput
            style={[...inputStyle, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Any additional notes..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Bill description"
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            accessibilityLabel="Create bill"
          >
            {submitting ? 'Creating...' : 'Create Bill'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing['2xl'],
  },
  label: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  input: {
    height: Components.input.height,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    ...Typography.body,
  },
  textArea: {
    height: 90,
    paddingTop: Spacing.sm,
  },
  chipRow: {
    marginBottom: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  switchRow: {
    marginVertical: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
