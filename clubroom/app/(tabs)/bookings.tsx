import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/bookings/booking-card';
import { Chip } from '@/components/primitives/chip';
import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { activeObjectives, paymentReminders, sessionHistory, upcomingBookings } from '@/constants/mock-data';
import { FootballObjective } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function BookingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          title="Bookings"
          subtitle="Manage your upcoming sessions and track your progress"
        />
        <View>
          {upcomingBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </View>
        <SurfaceCard>
          <ThemedText type="defaultSemiBold">Pinned objectives</ThemedText>
          <ThemedText style={styles.detailCopy}>
            Parents lock in up to three football goals per booking; coaches see the same chips before every session.
          </ThemedText>
          <View style={styles.objectiveRow}>
            {activeObjectives.map((objective) => (
              <Chip key={objective.id} active={objective.status === 'active'}>
                {objective.label}
              </Chip>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.manageButton,
              { backgroundColor: pressed ? palette.tintPressed : palette.tint },
            ]}
            onPress={() => console.log('Update objectives') }>
            <ThemedText style={styles.manageButtonLabel} lightColor="#ffffff" darkColor="#ffffff">
              Update objectives
            </ThemedText>
          </Pressable>
        </SurfaceCard>
        <SurfaceCard>
          <ThemedText type="defaultSemiBold">Status timeline</ThemedText>
          <ThemedText style={styles.detailCopy}>
            Available → Pending → Confirmed → Completed / Cancelled. Cancellation reasons capture actor, reason, and refund note.
          </ThemedText>
        </SurfaceCard>
        <SurfaceCard>
          <ThemedText type="defaultSemiBold">Session history</ThemedText>
          <ThemedText style={styles.detailCopy}>
            Every completed booking drops into a football-first timeline so kids can track dribbling, passing, and defending wins.
          </ThemedText>
          <View style={styles.historyList}>
            {sessionHistory.map((session, index) => (
              <View key={session.id} style={styles.historyRow}>
                <View style={styles.timelineCol}>
                  <View style={[styles.timelineDot, { backgroundColor: focusColor(session.focus) }]} />
                  {index !== sessionHistory.length - 1 ? (
                    <View style={styles.timelineLine} />
                  ) : null}
                </View>
                <View style={styles.historyContent}>
                  <View style={styles.historyHeader}>
                    <ThemedText type="defaultSemiBold">
                      {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </ThemedText>
                    <View
                      style={[
                        styles.focusPill,
                        {
                          backgroundColor: `${focusColor(session.focus)}15`,
                          borderColor: `${focusColor(session.focus)}55`,
                        },
                      ]}>
                      <ThemedText style={[styles.focusPillLabel, { color: focusColor(session.focus) }]}>
                        {session.focus}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.historyMeta}>with {session.coachName}</ThemedText>
                  <ThemedText style={styles.historyMeta}>{session.location}</ThemedText>
                  <ThemedText style={styles.historyHighlight}>{session.highlight}</ThemedText>
                  <View style={styles.historyBadges}>
                    {session.resultBadge ? (
                      <View style={[styles.badgePill, { backgroundColor: `${palette.secondary}22` }] }>
                        <ThemedText style={[styles.badgeLabel, { color: palette.secondary }]}>
                          {session.resultBadge}
                        </ThemedText>
                      </View>
                    ) : null}
                    {session.clipLabel ? (
                      <View style={[styles.badgePill, { backgroundColor: `${palette.tint}18` }] }>
                        <ThemedText style={[styles.badgeLabel, { color: palette.tint }]}>
                          {session.clipLabel}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </SurfaceCard>
        <SurfaceCard>
          <ThemedText type="defaultSemiBold">Payments & bundles</ThemedText>
          <ThemedText style={styles.detailCopy}>
            Stripe Connect rolls out next sprint, but parents already see transparent pricing, capture states, and refund cues.
          </ThemedText>
          {paymentReminders.map((reminder) => (
            <View key={reminder.id} style={styles.paymentRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{reminder.title}</ThemedText>
                <ThemedText style={styles.paymentMeta}>
                  Due {new Date(reminder.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·
                  ${reminder.amountUsd}
                </ThemedText>
                <ThemedText style={styles.paymentHint}>{reminder.description}</ThemedText>
              </View>
              <View
                style={[
                  styles.paymentStatus,
                  statusBackground(reminder.status, palette),
                ]}>
                <ThemedText style={styles.paymentStatusLabel}>{statusLabel(reminder.status)}</ThemedText>
              </View>
            </View>
          ))}
          <Pressable
            style={({ pressed }) => [
              styles.manageButton,
              {
                backgroundColor: pressed ? palette.surface : palette.card,
                borderColor: palette.border,
              },
            ]}
            onPress={() => console.log('Manage payment methods')}>
            <ThemedText style={[styles.manageButtonLabel, { color: palette.text }]}>Manage payment methods</ThemedText>
          </Pressable>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const focusColors: Record<FootballObjective, string> = {
  Dribbling: '#F97316',
  Passing: '#0EA5E9',
  Defending: '#7C3AED',
  Finishing: '#EF4444',
  Goalkeeping: '#14B8A6',
  Conditioning: '#F59E0B',
};

function focusColor(focus: FootballObjective) {
  return focusColors[focus];
}

function statusLabel(status: 'placeholder' | 'pending' | 'paid') {
  switch (status) {
    case 'paid':
      return 'Captured';
    case 'pending':
      return 'Pending';
    default:
      return 'Placeholder';
  }
}

function statusBackground(status: 'placeholder' | 'pending' | 'paid', palette: (typeof Colors)['light']) {
  switch (status) {
    case 'paid':
      return { backgroundColor: `${palette.success}22`, borderColor: `${palette.success}55` };
    case 'pending':
      return { backgroundColor: `${palette.warning}18`, borderColor: `${palette.warning}55` };
    default:
      return { backgroundColor: `${palette.icon}12`, borderColor: `${palette.icon}33` };
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  detailCopy: {
    marginTop: Spacing.sm,
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
  },
  objectiveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
  },
  manageButton: {
    marginTop: Spacing.md,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  manageButtonLabel: {
    ...Typography.sm,
    fontWeight: '700',
  },
  historyList: {
    marginTop: Spacing.md,
    gap: Spacing.lg,
  },
  historyRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timelineCol: {
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: Radii.pill,
    marginTop: Spacing.sm,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: Spacing.xs,
    backgroundColor: '#CBD5F5',
  },
  historyContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  focusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  focusPillLabel: {
    ...Typography.sm,
    fontWeight: '600',
  },
  historyMeta: {
    ...Typography.sm,
    opacity: 0.8,
  },
  historyHighlight: {
    ...Typography.base,
    fontWeight: '600',
  },
  historyBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badgePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  badgeLabel: {
    ...Typography.sm,
    fontWeight: '600',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  paymentMeta: {
    ...Typography.sm,
    opacity: 0.8,
    marginTop: 2,
  },
  paymentHint: {
    ...Typography.sm,
    opacity: 0.7,
    marginTop: Spacing.xs,
  },
  paymentStatus: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
  },
  paymentStatusLabel: {
    ...Typography.sm,
    fontWeight: '600',
  },
});
