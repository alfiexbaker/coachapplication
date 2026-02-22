import { memo, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { Radii, Shadows, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { buildLinearGradientUri } from '@/components/primitives/surface-card-utils';

interface GradientCardProps {
  gradient: [string, string];
  children: ReactNode;
  style?: ViewStyle;
  borderColor?: string;
  glowColor?: string;
}

/**
 * Premium card wrapper with gradient background + inner glow + subtle border.
 * Replaces SurfaceCard on key "wow" components.
 */
export const GradientCard = memo(function GradientCard({
  gradient,
  children,
  style,
  borderColor,
  glowColor,
}: GradientCardProps) {
  const { colors, scheme } = useTheme();

  const gradientUri = useMemo(
    () => buildLinearGradientUri(gradient, Radii.card),
    [gradient],
  );

  const resolvedBorder = borderColor ?? withAlpha(colors.border, 0.3);
  const resolvedGlow = glowColor ?? withAlpha(gradient[1], 0.08);

  return (
    <View
      style={[
        styles.outer,
        {
          shadowColor: Shadows[scheme].card.shadowColor,
          shadowOpacity: Shadows[scheme].card.shadowOpacity * 1.3,
          shadowRadius: Shadows[scheme].card.shadowRadius + 4,
          shadowOffset: Shadows[scheme].card.shadowOffset,
          elevation: (Shadows[scheme].card.elevation ?? 0) + 2,
        },
        style,
      ]}
    >
      <View style={[styles.inner, { borderColor: resolvedBorder }]}>
        <Image
          source={{ uri: gradientUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        {/* Inner glow overlay */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: resolvedGlow }]}
        />
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    borderRadius: Radii.card,
  },
  inner: {
    borderRadius: Radii.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: Spacing.sm,
  },
});
