import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { walletService } from '@/services/wallet-service';
import { packageService } from '@/services/package-service';
import type { SessionPackage } from '@/constants/types';

const logger = createLogger('PurchaseButton');

/**
 * Props for the PurchaseButton component
 */
export interface PurchaseButtonProps {
  /** The package to purchase */
  pkg: SessionPackage;
  /** Callback when purchase is successful */
  onPurchaseSuccess?: (purchaseId: string) => void;
  /** Callback when purchase fails */
  onPurchaseError?: (error: string) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Custom button label */
  label?: string;
}

/**
 * Button component for purchasing a session package.
 * Checks wallet balance and handles the purchase flow.
 */
export function PurchaseButton({
  pkg,
  onPurchaseSuccess,
  onPurchaseError,
  disabled = false,
  label,
}: PurchaseButtonProps) {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Check wallet balance
  useEffect(() => {
    async function checkBalance() {
      if (!currentUser?.id) return;
      setLoading(true);
      try {
        const walletBalance = await walletService.getBalance(currentUser.id);
        setBalance(walletBalance);
      } catch (error) {
        logger.error('Failed to get wallet balance', error);
      } finally {
        setLoading(false);
      }
    }
    checkBalance();
  }, [currentUser?.id]);

  const hasSufficientBalance = balance !== null && balance >= pkg.price;
  const shortfall = balance !== null ? pkg.price - balance : 0;

  const handlePurchase = async () => {
    if (!currentUser?.id || !hasSufficientBalance || purchasing) return;

    setPurchasing(true);
    try {
      const result = await packageService.purchasePackage(
        currentUser.id,
        currentUser.fullName || currentUser.name || 'User',
        pkg.id,
      );

      if (result.success) {
        onPurchaseSuccess?.(result.data.purchase.id);
      } else {
        onPurchaseError?.(result.error.message || 'Purchase failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      onPurchaseError?.(message);
    } finally {
      setPurchasing(false);
    }
  };

  const handleTopUp = () => {
    router.push(Routes.WALLET);
  };

  if (loading) {
    return (
      <Row
        align="center"
        justify="center"
        gap="xs"
        style={[
          styles.button,
          styles.buttonLoading,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <ActivityIndicator size="small" color={palette.tint} />
        <ThemedText style={[styles.buttonText, { color: palette.muted }]}>
          Checking balance...
        </ThemedText>
      </Row>
    );
  }

  if (!hasSufficientBalance) {
    return (
      <View style={styles.container}>
        {/* Insufficient Balance Warning */}
        <Row
          align="center"
          gap="sm"
          style={[styles.warningBanner, { backgroundColor: withAlpha(palette.warning, 0.09) }]}
        >
          <Ionicons name="wallet-outline" size={16} color={palette.warning} />
          <View style={styles.warningTextContainer}>
            <ThemedText style={[styles.warningText, { color: palette.warning }]}>
              Insufficient balance
            </ThemedText>
            <ThemedText style={[styles.warningSubtext, { color: palette.muted }]}>
              You need {packageService.formatPrice(shortfall, pkg.currency || 'GBP')} more
            </ThemedText>
          </View>
        </Row>

        {/* Top Up Button */}
        <Clickable
          style={[styles.button, { backgroundColor: palette.tint }]}
          onPress={handleTopUp}
          accessibilityRole="button"
          accessibilityLabel="Top up wallet"
        >
          <Ionicons name="add-circle-outline" size={20} color={palette.onPrimary} />
          <ThemedText style={[styles.buttonTextWhite, { color: palette.onPrimary }]}>
            Top Up Wallet
          </ThemedText>
        </Clickable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Balance Info */}
      <Row align="center" gap="xxs" style={styles.balanceInfo}>
        <Ionicons name="wallet-outline" size={14} color={palette.success} />
        <ThemedText style={[styles.balanceText, { color: palette.success }]}>
          Balance: {packageService.formatPrice(balance, pkg.currency || 'GBP')}
        </ThemedText>
      </Row>

      {/* Purchase Button */}
      <Clickable
        style={[
          styles.button,
          { backgroundColor: palette.tint },
          disabled || purchasing ? styles.buttonDisabled : undefined,
        ]}
        onPress={handlePurchase}
        disabled={disabled || purchasing}
        accessibilityRole="button"
        accessibilityLabel="Purchase package"
        accessibilityState={{ disabled: disabled || purchasing }}
      >
        {purchasing ? (
          <>
            <ActivityIndicator size="small" color={palette.onPrimary} />
            <ThemedText style={[styles.buttonTextWhite, { color: palette.onPrimary }]}>
              Processing...
            </ThemedText>
          </>
        ) : (
          <>
            <Ionicons name="cart-outline" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.buttonTextWhite, { color: palette.onPrimary }]}>
              {label || `Buy for ${packageService.formatPrice(pkg.price, pkg.currency || 'GBP')}`}
            </ThemedText>
          </>
        )}
      </Clickable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
  },
  buttonLoading: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { ...Typography.subheading },
  buttonTextWhite: { ...Typography.subheading },
  warningBanner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningText: { ...Typography.bodySmallSemiBold },
  warningSubtext: { ...Typography.caption },
  balanceInfo: {
    paddingHorizontal: Spacing.xs,
  },
  balanceText: { ...Typography.smallSemiBold },
});

export default PurchaseButton;
