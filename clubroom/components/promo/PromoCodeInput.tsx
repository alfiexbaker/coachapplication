import { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { promoService } from '@/services/promo-service';
import type { PromoCodeValidationResult } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface PromoCodeInputProps {
  /** User ID for validation */
  userId: string;
  /** Callback when code is successfully redeemed */
  onRedeem: (result: { code: string; creditAmount: number; newBalance: number }) => void;
  /** Callback when validation occurs (optional) */
  onValidate?: (result: PromoCodeValidationResult) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
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
    // Normalize to uppercase, remove spaces
    const normalized = text.toUpperCase().replace(/\s+/g, '');
    setCode(normalized);

    // Reset validation state when code changes
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
        setValidatedCode({
          code: result.promoCode.code,
          creditAmount: result.promoCode.creditAmount,
        });
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
        onRedeem({
          code: validatedCode.code,
          creditAmount: validatedCode.creditAmount,
          newBalance: result.newBalance,
        });
        // Reset after successful redemption
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
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: palette.surface,
            borderColor: getBorderColor(),
          },
        ]}
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
            onPress={() => {
              setCode('');
              setValidationState('idle');
              setErrorMessage(null);
              setValidatedCode(null);
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Pressable>
        )}
        {isLoading && (
          <ActivityIndicator size="small" color={palette.tint} style={styles.clearButton} />
        )}
      </View>

      {/* Validation status */}
      {isValid && validatedCode && (
        <Animated.View entering={FadeIn} style={styles.validationMessage}>
          <Ionicons name="checkmark-circle" size={16} color={palette.success} />
          <ThemedText style={[styles.validText, { color: palette.success }]}>
            Code valid! You will receive {promoService.formatCredit(validatedCode.creditAmount)}
          </ThemedText>
        </Animated.View>
      )}

      {isInvalid && errorMessage && (
        <Animated.View entering={FadeIn} style={styles.validationMessage}>
          <Ionicons name="alert-circle" size={16} color={palette.error} />
          <ThemedText style={[styles.errorText, { color: palette.error }]}>
            {errorMessage}
          </ThemedText>
        </Animated.View>
      )}

      {/* Action button */}
      <Pressable
        style={[
          styles.actionButton,
          {
            backgroundColor: isValid ? palette.success : palette.tint,
            opacity: (!code.trim() || disabled) ? 0.5 : 1,
          },
        ]}
        onPress={isValid ? handleRedeem : handleValidate}
        disabled={!code.trim() || isLoading || disabled}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={palette.onPrimary} />
        ) : (
          <>
            <Ionicons
              name={isValid ? 'gift-outline' : 'checkmark-circle-outline'}
              size={20}
              color={palette.onPrimary}
            />
            <ThemedText style={[styles.buttonText, { color: palette.onPrimary }]}>
              {isValid ? 'Redeem Code' : 'Apply Code'}
            </ThemedText>
          </>
        )}
      </Pressable>

      {/* Loading state messages */}
      {validationState === 'validating' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.loadingMessage}>
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Validating code...
          </ThemedText>
        </Animated.View>
      )}

      {validationState === 'redeeming' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.loadingMessage}>
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Applying credit to your wallet...
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: { ...Typography.subheading, flex: 1,
    letterSpacing: 1 },
  clearButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  validText: { ...Typography.smallSemiBold },
  errorText: { ...Typography.smallSemiBold },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.xs,
  },
  buttonText: { ...Typography.subheading },
  loadingMessage: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  loadingText: { ...Typography.small },
});
