/**
 * Community Hub Screen
 *
 * Tab-based hub for parent groups, carpools, and group discovery.
 * All state/logic in useCommunityHub hook. Tab content extracted to component.
 */

import { View, StyleSheet, ScrollView, RefreshControl, Modal, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CreateGroupForm } from '@/components/community/CreateGroupForm';
import { CommunityTabContent } from '@/components/community/community-tab-content';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
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
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>Community</ThemedText>
        </View>
        <Clickable accessibilityLabel="Create community group" onPress={() => c.setShowCreateModal(true)} style={[styles.addButton, { backgroundColor: palette.tint }]}>
          <Ionicons name="add" size={24} color={palette.onPrimary} />
        </Clickable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: palette.border }]}>
        {TABS.map((tab) => (
          <Clickable key={tab.key} onPress={() => c.setActiveTab(tab.key)}
            style={[styles.tab, c.activeTab === tab.key ? { borderBottomColor: palette.tint, borderBottomWidth: 2 } : undefined].filter(Boolean) as ViewStyle[]}
          >
            <Ionicons name={tab.icon} size={20} color={c.activeTab === tab.key ? palette.tint : palette.muted} />
            <ThemedText style={[styles.tabLabel, { color: c.activeTab === tab.key ? palette.tint : palette.muted }]}>{tab.label}</ThemedText>
          </Clickable>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.onRefresh} />}
      >
        <CommunityTabContent
          tab={c.activeTab} loading={c.loading} myGroups={c.myGroups} publicGroups={c.publicGroups}
          carpoolOffers={c.carpoolOffers} parentId={c.parentId}
          onCreateGroup={() => c.setShowCreateModal(true)} onGroupPress={c.handleGroupPress}
          onJoinGroup={c.handleJoinGroup} onCarpoolPress={c.handleCarpoolPress}
        />
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={c.showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => c.setShowCreateModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <ThemedText type="title" style={styles.modalTitle}>Create Group</ThemedText>
            <Clickable onPress={() => c.setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </View>
          <CreateGroupForm onSubmit={c.handleCreateGroup} onCancel={() => c.setShowCreateModal(false)} loading={c.creatingGroup} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerTitle: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  addButton: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: Spacing.lg },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, paddingVertical: Spacing.sm, marginBottom: -1 },
  tabLabel: { ...Typography.smallSemiBold, fontSize: scaleFont(Typography.smallSemiBold.fontSize) },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  modalTitle: { ...Typography.title, fontSize: scaleFont(Typography.title.fontSize) },
});
