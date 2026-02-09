import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ClubRole } from '@/constants/types';
import { ROLE_OPTIONS } from '@/hooks/use-club-invite';

interface InviteRoleSelectorProps {
  selectedRole: ClubRole;
  onSelectRole: (role: ClubRole) => void;
}

export const InviteRoleSelector = memo(function InviteRoleSelector({ selectedRole, onSelectRole }: InviteRoleSelectorProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold">Invite as</ThemedText>
      <View style={styles.options}>
        {ROLE_OPTIONS.map((option) => (
          <Clickable
            key={option.role}
            style={[
              styles.option,
              {
                borderColor: selectedRole === option.role ? colors.tint : colors.border,
                backgroundColor: selectedRole === option.role ? withAlpha(colors.tint, 0.06) : 'transparent',
              },
            ]}
            onPress={() => onSelectRole(option.role)}
          >
            <View style={styles.header}>
              <View style={[styles.radioOuter, { borderColor: selectedRole === option.role ? colors.tint : colors.border }]}>
                {selectedRole === option.role && (
                  <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />
                )}
              </View>
              <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
            </View>
            <ThemedText style={[styles.description, { color: colors.muted }]}>
              {option.description}
            </ThemedText>
          </Clickable>
        ))}
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  options: { gap: Spacing.sm },
  option: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5, gap: Spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  radioOuter: { width: 20, height: 20, borderRadius: Radii.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: Radii.sm },
  description: { ...Typography.small, marginLeft: 32 },
});
