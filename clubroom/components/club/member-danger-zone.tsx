import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface MemberDangerZoneProps {
  onRemove: () => void;
  onBan: () => void;
}

export const MemberDangerZone = function MemberDangerZone({
  onRemove,
  onBan,
}: MemberDangerZoneProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={{ color: colors.error }}>
        Danger Zone
      </ThemedText>

      <Clickable onPress={onRemove} accessibilityLabel="Remove member from club">
        <Row align="center" gap="sm" style={styles.actionRow}>
          <Ionicons name="person-remove-outline" size={20} color={colors.error} />
          <View style={styles.actionInfo}>
            <ThemedText style={[Typography.body, { color: colors.error, fontWeight: '600' }]}>
              Remove from Club
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>
              Member can rejoin later with an invite
            </ThemedText>
          </View>
        </Row>
      </Clickable>

      <View style={[styles.separator, { backgroundColor: colors.border }]} />

      <Clickable onPress={onBan} accessibilityLabel="Ban member from club">
        <Row
          align="center"
          gap="sm"
          style={[styles.actionRow, { backgroundColor: withAlpha(colors.error, 0.04) }]}
        >
          <Ionicons name="ban-outline" size={20} color={colors.error} />
          <View style={styles.actionInfo}>
            <ThemedText style={[Typography.body, { color: colors.error, fontWeight: '600' }]}>
              Ban from Club
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>
              Permanently prevents this member from rejoining
            </ThemedText>
          </View>
        </Row>
      </Clickable>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  actionRow: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: Spacing.xs,
  },
  actionInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
