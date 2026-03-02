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

export default function ManageBookingsScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const consoleState = useManageBookings();

  const hasCoachAccess = isCoach(currentUser) || isAdmin(currentUser);

  if (!hasCoachAccess) {
    return (
      <PageContainer
        header={<PageHeader title="Booking Console" subtitle="Club operations" showBack />}
        horizontalSpacing={0}
      >
        <EmptyState
          icon="lock-closed-outline"
          title="Coach access only"
          message="Only coach and admin accounts can access booking operations."
        />
      </PageContainer>
    );
  }

  if (consoleState.loading) {
    return (
      <PageContainer
        header={<PageHeader title="Booking Console" subtitle="Create, assign, monitor" showBack />}
      >
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  const actionDisabled = !consoleState.canLaunch;

  return (
    <PageContainer
      header={<PageHeader title="Booking Console" subtitle="Create, assign, monitor" showBack />}
    >
      <SurfaceCard style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Ownership</ThemedText>
        <Row gap="sm">
          <Clickable
            onPress={() => consoleState.setPostingAs('self')}
            style={[
              styles.modePill,
              {
                borderColor:
                  consoleState.postingAs === 'self' ? colors.tint : colors.border,
                backgroundColor:
                  consoleState.postingAs === 'self'
                    ? withAlpha(colors.tint, 0.08)
                    : colors.surface,
              },
            ]}
          >
            <ThemedText
              style={{
                color: consoleState.postingAs === 'self' ? colors.tint : colors.text,
              }}
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
                borderColor:
                  consoleState.postingAs === 'club' ? colors.tint : colors.border,
                backgroundColor:
                  consoleState.postingAs === 'club'
                    ? withAlpha(colors.tint, 0.08)
                    : colors.surface,
                opacity: consoleState.clubs.length === 0 ? 0.55 : 1,
              },
            ]}
          >
            <ThemedText
              style={{
                color: consoleState.postingAs === 'club' ? colors.tint : colors.text,
              }}
            >
              On behalf of club
            </ThemedText>
          </Clickable>
        </Row>

        {consoleState.postingAs === 'club' && (
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
                </Clickable>
              );
            })}

            {!consoleState.canPostAsSelectedClub && (
              <ThemedText style={[styles.hint, { color: colors.warning }]}>
                Selected club does not allow posting as club for your role.
              </ThemedText>
            )}
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Assign Coach</ThemedText>
        {consoleState.postingAs === 'club' ? (
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
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            Sessions will be assigned to your own schedule.
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.actionColumn}>
          <ActionButton
            icon="person-outline"
            title="Create Direct Session"
            description="Start a 1-to-1 flow with ownership and assignee context."
            onPress={consoleState.handleCreateDirect}
            disabled={actionDisabled}
          />
          <ActionButton
            icon="people-outline"
            title="Create Group Session"
            description="Launch a group/camp flow and keep assignment explicit."
            onPress={consoleState.handleCreateGroup}
            disabled={actionDisabled}
          />
          <ActionButton
            icon="paper-plane-outline"
            title="Invite to Existing Session"
            description="Send invites from one place with club attribution."
            onPress={consoleState.handleInviteExisting}
            disabled={actionDisabled}
          />
        </View>
        {actionDisabled && (
          <ThemedText style={[styles.hint, { color: colors.warning }]}>
            Choose a club and assignee before launching a club-owned flow.
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Operations Snapshot</ThemedText>
        <Row gap="sm" style={styles.metricsRow}>
          <MetricChip label="Live sessions" value={consoleState.openOfferCount} color={colors.tint} />
          <MetricChip
            label="Pending invites"
            value={consoleState.pendingInviteCount}
            color={colors.warning}
          />
          <MetricChip
            label="Unassigned"
            value={consoleState.unassignedCount}
            color={colors.error}
          />
        </Row>
      </SurfaceCard>
    </PageContainer>
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

const styles = StyleSheet.create({
  sectionCard: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodySemiBold,
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
  actionColumn: {
    gap: Spacing.xs,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  actionIcon: {
    width: 36,
    height: 36,
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
  metricsRow: {
    flexWrap: 'wrap',
  },
  metricChip: {
    flex: 1,
    minWidth: 96,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.micro,
  },
  metricValue: {
    ...Typography.title,
  },
  metricLabel: {
    ...Typography.caption,
  },
});
