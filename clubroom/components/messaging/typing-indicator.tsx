import { StyleSheet, View } from 'react-native';

import { Row } from '@/components/primitives/row';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function TypingIndicator() {
  const { colors: palette } = useTheme();

  return (
    <Row align="center" gap="xs" style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {[0, 1, 2].map((dot) => (
        <View key={dot} style={[styles.dot, { backgroundColor: palette.icon }]} />
      ))}
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
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
