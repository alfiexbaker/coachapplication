import { StyleSheet, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function TypingIndicator() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {[0, 1, 2].map((dot) => (
        <View key={dot} style={[styles.dot, { backgroundColor: palette.icon }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: Radii.pill,
    opacity: 0.6,
  },
});
