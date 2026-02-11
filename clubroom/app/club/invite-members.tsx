/**
 * Invite Members Screen
 *
 * Invite users to a club via past sessions or manual email.
 * Supports role selection (Member/Coach/Admin).
 */

import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { InviteRoleSelector } from '@/components/club/invite-role-selector';
import { InvitePastSessionsTab } from '@/components/club/invite-past-sessions-tab';
import { InviteManualTab } from '@/components/club/invite-manual-tab';
import { LoadingState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useClubInvite, type InviteTab } from '@/hooks/use-club-invite';

const TABS: { key: InviteTab; label: string; icon: 'people-outline' | 'mail-outline' }[] = [
  { key: 'past-sessions', label: 'Past Sessions', icon: 'people-outline' },
  { key: 'manual', label: 'Manual', icon: 'mail-outline' },
];

export default function InviteMembersScreen() {
  const { colors } = useTheme();
  const {
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedUsers,
    selectedRole,
    setSelectedRole,
    manualEmail,
    setManualEmail,
    isInviting,
    filteredUsers,
    toggleUserSelection,
    handleSelectAll,
    handleSendInvites,
    handleManualInvite,
  } = useClubInvite();

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title" style={Typography.heading}>
          Invite Members
        </ThemedText>
        <View style={{ width: 24 }} />
      </Row>

      {/* Tabs */}
      <Row gap="sm" style={styles.tabs}>
        {TABS.map((tab) => (
          <Clickable
            key={tab.key}
            style={
              [styles.tab, activeTab === tab.key && { backgroundColor: colors.tint }].filter(
                Boolean,
              ) as ViewStyle[]
            }
            onPress={() => setActiveTab(tab.key)}
          >
            <Row align="center" justify="center" gap="xs">
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.key ? colors.onPrimary : colors.text}
              />
              <ThemedText
                style={[
                  styles.tabText,
                  { color: activeTab === tab.key ? colors.onPrimary : colors.text },
                ]}
              >
                {tab.label}
              </ThemedText>
            </Row>
          </Clickable>
        ))}
      </Row>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <InviteRoleSelector selectedRole={selectedRole} onSelectRole={setSelectedRole} />

        {activeTab === 'past-sessions' ? (
          filteredUsers.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No past-session users"
              message="No completed-session participants are available to invite yet."
            />
          ) : (
            <InvitePastSessionsTab
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filteredUsers={filteredUsers}
              selectedUsers={selectedUsers}
              onToggleUser={toggleUserSelection}
              onSelectAll={handleSelectAll}
            />
          )
        ) : (
          <InviteManualTab
            email={manualEmail}
            onEmailChange={setManualEmail}
            onSend={handleManualInvite}
          />
        )}
      </ScrollView>

      {/* Footer */}
      {activeTab === 'past-sessions' && selectedUsers.size > 0 && (
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Clickable
            style={[styles.inviteButton, { backgroundColor: colors.tint }]}
            onPress={handleSendInvites}
            disabled={isInviting}
          >
            <Row align="center" justify="center" gap="sm">
              {isInviting ? (
                <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>
                  Sending...
                </ThemedText>
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color={colors.onPrimary} />
                  <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>
                    Invite {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}
                  </ThemedText>
                </>
              )}
            </Row>
          </Clickable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  tabs: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  tabText: { fontWeight: '600' },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md, paddingBottom: 120 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  inviteButton: { paddingVertical: Spacing.md, borderRadius: Radii.lg },
});
