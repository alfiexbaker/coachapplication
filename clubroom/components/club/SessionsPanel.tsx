import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { groupSessionService } from '@/services/group-session-service';
import type { GroupSession } from '@/constants/types';

export interface SessionsPanelProps {
  sessions: GroupSession[];
  isCoach: boolean;
  onCreateSession?: () => void;
  onInviteSquad?: () => void;
}

export function SessionsPanel({ sessions, isCoach, onCreateSession, onInviteSquad }: SessionsPanelProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const handleCreateSession = () => {
    if (onCreateSession) {
      onCreateSession();
    } else {
      router.push('/group-sessions/create');
    }
  };

  const handleInviteSquad = () => {
    if (onInviteSquad) {
      onInviteSquad();
    } else {
      router.push('/session-invites/group');
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
            <TouchableOpacity
              style={[styles.inviteSquadButton, { borderColor: palette.tint }]}
              onPress={handleInviteSquad}
            >
              <Ionicons name="people" size={14} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontSize: 12, fontWeight: '600' }}>Invite Squad</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addTrainingButton, { backgroundColor: palette.tint }]}
              onPress={handleCreateSession}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Add</ThemedText>
            </TouchableOpacity>
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
              <TouchableOpacity
                key={session.id}
                style={[styles.trainingItem, { borderColor: palette.border }]}
                onPress={() => router.push({
                  pathname: '/group-sessions/[id]',
                  params: { id: session.id },
                })}
              >
                <View style={styles.trainingItemLeft}>
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
                    {session.title}
                  </ThemedText>
                  <View style={styles.trainingMeta}>
                    {session.isRecurring && (
                      <View style={[styles.recurringBadge, { backgroundColor: `${palette.tint}15` }]}>
                        <Ionicons name="repeat" size={10} color={palette.tint} />
                        <ThemedText style={{ color: palette.tint, fontSize: 10 }}>
                          {dayName}s
                        </ThemedText>
                      </View>
                    )}
                    <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                      {nextDate ? `${nextDate.startTime} - ${nextDate.endTime}` : ''}
                    </ThemedText>
                  </View>
                  <View style={styles.trainingLocation}>
                    <Ionicons name="location-outline" size={12} color={palette.muted} />
                    <ThemedText style={{ color: palette.muted, fontSize: 11 }} numberOfLines={1}>
                      {session.location}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.trainingItemRight}>
                  {session.squadName && (
                    <View style={[styles.squadTag, { backgroundColor: `${palette.tint}10` }]}>
                      <ThemedText style={{ color: palette.tint, fontSize: 10, fontWeight: '600' }}>
                        {session.squadName}
                      </ThemedText>
                    </View>
                  )}
                  {session.pricePerParticipant === 0 ? (
                    <ThemedText style={{ color: palette.success, fontSize: 12, fontWeight: '600' }}>
                      Free
                    </ThemedText>
                  ) : (
                    <ThemedText style={{ color: palette.text, fontSize: 12, fontWeight: '600' }}>
                      {groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
                    </ThemedText>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          {sessions.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/club/training-schedule')}
            >
              <ThemedText style={{ color: palette.tint, fontSize: 13 }}>
                View all {sessions.length} training sessions
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={palette.tint} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.emptyTraining}>
          <Ionicons name="calendar-outline" size={32} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, fontSize: 13, textAlign: 'center' }}>
            No training sessions scheduled
          </ThemedText>
          {isCoach && (
            <TouchableOpacity
              style={[styles.createTrainingButton, { borderColor: palette.tint }]}
              onPress={handleCreateSession}
            >
              <ThemedText style={{ color: palette.tint, fontSize: 13, fontWeight: '600' }}>
                Schedule Training
              </ThemedText>
            </TouchableOpacity>
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
  inviteSquadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  addTrainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    gap: 4,
  },
  trainingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  trainingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trainingItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  squadTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
