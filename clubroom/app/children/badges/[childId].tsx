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
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { ChildLevelCard } from '@/components/badges/child-level-card';
import { ChildBadgeCard } from '@/components/badges/child-badge-card';
import { Spacing, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useChildBadges } from '@/hooks/use-child-badges';

export default function ChildBadgesScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { child, awards, progressionData, loading, highlightBadge, loadData } = useChildBadges();

  if (!child) {
    return (
      <PageContainer>
        <ThemedText>Child not found</ThemedText>
      </PageContainer>
    );
  }

  return (
    <PageContainer gap={Spacing.md}>
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
      {awards.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="ribbon-outline" size={48} color={colors.icon} />
              <ThemedText type="defaultSemiBold">No badges yet</ThemedText>
              <ThemedText style={[Typography.bodySmall, { color: colors.muted, textAlign: 'center', maxWidth: 280 }]}>
                Badges will appear here when coaches award them for achievements during training sessions.
              </ThemedText>
            </View>
          </SurfaceCard>
        </Animated.View>
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {awards.map((award, index) => (
            <Animated.View key={award.id} entering={FadeInDown.delay(100 + index * 30).springify()}>
              <ChildBadgeCard award={award} highlighted={highlightBadge === award.id} onRefresh={loadData} />
            </Animated.View>
          ))}
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  backButton: { padding: Spacing.xs },
  headerContent: { flex: 1, gap: Spacing.micro },
  emptyCard: { padding: Spacing.xl },
  emptyContent: { alignItems: 'center', gap: Spacing.md },
});
