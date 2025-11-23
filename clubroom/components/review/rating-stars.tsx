import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';

export function RatingStars({ rating, onRate }: { rating: number; onRate?: (value: number) => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((value) => {
        const active = rating >= value;
        return (
          <Clickable key={value} onPress={() => onRate?.(value)} disabled={!onRate}>
            <Ionicons name={active ? 'star' : 'star-outline'} size={26} color={active ? palette.warning : palette.icon} />
          </Clickable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
});
