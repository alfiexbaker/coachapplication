import { View, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface AcceptRejectButtonsProps {
  onAccept: () => void;
  onReject: () => void;
  onCounterPropose?: () => void;
  isLoading?: boolean;
  acceptLabel?: string;
  rejectLabel?: string;
  counterProposeLabel?: string;
  showCounterPropose?: boolean;
  variant?: 'default' | 'compact';
}

export function AcceptRejectButtons({
  onAccept,
  onReject,
  onCounterPropose,
  isLoading = false,
  acceptLabel = 'Accept',
  rejectLabel = 'Decline',
  counterProposeLabel = 'Counter',
  showCounterPropose = true,
  variant = 'default' }: AcceptRejectButtonsProps) {
  const { colors: palette } = useTheme();

  const isCompact = variant === 'compact';

  if (isLoading) {
    return (
      <Row align="center" justify="center" gap="sm" style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={palette.tint} />
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
          Processing...
        </ThemedText>
      </Row>
    );
  }

  return (
    <Row gap={isCompact ? "xs" : "sm"} style={[styles.container, isCompact ? styles.containerCompact : undefined]}>
      {/* Accept button */}
      <Clickable
        onPress={onAccept}
        style={[
          styles.button,
          styles.acceptButton,
          { backgroundColor: palette.success },
          isCompact ? styles.buttonCompact : undefined,
        ].filter(Boolean) as ViewStyle[]}
        accessibilityLabel={acceptLabel}
        accessibilityRole="button"
      >
        <Row align="center" justify="center" gap="xxs">
          <Ionicons
            name="checkmark"
            size={isCompact ? 16 : 18}
            color={palette.onPrimary}
          />
          <ThemedText
            style={[
              styles.buttonText,
              styles.acceptText,
              { color: palette.onPrimary },
              isCompact ? styles.buttonTextCompact : undefined,
            ]}
          >
            {acceptLabel}
          </ThemedText>
        </Row>
      </Clickable>

      {/* Reject button */}
      <Clickable
        onPress={onReject}
        style={[
          styles.button,
          styles.rejectButton,
          { backgroundColor: withAlpha(palette.error, 0.09), borderColor: palette.error },
          isCompact ? styles.buttonCompact : undefined,
        ].filter(Boolean) as ViewStyle[]}
        accessibilityLabel={rejectLabel}
        accessibilityRole="button"
      >
        <Row align="center" justify="center" gap="xxs">
          <Ionicons
            name="close"
            size={isCompact ? 16 : 18}
            color={palette.error}
          />
          <ThemedText
            style={[
              styles.buttonText,
              { color: palette.error },
              isCompact ? styles.buttonTextCompact : undefined,
            ]}
          >
            {rejectLabel}
          </ThemedText>
        </Row>
      </Clickable>

      {/* Counter-propose button (optional) */}
      {showCounterPropose && onCounterPropose && (
        <Clickable
          onPress={onCounterPropose}
          style={[
            styles.button,
            styles.counterButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            isCompact ? styles.buttonCompact : undefined,
          ].filter(Boolean) as ViewStyle[]}
          accessibilityLabel={counterProposeLabel}
          accessibilityRole="button"
        >
          <Row align="center" justify="center" gap="xxs">
            <Ionicons
              name="swap-horizontal"
              size={isCompact ? 16 : 18}
              color={palette.tint}
            />
            <ThemedText
              style={[
                styles.buttonText,
                { color: palette.tint },
                isCompact ? styles.buttonTextCompact : undefined,
              ]}
            >
              {counterProposeLabel}
            </ThemedText>
          </Row>
        </Clickable>
      )}
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm },
  containerCompact: {
    marginTop: Spacing.xs },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent' },
  buttonCompact: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs },
  acceptButton: {},
  rejectButton: {},
  counterButton: {},
  buttonText: {
    ...Typography.sm,
    fontWeight: '600' },
  buttonTextCompact: { ...Typography.caption },
  acceptText: {},
  loadingContainer: {
    paddingVertical: Spacing.md },
  loadingText: {
    ...Typography.sm } });
