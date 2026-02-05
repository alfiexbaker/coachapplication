import { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { promoService } from '@/services/promo-service';
import type { PromoCode, CreatePromoCodeParams } from '@/constants/types';

interface CreateCodeFormProps {
  /** Admin user ID */
  adminUserId: string;
  /** Admin user name */
  adminUserName?: string;
  /** Callback when code is successfully created */
  onSuccess: (promoCode: PromoCode) => void;
  /** Callback when creation fails */
  onError?: (error: string) => void;
  /** Callback to cancel/close the form */
  onCancel?: () => void;
}

const PRESET_AMOUNTS = [5, 10, 15, 25, 50];
const PRESET_MAX_USES = [10, 50, 100, 500, 1000];

export function CreateCodeForm({
  adminUserId,
  adminUserName,
  onSuccess,
  onError,
  onCancel,
}: CreateCodeFormProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Form state
  const [code, setCode] = useState('');
  const [creditAmount, setCreditAmount] = useState('10');
  const [maxUses, setMaxUses] = useState('100');
  const [description, setDescription] = useState('');
  const [onePerUser, setOnePerUser] = useState(true);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default: 30 days from now
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleCodeChange = useCallback((text: string) => {
    // Normalize to uppercase, remove spaces
    const normalized = text.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
    setCode(normalized);
    setCodeError(null);

    // Validate format
    if (normalized && !promoService.isValidCodeFormat(normalized)) {
      setCodeError('Code must be 3-20 alphanumeric characters');
    }
  }, []);

  const handleAmountChange = useCallback((text: string) => {
    // Only allow numbers and decimal point
    const normalized = text.replace(/[^0-9.]/g, '');
    setCreditAmount(normalized);
  }, []);

  const handleMaxUsesChange = useCallback((text: string) => {
    // Only allow numbers
    const normalized = text.replace(/[^0-9]/g, '');
    setMaxUses(normalized);
  }, []);

  const handleDateChange = useCallback((event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  }, []);

  const generateRandomCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
    setCodeError(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    // Validate code
    if (!code.trim()) {
      setError('Please enter a promo code');
      return false;
    }

    if (!promoService.isValidCodeFormat(code)) {
      setError('Code must be 3-20 alphanumeric characters');
      return false;
    }

    // Validate amount
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Credit amount must be greater than 0');
      return false;
    }

    if (amount > 1000) {
      setError('Credit amount cannot exceed 1000');
      return false;
    }

    // Validate max uses
    const uses = parseInt(maxUses, 10);
    if (isNaN(uses) || uses <= 0) {
      setError('Max uses must be greater than 0');
      return false;
    }

    // Validate expiry date
    if (hasExpiry && expiryDate <= new Date()) {
      setError('Expiry date must be in the future');
      return false;
    }

    setError(null);
    return true;
  }, [code, creditAmount, maxUses, hasExpiry, expiryDate]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const params: CreatePromoCodeParams = {
        code: code.trim(),
        creditAmount: parseFloat(creditAmount),
        maxUses: parseInt(maxUses, 10),
        description: description.trim() || undefined,
        onePerUser,
        expiresAt: hasExpiry ? expiryDate.toISOString() : undefined,
        createdBy: adminUserId,
        createdByName: adminUserName,
      };

      const newCode = await promoService.createPromoCode(params);
      onSuccess(newCode);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create promo code';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [
    validateForm,
    code,
    creditAmount,
    maxUses,
    description,
    onePerUser,
    hasExpiry,
    expiryDate,
    adminUserId,
    adminUserName,
    onSuccess,
    onError,
  ]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Code input */}
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Promo Code</ThemedText>
          <View style={styles.codeInputRow}>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: palette.surface,
                  borderColor: codeError ? palette.error : palette.border,
                  flex: 1,
                },
              ]}
            >
              <TextInput
                style={[styles.input, styles.codeInput, { color: palette.text }]}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="SUMMER25"
                placeholderTextColor={palette.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
              />
            </View>
            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: palette.tint }]}
              onPress={generateRandomCode}
            >
              <Ionicons name="shuffle" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {codeError && (
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              {codeError}
            </ThemedText>
          )}
          <ThemedText style={[styles.helpText, { color: palette.muted }]}>
            3-20 alphanumeric characters. Tap shuffle for a random code.
          </ThemedText>
        </View>

        {/* Credit amount */}
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Credit Amount (GBP)</ThemedText>
          <View style={styles.presetRow}>
            {PRESET_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor: creditAmount === String(amount) ? palette.tint : palette.surface,
                    borderColor: creditAmount === String(amount) ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => setCreditAmount(String(amount))}
              >
                <ThemedText
                  style={[
                    styles.presetText,
                    { color: creditAmount === String(amount) ? '#FFFFFF' : palette.text },
                  ]}
                >
                  {'\u00A3'}{amount}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <ThemedText style={styles.currencySymbol}>{'\u00A3'}</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              value={creditAmount}
              onChangeText={handleAmountChange}
              placeholder="0.00"
              placeholderTextColor={palette.muted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Max uses */}
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Maximum Uses</ThemedText>
          <View style={styles.presetRow}>
            {PRESET_MAX_USES.map((uses) => (
              <TouchableOpacity
                key={uses}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor: maxUses === String(uses) ? palette.tint : palette.surface,
                    borderColor: maxUses === String(uses) ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => setMaxUses(String(uses))}
              >
                <ThemedText
                  style={[
                    styles.presetText,
                    { color: maxUses === String(uses) ? '#FFFFFF' : palette.text },
                  ]}
                >
                  {uses}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: palette.text }]}
              value={maxUses}
              onChangeText={handleMaxUsesChange}
              placeholder="100"
              placeholderTextColor={palette.muted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Description (Optional)</ThemedText>
          <View
            style={[
              styles.inputWrapper,
              styles.textAreaWrapper,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <TextInput
              style={[styles.input, styles.textArea, { color: palette.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Summer promotion for new users"
              placeholderTextColor={palette.muted}
              multiline
              numberOfLines={2}
              maxLength={200}
            />
          </View>
        </View>

        {/* One per user toggle */}
        <SurfaceCard style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText style={styles.toggleLabel}>One Use Per User</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>
                Each user can only redeem this code once
              </ThemedText>
            </View>
            <Switch
              value={onePerUser}
              onValueChange={setOnePerUser}
              trackColor={{ false: palette.border, true: palette.tint }}
              thumbColor="#FFFFFF"
            />
          </View>
        </SurfaceCard>

        {/* Expiry toggle and date */}
        <SurfaceCard style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText style={styles.toggleLabel}>Set Expiry Date</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>
                Code will expire after this date
              </ThemedText>
            </View>
            <Switch
              value={hasExpiry}
              onValueChange={setHasExpiry}
              trackColor={{ false: palette.border, true: palette.tint }}
              thumbColor="#FFFFFF"
            />
          </View>
          {hasExpiry && (
            <>
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={palette.tint} />
                <ThemedText style={styles.dateText}>
                  {expiryDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </ThemedText>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} />
              </TouchableOpacity>
            </>
          )}
        </SurfaceCard>

        {showDatePicker && (
          <DateTimePicker
            value={expiryDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        {/* Error message */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: `${palette.error}15` }]}>
            <Ionicons name="alert-circle" size={18} color={palette.error} />
            <ThemedText style={[styles.errorBannerText, { color: palette.error }]}>
              {error}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {onCancel && (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: palette.border }]}
            onPress={onCancel}
            disabled={submitting}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: palette.tint, opacity: submitting ? 0.6 : 1 },
            !onCancel ? styles.submitButtonFull : undefined,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <ThemedText style={styles.submitButtonText}>Create Code</ThemedText>
            </>
          )}
        </TouchableOpacity>
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
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
  },
  codeInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  textAreaWrapper: {
    height: 80,
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  codeInput: {
    fontWeight: '600',
    letterSpacing: 1,
  },
  textArea: {
    textAlignVertical: 'top',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  generateButton: {
    width: 52,
    height: 52,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  presetButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  toggleDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  submitButtonFull: {
    flex: 1,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
