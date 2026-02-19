/**
 * CreateInviteStep — Step 4 of session creation wizard.
 *
 * Select invite type (Open / Closed / Squad Only) and optionally
 * pick athletes to invite for closed sessions.
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row, Column, Center } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SessionInviteType } from '@/constants/types';
import type { PastAthlete } from '@/hooks/use-create-session';
import { INVITE_TYPE_OPTIONS } from './create-session-types';

// ============================================================================
// PROPS
// ============================================================================

interface CreateInviteStepProps {
  colors: ThemeColors;
  inviteType: SessionInviteType;
  allowedInviteTypes: SessionInviteType[];
  selectedAthletes: string[];
  pastAthletes: PastAthlete[];
  onInviteTypeChange: (v: SessionInviteType) => void;
  onToggleAthlete: (id: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CreateInviteStep = memo(function CreateInviteStep({
  colors,
  inviteType,
  allowedInviteTypes,
  selectedAthletes,
  pastAthletes,
  onInviteTypeChange,
  onToggleAthlete,
}: CreateInviteStepProps) {
  const visibleInviteOptions = INVITE_TYPE_OPTIONS.filter((option) =>
    allowedInviteTypes.includes(option.key),
  );
  const allSelected =
    pastAthletes.length > 0 && pastAthletes.every((athlete) => selectedAthletes.includes(athlete.id));

  const handleToggleSelectAll = () => {
    if (allSelected) {
      pastAthletes.forEach((athlete) => {
        if (selectedAthletes.includes(athlete.id)) {
          onToggleAthlete(athlete.id);
        }
      });
      return;
    }

    pastAthletes.forEach((athlete) => {
      if (!selectedAthletes.includes(athlete.id)) {
        onToggleAthlete(athlete.id);
      }
    });
  };

  return (
    <Animated.View entering={FadeInRight.springify()}>
      <Column gap="lg">
        {/* Invite type selection */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Who can join?
          </ThemedText>

          {visibleInviteOptions.map((option) => (
            <Clickable
              key={option.key}
              onPress={() => onInviteTypeChange(option.key)}
              accessibilityLabel={`Select ${option.label} invite type`}
              style={[
                styles.inviteModeCard,
                {
                  borderColor: inviteType === option.key ? colors.tint : colors.border,
                  backgroundColor:
                    inviteType === option.key ? withAlpha(colors.tint, 0.03) : colors.surface,
                },
              ]}
            >
              <Row align="center" gap="md">
                <Center
                  style={[
                    styles.inviteModeIcon,
                    { backgroundColor: withAlpha(colors[option.colorKey] as string, 0.09) },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={colors[option.colorKey] as string}
                  />
                </Center>
                <Column style={styles.inviteModeInfo} gap="micro">
                  <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
                  <ThemedText style={[styles.inviteModeDesc, { color: colors.muted }]}>
                    {option.description}
                  </ThemedText>
                </Column>
                {inviteType === option.key && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
                )}
              </Row>
            </Clickable>
          ))}
          {visibleInviteOptions.length === 1 && (
            <ThemedText style={[styles.selectionHelp, { color: colors.muted }]}>
              This session type is invite-only by default.
            </ThemedText>
          )}
        </Column>

        {/* Open/Closed: Optional athlete pre-invites */}
        {(inviteType === 'CLOSED' || inviteType === 'OPEN') && (
          <SurfaceCard style={styles.athleteList}>
            <Row align="center" justify="space-between">
              <ThemedText type="defaultSemiBold" style={styles.athleteListTitle}>
                {inviteType === 'OPEN'
                  ? 'Pre-Invite Athletes (Optional)'
                  : 'Select Athletes to Invite'}
              </ThemedText>
              <Clickable
                onPress={handleToggleSelectAll}
                accessibilityLabel={allSelected ? 'Clear selected athletes' : 'Select all athletes'}
              >
                <ThemedText style={[styles.selectionAction, { color: colors.tint }]}>
                  {allSelected ? 'Clear' : 'Select all'}
                </ThemedText>
              </Clickable>
            </Row>
            <ThemedText style={[styles.selectionHelp, { color: colors.muted }]}>
              {inviteType === 'OPEN'
                ? `${selectedAthletes.length} selected for early invites. Session remains open to everyone else.`
                : `${selectedAthletes.length} selected now. You can invite more later from Bookings.`}
            </ThemedText>
            {pastAthletes.length === 0 ? (
              <ThemedText style={[styles.selectionHelp, { color: colors.muted }]}>
                No athletes in your roster yet. Invite from Athletes, then return here.
              </ThemedText>
            ) : (
              pastAthletes.map((athlete) => (
                <Clickable
                  key={athlete.id}
                  onPress={() => onToggleAthlete(athlete.id)}
                  accessibilityLabel={`${selectedAthletes.includes(athlete.id) ? 'Remove' : 'Invite'} ${athlete.name}`}
                  style={[
                    styles.athleteRow,
                    {
                      backgroundColor: selectedAthletes.includes(athlete.id)
                        ? withAlpha(colors.tint, 0.03)
                        : 'transparent',
                    },
                  ]}
                >
                  <Row align="center" gap="sm">
                    <Center
                      style={[
                        styles.athleteAvatar,
                        { backgroundColor: withAlpha(colors.tint, 0.12) },
                      ]}
                    >
                      <ThemedText style={{ color: colors.tint, ...Typography.bodySemiBold }}>
                        {athlete.name.charAt(0)}
                      </ThemedText>
                    </Center>
                    <ThemedText style={styles.athleteName}>{athlete.name}</ThemedText>
                    <Center
                      style={[
                        styles.checkbox,
                        {
                          borderColor: selectedAthletes.includes(athlete.id)
                            ? colors.tint
                            : colors.border,
                          backgroundColor: selectedAthletes.includes(athlete.id)
                            ? colors.tint
                            : 'transparent',
                        },
                      ]}
                    >
                      {selectedAthletes.includes(athlete.id) && (
                        <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                      )}
                    </Center>
                  </Row>
                </Clickable>
              ))
            )}
          </SurfaceCard>
        )}

        {/* Squad only: Info card */}
        {inviteType === 'SQUAD_ONLY' && (
          <SurfaceCard style={styles.athleteList}>
            <ThemedText type="defaultSemiBold" style={styles.athleteListTitle}>
              Squad Access
            </ThemedText>
            <ThemedText style={[styles.inviteModeDesc, { color: colors.muted }]}>
              Only members of your squads will be able to view and book this session.
            </ThemedText>
          </SurfaceCard>
        )}
      </Column>
    </Animated.View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.bodySmall,
  },
  inviteModeCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 2,
  },
  inviteModeIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
  },
  inviteModeInfo: {
    flex: 1,
  },
  inviteModeDesc: {
    ...Typography.small,
  },
  athleteList: {
    gap: Spacing.sm,
  },
  athleteListTitle: {
    marginBottom: Spacing.xxs,
  },
  selectionHelp: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  selectionAction: {
    ...Typography.smallSemiBold,
  },
  athleteRow: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  athleteAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
  },
  athleteName: {
    flex: 1,
    ...Typography.body,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.sm,
    borderWidth: 2,
  },
});
