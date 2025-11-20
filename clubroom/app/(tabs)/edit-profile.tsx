import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { coachProfiles } from '@/constants/mock-data';
import { FootballObjective } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

const footballObjectives: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];

export default function EditProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // For demo, use first coach - in production, fetch by currentUser.id
  const coach = coachProfiles[0];

  const [fullName, setFullName] = useState(coach.fullName);
  const [bio, setBio] = useState(coach.bio || '');
  const [email, setEmail] = useState(coach.email || '');
  const [phone, setPhone] = useState(coach.phone || '');
  const [website, setWebsite] = useState(coach.website || '');
  const [priceMin, setPriceMin] = useState(coach.priceRange.minUsd.toString());
  const [priceMax, setPriceMax] = useState(coach.priceRange.maxUsd.toString());
  const [selectedFocuses, setSelectedFocuses] = useState<FootballObjective[]>(coach.footballFocuses);

  const toggleFocus = (focus: FootballObjective) => {
    if (selectedFocuses.includes(focus)) {
      setSelectedFocuses(selectedFocuses.filter((f) => f !== focus));
    } else {
      setSelectedFocuses([...selectedFocuses, focus]);
    }
  };

  const handleSave = () => {
    // In production, save to backend
    alert('Profile updated successfully!');
    router.back();
  };

  const pickImage = (type: 'profile' | 'cover') => {
    // In production, use expo-image-picker
    alert(`Pick ${type} photo - coming soon!`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={palette.foreground} />
        </Pressable>
        <ThemedText type="subtitle">Edit Profile</ThemedText>
        <Pressable onPress={handleSave}>
          <ThemedText style={[styles.saveButton, { color: palette.tint }]}>Save</ThemedText>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Cover Photo */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">Cover Photo</ThemedText>
            <Pressable onPress={() => pickImage('cover')} style={styles.coverPhotoContainer}>
              {coach.coverPhotoUrl ? (
                <Image source={{ uri: coach.coverPhotoUrl }} style={styles.coverPhoto} />
              ) : (
                <View style={[styles.coverPhoto, { backgroundColor: palette.border }]} />
              )}
              <View style={[styles.photoOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <Ionicons name="camera" size={32} color="#FFFFFF" />
                <ThemedText style={styles.overlayText} lightColor="#FFFFFF">
                  Change Cover
                </ThemedText>
              </View>
            </Pressable>
          </SurfaceCard>

          {/* Profile Photo */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">Profile Photo</ThemedText>
            <Pressable onPress={() => pickImage('profile')} style={styles.avatarContainer}>
              <Image source={{ uri: coach.profilePhotoUrl }} style={styles.avatar} />
              <View style={[styles.avatarOverlay, { backgroundColor: palette.tint }]}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
            </Pressable>
          </SurfaceCard>

          {/* Basic Info */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">Basic Information</ThemedText>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Bio</ThemedText>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell parents about your coaching philosophy..."
                placeholderTextColor={palette.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.textArea,
                  { borderColor: palette.border, backgroundColor: palette.card },
                ]}
              />
              <ThemedText style={styles.helper}>{bio.length} / 500 characters</ThemedText>
            </View>
          </SurfaceCard>

          {/* Contact */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">Contact Information</ThemedText>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="coach@email.com"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Phone</ThemedText>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+1 (555) 123-4567"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Website</ThemedText>
              <TextInput
                value={website}
                onChangeText={setWebsite}
                keyboardType="url"
                autoCapitalize="none"
                placeholder="https://yourwebsite.com"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
              />
            </View>
          </SurfaceCard>

          {/* Pricing */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">Session Pricing</ThemedText>

            <View style={styles.priceRow}>
              <View style={[styles.fieldGroup, styles.priceField]}>
                <ThemedText style={styles.label}>Min Price (USD)</ThemedText>
                <TextInput
                  value={priceMin}
                  onChangeText={setPriceMin}
                  keyboardType="number-pad"
                  placeholder="90"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
                />
              </View>

              <View style={[styles.fieldGroup, styles.priceField]}>
                <ThemedText style={styles.label}>Max Price (USD)</ThemedText>
                <TextInput
                  value={priceMax}
                  onChangeText={setPriceMax}
                  keyboardType="number-pad"
                  placeholder="140"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
                />
              </View>
            </View>
          </SurfaceCard>

          {/* Coaching Specialties */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">Coaching Specialties</ThemedText>
            <ThemedText style={styles.subtitle}>Select the areas you specialize in</ThemedText>

            <View style={styles.focusGrid}>
              {footballObjectives.map((focus) => {
                const isSelected = selectedFocuses.includes(focus);
                return (
                  <Pressable
                    key={focus}
                    onPress={() => toggleFocus(focus)}
                    style={[
                      styles.focusChip,
                      {
                        backgroundColor: isSelected ? palette.tint : palette.card,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}>
                    <ThemedText
                      style={styles.focusText}
                      lightColor={isSelected ? '#FFFFFF' : undefined}
                      darkColor={isSelected ? '#000000' : undefined}>
                      {focus}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </SurfaceCard>

          {/* Experience Section */}
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Experience</ThemedText>
              <Pressable onPress={() => alert('Add experience - coming soon!')}>
                <Ionicons name="add-circle" size={24} color={palette.tint} />
              </Pressable>
            </View>
            <ThemedText style={styles.comingSoon}>
              Add your coaching and playing experience
            </ThemedText>
          </SurfaceCard>

          {/* Certifications Section */}
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Certifications</ThemedText>
              <Pressable onPress={() => alert('Add certification - coming soon!')}>
                <Ionicons name="add-circle" size={24} color={palette.tint} />
              </Pressable>
            </View>
            <ThemedText style={styles.comingSoon}>Add your coaching licenses and certifications</ThemedText>
          </SurfaceCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  saveButton: {
    fontWeight: '700',
    fontSize: 16,
  },
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    opacity: 0.6,
    fontSize: 14,
  },
  coverPhotoContainer: {
    position: 'relative',
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  coverPhoto: {
    width: '100%',
    height: 150,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  overlayText: {
    fontWeight: '600',
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  helper: {
    fontSize: 12,
    opacity: 0.6,
  },
  priceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  priceField: {
    flex: 1,
  },
  focusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  focusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  focusText: {
    fontWeight: '600',
  },
  comingSoon: {
    opacity: 0.5,
    fontStyle: 'italic',
  },
});
