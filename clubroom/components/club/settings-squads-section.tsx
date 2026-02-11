import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Routes } from '@/navigation/routes';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ClubSquad } from '@/constants/types';

interface SettingsSquadsSectionProps {
  squads: ClubSquad[];
  colors: ThemeColors;
  onCreateSquad: () => void;
}

export const SettingsSquadsSection = memo(function SettingsSquadsSection({
  squads,
  colors,
  onCreateSquad,
}: SettingsSquadsSectionProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={styles.card}>
        <Row align="flex-start" justify="space-between">
          <View>
            <ThemedText type="defaultSemiBold" style={Typography.heading}>
              Squads
            </ThemedText>
            <ThemedText
              style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}
            >
              Organize athletes into teams
            </ThemedText>
          </View>
          <Clickable
            accessibilityLabel="Create squad"
            style={[styles.addBtn, { backgroundColor: colors.tint }]}
            onPress={onCreateSquad}
          >
            <Ionicons name="add" size={20} color={colors.onPrimary} />
          </Clickable>
        </Row>

        {squads.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="layers-outline" size={40} color={colors.muted} />
            <ThemedText style={{ color: colors.muted, textAlign: 'center' }}>
              No squads yet. Create one to organize your athletes.
            </ThemedText>
          </View>
        ) : (
          squads.map((squad) => (
            <Clickable
              key={squad.id}
              style={[styles.row, { borderColor: colors.border }]}
              onPress={() => router.push(Routes.clubSquad(squad.id))}
            >
              <View style={{ flex: 1, gap: Spacing.micro }}>
                <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
                <ThemedText style={[Typography.small, { color: colors.muted }]}>
                  {squad.level} · {squad.memberCount} members
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Clickable>
          ))
        )}
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
