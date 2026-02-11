import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface MemberDangerZoneProps {
  onRemove: () => void;
  onBan: () => void;
}

export const MemberDangerZone = memo(function MemberDangerZone({
  onRemove,
  onBan,
}: MemberDangerZoneProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={[styles.card, { borderColor: withAlpha(colors.error, 0.19) }]}>
      <Row gap="xs" align="center">
        <Ionicons name="warning-outline" size={20} color={colors.error} />
        <ThemedText type="defaultSemiBold" style={[Typography.subheading, { color: colors.error }]}>
          Danger Zone
        </ThemedText>
      </Row>

      <Clickable style={[styles.row, { borderColor: colors.border }]} onPress={onRemove}>
        <Ionicons name="person-remove-outline" size={20} color={colors.error} />
        <View style={{ flex: 1 }}>
          <ThemedText style={{ color: colors.error, fontWeight: '600' }}>
            Remove from Club
          </ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            Member can rejoin later with an invite
          </ThemedText>
        </View>
      </Clickable>

      <Clickable
        style={[
          styles.row,
          { borderColor: colors.error, backgroundColor: withAlpha(colors.error, 0.03) },
        ]}
        onPress={onBan}
      >
        <Ionicons name="ban-outline" size={20} color={colors.error} />
        <View style={{ flex: 1 }}>
          <ThemedText style={{ color: colors.error, fontWeight: '600' }}>Ban from Club</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            Permanently prevents this member from rejoining
          </ThemedText>
        </View>
      </Clickable>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  row: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
