import React, { useState, useCallback } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Shadows, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { clubFeedService } from '@/services/social-feed-service';
import { getClubById, getClubMembershipForUser, clubSquads } from '@/constants/mock-data';
import type { ClubPostType, FeedType } from '@/constants/types';

type PostTypeOption = {
  key: ClubPostType;
  label: string;
  icon: string;
  description: string;
};

const POST_TYPES: PostTypeOption[] = [
  { key: 'general', label: 'Update', icon: 'create-outline', description: 'Share a general update' },
  { key: 'announcement', label: 'Announcement', icon: 'megaphone-outline', description: 'Important club news' },
  { key: 'photo', label: 'Photo', icon: 'images-outline', description: 'Share photos with the club' },
  { key: 'event', label: 'Event', icon: 'calendar-outline', description: 'Announce an upcoming event' },
];

export default function CreateClubPostScreen() {
  const { colors: palette, scheme } = useTheme();
  const { currentUser } = useAuth();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();

  const club = clubId ? getClubById(clubId) : undefined;
  const membership = currentUser ? getClubMembershipForUser(currentUser.id) : undefined;
  const canPostAsClub = membership?.canPostAsClub || ['OWNER', 'ADMIN', 'HEAD_COACH'].includes(membership?.role || '');

  // Check if current user is a coach
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<ClubPostType>('general');
  const [postAs, setPostAs] = useState<'self' | 'club'>('self');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventLocation, setEventLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Feed type: where the post is published (personal / club / both)
  // Default to PERSONAL for coaches, CLUB for everyone else
  const [feedType, setFeedType] = useState<FeedType>(isCoach ? 'PERSONAL' : 'CLUB');

  // Audience targeting state
  const [audienceType, setAudienceType] = useState<'club' | 'squad'>('club');
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);

  // Get squads for this club
  const availableSquads = clubId ? clubSquads.filter(s => s.clubId === clubId) : [];
  const selectedSquad = availableSquads.find(s => s.id === selectedSquadId);
  const audienceLabel = audienceType === 'club'
    ? 'Club-wide'
    : selectedSquad?.name || 'Select a group';

  const pickImage = async () => {
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
  };

  const removeImage = () => {
    setImageUri(null);
  };

  const [isPosting, setIsPosting] = useState(false);

  const handlePost = useCallback(async () => {
    if (!body.trim() && !imageUri) return;
    if (!currentUser || !clubId) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsPosting(true);

    try {
      // Use createCoachPost for coach posts with PERSONAL or BOTH feedType
      if (isCoach && (feedType === 'PERSONAL' || feedType === 'BOTH')) {
        const result = await clubFeedService.createCoachPost({
          coachId: currentUser.id,
          coachName: currentUser.fullName || currentUser.username || 'Unknown',
          title: title.trim() || (postType === 'photo' ? 'Photo' : 'Update'),
          body: body.trim(),
          postType,
          feedType,
          imageUrl: imageUri || undefined,
          eventDate: eventDate?.toISOString(),
          eventLocation: eventLocation.trim() || undefined,
          clubId,
          clubName: club?.name,
        });

        if (result.success && Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // Determine audience
        const audience = audienceType === 'squad' && selectedSquadId ? 'squad' : 'club';
        const finalAudienceLabel = audienceType === 'squad' && selectedSquad
          ? selectedSquad.name
          : 'Club-wide';

        await clubFeedService.createPost({
          clubId,
          authorId: currentUser.id,
          authorName: postAs === 'club' && club ? club.name : (currentUser.fullName || currentUser.username || 'Unknown'),
          title: title.trim() || (postType === 'photo' ? 'Photo' : 'Update'),
          body: body.trim(),
          postType,
          postAs,
          feedType,
          audience,
          audienceLabel: finalAudienceLabel,
          squadId: audienceType === 'squad' ? selectedSquadId || undefined : undefined,
          imageUrl: imageUri || undefined,
          eventDate: eventDate?.toISOString(),
          eventLocation: eventLocation.trim() || undefined,
        });

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }

      router.back();
    } finally {
      setIsPosting(false);
    }
  }, [body, imageUri, currentUser, clubId, isCoach, feedType, title, postType, eventDate, eventLocation, club, audienceType, selectedSquadId, selectedSquad, postAs]);

  const canPost = (body.trim().length > 0 || imageUri !== null) && clubId && !isPosting;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={palette.foreground} />
        </Pressable>
        <ThemedText type="defaultSemiBold">New Post</ThemedText>
        <Pressable
          onPress={handlePost}
          disabled={!canPost}
          style={[
            styles.postButton,
            {
              backgroundColor: canPost ? palette.tint : palette.border,
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
          {/* Club indicator */}
          {club && (
            <View style={[styles.clubIndicator, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
              <View style={[styles.clubBadge, { backgroundColor: palette.tint }]}>
                <ThemedText style={[styles.clubBadgeText, { color: palette.onPrimary }]}>{club.name.slice(0, 2).toUpperCase()}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{club.name}</ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                  Posting to {feedType === 'PERSONAL' ? 'Personal Feed' : feedType === 'BOTH' ? `Personal + ${club.name}` : audienceLabel}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Feed type selector (coaches only) */}
          {isCoach && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post To</ThemedText>
              <View style={styles.feedTypeSelector}>
                <Pressable
                  style={[
                    styles.feedTypeOption,
                    { borderColor: feedType === 'PERSONAL' ? palette.success : palette.border },
                    feedType === 'PERSONAL' ? { backgroundColor: withAlpha(palette.success, 0.06) } : undefined,
                  ]}
                  onPress={() => setFeedType('PERSONAL')}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={18}
                    color={feedType === 'PERSONAL' ? palette.success : palette.muted}
                  />
                  <ThemedText style={{ color: feedType === 'PERSONAL' ? palette.success : palette.text, ...Typography.smallSemiBold }}>
                    My Personal Feed
                  </ThemedText>
                </Pressable>
                {club && (
                  <Pressable
                    style={[
                      styles.feedTypeOption,
                      { borderColor: feedType === 'CLUB' ? palette.tint : palette.border },
                      feedType === 'CLUB' ? { backgroundColor: withAlpha(palette.tint, 0.06) } : undefined,
                    ]}
                    onPress={() => setFeedType('CLUB')}
                  >
                    <Ionicons
                      name="shield-outline"
                      size={18}
                      color={feedType === 'CLUB' ? palette.tint : palette.muted}
                    />
                    <ThemedText
                      style={{ color: feedType === 'CLUB' ? palette.tint : palette.text, ...Typography.smallSemiBold }}
                      numberOfLines={1}
                    >
                      {club.name}
                    </ThemedText>
                  </Pressable>
                )}
                {club && (
                  <Pressable
                    style={[
                      styles.feedTypeOption,
                      { borderColor: feedType === 'BOTH' ? palette.warning : palette.border },
                      feedType === 'BOTH' ? { backgroundColor: withAlpha(palette.warning, 0.06) } : undefined,
                    ]}
                    onPress={() => setFeedType('BOTH')}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={feedType === 'BOTH' ? palette.warning : palette.muted}
                    />
                    <ThemedText style={{ color: feedType === 'BOTH' ? palette.warning : palette.text, ...Typography.smallSemiBold }}>
                      Both
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Post type selector */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post Type</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeSelector}>
              {POST_TYPES.map((type) => (
                <Pressable
                  key={type.key}
                  style={[
                    styles.typeOption,
                    { borderColor: postType === type.key ? palette.tint : palette.border },
                    postType === type.key ? { backgroundColor: withAlpha(palette.tint, 0.06) } : undefined
                  ]}
                  onPress={() => setPostType(type.key)}
                >
                  <Ionicons
                    name={type.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={postType === type.key ? palette.tint : palette.muted}
                  />
                  <ThemedText
                    style={[
                      styles.typeLabel,
                      { color: postType === type.key ? palette.tint : palette.text }
                    ]}
                  >
                    {type.label}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Post as selector (for authorized users) */}
          {canPostAsClub && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post As</ThemedText>
              <View style={styles.postAsSelector}>
                <Pressable
                  style={[
                    styles.postAsOption,
                    { borderColor: postAs === 'self' ? palette.tint : palette.border },
                    postAs === 'self' ? { backgroundColor: withAlpha(palette.tint, 0.06) } : undefined
                  ]}
                  onPress={() => setPostAs('self')}
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={postAs === 'self' ? palette.tint : palette.muted}
                  />
                  <ThemedText style={{ color: postAs === 'self' ? palette.tint : palette.text }}>
                    Yourself
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.postAsOption,
                    { borderColor: postAs === 'club' ? palette.tint : palette.border },
                    postAs === 'club' ? { backgroundColor: withAlpha(palette.tint, 0.06) } : undefined
                  ]}
                  onPress={() => setPostAs('club')}
                >
                  <Ionicons
                    name="shield-outline"
                    size={18}
                    color={postAs === 'club' ? palette.tint : palette.muted}
                  />
                  <ThemedText style={{ color: postAs === 'club' ? palette.tint : palette.text }}>
                    Club
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {/* Audience selector */}
          {availableSquads.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post To</ThemedText>
              <View style={styles.audienceSelector}>
                <Pressable
                  style={[
                    styles.audienceOption,
                    { borderColor: audienceType === 'club' ? palette.tint : palette.border },
                    audienceType === 'club' ? { backgroundColor: withAlpha(palette.tint, 0.06) } : undefined
                  ]}
                  onPress={() => {
                    setAudienceType('club');
                    setSelectedSquadId(null);
                  }}
                >
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={audienceType === 'club' ? palette.tint : palette.muted}
                  />
                  <ThemedText style={{ color: audienceType === 'club' ? palette.tint : palette.text }}>
                    All Members
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.audienceOption,
                    { borderColor: audienceType === 'squad' ? palette.tint : palette.border },
                    audienceType === 'squad' ? { backgroundColor: withAlpha(palette.tint, 0.06) } : undefined
                  ]}
                  onPress={() => setAudienceType('squad')}
                >
                  <Ionicons
                    name="grid-outline"
                    size={18}
                    color={audienceType === 'squad' ? palette.tint : palette.muted}
                  />
                  <ThemedText style={{ color: audienceType === 'squad' ? palette.tint : palette.text }}>
                    Specific Group
                  </ThemedText>
                </Pressable>
              </View>

              {/* Squad selector when targeting a group */}
              {audienceType === 'squad' && (
                <View style={styles.squadSelector}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.squadList}>
                    {availableSquads.map((squad) => (
                      <Pressable
                        key={squad.id}
                        style={[
                          styles.squadOption,
                          {
                            borderColor: selectedSquadId === squad.id ? palette.success : palette.border,
                            backgroundColor: selectedSquadId === squad.id ? withAlpha(palette.success, 0.06) : palette.surface,
                          }
                        ]}
                        onPress={() => setSelectedSquadId(squad.id)}
                      >
                        <View style={[styles.squadBadge, { backgroundColor: selectedSquadId === squad.id ? palette.success : palette.muted }]}>
                          <ThemedText style={{ color: palette.onPrimary, ...Typography.micro }}>
                            {squad.name.slice(0, 2).toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={{ ...Typography.smallSemiBold }}>{squad.name}</ThemedText>
                          <ThemedText style={{ color: palette.muted, ...Typography.caption }}>{squad.memberCount} members</ThemedText>
                        </View>
                        {selectedSquadId === squad.id && (
                          <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

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
              placeholder="What's happening at the club?"
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
                  onChange={(event, selectedDate) => {
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
              <ThemedText style={[styles.charCount, { color: body.length > 450 ? palette.error : palette.muted }]}>
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
          onPress={() => setPostType('event')}
        >
          <Ionicons name="calendar-outline" size={22} color={postType === 'event' ? palette.tint : palette.muted} />
        </Pressable>
        <Pressable
          style={styles.toolbarButton}
          onPress={() => setPostType('announcement')}
        >
          <Ionicons name="megaphone-outline" size={22} color={postType === 'announcement' ? palette.tint : palette.muted} />
        </Pressable>
        <View style={styles.toolbarSpacer} />
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
  clubIndicator: {
    flexDirection: 'row',
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
  clubBadgeText: {
    ...Typography.bodySmallSemiBold,
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
  },
  typeLabel: {
    ...Typography.smallSemiBold,
  },
  feedTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  feedTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  postAsSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  postAsOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
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
  // Audience selector styles
  audienceSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  audienceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  squadSelector: {
    marginTop: Spacing.sm,
  },
  squadList: {
    gap: Spacing.sm,
  },
  squadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    minWidth: 180,
  },
  squadBadge: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
