/**
 * Bulk Invite Button Component
 *
 * A primary action button for sending bulk invites to selected squad members.
 */

import { View, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { CompactBulkInviteButton } from './bulk-invite-button-sections';
export type { CompactBulkInviteButtonProps } from './bulk-invite-button-sections';

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
  const { colors: palette } = useTheme();
  const isDisabled = disabled || loading || selectedCount === 0;

  const buttonLabel = loading
    ? loadingLabel
    : label ||
      (selectedCount === 0
        ? 'Select members to invite'
        : `Send ${notificationCount} Invite${notificationCount !== 1 ? 's' : ''}`);

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: withAlpha(palette.tint, 0.09), borderColor: palette.tint, textColor: palette.tint };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: palette.border, textColor: palette.text };
      default:
        return { backgroundColor: palette.tint, borderColor: palette.tint, textColor: palette.onPrimary };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { ...Typography.small, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, iconSize: 16 };
      case 'medium':
        return { ...Typography.bodySmall, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, iconSize: 18 };
      default:
        return { ...Typography.body, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, iconSize: 20 };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, fullWidth ? styles.fullWidth : undefined]}>
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
        ].filter(Boolean) as ViewStyle[]}
      >
        <Row align="center" justify="center" gap="sm">
          {loading ? (
            <ActivityIndicator size="small" color={variantStyles.textColor} />
          ) : showIcon ? (
            <Ionicons name="paper-plane" size={sizeStyles.iconSize} color={variantStyles.textColor} />
          ) : null}
          <ThemedText style={[styles.buttonText, { color: variantStyles.textColor, fontSize: sizeStyles.fontSize }]}>
            {buttonLabel}
          </ThemedText>
        </Row>
      </Clickable>

      {selectedCount > 0 && !loading && (
        <Row align="center" justify="center" gap="xs">
          <Ionicons name="people" size={14} color={palette.muted} />
          <ThemedText style={[styles.summaryText, { color: palette.muted }]}>
            {selectedCount} athlete{selectedCount !== 1 ? 's' : ''} selected
            {notificationCount !== selectedCount && (
              <ThemedText style={{ color: palette.muted }}>
                {' '}({notificationCount} notification{notificationCount !== 1 ? 's' : ''})
              </ThemedText>
            )}
          </ThemedText>
        </Row>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  fullWidth: { width: '100%' },
  button: { borderRadius: Radii.md, borderWidth: 1.5 },
  outlineButton: { borderWidth: 1.5 },
  buttonText: { fontWeight: '700' },
  summaryText: { ...Typography.caption },
});
