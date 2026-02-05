import { useState } from 'react';
import {
  Alert,
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
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { SocialLinksEditor } from '@/components/profile/social-links-editor';
import { Colors, Radii, Spacing, Components } from '@/constants/theme';
import { FOOTBALL_OBJECTIVES } from '@/constants/booking-types';
import { coachProfiles, mockUserProfile } from '@/constants/mock-data';
import { CoachCertification, CoachExperience, CoachLanguage, FootballObjective, SocialLinks } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('EditProfile');

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

const createBlankCertification = (): CoachCertification => ({
  id: `cert-${Date.now()}`,
  name: '',
  issuer: '',
  issueDate: '',
  expiryDate: '',
  credentialUrl: '',
});

export default function EditProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser: authUser } = useAuth();

  // Use the authenticated user from auth context
  // Fall back to mock data for development if not logged in
  const currentUser = authUser || mockUserProfile;
  // Check if user is a coach based on role/type property
  const userIsCoach = currentUser?.role === 'COACH' || currentUser?.role === 'Coach';

  // Get initial data based on role
  const coach = userIsCoach ? coachProfiles[0] : null;
  const user = !userIsCoach ? mockUserProfile : null;

  // Common fields for all users
  const [fullName, setFullName] = useState(userIsCoach ? coach!.fullName : user!.fullName);
  const [bio, setBio] = useState(userIsCoach ? (coach!.bio || '') : (user!.bio || ''));
  const [email, setEmail] = useState(userIsCoach ? (coach!.email || '') : user!.email);
  const [phone, setPhone] = useState(userIsCoach ? (coach!.phone || '') : (user!.phone || ''));

  // Parent-specific fields
  const [children, setChildren] = useState(user?.children || []);

  // Coach-specific fields
  const [website, setWebsite] = useState(coach?.website || '');
  const [priceMin, setPriceMin] = useState(coach?.priceRange.minUsd.toString() || '50');
  const [priceMax, setPriceMax] = useState(coach?.priceRange.maxUsd.toString() || '80');
  const [selectedFocuses, setSelectedFocuses] = useState<FootballObjective[]>(coach?.footballFocuses || []);
  const [experiences, setExperiences] = useState<CoachExperience[]>(coach?.experiences || []);
  const [experienceDraft, setExperienceDraft] = useState<CoachExperience>(createBlankExperience());
  const [isExperienceModalVisible, setExperienceModalVisible] = useState(false);
  const [languages, setLanguages] = useState<CoachLanguage[]>(coach?.languages || []);
  const [languageDraft, setLanguageDraft] = useState<CoachLanguage>(createBlankLanguage());
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [certifications, setCertifications] = useState<CoachCertification[]>(coach?.certifications || []);
  const [certificationDraft, setCertificationDraft] = useState<CoachCertification>(createBlankCertification());
  const [isCertificationModalVisible, setCertificationModalVisible] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(coach?.socialLinks || {});

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
      Alert.alert('Missing Information', 'Please add a role title, organisation, and start date.');
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
      Alert.alert('Missing Information', 'Please add a language name to continue.');
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

  const openCertificationModal = (certification?: CoachCertification) => {
    setCertificationDraft(certification ? { ...certification } : createBlankCertification());
    setCertificationModalVisible(true);
  };

  const saveCertification = () => {
    if (!certificationDraft.name || !certificationDraft.issuer || !certificationDraft.issueDate) {
      Alert.alert('Missing Information', 'Please add a certification name, issuer, and issue date.');
      return;
    }

    setCertifications((prev) => {
      const exists = prev.some((cert) => cert.id === certificationDraft.id);
      if (exists) {
        return prev.map((cert) => (cert.id === certificationDraft.id ? certificationDraft : cert));
      }
      return [certificationDraft, ...prev];
    });
    setCertificationModalVisible(false);
  };

  const removeCertification = (id: string) => {
    setCertifications((prev) => prev.filter((cert) => cert.id !== id));
  };

  const addChild = () => {
    const newChild = { name: '', age: 0 };
    setChildren([...children, newChild]);
  };

  const updateChild = (index: number, field: 'name' | 'age', value: string | number) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (userIsCoach) {
      const payload = {
        ...coach!,
        fullName,
        bio,
        email,
        phone,
        website,
        priceRange: {
          ...coach!.priceRange,
          minUsd: Number(priceMin),
          maxUsd: Number(priceMax),
        },
        footballFocuses: selectedFocuses,
        experiences,
        languages,
        certifications,
        socialLinks,
      };

      logger.info('Coach profile payload ready for API sync', payload);
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      const payload = {
        ...user!,
        fullName,
        bio,
        email,
        phone,
        children,
      };

      logger.info('User profile payload ready for API sync', payload);
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const pickImage = (type: 'profile' | 'cover') => {
    // In production, use expo-image-picker
    Alert.alert(
      `Change ${type === 'profile' ? 'Profile' : 'Cover'} Photo`,
      'Choose how you want to select a photo',
      [
        { text: 'Take Photo', onPress: () => logger.info(`Camera selected for ${type}`) },
        { text: 'Choose from Library', onPress: () => logger.info(`Library selected for ${type}`) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title="Edit Profile"
        showBack
        action="Save"
        onActionPress={handleSave}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Cover Photo - Coach only */}
          {userIsCoach && (
            <SurfaceCard style={styles.section}>
              <ThemedText type="subtitle">Cover Photo</ThemedText>
              <Pressable onPress={() => pickImage('cover')} style={styles.coverPhotoContainer}>
                {coach!.coverPhotoUrl ? (
                  <Image source={{ uri: coach!.coverPhotoUrl }} style={styles.coverPhoto} />
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
          )}

          {/* Profile Photo */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">Profile Photo</ThemedText>
            <Pressable onPress={() => pickImage('profile')} style={styles.avatarContainer}>
              {userIsCoach ? (
                <Image source={{ uri: coach!.profilePhotoUrl }} style={styles.avatar} />
              ) : user!.profilePhotoUrl ? (
                <Image source={{ uri: user!.profilePhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: palette.border }]}>
                  <Ionicons name="person" size={48} color={palette.muted} />
                </View>
              )}
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
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Bio</ThemedText>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder={userIsCoach ? "Tell parents about your coaching philosophy..." : "A bit about yourself..."}
                placeholderTextColor={palette.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.textArea,
                  { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground },
                ]}
              />
              {userIsCoach && <ThemedText style={styles.helper}>{bio.length} / 500 characters</ThemedText>}
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
                placeholder={userIsCoach ? "coach@email.com" : "your@email.com"}
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
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
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
              />
            </View>

            {userIsCoach && (
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Website</ThemedText>
                <TextInput
                  value={website}
                  onChangeText={setWebsite}
                  keyboardType="url"
                  autoCapitalize="none"
                  placeholder="https://yourwebsite.com"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                />
              </View>
            )}
          </SurfaceCard>

          {/* Children - Parent only */}
          {!userIsCoach && (
            <SurfaceCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle">Children</ThemedText>
                <Pressable onPress={addChild} style={styles.inlineAction}>
                  <Ionicons name="add-circle" size={22} color={palette.tint} />
                  <ThemedText style={[styles.inlineActionText, { color: palette.tint }]}>Add</ThemedText>
                </Pressable>
              </View>

              {children.map((child, index) => (
                <View key={index} style={[styles.childRow, { borderColor: palette.border }]}>
                  <View style={styles.childFields}>
                    <TextInput
                      value={child.name}
                      onChangeText={(text) => updateChild(index, 'name', text)}
                      placeholder="Name"
                      placeholderTextColor={palette.muted}
                      style={[styles.input, styles.childNameInput, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                    />
                    <TextInput
                      value={child.age.toString()}
                      onChangeText={(text) => updateChild(index, 'age', parseInt(text) || 0)}
                      placeholder="Age"
                      keyboardType="number-pad"
                      placeholderTextColor={palette.muted}
                      style={[styles.input, styles.childAgeInput, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                    />
                  </View>
                  <Pressable onPress={() => removeChild(index)}>
                    <Ionicons name="trash-outline" size={24} color={palette.destructive} />
                  </Pressable>
                </View>
              ))}
            </SurfaceCard>
          )}

          {/* Pricing - Coach only */}
          {userIsCoach && (
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
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
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
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                  />
                </View>
              </View>
            </SurfaceCard>
          )}

          {/* Coaching Specialties - Coach only */}
          {userIsCoach && (
            <SurfaceCard style={styles.section}>
              <ThemedText type="subtitle">Coaching Specialties</ThemedText>
              <ThemedText style={styles.subtitle}>Select the areas you specialize in</ThemedText>

              <View style={styles.focusGrid}>
                {FOOTBALL_OBJECTIVES.map((focus) => {
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
          )}

          {/* Experience Section - Coach only */}
          {userIsCoach && (
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
          )}

          {/* Languages Section - Coach only */}
          {userIsCoach && (
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
          )}

          {/* Social Media Links Section - Coach only */}
          {userIsCoach && (
            <SurfaceCard style={styles.section}>
              <SocialLinksEditor
                socialLinks={socialLinks}
                onChange={setSocialLinks}
              />
            </SurfaceCard>
          )}

          {/* Certifications Section - Coach only */}
          {userIsCoach && (
            <SurfaceCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle">Certifications</ThemedText>
                <Pressable onPress={() => openCertificationModal()} style={styles.inlineAction}>
                  <Ionicons name="add-circle" size={22} color={palette.tint} />
                  <ThemedText style={[styles.inlineActionText, { color: palette.tint }]}>Add</ThemedText>
                </Pressable>
              </View>
              <ThemedText style={styles.subtitle}>
                Show parents your coaching licenses, FA badges, and professional qualifications.
              </ThemedText>

              {certifications.length > 0 ? (
                <View style={styles.certificationList}>
                  {certifications.map((cert) => {
                    const issueDate = cert.issueDate
                      ? new Date(cert.issueDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                      : '';
                    const expiryDate = cert.expiryDate
                      ? new Date(cert.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                      : null;
                    const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();

                    return (
                      <View key={cert.id} style={[styles.certificationCard, { borderColor: palette.border }]}>
                        <View style={styles.certificationHeader}>
                          <View
                            style={[
                              styles.certificationPill,
                              {
                                backgroundColor: isExpired ? `${palette.warning}15` : `${palette.success}15`,
                              },
                            ]}>
                            <Ionicons
                              name={isExpired ? 'alert-circle' : 'ribbon'}
                              size={14}
                              color={isExpired ? palette.warning : palette.success}
                            />
                            <ThemedText
                              style={styles.certificationPillText}
                              lightColor={isExpired ? palette.warning : palette.success}
                              darkColor={isExpired ? palette.warning : palette.success}>
                              {isExpired ? 'Expired' : 'Valid'}
                            </ThemedText>
                          </View>

                          <View style={styles.certificationActions}>
                            <Pressable
                              onPress={() => openCertificationModal(cert)}
                              style={[styles.iconButton, { borderColor: palette.border }]}>
                              <Ionicons name="pencil" size={16} color={palette.muted} />
                            </Pressable>
                            <Pressable
                              onPress={() => removeCertification(cert.id)}
                              style={[styles.iconButton, { borderColor: palette.border }]}>
                              <Ionicons name="trash" size={16} color={palette.warning} />
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.certificationBody}>
                          <ThemedText type="subtitle">{cert.name}</ThemedText>
                          <ThemedText style={styles.certificationIssuer}>{cert.issuer}</ThemedText>
                          <ThemedText style={styles.certificationDate}>
                            Issued: {issueDate}{expiryDate ? ` • Expires: ${expiryDate}` : ''}
                          </ThemedText>
                          {cert.credentialUrl && (
                            <View style={styles.certificationLinkRow}>
                              <Ionicons name="link" size={12} color={palette.tint} />
                              <ThemedText style={[styles.certificationLink, { color: palette.tint }]} numberOfLines={1}>
                                {cert.credentialUrl}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <SurfaceCard style={[styles.emptyCard, { borderColor: palette.border }]}>
                  <Ionicons name="ribbon-outline" size={20} color={palette.muted} />
                  <ThemedText style={styles.emptyText}>
                    Add your FA badges, UEFA licenses, or other coaching qualifications to build trust with parents.
                  </ThemedText>
                </SurfaceCard>
              )}
            </SurfaceCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Experience Modal - Coach only */}
      {userIsCoach && (
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
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Organisation / Club</ThemedText>
                  <TextInput
                    value={experienceDraft.organization}
                    onChangeText={(text) => setExperienceDraft({ ...experienceDraft, organization: text })}
                    placeholder="Club or academy name"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
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
                      style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
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
                          color: palette.foreground,
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
                      { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground },
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
      )}

      {/* Language Modal - Coach only */}
      {userIsCoach && (
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
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
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
      )}

      {/* Certification Modal - Coach only */}
      {userIsCoach && (
        <Modal
          visible={isCertificationModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCertificationModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <SurfaceCard style={[styles.modalCard, { backgroundColor: palette.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Certification</ThemedText>
                <Pressable onPress={() => setCertificationModalVisible(false)}>
                  <Ionicons name="close" size={22} color={palette.foreground} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Certification Name</ThemedText>
                  <TextInput
                    value={certificationDraft.name}
                    onChangeText={(text) => setCertificationDraft({ ...certificationDraft, name: text })}
                    placeholder="e.g., UEFA B License, FA Level 2..."
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Issuing Organisation</ThemedText>
                  <TextInput
                    value={certificationDraft.issuer}
                    onChangeText={(text) => setCertificationDraft({ ...certificationDraft, issuer: text })}
                    placeholder="e.g., UEFA, The FA, US Soccer..."
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                  />
                </View>

                <View style={styles.inlineFields}>
                  <View style={[styles.fieldGroup, styles.inlineField]}>
                    <ThemedText style={styles.label}>Issue Date</ThemedText>
                    <TextInput
                      value={certificationDraft.issueDate}
                      onChangeText={(text) => setCertificationDraft({ ...certificationDraft, issueDate: text })}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={palette.muted}
                      style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                    />
                  </View>

                  <View style={[styles.fieldGroup, styles.inlineField]}>
                    <ThemedText style={styles.label}>Expiry Date (optional)</ThemedText>
                    <TextInput
                      value={certificationDraft.expiryDate || ''}
                      onChangeText={(text) => setCertificationDraft({ ...certificationDraft, expiryDate: text })}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={palette.muted}
                      style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Credential URL (optional)</ThemedText>
                  <TextInput
                    value={certificationDraft.credentialUrl || ''}
                    onChangeText={(text) => setCertificationDraft({ ...certificationDraft, credentialUrl: text })}
                    placeholder="https://credentials.fa.com/..."
                    keyboardType="url"
                    autoCapitalize="none"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                  />
                  <ThemedText style={styles.helper}>
                    Link to your digital badge or certificate verification page
                  </ThemedText>
                </View>

                <Pressable
                  onPress={saveCertification}
                  style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.primaryButtonText} lightColor="#FFFFFF" darkColor="#000000">
                    Save certification
                  </ThemedText>
                </Pressable>
              </ScrollView>
            </SurfaceCard>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  childFields: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  childNameInput: {
    flex: 2,
  },
  childAgeInput: {
    flex: 1,
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
  certificationList: {
    gap: Spacing.sm,
  },
  certificationCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  certificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  certificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  certificationPillText: {
    fontWeight: '700',
    fontSize: 12,
  },
  certificationActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  certificationBody: {
    gap: 4,
  },
  certificationIssuer: {
    fontWeight: '600',
    opacity: 0.8,
  },
  certificationDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  certificationLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
  certificationLink: {
    fontSize: 12,
    flex: 1,
  },
});
