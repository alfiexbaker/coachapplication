/**
 * ObjectivesScreen — Track football development goals.
 *
 * Thin composition layer. All state in useObjectives hook.
 * Sub-components: ObjectiveCard, ObjectiveModal, ChildSelector.
 */

import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ChildSelector } from '@/components/bookings/child-selector';
import { ObjectiveCard } from '@/components/bookings/objective-card';
import { ObjectiveModal } from '@/components/bookings/objective-modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useObjectives } from '@/hooks/use-objectives';
import type { AthleteObjective } from '@/constants/types';
import { DemoBanner } from '@/utils/demo-mode';

const ITEM_SEPARATOR_HEIGHT = Spacing.md;

export default function ObjectivesScreen() {
  const { colors: palette } = useTheme();
  const {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    filteredObjectives,
    children,
    selectedChildId,
    setSelectedChildId,
    isParent,
    isUsingDemoObjectives,
    showModal,
    editingObjective,
    selectedSkill,
    setSelectedSkill,
    note,
    setNote,
    targetSessions,
    setTargetSessions,
    openAddModal,
    openEditModal,
    closeModal,
    saveObjective,
    deleteObjective,
  } = useObjectives();

  const renderItem = useCallback(
    ({ item }: { item: AthleteObjective }) => (
      <ObjectiveCard item={item} onEdit={openEditModal} onDelete={deleteObjective} />
    ),
    [openEditModal, deleteObjective],
  );

  const keyExtractor = useCallback((item: AthleteObjective) => item.id, []);

  const ItemSeparator = useCallback(() => <View style={{ height: ITEM_SEPARATOR_HEIGHT }} />, []);

  const ListHeader = useCallback(
    () => (
      <Column gap="md" paddingH="lg" style={styles.header}>
        {isParent && children.length > 0 && (
          <ChildSelector
            childOptions={children}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
          />
        )}
        <ThemedText type="subtitle" style={styles.subtitle}>
          Track {isParent ? 'development' : 'your'} football goals
        </ThemedText>
      </Column>
    ),
    [isParent, children, selectedChildId, setSelectedChildId],
  );

  const ListEmpty = useCallback(
    () => (
      <EmptyState
        icon="football-outline"
        title="No goals yet"
        message="Start by adding your first development goal"
        actionLabel="Add Goal"
        onPressAction={openAddModal}
      />
    ),
    [openAddModal],
  );

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        <ErrorState message={error?.message ?? 'Failed to load objectives.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      <FlatList
        accessibilityRole="list"
        data={filteredObjectives}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ItemSeparatorComponent={ItemSeparator}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      {isUsingDemoObjectives ? (
        <View style={styles.demoBannerWrap}>
          <DemoBanner message="Starter objectives are demo data. Edit or replace them with your real goals." />
        </View>
      ) : null}

      {/* Footer Add Button */}
      <View
        style={[
          styles.footer,
          { backgroundColor: palette.background, borderTopColor: palette.border },
        ]}
      >
        <Clickable
          onPress={openAddModal}
          accessibilityLabel="Add goal"
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: palette.tint },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Row gap="sm" align="center" justify="center">
            <Ionicons name="add" size={24} color={palette.onPrimary} />
            <ThemedText style={[styles.addButtonText, { color: palette.onPrimary }]}>
              Add Goal
            </ThemedText>
          </Row>
        </Clickable>
      </View>

      <ObjectiveModal
        visible={showModal}
        isEditing={editingObjective !== null}
        selectedSkill={selectedSkill}
        onSelectSkill={setSelectedSkill}
        note={note}
        onChangeNote={setNote}
        targetSessions={targetSessions}
        onChangeTargetSessions={setTargetSessions}
        onSave={saveObjective}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  subtitle: {
    ...Typography.bodySmall,
    opacity: 0.6,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  demoBannerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  addButton: {
    paddingVertical: Spacing.md,
    borderRadius: Spacing.sm,
  },
  addButtonText: {
    ...Typography.subheading,
  },
});
