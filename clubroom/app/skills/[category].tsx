/**
 * Skill Tree Detail Screen
 *
 * Displays a single skill tree with full visualization.
 * Users can view node details and track progress.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { SkillTreeView } from '@/components/skills/SkillTreeView';
import { SkillNodeDetailModal } from '@/components/skills/skill-node-detail-modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useSkillCategory } from '@/hooks/use-skill-category';
import { ok } from '@/types/result';

export default function SkillTreeDetailScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    tree,
    loading,
    status,
    error,
    retry,
    selectedNode,
    canUnlockNodes,
    animateUnlocks,
    category,
    currentUser,
    animatedModalStyle,
    canUnlockSelected,
    prereqNames,
    handleNodePress,
    handleCloseModal,
    handleAddXp,
    handleUnlockNode,
  } = useSkillCategory();

  if (!currentUser) return null;

  return (
    <>
      <PageContainer
        header={
          <PageHeader
            title={tree?.name ?? 'Skill Tree'}
            subtitle={tree?.description}
            showBack
            onBack={() => router.back()}
          />
        }
        gap={Spacing.md}
        scrollable={false}
      >
        {loading ? (
          <LoadingState variant="detail" />
        ) : status === 'error' ? (
          <ErrorState
            message={error?.message ?? 'Failed to load this skill tree.'}
            onRetry={retry}
          />
        ) : status === 'empty' ? (
          <EmptyState
            icon="analytics-outline"
            title="Tree Not Found"
            message={`Could not load the skill tree for "${category}".`}
          />
        ) : tree ? (
          <View style={styles.treeWrapper}>
            <SkillTreeView
              tree={tree}
              onNodePress={handleNodePress}
              canUnlockNodes={canUnlockNodes}
              animateUnlocks={animateUnlocks}
            />
          </View>
        ) : (
          <SurfaceCard style={styles.centerCard}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
            <ThemedText type="defaultSemiBold">Tree Not Found</ThemedText>
            <ThemedText style={{ color: colors.muted }}>
              Could not load the skill tree for &quot;{category}&quot;
            </ThemedText>
          </SurfaceCard>
        )}
      </PageContainer>

      <SkillNodeDetailModal
        selectedNode={selectedNode}
        tree={tree}
        canUnlockSelected={canUnlockSelected}
        prereqNames={prereqNames}
        animatedModalStyle={animatedModalStyle}
        onClose={handleCloseModal}
        onAddXp={handleAddXp}
        onUnlock={handleUnlockNode}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centerCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  treeWrapper: { flex: 1 },
});
