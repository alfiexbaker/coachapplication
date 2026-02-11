/**
 * UserHomeScreen — Composition root.
 * Athlete/parent home: stats, streak, quick actions, next session, badges, clubs.
 */
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { hasChildren } from '@/utils/user-helpers';
import { useTheme } from '@/hooks/useTheme';
import { useHomeScreen } from '@/hooks/use-home-screen';
import {
  StatsRow,
  StreakCard,
  QuickActionsGrid,
  NextSessionCard,
  RecentBadgesSection,
  MyClubsSection,
} from './home-screen-sections';

export function UserHomeScreen() {
  const { colors: palette } = useTheme();
  const {
    currentUser,
    refreshing,
    loading,
    error,
    recentBadges,
    clubs,
    stats,
    streakInfo,
    selectedChildId,
    setSelectedChildId,
    onRefresh,
    upcomingBookings,
  } = useHomeScreen();

  if (!currentUser) return null;

  const nextSession = upcomingBookings[0];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.tint}
            colors={[palette.tint]}
          />
        }
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Hey, {currentUser.name?.split(' ')[0] || 'Athlete'}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Your training journey
          </ThemedText>
        </View>

        {hasChildren(currentUser) && currentUser.children && (
          <ChildSwitcher
            childrenList={currentUser.children}
            selectedId={selectedChildId}
            onSelect={setSelectedChildId}
            showAll={false}
          />
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
          </View>
        )}

        {error && !loading && (
          <Row
            align="center"
            gap="sm"
            style={[
              styles.errorContainer,
              { backgroundColor: withAlpha(palette.error, 0.06), borderColor: palette.error },
            ]}
          >
            <Ionicons name="alert-circle" size={20} color={palette.error} />
            <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
          </Row>
        )}

        <StatsRow stats={stats} />
        {streakInfo && <StreakCard streakInfo={streakInfo} />}
        <QuickActionsGrid />
        <NextSessionCard booking={nextSession} />
        <RecentBadgesSection badges={recentBadges} />
        <MyClubsSection clubs={clubs} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  header: { gap: Spacing.xs, marginBottom: Spacing.xs },
  title: { ...Typography.display, letterSpacing: -0.6 },
  subtitle: { ...Typography.bodySmall, lineHeight: 20, fontWeight: '500' },
  loadingContainer: { padding: Spacing['2xl'], alignItems: 'center', justifyContent: 'center' },
  errorContainer: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  errorText: { ...Typography.bodySmall, flex: 1 },
});
