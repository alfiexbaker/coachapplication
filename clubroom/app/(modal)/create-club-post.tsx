/**
 * Create Club Post Modal
 *
 * Post composer: type selector, audience targeting, image upload, event fields.
 * All state/logic in useCreateClubPost hook. Selectors + event fields extracted.
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import {
  FeedTypeSelector,
  PostTypeSelector,
  PostAsSelector,
  AudienceSelector,
  EventAttachSelector,
} from '@/components/social/club-post-selectors';
import { ClubPostEventFields } from '@/components/social/club-post-event-fields';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, Shadows, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreateClubPost } from '@/hooks/use-create-club-post';
import { useFocusTrap } from '@/hooks/use-focus-trap';

export default function CreateClubPostScreen() {
  const { colors: palette, scheme } = useTheme();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const p = useCreateClubPost(clubId);
  const modalRef = useRef<View>(null);
  useFocusTrap(modalRef, 'Create club post modal');

  return (
    <SafeAreaView
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="dialog"
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <Row style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="Close create post"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={palette.foreground} />
        </Clickable>
        <ThemedText type="defaultSemiBold">New Post</ThemedText>
        <Clickable
          onPress={p.handlePost}
          disabled={!p.canPost}
          accessibilityLabel={p.isPosting ? 'Posting club post' : 'Post club post'}
          accessibilityRole="button"
          style={[
            styles.postButton,
            {
              backgroundColor: p.canPost ? palette.tint : palette.border,
              opacity: p.canPost ? 1 : 0.5,
            },
          ]}
        >
          {p.isPosting ? (
            <ActivityIndicator size="small" color={palette.onPrimary} />
          ) : (
            <ThemedText style={[styles.postButtonText, { color: palette.onPrimary }]}>
              Post
            </ThemedText>
          )}
        </Clickable>
      </Row>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Club indicator */}
          {p.club && (
            <Row style={[styles.clubIndicator, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
              <View style={[styles.clubBadge, { backgroundColor: palette.tint }]}>
                <ThemedText style={[styles.clubBadgeText, { color: palette.onPrimary }]}>
                  {p.club.name.slice(0, 2).toUpperCase()}
                </ThemedText>
              </View>
              <Column flex>
                <ThemedText type="defaultSemiBold">{p.club.name}</ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                  Posting to{' '}
                  {p.feedType === 'PERSONAL'
                    ? 'Personal Feed'
                    : p.feedType === 'BOTH'
                      ? `Personal + ${p.club.name}`
                      : p.audienceLabel}
                </ThemedText>
              </Column>
            </Row>
          )}

          {p.canPostAsClub && <PostAsSelector postAs={p.postAs} onSelect={p.setPostAs} />}

          {p.isCoach && p.postAs === 'self' && (
            <FeedTypeSelector
              feedType={p.feedType}
              canTargetClub={Boolean(p.club)}
              onSelect={p.setFeedType}
              clubMemberCount={p.club?.memberCount ?? 0}
              followerCountEstimate={p.personalAudienceEstimate}
            />
          )}

          <PostTypeSelector postType={p.postType} onSelect={p.setPostType} />
          {p.feedType === 'CLUB' && (
            <>
              <AudienceSelector
                audienceType={p.audienceType}
                selectedSquadId={p.selectedSquadId}
                squads={p.availableSquads}
                onSelectClub={p.handleSelectAudienceClub}
                onSelectSquad={p.handleSelectAudienceSquad}
                onSelectSquadId={p.setSelectedSquadId}
              />
              {p.audienceType === 'squad' && !p.selectedSquadId && (
                <View style={styles.inlineHint}>
                  <ThemedText style={[styles.inlineHintText, { color: palette.warning }]}>
                    Select a team before posting.
                  </ThemedText>
                </View>
              )}
            </>
          )}

          {/* Title */}
          <View style={styles.section}>
            <TextInput
              style={[
                styles.titleInput,
                { color: palette.text, borderBottomColor: palette.border },
              ]}
              placeholder="Title (optional)"
              placeholderTextColor={palette.muted}
              value={p.title}
              onChangeText={p.setTitle}
              maxLength={100}
            />
          </View>

          {/* Body */}
          <View style={styles.section}>
            <TextInput
              style={[styles.bodyInput, { color: palette.text }]}
              placeholder="What's happening at the club?"
              placeholderTextColor={palette.muted}
              value={p.body}
              onChangeText={p.setBody}
              multiline
              autoFocus
              maxLength={500}
            />
          </View>

          {/* Image preview */}
          {p.imageUri && (
            <View style={styles.imageSection}>
              <Image source={{ uri: p.imageUri }} style={styles.imagePreview} />
              <Clickable
                accessibilityLabel="Close"
                style={[
                  styles.removeImageButton,
                  { backgroundColor: palette.background, ...Shadows[scheme].subtle },
                ]}
                onPress={p.removeImage}
              >
                <Ionicons name="close" size={16} color={palette.foreground} />
              </Clickable>
            </View>
          )}

          {p.postType === 'event' && (
            <>
              <EventAttachSelector
                events={p.availableEvents}
                selectedEventId={p.selectedEventId}
                onSelectEvent={p.handleSelectEvent}
                onClear={p.clearSelectedEvent}
              />
              <ClubPostEventFields
                eventDate={p.eventDate}
                eventLocation={p.eventLocation}
                showDatePicker={p.showDatePicker}
                onOpenDatePicker={p.openDatePicker}
                onCloseDatePicker={p.closeDatePicker}
                onSetDate={p.setEventDate}
                onChangeLocation={p.setEventLocation}
              />
            </>
          )}

          {p.body.length > 0 && (
            <View style={styles.charCountContainer}>
              <ThemedText
                style={[
                  styles.charCount,
                  { color: p.body.length > 450 ? palette.error : palette.muted },
                ]}
              >
                {p.body.length}/500
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer toolbar */}
      <Row
        style={[
          styles.toolbar,
          { borderTopColor: palette.border, backgroundColor: palette.background },
        ]}
      >
        <Clickable style={styles.toolbarButton} onPress={p.pickImage}>
          <Ionicons name="image-outline" size={22} color={palette.tint} />
        </Clickable>
        <Clickable style={styles.toolbarButton} onPress={() => p.setPostType('event')}>
          <Ionicons
            name="calendar-outline"
            size={22}
            color={p.postType === 'event' ? palette.tint : palette.muted}
          />
        </Clickable>
        <Clickable style={styles.toolbarButton} onPress={() => p.setPostType('announcement')}>
          <Ionicons
            name="megaphone-outline"
            size={22}
            color={p.postType === 'announcement' ? palette.tint : palette.muted}
          />
        </Clickable>
        <View style={styles.toolbarSpacer} />
      </Row>
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
  postButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonText: { ...Typography.bodySmallSemiBold, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },
  clubIndicator: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radii.md,
  },
  clubBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: { ...Typography.bodySmallSemiBold },
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  inlineHint: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  inlineHintText: { ...Typography.caption },
  titleInput: { ...Typography.heading, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  bodyInput: { ...Typography.subheading, minHeight: 120, textAlignVertical: 'top' },
  imageSection: { position: 'relative', marginHorizontal: Spacing.md, marginTop: Spacing.md },
  imagePreview: { width: '100%', height: 200, borderRadius: Radii.md },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  charCountContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    alignItems: 'flex-end',
  },
  charCount: { ...Typography.caption },
  toolbar: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarSpacer: { flex: 1 },
});
