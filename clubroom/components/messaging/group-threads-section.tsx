/**
 * GroupThreadsSection — Group threads view with filter chips, info card, and thread list.
 *
 * Displayed when viewMode is 'groups'. Shows an info card, group type filter,
 * and either the group threads list or an empty state.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Chip } from '@/components/primitives/chip';
import { Row } from '@/components/primitives/row';
import { Spacing } from '@/constants/theme';
import { ChatThreadSummary } from '@/constants/types';
import { EmptyState } from '@/components/ui/empty-state';
import { GroupConversationRow } from './group-conversation-row';
import type { GroupFilter } from '@/hooks/use-messages';

const GROUP_FILTER_OPTIONS: { key: GroupFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'club', label: 'Club' },
  { key: 'squad', label: 'Squad' },
  { key: 'class', label: 'Class' },
];

interface GroupThreadsSectionProps {
  threads: ChatThreadSummary[];
  groupFilter: GroupFilter;
  onGroupFilterChange: (filter: GroupFilter) => void;
  isCoach: boolean;
  onThreadPress: (threadId: string) => void;
}

export const GroupThreadsSection = memo(function GroupThreadsSection({
  threads,
  groupFilter,
  onGroupFilterChange,
  isCoach,
  onThreadPress,
}: GroupThreadsSectionProps) {
  const handleEmptyAction = useCallback(() => {
    router.push(Routes.CLUB_HUB);
  }, []);

  return (
    <>
      <Row gap="xs" wrap paddingH="lg" style={styles.filterRow}>
        {GROUP_FILTER_OPTIONS.map((option) => (
          <Chip
            key={option.key}
            active={groupFilter === option.key}
            onPress={() => onGroupFilterChange(option.key)}
          >
            {option.label}
          </Chip>
        ))}
      </Row>
      {threads.length === 0 ? (
        <EmptyState
          icon="chatbubbles"
          title="No group chats yet"
          message={
            isCoach
              ? 'Create a squad or club space to coordinate with coaches, teams, and classes.'
              : 'Join a club with an invite code to access group chats with coaches and teams.'
          }
          actionLabel={isCoach ? 'Go to Club Hub' : 'Join a Club'}
          onPressAction={handleEmptyAction}
        />
      ) : (
        threads.map((thread, index) => (
          <GroupConversationRow
            key={thread.id}
            thread={thread}
            index={index}
            onPress={() => onThreadPress(thread.id)}
          />
        ))
      )}
    </>
  );
});

const styles = StyleSheet.create({
  filterRow: {
    marginBottom: Spacing.sm,
  },
});
