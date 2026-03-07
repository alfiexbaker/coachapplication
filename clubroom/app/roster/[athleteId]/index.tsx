/**
 * Unified Athlete Profile Screen
 *
 * Thin shell: hero card + quick actions + 4-tab layout.
 * All state/logic in useAthleteDetail hook.
 * All tab content in dedicated components under components/athlete/.
 *
 * Tabs: Overview | Sessions | Progress | Notes
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { AthleteHero } from '@/components/athlete/athlete-hero';
import { AthleteQuickActions } from '@/components/athlete/athlete-quick-actions';
import { AthleteOverview } from '@/components/athlete/athlete-overview';
import { AthleteSessions } from '@/components/athlete/athlete-sessions';
import { AthleteProgress } from '@/components/athlete/athlete-progress';
import { AthleteNotesTab } from '@/components/athlete/athlete-notes-tab';
import { AthleteTabBar } from '@/components/roster/athlete-tab-bar';
import { AthleteStatusModal } from '@/components/roster/athlete-status-modal';
import { AthleteTagModal } from '@/components/roster/athlete-tag-modal';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAthleteDetail } from '@/hooks/use-athlete-detail';

export default function AthleteProfileScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { colors } = useTheme();
  const {
    coachId,
    activeTab,
    setActiveTab,
    showStatusModal,
    openStatusModal,
    closeStatusModal,
    showTagsModal,
    closeTagsModal,
    newTag,
    setNewTag,
    data,
    status,
    error,
    retry,
    handleUpdateStatus,
    handleUpdateFocus,
    handleAddNote,
    handleDeleteNote,
    handleTagRemove,
    handleTagAdd,
    handleAddTagSubmit,
    handleOpenHealth,
    handleRaiseConcern,
    handleBlockFamily,
    handleRemove,
  } = useAthleteDetail(athleteId);
  const renderShell = (content: React.ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  // --- 4 visual states ---
  if (status === 'loading') {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (status === 'error') {
    return renderShell(<ErrorState message={error?.message || 'Failed to load'} onRetry={retry} />);
  }

  if (status === 'empty' || !data) {
    return renderShell(
      <EmptyState
        icon="person-outline"
        title="Athlete not found"
        message="This athlete may have been removed from your roster."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  const { entry, emergencyData, childData } = data;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <AthleteOverview
            athlete={entry}
            emergencyData={emergencyData}
            childData={childData}
            onTagRemove={handleTagRemove}
            onTagAdd={handleTagAdd}
          />
        );
      case 'sessions':
        return <AthleteSessions athlete={entry} coachId={coachId} />;
      case 'progress':
        return <AthleteProgress athlete={entry} coachId={coachId} />;
      case 'notes':
        return (
          <AthleteNotesTab
            athlete={entry}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onUpdateFocus={handleUpdateFocus}
          />
        );
    }
  };

  return renderShell(
    <>
      <Row gap="md" align="center" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <View style={styles.flex1} />
        <Clickable
          onPress={() => router.push(Routes.analyticsAthlete(entry.athleteId))}
          hitSlop={8}
          accessibilityLabel="View analytics"
        >
          <Ionicons name="stats-chart-outline" size={22} color={colors.text} />
        </Clickable>
      </Row>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AthleteHero athlete={entry} onStatusPress={openStatusModal} />
        <AthleteQuickActions
          athlete={entry}
          onOpenHealth={handleOpenHealth}
          onRaiseConcern={handleRaiseConcern}
          onBlockFamily={handleBlockFamily}
          onRemove={handleRemove}
        />
        <AthleteTabBar activeTab={activeTab} onTabPress={setActiveTab} />
        <View style={styles.tabContent}>{renderTabContent()}</View>
      </ScrollView>

      <AthleteStatusModal
        visible={showStatusModal}
        currentStatus={entry.status}
        onSelect={handleUpdateStatus}
        onClose={closeStatusModal}
      />
      <AthleteTagModal
        visible={showTagsModal}
        value={newTag}
        onChangeText={setNewTag}
        onSubmit={handleAddTagSubmit}
        onClose={closeTagsModal}
      />
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  tabContent: {
    minHeight: 200,
  },
});
