import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';

export function CardListItem({ card, onDelete }: { card: any; onDelete?: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={[styles.card, { borderColor: palette.border }]}> 
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <Ionicons name="card" size={24} color={palette.tint} />
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">{card.brand || 'Visa ending 4242'}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>{card.number || '•••• •••• •••• 4242'}</ThemedText>
        </View>
        {card.default && (
          <View style={[styles.badge, { backgroundColor: `${palette.tint}15` }]}>
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Default</ThemedText>
          </View>
        )}
      </View>
      {onDelete ? (
        <Clickable onPress={onDelete} style={[styles.delete, { backgroundColor: `${palette.error}10` }]}>
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
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  delete: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
});
