/**
 * Invites Screen
 *
 * Inbox for parents/athletes to view and respond to session invites from coaches.
 * All state/logic in useInvites hook. Invite card extracted as InviteCard component.
 */

import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { InviteCard } from '@/components/invite/invite-card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useInvites, type TabFilter } from '@/hooks/use-invites';
import type { SessionInvite } from '@/constants/types';
import { AccessibleListCell } from '@/components/ui/list-accessibility';

const ItemSeparator = () => <View style={styles.separator} />;

export default function InvitesScreen() {
  const { colors: palette } = useTheme();
  const inv = useInvites();
  const renderShell = (subtitle: string, content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Session Invites"
        subtitle={subtitle}
        showBack
        onBackPress={() => router.back()}
      />
      {content}
    </SafeAreaView>
  );

  const renderInvite = ({ item }: { item: SessionInvite }) => (
    <InviteCard
      invite={item}
      respondingTo={inv.respondingTo}
      onAccept={inv.showSlotPicker}
      onDecline={inv.handleDeclineInvite}
      onRsvp={inv.handleRsvp}
    />
  );

  const tabs: { key: TabFilter; label: string; count?: number }[] = [
    { key: 'pending', label: 'Pending', count: inv.pendingCount },
    { key: 'maybe', label: 'Maybe', count: inv.maybeCount },
    { key: 'responded', label: 'History' },
  ];

  if (inv.status === 'loading') {
    return renderShell('Loading invites', <LoadingState variant="list" />);
  }

  if (inv.status === 'error') {
    return renderShell(
      'Unable to load invites',
      <ErrorState message={inv.error?.message || 'Failed to load invites.'} onRetry={inv.retry} />,
    );
  }

  if (inv.status === 'empty') {
    return renderShell(
      'From your coaches',
      <EmptyState
        icon="mail-outline"
        title="No pending invites"
        message="When coaches invite you to sessions, they will appear here."
      />,
    );
  }

  return renderShell(
    inv.pendingCount > 0
      ? `${inv.pendingCount} pending invite${inv.pendingCount !== 1 ? 's' : ''}`
      : 'From your coaches',
    <>
      {/* Tab Filter */}
      <Row gap="xs" style={styles.tabRow}>
        {tabs.map((tab) => (
          <Clickable
            key={tab.key}
            style={[
              styles.tab,
              {
                borderColor: inv.tabFilter === tab.key ? palette.tint : palette.border,
                backgroundColor:
                  inv.tabFilter === tab.key ? withAlpha(palette.tint, 0.06) : 'transparent',
              },
            ]}
            onPress={() => inv.setTabFilter(tab.key)}
          >
            <ThemedText
              style={[
                styles.tabText,
                { color: inv.tabFilter === tab.key ? palette.tint : palette.muted },
              ]}
            >
              {tab.label}
              {tab.count && tab.count > 0 ? ` (${tab.count})` : ''}
            </ThemedText>
          </Clickable>
        ))}
      </Row>

      <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
        data={inv.filteredInvites}
        keyExtractor={(item) => item.id}
        renderItem={renderInvite}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={inv.refreshing} onRefresh={inv.handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.muted, 0.06) }]}>
              <Ionicons
                name={
                  inv.tabFilter === 'pending'
                    ? 'mail-outline'
                    : inv.tabFilter === 'maybe'
                      ? 'help-circle-outline'
                      : 'time-outline'
                }
                size={40}
                color={palette.muted}
              />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              {inv.tabFilter === 'pending'
                ? 'No pending invites'
                : inv.tabFilter === 'maybe'
                  ? 'No maybe invites'
                  : 'No invite history'}
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              {inv.tabFilter === 'pending'
                ? 'When coaches invite you to sessions, they will appear here'
                : inv.tabFilter === 'maybe'
                  ? 'Invites you marked as "maybe" will appear here'
                  : 'Your responded invites will show here'}
            </ThemedText>
          </View>
        }
        ItemSeparatorComponent={ItemSeparator}
      />
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  tabText: { ...Typography.bodySmallSemiBold },
  list: { padding: Spacing.md },
  separator: { height: Spacing.sm },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: { ...Typography.heading },
  emptyText: { ...Typography.bodySmall, textAlign: 'center', lineHeight: 20 },
});
