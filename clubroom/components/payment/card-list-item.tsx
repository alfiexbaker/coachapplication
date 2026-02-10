import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';

interface PaymentCard {
  brand?: string;
  number?: string;
  default?: boolean;
}

export function CardListItem({ card, onDelete }: { card: PaymentCard; onDelete?: () => void }) {
  const { colors: palette } = useTheme();
  return (
    <View style={[styles.card, { borderColor: palette.border }]}> 
      <Row align="center" gap="md">
        <Ionicons name="card" size={24} color={palette.tint} />
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">{card.brand || 'Visa ending 4242'}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>{card.number || '•••• •••• •••• 4242'}</ThemedText>
        </View>
        {card.default && (
          <View style={[styles.badge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Default</ThemedText>
          </View>
        )}
      </Row>
      {onDelete ? (
        <Clickable onPress={onDelete} style={[styles.delete, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
          <Ionicons name="trash" size={16} color={palette.error} />
          <ThemedText style={{ color: palette.error, fontWeight: '700' }}>Delete</ThemedText>
        </Clickable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  delete: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
});
