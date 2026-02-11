import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { RatingStars } from './rating-stars';
import { useTheme } from '@/hooks/useTheme';

interface ReviewCardProps {
  name: string;
  role: 'coach' | 'player';
  rating: number;
  text?: string;
  date?: string;
  response?: string;
}

export function ReviewCard({ name, role, rating, text, date, response }: ReviewCardProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Row justify="space-between">
        <ThemedText type="defaultSemiBold">{name}</ThemedText>
        <ThemedText style={{ color: palette.muted }}>
          {role === 'coach' ? 'Coach' : 'Player'}
        </ThemedText>
      </Row>
      <RatingStars rating={rating} />
      {text ? <ThemedText style={{ marginTop: Spacing.xs }}>{text}</ThemedText> : null}
      {date ? (
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>{date}</ThemedText>
      ) : null}
      {response ? (
        <View
          style={[
            styles.response,
            { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.border },
          ]}
        >
          <ThemedText type="defaultSemiBold">Coach response</ThemedText>
          <ThemedText style={{ color: palette.muted }}>{response}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    gap: Spacing.xs / 2,
  },
  response: {
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs / 2,
  },
});
