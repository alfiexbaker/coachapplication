/**
 * Avatar Primitive
 *
 * Image with fallback initials and optional online indicator.
 *
 * Sizes: sm (32), md (44), lg (64), xl (80) — from Components.avatar
 *
 * Usage:
 *   <Avatar uri="https://example.com/photo.jpg" name="John Doe" />
 *   <Avatar name="AB" size="lg" online />
 *   <Avatar uri={imageUrl} size="xl" />
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Components, Fonts, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /** Image URI */
  uri?: string | null;
  /** Full name for generating initials fallback */
  name?: string;
  /** Size preset */
  size?: AvatarSize;
  /** Show online status indicator */
  online?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ---------------------------------------------------------------------------
// Size configuration
// ---------------------------------------------------------------------------

const DIMENSION_MAP: Record<AvatarSize, number> = {
  sm: Components.avatar.sm,
  md: Components.avatar.md,
  lg: Components.avatar.lg,
  xl: Components.avatar.xl,
};

interface FontSizeConfig {
  fontSize: number;
  lineHeight: number;
}

const FONT_MAP: Record<AvatarSize, FontSizeConfig> = {
  sm: { fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight },
  md: { fontSize: Typography.body.fontSize, lineHeight: Typography.body.lineHeight },
  lg: { fontSize: Typography.title.fontSize, lineHeight: Typography.title.lineHeight },
  xl: { fontSize: Typography.display.fontSize, lineHeight: Typography.display.lineHeight },
};

const INDICATOR_SIZE_MAP: Record<AvatarSize, number> = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
};

const INDICATOR_BORDER_MAP: Record<AvatarSize, number> = {
  sm: 1.5,
  md: 2,
  lg: 2.5,
  xl: 3,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AvatarInner({ uri, name, size = 'md', online }: AvatarProps) {
  const { colors } = useTheme();
  const [hasError, setHasError] = useState(false);
  const dimension = DIMENSION_MAP[size];
  const fontConfig = FONT_MAP[size];
  const indicatorSize = INDICATOR_SIZE_MAP[size];
  const indicatorBorder = INDICATOR_BORDER_MAP[size];

  const showImage = uri && !hasError;
  const initials = name ? getInitials(name) : '?';

  const themedStyles = useMemo(
    () => ({
      image: { backgroundColor: colors.border },
      placeholder: {
        backgroundColor: withAlpha(colors.tint, 0.09),
      },
      initials: { color: colors.tint },
      indicator: { borderColor: colors.surface },
    }),
    [colors],
  );

  return (
    <View style={[styles.wrapper, { width: dimension, height: dimension }]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={[
            themedStyles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
          onError={() => setHasError(true)}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            themedStyles.placeholder,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              themedStyles.initials,
              {
                fontSize: fontConfig.fontSize,
                lineHeight: fontConfig.lineHeight,
                fontFamily: Fonts?.sans,
              },
            ]}
            numberOfLines={1}
          >
            {initials}
          </Text>
        </View>
      )}

      {online != null && (
        <View
          style={[
            styles.indicator,
            themedStyles.indicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              borderWidth: indicatorBorder,
              backgroundColor: online ? colors.success : colors.muted,
            },
          ]}
        />
      )}
    </View>
  );
}

export const Avatar = React.memo(AvatarInner);

// ---------------------------------------------------------------------------
// Styles (color-independent)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});
