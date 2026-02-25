/**
 * useEditProfile — Form state management for the Edit Profile screen.
 *
 * Manages all form state, validation, save handlers, and modal state
 * for both coach and parent profile editing flows.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
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
import type { PositionRole } from '@/types/progress-types';
import { useAuth } from '@/hooks/use-auth';
import { childService } from '@/services/child-service';
import { discoverService } from '@/services/discover-service';
import { generateId } from '@/utils/generate-id';
import { createLogger } from '@/utils/logger';

const logger = createLogger('EditProfile');

const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'French',
  'Portuguese',
  'German',
  'Arabic',
  'Italian',
];
const PROFICIENCY_OPTIONS: CoachLanguage['proficiency'][] = [
  'Native',
  'Fluent',
  'Conversational',
  'Basic',
];

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
  id: generateId('exp'),
  title: '',
  organization: '',
  startDate: '',
  endDate: '',
  description: '',
  current: false,
});

const createBlankLanguage = (): CoachLanguage => ({
  id: generateId('lang'),
  name: '',
  proficiency: 'Conversational',
});

const createBlankCertification = (): CoachCertification => ({
  id: generateId('cert'),
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
  directory: DirectoryUser[],
): { name: string; age: number }[] {
  if (!children || children.length === 0) return [];

  const usersById = new Map(directory.map((user) => [user.id, user]));

  return children.map((child) => {
    const directoryUser = child.childId ? usersById.get(child.childId) : undefined;
    const resolvedName =
      child.childName || child.name || directoryUser?.fullName || directoryUser?.name || 'Child';

    const resolvedAge =
      typeof child.age === 'number' ? child.age : calculateAge(directoryUser?.dateOfBirth);

    return {
      name: resolvedName,
      age: Math.max(0, resolvedAge),
    };
  });
}

function createEditableUserProfile(
  currentUser: AuthLikeUser,
  directory: DirectoryUser[],
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
      min: 50,
      max: 80,
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
  const userIsAthlete = (currentUser?.role as string) === 'ATHLETE';
  const [initializing, setInitializing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [user, setUser] = useState<EditableUserProfile | null>(null);

  // ── Common fields ──────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // ── Parent fields ──────────────────────────────────────────────
  const [children, setChildren] = useState<{ name: string; age: number }[]>([]);

  // ── Athlete fields ────────────────────────────────────────────
  const [primaryPosition, setPrimaryPosition] = useState<PositionRole | null>(null);

  // ── Coach fields ───────────────────────────────────────────────
  const [website, setWebsite] = useState('');
  const [priceMin, setPriceMinState] = useState('50');
  const [priceMax, setPriceMaxState] = useState('80');
  const [selectedFocuses, setSelectedFocuses] = useState<FootballObjective[]>([]);
  const [experiences, setExperiences] = useState<CoachExperience[]>([]);
  const [languages, setLanguages] = useState<CoachLanguage[]>([]);
  const [certifications, setCertifications] = useState<CoachCertification[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  const sanitizePriceInput = useCallback((value: string) => value.replace(/[^0-9]/g, ''), []);
  const parseOptionalInt = useCallback((value: string) => {
    if (!value.trim()) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, []);
  const priceRangeError = useMemo(() => {
    if (!userIsCoach) return null;
    const min = parseOptionalInt(priceMin);
    const max = parseOptionalInt(priceMax);
    if (priceMin.trim() && min === null) return 'Enter whole pounds only (no pence)';
    if (priceMax.trim() && max === null) return 'Enter whole pounds only (no pence)';
    if (min !== null && min < 10) return 'Minimum price must be at least £10';
    if (max !== null && max > 200) return 'Maximum price must be under £200';
    if (min !== null && max !== null && min > max) return 'Minimum price must be less than maximum';
    return null;
  }, [userIsCoach, parseOptionalInt, priceMin, priceMax]);

  const setPriceMin = useCallback((value: string) => {
    setPriceMinState(sanitizePriceInput(value));
  }, [sanitizePriceInput]);
  const setPriceMax = useCallback((value: string) => {
    setPriceMaxState(sanitizePriceInput(value));
  }, [sanitizePriceInput]);

  // ── Modal drafts ───────────────────────────────────────────────
  const [experienceDraft, setExperienceDraft] = useState<CoachExperience>(createBlankExperience());
  const [isExperienceModalVisible, setExperienceModalVisible] = useState(false);
  const [languageDraft, setLanguageDraft] = useState<CoachLanguage>(createBlankLanguage());
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [certificationDraft, setCertificationDraft] = useState<CoachCertification>(
    createBlankCertification(),
  );
  const [isCertificationModalVisible, setCertificationModalVisible] = useState(false);

  const retryLoad = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;

    const initializeProfile = async () => {
      setLoadError(null);
      setInitializing(true);

      try {
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
          setPriceMin(resolvedCoach.priceRange.min.toString());
          setPriceMax(resolvedCoach.priceRange.max.toString());
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

        // Hydrate athlete position from child profile
        if (typedCurrentUser.role === 'ATHLETE') {
          const childProfile = await childService.getChild(typedCurrentUser.id);
          if (active && childProfile?.primaryPosition) {
            setPrimaryPosition(childProfile.primaryPosition);
          }
        }
      } catch (error) {
        if (!active) return;
        logger.error('Failed to initialize edit profile state', error);
        setLoadError('Failed to load profile data. Pull down to retry.');
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };

    void initializeProfile();

    return () => {
      active = false;
    };
  }, [currentUser, availableUsers, reloadKey]);

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
      {
        id: generateId('lang'),
        name,
        proficiency: 'Fluent',
      },
    ]);
  }, []);

  // ── Certification handlers ─────────────────────────────────────
  const openCertificationModal = useCallback((certification?: CoachCertification) => {
    setCertificationDraft(certification ? { ...certification } : createBlankCertification());
    setCertificationModalVisible(true);
  }, []);

  const saveCertification = useCallback(() => {
    if (!certificationDraft.name || !certificationDraft.issuer || !certificationDraft.issueDate) {
      Alert.alert(
        'Missing Information',
        'Please add a certification name, issuer, and issue date.',
      );
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

  const updateChild = useCallback(
    (index: number, field: 'name' | 'age', value: string | number) => {
      setChildren((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    [],
  );

  const removeChild = useCallback((index: number) => {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Save handler ───────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (userIsCoach && priceRangeError) {
      Alert.alert('Invalid pricing', priceRangeError);
      return;
    }
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
          min: Number(priceMin),
          max: Number(priceMax),
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

      // Persist athlete position change via child service
      if (userIsAthlete && primaryPosition) {
        void childService.updateChild(currentUser?.id ?? '', { primaryPosition });
      }
    }

    Alert.alert('Success', 'Profile updated successfully', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [
    userIsCoach,
    userIsAthlete,
    coach,
    user,
    currentUser?.id,
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
    primaryPosition,
    priceRangeError,
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

  const canSave = !userIsCoach || priceRangeError === null;

  return {
    // Identity
    userIsCoach,
    userIsAthlete,
    coach,
    user,
    initializing,
    loadError,
    retryLoad,
    // Common
    fullName,
    setFullName,
    bio,
    setBio,
    email,
    setEmail,
    phone,
    setPhone,
    // Parent
    children,
    addChild,
    updateChild,
    removeChild,
    // Athlete
    primaryPosition,
    setPrimaryPosition,
    // Coach general
    website,
    setWebsite,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    priceRangeError,
    // Focuses
    selectedFocuses,
    toggleFocus,
    footballObjectives: FOOTBALL_OBJECTIVES,
    // Experience
    experiences,
    openExperienceModal,
    saveExperience,
    removeExperience,
    experienceDraft,
    setExperienceDraft,
    isExperienceModalVisible,
    setExperienceModalVisible,
    // Languages
    languages,
    openLanguageModal,
    saveLanguage,
    removeLanguage,
    quickAddLanguage,
    languageDraft,
    setLanguageDraft,
    isLanguageModalVisible,
    setLanguageModalVisible,
    languageOptions: LANGUAGE_OPTIONS,
    proficiencyOptions: PROFICIENCY_OPTIONS,
    // Certifications
    certifications,
    openCertificationModal,
    saveCertification,
    removeCertification,
    certificationDraft,
    setCertificationDraft,
    isCertificationModalVisible,
    setCertificationModalVisible,
    // Social
    socialLinks,
    setSocialLinks,
    // Actions
    handleSave,
    canSave,
    pickImage,
  };
}
