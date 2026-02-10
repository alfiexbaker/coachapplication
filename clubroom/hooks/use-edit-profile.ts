/**
 * useEditProfile — Form state management for the Edit Profile screen.
 *
 * Manages all form state, validation, save handlers, and modal state
 * for both coach and parent profile editing flows.
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { FOOTBALL_OBJECTIVES } from '@/constants/booking-types';
import type {
  CoachCertification,
  CoachExperience,
  CoachLanguage,
  CoachProfile,
  FootballObjective,
  SocialLinks,
} from '@/constants/types';
import { useAuth } from '@/hooks/use-auth';
import { discoverService } from '@/services/discover-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('EditProfile');

const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'Portuguese', 'German', 'Arabic', 'Italian'];
const PROFICIENCY_OPTIONS: CoachLanguage['proficiency'][] = ['Native', 'Fluent', 'Conversational', 'Basic'];

type EditableChildInput = {
  childId?: string;
  childName?: string;
  name?: string;
  age?: number;
};

type DirectoryUser = {
  id: string;
  fullName?: string;
  name?: string;
  dateOfBirth?: string;
};

type EditableUserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  bio?: string;
  profilePhotoUrl?: string;
  children: { name: string; age: number }[];
};

type AuthLikeUser = {
  id: string;
  role?: string;
  fullName?: string;
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  children?: EditableChildInput[];
};

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

const calculateAge = (dateOfBirth?: string): number => {
  if (!dateOfBirth) return 0;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return Math.max(0, age);
};

function buildEditableChildren(
  children: EditableChildInput[] | undefined,
  directory: DirectoryUser[]
): { name: string; age: number }[] {
  if (!children || children.length === 0) return [];

  const usersById = new Map(directory.map((user) => [user.id, user]));

  return children.map((child) => {
    const directoryUser = child.childId ? usersById.get(child.childId) : undefined;
    const resolvedName =
      child.childName ||
      child.name ||
      directoryUser?.fullName ||
      directoryUser?.name ||
      'Child';

    const resolvedAge =
      typeof child.age === 'number'
        ? child.age
        : calculateAge(directoryUser?.dateOfBirth);

    return {
      name: resolvedName,
      age: Math.max(0, resolvedAge),
    };
  });
}

function createEditableUserProfile(
  currentUser: AuthLikeUser,
  directory: DirectoryUser[]
): EditableUserProfile {
  return {
    id: currentUser.id,
    fullName: currentUser.fullName || currentUser.name || currentUser.username || 'User',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    bio: currentUser.bio || '',
    profilePhotoUrl: currentUser.avatar,
    children: buildEditableChildren(currentUser.children, directory),
  };
}

function createFallbackCoachProfile(currentUser: AuthLikeUser): CoachProfile {
  const displayName = currentUser.fullName || currentUser.name || currentUser.username || 'Coach';
  const nowIso = new Date().toISOString();

  return {
    id: currentUser.id,
    fullName: displayName,
    primarySport: 'Football',
    sports: ['Football'],
    city: 'London',
    state: 'England',
    distanceMiles: 0,
    rating: {
      average: 0,
      reviewCount: 0,
    },
    priceRange: {
      minUsd: 50,
      maxUsd: 80,
      unitLabel: 'per session',
    },
    nextAvailability: nowIso,
    badges: [],
    sessionFormats: ['In-person'],
    shortBio: currentUser.bio || '',
    profilePhotoUrl: currentUser.avatar || '',
    coverPhotoUrl: undefined,
    footballFocuses: [],
    location: {
      lat: 51.5074,
      lng: -0.1278,
    },
    bio: currentUser.bio || '',
    phone: currentUser.phone || '',
    email: currentUser.email || '',
    website: '',
    joinedDate: nowIso,
    totalSessions: 0,
    experiences: [],
    certifications: [],
    posts: [],
    photoGallery: [],
    videoGallery: [],
    languages: [],
    achievements: [],
    socialLinks: {},
  };
}

async function resolveCoachProfile(currentUser: AuthLikeUser): Promise<CoachProfile> {
  const byIdResult = await discoverService.getCoachById(currentUser.id);
  if (byIdResult.success && byIdResult.data) {
    return byIdResult.data;
  }

  const allCoachesResult = await discoverService.getAllCoaches();
  if (allCoachesResult.success) {
    const normalizedName = (currentUser.fullName || currentUser.name || '').trim().toLowerCase();
    const matchedCoach = allCoachesResult.data.find((coach) => {
      if (coach.id === currentUser.id) return true;
      if (!normalizedName) return false;
      return coach.fullName.trim().toLowerCase() === normalizedName;
    });

    if (matchedCoach) {
      return matchedCoach;
    }
  }

  return createFallbackCoachProfile(currentUser);
}

export interface EditProfileState {
  // Common
  fullName: string;
  bio: string;
  email: string;
  phone: string;
  // Parent
  children: { name: string; age: number }[];
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
  const { currentUser, availableUsers } = useAuth();
  const userIsCoach = currentUser?.role === 'COACH';

  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [user, setUser] = useState<EditableUserProfile | null>(null);

  // ── Common fields ──────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // ── Parent fields ──────────────────────────────────────────────
  const [children, setChildren] = useState<{ name: string; age: number }[]>([]);

  // ── Coach fields ───────────────────────────────────────────────
  const [website, setWebsite] = useState('');
  const [priceMin, setPriceMin] = useState('50');
  const [priceMax, setPriceMax] = useState('80');
  const [selectedFocuses, setSelectedFocuses] = useState<FootballObjective[]>([]);
  const [experiences, setExperiences] = useState<CoachExperience[]>([]);
  const [languages, setLanguages] = useState<CoachLanguage[]>([]);
  const [certifications, setCertifications] = useState<CoachCertification[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  // ── Modal drafts ───────────────────────────────────────────────
  const [experienceDraft, setExperienceDraft] = useState<CoachExperience>(createBlankExperience());
  const [isExperienceModalVisible, setExperienceModalVisible] = useState(false);
  const [languageDraft, setLanguageDraft] = useState<CoachLanguage>(createBlankLanguage());
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [certificationDraft, setCertificationDraft] = useState<CoachCertification>(createBlankCertification());
  const [isCertificationModalVisible, setCertificationModalVisible] = useState(false);

  useEffect(() => {
    let active = true;

    const initializeProfile = async () => {
      if (!currentUser) {
        setCoach(null);
        setUser(null);
        setFullName('');
        setBio('');
        setEmail('');
        setPhone('');
        setChildren([]);
        setWebsite('');
        setPriceMin('50');
        setPriceMax('80');
        setSelectedFocuses([]);
        setExperiences([]);
        setLanguages([]);
        setCertifications([]);
        setSocialLinks({});
        return;
      }

      const typedCurrentUser = currentUser as AuthLikeUser;
      const typedDirectory = availableUsers as DirectoryUser[];

      if (typedCurrentUser.role === 'COACH') {
        const resolvedCoach = await resolveCoachProfile(typedCurrentUser);
        if (!active) return;

        setCoach(resolvedCoach);
        setUser(null);
        setFullName(resolvedCoach.fullName);
        setBio(resolvedCoach.bio || resolvedCoach.shortBio || '');
        setEmail(resolvedCoach.email || typedCurrentUser.email || '');
        setPhone(resolvedCoach.phone || typedCurrentUser.phone || '');
        setChildren([]);
        setWebsite(resolvedCoach.website || '');
        setPriceMin(resolvedCoach.priceRange.minUsd.toString());
        setPriceMax(resolvedCoach.priceRange.maxUsd.toString());
        setSelectedFocuses(resolvedCoach.footballFocuses || []);
        setExperiences(resolvedCoach.experiences || []);
        setLanguages(resolvedCoach.languages || []);
        setCertifications(resolvedCoach.certifications || []);
        setSocialLinks(resolvedCoach.socialLinks || {});
        return;
      }

      const resolvedUser = createEditableUserProfile(typedCurrentUser, typedDirectory);
      if (!active) return;

      setUser(resolvedUser);
      setCoach(null);
      setFullName(resolvedUser.fullName);
      setBio(resolvedUser.bio || '');
      setEmail(resolvedUser.email);
      setPhone(resolvedUser.phone || '');
      setChildren(resolvedUser.children);
      setWebsite('');
      setPriceMin('50');
      setPriceMax('80');
      setSelectedFocuses([]);
      setExperiences([]);
      setLanguages([]);
      setCertifications([]);
      setSocialLinks({});
    };

    void initializeProfile();

    return () => {
      active = false;
    };
  }, [currentUser, availableUsers]);

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
      if (!coach) {
        Alert.alert('Profile unavailable', 'Coach profile is still loading. Please try again.');
        return;
      }

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
        certifications,
        socialLinks,
      };
      logger.info('Coach profile payload ready for API sync', payload);
    } else {
      if (!user) {
        Alert.alert('Profile unavailable', 'User profile is still loading. Please try again.');
        return;
      }

      const payload = { ...user, fullName, bio, email, phone, children };
      logger.info('User profile payload ready for API sync', payload);
    }

    Alert.alert('Success', 'Profile updated successfully', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [
    userIsCoach,
    coach,
    user,
    fullName,
    bio,
    email,
    phone,
    website,
    priceMin,
    priceMax,
    selectedFocuses,
    experiences,
    languages,
    certifications,
    socialLinks,
    children,
  ]);

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
