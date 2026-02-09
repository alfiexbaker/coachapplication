import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, Shadows, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { getClubMembershipForUser, getUserClubs } from '@/constants/mock-data';
import { clubFeedService } from '@/services/social-feed-service';
import type { ClubPostType } from '@/constants/types';

type PostTypeOption = {
  key: ClubPostType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const POST_TYPES: PostTypeOption[] = [
  { key: 'general', label: 'Update', icon: 'create-outline' },
  { key: 'photo', label: 'Photo', icon: 'images-outline' },
  { key: 'announcement', label: 'Announcement', icon: 'megaphone-outline' },
  { key: 'event', label: 'Event', icon: 'calendar-outline' },
];

/**
 * Create post screen for coaches.
 * - Users with a club membership are redirected to the club post creation modal.
 * - Coaches WITHOUT a club can create personal feed posts here with image picker,
 *   post type selection, and event details.
 * - Non-coaches without a club see the "Join a Club" prompt.
 */
export default function CreatePostScreen() {
  const { colors: palette, scheme } = useTheme();
  const { currentUser } = useAuth();

  const membership = currentUser ? getClubMembershipForUser(currentUser.id) : undefined;
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
  const clubs = currentUser ? getUserClubs(currentUser.id) : [];

  // State for personal post creation
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<ClubPostType>('general');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventLocation, setEventLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    // Auto-redirect to club post creation if user has a club
    if (membership?.clubId) {
      router.replace(Routes.MODAL_CREATE_CLUB_POST);
    }
  }, [membership?.clubId]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      if (postType !== 'photo') {
        setPostType('photo');
      }
    }
  }, [postType]);

  const removeImage = useCallback(() => {
    setImageUri(null);
  }, []);

  // Personal post handler using createCoachPost
  const handlePersonalPost = useCallback(async () => {
    if ((!body.trim() && !imageUri) || !currentUser) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsPosting(true);
    try {
      const result = await clubFeedService.createCoachPost({
        coachId: currentUser.id,
        coachName: currentUser.fullName || currentUser.username || 'Unknown',
        title: title.trim() || (postType === 'photo' ? 'Photo' : 'Update'),
        body: body.trim(),
        postType,
        feedType: 'PERSONAL',
        imageUrl: imageUri || undefined,
        eventDate: eventDate?.toISOString(),
        eventLocation: eventLocation.trim() || undefined,
        clubId: clubs[0]?.id,
      });

      if (result.success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.back();
      }
    } finally {
      setIsPosting(false);
    }
  }, [body, imageUri, currentUser, title, postType, eventDate, eventLocation, clubs]);

  const canPost = (body.trim().length > 0 || imageUri !== null) && !isPosting;

  const handlePostTypeChange = useCallback((type: ClubPostType) => {
    setPostType(type);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Coach without a club: show personal post creation form
  if (isCoach && !membership?.clubId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={palette.foreground} />
          </Pressable>
          <ThemedText type="defaultSemiBold">New Personal Post</ThemedText>
          <Pressable
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
            {isPosting ? (
              <ActivityIndicator size="small" color={palette.onPrimary} />
            ) : (
              <ThemedText style={[styles.postButtonText, { color: palette.onPrimary }]}>Post</ThemedText>
            )}
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

            {/* Post type selector pills */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post Type</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeSelector}>
                {POST_TYPES.map((type) => (
                  <Pressable
                    key={type.key}
                    style={[
                      styles.typeOption,
                      { borderColor: postType === type.key ? palette.tint : palette.border },
                      postType === type.key ? { backgroundColor: withAlpha(palette.tint, 0.06) } : undefined,
                    ]}
                    onPress={() => handlePostTypeChange(type.key)}
                  >
                    <Ionicons
                      name={type.icon}
                      size={20}
                      color={postType === type.key ? palette.tint : palette.muted}
                    />
                    <ThemedText
                      style={[
                        styles.typeLabel,
                        { color: postType === type.key ? palette.tint : palette.text },
                      ]}
                    >
                      {type.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
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

            {/* Image preview */}
            {imageUri && (
              <View style={styles.imageSection}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <Pressable
                  style={[styles.removeImageButton, { backgroundColor: palette.background, ...Shadows[scheme].subtle }]}
                  onPress={removeImage}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color={palette.foreground} />
                </Pressable>
              </View>
            )}

            {/* Event details (if event type) */}
            {postType === 'event' && (
              <View style={[styles.eventSection, { borderColor: palette.border }]}>
                <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Event Details</ThemedText>

                <Pressable
                  style={[styles.eventField, { borderColor: palette.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={palette.muted} />
                  <ThemedText style={{ color: eventDate ? palette.text : palette.muted, flex: 1 }}>
                    {eventDate
                      ? eventDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })
                      : 'Select date'}
                  </ThemedText>
                </Pressable>

                {showDatePicker && (
                  <DateTimePicker
                    value={eventDate || new Date()}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(_event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setEventDate(selectedDate);
                      }
                    }}
                  />
                )}

                <View style={[styles.eventField, { borderColor: palette.border }]}>
                  <Ionicons name="location-outline" size={20} color={palette.muted} />
                  <TextInput
                    style={[styles.eventInput, { color: palette.text }]}
                    placeholder="Location"
                    placeholderTextColor={palette.muted}
                    value={eventLocation}
                    onChangeText={setEventLocation}
                  />
                </View>
              </View>
            )}

            {/* Character count */}
            {body.length > 0 && (
              <View style={styles.charCountContainer}>
                <ThemedText style={[styles.charCount, { color: body.length > 450 ? palette.warning : palette.muted }]}>
                  {body.length}/500
                </ThemedText>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer toolbar */}
        <View style={[styles.toolbar, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
          <Pressable style={styles.toolbarButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={22} color={palette.tint} />
          </Pressable>
          <Pressable
            style={styles.toolbarButton}
            onPress={() => handlePostTypeChange('event')}
          >
            <Ionicons name="calendar-outline" size={22} color={postType === 'event' ? palette.tint : palette.muted} />
          </Pressable>
          <Pressable
            style={styles.toolbarButton}
            onPress={() => handlePostTypeChange('announcement')}
          >
            <Ionicons name="megaphone-outline" size={22} color={postType === 'announcement' ? palette.tint : palette.muted} />
          </Pressable>
          <View style={styles.toolbarSpacer} />
        </View>
      </SafeAreaView>
    );
  }

  // Non-coach without a club: show "Join a Club" prompt
  if (!membership?.clubId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={palette.foreground} />
          </Pressable>
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
            <Pressable
              style={[styles.button, { backgroundColor: palette.tint }]}
              onPress={() => {
                router.back();
                setTimeout(() => router.push(Routes.CLUB_HUB), 100);
              }}
            >
              <Ionicons name="people" size={18} color={palette.onPrimary} />
              <ThemedText style={[styles.buttonText, { color: palette.onPrimary }]}>Go to Club Hub</ThemedText>
            </Pressable>
          </SurfaceCard>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading while redirecting to club post creation
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={palette.tint} />
        <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>Loading...</ThemedText>
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
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
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
    minHeight: 44,
  },
  buttonText: {
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
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonText: {
    ...Typography.bodySmallSemiBold,
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
  sectionLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
  },
  typeLabel: {
    ...Typography.smallSemiBold,
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
  imageSection: {
    position: 'relative',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: Radii.md,
  },
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
  eventSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  eventField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
    minHeight: 44,
  },
  eventInput: {
    flex: 1,
    ...Typography.body,
  },
  charCountContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    alignItems: 'flex-end',
  },
  charCount: {
    ...Typography.caption,
  },
  toolbar: {
    flexDirection: 'row',
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
  toolbarSpacer: {
    flex: 1,
  },
});
