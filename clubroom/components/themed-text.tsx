import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type TextType = 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'eyebrow' | 'heading' | 'display';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'eyebrow' | 'heading' | 'display';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  const typeStyles: Record<TextType, TextStyle | undefined> = {
    default: styles.default,
    title: styles.title,
    defaultSemiBold: styles.defaultSemiBold,
    subtitle: styles.subtitle,
    link: styles.link,
    eyebrow: styles.eyebrow,
    heading: styles.heading,
    display: styles.display,
  };

  return (
    <Text
      style={[
        { color, fontFamily: Fonts?.sans },
        typeStyles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    ...Typography.base,
  },
  defaultSemiBold: {
    ...Typography.base,
    fontWeight: '600',
  },
  title: {
    ...Typography['2xl'],
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.lg,
    fontWeight: '600',
  },
  heading: {
    ...Typography.heading,
  },
  eyebrow: {
    ...Typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
    opacity: 0.5,
  },
  link: {
    ...Typography.base,
    color: '#1D4ED8',
  },
  display: {
    ...Typography.display,
  },
});
