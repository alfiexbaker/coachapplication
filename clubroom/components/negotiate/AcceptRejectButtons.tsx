import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  variant = 'default',
}: AcceptRejectButtonsProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isCompact = variant === 'compact';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={palette.tint} />
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
          Processing...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      {/* Accept button */}
      <Clickable
        onPress={onAccept}
        style={[
          styles.button,
          styles.acceptButton,
          { backgroundColor: palette.success },
          isCompact && styles.buttonCompact,
        ]}
        accessibilityLabel={acceptLabel}
        accessibilityRole="button"
      >
        <Ionicons
          name="checkmark"
          size={isCompact ? 16 : 18}
          color="#FFFFFF"
        />
        <ThemedText
          style={[
            styles.buttonText,
            styles.acceptText,
            isCompact && styles.buttonTextCompact,
          ]}
        >
          {acceptLabel}
        </ThemedText>
      </Clickable>

      {/* Reject button */}
      <Clickable
        onPress={onReject}
        style={[
          styles.button,
          styles.rejectButton,
          { backgroundColor: `${palette.error}15`, borderColor: palette.error },
          isCompact && styles.buttonCompact,
        ]}
        accessibilityLabel={rejectLabel}
        accessibilityRole="button"
      >
        <Ionicons
          name="close"
          size={isCompact ? 16 : 18}
          color={palette.error}
        />
        <ThemedText
          style={[
            styles.buttonText,
            { color: palette.error },
            isCompact && styles.buttonTextCompact,
          ]}
        >
          {rejectLabel}
        </ThemedText>
      </Clickable>

      {/* Counter-propose button (optional) */}
      {showCounterPropose && onCounterPropose && (
        <Clickable
          onPress={onCounterPropose}
          style={[
            styles.button,
            styles.counterButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            isCompact && styles.buttonCompact,
          ]}
          accessibilityLabel={counterProposeLabel}
          accessibilityRole="button"
        >
          <Ionicons
            name="swap-horizontal"
            size={isCompact ? 16 : 18}
            color={palette.tint}
          />
          <ThemedText
            style={[
              styles.buttonText,
              { color: palette.tint },
              isCompact && styles.buttonTextCompact,
            ]}
          >
            {counterProposeLabel}
          </ThemedText>
        </Clickable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  containerCompact: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  buttonCompact: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  acceptButton: {},
  rejectButton: {},
  counterButton: {},
  buttonText: {
    ...Typography.sm,
    fontWeight: '600',
  },
  buttonTextCompact: {
    fontSize: 12,
  },
  acceptText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  loadingText: {
    ...Typography.sm,
  },
});
