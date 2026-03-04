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
  categoryLabel?: string;
  metaText?: string;
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
      {options.map((opt, index) => {
        const previousCategory = index > 0 ? options[index - 1]?.categoryLabel : undefined;
        const showCategoryLabel =
          Boolean(opt.categoryLabel) && opt.categoryLabel !== previousCategory;
        const active = selected === opt.id;
        return (
          <View key={opt.id} style={styles.optionGroup}>
            {showCategoryLabel ? (
              <ThemedText style={[styles.categoryLabel, { color: palette.muted }]}>
                {opt.categoryLabel}
              </ThemedText>
            ) : null}
            <Clickable
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
              {opt.metaText ? (
                <Row align="center" gap="xs" style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color={palette.muted} />
                  <ThemedText style={{ color: palette.muted }}>{opt.metaText}</ThemedText>
                </Row>
              ) : null}
            </Clickable>
          </View>
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
  optionGroup: {
    gap: Spacing.xs / 2,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  metaRow: {
    marginTop: 2,
  },
  emptyCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
});
