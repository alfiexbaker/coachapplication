import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CardTier, PlayerCardData } from '@/types/progress-types';
import { sharePlayerCard } from '@/utils/card-share';
import { HapticPatterns } from '@/utils/haptics';
import { buildLinearGradientUri } from '@/components/primitives/surface-card-utils';
import { PlayerCardBack } from './player-card-back';
import { PlayerCardFront } from './player-card-front';
import { isDemoMode } from '@/utils/demo-mode';
import { buildPlayerCardPalette } from './player-card-palette';

interface TierConfig {
  gradient: [string, string];
  accent: string;
  overlay: string;
}

interface PlayerCardProps {
  data: PlayerCardData;
}

export const PLAYER_CARD_TIER_CONFIG: Record<CardTier, TierConfig> = {
  bronze: {
    gradient: ['#101A2E', '#2A425B'],
    accent: '#C9904E',
    overlay: '#08101D',
  },
  silver: {
    gradient: ['#0F1A2E', '#32475D'],
    accent: '#A5B4C3',
    overlay: '#08101D',
  },
  gold: {
    gradient: ['#111B30', '#2D445F'],
    accent: '#D9B160',
    overlay: '#08111D',
  },
  platinum: {
    gradient: ['#0D1930', '#245071'],
    accent: '#69ABE4',
    overlay: '#07101C',
  },
  diamond: {
    gradient: ['#0E192C', '#20556A'],
    accent: '#78D5DB',
    overlay: '#06101A',
  },
};

const AnimatedView = Animated.createAnimatedComponent(View);

export const PlayerCard = memo(function PlayerCard({ data }: PlayerCardProps) {
  const { colors, scheme } = useTheme();
  const demoMode = isDemoMode();
  const { width: viewportWidth } = useWindowDimensions();
  const flipProgress = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const entranceOpacity = useSharedValue(0.5);
  const entranceScale = useSharedValue(0.9);
  const entranceTranslateY = useSharedValue(10);
  const sheenProgress = useSharedValue(0);
  const captureRef = useRef<View>(null);
  const isBackRef = useRef(false);
  const isFlippingRef = useRef(false);
  const compact = viewportWidth <= 375;

  const tierConfig = PLAYER_CARD_TIER_CONFIG[data.tier];
  const cardPalette = useMemo(
    () =>
      buildPlayerCardPalette({
        gradient: tierConfig.gradient,
        accent: tierConfig.accent,
        overlay: tierConfig.overlay,
      }),
    [tierConfig.accent, tierConfig.gradient, tierConfig.overlay],
  );

  const gradientUri = useMemo(
    () => buildLinearGradientUri(tierConfig.gradient, Radii.xl),
    [tierConfig.gradient],
  );

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      flipProgress.value,
      [0, 0.35, 1],
      [1, 0.2, 0],
      Extrapolation.CLAMP,
    ),
    zIndex: flipProgress.value < 0.5 ? 2 : 1,
    transform: [
      { translateX: interpolate(flipProgress.value, [0, 1], [0, -20], Extrapolation.CLAMP) },
      { scale: interpolate(flipProgress.value, [0, 1], [1, 0.982], Extrapolation.CLAMP) },
      { rotateZ: `${interpolate(flipProgress.value, [0, 1], [0, -1.2], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      flipProgress.value,
      [0, 0.65, 1],
      [0, 0.2, 1],
      Extrapolation.CLAMP,
    ),
    zIndex: flipProgress.value >= 0.5 ? 2 : 1,
    transform: [
      { translateX: interpolate(flipProgress.value, [0, 1], [20, 0], Extrapolation.CLAMP) },
      { scale: interpolate(flipProgress.value, [0, 1], [0.982, 1], Extrapolation.CLAMP) },
      { rotateZ: `${interpolate(flipProgress.value, [0, 1], [1.2, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [
      { scale: entranceScale.value },
      { translateY: entranceTranslateY.value },
      { scale: cardScale.value },
    ],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheenProgress.value, [0, 0.2, 0.5, 1], [0, 0.35, 0.18, 0]),
    transform: [
      { translateX: interpolate(sheenProgress.value, [0, 1], [-120, 220], Extrapolation.CLAMP) },
      { rotate: '-10deg' },
    ],
  }));

  useEffect(() => {
    entranceOpacity.value = withTiming(1, { duration: 280 });
    entranceScale.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    entranceTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
  }, [entranceOpacity, entranceScale, entranceTranslateY]);

  const handleFlipFinish = useCallback(() => {
    isFlippingRef.current = false;
  }, []);

  const handleFlip = useCallback(() => {
    if (isFlippingRef.current) {
      return;
    }
    isFlippingRef.current = true;
    cardScale.value = withSequence(
      withTiming(0.965, { duration: 90 }),
      withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) }),
    );
    const nextIsBack = !isBackRef.current;
    isBackRef.current = nextIsBack;
    const targetProgress = nextIsBack ? 1 : 0;
    sheenProgress.value = 0;
    sheenProgress.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    flipProgress.value = withTiming(
      targetProgress,
      { duration: 260, easing: Easing.bezier(0.2, 0.78, 0.2, 1) },
      (finished) => {
        if (finished) {
          runOnJS(handleFlipFinish)();
        }
      },
    );
    void HapticPatterns.flip();
  }, [cardScale, flipProgress, handleFlipFinish, sheenProgress]);

  const handlePressIn = useCallback(() => {
    cardScale.value = withTiming(1.015, { duration: 100 });
  }, [cardScale]);

  const handlePressOut = useCallback(() => {
    cardScale.value = withTiming(1, { duration: 120 });
  }, [cardScale]);

  const handleShare = useCallback(() => {
    void HapticPatterns.longPress();
    cardScale.value = withSequence(
      withTiming(1.05, { duration: 120 }),
      withTiming(1, { duration: 160 }),
    );
    void sharePlayerCard(captureRef, {
      dialogTitle: `Share ${data.name}'s player card`,
    });
  }, [cardScale, data.name]);

  return (
    <Column gap="xxs">
      <Animated.View style={wrapperStyle}>
        <View
          ref={captureRef}
          collapsable={false}
          style={[
            styles.captureWrap,
            {
              ...Shadows[scheme].cardHover,
              shadowColor: tierConfig.accent,
            },
          ]}
        >
          <Clickable
            style={styles.touchTarget}
            onPress={handleFlip}
            onLongPress={handleShare}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            delayLongPress={500}
            accessibilityLabel={`${data.name} player card`}
            accessibilityHint="Tap to flip. Hold to share."
            accessibilityRole="button"
          >
            <View
              style={[
                styles.cardFrame,
                compact ? styles.cardFrameCompact : styles.cardFrameRegular,
                {
                  borderColor: cardPalette.frameBorder,
                },
              ]}
            >
              <Image source={{ uri: gradientUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: cardPalette.overlay,
                  },
                ]}
              />
              <AnimatedView
                pointerEvents="none"
                style={[styles.sheen, { backgroundColor: cardPalette.sheen }, sheenStyle]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.innerBorder,
                  { borderColor: cardPalette.innerBorder },
                ]}
              />

              <AnimatedView style={[styles.face, frontStyle]}>
                <PlayerCardFront
                  data={data}
                  tier={data.tier}
                  palette={cardPalette}
                  compact={compact}
                />
                {demoMode ? (
                  <View style={[styles.demoPill, { backgroundColor: withAlpha(colors.warning, 0.16) }]}>
                    <ThemedText style={[styles.demoPillText, { color: colors.warning }]}>DEMO</ThemedText>
                  </View>
                ) : null}
              </AnimatedView>

              <AnimatedView style={[styles.face, styles.backFace, backStyle]}>
                <PlayerCardBack
                  data={data}
                  palette={cardPalette}
                  compact={compact}
                />
              </AnimatedView>
            </View>
          </Clickable>
        </View>
      </Animated.View>

    </Column>
  );
});

const styles = StyleSheet.create({
  captureWrap: {
    borderRadius: Radii.xl,
    width: '100%',
  },
  touchTarget: {
    minHeight: 44,
    borderRadius: Radii.xl,
    width: '100%',
  },
  cardFrame: {
    position: 'relative',
    width: '100%',
    borderRadius: Radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardFrameCompact: {
    minHeight: 300,
  },
  cardFrameRegular: {
    minHeight: 330,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  backFace: {
    position: 'absolute',
  },
  sheen: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.pill,
  },
  innerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: Radii.xl - 2,
    borderWidth: 1,
    zIndex: 5,
  },
  demoPill: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    zIndex: 10,
  },
  demoPillText: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
