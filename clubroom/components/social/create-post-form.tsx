import React, { memo } from 'react';
import { View, StyleSheet, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { ClubPostEventFields } from '@/components/social/club-post-event-fields';
import { Spacing, Radii, Typography, Shadows, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { POST_TYPES } from '@/hooks/use-create-post';
import type { ClubPostType } from '@/constants/types';

interface CreatePostFormProps {
  title: string;
  body: string;
  postType: ClubPostType;
  imageUri: string | null;
  eventDate: Date | null;
  eventLocation: string;
  showDatePicker: boolean;
  isPosting: boolean;
  canPost: boolean;
  onClose: () => void;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onPostTypeChange: (type: ClubPostType) => void;
  onPickImage: () => void;
  onRemoveImage: () => void;
  onPost: () => void;
  onSetEventDate: (d: Date | null) => void;
  onSetEventLocation: (v: string) => void;
  onOpenDatePicker: () => void;
  onCloseDatePicker: () => void;
}

export const CreatePostForm = memo(function CreatePostForm({
  title, body, postType, imageUri, eventDate, eventLocation, showDatePicker,
  isPosting, canPost, onClose, onTitleChange, onBodyChange, onPostTypeChange,
  onPickImage, onRemoveImage, onPost, onSetEventDate, onSetEventLocation,
  onOpenDatePicker, onCloseDatePicker,
}: CreatePostFormProps) {
  const { colors: palette, scheme } = useTheme();

  return (
    <>
      {/* Header */}
      <Row justify="between" align="center" style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={palette.foreground} />
        </Clickable>
        <ThemedText type="defaultSemiBold">New Personal Post</ThemedText>
        <Clickable
          onPress={onPost} disabled={!canPost}
          style={[styles.postButton, { backgroundColor: canPost ? palette.success : palette.border, opacity: canPost ? 1 : 0.5 }]}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color={palette.onPrimary} />
          ) : (
            <ThemedText style={[styles.postButtonText, { color: palette.onPrimary }]}>Post</ThemedText>
          )}
        </Clickable>
      </Row>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Personal feed indicator */}
          <Row align="center" gap="sm" style={[styles.personalIndicator, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
            <Ionicons name="person-circle-outline" size={24} color={palette.success} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Personal Feed</ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                Visible to parents who have had sessions with you
              </ThemedText>
            </View>
          </Row>

          {/* Post type selector */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post Type</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeSelector}>
              {POST_TYPES.map((type) => (
                <Clickable
                  key={type.key}
                  style={[styles.typeOption, { borderColor: postType === type.key ? palette.tint : palette.border }, postType === type.key ? { backgroundColor: withAlpha(palette.tint, 0.06) } : undefined]}
                  onPress={() => onPostTypeChange(type.key)}
                >
                  <Ionicons name={type.icon} size={20} color={postType === type.key ? palette.tint : palette.muted} />
                  <ThemedText style={[styles.typeLabel, { color: postType === type.key ? palette.tint : palette.text }]}>{type.label}</ThemedText>
                </Clickable>
              ))}
            </ScrollView>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <TextInput style={[styles.titleInput, { color: palette.text, borderBottomColor: palette.border }]} placeholder="Title (optional)" placeholderTextColor={palette.muted} value={title} onChangeText={onTitleChange} maxLength={100} />
          </View>

          {/* Body */}
          <View style={styles.section}>
            <TextInput style={[styles.bodyInput, { color: palette.text }]} placeholder="Share an update, tip, or recap with your athletes..." placeholderTextColor={palette.muted} value={body} onChangeText={onBodyChange} multiline autoFocus maxLength={500} />
          </View>

          {/* Image preview */}
          {imageUri && (
            <View style={styles.imageSection}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <Clickable accessibilityLabel="Close" style={[styles.removeImageButton, { backgroundColor: palette.background, ...Shadows[scheme].subtle }]} onPress={onRemoveImage} hitSlop={8}>
                <Ionicons name="close" size={16} color={palette.foreground} />
              </Clickable>
            </View>
          )}

          {/* Event details */}
          {postType === 'event' && (
            <ClubPostEventFields
              eventDate={eventDate} eventLocation={eventLocation} showDatePicker={showDatePicker}
              onOpenDatePicker={onOpenDatePicker} onCloseDatePicker={onCloseDatePicker}
              onSetDate={(d) => onSetEventDate(d)} onChangeLocation={onSetEventLocation}
            />
          )}

          {/* Character count */}
          {body.length > 0 && (
            <View style={styles.charCountContainer}>
              <ThemedText style={[styles.charCount, { color: body.length > 450 ? palette.warning : palette.muted }]}>{body.length}/500</ThemedText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toolbar */}
      <Row align="center" style={[styles.toolbar, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
        <Clickable style={styles.toolbarButton} onPress={onPickImage}>
          <Ionicons name="image-outline" size={22} color={palette.tint} />
        </Clickable>
        <Clickable style={styles.toolbarButton} onPress={() => onPostTypeChange('event')}>
          <Ionicons name="calendar-outline" size={22} color={postType === 'event' ? palette.tint : palette.muted} />
        </Clickable>
        <Clickable style={styles.toolbarButton} onPress={() => onPostTypeChange('announcement')}>
          <Ionicons name="megaphone-outline" size={22} color={postType === 'announcement' ? palette.tint : palette.muted} />
        </Clickable>
        <View style={styles.toolbarSpacer} />
      </Row>
    </>
  );
});

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 0.5 },
  closeButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-start' },
  postButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill, minWidth: 64, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  postButtonText: { ...Typography.bodySmallSemiBold, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },
  personalIndicator: { padding: Spacing.md, marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: Radii.md },
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sectionLabel: { ...Typography.caption, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  typeSelector: { flexDirection: 'row', gap: Spacing.xs },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, borderWidth: 1, minHeight: 44 },
  typeLabel: { ...Typography.smallSemiBold },
  titleInput: { ...Typography.heading, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  bodyInput: { ...Typography.subheading, minHeight: 120, textAlignVertical: 'top' },
  imageSection: { position: 'relative', marginHorizontal: Spacing.md, marginTop: Spacing.md },
  imagePreview: { width: '100%', height: 200, borderRadius: Radii.md },
  removeImageButton: { position: 'absolute', top: Spacing.xs, right: Spacing.xs, width: 44, height: 44, borderRadius: Radii.lg, justifyContent: 'center', alignItems: 'center' },
  charCountContainer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, alignItems: 'flex-end' },
  charCount: { ...Typography.caption },
  toolbar: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 0.5 },
  toolbarButton: { width: 44, height: 44, borderRadius: Radii.xl, justifyContent: 'center', alignItems: 'center' },
  toolbarSpacer: { flex: 1 },
});
