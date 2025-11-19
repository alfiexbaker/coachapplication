import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'eyebrow';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color, fontFamily: Fonts?.sans },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'eyebrow' ? styles.eyebrow : undefined,
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
    ...Typography['3xl'],
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.xl,
    fontWeight: '600',
  },
  eyebrow: {
    ...Typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  link: {
    ...Typography.base,
    color: '#1D4ED8',
  },
});
