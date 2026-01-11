import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getClubMembershipForUser } from '@/constants/mock-data';

/**
 * Legacy create post screen.
 * Redirects to club-centric posting if user has a club membership.
 */
export default function CreatePostScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const membership = currentUser ? getClubMembershipForUser(currentUser.id) : undefined;

  useEffect(() => {
    // Auto-redirect to club post creation if user has a club
    if (membership?.clubId) {
      router.replace({
        pathname: '/(modal)/create-club-post',
        params: { clubId: membership.clubId }
      });
    }
  }, [membership?.clubId]);

  // Show redirect UI if no club membership
  if (!membership?.clubId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={palette.foreground} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold">New Post</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <SurfaceCard style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: `${palette.tint}10` }]}>
              <Ionicons name="people" size={40} color={palette.tint} />
            </View>
            <ThemedText type="subtitle" style={styles.title}>
              Join a Club to Post
            </ThemedText>
            <ThemedText style={[styles.description, { color: palette.muted }]}>
              Social features are now part of your club experience. Join or create a club to start sharing with your community.
            </ThemedText>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: palette.tint }]}
              onPress={() => {
                router.back();
                setTimeout(() => router.push('/(tabs)/club-hub'), 100);
              }}
            >
              <Ionicons name="people" size={18} color="#fff" />
              <ThemedText style={styles.buttonText}>Go to Club Hub</ThemedText>
            </TouchableOpacity>
          </SurfaceCard>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading while redirecting
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.loading}>
        <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
