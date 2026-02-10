import { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { promoService } from '@/services/promo-service';
import type { PromoCodeValidationResult } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { ValidationMessage, RedeemButton, LoadingStateMessage } from './promo-code-input-sections';
export type { ValidationMessageProps, RedeemButtonProps, LoadingStateMessageProps } from './promo-code-input-sections';

import { ValidationMessage, RedeemButton, LoadingStateMessage } from './promo-code-input-sections';

interface PromoCodeInputProps {
  userId: string;
  onRedeem: (result: { code: string; creditAmount: number; newBalance: number }) => void;
  onValidate?: (result: PromoCodeValidationResult) => void;
  disabled?: boolean;
  placeholder?: string;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid' | 'redeeming';

export function PromoCodeInput({
  userId,
  onRedeem,
  onValidate,
  disabled = false,
  placeholder = 'Enter promo code',
}: PromoCodeInputProps) {
  const { colors: palette } = useTheme();

  const [code, setCode] = useState('');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validatedCode, setValidatedCode] = useState<{
    code: string;
    creditAmount: number;
  } | null>(null);

  const handleCodeChange = useCallback((text: string) => {
    const normalized = text.toUpperCase().replace(/\s+/g, '');
    setCode(normalized);
    if (validationState !== 'idle' && validationState !== 'validating') {
      setValidationState('idle');
      setErrorMessage(null);
      setValidatedCode(null);
    }
  }, [validationState]);

  const handleValidate = useCallback(async () => {
    if (!code.trim() || validationState === 'validating' || disabled) return;
    setValidationState('validating');
    setErrorMessage(null);
    try {
      const result = await promoService.validateCode(code, userId);
      onValidate?.(result);
      if (result.valid && result.promoCode) {
        setValidationState('valid');
        setValidatedCode({ code: result.promoCode.code, creditAmount: result.promoCode.creditAmount });
      } else {
        setValidationState('invalid');
        setErrorMessage(result.error ?? 'Invalid promo code');
      }
    } catch {
      setValidationState('invalid');
      setErrorMessage('Failed to validate code');
    }
  }, [code, userId, validationState, disabled, onValidate]);

  const handleRedeem = useCallback(async () => {
    if (validationState !== 'valid' || !validatedCode || disabled) return;
    setValidationState('redeeming');
    try {
      const result = await promoService.redeemCode(userId, code);
      if (result.success && result.usage && result.newBalance !== undefined) {
        onRedeem({ code: validatedCode.code, creditAmount: validatedCode.creditAmount, newBalance: result.newBalance });
        setCode('');
        setValidationState('idle');
        setValidatedCode(null);
      } else {
        setValidationState('invalid');
        setErrorMessage(result.error ?? 'Failed to redeem code');
      }
    } catch {
      setValidationState('invalid');
      setErrorMessage('Failed to redeem code');
    }
  }, [code, userId, validationState, validatedCode, disabled, onRedeem]);

  const isLoading = validationState === 'validating' || validationState === 'redeeming';
  const isValid = validationState === 'valid';
  const isInvalid = validationState === 'invalid';

  const getBorderColor = () => {
    if (isValid) return palette.success;
    if (isInvalid) return palette.error;
    return palette.border;
  };

  return (
    <View style={styles.container}>
      <Row
        align="center"
        style={[styles.inputContainer, { backgroundColor: palette.surface, borderColor: getBorderColor() }]}
      >
        <Ionicons
          name="pricetag-outline"
          size={20}
          color={isValid ? palette.success : palette.muted}
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.input, { color: palette.text }]}
          value={code}
          onChangeText={handleCodeChange}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!disabled && !isLoading}
          returnKeyType="done"
          onSubmitEditing={isValid ? handleRedeem : handleValidate}
        />
        {code.length > 0 && !isLoading && (
          <Pressable
            onPress={() => { setCode(''); setValidationState('idle'); setErrorMessage(null); setValidatedCode(null); }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Pressable>
        )}
        {isLoading && (
          <ActivityIndicator size="small" color={palette.tint} style={styles.clearButton} />
        )}
      </Row>

      <ValidationMessage
        isValid={isValid}
        isInvalid={isInvalid}
        creditAmount={validatedCode?.creditAmount}
        errorMessage={errorMessage}
        palette={palette}
      />

      <RedeemButton
        isValid={isValid}
        isLoading={isLoading}
        disabled={!code.trim() || isLoading || disabled}
        onPress={isValid ? handleRedeem : handleValidate}
        palette={palette}
      />

      <LoadingStateMessage
        state={validationState === 'validating' ? 'validating' : validationState === 'redeeming' ? 'redeeming' : null}
        palette={palette}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  inputContainer: {
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: { ...Typography.subheading, flex: 1, letterSpacing: 1 },
  clearButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
});
