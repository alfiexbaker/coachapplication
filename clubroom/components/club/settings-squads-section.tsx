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
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
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
        <Row align="center" justify="space-between" gap="sm">
          <View style={styles.headerText}>
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
            <Ionicons name="layers-outline" size={32} color={colors.muted} />
            <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
              No squads yet. Create one to organize your athletes.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {squads.map((squad, index) => (
              <React.Fragment key={squad.id}>
                <Clickable onPress={() => router.push(Routes.clubSquad(squad.id))}>
                  <Row align="center" gap="sm" style={styles.squadRow}>
                    <View style={[styles.squadIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                      <Ionicons name="people-outline" size={18} color={colors.tint} />
                    </View>
                    <View style={styles.squadInfo}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>{squad.name}</ThemedText>
                      <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                        {squad.level} · {squad.memberCount} members
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Row>
                </Clickable>
                {index < squads.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        )}
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  headerText: {
    flex: 1,
    flexShrink: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  list: {
    marginTop: Spacing.xxs,
  },
  squadRow: {
    paddingVertical: Spacing.sm,
  },
  squadIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
});
