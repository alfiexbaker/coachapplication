/**
 * ReferralCodeCard Component
 *
 * Displays a user's referral code with copy and share functionality.
 * Shows the code prominently with action buttons for easy sharing.
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ShareButton } from './ShareButton';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { referralService } from '@/services/referral-service';
import { scaleFont } from '@/utils/scale';
import type { ReferralCode } from '@/constants/types';

interface ReferralCodeCardProps {
  /** The referral code to display */
  referralCode: ReferralCode;
  /** User's name for sharing context */
  userName: string;
  /** Callback when share is initiated */
  onShare?: () => void;
  /** Display variant */
  variant?: 'default' | 'compact';
}

/**
 * Card displaying the user's referral code with copy/share actions.
 *
 * @example
 * ```tsx
 * <ReferralCodeCard
 *   referralCode={userCode}
 *   userName="John"
 *   onShare={() => analytics.track('share_initiated')}
 * />
 * ```
 */
export function ReferralCodeCard({
  referralCode,
  userName,
  onShare,
  variant = 'default',
}: ReferralCodeCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(referralCode.code);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy code to clipboard');
    }
  }, [referralCode.code]);

  const creditText = referralService.formatCredit(referralCode.creditAmount);

  if (variant === 'compact') {
    return (
      <SurfaceCard style={styles.compactCard}>
        <View style={styles.compactContent}>
          <View style={styles.compactLeft}>
            <ThemedText style={[styles.compactLabel, { color: palette.muted }]}>
              Your code
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.compactCode}>
              {referralCode.code}
            </ThemedText>
          </View>
          <View style={styles.compactActions}>
            <Clickable
              onPress={handleCopy}
              style={[styles.iconButton, { backgroundColor: palette.surface }]}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={20}
                color={copied ? palette.success : palette.icon}
              />
            </Clickable>
            <ShareButton
              code={referralCode.code}
              userName={userName}
              creditAmount={referralCode.creditAmount}
              variant="icon"
              onShare={onShare}
            />
          </View>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="gift-outline" size={24} color={palette.tint} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="subtitle" style={styles.title}>
            Share and Earn
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Get {creditText} for each friend who signs up
          </ThemedText>
        </View>
      </View>

      {/* Code Display */}
      <View style={[styles.codeContainer, { backgroundColor: palette.background }]}>
        <ThemedText style={[styles.codeLabel, { color: palette.muted }]}>
          Your referral code
        </ThemedText>
        <View style={styles.codeRow}>
          <ThemedText type="title" style={styles.code}>
            {referralCode.code}
          </ThemedText>
          <Clickable
            onPress={handleCopy}
            style={[
              styles.copyButton,
              { backgroundColor: copied ? `${palette.success}15` : palette.surface },
            ]}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={20}
              color={copied ? palette.success : palette.icon}
            />
            <ThemedText
              style={[
                styles.copyText,
                { color: copied ? palette.success : palette.text },
              ]}
            >
              {copied ? 'Copied!' : 'Copy'}
            </ThemedText>
          </Clickable>
        </View>
      </View>

      {/* Share Button */}
      <ShareButton
        code={referralCode.code}
        userName={userName}
        creditAmount={referralCode.creditAmount}
        onShare={onShare}
      />

      {/* Info Text */}
      <ThemedText style={[styles.infoText, { color: palette.muted }]}>
        Your friend gets {creditText} credit too when they complete their first booking
      </ThemedText>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: scaleFont(18),
  },
  subtitle: {
    fontSize: scaleFont(14),
  },
  codeContainer: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  codeLabel: {
    fontSize: scaleFont(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  code: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    gap: 4,
  },
  copyText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  infoText: {
    fontSize: scaleFont(13),
    textAlign: 'center',
    lineHeight: scaleFont(18),
  },

  // Compact variant
  compactCard: {
    padding: Spacing.md,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactLeft: {
    gap: 2,
  },
  compactLabel: {
    fontSize: scaleFont(11),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactCode: {
    fontSize: scaleFont(18),
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  compactActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
