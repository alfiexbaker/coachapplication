import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, LoadingState } from '@/components/ui/screen-states';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useManageBookings } from '@/hooks/use-manage-bookings';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { isCoach, isAdmin } from '@/utils/user-helpers';
import type { ClubRole } from '@/constants/types';
import type { OrgStaffMember, OrgWorkItem } from '@/services/org-staffing-service';
import { formatOrganizationRoleLabel } from '@/contracts/club-governance';

function formatRole(role?: ClubRole | null): string {
  return role ? formatOrganizationRoleLabel(role) : 'No role';
}

function formatDateTimeLabel(iso?: string): string {
  if (!iso) return 'No upcoming assignment';
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

export default function ManageBookingsScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const consoleState = useManageBookings();

  const hasCoachAccess = isCoach(currentUser) || isAdmin(currentUser);

  if (!hasCoachAccess) {
    return (
      <PageContainer
        header={<PageHeader title="Staffing Console" subtitle="Club operations" showBack />}
        horizontalSpacing={0}
      >
        <EmptyState
          icon="lock-closed-outline"
          title="Coach access only"
          message="Only coach and admin accounts can access org staffing tools."
        />
      </PageContainer>
    );
  }

  if (consoleState.loading) {
    return (
      <PageContainer
        header={<PageHeader title="Staffing Console" subtitle="Assign, reassign, monitor" showBack />}
      >
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  const actionDisabled = !consoleState.canLaunch;
  const staffingReadOnly =
    Boolean(consoleState.selectedClubId) && !consoleState.canManageAssignments;

  return (
    <PageContainer
      header={
        <PageHeader title="Staffing Console" subtitle="Org work allocation and quick actions" showBack />
      }
    >
      <SurfaceCard style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Org Context</ThemedText>
        <Row gap="sm">
          <Clickable
            onPress={() => consoleState.setPostingAs('self')}
            style={[
              styles.modePill,
              {
                borderColor: consoleState.postingAs === 'self' ? colors.tint : colors.border,
                backgroundColor:
                  consoleState.postingAs === 'self'
                    ? withAlpha(colors.tint, 0.08)
                    : colors.surface,
              },
            ]}
          >
            <ThemedText
              style={{ color: consoleState.postingAs === 'self' ? colors.tint : colors.text }}
            >
              As me
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={() => consoleState.setPostingAs('club')}
            disabled={consoleState.clubs.length === 0}
            style={[
              styles.modePill,
              {
                borderColor: consoleState.postingAs === 'club' ? colors.tint : colors.border,
                backgroundColor:
                  consoleState.postingAs === 'club'
                    ? withAlpha(colors.tint, 0.08)
                    : colors.surface,
                opacity: consoleState.clubs.length === 0 ? 0.55 : 1,
              },
            ]}
          >
            <ThemedText
              style={{ color: consoleState.postingAs === 'club' ? colors.tint : colors.text }}
            >
              On behalf of club
            </ThemedText>
          </Clickable>
        </Row>

        {consoleState.clubs.length > 0 ? (
          <View style={styles.inlineList}>
            {consoleState.clubs.map((club) => {
              const selected = consoleState.selectedClubId === club.id;
              return (
                <Clickable
                  key={club.id}
                  onPress={() => consoleState.setSelectedClubId(club.id)}
                  style={[
                    styles.inlineOption,
                    {
                      borderColor: selected ? colors.success : colors.border,
                      backgroundColor: selected
                        ? withAlpha(colors.success, 0.08)
                        : colors.surface,
                    },
                  ]}
                >
                  <ThemedText style={{ color: selected ? colors.success : colors.text }}>
                    {club.name}
                  </ThemedText>
                  <ThemedText style={[styles.hint, { color: colors.muted }]}>
                    Your role: {formatRole(club.membership.role)}
                  </ThemedText>
                </Clickable>
              );
            })}
          </View>
        ) : (
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            No active club memberships found. You can still create independent work below.
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Workload Snapshot</ThemedText>
        <Row gap="sm" style={styles.metricsRow}>
          <MetricChip
            label="Org sessions"
            value={consoleState.activeOrgSessionCount}
            color={colors.tint}
          />
          <MetricChip
            label="Assigned today"
            value={consoleState.assignedTodayCount}
            color={colors.success}
          />
          <MetricChip
            label="Unassigned"
            value={consoleState.unassignedCount}
            color={colors.error}
          />
          <MetricChip
            label="Pending invites"
            value={consoleState.pendingInviteCount}
            color={colors.warning}
          />
        </Row>
        <ThemedText style={[styles.hint, { color: colors.muted }]}>
          Only club-owned sessions appear in this staffing view. Independent coach work stays out of
          the org queue.
        </ThemedText>
      </SurfaceCard>

      {consoleState.selectedClubId && staffingReadOnly ? (
        <SurfaceCard style={[styles.sectionCard, { borderColor: colors.border }]}>
          <Row gap="sm" align="center">
            <View
              style={[
                styles.noticeIcon,
                { backgroundColor: withAlpha(colors.warning, 0.12) },
              ]}
            >
              <Ionicons name="shield-outline" size={18} color={colors.warning} />
            </View>
            <View style={styles.flex1}>
              <ThemedText style={styles.sectionTitle}>Read-only staffing view</ThemedText>
              <ThemedText style={[styles.hint, { color: colors.muted }]}>
                Your {formatRole(consoleState.selectedClubRole)} role can view staffing state here,
                but only owners, admins, and head coaches can assign or reassign org work.
              </ThemedText>
            </View>
          </Row>
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.sectionCard}>
        <Row align="center" justify="between">
          <ThemedText style={styles.sectionTitle}>Staff</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            {consoleState.staff.length} staff profiles
          </ThemedText>
        </Row>
        {consoleState.staff.length > 0 ? (
          <View style={styles.listColumn}>
            {consoleState.staff.map((member) => (
              <StaffCard key={member.userId} member={member} />
            ))}
          </View>
        ) : (
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            Select a club to view staff assignments.
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Row align="center" justify="between">
          <View style={styles.flex1}>
            <ThemedText style={styles.sectionTitle}>Unassigned Work</ThemedText>
            <ThemedText style={[styles.hint, { color: colors.muted }]}>
              Sessions waiting for a delivery coach.
            </ThemedText>
          </View>
          <View style={[styles.countPill, { backgroundColor: withAlpha(colors.error, 0.1) }]}>
            <ThemedText style={[styles.countText, { color: colors.error }]}>
              {consoleState.unassignedWork.length}
            </ThemedText>
          </View>
        </Row>
        {consoleState.unassignedWork.length > 0 ? (
          <View style={styles.listColumn}>
            {consoleState.unassignedWork.map((item) => (
              <WorkCard
                key={item.offeringId}
                item={item}
                variant="unassigned"
                disabled={
                  !consoleState.canManageAssignments ||
                  consoleState.mutatingOfferingId === item.offeringId
                }
                busy={consoleState.mutatingOfferingId === item.offeringId}
                onAssign={() => consoleState.handleAssignWork(item)}
              />
            ))}
          </View>
        ) : (
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            No club-owned sessions are waiting for assignment.
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Row align="center" justify="between">
          <View style={styles.flex1}>
            <ThemedText style={styles.sectionTitle}>Assigned Org Work</ThemedText>
            <ThemedText style={[styles.hint, { color: colors.muted }]}>
              Upcoming club sessions already attached to a delivery coach.
            </ThemedText>
          </View>
          <View style={[styles.countPill, { backgroundColor: withAlpha(colors.tint, 0.1) }]}>
            <ThemedText style={[styles.countText, { color: colors.tint }]}>
              {consoleState.assignedWork.length}
            </ThemedText>
          </View>
        </Row>
        {consoleState.assignedWork.length > 0 ? (
          <View style={styles.listColumn}>
            {consoleState.assignedWork.map((item) => (
              <WorkCard
                key={item.offeringId}
                item={item}
                variant="assigned"
                disabled={
                  !consoleState.canManageAssignments ||
                  consoleState.mutatingOfferingId === item.offeringId
                }
                busy={consoleState.mutatingOfferingId === item.offeringId}
                onAssign={() => consoleState.handleAssignWork(item)}
              />
            ))}
          </View>
        ) : (
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            No assigned club sessions found for the selected club.
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Launch New Work</ThemedText>
        {consoleState.postingAs === 'club' ? (
          consoleState.assigneeChoices.length > 0 ? (
            <View style={styles.inlineList}>
              {consoleState.assigneeChoices.map((assignee) => {
                const selected = consoleState.selectedAssigneeId === assignee.id;
                return (
                  <Clickable
                    key={assignee.id}
                    onPress={() => consoleState.setSelectedAssigneeId(assignee.id)}
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
                      {assignee.label}
                    </ThemedText>
                    <ThemedText style={[styles.hint, { color: colors.muted }]}>
                      {assignee.subtitle}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </View>
          ) : (
            <ThemedText style={[styles.hint, { color: colors.warning }]}>
              This club currently has no active staff available for new work.
            </ThemedText>
          )
        ) : (
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            Independent work goes straight to your own schedule.
          </ThemedText>
        )}

        <View style={styles.actionColumn}>
          <ActionButton
            icon="person-outline"
            title="Create Direct Session"
            description="Start a 1-to-1 flow with the current ownership and assignee context."
            onPress={consoleState.handleCreateDirect}
            disabled={actionDisabled}
          />
          <ActionButton
            icon="people-outline"
            title="Create Group Session"
            description="Launch a group flow and keep delivery assignment explicit from the start."
            onPress={consoleState.handleCreateGroup}
            disabled={actionDisabled}
          />
          <ActionButton
            icon="paper-plane-outline"
            title="Invite to Existing Session"
            description="Send invites from the same console without losing org attribution."
            onPress={consoleState.handleInviteExisting}
            disabled={actionDisabled}
          />
        </View>
        {actionDisabled ? (
          <ThemedText style={[styles.hint, { color: colors.warning }]}>
            Choose a club and active delivery coach before launching club-owned work.
          </ThemedText>
        ) : null}
      </SurfaceCard>
    </PageContainer>
  );
}

function StaffCard({ member }: { member: OrgStaffMember }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.staffCard, { borderColor: colors.border }]}>
      <Row align="center" justify="between" gap="sm">
        <View style={styles.flex1}>
          <ThemedText style={styles.staffName}>{member.label}</ThemedText>
          <Row gap="xs" style={styles.staffMetaRow}>
            <StatusPill label={formatRole(member.role)} tone="neutral" />
            <StatusPill
              label={member.status === 'active' ? 'Active' : 'Pending'}
              tone={member.status === 'active' ? 'success' : 'warning'}
            />
          </Row>
        </View>
        <View style={styles.staffMetrics}>
          <MetricNumber label="Today" value={member.assignedToday} />
          <MetricNumber label="Upcoming" value={member.upcomingLoad} />
        </View>
      </Row>
      <ThemedText style={[styles.hint, { color: colors.muted }]}>
        {member.canTakeAssignments
          ? `Next session ${formatDateTimeLabel(member.nextSessionAt)}`
          : 'Not currently available for new assignments'}
      </ThemedText>
    </View>
  );
}

function WorkCard({
  item,
  variant,
  disabled,
  busy,
  onAssign,
}: {
  item: OrgWorkItem;
  variant: 'unassigned' | 'assigned';
  disabled: boolean;
  busy: boolean;
  onAssign: () => void;
}) {
  const { colors } = useTheme();
  const accent = variant === 'unassigned' ? colors.error : colors.tint;
  const actionLabel = variant === 'unassigned' ? 'Assign coach' : 'Reassign';

  return (
    <View style={[styles.workCard, { borderColor: colors.border }]}>
      <Row justify="between" align="flex-start" gap="sm">
        <View style={styles.flex1}>
          <ThemedText style={styles.staffName}>{item.title}</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            {formatDateTimeLabel(item.scheduledAt)} · {item.location}
          </ThemedText>
        </View>
        <View style={[styles.countPill, { backgroundColor: withAlpha(accent, 0.1) }]}>
          <ThemedText style={[styles.countText, { color: accent }]}>
            {item.currentParticipants}/{item.maxParticipants}
          </ThemedText>
        </View>
      </Row>

      <View style={styles.workMetaGrid}>
        <MetaLine label="Delivered by" value={item.assigneeCoachName || 'Unassigned'} />
        <MetaLine label="Owner" value={item.ownerCoachName || item.createdByName || 'Unknown'} />
        <MetaLine label="Linked bookings" value={String(item.linkedBookingCount)} />
        <MetaLine label="Created by" value={item.createdByName || 'Unknown'} />
      </View>

      <Clickable
        onPress={onAssign}
        disabled={disabled}
        style={[
          styles.assignButton,
          {
            borderColor: accent,
            backgroundColor: withAlpha(accent, 0.08),
            opacity: disabled ? 0.55 : 1,
          },
        ]}
        accessibilityLabel={actionLabel}
      >
        <Row align="center" justify="center" gap="xs">
          <Ionicons
            name={busy ? 'sync-outline' : variant === 'unassigned' ? 'person-add-outline' : 'swap-horizontal-outline'}
            size={16}
            color={accent}
          />
          <ThemedText style={[styles.assignText, { color: accent }]}>
            {busy ? 'Updating…' : actionLabel}
          </ThemedText>
        </Row>
      </Clickable>
    </View>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaLine}>
      <ThemedText style={[styles.metaLabel, { color: colors.muted }]}>{label}</ThemedText>
      <ThemedText style={styles.metaValue}>{value}</ThemedText>
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'success' | 'warning' | 'neutral';
}) {
  const { colors } = useTheme();
  const color =
    tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.muted;

  return (
    <View style={[styles.statusPill, { backgroundColor: withAlpha(color, 0.12) }]}>
      <ThemedText style={[styles.statusText, { color }]}>{label}</ThemedText>
    </View>
  );
}

function ActionButton({
  icon,
  title,
  description,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Clickable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionButton,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
      accessibilityLabel={title}
    >
      <Row gap="sm" align="center">
        <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.tint, 0.1) }]}>
          <Ionicons name={icon} size={18} color={colors.tint} />
        </View>
        <View style={styles.actionText}>
          <ThemedText style={styles.actionTitle}>{title}</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.muted }]}>{description}</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Row>
    </Clickable>
  );
}

function MetricChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.metricChip, { borderColor: withAlpha(color, 0.35) }]}>
      <ThemedText style={[styles.metricValue, { color }]}>{value}</ThemedText>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
    </View>
  );
}

function MetricNumber({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metricNumber}>
      <ThemedText style={[styles.metricValueSmall, { color: colors.text }]}>{value}</ThemedText>
      <ThemedText style={[styles.metricLabelSmall, { color: colors.muted }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodySemiBold,
  },
  flex1: {
    flex: 1,
  },
  modePill: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineList: {
    gap: Spacing.xs,
  },
  inlineOption: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xxs,
  },
  hint: {
    ...Typography.caption,
  },
  noticeIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexWrap: 'wrap',
  },
  metricChip: {
    minWidth: 84,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.micro,
  },
  metricValue: {
    ...Typography.bodySemiBold,
  },
  metricLabel: {
    ...Typography.caption,
  },
  countPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  countText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  listColumn: {
    gap: Spacing.xs,
  },
  staffCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  staffName: {
    ...Typography.bodySemiBold,
  },
  staffMetaRow: {
    flexWrap: 'wrap',
    marginTop: Spacing.micro,
  },
  staffMetrics: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metricNumber: {
    alignItems: 'center',
    minWidth: 44,
  },
  metricValueSmall: {
    ...Typography.bodySemiBold,
  },
  metricLabelSmall: {
    ...Typography.caption,
  },
  statusPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  workCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  workMetaGrid: {
    gap: Spacing.xs,
  },
  metaLine: {
    gap: Spacing.micro,
  },
  metaLabel: {
    ...Typography.caption,
  },
  metaValue: {
    ...Typography.bodySmall,
  },
  assignButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignText: {
    ...Typography.bodySemiBold,
  },
  actionColumn: {
    gap: Spacing.xs,
  },
  actionButton: {
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
  actionText: {
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
});
