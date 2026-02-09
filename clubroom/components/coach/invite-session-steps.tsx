/**
 * InviteSessionFlow — Step content components: choice, session list, confirm.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { UpcomingSession } from '@/hooks/use-invite-session-flow';
import { formatDateTime } from '@/hooks/use-invite-session-flow';
import type { Athlete } from '@/hooks/use-invite-athletes';

// --- Choice Step ---
export const ChoiceStep = memo(function ChoiceStep({ onSelect }: { onSelect: (choice: 'existing' | 'new') => void }) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.choiceContainer}>
      <ThemedText style={[styles.choiceSubtitle, { color: palette.muted }]}>How would you like to invite athletes?</ThemedText>
      <Clickable style={[styles.choiceCard, { backgroundColor: palette.background, borderColor: palette.tint }]} onPress={() => onSelect('existing')}>
        <View style={[styles.choiceIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="calendar" size={28} color={palette.tint} />
        </View>
        <View style={styles.choiceInfo}>
          <ThemedText type="defaultSemiBold" style={styles.choiceTitle}>Add to Existing Session</ThemedText>
          <ThemedText style={[styles.choiceDesc, { color: palette.muted }]}>Invite athletes to a session you&apos;ve already scheduled</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </Clickable>
      <Clickable style={[styles.choiceCard, { backgroundColor: palette.background, borderColor: palette.success }]} onPress={() => onSelect('new')}>
        <View style={[styles.choiceIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="add-circle" size={28} color={palette.success} />
        </View>
        <View style={styles.choiceInfo}>
          <ThemedText type="defaultSemiBold" style={styles.choiceTitle}>Create New Session</ThemedText>
          <ThemedText style={[styles.choiceDesc, { color: palette.muted }]}>Start fresh with a new session and invite athletes</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </Clickable>
    </View>
  );
});

// --- Session List Step ---
interface SessionListStepProps {
  sessions: UpcomingSession[];
  onSelect: (session: UpcomingSession) => void;
  onCreateNew: () => void;
}

export const SessionListStep = memo(function SessionListStep({ sessions, onSelect, onCreateNew }: SessionListStepProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.sessionList}>
      <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>Select an upcoming session to add athletes to</ThemedText>
      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>No upcoming sessions found</ThemedText>
          <Clickable style={[styles.createButton, { backgroundColor: palette.tint }]} onPress={onCreateNew}>
            <Ionicons name="add" size={18} color={palette.onPrimary} />
            <ThemedText style={[styles.createButtonText, { color: palette.onPrimary }]}>Create New Session</ThemedText>
          </Clickable>
        </View>
      ) : (
        sessions.map((session) => {
          const { dayName, date, time } = formatDateTime(session.scheduledAt);
          const spotsLeft = session.maxAthletes ? session.maxAthletes - (session.currentAthletes || 0) : null;
          return (
            <Clickable key={session.id} style={[styles.sessionCard, { backgroundColor: palette.background, borderColor: palette.border }]} onPress={() => onSelect(session)}>
              <View style={[styles.sessionDate, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                <ThemedText style={[styles.sessionDayName, { color: palette.tint }]}>{dayName}</ThemedText>
                <ThemedText style={[styles.sessionDateStr, { color: palette.tint }]}>{date}</ThemedText>
              </View>
              <View style={styles.sessionInfo}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>{session.title || 'Coaching Session'}</ThemedText>
                <View style={styles.sessionMeta}>
                  <Ionicons name="time-outline" size={14} color={palette.muted} />
                  <ThemedText style={[styles.sessionMetaText, { color: palette.muted }]}>{time}</ThemedText>
                  {session.location && (
                    <>
                      <Ionicons name="location-outline" size={14} color={palette.muted} style={{ marginLeft: 8 }} />
                      <ThemedText style={[styles.sessionMetaText, { color: palette.muted }]} numberOfLines={1}>{session.location}</ThemedText>
                    </>
                  )}
                </View>
                {spotsLeft !== null && (
                  <View style={[styles.spotsBadge, { backgroundColor: spotsLeft > 0 ? withAlpha(palette.success, 0.09) : withAlpha(palette.error, 0.09) }]}>
                    <ThemedText style={{ ...Typography.caption, color: spotsLeft > 0 ? palette.success : palette.error, fontWeight: '600' }}>
                      {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} available` : 'Full'}
                    </ThemedText>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </Clickable>
          );
        })
      )}
    </View>
  );
});

// --- Confirm Step ---
interface ConfirmStepProps {
  session: UpcomingSession;
  athletes: Athlete[];
  onConfirm: () => void;
  onChangeAthletes: () => void;
}

export const ConfirmStep = memo(function ConfirmStep({ session, athletes, onConfirm, onChangeAthletes }: ConfirmStepProps) {
  const { colors: palette } = useTheme();
  const { date, time } = formatDateTime(session.scheduledAt);
  return (
    <View style={styles.confirmContainer}>
      <SurfaceCard style={styles.confirmCard}>
        <View style={styles.confirmHeader}>
          <Ionicons name="checkmark-circle" size={48} color={palette.success} />
          <ThemedText type="subtitle" style={{ marginTop: Spacing.sm }}>Ready to Invite</ThemedText>
        </View>
        <Divider spacing={Spacing.sm} />
        <View style={styles.confirmDetail}>
          <ThemedText style={[styles.confirmLabel, { color: palette.muted }]}>Session</ThemedText>
          <ThemedText type="defaultSemiBold">{session.title || 'Coaching Session'}</ThemedText>
          <ThemedText style={{ ...Typography.small, color: palette.muted }}>{date} at {time}</ThemedText>
        </View>
        <View style={styles.confirmDetail}>
          <ThemedText style={[styles.confirmLabel, { color: palette.muted }]}>Athletes</ThemedText>
          <ThemedText type="defaultSemiBold">{athletes.length} athlete{athletes.length !== 1 ? 's' : ''}</ThemedText>
          <ThemedText style={{ ...Typography.small, color: palette.muted }} numberOfLines={2}>{athletes.map(a => a.name).join(', ')}</ThemedText>
        </View>
      </SurfaceCard>
      <Clickable style={[styles.confirmButton, { backgroundColor: palette.success }]} onPress={onConfirm}>
        <Ionicons name="paper-plane" size={18} color={palette.onPrimary} />
        <ThemedText style={[styles.confirmButtonText, { color: palette.onPrimary }]}>Send Invitations</ThemedText>
      </Clickable>
      <Clickable style={[styles.changeButton, { borderColor: palette.border }]} onPress={onChangeAthletes}>
        <ThemedText style={{ color: palette.tint }}>Change Athletes</ThemedText>
      </Clickable>
    </View>
  );
});

const styles = StyleSheet.create({
  choiceContainer: { gap: Spacing.md },
  choiceSubtitle: { ...Typography.body, marginBottom: Spacing.sm },
  choiceCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 2, gap: Spacing.md },
  choiceIcon: { width: 56, height: 56, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  choiceInfo: { flex: 1, gap: Spacing.xxs },
  choiceTitle: { ...Typography.subheading },
  choiceDesc: { ...Typography.small, lineHeight: 18 },
  sessionList: { gap: Spacing.sm },
  sectionSubtitle: { ...Typography.bodySmall, marginBottom: Spacing.sm },
  sessionCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, gap: Spacing.md },
  sessionDate: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: Spacing.sm, borderRadius: Radii.sm, minWidth: 50 },
  sessionDayName: { ...Typography.micro, textTransform: 'uppercase' },
  sessionDateStr: { ...Typography.caption },
  sessionInfo: { flex: 1, gap: Spacing.xxs },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  sessionMetaText: { ...Typography.caption },
  spotsBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: Spacing.micro, borderRadius: Radii.sm, marginTop: Spacing.xxs },
  emptyState: { alignItems: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.sm },
  emptyText: { ...Typography.body },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.md, marginTop: Spacing.md },
  createButtonText: { fontWeight: '600' },
  confirmContainer: { gap: Spacing.md },
  confirmCard: { padding: Spacing.lg, gap: Spacing.md },
  confirmHeader: { alignItems: 'center' },
  confirmDetail: { gap: Spacing.xxs },
  confirmLabel: { ...Typography.caption, textTransform: 'uppercase', fontWeight: '600' },
  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radii.md },
  confirmButtonText: { ...Typography.subheading },
  changeButton: { alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
});
