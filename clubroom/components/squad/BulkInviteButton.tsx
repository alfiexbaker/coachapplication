/**
 * Bulk Invite Button Component
 *
 * A primary action button for sending bulk invites to selected squad members.
 * Features:
 * - Shows count of selected members
 * - Loading state during send
 * - Disabled state when no members selected
 * - Configurable styles and labels
 */

import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface BulkInviteButtonProps {
  selectedCount: number;
  notificationCount: number;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  fullWidth?: boolean;
}

export function BulkInviteButton({
  selectedCount,
  notificationCount,
  onPress,
  loading = false,
  disabled = false,
  label,
  loadingLabel = 'Sending...',
  variant = 'primary',
  size = 'large',
  showIcon = true,
  fullWidth = true,
}: BulkInviteButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isDisabled = disabled || loading || selectedCount === 0;

  // Generate label
  const buttonLabel = loading
    ? loadingLabel
    : label ||
      (selectedCount === 0
        ? 'Select members to invite'
        : `Send ${notificationCount} Invite${notificationCount !== 1 ? 's' : ''}`);

  // Get styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: `${palette.tint}15`,
          borderColor: palette.tint,
          textColor: palette.tint,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: palette.border,
          textColor: palette.text,
        };
      default:
        return {
          backgroundColor: palette.tint,
          borderColor: palette.tint,
          textColor: '#ffffff',
        };
    }
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: Spacing.xs,
          paddingHorizontal: Spacing.md,
          fontSize: 13,
          iconSize: 16,
        };
      case 'medium':
        return {
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.md,
          fontSize: 14,
          iconSize: 18,
        };
      default:
        return {
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          fontSize: 15,
          iconSize: 20,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, fullWidth && styles.fullWidth]}>
      <Clickable
        onPress={onPress}
        disabled={isDisabled}
        style={[
          styles.button,
          {
            backgroundColor: variantStyles.backgroundColor,
            borderColor: variantStyles.borderColor,
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            opacity: isDisabled ? 0.5 : 1,
          },
          variant !== 'primary' && styles.outlineButton,
          fullWidth && styles.fullWidth,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variantStyles.textColor} />
        ) : showIcon ? (
          <Ionicons
            name="paper-plane"
            size={sizeStyles.iconSize}
            color={variantStyles.textColor}
          />
        ) : null}
        <ThemedText
          style={[
            styles.buttonText,
            {
              color: variantStyles.textColor,
              fontSize: sizeStyles.fontSize,
            },
          ]}
        >
          {buttonLabel}
        </ThemedText>
      </Clickable>

      {/* Selection summary below button */}
      {selectedCount > 0 && !loading && (
        <View style={styles.summaryRow}>
          <Ionicons name="people" size={14} color={palette.muted} />
          <ThemedText style={[styles.summaryText, { color: palette.muted }]}>
            {selectedCount} athlete{selectedCount !== 1 ? 's' : ''} selected
            {notificationCount !== selectedCount && (
              <ThemedText style={{ color: palette.muted }}>
                {' '}({notificationCount} notification{notificationCount !== 1 ? 's' : ''})
              </ThemedText>
            )}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

/**
 * Compact version of the bulk invite button for inline use
 */
interface CompactBulkInviteButtonProps {
  selectedCount: number;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function CompactBulkInviteButton({
  selectedCount,
  onPress,
  loading = false,
  disabled = false,
}: CompactBulkInviteButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isDisabled = disabled || loading || selectedCount === 0;

  return (
    <Clickable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.compactButton,
        {
          backgroundColor: palette.tint,
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name="paper-plane" size={16} color="#fff" />
          <ThemedText style={styles.compactButtonText}>
            Invite {selectedCount}
          </ThemedText>
        </>
      )}
    </Clickable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  fullWidth: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  outlineButton: {
    borderWidth: 1.5,
  },
  buttonText: {
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  summaryText: {
    fontSize: 12,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  compactButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
