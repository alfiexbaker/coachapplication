import React from 'react';
import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { type ButtonSize, type ButtonVariant, SIZE_MAP, getVariantColors } from './button-config';
import { styles } from './button-styles';
export type { ButtonSize, ButtonVariant } from './button-config';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const PRESS_SCALE = 0.97;
const SPRING_CONFIG = { damping: 18, stiffness: 320 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ButtonInner({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const sizeConfig = SIZE_MAP[size];
  const variantColors = getVariantColors(variant, isDisabled, colors);
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.set(withSpring(PRESS_SCALE, SPRING_CONFIG));
  };

  const handlePressOut = () => {
    scale.set(withSpring(1, SPRING_CONFIG));
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconElement =
    icon && !loading ? (
      <Ionicons name={icon} size={sizeConfig.iconSize} color={variantColors.text} />
    ) : null;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: variantColors.background,
          borderColor: variantColors.border,
          borderWidth: variantColors.borderWidth,
          gap: sizeConfig.gap,
        },
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantColors.text} />
      ) : (
        <Row align="center" justify="center" gap={sizeConfig.gap}>
          {iconPosition === 'left' && iconElement}
          <Text
            style={[
              styles.label,
              {
                color: variantColors.text,
                fontSize: sizeConfig.fontSize,
                lineHeight: sizeConfig.lineHeight,
                fontFamily: Fonts?.sans,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {iconPosition === 'right' && iconElement}
        </Row>
      )}
    </AnimatedPressable>
  );
}

export const Button = ButtonInner;
