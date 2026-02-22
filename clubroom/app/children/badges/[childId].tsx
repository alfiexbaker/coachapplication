/**
 * Child Badges Screen
 *
 * Parent view of child's badge awards with progression tracking,
 * tier/category display, sharing to feed, and highlight support.
 */

import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { ChildLevelCard } from '@/components/badges/child-level-card';
import { ChildBadgeCard } from '@/components/badges/child-badge-card';
import { ChildSwitcher } from '@/components/family/child-switcher';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useChildBadges } from '@/hooks/use-child-badges';

export default function ChildBadgesScreen() {
  const { colors } = useTheme();
  const {
    child,
    awards,
    progressionData,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    highlightBadge,
    loadData,
    switcherChildren,
    selectedChildId,
    activeChildId,
    handleSelectChild,
  } = useChildBadges();

  if (status === 'loading') {
    return (
      <PageContainer>
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer>
        <ErrorState message={error?.message || 'Failed to load child badges.'} onRetry={retry} />
      </PageContainer>
    );
  }

  if (status === 'empty' || !child) {
    return (
      <PageContainer>
        <EmptyState
          icon="ribbon-outline"
          title="No badges yet"
          message="Badges will appear here when coaches award achievements during training sessions."
          actionLabel="Refresh"
          onPressAction={onRefresh}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer gap={Spacing.md} refreshing={refreshing} onRefresh={onRefresh}>
      {/* Header */}
      <Row gap="md" align="center">
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Clickable>
        <View style={styles.headerContent}>
          <ThemedText type="title">{child.name}&apos;s Badges</ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>
            {awards.length} badge{awards.length !== 1 ? 's' : ''} earned
          </ThemedText>
        </View>
      </Row>

      {switcherChildren.length > 1 && selectedChildId && (
        <View style={styles.switcherWrap}>
          <ChildSwitcher
            options={switcherChildren}
            selectedId={selectedChildId}
            onSelect={handleSelectChild}
            activeChildId={activeChildId}
          />
        </View>
      )}

      {/* Level Progress */}
      {progressionData && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ChildLevelCard
            currentLevel={progressionData.currentLevel}
            totalPoints={progressionData.totalPoints}
            nextLevel={progressionData.nextLevel}
            progressPercent={progressionData.progressPercent}
            pointsToNext={progressionData.pointsToNext}
          />
        </Animated.View>
      )}

      {/* Badge List */}
      <View style={{ gap: Spacing.sm }}>
        {awards.map((award, index) => (
          <Animated.View key={award.id} entering={FadeInDown.delay(100 + index * 30).springify()}>
            <ChildBadgeCard
              award={award}
              highlighted={highlightBadge === award.id}
              onRefresh={loadData}
            />
          </Animated.View>
        ))}
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  backButton: { padding: Spacing.xs },
  headerContent: { flex: 1, gap: Spacing.micro },
  switcherWrap: { paddingTop: Spacing.xs },
});
