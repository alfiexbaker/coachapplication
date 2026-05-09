import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Button, Input } from '@/components/ui/primitives';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useHeadCoachOversight } from '@/hooks/use-head-coach-oversight';
import type { ClubRole } from '@/constants/types';
import type {
  HeadCoachCompletionItem,
  HeadCoachStandard,
  HeadCoachTask,
  HeadCoachWatchlistItem,
} from '@/services/org-head-coach-service';
import { isAdmin, isCoach } from '@/utils/user-helpers';
import { formatOrganizationRoleLabel } from '@/contracts/club-governance';

function formatRole(role?: ClubRole | null): string {
  return role ? formatOrganizationRoleLabel(role) : 'No role';
}

function formatDateLabel(iso?: string | null): string {
  if (!iso) return 'No date set';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Schedule TBC';
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatActionStamp(iso?: string | null): string {
  if (!iso) return 'No recent coach action';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'No recent coach action';
  return `Last action ${date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })}`;
}

function formatDueLabel(iso: string): string {
  const dueTs = new Date(iso).getTime();
  if (Number.isNaN(dueTs)) return 'Due TBC';
  const diffMs = dueTs - Date.now();
  const hours = Math.round(Math.abs(diffMs) / (60 * 60 * 1000));
  if (diffMs < 0) {
    return hours < 24 ? `${hours}h overdue` : `${Math.round(hours / 24)}d overdue`;
  }
  return hours < 24 ? `Due in ${hours}h` : `Due in ${Math.round(hours / 24)}d`;
}

function MetricTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.metricTile, { borderColor: withAlpha(color, 0.24) }]}>
      <ThemedText style={[styles.metricValue, { color }]}>{value}</ThemedText>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
    </View>
  );
}

function CompletionRow({
  item,
  busy,
  onIssueTask,
}: {
  item: HeadCoachCompletionItem;
  busy: boolean;
  onIssueTask: () => void;
}) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={[styles.listCard, { borderColor: colors.border }]}>
      <Row justify="between" align="center" gap="sm">
        <View style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>{item.service}</ThemedText>
          <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
            {item.athleteName} · {item.coachName}
          </ThemedText>
          <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
            {formatDateLabel(item.scheduledAt)}
            {item.squadName ? ` · ${item.squadName}` : ''}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: withAlpha(item.overdue ? colors.error : colors.warning, 0.12),
            },
          ]}
        >
          <ThemedText
            style={[
              styles.statusText,
              { color: item.overdue ? colors.error : colors.warning },
            ]}
          >
            {formatDueLabel(item.dueAt)}
          </ThemedText>
        </View>
      </Row>
      <Button
        title="Require note"
        variant="secondary"
        size="sm"
        onPress={onIssueTask}
        loading={busy}
      />
    </SurfaceCard>
  );
}

function WatchlistRow({
  item,
  busy,
  onIssueTask,
}: {
  item: HeadCoachWatchlistItem;
  busy: boolean;
  onIssueTask: () => void;
}) {
  const { colors } = useTheme();
  const tone =
    item.risk === 'high' ? colors.error : item.risk === 'watch' ? colors.warning : colors.success;

  return (
    <SurfaceCard style={[styles.listCard, { borderColor: colors.border }]}>
      <Row justify="between" align="center" gap="sm">
        <View style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>{item.athleteName}</ThemedText>
          <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
            {item.coachName}
            {item.squadName ? ` · ${item.squadName}` : ''}
          </ThemedText>
          <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
            {item.pendingCount} open · {item.overdueCount} overdue · {item.dueSoonCount} due soon
          </ThemedText>
          <ThemedText style={[styles.cardHint, { color: colors.muted }]}>
            {item.recommendedAction}
          </ThemedText>
        </View>
        <View
          style={[styles.statusPill, { backgroundColor: withAlpha(tone, 0.12) }]}
        >
          <ThemedText style={[styles.statusText, { color: tone }]}>
            {item.risk === 'high' ? 'Intervene now' : item.risk === 'watch' ? 'Watch today' : 'Stable'}
          </ThemedText>
        </View>
      </Row>
      <Row justify="between" align="center" gap="sm">
        <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
          {item.nextDueAt ? formatDueLabel(item.nextDueAt) : 'No due date'}
        </ThemedText>
        <Button
          title="Require follow-up"
          variant="secondary"
          size="sm"
          onPress={onIssueTask}
          loading={busy}
        />
      </Row>
    </SurfaceCard>
  );
}

function TaskRow({
  task,
  busy,
  onToggle,
}: {
  task: HeadCoachTask;
  busy: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const isOpen = task.status === 'open';
  const tone = task.type === 'session_note_expectation' ? colors.warning : colors.tint;

  return (
    <SurfaceCard style={[styles.listCard, { borderColor: colors.border }]}>
      <Row justify="between" align="center" gap="sm">
        <View style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>{task.title}</ThemedText>
          <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
            {task.coachName}
            {task.athleteName ? ` · ${task.athleteName}` : ''}
          </ThemedText>
          {task.details ? (
            <ThemedText style={[styles.cardHint, { color: colors.muted }]}>
              {task.details}
            </ThemedText>
          ) : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: withAlpha(tone, 0.12) }]}>
          <ThemedText style={[styles.statusText, { color: tone }]}>
            {isOpen ? formatDueLabel(task.dueAt) : 'Closed'}
          </ThemedText>
        </View>
      </Row>
      <Button
        title={isOpen ? 'Mark done' : 'Reopen'}
        variant={isOpen ? 'secondary' : 'outline'}
        size="sm"
        onPress={onToggle}
        loading={busy}
      />
    </SurfaceCard>
  );
}

function StandardRow({
  standard,
  busy,
  onToggle,
}: {
  standard: HeadCoachStandard;
  busy: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={[styles.listCard, { borderColor: colors.border }]}>
      <Row justify="between" align="center" gap="sm">
        <View style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>{standard.title}</ThemedText>
          {standard.description ? (
            <ThemedText style={[styles.cardHint, { color: colors.muted }]}>
              {standard.description}
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
            {standard.category.replace('_', ' ')}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: withAlpha(
                standard.active ? colors.success : colors.muted,
                0.14,
              ),
            },
          ]}
        >
          <ThemedText
            style={[
              styles.statusText,
              { color: standard.active ? colors.success : colors.muted },
            ]}
          >
            {standard.active ? 'Active' : 'Paused'}
          </ThemedText>
        </View>
      </Row>
      <Button
        title={standard.active ? 'Pause' : 'Activate'}
        variant="outline"
        size="sm"
        onPress={onToggle}
        loading={busy}
      />
    </SurfaceCard>
  );
}

export default function HeadCoachOversightScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const oversight = useHeadCoachOversight();
  const [standardTitle, setStandardTitle] = useState('');
  const [standardDescription, setStandardDescription] = useState('');

  const hasCoachAccess = isCoach(currentUser) || isAdmin(currentUser);

  const scopeSquadNames = useMemo(
    () =>
      oversight.data?.scope.type === 'assigned_squads'
        ? oversight.data.squads.map((squad) => squad.name)
        : [],
    [oversight.data?.scope.type, oversight.data?.squads],
  );

  if (!hasCoachAccess) {
    return (
      <PageContainer
        header={
          <PageHeader
            title="Head Coach Oversight"
            subtitle="Delivery health and standards"
            showBack
          />
        }
        horizontalSpacing={0}
      >
        <EmptyState
          icon="lock-closed-outline"
          title="Coach access only"
          message="Only coach accounts can access oversight tools."
        />
      </PageContainer>
    );
  }

  if (oversight.loading) {
    return (
      <PageContainer
        header={
          <PageHeader
            title="Head Coach Oversight"
            subtitle="Completion health, watchlists, standards"
            showBack
          />
        }
      >
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (oversight.status === 'error' && !oversight.data) {
    return (
      <PageContainer
        header={
          <PageHeader
            title="Head Coach Oversight"
            subtitle="Completion health, watchlists, standards"
            showBack
          />
        }
      >
        <ErrorState
          title="Oversight unavailable"
          message={oversight.error?.message ?? 'Failed to load head coach oversight.'}
          error={oversight.error ?? undefined}
          onRetry={oversight.retry}
        />
      </PageContainer>
    );
  }

  if (!oversight.data || oversight.clubs.length === 0) {
    return (
      <PageContainer
        header={
          <PageHeader
            title="Head Coach Oversight"
            subtitle="Completion health, watchlists, standards"
            showBack
          />
        }
        horizontalSpacing={0}
      >
        <EmptyState
          icon="shield-checkmark-outline"
          title="No oversight scope found"
          message="Join a club as owner, admin, or head coach to use this runtime surface."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <PageHeader
          title="Head Coach Oversight"
          subtitle="Completion health, watchlists, and standards"
          showBack
        />
      }
      refreshing={oversight.refreshing}
      onRefresh={oversight.handleRefresh}
    >
      <SurfaceCard style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Scope</ThemedText>
        {oversight.clubs.length > 1 ? (
          <View style={styles.inlineList}>
            {oversight.clubs.map((club) => {
              const selected = club.id === oversight.selectedClubId;
              return (
                <Clickable
                  key={club.id}
                  onPress={() => oversight.setSelectedClubId(club.id)}
                  style={[
                    styles.inlineOption,
                    {
                      borderColor: selected ? colors.tint : colors.border,
                      backgroundColor: selected
                        ? withAlpha(colors.tint, 0.08)
                        : colors.surface,
                    },
                  ]}
                >
                  <ThemedText style={{ color: selected ? colors.tint : colors.text }}>
                    {club.name}
                  </ThemedText>
                  <ThemedText style={[styles.hint, { color: colors.muted }]}>
                    {formatRole(club.role)}
                  </ThemedText>
                </Clickable>
              );
            })}
          </View>
        ) : (
          <ThemedText style={[styles.scopeClubName, { color: colors.text }]}>
            {oversight.data.club.name}
          </ThemedText>
        )}

        <Row align="center" gap="sm" style={styles.scopeMetaRow}>
          <View style={[styles.scopeBadge, { backgroundColor: withAlpha(colors.tint, 0.1) }]}>
            <Ionicons name="eye-outline" size={16} color={colors.tint} />
          </View>
          <View style={styles.flex1}>
            <ThemedText style={styles.scopeLabel}>
              {formatRole(oversight.selectedClubRole)} view
            </ThemedText>
            <ThemedText style={[styles.hint, { color: colors.muted }]}>
              {oversight.data.scope.label}
            </ThemedText>
          </View>
        </Row>

        {scopeSquadNames.length > 0 ? (
          <View style={styles.scopeChipRow}>
            {scopeSquadNames.map((name) => (
              <View
                key={name}
                style={[styles.scopeChip, { backgroundColor: withAlpha(colors.success, 0.1) }]}
              >
                <ThemedText style={[styles.scopeChipText, { color: colors.success }]}>
                  {name}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : (
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            Oversight stays on one club at a time so head-coach review is scoped, not org-global.
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Oversight Snapshot</ThemedText>
        <View style={styles.metricGrid}>
          <MetricTile
            label="Needs completion"
            value={oversight.data.summary.awaitingCompletionCount}
            color={colors.warning}
          />
          <MetricTile
            label="Overdue follow-up"
            value={oversight.data.summary.overdueFollowUpCount}
            color={colors.error}
          />
          <MetricTile
            label="Open tasks"
            value={oversight.data.summary.openTaskCount}
            color={colors.tint}
          />
          <MetricTile
            label="Active standards"
            value={oversight.data.summary.activeStandardCount}
            color={colors.success}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Row justify="between" align="center">
          <ThemedText style={styles.sectionTitle}>Coach Health</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            {oversight.data.summary.coachCount} coaches in scope
          </ThemedText>
        </Row>
        <View style={styles.listColumn}>
          {oversight.data.coachHealth.map((coach) => (
            <SurfaceCard
              key={coach.coachId}
              style={[styles.listCard, { borderColor: colors.border }]}
            >
              <Row justify="between" align="center" gap="sm">
                <View style={styles.flex1}>
                  <ThemedText style={styles.cardTitle}>{coach.coachName}</ThemedText>
                  <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
                    {formatRole(coach.role)}
                    {coach.squadNames.length > 0 ? ` · ${coach.squadNames.join(', ')}` : ''}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: withAlpha(
                        coach.overdueCompletionCount > 0 || coach.overdueFollowUpCount > 0
                          ? colors.error
                          : colors.success,
                        0.12,
                      ),
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.statusText,
                      {
                        color:
                          coach.overdueCompletionCount > 0 || coach.overdueFollowUpCount > 0
                            ? colors.error
                            : colors.success,
                      },
                    ]}
                  >
                    {coach.overdueCompletionCount > 0 || coach.overdueFollowUpCount > 0
                      ? 'Attention'
                      : 'Stable'}
                  </ThemedText>
                </View>
              </Row>
              <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
                {coach.completionCount} completion items · {coach.watchAthleteCount} watch athletes
              </ThemedText>
              <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
                {coach.openTaskCount} head-coach tasks · {coach.sessionNoteExpectationCount} note expectations · {coach.requiredFollowUpCount} follow-up requests
              </ThemedText>
              <ThemedText style={[styles.cardHint, { color: colors.muted }]}>
                {formatActionStamp(coach.latestCoachActionAt)}
              </ThemedText>
            </SurfaceCard>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Row justify="between" align="center">
          <ThemedText style={styles.sectionTitle}>Awaiting Completion</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            Session-note expectations
          </ThemedText>
        </Row>
        {oversight.data.completionQueue.length > 0 ? (
          <View style={styles.listColumn}>
            {oversight.data.completionQueue.map((item) => (
              <CompletionRow
                key={item.bookingId}
                item={item}
                busy={oversight.mutatingKey === `completion:${item.bookingId}`}
                onIssueTask={() => {
                  void oversight.issueSessionNoteExpectation(item);
                }}
              />
            ))}
          </View>
        ) : (
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            No club-owned sessions are waiting on completion notes right now.
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Row justify="between" align="center">
          <ThemedText style={styles.sectionTitle}>Athlete Watchlist</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            Follow-up pressure in scope
          </ThemedText>
        </Row>
        {oversight.data.watchlist.length > 0 ? (
          <View style={styles.listColumn}>
            {oversight.data.watchlist.map((item) => (
              <WatchlistRow
                key={`${item.coachId}:${item.athleteId}`}
                item={item}
                busy={oversight.mutatingKey === `watch:${item.coachId}:${item.athleteId}`}
                onIssueTask={() => {
                  void oversight.issueRequiredFollowUp(item);
                }}
              />
            ))}
          </View>
        ) : (
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            No follow-up pressure is showing for the current scope.
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Row justify="between" align="center">
          <ThemedText style={styles.sectionTitle}>Task Board</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            Required follow-up and note expectations
          </ThemedText>
        </Row>
        {oversight.data.tasks.length > 0 ? (
          <View style={styles.listColumn}>
            {oversight.data.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                busy={oversight.mutatingKey === `task:${task.id}`}
                onToggle={() => {
                  void oversight.toggleTaskStatus(task);
                }}
              />
            ))}
          </View>
        ) : (
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            No explicit head-coach tasks yet. Raise one from the completion queue or watchlist.
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Row justify="between" align="center">
          <ThemedText style={styles.sectionTitle}>Standards Checklist</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            Program expectations that stay visible in product
          </ThemedText>
        </Row>

        <Input
          label="Add checklist item"
          value={standardTitle}
          onChangeText={setStandardTitle}
          placeholder="Example: Squad debrief posted by 19:00"
          helperText="Use this for a club or squad standard you want visible in the runtime surface."
        />
        <Input
          value={standardDescription}
          onChangeText={setStandardDescription}
          placeholder="Optional detail for how coaches should meet the standard"
          multiline
          helperText="Keep it operational and specific."
        />
        <Button
          title="Add checklist item"
          variant="primary"
          onPress={() => {
            void (async () => {
              const created = await oversight.createStandard(standardTitle, standardDescription);
              if (created) {
                setStandardTitle('');
                setStandardDescription('');
              }
            })();
          }}
          disabled={standardTitle.trim().length === 0}
          loading={oversight.mutatingKey === 'standard:create'}
        />

        <View style={styles.listColumn}>
          {oversight.data.standards.map((standard) => (
            <StandardRow
              key={standard.id}
              standard={standard}
              busy={oversight.mutatingKey === `standard:${standard.id}`}
              onToggle={() => {
                void oversight.toggleStandard(standard);
              }}
            />
          ))}
        </View>
      </SurfaceCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodySemiBold,
  },
  scopeClubName: {
    ...Typography.subheading,
  },
  scopeMetaRow: {
    marginTop: Spacing.xxs,
  },
  scopeBadge: {
    width: 34,
    height: 34,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeLabel: {
    ...Typography.smallSemiBold,
  },
  inlineList: {
    gap: Spacing.xs,
  },
  inlineOption: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    gap: Spacing.xxs,
  },
  hint: {
    ...Typography.caption,
  },
  scopeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  scopeChip: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  scopeChipText: {
    ...Typography.caption,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricTile: {
    minWidth: 132,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    gap: Spacing.xxs,
  },
  metricValue: {
    ...Typography.heading,
  },
  metricLabel: {
    ...Typography.caption,
  },
  listColumn: {
    gap: Spacing.sm,
  },
  listCard: {
    gap: Spacing.sm,
    borderWidth: 1,
  },
  cardTitle: {
    ...Typography.bodySemiBold,
  },
  cardMeta: {
    ...Typography.caption,
  },
  cardHint: {
    ...Typography.caption,
    lineHeight: 17,
  },
  statusPill: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  statusText: {
    ...Typography.caption,
  },
  flex1: {
    flex: 1,
  },
});
