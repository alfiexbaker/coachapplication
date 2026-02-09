/**
 * Coach Detail / Public Coach Profile
 *
 * Viewable by anyone — bio, reviews, sessions, booking CTA.
 * All state/logic in useCoachDetail hook. Tabs extracted into sub-components.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { CoachDetailHero } from '@/components/coach/coach-detail-hero';
import { CoachDetailAbout } from '@/components/coach/coach-detail-about';
import { CoachDetailReviews } from '@/components/coach/coach-detail-reviews';
import { CoachDetailSessions } from '@/components/coach/coach-detail-sessions';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCoachDetail, COACH_TABS } from '@/hooks/use-coach-detail';

export default function CoachProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const p = useCoachDetail(id);

  if (p.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.centered}><ActivityIndicator size="large" color={palette.tint} /></View>
      </SafeAreaView>
    );
  }

  if (!p.coach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>Coach not found</ThemedText>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={p.refreshing} onRefresh={p.handleRefresh} tintColor={palette.tint} />}>
        <CoachDetailHero coach={p.coach} isOwnProfile={p.isOwnProfile} isFollowing={p.isFollowing} onFollow={p.handleFollow} onMessage={p.handleMessage} />

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: palette.border }]}>
          {COACH_TABS.map((tab) => (
            <Clickable key={tab.id} onPress={() => p.setActiveTab(tab.id)} style={[styles.tab, p.activeTab === tab.id ? { borderBottomColor: palette.tint, borderBottomWidth: 2 } : undefined].filter(Boolean) as ViewStyle[]}>
              <Ionicons name={tab.icon as keyof typeof Ionicons.glyphMap} size={18} color={p.activeTab === tab.id ? palette.tint : palette.muted} />
              <ThemedText style={{ color: p.activeTab === tab.id ? palette.tint : palette.muted, fontWeight: p.activeTab === tab.id ? '600' : '400' }}>{tab.label}</ThemedText>
            </Clickable>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {p.activeTab === 'about' && <CoachDetailAbout coach={p.coach} />}
          {p.activeTab === 'reviews' && <CoachDetailReviews coach={p.coach} reviews={p.reviews} />}
          {p.activeTab === 'sessions' && <CoachDetailSessions coach={p.coach} onBook={p.handleBook} />}
        </View>
      </ScrollView>

      {/* Fixed Book Footer */}
      {!p.isOwnProfile && (
        <View style={[styles.fixedFooter, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
          <View style={styles.footerPrice}>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>From</ThemedText>
            <ThemedText type="title" style={{ color: palette.tint }}>£{p.coach.minPriceUsd}</ThemedText>
          </View>
          <Button onPress={p.handleBook} style={{ flex: 1 }}>Book Session</Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  errorText: { ...Typography.subheading },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, marginTop: Spacing.md },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, paddingVertical: Spacing.md },
  tabContentContainer: { paddingBottom: 100 },
  fixedFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1 },
  footerPrice: { alignItems: 'center' },
});
