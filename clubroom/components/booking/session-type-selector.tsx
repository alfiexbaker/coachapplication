import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
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
                backgroundColor: active ? `${palette.tint}10` : palette.surface,
              },
            ]}
            onPress={() => onSelect(opt.id)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText type="defaultSemiBold">{opt.title}</ThemedText>
              <ThemedText style={{ color: palette.muted }}>{opt.price}</ThemedText>
            </View>
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
