/**
 * ClubFeedListHeader — Composed header rendered above the feed FlatList.
 *
 * Assembles ClubHeader, AdminActions, StatsRow, panels,
 * members section, and feed filters into a single ListHeaderComponent.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ClubHeader, ClubStatsRow } from '@/components/club/ClubHeader';
import { ClubAdminActions } from '@/components/club/club-admin-actions';
import { ClubActivitiesPanel } from '@/components/club/ClubActivitiesPanel';
import { ClubFeedFilters } from '@/components/club/club-feed-filters';
import { MembersPanel } from '@/components/club/MembersPanel';
import { TeamsPanel } from '@/components/club/TeamsPanel';
import { Routes } from '@/navigation/routes';
import { Spacing } from '@/constants/theme';
import type { ClubHubState } from '@/hooks/use-club-hub';

export interface ClubFeedListHeaderProps {
  hub: ClubHubState;
  onToggleMembers: () => void;
}

export const ClubFeedListHeader = memo(function ClubFeedListHeader({
  hub,
  onToggleMembers,
}: ClubFeedListHeaderProps) {
  return (
    <>
      <View style={styles.headerSection}>
        <ClubHeader
          club={hub.club!}
          membership={hub.membership!}
          onLeave={hub.handleLeaveClub}
          includeManagementActions={false}
        />
      </View>

      {hub.canRemoveMembers && <ClubAdminActions clubId={hub.membership!.clubId} />}

      <ClubActivitiesPanel
        activities={hub.clubActivities}
        pendingInvites={hub.pendingSessionInvites}
        isCoach={hub.isCoach}
        onInvitePress={hub.handleInvitePress}
        viewAllHref={hub.membership?.clubId ? Routes.clubSchedule(hub.membership.clubId) : undefined}
        showCreateActions={false}
      />

      <ClubStatsRow
        memberCount={hub.members.length || hub.club!.memberCount}
        squadCount={hub.squads.length}
        activityCount={hub.clubActivities.length}
        updateCount={hub.filterCounts.all ?? hub.feed.length}
        canManageMembers={hub.canRemoveMembers}
        showMembersSection={hub.showMembersSection}
        onToggleMembersSection={onToggleMembers}
      />

      <TeamsPanel
        squads={hub.squads}
        canManageTeams={hub.canManageTeams}
        clubId={hub.membership?.clubId}
      />

      {hub.showMembersSection && hub.canRemoveMembers && (
        <MembersPanel
          members={hub.members}
          canRemoveMembers={hub.canRemoveMembers}
          onRemoveMember={hub.handleRemoveMember}
          clubId={hub.membership!.clubId}
        />
      )}

      <ClubFeedFilters
        activeFilter={hub.feedFilter}
        onFilterChange={hub.setFeedFilter}
        filterCounts={hub.filterCounts}
      />
    </>
  );
});

const styles = StyleSheet.create({
  headerSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
});
