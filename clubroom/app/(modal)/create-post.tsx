/**
 * Create Post Screen
 *
 * Routes users based on club membership:
 * - Club members → redirected to club post creation modal
 * - Coaches without club → personal post creation form
 * - Non-coaches without club → "Join a Club" prompt
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { CreatePostForm } from '@/components/social/create-post-form';
import { LoadingState } from '@/components/ui/screen-states';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreatePost } from '@/hooks/use-create-post';

export default function CreatePostScreen() {
  const { colors: palette } = useTheme();
  const p = useCreatePost();

  const handleClose = useCallback(() => router.back(), []);
  const handleGoToClubHub = useCallback(() => {
    router.back();
    setTimeout(() => router.push(Routes.CLUB_HUB), 100);
  }, []);

  // Coach without club → personal post form
  if (p.isCoach && !p.membership?.clubId) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <CreatePostForm
          title={p.title}
          body={p.body}
          postType={p.postType}
          imageUri={p.imageUri}
          eventDate={p.eventDate}
          eventLocation={p.eventLocation}
          showDatePicker={p.showDatePicker}
          isPosting={p.isPosting}
          canPost={p.canPost}
          onClose={handleClose}
          onTitleChange={p.setTitle}
          onBodyChange={p.setBody}
          onPostTypeChange={p.handlePostTypeChange}
          onPickImage={p.pickImage}
          onRemoveImage={p.removeImage}
          onPost={p.handlePersonalPost}
          onSetEventDate={p.setEventDate}
          onSetEventLocation={p.setEventLocation}
          onOpenDatePicker={() => p.setShowDatePicker(true)}
          onCloseDatePicker={() => p.setShowDatePicker(false)}
        />
      </SafeAreaView>
    );
  }

  // Non-coach without club → join club prompt
  if (!p.membership?.clubId) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="New Post"
          showBack
          backIcon="close"
          onBackPress={handleClose}
          centerTitle
          containerStyle={[styles.header, { borderBottomColor: palette.border }]}
        />
        <View style={styles.content}>
          <SurfaceCard style={styles.card}>
            <View
              style={[styles.iconContainer, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
            >
              <Ionicons name="people" size={40} color={palette.tint} />
            </View>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Join a Club to Post
            </ThemedText>
            <ThemedText style={[styles.description, { color: palette.muted }]}>
              Social features are now part of your club experience. Join or create a club to start
              sharing with your community.
            </ThemedText>
            <Clickable
              style={[styles.button, { backgroundColor: palette.tint }]}
              onPress={handleGoToClubHub}
            >
              <Row align="center" gap="sm">
                <Ionicons name="people" size={18} color={palette.onPrimary} />
                <ThemedText style={[styles.buttonText, { color: palette.onPrimary }]}>
                  Go to Club Hub
                </ThemedText>
              </Row>
            </Clickable>
          </SurfaceCard>
        </View>
      </SafeAreaView>
    );
  }

  // Club member → loading while redirecting
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.loading}>
        <View style={styles.loadingState}>
          <LoadingState variant="card" />
        </View>
        <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>Loading...</ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
  },
  closeButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-start' },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  card: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { textAlign: 'center', marginTop: Spacing.sm },
  description: { textAlign: 'center', lineHeight: 22 },
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
    minHeight: 44,
  },
  buttonText: { ...Typography.subheading },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingState: { width: '100%', maxWidth: 320, height: 96 },
});
