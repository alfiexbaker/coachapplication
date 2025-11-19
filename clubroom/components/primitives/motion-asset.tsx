import { useEffect, useRef } from 'react';
import { View, StyleSheet, AccessibilityInfo, Platform } from 'react-native';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { getAsset } from '@/utils/asset-manifest';

export interface MotionAssetProps {
  slug: string;
  autoPlay?: boolean;
  loop?: boolean;
  style?: any;
  onComplete?: () => void;
}

/**
 * MotionAsset component for playing Lottie animations with accessibility support
 * Automatically respects reduced motion preferences and announces to screen readers
 */
export function MotionAsset({ slug, autoPlay = true, loop = false, style, onComplete }: MotionAssetProps) {
  const prefersReducedMotion = useReducedMotion();
  const asset = getAsset(slug, 'animations');
  const hasAnnounced = useRef(false);

  useEffect(() => {
    // Announce to screen readers if configured
    if (asset?.voiceoverAnnouncement && !hasAnnounced.current) {
      AccessibilityInfo.announceForAccessibility(asset.voiceoverAnnouncement);
      hasAnnounced.current = true;
    }
  }, [asset?.voiceoverAnnouncement]);

  // For now, we'll show a placeholder since we don't have actual Lottie files yet
  // In production, this would use react-native-lottie or similar
  if (!asset) {
    console.warn(`Animation asset "${slug}" not found`);
    return null;
  }

  // If reduced motion is enabled, skip animation or show static state
  if (prefersReducedMotion) {
    return null; // Or return a static version
  }

  // TODO: Integrate with actual Lottie library
  // For now, return a placeholder view
  return (
    <View
      style={[styles.container, style]}
      accessible={false}
      importantForAccessibility="no"
    >
      {/* Placeholder for Lottie animation */}
      {/* In production: <LottieView source={require(`@/assets/just1/${asset.path}`)} ... /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Default container styles
  },
});
