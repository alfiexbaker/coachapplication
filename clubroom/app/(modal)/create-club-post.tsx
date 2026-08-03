import React, { useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PostAsSelector, PostTypeSelector } from '@/components/social/club-post-selectors';
import { ThemedText } from '@/components/themed-text';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useCreateClubPost } from '@/hooks/use-create-club-post';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useTheme } from '@/hooks/useTheme';

export default function CreateClubPostScreen() {
  const { colors: palette } = useTheme();
  const { clubId } = useLocalSearchParams<{ clubId?: string }>();
  const composer = useCreateClubPost(clubId);
  const modalRef = useRef<View>(null);
  const isReady = composer.contextStatus === 'ready';
  useFocusTrap(modalRef, 'Create club update modal');

  return (
    <SafeAreaView
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="none"
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <Row style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.headerSide}>
          <Clickable
            onPress={() => router.back()}
            accessibilityLabel="Close club update"
            accessibilityRole="button"
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={palette.foreground} />
          </Clickable>
        </View>
        <ThemedText type="defaultSemiBold">New club update</ThemedText>
        <View style={[styles.headerSide, styles.headerAction]}>
          {isReady ? (
            <Clickable
              onPress={composer.handlePost}
              disabled={!composer.canPost}
              accessibilityLabel={composer.isPosting ? 'Publishing club update' : 'Publish update'}
              accessibilityRole="button"
              accessibilityState={{ disabled: !composer.canPost, busy: composer.isPosting }}
              style={[
                styles.postButton,
                {
                  backgroundColor: composer.canPost ? palette.tint : palette.border,
                  opacity: composer.canPost ? 1 : 0.55,
                },
              ]}
            >
              <ThemedText style={[styles.postButtonText, { color: palette.onPrimary }]}>
                Post
              </ThemedText>
            </Clickable>
          ) : null}
        </View>
      </Row>

      {composer.isPosting ? (
        <SubmitProgressState label="Publishing update" style={styles.submitState} />
      ) : null}

      {isReady && composer.postError ? (
        <Row
          style={[
            styles.errorBanner,
            {
              backgroundColor: withAlpha(palette.error, 0.08),
              borderColor: withAlpha(palette.error, 0.24),
            },
          ]}
          accessibilityRole="alert"
        >
          <Ionicons name="alert-circle-outline" size={18} color={palette.error} />
          <ThemedText style={[styles.errorText, { color: palette.error }]}>
            {composer.postError}
          </ThemedText>
        </Row>
      ) : null}

      {composer.contextStatus === 'loading' ? (
        <LoadingState
          variant="form"
          accessibilityLabel="Loading club update composer"
          style={styles.stateContainer}
        />
      ) : composer.contextStatus === 'error' ? (
        <ErrorState
          title="Could not load club"
          message={composer.contextMessage ?? 'Could not load your club access.'}
          onRetry={composer.retryClubContext}
        />
      ) : composer.contextStatus === 'denied' ? (
        <View style={styles.stateContainer}>
          <EmptyState
            context="error"
            title="Club update unavailable"
            message={
              composer.contextMessage ??
              'You do not have permission to publish updates for this club.'
            }
          />
        </View>
      ) : composer.contextStatus === 'empty' ? (
        <View style={styles.stateContainer}>
          <EmptyState
            icon="shield-outline"
            title="No club available"
            message={composer.contextMessage ?? 'Join a club before publishing an update.'}
          />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.clubContext, { borderBottomColor: palette.border }]}>
              <ThemedText style={[styles.contextLabel, { color: palette.muted }]}>CLUB</ThemedText>
              <ThemedText type="subtitle">{composer.club?.name}</ThemedText>
              <ThemedText style={[styles.contextMeta, { color: palette.muted }]}>
                All members
              </ThemedText>
            </View>

            <PostAsSelector postAs={composer.postAs} onSelect={composer.setPostAs} />
            <PostTypeSelector postType={composer.postType} onSelect={composer.setPostType} />

            <View style={styles.section}>
              <TextInput
                style={[
                  styles.titleInput,
                  { color: palette.text, borderBottomColor: palette.border },
                ]}
                accessibilityLabel="Headline"
                placeholder="Headline (optional)"
                placeholderTextColor={palette.muted}
                value={composer.title}
                onChangeText={composer.setTitle}
                maxLength={100}
                returnKeyType="next"
              />
            </View>

            <View style={styles.section}>
              <TextInput
                style={[styles.bodyInput, { color: palette.text }]}
                accessibilityLabel="Update text"
                placeholder="Write an update"
                placeholderTextColor={palette.muted}
                value={composer.body}
                onChangeText={composer.setBody}
                multiline
                maxLength={500}
              />
            </View>

            {composer.body.length > 450 ? (
              <View style={styles.charCountContainer}>
                <ThemedText
                  style={[
                    styles.charCount,
                    { color: composer.body.length === 500 ? palette.error : palette.muted },
                  ]}
                >
                  {composer.body.length}/500
                </ThemedText>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 88, alignItems: 'flex-start' },
  headerAction: { alignItems: 'flex-end' },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
  },
  postButton: {
    minWidth: 72,
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
  },
  postButtonText: { ...Typography.bodySmallSemiBold },
  submitState: { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  errorBanner: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  errorText: { ...Typography.caption, flex: 1 },
  stateContainer: { flex: 1, justifyContent: 'center', padding: Spacing.md },
  scrollContent: { paddingBottom: Spacing['2xl'] },
  clubContext: {
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.micro,
  },
  contextLabel: { ...Typography.micro, letterSpacing: 1.2 },
  contextMeta: { ...Typography.caption },
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  titleInput: { ...Typography.heading, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  bodyInput: {
    ...Typography.subheading,
    minHeight: 160,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'top',
  },
  charCountContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    alignItems: 'flex-end',
  },
  charCount: { ...Typography.caption },
});
