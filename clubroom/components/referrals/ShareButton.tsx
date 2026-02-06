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
import { Colors, Spacing, Radii} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLogger } from '@/utils/logger';
import { referralService } from '@/services/referral-service';

const logger = createLogger('ShareButton');

interface ShareButtonProps {
  /** The referral code to share */
  code: string;
  /** User's name for the share message */
  userName: string;
  /** Credit amount to mention in the share message */
  creditAmount: number;
  /** Button variant */
  variant?: 'default' | 'icon' | 'outline';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Callback when share is initiated */
  onShare?: () => void;
  /** Callback when share is completed */
  onShareComplete?: (success: boolean) => void;
  /** Custom share message (overrides default) */
  customMessage?: string;
  /** Custom button label */
  label?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * Button component that triggers native share functionality.
 *
 * @example
 * ```tsx
 * <ShareButton
 *   code="JOHN-ABC123"
 *   userName="John"
 *   creditAmount={10}
 *   onShare={() => track('share_button_pressed')}
 * />
 *
 * <ShareButton
 *   code="JOHN-ABC123"
 *   userName="John"
 *   creditAmount={10}
 *   variant="icon"
 * />
 * ```
 */
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const handleShare = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShare?.();

    const message = customMessage || referralService.getShareMessage(code, userName, creditAmount);
    const url = referralService.getShareUrl(code);

    try {
      const result = await Share.share(
        Platform.select({
          ios: {
            message,
            url,
          },
          android: {
            message: `${message}\n${url}`,
          },
          default: {
            message: `${message}\n${url}`,
          },
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

  // Default full-width button
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

// ============================================================================
// SHARE PREVIEW COMPONENT
// ============================================================================

/**
 * A preview of what will be shared, useful for showing users
 * what their friends will see.
 */
interface SharePreviewProps {
  code: string;
  userName: string;
  creditAmount: number;
}

export function SharePreview({ code, userName, creditAmount }: SharePreviewProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Generate share content (used for display purposes)
  referralService.getShareMessage(code, userName, creditAmount);
  referralService.getShareUrl(code);

  return (
    <Clickable style={[styles.previewContainer, { backgroundColor: palette.background }]}>
      <Ionicons name="chatbubble-outline" size={16} color={palette.muted} />
      <Ionicons
        name="document-text-outline"
        size={14}
        color={palette.muted}
        style={styles.previewIcon}
      />
      <Ionicons
        name="link-outline"
        size={14}
        color={palette.tint}
        style={styles.previewIcon}
      />
    </Clickable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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

  // Preview
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: Spacing.xs,
  },
  previewIcon: {
    marginLeft: Spacing.xxs,
  },
});
