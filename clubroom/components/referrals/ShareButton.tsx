/**
 * ShareButton Component
 *
 * Native share integration for referral codes.
 * Uses the device's native share sheet to share referral links.
 */

import { useCallback } from 'react';
import { Share, StyleSheet, Alert, Platform, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import { referralService } from '@/services/referral-service';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { SharePreview } from './share-button-sections';
export type { SharePreviewProps } from './share-button-sections';

const logger = createLogger('ShareButton');

interface ShareButtonProps {
  code: string;
  userName: string;
  creditAmount: number;
  variant?: 'default' | 'icon' | 'outline';
  size?: 'small' | 'medium' | 'large';
  onShare?: () => void;
  onShareComplete?: (success: boolean) => void;
  customMessage?: string;
  label?: string;
  disabled?: boolean;
}

export function ShareButton({
  code,
  userName,
  creditAmount,
  variant = 'default',
  size = 'medium',
  onShare,
  onShareComplete,
  customMessage,
  label = 'Invite Friends',
  disabled = false,
}: ShareButtonProps) {
  const { colors: palette } = useTheme();

  const handleShare = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShare?.();

    const message = customMessage || referralService.getShareMessage(code, userName, creditAmount);
    const url = referralService.getShareUrl(code);

    try {
      const result = await Share.share(
        Platform.select({
          ios: { message, url },
          android: { message: `${message}\n${url}` },
          default: { message: `${message}\n${url}` },
        }) as { message: string; url?: string },
        {
          dialogTitle: 'Share your referral code',
          subject: `Join me on Clubroom - Use code ${code}`,
        }
      );

      if (result.action === Share.sharedAction) {
        onShareComplete?.(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.action === Share.dismissedAction) {
        onShareComplete?.(false);
      }
    } catch (error) {
      logger.error('Share error', error);
      Alert.alert('Error', 'Failed to open share dialog');
      onShareComplete?.(false);
    }
  }, [code, userName, creditAmount, customMessage, onShare, onShareComplete]);

  if (variant === 'icon') {
    return (
      <Clickable
        onPress={handleShare}
        disabled={disabled}
        style={[
          styles.iconButton,
          { backgroundColor: palette.tint },
          disabled ? styles.disabledButton : undefined,
        ].filter(Boolean) as ViewStyle[]}
      >
        <Ionicons name="share-social-outline" size={20} color={palette.onPrimary} />
      </Clickable>
    );
  }

  if (variant === 'outline') {
    return (
      <Clickable
        onPress={handleShare}
        disabled={disabled}
        style={[
          styles.outlineButton,
          {
            borderColor: palette.tint,
            paddingVertical: size === 'small' ? Spacing.xs : size === 'large' ? Spacing.md : Spacing.sm,
          },
          disabled ? styles.disabledButton : undefined,
        ].filter(Boolean) as ViewStyle[]}
      >
        <Ionicons
          name="share-social-outline"
          size={size === 'small' ? 16 : size === 'large' ? 22 : 18}
          color={palette.tint}
        />
        <Ionicons
          name="chevron-forward"
          size={size === 'small' ? 14 : size === 'large' ? 18 : 16}
          color={palette.tint}
          style={styles.labelText}
        />
      </Clickable>
    );
  }

  return (
    <Button
      onPress={handleShare}
      disabled={disabled}
      style={[
        styles.defaultButton,
        size === 'small' && styles.smallButton,
        size === 'large' && styles.largeButton,
      ].filter(Boolean) as ViewStyle[]}
    >
      <Ionicons
        name="share-social-outline"
        size={size === 'small' ? 16 : size === 'large' ? 22 : 18}
        color={palette.onPrimary}
      />
      {label}
    </Button>
  );
}

const styles = StyleSheet.create({
  defaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  smallButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  largeButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderRadius: Radii.xl,
  },
  labelText: {
    marginLeft: Spacing.micro,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
