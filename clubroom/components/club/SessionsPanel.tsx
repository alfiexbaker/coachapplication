import { StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { groupSessionService } from '@/services/group-session-service';
import type { GroupSession } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

export interface SessionsPanelProps {
  sessions: GroupSession[];
  isCoach: boolean;
  onCreateSession?: () => void;
  onInviteSquad?: () => void;
}

export function SessionsPanel({ sessions, isCoach, onCreateSession, onInviteSquad }: SessionsPanelProps) {
  const { colors: palette } = useTheme();

  const handleCreateSession = () => {
    if (onCreateSession) {
      onCreateSession();
    } else {
      router.push(Routes.GROUP_SESSIONS_CREATE);
    }
  };

  const handleInviteSquad = () => {
    if (onInviteSquad) {
      onInviteSquad();
    } else {
      router.push(Routes.SESSION_INVITES_GROUP);
    }
  };

  return (
    <SurfaceCard style={styles.trainingCard}>
      <View style={styles.trainingSectionHeader}>
        <View style={styles.trainingHeaderLeft}>
          <Ionicons name="football" size={20} color={palette.tint} />
          <ThemedText type="defaultSemiBold">Training Schedule</ThemedText>
        </View>
        {isCoach && (
          <View style={styles.trainingHeaderButtons}>
            <Pressable
              style={styles.manageAllLink}
              onPress={() => router.push(Routes.CLUB_TRAINING_SCHEDULE)}
            >
              <ThemedText style={{ ...Typography.smallSemiBold, color: palette.tint }}>Manage All</ThemedText>
              <Ionicons name="chevron-forward" size={14} color={palette.tint} />
            </Pressable>
            <Pressable
              style={[styles.inviteSquadButton, { borderColor: palette.tint }]}
              onPress={handleInviteSquad}
            >
              <Ionicons name="people" size={14} color={palette.tint} />
              <ThemedText style={ { color: palette.tint, ...Typography.caption }}>Invite Squad</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.addTrainingButton, { backgroundColor: palette.tint }]}
              onPress={handleCreateSession}
            >
              <Ionicons name="add" size={16} color={palette.onPrimary} />
              <ThemedText style={ { color: palette.onPrimary, ...Typography.caption }}>Add</ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      {sessions.length > 0 ? (
        <View style={styles.trainingList}>
          {sessions.slice(0, 3).map((session) => {
            const nextDate = groupSessionService.getNextTrainingDate(session);
            const dayName = session.recurringPattern
              ? groupSessionService.formatDayOfWeek(session.recurringPattern.dayOfWeek)
              : '';
            return (
              <Pressable
                key={session.id}
                style={[styles.trainingItem, { borderColor: palette.border }]}
                onPress={() => router.push(Routes.groupSession(session.id))}
              >
                <View style={styles.trainingItemLeft}>
                  <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
                    {session.title}
                  </ThemedText>
                  <View style={styles.trainingMeta}>
                    {session.isRecurring && (
                      <View style={[styles.recurringBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                        <Ionicons name="repeat" size={10} color={palette.tint} />
                        <ThemedText style={{ ...Typography.micro, color: palette.tint }}>
                          {dayName}s
                        </ThemedText>
                      </View>
                    )}
                    <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                      {nextDate ? `${nextDate.startTime} - ${nextDate.endTime}` : ''}
                    </ThemedText>
                  </View>
                  <View style={styles.trainingLocation}>
                    <Ionicons name="location-outline" size={12} color={palette.muted} />
                    <ThemedText style={{ ...Typography.caption, color: palette.muted }} numberOfLines={1}>
                      {session.location}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.trainingItemRight}>
                  {session.squadName && (
                    <View style={[styles.squadTag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                      <ThemedText style={ { color: palette.tint, ...Typography.micro }}>
                        {session.squadName}
                      </ThemedText>
                    </View>
                  )}
                  { session.pricePerParticipant === 0 ? (
                    <ThemedText style={{ ...Typography.caption, color: palette.success }}>
                      Free
                    </ThemedText>
                  ) : (
                    <ThemedText style={ { color: palette.text, ...Typography.caption }}>
                      {groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
                    </ThemedText>
                  )}
                </View>
              </Pressable>
            );
          })}
          {sessions.length > 3 && (
            <Pressable
              style={styles.viewAllButton}
              onPress={() => router.push(Routes.CLUB_TRAINING_SCHEDULE)}
            >
              <ThemedText style={{ ...Typography.small, color: palette.tint }}>
                View all {sessions.length} training sessions
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={palette.tint} />
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.emptyTraining}>
          <Ionicons name="calendar-outline" size={32} color={palette.muted} />
          <ThemedText style={{ ...Typography.small, color: palette.muted, textAlign: 'center' }}>
            No training sessions scheduled
          </ThemedText>
          {isCoach && (
            <Pressable
              style={[styles.createTrainingButton, { borderColor: palette.tint }]}
              onPress={handleCreateSession}
            >
              <ThemedText style={ { color: palette.tint, ...Typography.smallSemiBold }}>
                Schedule Training
              </ThemedText>
            </Pressable>
          )}
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trainingHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  manageAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    paddingVertical: Spacing.xs,
  },
  inviteSquadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  addTrainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  trainingList: {
    gap: Spacing.sm,
  },
  trainingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  trainingItemLeft: {
    flex: 1,
    gap: Spacing.xxs,
  },
  trainingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  trainingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  trainingItemRight: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  squadTag: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
  },
  emptyTraining: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  createTrainingButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
});
