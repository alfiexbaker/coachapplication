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
import { ShareButton } from './ShareButton';
import { Spacing, Radii, Components, withAlpha } from '@/constants/theme';
import { referralService } from '@/services/referral-service';
import { scaleFont } from '@/utils/scale';
import type { ReferralCode } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { CompactCodeCard, CodeDisplay } from './referral-code-card-sections';
export type { CompactCodeCardProps, CodeDisplayProps } from './referral-code-card-sections';

import { CompactCodeCard, CodeDisplay } from './referral-code-card-sections';

interface ReferralCodeCardProps {
  referralCode: ReferralCode;
  userName: string;
  onShare?: () => void;
  variant?: 'default' | 'compact';
}

export function ReferralCodeCard({
  referralCode,
  userName,
  onShare,
  variant = 'default',
}: ReferralCodeCardProps) {
  const { colors: palette } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(referralCode.code);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to copy code to clipboard');
    }
  }, [referralCode.code]);

  const creditText = referralService.formatCredit(referralCode.creditAmount);

  if (variant === 'compact') {
    return (
      <CompactCodeCard
        referralCode={referralCode}
        userName={userName}
        copied={copied}
        onCopy={handleCopy}
        onShare={onShare}
        palette={palette}
      />
    );
  }

  return (
    <SurfaceCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
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

      <CodeDisplay code={referralCode.code} copied={copied} onCopy={handleCopy} palette={palette} />

      <ShareButton
        code={referralCode.code}
        userName={userName}
        creditAmount={referralCode.creditAmount}
        onShare={onShare}
      />

      <ThemedText style={[styles.infoText, { color: palette.muted }]}>
        Your friend gets {creditText} credit too when they complete their first booking
      </ThemedText>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Components.card.padding,
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
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: {
    fontSize: scaleFont(18),
  },
  subtitle: {
    fontSize: scaleFont(14),
  },
  infoText: {
    fontSize: scaleFont(13),
    textAlign: 'center',
    lineHeight: scaleFont(18),
  },
});
