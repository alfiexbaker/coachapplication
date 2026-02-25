import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface SessionTypeOption {
  id: string;
  title: string;
  priceText: string;
  description: string;
  detailText?: string;
}

export function SessionTypeSelector({
  selected,
  onSelect,
  options,
  loading,
}: {
  selected?: string | null;
  onSelect: (id: string) => void;
  options: SessionTypeOption[];
  loading?: boolean;
}) {
  const { colors: palette } = useTheme();

  if (loading) {
    return (
      <View style={styles.list}>
        <Row align="center" gap="xs" style={[styles.emptyCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Ionicons name="time-outline" size={18} color={palette.muted} />
          <ThemedText style={{ color: palette.muted }}>Loading coach offerings...</ThemedText>
        </Row>
      </View>
    );
  }

  if (options.length === 0) {
    return (
      <View style={styles.list}>
        <Row align="center" gap="xs" style={[styles.emptyCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Ionicons name="alert-circle-outline" size={18} color={palette.muted} />
          <ThemedText style={{ color: palette.muted }}>
            This coach has no bookable session types set up yet.
          </ThemedText>
        </Row>
      </View>
    );
  }

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
              <ThemedText style={{ color: palette.muted }}>{opt.priceText}</ThemedText>
            </Row>
            <ThemedText style={{ color: palette.muted }}>{opt.description}</ThemedText>
            {opt.detailText ? (
              <ThemedText style={{ color: palette.muted }}>{opt.detailText}</ThemedText>
            ) : null}
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
  emptyCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
});
