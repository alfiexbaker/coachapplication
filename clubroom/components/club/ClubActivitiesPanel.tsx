import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { Clickable } from "@/components/primitives/clickable";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { Column } from "@/components/primitives/column";
import { Row } from "@/components/primitives/row";
import { ThemedText } from "@/components/themed-text";
import { Radii, Spacing, Typography } from "@/constants/theme";
import type { ClubActivity, SessionInvite } from "@/constants/types";
import { useTheme } from "@/hooks/useTheme";
import { Routes } from "@/navigation/routes";
import { ClubScheduleActivityCard } from "./ClubScheduleActivityCard";
import { getSessionInviteCoachName } from "@/utils/session-invite-display";
function defaultActivityPress(activity: ClubActivity, clubId?: string) {
  const resolvedClubId = activity.clubId ?? clubId;
  if (!resolvedClubId) {
    return;
  }
  router.push(Routes.clubActivity(resolvedClubId, activity.id));
}
function defaultInvitePress(inviteId: string) {
  router.push(Routes.sessionInvite(inviteId));
}
const EMPTY_PENDING_INVITES: SessionInvite[] = [];
function getInviteStartsAt(invite: SessionInvite): string {
  const firstSlot = invite.selectedSlot ?? invite.proposedSlots[0];
  if (!firstSlot) {
    return invite.createdAt;
  }
  return `${firstSlot.date}T${firstSlot.startTime}:00`;
}
export interface ClubActivitiesPanelProps {
  activities: ClubActivity[];
  pendingInvites?: SessionInvite[];
  isCoach: boolean;
  clubId?: string;
  maxItems?: number;
  onActivityPress?: (activity: ClubActivity) => void;
  onInvitePress?: (inviteId: string) => void;
  showCreateActions?: boolean;
  viewAllHref?: Href;
}
export const ClubActivitiesPanel = function ClubActivitiesPanel({
  activities,
  pendingInvites = EMPTY_PENDING_INVITES,
  isCoach,
  clubId,
  maxItems = 5,
  onActivityPress,
  onInvitePress,
  showCreateActions = true,
  viewAllHref,
}: ClubActivitiesPanelProps) {
  const { colors } = useTheme();
  const visibleEntries = (() => {
    const publishedSessionIds = new Set(
      activities.flatMap((activity) =>
        activity.source === "group_session" ? [activity.sourceEntityId] : [],
      ),
    );
    const inviteEntries = pendingInvites.flatMap((invite) =>
      !invite.existingSessionId ||
      !publishedSessionIds.has(invite.existingSessionId)
        ? [
            {
              kind: "invite" as const,
              id: `invite-${invite.id}`,
              startsAt: getInviteStartsAt(invite),
              invite,
            },
          ]
        : [],
    );
    const activityEntries = activities.map((activity) => ({
      kind: "activity" as const,
      id: activity.id,
      startsAt: activity.startsAt,
      activity,
    }));
    return [...activityEntries, ...inviteEntries]
      .sort(
        (left, right) =>
          new Date(left.startsAt).getTime() -
          new Date(right.startsAt).getTime(),
      )
      .slice(0, maxItems);
  })();
  return (
    <SurfaceCard style={styles.card}>
      <Row justify="between" align="center" gap="md">
        <Column flex>
          <Row align="center" gap="sm">
            <Ionicons name="calendar" size={20} color={colors.tint} />
            <ThemedText type="defaultSemiBold">Schedule</ThemedText>
          </Row>
        </Column>

        {viewAllHref ? (
          <Clickable
            style={styles.viewAllButton}
            onPress={() => router.push(viewAllHref)}
            accessibilityLabel="Open full schedule"
          >
            <ThemedText
              style={[
                Typography.caption,
                {
                  color: colors.tint,
                },
              ]}
            >
              Open
            </ThemedText>
            <Ionicons name="chevron-forward" size={16} color={colors.tint} />
          </Clickable>
        ) : null}

        {isCoach && showCreateActions && (
          <Row align="center" gap="xs">
            <Clickable
              style={[
                styles.secondaryButton,
                {
                  borderColor: colors.tint,
                },
              ]}
              onPress={() => router.push(Routes.EVENTS_CREATE)}
            >
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: colors.tint,
                  },
                ]}
              >
                Event
              </ThemedText>
            </Clickable>
            <Clickable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.tint,
                },
              ]}
              onPress={() => router.push(Routes.GROUP_SESSIONS_CREATE)}
            >
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: colors.onPrimary,
                  },
                ]}
              >
                Training
              </ThemedText>
            </Clickable>
            <Clickable
              style={[
                styles.secondaryButton,
                {
                  borderColor: colors.warning,
                },
              ]}
              onPress={() => router.push(Routes.MATCHES_CREATE)}
            >
              <ThemedText
                style={[
                  Typography.caption,
                  {
                    color: colors.warning,
                  },
                ]}
              >
                Match
              </ThemedText>
            </Clickable>
          </Row>
        )}
      </Row>

      {visibleEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="calendar-clear-outline"
            size={28}
            color={colors.muted}
          />
          <ThemedText
            style={[
              Typography.small,
              {
                color: colors.muted,
                textAlign: "center",
              },
            ]}
          >
            No scheduled items yet.
          </ThemedText>
        </View>
      ) : (
        <Column gap="sm">
          {visibleEntries.map((entry) => {
            if (entry.kind === "activity") {
              return (
                <ClubScheduleActivityCard
                  key={entry.id}
                  activity={entry.activity}
                  compact
                  onPress={() =>
                    onActivityPress
                      ? onActivityPress(entry.activity)
                      : defaultActivityPress(entry.activity, clubId)
                  }
                />
              );
            }
            return (
              <Clickable
                key={entry.id}
                onPress={() =>
                  onInvitePress
                    ? onInvitePress(entry.invite.id)
                    : defaultInvitePress(entry.invite.id)
                }
                style={[
                  styles.inviteRow,
                  {
                    borderColor: colors.border,
                  },
                ]}
                accessibilityLabel={`Open invite for ${entry.invite.sessionType}`}
              >
                <View style={styles.inviteCopy}>
                  <Row align="center" gap="xs">
                    <View
                      style={[
                        styles.inviteBadge,
                        {
                          backgroundColor: colors.tint,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.inviteBadgeText,
                          {
                            color: colors.onPrimary,
                          },
                        ]}
                      >
                        Invite
                      </ThemedText>
                    </View>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                      {entry.invite.sessionType}
                    </ThemedText>
                  </Row>
                  <ThemedText
                    style={[
                      styles.inviteMeta,
                      {
                        color: colors.muted,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {new Date(entry.startsAt).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {entry.invite.proposedSlots[0]?.startTime ?? "Time TBC"} ·{" "}
                    {getSessionInviteCoachName(entry.invite)}
                  </ThemedText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </Clickable>
            );
          })}
        </Column>
      )}
    </SurfaceCard>
  );
};
const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  primaryButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  viewAllButton: {
    alignItems: "center",
    gap: Spacing.xxs,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  inviteRow: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  inviteCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  inviteBadge: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
  },
  inviteBadgeText: {
    ...Typography.caption,
    fontWeight: "700",
  },
  inviteMeta: {
    ...Typography.caption,
  },
});
