import React, { memo } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { squadService } from '@/services/squad-service';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ClubSquad } from '@/constants/types';

interface CreateMatchSquadProps {
  squads: ClubSquad[];
  selectedSquadId: string | null;
  squadMemberCount: number;
  autoInvite: boolean;
  colors: ThemeColors;
  onSelectSquad: (id: string) => void;
  onAutoInviteChange: (val: boolean) => void;
  onCreateSquad?: () => void;
}

export const CreateMatchSquad = memo(function CreateMatchSquad({
  squads,
  selectedSquadId,
  squadMemberCount,
  autoInvite,
  colors,
  onSelectSquad,
  onAutoInviteChange,
  onCreateSquad,
}: CreateMatchSquadProps) {
  return (
    <View style={styles.stepContent}>
      <ThemedText type="defaultSemiBold" style={styles.stepTitle}>
        Select Squad
      </ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: colors.muted }]}>
        Choose the squad playing in this match
      </ThemedText>

      <View style={styles.squadList}>
        {squads.map((squad) => {
          const isSelected = selectedSquadId === squad.id;
          return (
            <Clickable
              key={squad.id}
              style={[
                styles.squadCard,
                { borderColor: isSelected ? colors.tint : colors.border },
                isSelected && { backgroundColor: withAlpha(colors.tint, 0.06) },
              ]}
              onPress={() => onSelectSquad(squad.id)}
            >
              <Row align="center" gap="md" flex>
                <View style={[styles.squadIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                  <Ionicons name="people" size={24} color={colors.tint} />
                </View>
                <View style={styles.squadInfo}>
                  <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
                  <Row gap="sm" align="center">
                    <View
                      style={[styles.ageChip, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
                    >
                      <ThemedText style={[Typography.caption, { color: colors.tint }]}>
                        {squadService.getAgeGroupLabel(squad)}
                      </ThemedText>
                    </View>
                    <ThemedText style={[Typography.small, { color: colors.muted }]}>
                      {squad.memberCount} players
                    </ThemedText>
                  </Row>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
                ) : (
                  <View style={[styles.emptyCheck, { borderColor: colors.border }]} />
                )}
              </Row>
            </Clickable>
          );
        })}
        {squads.length === 0 && (
          <View style={styles.emptySquads}>
            <Ionicons name="people-outline" size={48} color={colors.muted} />
            <ThemedText type="defaultSemiBold">No squads found</ThemedText>
            <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
              Create a squad first so you can select players and send invites for this match.
            </ThemedText>
            {onCreateSquad ? (
              <Clickable
                style={[styles.createSquadBtn, { borderColor: colors.border }]}
                onPress={onCreateSquad}
              >
                <Row align="center" gap="xs">
                  <Ionicons name="add-circle-outline" size={16} color={colors.tint} />
                  <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>
                    Create Squad
                  </ThemedText>
                </Row>
              </Clickable>
            ) : null}
          </View>
        )}
      </View>

      {selectedSquadId && (
        <Row align="center" style={[styles.autoInviteRow, { borderTopColor: colors.border }]}>
          <Column flex>
            <ThemedText type="defaultSemiBold">Auto-invite Squad</ThemedText>
            <ThemedText style={[Typography.small, { color: colors.muted }]}>
              Send availability requests to all {squadMemberCount} squad members
            </ThemedText>
          </Column>
          <Switch
            value={autoInvite}
            onValueChange={onAutoInviteChange}
            trackColor={{ false: colors.border, true: colors.tint }}
          />
        </Row>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  stepContent: { gap: Spacing.md },
  stepTitle: { ...Typography.heading, marginBottom: Spacing.sm },
  stepSubtitle: { textAlign: 'center', ...Typography.bodySmall, marginBottom: Spacing.sm },
  squadList: { gap: Spacing.sm },
  squadCard: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  squadIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadInfo: { flex: 1, gap: Spacing.micro },
  ageChip: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  emptyCheck: { width: 24, height: 24, borderRadius: Radii.md, borderWidth: 2 },
  emptySquads: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  createSquadBtn: {
    minHeight: 40,
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoInviteRow: { paddingTop: Spacing.md, marginTop: Spacing.md, borderTopWidth: 1 },
});
