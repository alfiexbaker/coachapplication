import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RatingStars } from './rating-stars';

interface ReviewCardProps {
  name: string;
  role: 'coach' | 'player';
  rating: number;
  text?: string;
  date?: string;
  response?: string;
}

export function ReviewCard({ name, role, rating, text, date, response }: ReviewCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold">{name}</ThemedText>
        <ThemedText style={{ color: palette.muted }}>{role === 'coach' ? 'Coach' : 'Player'}</ThemedText>
      </View>
      <RatingStars rating={rating} />
      {text ? <ThemedText style={{ marginTop: Spacing.xs }}>{text}</ThemedText> : null}
      {date ? <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{date}</ThemedText> : null}
      {response ? (
        <View style={[styles.response, { backgroundColor: `${palette.tint}10`, borderColor: palette.border }]}>
          <ThemedText type="defaultSemiBold">Coach response</ThemedText>
          <ThemedText style={{ color: palette.muted }}>{response}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  response: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
});
