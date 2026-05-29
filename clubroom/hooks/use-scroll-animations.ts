import { useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

interface ScrollState {
  scrollY: SharedValue<number>;
  viewportHeight: SharedValue<number>;
  sectionOffsets: SharedValue<Record<string, number>>;
}

export interface ScrollAnimationController {
  onViewportLayout: (event: LayoutChangeEvent) => void;
  createSectionLayoutHandler: (sectionKey: string) => (event: LayoutChangeEvent) => void;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  state: ScrollState;
}

export function useScrollAnimations(): ScrollAnimationController {
  const scrollY = useSharedValue(0);
  const viewportHeight = useSharedValue(1);
  const sectionOffsets = useSharedValue<Record<string, number>>({});
  const layoutHandlerCache = useRef<Record<string, (event: LayoutChangeEvent) => void>>({});

  const onViewportLayout = (event: LayoutChangeEvent) => {
    viewportHeight.set(Math.max(1, event.nativeEvent.layout.height));
  };

  const createSectionLayoutHandler = (sectionKey: string) => {
    if (!layoutHandlerCache.current[sectionKey]) {
      layoutHandlerCache.current[sectionKey] = (event: LayoutChangeEvent) => {
        const nextY = event.nativeEvent.layout.y;
        if (sectionOffsets.value[sectionKey] === nextY) {
          return;
        }
        sectionOffsets.set({
          ...sectionOffsets.value,
          [sectionKey]: nextY,
        });
      };
    }
    return layoutHandlerCache.current[sectionKey];
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.set(event.contentOffset.y);
    },
  });

  return {
    onViewportLayout,
    createSectionLayoutHandler,
    scrollHandler,
    state: {
      scrollY,
      viewportHeight,
      sectionOffsets,
    },
  };
}

export function useSectionRevealStyle(
  controller: ScrollAnimationController,
  sectionKey: string,
) {
  return useAnimatedStyle(() => {
    const y = controller.state.sectionOffsets.value[sectionKey];
    if (typeof y !== 'number') {
      return {
        opacity: 1,
        transform: [{ translateY: 0 }, { scale: 1 }],
      };
    }

    const sectionTopRelative = y - controller.state.scrollY.value;
    const revealStart = controller.state.viewportHeight.value * 0.85;
    const revealEnd = controller.state.viewportHeight.value * 0.35;
    const revealProgress = interpolate(
      sectionTopRelative,
      [revealEnd, revealStart],
      [1, 0],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(revealProgress, [0, 1], [0.97, 1], Extrapolation.CLAMP);

    return {
      opacity: revealProgress,
      transform: [{ translateY: (1 - revealProgress) * 20 }, { scale }],
    };
  }, [controller, sectionKey]);
}

/**
 * Parallax style for hero section — moves at 0.3x scroll speed for depth.
 */
export function useHeroParallaxStyle(controller: ScrollAnimationController) {
  return useAnimatedStyle(() => {
    const parallaxOffset = controller.state.scrollY.value * -0.3;
    const scale = interpolate(
      controller.state.scrollY.value,
      [0, 200],
      [1, 0.95],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      controller.state.scrollY.value,
      [0, 300],
      [1, 0.6],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateY: parallaxOffset }, { scale }],
    };
  }, [controller]);
}
