import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { useTheme } from '@/hooks/useTheme';

export function RatingStars({
  rating,
  onRate,
}: {
  rating: number;
  onRate?: (value: number) => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <Row gap="xs">
      {[1, 2, 3, 4, 5].map((value) => {
        const active = rating >= value;
        return (
          <Clickable key={value} onPress={() => onRate?.(value)} disabled={!onRate}>
            <Ionicons
              name={active ? 'star' : 'star-outline'}
              size={26}
              color={active ? palette.rating : palette.icon}
            />
          </Clickable>
        );
      })}
    </Row>
  );
}
