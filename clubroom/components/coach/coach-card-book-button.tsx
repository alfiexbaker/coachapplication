import { StyleSheet } from 'react-native';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Components, Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface BookButtonProps {
  coachName: string;
  onPress: () => void;
  label?: string;
  variant?: 'primary' | 'compact';
}

export function BookButton({
  coachName,
  onPress,
  label = 'Book Now',
  variant = 'primary',
}: BookButtonProps) {
  const { colors: palette } = useTheme();

  if (variant === 'compact') {
    return (
      <Clickable
        accessibilityLabel={`Book ${coachName}`}
        onPress={onPress}
        style={[styles.bookButtonCompact, { backgroundColor: palette.tint }]}
      >
        <ThemedText style={[styles.bookButtonText, { color: palette.onPrimary }]}>
          {label}
        </ThemedText>
      </Clickable>
    );
  }

  return (
    <Button
      onPress={onPress}
      variant="primary"
      style={styles.bookButtonPrimary}
      accessibilityLabel={`Book ${coachName}`}
    >
      {label}
    </Button>
  );
}

const styles = StyleSheet.create({
  bookButtonCompact: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonPrimary: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  bookButtonText: {
    ...Typography.bodySemiBold,
  },
});
