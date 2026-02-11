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

import { Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './surface-card-styles';
import {
  buildLinearGradientUri,
  darkenHex,
  lightenHex,
} from './surface-card-utils';

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
  const { colors: palette, scheme } = useTheme();
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
    return buildLinearGradientUri([...colors], Radii.lg);
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
