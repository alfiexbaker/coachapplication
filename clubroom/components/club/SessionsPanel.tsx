import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { GroupSession } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { TrainingSessionRow, EmptyTrainingState } from './sessions-panel-sections';
import { Row } from '@/components/primitives';

// Re-export extracted components for backward compat
export { TrainingSessionRow, EmptyTrainingState } from './sessions-panel-sections';
export type { TrainingSessionRowProps, EmptyTrainingStateProps } from './sessions-panel-sections';

export interface SessionsPanelProps {
  sessions: GroupSession[];
  isCoach: boolean;
  onCreateSession?: () => void;
  onInviteSquad?: () => void;
}

export function SessionsPanel({
  sessions,
  isCoach,
  onCreateSession,
  onInviteSquad,
}: SessionsPanelProps) {
  const { colors: palette } = useTheme();

  const handleCreateSession = () => {
    if (onCreateSession) onCreateSession();
    else router.push(Routes.GROUP_SESSIONS_CREATE);
  };

  const handleInviteSquad = () => {
    if (onInviteSquad) onInviteSquad();
    else router.push(Routes.SESSION_INVITES_GROUP);
  };

  return (
    <SurfaceCard style={styles.trainingCard}>
      <Row style={styles.trainingSectionHeader}>
        <Row style={styles.trainingHeaderLeft}>
          <Ionicons name="football" size={20} color={palette.tint} />
          <ThemedText type="defaultSemiBold">Training Schedule</ThemedText>
        </Row>
        {isCoach && (
          <Row style={styles.trainingHeaderButtons}>
            <Clickable
              style={styles.manageAllLink}
              onPress={() => router.push(Routes.CLUB_TRAINING_SCHEDULE)}
            >
              <ThemedText style={{ ...Typography.smallSemiBold, color: palette.tint }}>
                Manage All
              </ThemedText>
              <Ionicons name="chevron-forward" size={14} color={palette.tint} />
            </Clickable>
            <Clickable
              style={[styles.inviteSquadButton, { borderColor: palette.tint }]}
              onPress={handleInviteSquad}
            >
              <Ionicons name="people" size={14} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, ...Typography.caption }}>
                Invite Squad
              </ThemedText>
            </Clickable>
            <Clickable
              style={[styles.addTrainingButton, { backgroundColor: palette.tint }]}
              onPress={handleCreateSession}
            >
              <Ionicons name="add" size={16} color={palette.onPrimary} />
              <ThemedText style={{ color: palette.onPrimary, ...Typography.caption }}>
                Add
              </ThemedText>
            </Clickable>
          </Row>
        )}
      </Row>

      {sessions.length > 0 ? (
        <View style={styles.trainingList}>
          {sessions.slice(0, 3).map((session) => (
            <TrainingSessionRow key={session.id} session={session} palette={palette} />
          ))}
          {sessions.length > 3 && (
            <Clickable
              style={styles.viewAllButton}
              onPress={() => router.push(Routes.CLUB_TRAINING_SCHEDULE)}
            >
              <ThemedText style={{ ...Typography.small, color: palette.tint }}>
                View all {sessions.length} training sessions
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={palette.tint} />
            </Clickable>
          )}
        </View>
      ) : (
        <EmptyTrainingState
          isCoach={isCoach}
          onCreateSession={handleCreateSession}
          palette={palette}
        />
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  trainingCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  trainingSectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainingHeaderLeft: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trainingHeaderButtons: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  manageAllLink: {
    alignItems: 'center',
    gap: Spacing.micro,
    paddingVertical: Spacing.xs,
  },
  inviteSquadButton: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  addTrainingButton: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  trainingList: {
    gap: Spacing.sm,
  },
  viewAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
  },
});
