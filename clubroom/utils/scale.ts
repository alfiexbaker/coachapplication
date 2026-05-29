import { Platform, PixelRatio, useWindowDimensions } from 'react-native';

// Base dimensions (iPhone 11 Pro)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Min/max scale bounds to prevent layout breaking
const MIN_SCALE_FACTOR = 0.8;
const MAX_SCALE_FACTOR = 1.3;

/**
 * Get bounded scale factor
 */
function getScaleFactor(width: number = BASE_WIDTH): number {
  const factor = width / BASE_WIDTH;

  // Clamp between min and max to prevent extreme scaling
  return Math.max(MIN_SCALE_FACTOR, Math.min(MAX_SCALE_FACTOR, factor));
}

function getVerticalScaleFactor(height: number = BASE_HEIGHT): number {
  const factor = height / BASE_HEIGHT;

  // Clamp between min and max
  return Math.max(MIN_SCALE_FACTOR, Math.min(MAX_SCALE_FACTOR, factor));
}

/**
 * Scales a value based on screen width
 */
export function scale(size: number, width: number = BASE_WIDTH): number {
  const scaleFactor = getScaleFactor(width);
  const newSize = size * scaleFactor;

  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(newSize);
}

/**
 * Scales vertically based on screen height
 */
export function verticalScale(size: number, height: number = BASE_HEIGHT): number {
  const scaleFactor = getVerticalScaleFactor(height);
  const newSize = size * scaleFactor;

  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(newSize);
}

/**
 * Moderate scale - scales with less intensity (good for fonts and spacing)
 */
export function moderateScale(
  size: number,
  factor: number = 0.5,
  width: number = BASE_WIDTH,
): number {
  return size + (scale(size, width) - size) * factor;
}

/**
 * Font scaling for text - even more conservative
 */
export function scaleFont(size: number, width: number = BASE_WIDTH): number {
  // Use very conservative scaling for fonts (0.25 factor)
  return moderateScale(size, 0.25, width);
}

export function useScale() {
  const { width, height } = useWindowDimensions();
  return {
    scale: (size: number) => scale(size, width),
    verticalScale: (size: number) => verticalScale(size, height),
    moderateScale: (size: number, factor: number = 0.5) => moderateScale(size, factor, width),
    scaleFont: (size: number) => scaleFont(size, width),
  };
}
