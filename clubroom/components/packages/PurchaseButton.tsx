import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { walletService } from '@/services/wallet-service';
import { packageService } from '@/services/package-service';
import type { SessionPackage } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
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
        console.error('Failed to get wallet balance:', error);
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
        pkg.id
      );

      if (result.success && result.purchase) {
        onPurchaseSuccess?.(result.purchase.id);
      } else {
        onPurchaseError?.(result.error || 'Purchase failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      onPurchaseError?.(message);
    } finally {
      setPurchasing(false);
    }
  };

  const handleTopUp = () => {
    router.push('/(tabs)/wallet');
  };

  if (loading) {
    return (
      <View style={[styles.button, styles.buttonLoading, { backgroundColor: palette.surface }]}>
        <ActivityIndicator size="small" color={palette.tint} />
        <ThemedText style={[styles.buttonText, { color: palette.muted }]}>
          Checking balance...
        </ThemedText>
      </View>
    );
  }

  if (!hasSufficientBalance) {
    return (
      <View style={styles.container}>
        {/* Insufficient Balance Warning */}
        <View style={[styles.warningBanner, { backgroundColor: `${palette.warning}15` }]}>
          <Ionicons name="wallet-outline" size={16} color={palette.warning} />
          <View style={styles.warningTextContainer}>
            <ThemedText style={[styles.warningText, { color: palette.warning }]}>
              Insufficient balance
            </ThemedText>
            <ThemedText style={[styles.warningSubtext, { color: palette.muted }]}>
              You need {packageService.formatPrice(shortfall, pkg.currency || 'GBP')} more
            </ThemedText>
          </View>
        </View>

        {/* Top Up Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: palette.tint }]}
          onPress={handleTopUp}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <ThemedText style={styles.buttonTextWhite}>
            Top Up Wallet
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Balance Info */}
      <View style={styles.balanceInfo}>
        <Ionicons name="wallet-outline" size={14} color={palette.success} />
        <ThemedText style={[styles.balanceText, { color: palette.success }]}>
          Balance: {packageService.formatPrice(balance, pkg.currency || 'GBP')}
        </ThemedText>
      </View>

      {/* Purchase Button */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: palette.tint },
          (disabled || purchasing) && styles.buttonDisabled,
        ]}
        onPress={handlePurchase}
        disabled={disabled || purchasing}
      >
        {purchasing ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <ThemedText style={styles.buttonTextWhite}>Processing...</ThemedText>
          </>
        ) : (
          <>
            <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.buttonTextWhite}>
              {label || `Buy for ${packageService.formatPrice(pkg.price, pkg.currency || 'GBP')}`}
            </ThemedText>
          </>
        )}
      </TouchableOpacity>
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
    borderColor: 'rgba(0,0,0,0.1)',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextWhite: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningSubtext: {
    fontSize: 12,
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xs,
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default PurchaseButton;
