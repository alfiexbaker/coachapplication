import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { DemoWalkthroughCard } from '@/components/ui/demo-walkthrough-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useClubDashboard } from '@/hooks/use-club-dashboard';
import { Routes } from '@/navigation/routes';
import { buildOwnerDemoWalkthrough } from '@/utils/demo-walkthrough';
import type {
  OwnerDashboardSupportIssue,
  OwnerDashboardSummary,
} from '@/services/org-owner-dashboard-service';
import type {
  HeadCoachCoachHealth,
  HeadCoachCompletionItem,
} from '@/services/org-head-coach-service';
import type { OrgWorkItem } from '@/services/org-staffing-service';

function formatDateLabel(iso?: string): string {
  if (!iso) return 'Date pending';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MetricCard(props: {
  label: string;
  value: number;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'tint' | 'warning' | 'success' | 'error';
}) {
  const { colors } = useTheme();
  const toneColor = colors[props.tone];

  return (
    <SurfaceCard style={[styles.metricCard, { borderColor: colors.border }]} tactile={false}>
      <View style={[styles.metricIcon, { backgroundColor: withAlpha(toneColor, 0.12) }]}>
        <Ionicons name={props.icon} size={18} color={toneColor} />
      </View>
      <ThemedText style={styles.metricValue}>{props.value}</ThemedText>
      <ThemedText style={styles.metricLabel}>{props.label}</ThemedText>
      <ThemedText style={[styles.metricDetail, { color: colors.muted }]}>{props.detail}</ThemedText>
    </SurfaceCard>
  );
}

function SectionHeader(props: { title: string; caption: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{props.title}</ThemedText>
      <ThemedText style={[styles.sectionCaption, { color: colors.muted }]}>
        {props.caption}
      </ThemedText>
    </View>
  );
}

function ActionLink(props: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Clickable
      onPress={props.onPress}
      style={[styles.actionLink, { borderColor: colors.border, backgroundColor: colors.surface }]}
      accessibilityRole="button"
      accessibilityLabel={props.title}
    >
      <Row gap="sm" align="center">
        <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <Ionicons name={props.icon} size={18} color={colors.tint} />
        </View>
        <View style={styles.actionBody}>
          <ThemedText style={styles.actionTitle}>{props.title}</ThemedText>
          <ThemedText style={[styles.actionDescription, { color: colors.muted }]}>
            {props.description}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Row>
    </Clickable>
  );
}

function UnassignedRow(props: { item: OrgWorkItem; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Clickable onPress={props.onPress} style={styles.rowPressable}>
      <SurfaceCard style={[styles.listRow, { borderColor: colors.border }]} tactile={false}>
        <Row align="start" gap="sm">
          <View style={[styles.rowIcon, { backgroundColor: withAlpha(colors.warning, 0.12) }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          </View>
          <View style={styles.rowBody}>
            <ThemedText style={styles.rowTitle}>{props.item.title}</ThemedText>
            <ThemedText style={[styles.rowMeta, { color: colors.muted }]}>
              {formatDateLabel(props.item.scheduledAt)} · {props.item.location}
            </ThemedText>
            <ThemedText style={[styles.rowMeta, { color: colors.muted }]}>
              {props.item.linkedBookingCount} linked booking
              {props.item.linkedBookingCount === 1 ? '' : 's'} · no coach assigned
            </ThemedText>
          </View>
        </Row>
      </SurfaceCard>
    </Clickable>
  );
}

function CoachHealthRow(props: { item: HeadCoachCoachHealth; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Clickable onPress={props.onPress} style={styles.rowPressable}>
      <SurfaceCard style={[styles.listRow, { borderColor: colors.border }]} tactile={false}>
        <Row align="start" gap="sm">
          <View style={[styles.rowIcon, { backgroundColor: withAlpha(colors.success, 0.12) }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
          </View>
          <View style={styles.rowBody}>
            <ThemedText style={styles.rowTitle}>{props.item.coachName}</ThemedText>
            <ThemedText style={[styles.rowMeta, { color: colors.muted }]}>
              {props.item.overdueCompletionCount} overdue completion ·{' '}
              {props.item.overdueFollowUpCount} overdue follow-up
            </ThemedText>
            <ThemedText style={[styles.rowMeta, { color: colors.muted }]}>
              {props.item.openTaskCount} open task{props.item.openTaskCount === 1 ? '' : 's'} ·{' '}
              {props.item.watchAthleteCount} watch athlete
              {props.item.watchAthleteCount === 1 ? '' : 's'}
            </ThemedText>
          </View>
        </Row>
      </SurfaceCard>
    </Clickable>
  );
}

function CompletionRow(props: { item: HeadCoachCompletionItem; onPress: () => void }) {
  const { colors } = useTheme();
  const tone = props.item.overdue ? colors.error : colors.warning;

  return (
    <Clickable onPress={props.onPress} style={styles.rowPressable}>
      <SurfaceCard style={[styles.listRow, { borderColor: colors.border }]} tactile={false}>
        <Row align="start" gap="sm">
          <View style={[styles.rowIcon, { backgroundColor: withAlpha(tone, 0.12) }]}>
            <Ionicons
              name={props.item.overdue ? 'time-outline' : 'document-text-outline'}
              size={18}
              color={tone}
            />
          </View>
          <View style={styles.rowBody}>
            <ThemedText style={styles.rowTitle}>{props.item.athleteName}</ThemedText>
            <ThemedText style={[styles.rowMeta, { color: colors.muted }]}>
              {props.item.coachName} · {props.item.service}
            </ThemedText>
            <ThemedText style={[styles.rowMeta, { color: colors.muted }]}>
              Due {formatDateLabel(props.item.dueAt)}
            </ThemedText>
          </View>
        </Row>
      </SurfaceCard>
    </Clickable>
  );
}

function SupportIssueRow(props: { item: OwnerDashboardSupportIssue; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Clickable onPress={props.onPress} style={styles.rowPressable}>
      <SurfaceCard style={[styles.listRow, { borderColor: colors.border }]} tactile={false}>
        <Row align="start" gap="sm">
          <View style={[styles.rowIcon, { backgroundColor: withAlpha(colors.error, 0.12) }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.error} />
          </View>
          <View style={styles.rowBody}>
            <ThemedText style={styles.rowTitle}>
              {props.item.category} · {props.item.athleteLabel}
            </ThemedText>
            <ThemedText style={[styles.rowMeta, { color: colors.muted }]}>
              {props.item.sessionTitle} · {formatDateLabel(props.item.createdAt)}
            </ThemedText>
            <ThemedText style={[styles.rowMeta, { color: colors.muted }]}>
              Support: {props.item.supportLabel} · Delivered by {props.item.deliveredByLabel}
            </ThemedText>
          </View>
        </Row>
      </SurfaceCard>
    </Clickable>
  );
}

function SnapshotCopy({ summary }: { summary: OwnerDashboardSummary }) {
  const { colors } = useTheme();
  return (
    <SurfaceCard style={[styles.snapshotCard, { borderColor: colors.border }]} tactile={false}>
      <ThemedText style={styles.snapshotTitle}>Today&apos;s org picture</ThemedText>
      <ThemedText style={[styles.snapshotText, { color: colors.muted }]}>
        {summary.unassignedCount > 0
          ? `${summary.unassignedCount} session${summary.unassignedCount === 1 ? '' : 's'} still need a coach assignment.`
          : 'All live org sessions currently have a delivery coach assigned.'}
      </ThemedText>
      <ThemedText style={[styles.snapshotText, { color: colors.muted }]}>
        {summary.overdueCompletionCount > 0 || summary.overdueFollowUpCount > 0
          ? `${summary.overdueCompletionCount} completion item${summary.overdueCompletionCount === 1 ? '' : 's'} and ${summary.overdueFollowUpCount} follow-up item${summary.overdueFollowUpCount === 1 ? '' : 's'} are overdue.`
          : 'Delivery follow-up is currently inside the expected window.'}
      </ThemedText>
      <ThemedText style={[styles.snapshotText, { color: colors.muted }]}>
        {summary.supportIssueCount > 0
          ? `${summary.supportIssueCount} parent support issue${summary.supportIssueCount === 1 ? '' : 's'} still need review.`
          : 'No unresolved parent support issues are currently open.'}
      </ThemedText>
    </SurfaceCard>
  );
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { clubId, dashboard, status, error, retry, refreshing, onRefresh, navigateTo } =
    useClubDashboard();
  const walkthrough = buildOwnerDemoWalkthrough(clubId);

  if (status === 'loading') {
    return (
      <PageContainer header={<PageHeader title="Owner Dashboard" showBack />}>
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer header={<PageHeader title="Owner Dashboard" showBack />}>
        <ErrorState message={error?.message || 'Failed to load owner dashboard.'} onRetry={retry} />
      </PageContainer>
    );
  }

  if (status === 'empty' || !dashboard) {
    return (
      <PageContainer header={<PageHeader title="Owner Dashboard" showBack />}>
        <EmptyState
          icon="speedometer-outline"
          title="No owner dashboard data"
          message="This club does not have enough live operating data yet."
          actionLabel="Retry"
          onPressAction={retry}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <PageHeader
          title="Owner Dashboard"
          subtitle={`${dashboard.club.name} · ${dashboard.viewerMembership.role}`}
          showBack
        />
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      gap={Spacing.md}
    >
      <DemoWalkthroughCard
        walkthrough={walkthrough}
        onPressStep={(step) => navigateTo(step.route)}
      />
      <SnapshotCopy summary={dashboard.summary} />

      <View style={styles.metricGrid}>
        <MetricCard
          label="Live org sessions"
          value={dashboard.summary.activeOrgSessions}
          detail={`${dashboard.summary.liveBookingCount} active booking${dashboard.summary.liveBookingCount === 1 ? '' : 's'}`}
          icon="calendar-outline"
          tone="tint"
        />
        <MetricCard
          label="Unassigned risk"
          value={dashboard.summary.unassignedCount}
          detail={`${dashboard.summary.activeStaffCount} active staff in rotation`}
          icon="alert-circle-outline"
          tone={dashboard.summary.unassignedCount > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          label="Completion queue"
          value={dashboard.summary.awaitingCompletionCount}
          detail={`${dashboard.summary.overdueCompletionCount} overdue`}
          icon="document-text-outline"
          tone={dashboard.summary.overdueCompletionCount > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          label="Support issues"
          value={dashboard.summary.supportIssueCount}
          detail={`${dashboard.summary.watchAthleteCount} watch athlete${dashboard.summary.watchAthleteCount === 1 ? '' : 's'}`}
          icon="people-outline"
          tone={dashboard.summary.supportIssueCount > 0 ? 'error' : 'success'}
        />
      </View>

      <SurfaceCard style={[styles.financeCard, { borderColor: colors.border }]} tactile={false}>
        <SectionHeader
          title="Finance state"
          caption="Honest reconciler view only. No fake payout rails."
        />
        <Row style={styles.financeMetrics}>
          <View style={styles.financeMetric}>
            <ThemedText style={styles.financeValue}>
              GBP {dashboard.finance.openTotal.toFixed(2)}
            </ThemedText>
            <ThemedText style={[styles.financeLabel, { color: colors.muted }]}>
              Open obligations
            </ThemedText>
          </View>
          <View style={styles.financeMetric}>
            <ThemedText style={styles.financeValue}>
              GBP {dashboard.finance.collectedTotal.toFixed(2)}
            </ThemedText>
            <ThemedText style={[styles.financeLabel, { color: colors.muted }]}>
              Collected
            </ThemedText>
          </View>
        </Row>
        <ThemedText style={[styles.financeNote, { color: colors.muted }]}>
          GBP {dashboard.finance.orgCreditOpen.toFixed(2)} org credit open · GBP{' '}
          {dashboard.finance.coachCollectedOpen.toFixed(2)} coach-collected open ·{' '}
          {dashboard.finance.overdueCount} overdue item
          {dashboard.finance.overdueCount === 1 ? '' : 's'}
        </ThemedText>
        <ThemedText style={[styles.financeNote, { color: colors.muted }]}>
          {dashboard.finance.note}
        </ThemedText>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader
          title="Operating links"
          caption="Open the real workflows behind these numbers."
        />
        <ActionLink
          title="Staffing Console"
          description="Assign coaches, inspect unassigned work, and rebalance current delivery."
          icon="layers-outline"
          onPress={() => navigateTo(Routes.manageBookings({ clubId }))}
        />
        <ActionLink
          title="Head Coach Oversight"
          description="Review completion pressure, watch athletes, and coach standards."
          icon="shield-checkmark-outline"
          onPress={() => navigateTo(Routes.manageHeadCoach({ clubId }))}
        />
        <ActionLink
          title="Create New Session"
          description="Open the org session flow with this club already set as the operating context."
          icon="sparkles-outline"
          onPress={() =>
            navigateTo(
              Routes.sessionsCreateIntent({
                intent: 'new',
                source: 'club_manage',
                actingAs: 'club',
                clubId,
              }),
            )
          }
        />
        <ActionLink
          title="Invite To Existing Session"
          description="Add athletes into already-published club sessions without leaving the org workflow."
          icon="paper-plane-outline"
          onPress={() =>
            navigateTo(
              Routes.sessionsCreateIntent({
                intent: 'existing',
                source: 'club_manage',
                actingAs: 'club',
                clubId,
              }),
            )
          }
        />
        <ActionLink
          title="Invite Inbox"
          description="Review pending invite responses and move back into live session work."
          icon="mail-open-outline"
          onPress={() => navigateTo(Routes.SESSION_INVITES)}
        />
        <ActionLink
          title="Earnings Reconciler"
          description="Inspect the current org-vs-independent money split and outstanding exposure."
          icon="wallet-outline"
          onPress={() => navigateTo(Routes.EARNINGS)}
        />
        <ActionLink
          title="Club Hub & Admin"
          description="Jump into club settings, invites, and branded club administration."
          icon="shield-outline"
          onPress={() => navigateTo(Routes.clubHub({ clubId }))}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Immediate exceptions"
          caption="These are the issues that need owner attention first."
        />
        {dashboard.unassignedWork.length > 0 ? (
          dashboard.unassignedWork
            .slice(0, 3)
            .map((item) => (
              <UnassignedRow
                key={item.offeringId}
                item={item}
                onPress={() => navigateTo(Routes.manageBookings({ clubId }))}
              />
            ))
        ) : (
          <SurfaceCard style={[styles.emptyCard, { borderColor: colors.border }]} tactile={false}>
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
              No unassigned org work is currently waiting for allocation.
            </ThemedText>
          </SurfaceCard>
        )}

        {dashboard.supportIssues.length > 0 ? (
          dashboard.supportIssues
            .slice(0, 3)
            .map((item) => (
              <SupportIssueRow
                key={item.id}
                item={item}
                onPress={() => navigateTo(Routes.booking(item.bookingId))}
              />
            ))
        ) : (
          <SurfaceCard style={[styles.emptyCard, { borderColor: colors.border }]} tactile={false}>
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
              No unresolved parent support issues are open right now.
            </ThemedText>
          </SurfaceCard>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Delivery health"
          caption="Use these links to move from summary into coach-level follow-up."
        />
        {dashboard.coachHealth.length > 0
          ? dashboard.coachHealth
              .slice(0, 3)
              .map((item) => (
                <CoachHealthRow
                  key={item.coachId}
                  item={item}
                  onPress={() => navigateTo(Routes.manageHeadCoach({ clubId }))}
                />
              ))
          : null}
        {dashboard.completionQueue.length > 0 ? (
          dashboard.completionQueue
            .slice(0, 3)
            .map((item) => (
              <CompletionRow
                key={item.bookingId}
                item={item}
                onPress={() => navigateTo(Routes.manageHeadCoach({ clubId }))}
              />
            ))
        ) : (
          <SurfaceCard style={[styles.emptyCard, { borderColor: colors.border }]} tactile={false}>
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
              No completion or follow-up items are currently waiting on the club.
            </ThemedText>
          </SurfaceCard>
        )}
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  snapshotCard: {
    borderWidth: 1,
    gap: Spacing.xs,
  },
  snapshotTitle: {
    ...Typography.subheading,
  },
  snapshotText: {
    ...Typography.bodySmall,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    width: '47%',
    borderWidth: 1,
    gap: Spacing.xs,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    ...Typography.heading,
  },
  metricLabel: {
    ...Typography.bodySemiBold,
  },
  metricDetail: {
    ...Typography.caption,
  },
  financeCard: {
    borderWidth: 1,
    gap: Spacing.sm,
  },
  financeMetrics: {
    gap: Spacing.sm,
  },
  financeMetric: {
    flex: 1,
    gap: Spacing.micro,
  },
  financeValue: {
    ...Typography.heading,
  },
  financeLabel: {
    ...Typography.caption,
  },
  financeNote: {
    ...Typography.bodySmall,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    gap: Spacing.xxs,
  },
  sectionTitle: {
    ...Typography.subheading,
  },
  sectionCaption: {
    ...Typography.caption,
  },
  actionLink: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBody: {
    flex: 1,
    gap: Spacing.micro,
  },
  actionTitle: {
    ...Typography.bodySemiBold,
  },
  actionDescription: {
    ...Typography.caption,
    lineHeight: 16,
  },
  rowPressable: {
    width: '100%',
  },
  listRow: {
    borderWidth: 1,
    gap: Spacing.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: Spacing.xxs,
  },
  rowTitle: {
    ...Typography.bodySemiBold,
  },
  rowMeta: {
    ...Typography.caption,
  },
  emptyCard: {
    borderWidth: 1,
  },
  emptyText: {
    ...Typography.bodySmall,
  },
});
