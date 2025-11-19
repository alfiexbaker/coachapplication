import { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type SurfaceCardProps = PropsWithChildren<ViewProps>;

export function SurfaceCard({ children, style, ...props }: SurfaceCardProps) {
  const scheme = useColorScheme() ?? 'light';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: Colors[scheme].card,
          borderColor: Colors[scheme].border,
        },
        Shadows[scheme].card,
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
});
