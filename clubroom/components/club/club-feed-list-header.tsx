/**
 * ClubFeedListHeader — Composed header rendered above the feed FlatList.
 *
 * Assembles ClubHeader, AdminActions, StatsRow, panels, carousel,
 * members section, and feed filters into a single ListHeaderComponent.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ClubHeader, ClubStatsRow } from '@/components/club/ClubHeader';
import { ClubAdminActions } from '@/components/club/club-admin-actions';
import { ClubFeedFilters } from '@/components/club/club-feed-filters';
import { MembersPanel } from '@/components/club/MembersPanel';
import { SessionsPanel } from '@/components/club/SessionsPanel';
import { MatchesPanel } from '@/components/club/MatchesPanel';
import { TeamsPanel } from '@/components/club/TeamsPanel';
import { UpcomingEventsCarousel } from '@/components/club/upcoming-events-carousel';
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
      <View style={styles.section}>
        <ClubHeader club={hub.club!} membership={hub.membership!} onLeave={hub.handleLeaveClub} />
      </View>

      {hub.isCoach && <ClubAdminActions clubId={hub.membership!.clubId} />}

      <ClubStatsRow
        memberCount={hub.members.length || hub.club!.memberCount}
        squadCount={hub.squads.length}
        sessionCount={hub.trainingSessions.length}
        inviteCount={hub.invites.length}
        canManageMembers={hub.canRemoveMembers}
        showMembersSection={hub.showMembersSection}
        onToggleMembersSection={onToggleMembers}
      />

      <TeamsPanel squads={hub.squads} isCoach={hub.isCoach} clubId={hub.membership?.clubId} />
      <SessionsPanel sessions={hub.trainingSessions} isCoach={hub.isCoach} />
      <MatchesPanel matches={hub.upcomingMatches} isCoach={hub.isCoach} />

      {hub.upcomingInvites.length > 0 && (
        <View style={styles.carouselSection}>
          <UpcomingEventsCarousel invites={hub.upcomingInvites} onPress={hub.handleInvitePress} />
        </View>
      )}

      {(hub.showMembersSection || hub.isCoach) && hub.canRemoveMembers && (
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
  section: { padding: Spacing.md },
  carouselSection: { paddingVertical: Spacing.sm },
});
