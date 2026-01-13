import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/primitives/chip';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { clubFeedService } from '@/services/social-feed-service';
import { getClubById, getClubMembershipForUser, clubSquads } from '@/constants/mock-data';
import type { ClubPostType, ClubSquad } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();

  const club = clubId ? getClubById(clubId) : undefined;
  const membership = currentUser ? getClubMembershipForUser(currentUser.id) : undefined;
  const canPostAsClub = membership?.canPostAsClub || ['OWNER', 'ADMIN', 'HEAD_COACH'].includes(membership?.role || '');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<ClubPostType>('general');
  const [postAs, setPostAs] = useState<'self' | 'club'>('self');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventLocation, setEventLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const handlePost = () => {
    if (!body.trim() && !imageUri) return;
    if (!currentUser || !clubId) return;

    // Determine audience
    const audience = audienceType === 'squad' && selectedSquadId ? 'squad' : 'club';
    const finalAudienceLabel = audienceType === 'squad' && selectedSquad
      ? selectedSquad.name
      : 'Club-wide';

    clubFeedService.createPost({
      clubId,
      authorId: currentUser.id,
      authorName: postAs === 'club' && club ? club.name : (currentUser.fullName || currentUser.username || 'Unknown'),
      title: title.trim() || (postType === 'photo' ? 'Photo' : 'Update'),
      body: body.trim(),
      postType,
      postAs,
      audience,
      audienceLabel: finalAudienceLabel,
      squadId: audienceType === 'squad' ? selectedSquadId || undefined : undefined,
      imageUrl: imageUri || undefined,
      eventDate: eventDate?.toISOString(),
      eventLocation: eventLocation.trim() || undefined,
    });

    router.back();
  };

  const canPost = (body.trim().length > 0 || imageUri !== null) && clubId;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={palette.foreground} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold">New Post</ThemedText>
        <TouchableOpacity
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
          {/* Club indicator */}
          {club && (
            <View style={[styles.clubIndicator, { backgroundColor: `${palette.tint}10` }]}>
              <View style={[styles.clubBadge, { backgroundColor: palette.tint }]}>
                <ThemedText style={styles.clubBadgeText}>{club.name.slice(0, 2).toUpperCase()}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{club.name}</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Posting to {audienceLabel}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Post type selector */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post Type</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeSelector}>
              {POST_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeOption,
                    { borderColor: postType === type.key ? palette.tint : palette.border },
                    postType === type.key && { backgroundColor: `${palette.tint}10` }
                  ]}
                  onPress={() => setPostType(type.key)}
                >
                  <Ionicons
                    name={type.icon as any}
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
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Post as selector (for authorized users) */}
          {canPostAsClub && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post As</ThemedText>
              <View style={styles.postAsSelector}>
                <TouchableOpacity
                  style={[
                    styles.postAsOption,
                    { borderColor: postAs === 'self' ? palette.tint : palette.border },
                    postAs === 'self' && { backgroundColor: `${palette.tint}10` }
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
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.postAsOption,
                    { borderColor: postAs === 'club' ? palette.tint : palette.border },
                    postAs === 'club' && { backgroundColor: `${palette.tint}10` }
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
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Audience selector */}
          {availableSquads.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post To</ThemedText>
              <View style={styles.audienceSelector}>
                <TouchableOpacity
                  style={[
                    styles.audienceOption,
                    { borderColor: audienceType === 'club' ? palette.tint : palette.border },
                    audienceType === 'club' && { backgroundColor: `${palette.tint}10` }
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
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.audienceOption,
                    { borderColor: audienceType === 'squad' ? palette.tint : palette.border },
                    audienceType === 'squad' && { backgroundColor: `${palette.tint}10` }
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
                </TouchableOpacity>
              </View>

              {/* Squad selector when targeting a group */}
              {audienceType === 'squad' && (
                <View style={styles.squadSelector}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.squadList}>
                    {availableSquads.map((squad) => (
                      <TouchableOpacity
                        key={squad.id}
                        style={[
                          styles.squadOption,
                          {
                            borderColor: selectedSquadId === squad.id ? palette.success : palette.border,
                            backgroundColor: selectedSquadId === squad.id ? `${palette.success}10` : palette.surface,
                          }
                        ]}
                        onPress={() => setSelectedSquadId(squad.id)}
                      >
                        <View style={[styles.squadBadge, { backgroundColor: selectedSquadId === squad.id ? palette.success : palette.muted }]}>
                          <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                            {squad.name.slice(0, 2).toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={{ fontWeight: '600', fontSize: 13 }}>{squad.name}</ThemedText>
                          <ThemedText style={{ color: palette.muted, fontSize: 11 }}>{squad.memberCount} members</ThemedText>
                        </View>
                        {selectedSquadId === squad.id && (
                          <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                        )}
                      </TouchableOpacity>
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
              <TouchableOpacity
                style={[styles.removeImageButton, { backgroundColor: palette.background }]}
                onPress={removeImage}
              >
                <Ionicons name="close" size={16} color={palette.foreground} />
              </TouchableOpacity>
            </View>
          )}

          {/* Event details (if event type) */}
          {postType === 'event' && (
            <View style={[styles.eventSection, { borderColor: palette.border }]}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Event Details</ThemedText>

              <TouchableOpacity
                style={[styles.eventField, { borderColor: palette.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={palette.muted} />
                <ThemedText style={{ color: eventDate ? palette.text : palette.muted, flex: 1 }}>
                  {eventDate
                    ? eventDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })
                    : 'Select date'}
                </ThemedText>
              </TouchableOpacity>

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
              <ThemedText style={[styles.charCount, { color: body.length > 500 ? palette.error : palette.muted }]}>
                {body.length}/500
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer toolbar */}
      <View style={[styles.toolbar, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
        <TouchableOpacity style={styles.toolbarButton} onPress={pickImage}>
          <Ionicons name="image-outline" size={22} color={palette.tint} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setPostType('event')}
        >
          <Ionicons name="calendar-outline" size={22} color={postType === 'event' ? palette.tint : palette.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setPostType('announcement')}
        >
          <Ionicons name="megaphone-outline" size={22} color={postType === 'announcement' ? palette.tint : palette.muted} />
        </TouchableOpacity>
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
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '500',
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
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  bodyInput: {
    fontSize: 16,
    lineHeight: 24,
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
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
    fontSize: 15,
  },
  charCountContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
  },
  toolbarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
