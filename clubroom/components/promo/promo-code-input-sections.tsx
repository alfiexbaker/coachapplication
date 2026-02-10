import { memo } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { promoService } from '@/services/promo-service';
import type { ThemeColors } from '@/hooks/useTheme';

/* ---------- ValidationMessage ---------- */

export interface ValidationMessageProps {
  isValid: boolean;
  isInvalid: boolean;
  creditAmount?: number;
  errorMessage: string | null;
  palette: ThemeColors;
}

export const ValidationMessage = memo(function ValidationMessage({
  isValid,
  isInvalid,
  creditAmount,
  errorMessage,
  palette,
}: ValidationMessageProps) {
  if (isValid && creditAmount !== undefined) {
    return (
      <Animated.View entering={FadeIn}>
        <Row align="center" gap="xs" style={styles.validationMessage}>
          <Ionicons name="checkmark-circle" size={16} color={palette.success} />
          <ThemedText style={[styles.validText, { color: palette.success }]}>
            Code valid! You will receive {promoService.formatCredit(creditAmount)}
          </ThemedText>
        </Row>
      </Animated.View>
    );
  }

  if (isInvalid && errorMessage) {
    return (
      <Animated.View entering={FadeIn}>
        <Row align="center" gap="xs" style={styles.validationMessage}>
          <Ionicons name="alert-circle" size={16} color={palette.error} />
          <ThemedText style={[styles.errorText, { color: palette.error }]}>
            {errorMessage}
          </ThemedText>
        </Row>
      </Animated.View>
    );
  }

  return null;
});

/* ---------- RedeemButton ---------- */

export interface RedeemButtonProps {
  isValid: boolean;
  isLoading: boolean;
  disabled: boolean;
  onPress: () => void;
  palette: ThemeColors;
}

export const RedeemButton = memo(function RedeemButton({
  isValid,
  isLoading,
  disabled,
  onPress,
  palette,
}: RedeemButtonProps) {
  return (
    <Clickable
      style={[
        styles.actionButton,
        {
          backgroundColor: isValid ? palette.success : palette.tint,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={palette.onPrimary} />
      ) : (
        <Row align="center" justify="center" gap="sm">
          <Ionicons
            name={isValid ? 'gift-outline' : 'checkmark-circle-outline'}
            size={20}
            color={palette.onPrimary}
          />
          <ThemedText style={[styles.buttonText, { color: palette.onPrimary }]}>
            {isValid ? 'Redeem Code' : 'Apply Code'}
          </ThemedText>
        </Row>
      )}
    </Clickable>
  );
});

/* ---------- LoadingStateMessage ---------- */

export interface LoadingStateMessageProps {
  state: 'validating' | 'redeeming' | null;
  palette: ThemeColors;
}

export const LoadingStateMessage = memo(function LoadingStateMessage({
  state,
  palette,
}: LoadingStateMessageProps) {
  if (!state) return null;

  const message = state === 'validating'
    ? 'Validating code...'
    : 'Applying credit to your wallet...';

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.loadingMessage}>
      <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
        {message}
      </ThemedText>
    </Animated.View>
  );
});

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  validationMessage: {
    paddingHorizontal: Spacing.xs,
  },
  validText: { ...Typography.smallSemiBold },
  errorText: { ...Typography.smallSemiBold },
  actionButton: {
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
