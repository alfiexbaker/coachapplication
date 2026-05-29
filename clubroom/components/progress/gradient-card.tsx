import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { Radii, Spacing, withAlpha } from '@/constants/theme';
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
export const GradientCard = function GradientCard({
  gradient,
  children,
  style,
  borderColor,
  glowColor,
}: GradientCardProps) {
  const { colors } = useTheme();

  const gradientUri = buildLinearGradientUri(gradient, Radii.card);

  const resolvedBorder = borderColor ?? withAlpha(colors.border, 0.3);
  const resolvedGlow = glowColor ?? withAlpha(gradient[1], 0.08);

  return (
    <View
      style={[
        styles.outer,
        {
          boxShadow: `0px 8px 22px ${resolvedGlow}`,
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
};

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
