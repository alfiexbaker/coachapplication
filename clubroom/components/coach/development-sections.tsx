/**
 * CoachDevelopment — Section sub-components.
 */
import { memo } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import type { Booking } from '@/constants/app-types';
import { useTheme } from '@/hooks/useTheme';

import type { AthleteRosterEntry } from '@/hooks/use-coach-development';
import { formatDate, getUserById } from '@/hooks/use-coach-development';
import type { Session } from '@/constants/app-types';
import { Row } from '@/components/primitives';

// ---------------------------------------------------------------------------
// QuickActions row
// ---------------------------------------------------------------------------

function QuickActionsInner() {
  const { colors: palette } = useTheme();
  const actions = [
    { icon: 'calendar-number' as const, label: 'Bookings', route: Routes.BOOKINGS, color: palette.error },
    { icon: 'chatbubbles' as const, label: 'Messages', route: Routes.MESSAGES, color: palette.tint },
    { icon: 'calendar' as const, label: 'Schedule', route: Routes.SCHEDULE, color: palette.success },
    { icon: 'people' as const, label: 'Athletes', route: Routes.ATHLETES, color: palette.icon },
    { icon: 'paper-plane' as const, label: 'Send Invite', route: Routes.SESSION_INVITES_CREATE, color: palette.warning },
  ];
  return (
    <Row style={styles.quickRow}>
      {actions.map((a) => (
        <Clickable key={a.label}
          onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(a.route as Href); }}
          style={styles.quickItem}>
          <View style={[styles.quickIcon, { backgroundColor: withAlpha(a.color, 0.09) }]}>
            <Ionicons name={a.icon} size={20} color={a.color} />
          </View>
          <ThemedText style={[styles.quickLabel, { color: palette.text }]}>{a.label}</ThemedText>
        </Clickable>
      ))}
    </Row>
  );
}

export const QuickActions = memo(QuickActionsInner);

// ---------------------------------------------------------------------------
// CompletionCard — Sessions awaiting completion
// ---------------------------------------------------------------------------

function CompletionCardInner({ bookings }: { bookings: Booking[] }) {
  const { colors: palette } = useTheme();
  if (bookings.length === 0) return null;
  return (
    <SurfaceCard style={[styles.sectionCard, styles.completionCard, { borderLeftColor: palette.warning }]}>
      <Row style={styles.completionHeader}>
        <View style={[styles.completionIcon, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
          <Ionicons name="clipboard-outline" size={20} color={palette.warning} />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {bookings.length} session{bookings.length !== 1 ? 's' : ''} need completing
        </ThemedText>
      </Row>
      {bookings.slice(0, 3).map((booking) => {
        const sessionDate = new Date(booking.scheduledAt);
        const isToday = sessionDate.toDateString() === new Date().toDateString();
        const timeStr = sessionDate.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
        const dateStr = isToday ? `Today ${timeStr}` : `${sessionDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${timeStr}`;
        return (
          <Clickable key={booking.id} style={[styles.completionRow, { borderColor: palette.border }]}
            onPress={() => router.push(Routes.sessionComplete(booking.id))}>
            <View style={styles.completionRowContent}>
              <ThemedText type="defaultSemiBold" style={styles.completionRowTitle} numberOfLines={1}>
                {booking.service || 'Session'} {booking.athleteName ? `with ${booking.athleteName}` : ''}
              </ThemedText>
              <ThemedText style={[styles.completionRowMeta, { color: palette.muted }]}>{dateStr}</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </Clickable>
        );
      })}
      <ThemedText style={[styles.completionHint, { color: palette.muted }]}>Tap to mark attendance & add notes</ThemedText>
    </SurfaceCard>
  );
}

export const CompletionCard = memo(CompletionCardInner);

// ---------------------------------------------------------------------------
// AttentionSection — Athletes needing follow-up
// ---------------------------------------------------------------------------

function AttentionSectionInner({ athletes, logger }: { athletes: AthleteRosterEntry[]; logger: { press: (event: string, data: Record<string, unknown>) => void } }) {
  const { colors: palette } = useTheme();
  return (
    <SurfaceCard style={styles.sectionCard}>
      <Row style={styles.sectionHeaderRow}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Needs attention</ThemedText>
        <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Prioritised by recency and missing notes</ThemedText>
      </Row>
      {athletes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
            <Ionicons name="checkmark-circle" size={28} color={palette.tint} />
          </View>
          <ThemedText type="defaultSemiBold">All caught up</ThemedText>
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>No athletes need follow-up right now.</ThemedText>
        </View>
      ) : (
        <View style={styles.attentionList}>
          {athletes.map((entry) => (
            <Clickable key={entry.athlete.id}
              onPress={() => { logger.press('AttentionAthlete', { athleteId: entry.athlete.id, athleteName: entry.athlete.name, needsNotes: entry.needsNotes }); router.push(Routes.developmentAthlete(entry.athlete.id)); }}
              style={[styles.rowCard, { borderColor: palette.border }]}>
              <Row style={styles.rowTop}>
                <Row style={styles.rowLeft}>
                  <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                    <ThemedText style={[styles.avatarText, { color: palette.tint }]}>{entry.athlete.avatar || entry.athlete.name.charAt(0)}</ThemedText>
                    {entry.needsNotes && <View style={[styles.badge, { backgroundColor: palette.error, borderColor: palette.surface }]} />}
                  </View>
                  <View style={styles.rowContent}>
                    <ThemedText type="defaultSemiBold" style={styles.athleteName} numberOfLines={1}>{entry.athlete.name}</ThemedText>
                    <ThemedText style={[styles.subtleMeta, { color: palette.muted }]}>{entry.sessionCount} sessions · Last {formatDate(entry.lastSession)}</ThemedText>
                  </View>
                </Row>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} />
              </Row>
              <Row style={styles.actionRow}>
                {entry.needsNotes && <Row style={[styles.pill, { backgroundColor: withAlpha(palette.error, 0.06) }]}><Ionicons name="document-text" size={12} color={palette.error} /><ThemedText style={[styles.pillLabel, { color: palette.error }]}>Add notes</ThemedText></Row>}
                {entry.averageRating < 4 && <Row style={[styles.pill, { backgroundColor: withAlpha(palette.tint, 0.06) }]}><Ionicons name="trending-up" size={12} color={palette.tint} /><ThemedText style={[styles.pillLabel, { color: palette.tint }]}>Boost rating</ThemedText></Row>}
                {entry.daysSinceLast >= 10 && <Row style={[styles.pill, { backgroundColor: withAlpha(palette.icon, 0.06) }]}><Ionicons name="time" size={12} color={palette.icon} /><ThemedText style={[styles.pillLabel, { color: palette.icon }]}>Reach out</ThemedText></Row>}
              </Row>
            </Clickable>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
}

export const AttentionSection = memo(AttentionSectionInner);

// ---------------------------------------------------------------------------
// RecentSessionsSection
// ---------------------------------------------------------------------------

function RecentSessionsSectionInner({ sessions, logger }: { sessions: Session[]; logger: { press: (event: string, data: Record<string, unknown>) => void } }) {
  const { colors: palette } = useTheme();
  return (
    <SurfaceCard style={styles.sectionCard}>
      <Row style={styles.sectionHeaderRow}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Recent sessions</ThemedText>
        <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Open feedback to share notes or badges</ThemedText>
      </Row>
      <View style={{ gap: Spacing.xs }}>
        {sessions.map((session) => {
          const athlete = getUserById(session.athleteId);
          return (
            <Row key={session.id} style={[styles.recentRow, { borderColor: palette.border }]}>
              <Row style={styles.rowLeft}>
                <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                  <ThemedText style={[styles.avatarText, { color: palette.tint }]}>{athlete?.avatar || athlete?.name?.charAt(0) || '?'}</ThemedText>
                </View>
                <View style={styles.rowContent}>
                  <ThemedText type="defaultSemiBold" style={styles.athleteName}>{athlete?.name || 'Athlete'}</ThemedText>
                  <ThemedText style={[styles.athleteMetadata, { color: palette.muted }]}>{formatDate(session.completedAt)} · Rated {session.performanceRating}</ThemedText>
                </View>
              </Row>
              <Clickable onPress={() => { logger.press('SessionFeedbackOpen', { sessionId: session.id, athleteId: session.athleteId, source: 'RecentSessions' }); router.push(Routes.developmentSession(session.id)); }}>
                <Row style={[styles.actionPill, { borderColor: palette.tint }]}>
                  <Ionicons name="create-outline" size={14} color={palette.tint} />
                  <ThemedText style={[styles.pillLabel, { color: palette.tint }]}>Open feedback</ThemedText>
                </Row>
              </Clickable>
            </Row>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

export const RecentSessionsSection = memo(RecentSessionsSectionInner);

// ---------------------------------------------------------------------------
// BadgesShortcut
// ---------------------------------------------------------------------------

function BadgesShortcutInner({ logger }: { logger: { press: (event: string, data: Record<string, unknown>) => void } }) {
  const { colors: palette } = useTheme();
  return (
    <Clickable
      onPress={() => { logger.press('BadgesShortcut', { source: 'CoachDevelopment' }); router.push(Routes.DEVELOPMENT_BADGES); }}
      style={[styles.badgesShortcut, { borderColor: palette.border }]}>
      <View style={[styles.badgesIcon, { backgroundColor: withAlpha(palette.success, 0.07) }]}>
        <Ionicons name="ribbon" size={20} color={palette.success} />
      </View>
      <View style={styles.rowContent}>
        <ThemedText type="defaultSemiBold" style={styles.athleteName}>Badges & Awards</ThemedText>
        <ThemedText style={[styles.subtleMeta, { color: palette.muted }]}>Award badges, view athlete achievements</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.muted} />
    </Clickable>
  );
}

export const BadgesShortcut = memo(BadgesShortcutInner);

const styles = StyleSheet.create({
  quickRow: { justifyContent: 'space-between', gap: Spacing.xs },
  quickItem: { alignItems: 'center', gap: Spacing.xxs, flex: 1 },
  quickIcon: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { ...Typography.caption },
  sectionCard: { gap: Spacing.sm, padding: Spacing.sm },
  sectionHeaderRow: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  sectionHint: { ...Typography.caption },
  completionCard: { borderLeftWidth: 3 },
  completionHeader: { alignItems: 'center', gap: Spacing.sm },
  completionIcon: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  completionRow: { alignItems: 'center', padding: Spacing.sm, borderRadius: Radii.sm, borderWidth: 1, gap: Spacing.sm },
  completionRowContent: { flex: 1, gap: Spacing.micro },
  completionRowTitle: { ...Typography.bodySmall, letterSpacing: -0.1 },
  completionRowMeta: { ...Typography.caption },
  completionHint: { ...Typography.caption, textAlign: 'center' },
  attentionList: { gap: Spacing.xs },
  rowCard: { padding: Spacing.sm, borderRadius: Radii.card, borderWidth: 1, gap: Spacing.sm, alignItems: 'stretch' },
  rowTop: { alignItems: 'center', gap: Spacing.sm },
  rowLeft: { flex: 1, alignItems: 'center', gap: Spacing.sm },
  rowContent: { flex: 1, gap: Spacing.micro },
  actionRow: { flexWrap: 'wrap', gap: Spacing.xxs },
  pill: { alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  pillLabel: { ...Typography.caption, letterSpacing: -0.1 },
  actionPill: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.md, borderWidth: 1 },
  subtleMeta: { ...Typography.caption, lineHeight: 18 },
  avatar: { width: Components.avatar.md, height: Components.avatar.md, borderRadius: Components.avatar.md / 2, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible' },
  avatarText: { ...Typography.heading },
  badge: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: Radii.sm, borderWidth: 2 },
  athleteName: { ...Typography.bodySemiBold, letterSpacing: -0.1 },
  athleteMetadata: { ...Typography.small },
  recentRow: { padding: Spacing.sm, borderRadius: Radii.card, borderWidth: 1, alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  emptyState: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing['2xl'], paddingHorizontal: Spacing.xl },
  emptyIconCircle: { width: Components.listItem.large, height: Components.listItem.large, borderRadius: Components.listItem.large / 2, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  emptyText: { ...Typography.bodySmall, lineHeight: 20, textAlign: 'center', maxWidth: 260 },
  badgesShortcut: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.card, borderWidth: 1 },
  badgesIcon: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
});
