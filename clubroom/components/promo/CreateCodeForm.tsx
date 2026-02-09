/**
 * CreateCodeForm — Composition root.
 * Admin form for creating promotional codes with presets, toggles, and expiry.
 */
import { View, TextInput, StyleSheet, Switch, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreateCodeForm, PRESET_AMOUNTS, PRESET_MAX_USES } from '@/hooks/use-create-code-form';
import { PresetRow, ErrorBanner, FormFooter } from './create-code-sections';

interface CreateCodeFormProps {
  adminUserId: string;
  adminUserName?: string;
  onSuccess: (promoCode: import('@/constants/types').PromoCode) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export function CreateCodeForm({ adminUserId, adminUserName, onSuccess, onError, onCancel }: CreateCodeFormProps) {
  const { colors: palette } = useTheme();
  const form = useCreateCodeForm({ adminUserId, adminUserName, onSuccess, onError });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Code input */}
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Promo Code</ThemedText>
          <View style={styles.codeInputRow}>
            <View style={[styles.inputWrapper, { backgroundColor: palette.surface, borderColor: form.codeError ? palette.error : palette.border, flex: 1 }]}>
              <TextInput style={[styles.input, styles.codeInput, { color: palette.text }]} value={form.code} onChangeText={form.handleCodeChange}
                placeholder="SUMMER25" placeholderTextColor={palette.muted} autoCapitalize="characters" autoCorrect={false} maxLength={20} />
            </View>
            <Clickable style={[styles.generateButton, { backgroundColor: palette.tint }]} onPress={form.generateRandomCode}>
              <Ionicons name="shuffle" size={20} color={palette.onPrimary} />
            </Clickable>
          </View>
          {form.codeError && <ThemedText style={[styles.errorText, { color: palette.error }]}>{form.codeError}</ThemedText>}
          <ThemedText style={[styles.helpText, { color: palette.muted }]}>3-20 alphanumeric characters. Tap shuffle for a random code.</ThemedText>
        </View>

        {/* Credit amount */}
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Credit Amount (GBP)</ThemedText>
          <PresetRow presets={PRESET_AMOUNTS} selected={form.creditAmount} onSelect={form.setCreditAmount} prefix={'\u00A3'} />
          <View style={[styles.inputWrapper, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ThemedText style={styles.currencySymbol}>{'\u00A3'}</ThemedText>
            <TextInput style={[styles.input, { color: palette.text }]} value={form.creditAmount} onChangeText={form.handleAmountChange}
              placeholder="0.00" placeholderTextColor={palette.muted} keyboardType="decimal-pad" />
          </View>
        </View>

        {/* Max uses */}
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Maximum Uses</ThemedText>
          <PresetRow presets={PRESET_MAX_USES} selected={form.maxUses} onSelect={form.setMaxUses} />
          <View style={[styles.inputWrapper, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <TextInput style={[styles.input, { color: palette.text }]} value={form.maxUses} onChangeText={form.handleMaxUsesChange}
              placeholder="100" placeholderTextColor={palette.muted} keyboardType="number-pad" />
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Description (Optional)</ThemedText>
          <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <TextInput style={[styles.input, styles.textArea, { color: palette.text }]} value={form.description} onChangeText={form.setDescription}
              placeholder="e.g., Summer promotion for new users" placeholderTextColor={palette.muted} multiline numberOfLines={2} maxLength={200} />
          </View>
        </View>

        {/* One per user toggle */}
        <SurfaceCard style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText style={styles.toggleLabel}>One Use Per User</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>Each user can only redeem this code once</ThemedText>
            </View>
            <Switch value={form.onePerUser} onValueChange={form.setOnePerUser} trackColor={{ false: palette.border, true: palette.tint }} thumbColor={palette.surface} />
          </View>
        </SurfaceCard>

        {/* Expiry toggle and date */}
        <SurfaceCard style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText style={styles.toggleLabel}>Set Expiry Date</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>Code will expire after this date</ThemedText>
            </View>
            <Switch value={form.hasExpiry} onValueChange={form.setHasExpiry} trackColor={{ false: palette.border, true: palette.tint }} thumbColor={palette.surface} />
          </View>
          {form.hasExpiry && (
            <>
              <Divider spacing={Spacing.xs} />
              <Clickable style={styles.datePickerButton} onPress={() => form.setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={palette.tint} />
                <ThemedText style={styles.dateText}>{form.expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} />
              </Clickable>
            </>
          )}
        </SurfaceCard>

        {form.showDatePicker && <DateTimePicker value={form.expiryDate} mode="date" display="default" minimumDate={new Date()} onChange={form.handleDateChange} />}
        {form.error && <ErrorBanner message={form.error} />}
      </ScrollView>

      <FormFooter onCancel={onCancel} onSubmit={form.handleSubmit} submitting={form.submitting} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xl },
  fieldGroup: { gap: Spacing.sm },
  label: { ...Typography.bodySmallSemiBold },
  helpText: { ...Typography.caption, marginTop: Spacing.micro },
  errorText: { ...Typography.caption, marginTop: Spacing.micro },
  codeInputRow: { flexDirection: 'row', gap: Spacing.sm },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: Radii.lg, borderWidth: 1, paddingHorizontal: Spacing.md, height: 52 },
  textAreaWrapper: { height: 80, alignItems: 'flex-start', paddingVertical: Spacing.sm },
  input: { ...Typography.subheading, flex: 1 },
  codeInput: { fontWeight: '600', letterSpacing: 1 },
  textArea: { textAlignVertical: 'top' },
  currencySymbol: { ...Typography.heading, marginRight: Spacing.xs },
  generateButton: { width: 52, height: 52, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  toggleCard: { padding: Spacing.md, gap: Spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo: { flex: 1, marginRight: Spacing.md },
  toggleLabel: { ...Typography.bodySemiBold },
  toggleDescription: { ...Typography.small, marginTop: Spacing.micro },
  datePickerButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  dateText: { ...Typography.bodySemiBold, flex: 1 },
});
