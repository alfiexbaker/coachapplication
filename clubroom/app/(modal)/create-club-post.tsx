/**
 * Create Club Post Modal
 *
 * Post composer: type selector, audience targeting, image upload, event fields.
 * All state/logic in useCreateClubPost hook. Selectors + event fields extracted.
 */

import React from 'react';
import { View, StyleSheet, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { FeedTypeSelector, PostTypeSelector, PostAsSelector, AudienceSelector } from '@/components/social/club-post-selectors';
import { ClubPostEventFields } from '@/components/social/club-post-event-fields';
import { Spacing, Radii, Typography, Shadows, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreateClubPost } from '@/hooks/use-create-club-post';

export default function CreateClubPostScreen() {
  const { colors: palette, scheme } = useTheme();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const p = useCreateClubPost(clubId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={palette.foreground} />
        </Clickable>
        <ThemedText type="defaultSemiBold">New Post</ThemedText>
        <Clickable onPress={p.handlePost} disabled={!p.canPost} style={[styles.postButton, { backgroundColor: p.canPost ? palette.tint : palette.border, opacity: p.canPost ? 1 : 0.5 }]}>
          {p.isPosting ? <ActivityIndicator size="small" color={palette.onPrimary} /> : <ThemedText style={[styles.postButtonText, { color: palette.onPrimary }]}>Post</ThemedText>}
        </Clickable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Club indicator */}
          {p.club && (
            <View style={[styles.clubIndicator, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
              <View style={[styles.clubBadge, { backgroundColor: palette.tint }]}>
                <ThemedText style={[styles.clubBadgeText, { color: palette.onPrimary }]}>{p.club.name.slice(0, 2).toUpperCase()}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{p.club.name}</ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                  Posting to {p.feedType === 'PERSONAL' ? 'Personal Feed' : p.feedType === 'BOTH' ? `Personal + ${p.club.name}` : p.audienceLabel}
                </ThemedText>
              </View>
            </View>
          )}

          {p.isCoach && <FeedTypeSelector feedType={p.feedType} clubName={p.club?.name} onSelect={p.setFeedType} />}
          <PostTypeSelector postType={p.postType} onSelect={p.setPostType} />
          {p.canPostAsClub && <PostAsSelector postAs={p.postAs} onSelect={p.setPostAs} />}
          <AudienceSelector audienceType={p.audienceType} selectedSquadId={p.selectedSquadId} squads={p.availableSquads} onSelectClub={p.handleSelectAudienceClub} onSelectSquad={p.handleSelectAudienceSquad} onSelectSquadId={p.setSelectedSquadId} />

          {/* Title */}
          <View style={styles.section}>
            <TextInput style={[styles.titleInput, { color: palette.text, borderBottomColor: palette.border }]} placeholder="Title (optional)" placeholderTextColor={palette.muted} value={p.title} onChangeText={p.setTitle} maxLength={100} />
          </View>

          {/* Body */}
          <View style={styles.section}>
            <TextInput style={[styles.bodyInput, { color: palette.text }]} placeholder="What's happening at the club?" placeholderTextColor={palette.muted} value={p.body} onChangeText={p.setBody} multiline autoFocus maxLength={500} />
          </View>

          {/* Image preview */}
          {p.imageUri && (
            <View style={styles.imageSection}>
              <Image source={{ uri: p.imageUri }} style={styles.imagePreview} />
              <Clickable accessibilityLabel="Close" style={[styles.removeImageButton, { backgroundColor: palette.background, ...Shadows[scheme].subtle }]} onPress={p.removeImage}>
                <Ionicons name="close" size={16} color={palette.foreground} />
              </Clickable>
            </View>
          )}

          {p.postType === 'event' && (
            <ClubPostEventFields eventDate={p.eventDate} eventLocation={p.eventLocation} showDatePicker={p.showDatePicker} onOpenDatePicker={p.openDatePicker} onCloseDatePicker={p.closeDatePicker} onSetDate={p.setEventDate} onChangeLocation={p.setEventLocation} />
          )}

          {p.body.length > 0 && (
            <View style={styles.charCountContainer}>
              <ThemedText style={[styles.charCount, { color: p.body.length > 450 ? palette.error : palette.muted }]}>{p.body.length}/500</ThemedText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer toolbar */}
      <View style={[styles.toolbar, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
        <Clickable style={styles.toolbarButton} onPress={p.pickImage}><Ionicons name="image-outline" size={22} color={palette.tint} /></Clickable>
        <Clickable style={styles.toolbarButton} onPress={() => p.setPostType('event')}><Ionicons name="calendar-outline" size={22} color={p.postType === 'event' ? palette.tint : palette.muted} /></Clickable>
        <Clickable style={styles.toolbarButton} onPress={() => p.setPostType('announcement')}><Ionicons name="megaphone-outline" size={22} color={p.postType === 'announcement' ? palette.tint : palette.muted} /></Clickable>
        <View style={styles.toolbarSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 0.5 },
  postButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill, minWidth: 64, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  postButtonText: { ...Typography.bodySmallSemiBold, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },
  clubIndicator: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: Radii.md },
  clubBadge: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  clubBadgeText: { ...Typography.bodySmallSemiBold },
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  titleInput: { ...Typography.heading, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  bodyInput: { ...Typography.subheading, minHeight: 120, textAlignVertical: 'top' },
  imageSection: { position: 'relative', marginHorizontal: Spacing.md, marginTop: Spacing.md },
  imagePreview: { width: '100%', height: 200, borderRadius: Radii.md },
  removeImageButton: { position: 'absolute', top: Spacing.xs, right: Spacing.xs, width: 28, height: 28, borderRadius: Radii.lg, justifyContent: 'center', alignItems: 'center' },
  charCountContainer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, alignItems: 'flex-end' },
  charCount: { ...Typography.caption },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 0.5 },
  toolbarButton: { width: 44, height: 44, borderRadius: Radii.xl, justifyContent: 'center', alignItems: 'center' },
  toolbarSpacer: { flex: 1 },
});
