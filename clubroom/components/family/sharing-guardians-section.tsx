import { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ROLE_INFO, getPermissionIcons } from '@/hooks/use-family-sharing';
import type { FamilyGuardian } from '@/constants/types';

interface SharingGuardiansSectionProps {
  guardians: FamilyGuardian[];
  onRemove: (guardian: FamilyGuardian) => void;
}

export const SharingGuardiansSection = memo(function SharingGuardiansSection({ guardians, onRemove }: SharingGuardiansSectionProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.section}>
      <Row gap="sm" align="center">
        <Ionicons name="people-outline" size={20} color={colors.tint} />
        <ThemedText type="subtitle">Family Members</ThemedText>
        <ThemedText style={[styles.count, { color: colors.muted }]}>{guardians.length}</ThemedText>
      </Row>

      {guardians.map((guardian) => (
        <View key={guardian.id} style={[styles.card, { borderColor: colors.border }]}>
          <Row gap="sm" align="center">
            <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
              <ThemedText style={[Typography.heading, { color: colors.tint }]}>{(guardian.userId || 'U').charAt(0)}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{guardian.userId}</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>
                {guardian.relationship} • {ROLE_INFO[guardian.role].label}
              </ThemedText>
            </View>
            {guardian.isPrimary ? (
              <View style={[styles.primaryBadge, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
                <ThemedText style={[Typography.caption, { color: colors.success }]}>Primary</ThemedText>
              </View>
            ) : (
              <Pressable style={{ padding: Spacing.xxs }} onPress={() => onRemove(guardian)}>
                <Ionicons name="close-circle" size={22} color={colors.error} />
              </Pressable>
            )}
          </Row>
          <Row gap="sm" align="center" style={{ marginLeft: 56 }}>
            {getPermissionIcons(guardian.permissions).map((icon, i) => (
              <Ionicons key={i} name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.muted} />
            ))}
            <ThemedText style={[Typography.caption, { color: colors.muted, marginLeft: Spacing.xs }]}>
              {guardian.permissions.length} permissions
            </ThemedText>
          </Row>
        </View>
      ))}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  section: { padding: Spacing.md, gap: Spacing.md },
  count: { marginLeft: 'auto', ...Typography.bodySmall },
  card: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, gap: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  primaryBadge: { paddingHorizontal: 10, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
});
