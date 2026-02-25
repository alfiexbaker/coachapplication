/**
 * SafeImage
 *
 * Image wrapper with error fallback. Shows an icon placeholder when the image
 * fails to load instead of a blank rectangle.
 *
 * Usage:
 *   <SafeImage source={{ uri: url }} fallbackIcon="person-circle-outline" style={styles.image} />
 */

import { useState, useCallback } from 'react';
import { Image as ExpoImage, type ImageProps, type ImageStyle } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';

const logger = createLogger('SafeImage');

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  /** Icon name to show on load failure */
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  /** Size of the fallback icon */
  fallbackIconSize?: number;
  style?: StyleProp<ImageStyle>;
}

export function SafeImage({
  source,
  fallbackIcon = 'image-outline',
  fallbackIconSize = 32,
  style,
  ...props
}: SafeImageProps) {
  const { colors } = useTheme();
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    const sourceUri =
      source && typeof source === 'object' && 'uri' in source
        ? (source as { uri: string }).uri
        : 'non-uri source';
    logger.warn('Image failed to load', { source: sourceUri });
    setHasError(true);
  }, [source]);

  if (hasError) {
    return (
      <View
        style={[
          style as StyleProp<ViewStyle>,
          {
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Ionicons
          name={fallbackIcon}
          size={fallbackIconSize}
          color={colors.muted}
        />
      </View>
    );
  }

  return (
    <ExpoImage
      source={source}
      onError={handleError}
      style={style}
      {...props}
    />
  );
}
