import { memo, useCallback } from 'react';
import { FlatList, StyleSheet, View, RefreshControl, ListRenderItem } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ParentGroupCard } from './ParentGroupCard';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Colors, Spacing } from '@/constants/theme';
import type { ParentGroup } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

interface GroupListProps {
  groups: ParentGroup[];
  onGroupPress: (group: ParentGroup) => void;
  onCreateGroup?: () => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  compact?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  showCreateButton?: boolean;
  ListHeaderComponent?: React.ReactElement;
}

function GroupListComponent({
  groups,
  onGroupPress,
  onCreateGroup,
  loading = false,
  refreshing = false,
  onRefresh,
  compact = false,
  emptyTitle = 'No Groups Yet',
  emptyMessage = 'Join or create a group to connect with other parents.',
  showCreateButton = true,
  ListHeaderComponent,
}: GroupListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const renderItem: ListRenderItem<ParentGroup> = useCallback(
    ({ item }) => (
      <ParentGroupCard
        group={item}
        onPress={() => onGroupPress(item)}
        compact={compact}
      />
    ),
    [onGroupPress, compact]
  );

  const keyExtractor = useCallback((item: ParentGroup) => item.id, []);

  const renderEmptyState = () => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIcon, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="chatbubbles-outline" size={48} color={palette.tint} />
        </View>
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          {emptyTitle}
        </ThemedText>
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          {emptyMessage}
        </ThemedText>
        {showCreateButton && onCreateGroup && (
          <Button onPress={onCreateGroup} style={styles.emptyButton}>
            Create Group
          </Button>
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={groups}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={[
        styles.listContent,
        groups.length === 0 && styles.emptyListContent,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmptyState}
    />
  );
}

export const GroupList = memo(GroupListComponent);

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
});
