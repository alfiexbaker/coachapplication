/**
 * Public Coach Profile Screen
 *
 * Read-only profile with cover photo, avatar, tabs (About/Specialties/Qualifications/Reviews).
 * All state/logic in usePublicProfile hook. Sections in components/coach/public-profile-*.tsx.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { ShareProfile } from '@/components/coach/share-profile';
import { PublicProfileHero } from '@/components/coach/public-profile-hero';
import { PublicProfileAbout } from '@/components/coach/public-profile-about';
import { PublicProfileSpecialties } from '@/components/coach/public-profile-specialties';
import { PublicProfileCredentials } from '@/components/coach/public-profile-credentials';
import { PublicProfileReviews } from '@/components/coach/public-profile-reviews';
import { Spacing, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePublicProfile, PROFILE_TABS } from '@/hooks/use-public-profile';

export default function PublicCoachProfileScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { colors: palette } = useTheme();
  const profile = usePublicProfile(coachId);

  if (profile.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile.coach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>Coach not found</ThemedText>
          <Clickable onPress={() => router.back()} style={[styles.goBackBtn, { backgroundColor: palette.tint }]}>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.surface }]}>Go Back</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={profile.refreshing} onRefresh={profile.handleRefresh} tintColor={palette.tint} />}
      >
        <PublicProfileHero
          coach={profile.coach}
          onShare={profile.openShareSheet}
          onBook={profile.handleBook}
          onMessage={profile.handleMessage}
        />

        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          style={[styles.tabBar, { borderBottomColor: palette.border }]}
        >
          {PROFILE_TABS.map((tab) => {
            const isActive = profile.activeTab === tab.id;
            return (
              <Clickable
                key={tab.id}
                onPress={() => profile.setActiveTab(tab.id)}
                style={[styles.tab, isActive && { borderBottomColor: palette.tint, borderBottomWidth: 2 }].filter(Boolean) as ViewStyle[]}
              >
                <Ionicons name={tab.icon} size={Components.icon.md} color={isActive ? palette.tint : palette.muted} />
                <ThemedText style={[Typography.small, { color: isActive ? palette.tint : palette.muted }, isActive && { fontWeight: '600' }].filter(Boolean) as TextStyle[]}>
                  {tab.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {profile.activeTab === 'about' && <PublicProfileAbout coach={profile.coach} />}
          {profile.activeTab === 'specialties' && <PublicProfileSpecialties coach={profile.coach} />}
          {profile.activeTab === 'qualifications' && <PublicProfileCredentials coach={profile.coach} />}
          {profile.activeTab === 'reviews' && <PublicProfileReviews coach={profile.coach} reviews={profile.reviews} />}
        </View>
      </ScrollView>

      {profile.showShareSheet && (
        <ShareProfile
          coachId={coachId!}
          coachName={profile.coach.name}
          profileUrl={profile.profileUrl}
          onClose={profile.closeShareSheet}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  errorText: { ...Typography.body },
  goBackBtn: { height: Components.button.height, paddingHorizontal: Spacing.lg, borderRadius: Components.button.borderRadius, alignItems: 'center', justifyContent: 'center' },
  tabBar: { borderBottomWidth: 1, marginTop: Spacing.md },
  tabBarContent: { flexDirection: 'row', paddingHorizontal: Spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs / 2, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  tabContentContainer: { paddingBottom: Spacing['3xl'] },
});
