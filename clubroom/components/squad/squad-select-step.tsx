/**
 * SquadSelectStep — Step 1: Select squads to invite.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { squadService } from '@/services/squad-service';
import type { ClubSquad } from '@/constants/types';
import type { InviteType } from '@/hooks/use-squad-invite-modal';

interface SquadSelectStepProps {
  inviteType: InviteType;
  multiSelect: boolean;
  squads: ClubSquad[];
  selectedSquadIds: string[];
  loading: boolean;
  onToggleSquad: (id: string) => void;
}

function SquadSelectStepInner({
  inviteType,
  multiSelect,
  squads,
  selectedSquadIds,
  loading,
  onToggleSquad,
}: SquadSelectStepProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.content}>
      <ThemedText type="subtitle">
        {multiSelect ? 'Select Squads to Invite' : 'Select Squad'}
      </ThemedText>
      <ThemedText style={[styles.description, { color: palette.muted }]}>
        {inviteType === 'SESSION' && 'All athletes in the selected squad(s) will receive an invite'}
        {inviteType === 'MATCH' && 'Squad members will be asked about their availability'}
        {inviteType === 'EVENT' && 'Select which squads should be invited to this event'}
      </ThemedText>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading squads...</ThemedText>
        </View>
      ) : (
        <View style={styles.list}>
          {squads.map((squad) => {
            const isSelected = selectedSquadIds.includes(squad.id);
            const ageGroup = squadService.getAgeGroupLabel(squad);
            return (
              <Clickable
                key={squad.id}
                onPress={() => onToggleSquad(squad.id)}
                accessibilityLabel={`${squad.name} squad`}
                style={[
                  styles.item,
                  {
                    backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <Row align="center" gap="md">
                  <View style={[styles.icon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                    <Ionicons name="people" size={24} color={palette.tint} />
                  </View>
                  <View style={styles.info}>
                    <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
                    <Row align="center" gap="sm">
                      <View
                        style={[
                          styles.metaChip,
                          { backgroundColor: withAlpha(palette.tint, 0.06) },
                        ]}
                      >
                        <ThemedText style={{ ...Typography.caption, color: palette.tint }}>
                          {ageGroup}
                        </ThemedText>
                      </View>
                      <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                        {squad.memberCount} athletes
                      </ThemedText>
                    </Row>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? palette.tint : 'transparent',
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={palette.onPrimary} />
                    )}
                  </View>
                </Row>
              </Clickable>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

export const SquadSelectStep = memo(SquadSelectStepInner);

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  description: { ...Typography.bodySmall, marginBottom: Spacing.sm },
  loadingContainer: { paddingVertical: Spacing['2xl'], alignItems: 'center' },
  list: { gap: Spacing.sm },
  item: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: Spacing.micro },
  metaChip: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
