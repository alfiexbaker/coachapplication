import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const shimmerPresets = {
  light: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'],
  dark: ['rgba(0,0,0,0)', 'rgba(255,255,255,0.25)', 'rgba(0,0,0,0)'],
} as const;

type BasePressableProps = Omit<PressableProps, 'style' | 'onPressIn' | 'onPressOut' | 'onLayout'>;

export type SurfaceCardProps = PropsWithChildren<
  BasePressableProps & {
    style?: StyleProp<ViewStyle>;
    animateElevation?: boolean;
    outlineGradient?: [string, string];
    gradientPadding?: number;
    loading?: boolean;
    shimmerColors?: [string, string, string];
    haptics?: boolean;
    tactile?: boolean;
    onPressIn?: PressableProps['onPressIn'];
    onPressOut?: PressableProps['onPressOut'];
    onLayout?: (event: LayoutChangeEvent) => void;
  }
>;

export function SurfaceCard({
  children,
  style,
  animateElevation = true,
  outlineGradient,
  gradientPadding = 2,
  loading = false,
  shimmerColors,
  haptics = true,
  tactile = true,
  disabled,
  onPressIn,
  onPressOut,
  onLayout,
  onPress,
  ...rest
}: SurfaceCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const baseShadow = Shadows[scheme].card;
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const shimmerProgress = useSharedValue(0);

  const interactive = tactile && Boolean((onPress || rest.onLongPress) && !disabled);

  useEffect(() => {
    if (loading && cardSize.width > 0) {
      shimmerProgress.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
    } else {
      shimmerProgress.value = 0;
    }
  }, [cardSize.width, loading, shimmerProgress]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setCardSize(event.nativeEvent.layout);
    onLayout?.(event);
  };

  const handlePressIn = (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    if (interactive) {
      pressed.value = withTiming(1, { duration: 120 });
      scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
      if (haptics) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
    if (interactive) {
      pressed.value = withTiming(0, { duration: 150 });
      scale.value = withSpring(1, { damping: 18, stiffness: 320 });
    }
    onPressOut?.(event);
  };

  const gradientUri = useMemo(() => {
    if (!outlineGradient) {
      return null;
    }
    return buildLinearGradientUri(outlineGradient, Radii.lg + gradientPadding);
  }, [gradientPadding, outlineGradient]);

  const shimmerGradientUri = useMemo(() => {
    const colors = shimmerColors ?? shimmerPresets[scheme];
    return buildLinearGradientUri(colors, Radii.lg);
  }, [scheme, shimmerColors]);

  const animatedCardStyle = useAnimatedStyle(() => {
    const pressedBackground = scheme === 'light'
      ? lightenHex(palette.card, 0.04)
      : darkenHex(palette.card, 0.06);
    const pressedBorder = scheme === 'light'
      ? lightenHex(palette.border, 0.25)
      : lightenHex(palette.border, 0.1);

    const shadowOpacity = animateElevation
      ? baseShadow.shadowOpacity + pressed.value * (scheme === 'light' ? 0.08 : 0.1)
      : baseShadow.shadowOpacity;
    const shadowRadius = animateElevation
      ? baseShadow.shadowRadius + pressed.value * -2
      : baseShadow.shadowRadius;
    const elevation = animateElevation
      ? baseShadow.elevation + pressed.value * 2
      : baseShadow.elevation;
    const shadowOffsetHeight = animateElevation
      ? baseShadow.shadowOffset.height + pressed.value * -2
      : baseShadow.shadowOffset.height;

    return {
      transform: [{ scale: scale.value }],
      backgroundColor: interpolateColor(pressed.value, [0, 1], [palette.card, pressedBackground]),
      borderColor: interpolateColor(pressed.value, [0, 1], [palette.border, pressedBorder]),
      shadowColor: baseShadow.shadowColor,
      shadowOpacity,
      shadowRadius,
      shadowOffset: { width: baseShadow.shadowOffset.width, height: shadowOffsetHeight },
      elevation,
    };
  }, [animateElevation, baseShadow, palette.border, palette.card, scheme]);

  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    if (!loading || cardSize.width === 0) {
      return { opacity: 0 };
    }
    const shimmerWidth = Math.max(cardSize.width * 0.45, 120);
    const translateX = interpolate(
      shimmerProgress.value,
      [0, 1],
      [-shimmerWidth, cardSize.width + shimmerWidth],
    );
    return {
      opacity: 0.55,
      transform: [{ translateX }],
    };
  }, [cardSize.width, loading]);

  const card = (
    <AnimatedPressable
      accessibilityRole={onPress ? 'button' : undefined}
      {...rest}
      disabled={disabled}
      onLayout={handleLayout}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          shadowColor: baseShadow.shadowColor,
          shadowOpacity: baseShadow.shadowOpacity,
          shadowRadius: baseShadow.shadowRadius,
          shadowOffset: baseShadow.shadowOffset,
          elevation: baseShadow.elevation,
        },
        animatedCardStyle,
        style,
      ]}>
      {children}
      {loading ? (
        <View pointerEvents="none" style={styles.shimmerOverlay}>
          <Animated.View style={[styles.shimmerBand, shimmerAnimatedStyle]}>
            <Image
              pointerEvents="none"
              source={{ uri: shimmerGradientUri }}
              style={[styles.shimmerGradient, { height: cardSize.height || '100%' }]}
              contentFit="cover"
            />
          </Animated.View>
        </View>
      ) : null}
    </AnimatedPressable>
  );

  if (!outlineGradient) {
    return card;
  }

  return (
    <View style={[styles.gradientWrapper, { padding: gradientPadding }]}>
      {gradientUri ? (
        <Image
          pointerEvents="none"
          source={{ uri: gradientUri }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: Radii.lg + gradientPadding }]}
          contentFit="cover"
        />
      ) : null}
      {card}
    </View>
  );
}

function buildLinearGradientUri(colors: string[], radius: number) {
  const stops = colors
    .map((color, index) => {
      const offset = (index / Math.max(colors.length - 1, 1)) * 100;
      return `<stop offset="${offset}%" stop-color="${color}" />`;
    })
    .join('');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      ${stops}
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" rx="${radius}" ry="${radius}" fill="url(#grad)" />
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function lightenHex(hex: string, amount: number) {
  return mixHex(hex, '#ffffff', amount);
}

function darkenHex(hex: string, amount: number) {
  return mixHex(hex, '#000000', amount);
}

function mixHex(base: string, mix: string, amount: number) {
  const baseRgb = hexToRgb(base);
  const mixRgb = hexToRgb(mix);
  if (!baseRgb || !mixRgb) {
    return base;
  }
  const blendChannel = (channelBase: number, channelMix: number) =>
    Math.round(channelBase + (channelMix - channelBase) * amount);
  const r = blendChannel(baseRgb.r, mixRgb.r);
  const g = blendChannel(baseRgb.g, mixRgb.g);
  const b = blendChannel(baseRgb.b, mixRgb.b);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return null;
  }
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function toHex(value: number) {
  return value.toString(16).padStart(2, '0');
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radii.lg,
  },
  shimmerBand: {
    width: '45%',
    height: '100%',
  },
  shimmerGradient: {
    width: '100%',
  },
  gradientWrapper: {
    position: 'relative',
    borderRadius: Radii.lg,
    overflow: 'visible',
  },
});
