/**
 * Create Post Screen
 *
 * Routes staff users to the club composer while keeping personal posting
 * available for parents/users from anywhere.
 */

import React, { useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { CreatePostForm } from '@/components/social/create-post-form';
import { SubmitProgressState } from '@/components/ui/screen-states';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreatePost } from '@/hooks/use-create-post';
import { useFocusTrap } from '@/hooks/use-focus-trap';

export default function CreatePostScreen() {
  const { colors: palette } = useTheme();
  const p = useCreatePost();
  const modalRef = useRef<View>(null);
  useFocusTrap(modalRef, 'Create post modal');

  const handleClose = useCallback(() => router.back(), []);

  if (p.shouldRedirectToClubPost) {
    return (
      <SafeAreaView
        ref={modalRef}
        accessible
        accessibilityViewIsModal
        accessibilityRole="none"
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <View style={styles.redirectContainer}>
          <SurfaceCard style={styles.redirectCard}>
            <SubmitProgressState label="Opening club composer" />
            <ThemedText style={[styles.redirectCopy, { color: palette.muted }]}>
              Keeping this composer mounted until your club post flow is ready.
            </ThemedText>
          </SurfaceCard>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="none"
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <CreatePostForm
        title={p.title}
        body={p.body}
        postType={p.postType}
        imageUri={p.imageUri}
        videoUri={p.videoUri}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  redirectContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.md },
  redirectCard: { width: '100%', maxWidth: 360, gap: Spacing.sm, paddingVertical: Spacing.lg },
  redirectCopy: { textAlign: 'center' },
});
