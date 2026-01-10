import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function EarningsStatCard({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
      <ThemedText style={{ color: palette.muted, fontWeight: '600' }}>{label}</ThemedText>
      <ThemedText type="title" style={{ fontSize: 22 }}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    gap: Spacing.xs / 2,
  },
});
