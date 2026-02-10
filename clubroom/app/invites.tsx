/**
 * Invites Screen
 *
 * Inbox for parents/athletes to view and respond to session invites from coaches.
 * All state/logic in useInvites hook. Invite card extracted as InviteCard component.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { InviteCard } from '@/components/invite/invite-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useInvites, type TabFilter } from '@/hooks/use-invites';
import type { SessionInvite } from '@/constants/types';

const ItemSeparator = () => <View style={styles.separator} />;

export default function InvitesScreen() {
  const { colors: palette } = useTheme();
  const inv = useInvites();

  const renderInvite = useCallback(({ item }: { item: SessionInvite }) => (
    <InviteCard invite={item} respondingTo={inv.respondingTo} onAccept={inv.showSlotPicker} onDecline={inv.handleDeclineInvite} onRsvp={inv.handleRsvp} />
  ), [inv.respondingTo, inv.showSlotPicker, inv.handleDeclineInvite, inv.handleRsvp]);

  const tabs: { key: TabFilter; label: string; count?: number }[] = [
    { key: 'pending', label: 'Pending', count: inv.pendingCount },
    { key: 'maybe', label: 'Maybe', count: inv.maybeCount },
    { key: 'responded', label: 'History' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader title="Session Invites" subtitle={inv.pendingCount > 0 ? `${inv.pendingCount} pending invite${inv.pendingCount !== 1 ? 's' : ''}` : 'From your coaches'} showBack onBackPress={() => router.back()} />

      {/* Tab Filter */}
      <Row gap="xs" style={styles.tabRow}>
        {tabs.map((tab) => (
          <Clickable key={tab.key} style={[styles.tab, { borderColor: inv.tabFilter === tab.key ? palette.tint : palette.border, backgroundColor: inv.tabFilter === tab.key ? withAlpha(palette.tint, 0.06) : 'transparent' }]} onPress={() => inv.setTabFilter(tab.key)}>
            <ThemedText style={[styles.tabText, { color: inv.tabFilter === tab.key ? palette.tint : palette.muted }]}>
              {tab.label}{tab.count && tab.count > 0 ? ` (${tab.count})` : ''}
            </ThemedText>
          </Clickable>
        ))}
      </Row>

      <FlatList
        data={inv.filteredInvites}
        keyExtractor={(item) => item.id}
        renderItem={renderInvite}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={inv.refreshing} onRefresh={inv.handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(inv.error ? palette.error : palette.muted, 0.06) }]}>
              <Ionicons name={inv.error ? 'alert-circle-outline' : inv.tabFilter === 'pending' ? 'mail-outline' : inv.tabFilter === 'maybe' ? 'help-circle-outline' : 'time-outline'} size={40} color={inv.error ? palette.error : palette.muted} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              {inv.loading ? 'Loading invites...' : inv.error ? 'Something went wrong' : inv.tabFilter === 'pending' ? 'No pending invites' : inv.tabFilter === 'maybe' ? 'No maybe invites' : 'No invite history'}
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              {inv.error ? inv.error : inv.tabFilter === 'pending' ? 'When coaches invite you to sessions, they will appear here' : inv.tabFilter === 'maybe' ? 'Invites you marked as "maybe" will appear here' : 'Your responded invites will show here'}
            </ThemedText>
            {inv.error && !inv.loading && (
              <Clickable style={[styles.retryButton, { borderColor: palette.tint }]} onPress={inv.loadInvites}>
                <Row align="center" justify="center" gap="xs">
                  <Ionicons name="refresh" size={18} color={palette.tint} />
                  <ThemedText style={[styles.retryText, { color: palette.tint }]}>Retry</ThemedText>
                </Row>
              </Clickable>
            )}
          </View>
        }
        ItemSeparatorComponent={ItemSeparator}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill, borderWidth: 1.5 },
  tabText: { ...Typography.bodySmallSemiBold },
  list: { padding: Spacing.md },
  separator: { height: Spacing.sm },
  empty: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm, marginTop: Spacing.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  emptyTitle: { ...Typography.heading },
  emptyText: { ...Typography.bodySmall, textAlign: 'center', lineHeight: 20 },
  retryButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, minHeight: 44, marginTop: Spacing.sm },
  retryText: { ...Typography.bodySemiBold },
});
