import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface SessionTypeOption {
  id: string;
  title: string;
  price: string;
  description: string;
}

export function SessionTypeSelector({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const { colors: palette } = useTheme();
  const options: SessionTypeOption[] = [
    { id: '1-on-1', title: '1-on-1', price: '£90', description: '60 mins, personalised focus' },
    { id: 'small-group', title: 'Small Group', price: '£60 pp', description: 'Max 4 players' },
    { id: 'team', title: 'Team Training', price: '£150', description: 'Up to 15 players' },
  ];

  return (
    <View style={styles.list}>
      {options.map((opt) => {
        const active = selected === opt.id;
        return (
          <Clickable
            key={opt.id}
            style={[
              styles.card,
              {
                borderColor: active ? palette.tint : palette.border,
                backgroundColor: active ? withAlpha(palette.tint, 0.06) : palette.surface,
              },
            ]}
            onPress={() => onSelect(opt.id)}
          >
            <Row justify="between" align="center">
              <ThemedText type="defaultSemiBold">{opt.title}</ThemedText>
              <ThemedText style={{ color: palette.muted }}>{opt.price}</ThemedText>
            </Row>
            <ThemedText style={{ color: palette.muted }}>{opt.description}</ThemedText>
          </Clickable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.xs,
  },
  card: {
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    gap: Spacing.xs / 2,
  },
});
