/**
 * Community Hub Screen
 *
 * Tab-based hub for parent groups, carpools, and group discovery.
 * All state/logic in useCommunityHub hook. Tab content extracted to component.
 */

import { StyleSheet, ScrollView, RefreshControl, Modal, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CreateGroupForm } from '@/components/community/CreateGroupForm';
import { CommunityTabContent } from '@/components/community/community-tab-content';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useCommunityHub } from '@/hooks/use-community-hub';
import { scaleFont } from '@/utils/scale';
import type { TabType } from '@/hooks/use-community-hub';

const TABS: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'groups', label: 'My Groups', icon: 'chatbubbles-outline' },
  { key: 'carpools', label: 'Carpools', icon: 'car-outline' },
  { key: 'discover', label: 'Discover', icon: 'compass-outline' },
];

export default function CommunityHubScreen() {
  const { colors: palette } = useTheme();
  const c = useCommunityHub();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      {/* Header */}
      <Row style={styles.header}>
        <Row style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Community
          </ThemedText>
        </Row>
        <Clickable
          accessibilityLabel="Create community group"
          onPress={() => c.setShowCreateModal(true)}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={24} color={palette.onPrimary} />
        </Clickable>
      </Row>

      {/* Tabs */}
      <Row style={[styles.tabsContainer, { borderBottomColor: palette.border }]}>
        {TABS.map((tab) => (
          <Clickable
            key={tab.key}
            onPress={() => c.setActiveTab(tab.key)}
            style={
              [
                styles.tab,
                c.activeTab === tab.key
                  ? { borderBottomColor: palette.tint, borderBottomWidth: 2 }
                  : undefined,
              ].filter(Boolean) as ViewStyle[]
            }
          >
            <Row align="center" justify="center" gap="xxs">
              <Ionicons
                name={tab.icon}
                size={20}
                color={c.activeTab === tab.key ? palette.tint : palette.muted}
              />
              <ThemedText
                style={[
                  styles.tabLabel,
                  { color: c.activeTab === tab.key ? palette.tint : palette.muted },
                ]}
              >
                {tab.label}
              </ThemedText>
            </Row>
          </Clickable>
        ))}
      </Row>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.onRefresh} />}
      >
        {c.status === 'loading' ? (
          <LoadingState variant="list" />
        ) : c.status === 'error' ? (
          <ErrorState
            message={c.error?.message || 'Failed to load community hub.'}
            onRetry={c.retry}
          />
        ) : c.status === 'empty' ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="No community activity yet"
            message="Create a group to start conversations, discover other groups, and coordinate carpools."
            actionLabel="Create Group"
            onPressAction={() => c.setShowCreateModal(true)}
          />
        ) : (
          <CommunityTabContent
            tab={c.activeTab}
            loading={false}
            myGroups={c.myGroups}
            publicGroups={c.publicGroups}
            carpoolOffers={c.carpoolOffers}
            parentId={c.parentId}
            onCreateGroup={() => c.setShowCreateModal(true)}
            onGroupPress={c.handleGroupPress}
            onJoinGroup={c.handleJoinGroup}
            onCarpoolPress={c.handleCarpoolPress}
          />
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={c.showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => c.setShowCreateModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <Row style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <ThemedText type="title" style={styles.modalTitle}>
              Create Group
            </ThemedText>
            <Clickable onPress={() => c.setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </Row>
          <CreateGroupForm
            onSubmit={c.handleCreateGroup}
            onCancel={() => c.setShowCreateModal(false)}
            loading={c.creatingGroup}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: { alignItems: 'center', gap: Spacing.md },
  headerTitle: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: { borderBottomWidth: 1, paddingHorizontal: Spacing.lg },
  tab: { flex: 1, paddingVertical: Spacing.sm, marginBottom: -1 },
  tabLabel: { ...Typography.smallSemiBold, fontSize: scaleFont(Typography.smallSemiBold.fontSize) },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  modalContainer: { flex: 1 },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { ...Typography.title, fontSize: scaleFont(Typography.title.fontSize) },
});
