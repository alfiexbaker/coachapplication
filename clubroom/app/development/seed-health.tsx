import { ScrollView, StyleSheet, View } from 'react-native';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { useScreen } from '@/hooks/use-screen';
import { apiClient } from '@/services/api-client';
import { err, ok, storageError, type Result, type ServiceError } from '@/types/result';

const EXTRA_KEYS = {
  COACH_PUBLIC_REVIEWS: 'clubroom.coach_reviews',
  COACH_BOOKINGS: 'coach_bookings',
};
const RELATIONAL_DEMO_FALLBACK_CLUB_ID = 'club_lions';
const CLUB_MEMBERS_KEY = `${STORAGE_KEYS.CLUB_MEMBERS}_${RELATIONAL_DEMO_FALLBACK_CLUB_ID}`;

interface SeedUserRecord {
  id: string;
}

interface ChildProfileRecord {
  parentId: string;
}

interface SessionOfferingRecord {
  coachId?: string | null;
}

interface ClubMemberRecord {
  userId: string;
}

interface SectionMetric {
  label: string;
  count: number;
}

interface SeedSection {
  id: string;
  title: string;
  metrics: SectionMetric[];
  total: number;
}

interface SeedHealthSnapshot {
  generatedAtIso: string;
  seedVersion: string;
  lastBootstrapUser: string;
  lastPulseAtIso: string;
  sections: SeedSection[];
  overallRows: number;
  healthySections: number;
}

export default function DevelopmentSeedHealthScreen() {
  const { data, status, error, onRefresh, retry, refreshing, colors } = useScreen<SeedHealthSnapshot>(
    {
      load: loadSeedHealthSnapshot,
      isEmpty: () => false,
    },
  );

  if (status === 'loading') {
    return (
      <PageContainer
        header={<PageHeader title="Seed Health" subtitle="Checking seeded data coverage" showBack />}
      >
        <LoadingState variant="list" />
      </PageContainer>
    );
  }

  if (status === 'error' || !data) {
    return (
      <PageContainer
        header={<PageHeader title="Seed Health" subtitle="Unable to load seed status" showBack />}
      >
        <ErrorState
          title="Seed health unavailable"
          message={error?.message ?? 'Failed to load seed health snapshot.'}
          onRetry={retry}
          error={error ?? undefined}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      scrollable={false}
      gap={Spacing.md}
      header={
        <PageHeader
          title="Seed Health"
          subtitle="Pre-API live data coverage"
          showBack
          action="Refresh"
          rightActionLoading={refreshing}
          onActionPress={onRefresh}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SurfaceCard
          style={[
            styles.summaryCard,
            {
              backgroundColor: withAlpha(colors.tint, 0.07),
              borderColor: withAlpha(colors.tint, 0.22),
            },
          ]}
        >
          <ThemedText type="subtitle">Snapshot</ThemedText>
          <View style={styles.summaryRows}>
            <SummaryRow label="Seed version" value={data.seedVersion} />
            <SummaryRow label="Last bootstrap user" value={data.lastBootstrapUser || 'n/a'} />
            <SummaryRow label="Last pulse" value={data.lastPulseAtIso} />
            <SummaryRow label="Generated" value={data.generatedAtIso} />
            <SummaryRow label="Healthy sections" value={`${data.healthySections}/${data.sections.length}`} />
            <SummaryRow label="Total rows counted" value={String(data.overallRows)} />
          </View>
        </SurfaceCard>

        {data.sections.map((section) => {
          const healthy = section.total > 0;
          return (
            <SurfaceCard key={section.id} style={styles.sectionCard}>
              <Row align="center" justify="between" style={styles.sectionHeader}>
                <ThemedText type="defaultSemiBold">{section.title}</ThemedText>
                <ThemedText
                  style={{ color: healthy ? colors.success : colors.destructive }}
                >
                  {healthy ? 'LIVE' : 'EMPTY'}
                </ThemedText>
              </Row>
              <View style={styles.metricRows}>
                {section.metrics.map((metric) => (
                  <Row key={`${section.id}_${metric.label}`} align="center" justify="between">
                    <ThemedText style={styles.metricLabel}>{metric.label}</ThemedText>
                    <ThemedText
                      type="defaultSemiBold"
                      style={{ color: metric.count > 0 ? colors.text : colors.destructive }}
                    >
                      {metric.count}
                    </ThemedText>
                  </Row>
                ))}
              </View>
            </SurfaceCard>
          );
        })}
      </ScrollView>
    </PageContainer>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Row align="center" justify="between">
      <ThemedText style={[Typography.small]}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={[Typography.small]}>
        {value}
      </ThemedText>
    </Row>
  );
}

async function loadSeedHealthSnapshot(): Promise<Result<SeedHealthSnapshot, ServiceError>> {
  try {
    const [
      seedVersion,
      lastBootstrapUser,
      lastPulseAt,
      users,
      bookings,
      offerings,
      childrenProfiles,
      invites,
      coachSessions,
      squads,
      squadMembers,
      roster,
      familyMembers,
      familyBookings,
      injuries,
      concerns,
      reports,
      problemReports,
      recurring,
      invoices,
      counterOffers,
      negotiations,
      goals,
      sessionNotes,
      badgeAwards,
      sessionJournal,
      practiceLogs,
      messagesByThread,
      notifications,
      favourites,
      coachReviews,
      coachBookings,
      clubMembers,
    ] = await Promise.all([
      apiClient.get<string>(STORAGE_KEYS.RELATIONAL_DEMO_SEED_VERSION, ''),
      apiClient.get<string>(STORAGE_KEYS.PRE_API_LIVE_LAST_BOOTSTRAP_USER, ''),
      apiClient.get<number>(STORAGE_KEYS.PRE_API_LIVE_LAST_PULSE_AT, 0),
      apiClient.get<SeedUserRecord[]>(STORAGE_KEYS.USERS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.BOOKINGS, []),
      apiClient.get<SessionOfferingRecord[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
      apiClient.get<ChildProfileRecord[]>(STORAGE_KEYS.CHILDREN_PROFILES, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.SESSION_INVITES, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.COACH_SESSIONS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.CLUB_SQUADS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.SQUAD_MEMBERS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.ROSTER, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.FAMILY_MEMBERS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.FAMILY_BOOKINGS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.INJURIES, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.CONCERNS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.REPORTS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.PROBLEM_REPORTS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.RECURRING_BOOKINGS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.INVOICES, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.COUNTER_OFFERS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.NEGOTIATIONS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.GOALS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.SESSION_NOTES, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.BADGE_AWARDS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.SESSION_JOURNAL, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, []),
      apiClient.get<Record<string, unknown[]>>(STORAGE_KEYS.MESSAGES, {}),
      apiClient.get<unknown[]>(STORAGE_KEYS.NOTIFICATIONS, []),
      apiClient.get<unknown[]>(STORAGE_KEYS.FAVOURITES, []),
      apiClient.get<unknown[]>(EXTRA_KEYS.COACH_PUBLIC_REVIEWS, []),
      apiClient.get<unknown[]>(EXTRA_KEYS.COACH_BOOKINGS, []),
      apiClient.get<ClubMemberRecord[]>(CLUB_MEMBERS_KEY, []),
    ]);

    const messageThreadCount = Object.keys(messagesByThread ?? {}).length;
    const messageCount = Object.values(messagesByThread ?? {}).reduce(
      (total, messages) => total + (Array.isArray(messages) ? messages.length : 0),
      0,
    );
    const offeringCoachIds = new Set(
      offerings
        .map((offering) => offering.coachId)
        .filter((coachId): coachId is string => Boolean(coachId)),
    );
    const clubMemberUserIds = new Set(clubMembers.map((member) => member.userId));
    const hasUser1Kids = childrenProfiles.some((profile) => profile.parentId === 'user1');
    const hasParentNoKids =
      users.some((user) => user.id === 'parent_nokids')
      && !childrenProfiles.some((profile) => profile.parentId === 'parent_nokids');
    const hasClubLinkedUser = clubMemberUserIds.has('user_club_linked');
    const hasUnlinkedUser =
      users.some((user) => user.id === 'user_no_kids') && !clubMemberUserIds.has('user_no_kids');
    const hasDenseCoachOfferingCoverage = offeringCoachIds.size >= 7 && offerings.length >= 14;

    const sections: SeedSection[] = [
      buildSection('marketplace', 'Marketplace Core', [
        { label: 'Users', count: users.length },
        { label: 'Bookings', count: bookings.length },
        { label: 'Offerings', count: offerings.length },
        { label: 'Invites', count: invites.length },
        { label: 'Coach sessions', count: coachSessions.length },
      ]),
      buildSection('club_ops', 'Club & Team Ops', [
        { label: 'Club squads', count: squads.length },
        { label: 'Squad members', count: squadMembers.length },
        { label: 'Roster entries', count: roster.length },
        { label: 'Coach bookings', count: coachBookings.length },
      ]),
      buildSection('family_safety', 'Family & Safety', [
        { label: 'Family members', count: familyMembers.length },
        { label: 'Family bookings', count: familyBookings.length },
        { label: 'Children profiles', count: childrenProfiles.length },
        { label: 'Injuries', count: injuries.length },
        { label: 'Concerns', count: concerns.length },
        { label: 'Reports', count: reports.length + problemReports.length },
      ]),
      buildSection('revenue', 'Revenue & Negotiation', [
        { label: 'Recurring bookings', count: recurring.length },
        { label: 'Invoices', count: invoices.length },
        { label: 'Counter offers', count: counterOffers.length },
        { label: 'Negotiations', count: negotiations.length },
      ]),
      buildSection('development', 'Development & Progress', [
        { label: 'Goals', count: goals.length },
        { label: 'Session notes', count: sessionNotes.length },
        { label: 'Badge awards', count: badgeAwards.length },
        { label: 'Journal entries', count: sessionJournal.length },
        { label: 'Practice logs', count: practiceLogs.length },
      ]),
      buildSection('community', 'Community & Messaging', [
        { label: 'Message threads', count: messageThreadCount },
        { label: 'Messages', count: messageCount },
        { label: 'Notifications', count: notifications.length },
        { label: 'Favourites', count: favourites.length },
        { label: 'Coach reviews', count: coachReviews.length },
      ]),
      buildSection('edge_cases', 'Edge Case Coverage', [
        { label: 'User1 has kids', count: hasUser1Kids ? 1 : 0 },
        { label: 'Parent account with no kids', count: hasParentNoKids ? 1 : 0 },
        { label: 'Club-linked user exists', count: hasClubLinkedUser ? 1 : 0 },
        { label: 'Unlinked user exists', count: hasUnlinkedUser ? 1 : 0 },
        { label: 'Unique coaches in offerings', count: offeringCoachIds.size },
        { label: 'Dense offering coverage', count: hasDenseCoachOfferingCoverage ? 1 : 0 },
      ]),
    ];

    const overallRows = sections.reduce((total, section) => total + section.total, 0);
    const healthySections = sections.filter((section) => section.total > 0).length;

    return ok({
      generatedAtIso: new Date().toISOString(),
      seedVersion: seedVersion || 'missing',
      lastBootstrapUser,
      lastPulseAtIso: lastPulseAt > 0 ? new Date(lastPulseAt).toISOString() : 'n/a',
      sections,
      overallRows,
      healthySections,
    });
  } catch (error) {
    return err(storageError(`Failed to build seed health snapshot: ${String(error)}`));
  }
}

function buildSection(id: string, title: string, metrics: SectionMetric[]): SeedSection {
  const total = metrics.reduce((sum, metric) => sum + metric.count, 0);
  return {
    id,
    title,
    metrics,
    total,
  };
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  summaryCard: {
    gap: Spacing.sm,
  },
  summaryRows: {
    gap: Spacing.xs,
  },
  sectionCard: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },
  metricRows: {
    gap: Spacing.xs,
  },
  metricLabel: {
    ...Typography.small,
  },
});
