import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { Colors, Radii, Spacing, Components } from '@/constants/theme';
import { coachProfiles } from '@/constants/mock-data';
import { CoachExperience, CoachLanguage, FootballObjective } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

const footballObjectives: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];

const languageOptions = ['English', 'Spanish', 'French', 'Portuguese', 'German', 'Arabic', 'Italian'];
const languageProficiencyOptions: CoachLanguage['proficiency'][] = [
  'Native',
  'Fluent',
  'Conversational',
  'Basic',
];

const createBlankExperience = (): CoachExperience => ({
  id: `exp-${Date.now()}`,
  title: '',
  organization: '',
  startDate: '',
  endDate: '',
  description: '',
  current: false,
});

const createBlankLanguage = (): CoachLanguage => ({
  id: `lang-${Date.now()}`,
  name: '',
  proficiency: 'Conversational',
});

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
  const [experiences, setExperiences] = useState<CoachExperience[]>(coach.experiences || []);
  const [experienceDraft, setExperienceDraft] = useState<CoachExperience>(createBlankExperience());
  const [isExperienceModalVisible, setExperienceModalVisible] = useState(false);
  const [languages, setLanguages] = useState<CoachLanguage[]>(coach.languages || []);
  const [languageDraft, setLanguageDraft] = useState<CoachLanguage>(createBlankLanguage());
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);

  const toggleFocus = (focus: FootballObjective) => {
    if (selectedFocuses.includes(focus)) {
      setSelectedFocuses(selectedFocuses.filter((f) => f !== focus));
    } else {
      setSelectedFocuses([...selectedFocuses, focus]);
    }
  };

  const openExperienceModal = (experience?: CoachExperience) => {
    setExperienceDraft(experience ? { ...experience } : createBlankExperience());
    setExperienceModalVisible(true);
  };

  const saveExperience = () => {
    if (!experienceDraft.title || !experienceDraft.organization || !experienceDraft.startDate) {
      alert('Please add a role title, organisation, and start date.');
      return;
    }

    setExperiences((prev) => {
      const exists = prev.some((exp) => exp.id === experienceDraft.id);
      if (exists) {
        return prev.map((exp) => (exp.id === experienceDraft.id ? experienceDraft : exp));
      }
      return [experienceDraft, ...prev];
    });
    setExperienceModalVisible(false);
  };

  const removeExperience = (id: string) => {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
  };

  const openLanguageModal = (language?: CoachLanguage) => {
    setLanguageDraft(language ? { ...language } : createBlankLanguage());
    setLanguageModalVisible(true);
  };

  const saveLanguage = () => {
    if (!languageDraft.name) {
      alert('Add a language name to continue.');
      return;
    }

    setLanguages((prev) => {
      const exists = prev.some((lang) => lang.id === languageDraft.id);
      if (exists) {
        return prev.map((lang) => (lang.id === languageDraft.id ? languageDraft : lang));
      }
      return [...prev, languageDraft];
    });
    setLanguageModalVisible(false);
  };

  const removeLanguage = (id: string) => {
    setLanguages((prev) => prev.filter((lang) => lang.id !== id));
  };

  const handleSave = () => {
    const payload = {
      ...coach,
      fullName,
      bio,
      email,
      phone,
      website,
      priceRange: {
        ...coach.priceRange,
        minUsd: Number(priceMin),
        maxUsd: Number(priceMax),
      },
      footballFocuses: selectedFocuses,
      experiences,
      languages,
    };

    console.log('Profile payload ready for API sync', payload);
    alert('Profile updated');
    router.back();
  };

  const pickImage = (type: 'profile' | 'cover') => {
    // In production, use expo-image-picker
    alert(`Select ${type} photo`);
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
              <Pressable onPress={() => openExperienceModal()} style={styles.inlineAction}>
                <Ionicons name="add-circle" size={22} color={palette.tint} />
                <ThemedText style={[styles.inlineActionText, { color: palette.tint }]}>Add</ThemedText>
              </Pressable>
            </View>
            <ThemedText style={styles.subtitle}>
              Curate the highlights parents see first: current teams, academies, and playing history.
            </ThemedText>

            {experiences.length > 0 ? (
              <View style={styles.timeline}>
                {experiences.map((exp) => {
                  const start = exp.startDate
                    ? new Date(exp.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                    : 'Start date';
                  const end = exp.current
                    ? 'Present'
                    : exp.endDate
                      ? new Date(exp.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                      : 'End date';

                  return (
                    <View key={exp.id} style={[styles.experienceCard, { borderColor: palette.border }]}>
                      <View style={styles.experienceHeader}>
                        <View
                          style={[
                            styles.experiencePill,
                            {
                              backgroundColor: exp.current ? `${palette.success}15` : `${palette.tint}15`,
                            },
                          ]}>
                          <Ionicons
                            name={exp.current ? 'radio-button-on' : 'briefcase'}
                            size={14}
                            color={exp.current ? palette.success : palette.tint}
                          />
                          <ThemedText
                            style={styles.experiencePillText}
                            lightColor={exp.current ? palette.success : palette.tint}
                            darkColor={exp.current ? palette.success : palette.tint}>
                            {exp.current ? 'Current' : 'Past'}
                          </ThemedText>
                        </View>

                        <View style={styles.experienceActions}>
                          <Pressable
                            onPress={() => openExperienceModal(exp)}
                            style={[styles.iconButton, { borderColor: palette.border }]}>
                            <Ionicons name="pencil" size={16} color={palette.muted} />
                          </Pressable>
                          <Pressable
                            onPress={() => removeExperience(exp.id)}
                            style={[styles.iconButton, { borderColor: palette.border }]}>
                            <Ionicons name="trash" size={16} color={palette.warning} />
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.experienceBody}>
                        <ThemedText type="subtitle">{exp.title}</ThemedText>
                        <ThemedText style={styles.experienceOrg}>{exp.organization}</ThemedText>
                        <ThemedText style={styles.experienceDate}>
                          {start} — {end}
                        </ThemedText>
                        {exp.description && (
                          <ThemedText style={styles.experienceDescription}>{exp.description}</ThemedText>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <SurfaceCard style={[styles.emptyCard, { borderColor: palette.border }]}>
                <Ionicons name="sparkles" size={20} color={palette.muted} />
                <ThemedText style={styles.emptyText}>
                  Add academy roles, coaching gigs, or your playing career. Parents love to see the timeline.
                </ThemedText>
              </SurfaceCard>
            )}
          </SurfaceCard>

          {/* Languages Section */}
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Languages</ThemedText>
              <Pressable onPress={() => openLanguageModal()} style={styles.inlineAction}>
                <Ionicons name="add-circle" size={22} color={palette.tint} />
                <ThemedText style={[styles.inlineActionText, { color: palette.tint }]}>Add</ThemedText>
              </Pressable>
            </View>

            <ThemedText style={styles.subtitle}>
              Set expectations for onboarding calls and session briefings with your language strengths.
            </ThemedText>

            {languages.length > 0 ? (
              <View style={styles.languageList}>
                {languages.map((lang) => (
                  <View
                    key={lang.id}
                    style={[styles.languageRow, { borderColor: palette.border, backgroundColor: palette.card }]}>
                    <View style={[styles.languageDot, { backgroundColor: palette.tint }]} />
                    <View style={styles.languageCopy}>
                      <ThemedText style={styles.languageName}>{lang.name}</ThemedText>
                      <ThemedText style={styles.languageProficiency}>{lang.proficiency}</ThemedText>
                    </View>

                    <View style={styles.languageActions}>
                      <Pressable
                        onPress={() => openLanguageModal(lang)}
                        style={[styles.iconButton, { borderColor: palette.border }]}>
                        <Ionicons name="pencil" size={16} color={palette.muted} />
                      </Pressable>
                      <Pressable
                        onPress={() => removeLanguage(lang.id)}
                        style={[styles.iconButton, { borderColor: palette.border }]}>
                        <Ionicons name="close" size={16} color={palette.warning} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <SurfaceCard style={[styles.emptyCard, { borderColor: palette.border }]}>
                <Ionicons name="chatbubbles-outline" size={20} color={palette.muted} />
                <ThemedText style={styles.emptyText}>
                  Add the languages you coach in so parents feel confident you can welcome their family.
                </ThemedText>
              </SurfaceCard>
            )}

            <View style={[styles.quickAddRow, { borderColor: palette.border }]}>
              <ThemedText style={styles.helper}>Quick add</ThemedText>
              <View style={styles.quickAddChips}>
                {languageOptions.map((option) => {
                  const isAdded = languages.some(
                    (lang) => lang.name.toLowerCase() === option.toLowerCase(),
                  );
                  return (
                    <Pressable
                      key={option}
                      disabled={isAdded}
                      onPress={() =>
                        setLanguages((prev) => [
                          ...prev,
                          { id: `lang-${Date.now()}`, name: option, proficiency: 'Fluent' },
                        ])
                      }
                      style={[
                        styles.focusChip,
                        {
                          opacity: isAdded ? 0.35 : 1,
                          borderColor: isAdded ? palette.border : palette.tint,
                          backgroundColor: isAdded ? palette.card : `${palette.tint}15`,
                        },
                      ]}>
                      <ThemedText
                        style={styles.focusText}
                        lightColor={isAdded ? undefined : palette.tint}
                        darkColor={isAdded ? undefined : palette.tint}>
                        {option}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </SurfaceCard>

          {/* Certifications Section */}
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Certifications</ThemedText>
              <Pressable onPress={() => alert('Add certification')}>
                <Ionicons name="add-circle" size={24} color={palette.tint} />
              </Pressable>
            </View>
            <ThemedText style={styles.comingSoon}>Add your coaching licenses and certifications</ThemedText>
          </SurfaceCard>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal
          visible={isExperienceModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setExperienceModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <SurfaceCard style={[styles.modalCard, { backgroundColor: palette.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Experience</ThemedText>
                <Pressable onPress={() => setExperienceModalVisible(false)}>
                  <Ionicons name="close" size={22} color={palette.foreground} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Role / Title</ThemedText>
                  <TextInput
                    value={experienceDraft.title}
                    onChangeText={(text) => setExperienceDraft({ ...experienceDraft, title: text })}
                    placeholder="Head Coach, Goalkeeping Coach, Academy Player..."
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Organisation / Club</ThemedText>
                  <TextInput
                    value={experienceDraft.organization}
                    onChangeText={(text) => setExperienceDraft({ ...experienceDraft, organization: text })}
                    placeholder="Club or academy name"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
                  />
                </View>

                <View style={styles.inlineFields}>
                  <View style={[styles.fieldGroup, styles.inlineField]}>
                    <ThemedText style={styles.label}>Start Date</ThemedText>
                    <TextInput
                      value={experienceDraft.startDate}
                      onChangeText={(text) => setExperienceDraft({ ...experienceDraft, startDate: text })}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={palette.muted}
                      style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
                    />
                  </View>

                  <View style={[styles.fieldGroup, styles.inlineField]}>
                    <View style={styles.sectionHeader}>
                      <ThemedText style={styles.label}>End Date</ThemedText>
                      <Pressable
                        onPress={() =>
                          setExperienceDraft((prev) => ({
                            ...prev,
                            current: !prev.current,
                            endDate: prev.current ? prev.endDate : '',
                          }))
                        }
                        style={styles.inlineAction}>
                        <Ionicons
                          name={experienceDraft.current ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={experienceDraft.current ? palette.success : palette.muted}
                        />
                        <ThemedText style={styles.helper}>I currently do this</ThemedText>
                      </Pressable>
                    </View>
                    <TextInput
                      value={experienceDraft.endDate || ''}
                      onChangeText={(text) => setExperienceDraft({ ...experienceDraft, endDate: text })}
                      placeholder={experienceDraft.current ? 'Present' : 'YYYY-MM-DD'}
                      editable={!experienceDraft.current}
                      placeholderTextColor={palette.muted}
                      style={[
                        styles.input,
                        {
                          borderColor: palette.border,
                          backgroundColor: experienceDraft.current ? palette.border : palette.card,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Description</ThemedText>
                  <TextInput
                    value={experienceDraft.description}
                    onChangeText={(text) => setExperienceDraft({ ...experienceDraft, description: text })}
                    placeholder="Highlight wins, age groups, or your philosophy."
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholderTextColor={palette.muted}
                    style={[
                      styles.input,
                      styles.textArea,
                      { borderColor: palette.border, backgroundColor: palette.card },
                    ]}
                  />
                </View>

                <Pressable
                  onPress={saveExperience}
                  style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.primaryButtonText} lightColor="#FFFFFF" darkColor="#000000">
                    Save experience
                  </ThemedText>
                </Pressable>
              </ScrollView>
            </SurfaceCard>
          </View>
        </Modal>

        <Modal
          visible={isLanguageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLanguageModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <SurfaceCard style={[styles.modalCard, { backgroundColor: palette.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Language</ThemedText>
                <Pressable onPress={() => setLanguageModalVisible(false)}>
                  <Ionicons name="close" size={22} color={palette.foreground} />
                </Pressable>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Language</ThemedText>
                  <TextInput
                    value={languageDraft.name}
                    onChangeText={(text) => setLanguageDraft({ ...languageDraft, name: text })}
                    placeholder="e.g., English"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Proficiency</ThemedText>
                  <View style={styles.pillRow}>
                    {languageProficiencyOptions.map((level) => {
                      const isActive = languageDraft.proficiency === level;
                      return (
                        <Pressable
                          key={level}
                          onPress={() => setLanguageDraft({ ...languageDraft, proficiency: level })}
                          style={[
                            styles.focusChip,
                            {
                              borderColor: isActive ? palette.tint : palette.border,
                              backgroundColor: isActive ? `${palette.tint}15` : palette.card,
                            },
                          ]}>
                          <ThemedText
                            style={styles.focusText}
                            lightColor={isActive ? palette.tint : undefined}
                            darkColor={isActive ? palette.tint : undefined}>
                            {level}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Pressable
                  onPress={saveLanguage}
                  style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.primaryButtonText} lightColor="#FFFFFF" darkColor="#000000">
                    Save language
                  </ThemedText>
                </Pressable>
              </View>
            </SurfaceCard>
          </View>
        </Modal>

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
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
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
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  inlineActionText: {
    fontWeight: '700',
  },
  timeline: {
    gap: Spacing.sm,
  },
  experienceCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  experiencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  experiencePillText: {
    fontWeight: '700',
    fontSize: 12,
  },
  experienceActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  experienceBody: {
    gap: 4,
  },
  experienceOrg: {
    fontWeight: '600',
    opacity: 0.8,
  },
  experienceDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  experienceDescription: {
    lineHeight: 18,
    opacity: 0.8,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  languageList: {
    gap: Spacing.sm,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
  },
  languageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  languageCopy: {
    flex: 1,
    gap: 2,
  },
  languageName: {
    fontWeight: '700',
  },
  languageProficiency: {
    fontSize: 12,
    opacity: 0.7,
  },
  languageActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  quickAddRow: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  quickAddChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  inlineField: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalContent: {
    gap: Spacing.md,
  },
  primaryButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  comingSoon: {
    opacity: 0.5,
    fontStyle: 'italic',
  },
});
