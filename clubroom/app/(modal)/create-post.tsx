import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getClubMembershipForUser, getUserClubs } from '@/constants/mock-data';
import { clubFeedService } from '@/services/social-feed-service';

/**
 * Create post screen.
 * - Users with a club membership are redirected to the club post creation modal.
 * - Coaches WITHOUT a club can create personal feed posts here.
 * - Non-coaches without a club see the "Join a Club" prompt.
 */
export default function CreatePostScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const membership = currentUser ? getClubMembershipForUser(currentUser.id) : undefined;
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
  const clubs = currentUser ? getUserClubs(currentUser.id) : [];

  // State for personal post creation (coaches without clubs)
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    // Auto-redirect to club post creation if user has a club
    if (membership?.clubId) {
      router.replace(Routes.MODAL_CREATE_CLUB_POST);
    }
  }, [membership?.clubId]);

  // Personal post handler for coaches without clubs
  const handlePersonalPost = () => {
    if (!body.trim() || !currentUser) return;

    // Use first club if available, or empty string for club-less personal post
    const clubId = clubs[0]?.id || '';

    clubFeedService.createPost({
      clubId,
      authorId: currentUser.id,
      authorName: currentUser.fullName || currentUser.username || 'Unknown',
      title: title.trim() || 'Update',
      body: body.trim(),
      postType: 'general',
      postAs: 'self',
      feedType: 'PERSONAL',
    });

    router.back();
  };

  const canPost = body.trim().length > 0;

  // Coach without a club: show personal post creation form
  if (isCoach && !membership?.clubId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={palette.foreground} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold">New Personal Post</ThemedText>
          <TouchableOpacity
            onPress={handlePersonalPost}
            disabled={!canPost}
            style={[
              styles.postButton,
              {
                backgroundColor: canPost ? palette.success : palette.border,
                opacity: canPost ? 1 : 0.5,
              },
            ]}
          >
            <ThemedText style={styles.postButtonText}>Post</ThemedText>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Personal feed indicator */}
            <View style={[styles.personalIndicator, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
              <Ionicons name="person-circle-outline" size={24} color={palette.success} />
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">Personal Feed</ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                  Visible to parents who have had sessions with you
                </ThemedText>
              </View>
            </View>

            {/* Title input */}
            <View style={styles.section}>
              <TextInput
                style={[styles.titleInput, { color: palette.text, borderBottomColor: palette.border }]}
                placeholder="Title (optional)"
                placeholderTextColor={palette.muted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            {/* Body input */}
            <View style={styles.section}>
              <TextInput
                style={[styles.bodyInput, { color: palette.text }]}
                placeholder="Share an update, tip, or recap with your athletes..."
                placeholderTextColor={palette.muted}
                value={body}
                onChangeText={setBody}
                multiline
                autoFocus
                maxLength={500}
              />
            </View>

            {/* Character count */}
            {body.length > 0 && (
              <View style={styles.charCountContainer}>
                <ThemedText style={[styles.charCount, { color: body.length > 500 ? palette.error : palette.muted }]}>
                  {body.length}/500
                </ThemedText>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Non-coach without a club: show "Join a Club" prompt
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
            <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
              <Ionicons name="people" size={40} color={palette.tint} />
            </View>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Join a Club to Post
            </ThemedText>
            <ThemedText style={[styles.description, { color: palette.muted }]}>
              Social features are now part of your club experience. Join or create a club to start sharing with your community.
            </ThemedText>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: palette.tint }]}
              onPress={() => {
                router.back();
                setTimeout(() => router.push(Routes.CLUB_HUB), 100);
              }}
            >
              <Ionicons name="people" size={18} color={Colors.light.onPrimary} />
              <ThemedText style={styles.buttonText}>Go to Club Hub</ThemedText>
            </TouchableOpacity>
          </SurfaceCard>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading while redirecting to club post creation
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
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
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
    color: Colors.light.onPrimary,
    ...Typography.subheading,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Personal post creation styles
  postButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    minWidth: 64,
  },
  postButtonText: {
    ...Typography.bodySmallSemiBold,
    color: Colors.light.onPrimary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  personalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radii.md,
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  titleInput: {
    ...Typography.heading,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  bodyInput: {
    ...Typography.subheading,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCountContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    alignItems: 'flex-end',
  },
  charCount: {
    ...Typography.caption,
  },
});
