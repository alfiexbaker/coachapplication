/**
 * useEditProfile — Form state management for the Edit Profile screen.
 *
 * Manages all form state, validation, save handlers, and modal state
 * for both coach and parent profile editing flows.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { coachProfiles, mockUserProfile } from '@/constants/mock-data';
import { FOOTBALL_OBJECTIVES } from '@/constants/booking-types';
import type {
  CoachCertification,
  CoachExperience,
  CoachLanguage,
  FootballObjective,
  SocialLinks,
} from '@/constants/types';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('EditProfile');

const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'Portuguese', 'German', 'Arabic', 'Italian'];
const PROFICIENCY_OPTIONS: CoachLanguage['proficiency'][] = ['Native', 'Fluent', 'Conversational', 'Basic'];

const createBlankExperience = (): CoachExperience => ({
  id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  title: '',
  organization: '',
  startDate: '',
  endDate: '',
  description: '',
  current: false,
});

const createBlankLanguage = (): CoachLanguage => ({
  id: `lang-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  proficiency: 'Conversational',
});

const createBlankCertification = (): CoachCertification => ({
  id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  issuer: '',
  issueDate: '',
  expiryDate: '',
  credentialUrl: '',
});

export interface EditProfileState {
  // Common
  fullName: string;
  bio: string;
  email: string;
  phone: string;
  // Parent
  children: Array<{ name: string; age: number }>;
  // Coach
  website: string;
  priceMin: string;
  priceMax: string;
  selectedFocuses: FootballObjective[];
  experiences: CoachExperience[];
  languages: CoachLanguage[];
  certifications: CoachCertification[];
  socialLinks: SocialLinks;
}

export interface EditProfileModals {
  experienceVisible: boolean;
  languageVisible: boolean;
  certificationVisible: boolean;
  experienceDraft: CoachExperience;
  languageDraft: CoachLanguage;
  certificationDraft: CoachCertification;
}

export function useEditProfile() {
  const { currentUser: authUser } = useAuth();
  const currentUser = authUser || mockUserProfile;
  const userIsCoach = currentUser?.role === 'COACH';
  const coach = userIsCoach ? coachProfiles[0] : null;
  const user = !userIsCoach ? mockUserProfile : null;

  // ── Common fields ──────────────────────────────────────────────
  const [fullName, setFullName] = useState(userIsCoach ? coach!.fullName : user!.fullName);
  const [bio, setBio] = useState(userIsCoach ? (coach!.bio || '') : (user!.bio || ''));
  const [email, setEmail] = useState(userIsCoach ? (coach!.email || '') : user!.email);
  const [phone, setPhone] = useState(userIsCoach ? (coach!.phone || '') : (user!.phone || ''));

  // ── Parent fields ──────────────────────────────────────────────
  const [children, setChildren] = useState(user?.children || []);

  // ── Coach fields ───────────────────────────────────────────────
  const [website, setWebsite] = useState(coach?.website || '');
  const [priceMin, setPriceMin] = useState(coach?.priceRange.minUsd.toString() || '50');
  const [priceMax, setPriceMax] = useState(coach?.priceRange.maxUsd.toString() || '80');
  const [selectedFocuses, setSelectedFocuses] = useState<FootballObjective[]>(coach?.footballFocuses || []);
  const [experiences, setExperiences] = useState<CoachExperience[]>(coach?.experiences || []);
  const [languages, setLanguages] = useState<CoachLanguage[]>(coach?.languages || []);
  const [certifications, setCertifications] = useState<CoachCertification[]>(coach?.certifications || []);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(coach?.socialLinks || {});

  // ── Modal drafts ───────────────────────────────────────────────
  const [experienceDraft, setExperienceDraft] = useState<CoachExperience>(createBlankExperience());
  const [isExperienceModalVisible, setExperienceModalVisible] = useState(false);
  const [languageDraft, setLanguageDraft] = useState<CoachLanguage>(createBlankLanguage());
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [certificationDraft, setCertificationDraft] = useState<CoachCertification>(createBlankCertification());
  const [isCertificationModalVisible, setCertificationModalVisible] = useState(false);

  // ── Focus toggles ──────────────────────────────────────────────
  const toggleFocus = useCallback((focus: FootballObjective) => {
    setSelectedFocuses((prev) =>
      prev.includes(focus) ? prev.filter((f) => f !== focus) : [...prev, focus],
    );
  }, []);

  // ── Experience handlers ────────────────────────────────────────
  const openExperienceModal = useCallback((experience?: CoachExperience) => {
    setExperienceDraft(experience ? { ...experience } : createBlankExperience());
    setExperienceModalVisible(true);
  }, []);

  const saveExperience = useCallback(() => {
    if (!experienceDraft.title || !experienceDraft.organization || !experienceDraft.startDate) {
      Alert.alert('Missing Information', 'Please add a role title, organisation, and start date.');
      return;
    }
    setExperiences((prev) => {
      const exists = prev.some((exp) => exp.id === experienceDraft.id);
      return exists
        ? prev.map((exp) => (exp.id === experienceDraft.id ? experienceDraft : exp))
        : [experienceDraft, ...prev];
    });
    setExperienceModalVisible(false);
  }, [experienceDraft]);

  const removeExperience = useCallback((id: string) => {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
  }, []);

  // ── Language handlers ──────────────────────────────────────────
  const openLanguageModal = useCallback((language?: CoachLanguage) => {
    setLanguageDraft(language ? { ...language } : createBlankLanguage());
    setLanguageModalVisible(true);
  }, []);

  const saveLanguage = useCallback(() => {
    if (!languageDraft.name) {
      Alert.alert('Missing Information', 'Please add a language name to continue.');
      return;
    }
    setLanguages((prev) => {
      const exists = prev.some((lang) => lang.id === languageDraft.id);
      return exists
        ? prev.map((lang) => (lang.id === languageDraft.id ? languageDraft : lang))
        : [...prev, languageDraft];
    });
    setLanguageModalVisible(false);
  }, [languageDraft]);

  const removeLanguage = useCallback((id: string) => {
    setLanguages((prev) => prev.filter((lang) => lang.id !== id));
  }, []);

  const quickAddLanguage = useCallback((name: string) => {
    setLanguages((prev) => [
      ...prev,
      { id: `lang-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, proficiency: 'Fluent' },
    ]);
  }, []);

  // ── Certification handlers ─────────────────────────────────────
  const openCertificationModal = useCallback((certification?: CoachCertification) => {
    setCertificationDraft(certification ? { ...certification } : createBlankCertification());
    setCertificationModalVisible(true);
  }, []);

  const saveCertification = useCallback(() => {
    if (!certificationDraft.name || !certificationDraft.issuer || !certificationDraft.issueDate) {
      Alert.alert('Missing Information', 'Please add a certification name, issuer, and issue date.');
      return;
    }
    setCertifications((prev) => {
      const exists = prev.some((cert) => cert.id === certificationDraft.id);
      return exists
        ? prev.map((cert) => (cert.id === certificationDraft.id ? certificationDraft : cert))
        : [certificationDraft, ...prev];
    });
    setCertificationModalVisible(false);
  }, [certificationDraft]);

  const removeCertification = useCallback((id: string) => {
    setCertifications((prev) => prev.filter((cert) => cert.id !== id));
  }, []);

  // ── Children handlers ──────────────────────────────────────────
  const addChild = useCallback(() => {
    setChildren((prev) => [...prev, { name: '', age: 0 }]);
  }, []);

  const updateChild = useCallback((index: number, field: 'name' | 'age', value: string | number) => {
    setChildren((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeChild = useCallback((index: number) => {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Save handler ───────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (userIsCoach) {
      const payload = {
        ...coach!,
        fullName, bio, email, phone, website,
        priceRange: { ...coach!.priceRange, minUsd: Number(priceMin), maxUsd: Number(priceMax) },
        footballFocuses: selectedFocuses, experiences, languages, certifications, socialLinks,
      };
      logger.info('Coach profile payload ready for API sync', payload);
    } else {
      const payload = { ...user!, fullName, bio, email, phone, children };
      logger.info('User profile payload ready for API sync', payload);
    }
    Alert.alert('Success', 'Profile updated successfully', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [userIsCoach, coach, user, fullName, bio, email, phone, website, priceMin, priceMax, selectedFocuses, experiences, languages, certifications, socialLinks, children]);

  // ── Image picker ───────────────────────────────────────────────
  const pickImage = useCallback((type: 'profile' | 'cover') => {
    Alert.alert(
      `Change ${type === 'profile' ? 'Profile' : 'Cover'} Photo`,
      'Choose how you want to select a photo',
      [
        { text: 'Take Photo', onPress: () => logger.info(`Camera selected for ${type}`) },
        { text: 'Choose from Library', onPress: () => logger.info(`Library selected for ${type}`) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, []);

  return {
    // Identity
    userIsCoach, coach, user,
    // Common
    fullName, setFullName, bio, setBio, email, setEmail, phone, setPhone,
    // Parent
    children, addChild, updateChild, removeChild,
    // Coach general
    website, setWebsite, priceMin, setPriceMin, priceMax, setPriceMax,
    // Focuses
    selectedFocuses, toggleFocus, footballObjectives: FOOTBALL_OBJECTIVES,
    // Experience
    experiences, openExperienceModal, saveExperience, removeExperience,
    experienceDraft, setExperienceDraft, isExperienceModalVisible, setExperienceModalVisible,
    // Languages
    languages, openLanguageModal, saveLanguage, removeLanguage, quickAddLanguage,
    languageDraft, setLanguageDraft, isLanguageModalVisible, setLanguageModalVisible,
    languageOptions: LANGUAGE_OPTIONS, proficiencyOptions: PROFICIENCY_OPTIONS,
    // Certifications
    certifications, openCertificationModal, saveCertification, removeCertification,
    certificationDraft, setCertificationDraft, isCertificationModalVisible, setCertificationModalVisible,
    // Social
    socialLinks, setSocialLinks,
    // Actions
    handleSave, pickImage,
  };
}
