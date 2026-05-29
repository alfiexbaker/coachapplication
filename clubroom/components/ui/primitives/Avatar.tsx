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

import React, { useEffect, useRef, useState, startTransition } from 'react';
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
  /** Alias for online status indicator */
  isOnline?: boolean;
  /** Accessible label override */
  accessibilityLabel?: string;
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

function clearRetryTimeout(ref: { current: ReturnType<typeof setTimeout> | null }) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AvatarInner({
  uri,
  name,
  size = 'md',
  online,
  isOnline,
  accessibilityLabel,
}: AvatarProps) {
  const { colors } = useTheme();
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimension = DIMENSION_MAP[size];
  const fontConfig = FONT_MAP[size];
  const indicatorSize = INDICATOR_SIZE_MAP[size];
  const indicatorBorder = INDICATOR_BORDER_MAP[size];

  const isOnlineResolved = isOnline ?? online ?? false;
  const showImage = uri && !hasError;
  const initials = name ? getInitials(name) : '?';
  const resolvedAccessibilityLabel =
    accessibilityLabel ??
    (name
      ? `${name}'s profile photo${isOnlineResolved ? ', online' : ''}`
      : `User profile photo${isOnlineResolved ? ', online' : ''}`);

  // react-doctor-disable-next-line react-doctor/no-reset-all-state-on-prop-change -- image retry state must reset when the avatar URI changes.
  useEffect(() => {
    clearRetryTimeout(retryTimeoutRef);
    startTransition(() => {
      setHasError(false);
    });
    startTransition(() => {
      setRetryCount(0);
    });
  }, [uri]);

  useEffect(() => {
    return () => {
      clearRetryTimeout(retryTimeoutRef);
    };
  }, []);

  const themedStyles = {
    image: { backgroundColor: colors.border },

    placeholder: {
      backgroundColor: withAlpha(colors.tint, 0.09),
    },

    initials: { color: colors.tint },
    indicator: { borderColor: colors.surface },
  };

  const handleImageError = () => {
    if (!uri) {
      setHasError(true);
      return;
    }

    if (retryCount >= 2) {
      setHasError(true);
      return;
    }

    const nextRetry = retryCount + 1;
    retryTimeoutRef.current = setTimeout(() => {
      setRetryCount(nextRetry);
      retryTimeoutRef.current = null;
    }, nextRetry * 1000);
  };

  return (
    <View
      style={[styles.wrapper, { width: dimension, height: dimension }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={resolvedAccessibilityLabel}
    >
      {showImage ? (
        <Image
          source={{
            uri: retryCount > 0 ? `${uri}${uri.includes('?') ? '&' : '?'}retry=${retryCount}` : uri,
          }}
          style={[
            themedStyles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
          onError={handleImageError}
          accessible={false}
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
          accessible={false}
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

      {(isOnline != null || online != null) && (
        <View
          accessible={false}
          style={[
            styles.indicator,
            themedStyles.indicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              borderWidth: indicatorBorder,
              backgroundColor: isOnlineResolved ? colors.success : colors.muted,
            },
          ]}
        />
      )}
    </View>
  );
}

export const Avatar = AvatarInner;

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
