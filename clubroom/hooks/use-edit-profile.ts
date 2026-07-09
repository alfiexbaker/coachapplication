/**
 * useEditProfile — Form state management for the Edit Profile screen.
 *
 * Manages all form state, validation, save handlers, and modal state
 * for both coach and parent profile editing flows.
 */

import { useState, useEffect, useRef, type SetStateAction } from 'react';

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
import { authService, type UserProfile as AuthUserProfile } from '@/services/auth-service';
import { childService } from '@/services/child-service';
import { coachProfileService } from '@/services/coach-profile-service';
import { discoverService } from '@/services/discover-service';
import { generateId } from '@/utils/generate-id';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

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

type EditableUserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  bio?: string;
  profilePhotoUrl?: string;
};

type AuthLikeUser = {
  id: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
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

function splitFullNameForAuth(value: string): { firstName?: string; lastName?: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function formatQualification(certification: CoachCertification): string | null {
  const name = certification.name.trim();
  if (!name) return null;
  const issuer = certification.issuer.trim();
  return issuer ? `${name} - ${issuer}` : name;
}

function createEditableUserProfile(currentUser: AuthLikeUser): EditableUserProfile {
  return {
    id: currentUser.id,
    fullName: currentUser.fullName || currentUser.name || currentUser.username || 'User',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    bio: currentUser.bio || '',
    profilePhotoUrl: currentUser.avatar,
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
  const { currentUser } = useAuth();
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
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const sanitizePriceInput = (value: string) => value.replace(/[^0-9]/g, '');
  const parseOptionalInt = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const priceRangeError = (() => {
    if (!userIsCoach) return null;
    const min = parseOptionalInt(priceMin);
    const max = parseOptionalInt(priceMax);
    if (priceMin.trim() && min === null) return 'Enter whole pounds only (no pence)';
    if (priceMax.trim() && max === null) return 'Enter whole pounds only (no pence)';
    if (min !== null && min < 10) return 'Minimum price must be at least £10';
    if (max !== null && max > 200) return 'Maximum price must be under £200';
    if (min !== null && max !== null && min > max) return 'Minimum price must be less than maximum';
    return null;
  })();

  const setPriceMin = (value: string) => {
    setPriceMinState(sanitizePriceInput(value));
  };
  const setPriceMax = (value: string) => {
    setPriceMaxState(sanitizePriceInput(value));
  };

  // ── Modal drafts ───────────────────────────────────────────────
  const [experienceDraft, setExperienceDraftState] = useState<CoachExperience>(() => createBlankExperience());
  const [isExperienceModalVisible, setExperienceModalVisibleState] = useState(false);
  const [languageDraft, setLanguageDraftState] = useState<CoachLanguage>(() => createBlankLanguage());
  const [isLanguageModalVisible, setLanguageModalVisibleState] = useState(false);
  const [certificationDraft, setCertificationDraftState] = useState<CoachCertification>(() =>
    createBlankCertification(),
  );
  const [isCertificationModalVisible, setCertificationModalVisibleState] = useState(false);
  const [experienceValidationMessage, setExperienceValidationMessage] = useState<string | null>(null);
  const [languageValidationMessage, setLanguageValidationMessage] = useState<string | null>(null);
  const [certificationValidationMessage, setCertificationValidationMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const clearFormMessage = () => {
    setFormMessage(null);
  };
  const setExperienceDraft = (value: SetStateAction<CoachExperience>) => {
    setExperienceValidationMessage(null);
    setExperienceDraftState(value);
  };
  const setLanguageDraft = (value: SetStateAction<CoachLanguage>) => {
    setLanguageValidationMessage(null);
    setLanguageDraftState(value);
  };
  const setCertificationDraft = (value: SetStateAction<CoachCertification>) => {
    setCertificationValidationMessage(null);
    setCertificationDraftState(value);
  };
  const setExperienceModalVisible = (visible: boolean) => {
    if (!visible) {
      setExperienceValidationMessage(null);
    }
    setExperienceModalVisibleState(visible);
  };
  const setLanguageModalVisible = (visible: boolean) => {
    if (!visible) {
      setLanguageValidationMessage(null);
    }
    setLanguageModalVisibleState(visible);
  };
  const setCertificationModalVisible = (visible: boolean) => {
    if (!visible) {
      setCertificationValidationMessage(null);
    }
    setCertificationModalVisibleState(visible);
  };

  const retryLoad = () => {
    setReloadKey((value) => value + 1);
  };

  useEffect(() => {
    let active = true;

    const initializeProfile = async () => {
      setLoadError(null);
      setInitializing(true);

      return await runAsyncTryCatchFinally(async () => {
        if (!currentUser) {
          setCoach(null);
          setUser(null);
          setFullName('');
          setBio('');
          setEmail('');
          setPhone('');
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
        if (typedCurrentUser.role === 'COACH') {
          const resolvedCoach = await resolveCoachProfile(typedCurrentUser);
          if (!active) return;

          setCoach(resolvedCoach);
          setUser(null);
          setFullName(resolvedCoach.fullName);
          setBio(resolvedCoach.bio || resolvedCoach.shortBio || '');
          setEmail(resolvedCoach.email || typedCurrentUser.email || '');
          setPhone(resolvedCoach.phone || typedCurrentUser.phone || '');
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

        const resolvedUser = createEditableUserProfile(typedCurrentUser);
        if (!active) return;

        setUser(resolvedUser);
        setCoach(null);
        setFullName(resolvedUser.fullName);
        setBio(resolvedUser.bio || '');
        setEmail(resolvedUser.email);
        setPhone(resolvedUser.phone || '');
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
      }, async error => {
        if (!active) return;
        logger.error('Failed to initialize edit profile state', error);
        setLoadError('Failed to load profile data. Pull down to retry.');
      }, () => {
        if (active) {
          setInitializing(false);
        }
      });
    };

    void initializeProfile();

    return () => {
      active = false;
    };
  }, [currentUser, reloadKey]);

  // ── Focus toggles ──────────────────────────────────────────────
  const toggleFocus = (focus: FootballObjective) => {
    setSelectedFocuses((prev) =>
      prev.includes(focus) ? prev.filter((f) => f !== focus) : [...prev, focus],
    );
  };

  // ── Experience handlers ────────────────────────────────────────
  const openExperienceModal = (experience?: CoachExperience) => {
    setExperienceValidationMessage(null);
    setExperienceDraftState(experience ? { ...experience } : createBlankExperience());
    setExperienceModalVisible(true);
  };

  const saveExperience = () => {
    if (!experienceDraft.title || !experienceDraft.organization || !experienceDraft.startDate) {
      setExperienceValidationMessage('Please add a role title, organisation, and start date.');
      return;
    }
    setExperienceValidationMessage(null);
    setExperiences((prev) => {
      const exists = prev.some((exp) => exp.id === experienceDraft.id);
      return exists
        ? prev.map((exp) => (exp.id === experienceDraft.id ? experienceDraft : exp))
        : [experienceDraft, ...prev];
    });
    setExperienceModalVisible(false);
  };

  const removeExperience = (id: string) => {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
  };

  // ── Language handlers ──────────────────────────────────────────
  const openLanguageModal = (language?: CoachLanguage) => {
    setLanguageValidationMessage(null);
    setLanguageDraftState(language ? { ...language } : createBlankLanguage());
    setLanguageModalVisible(true);
  };

  const saveLanguage = () => {
    if (!languageDraft.name) {
      setLanguageValidationMessage('Please add a language name to continue.');
      return;
    }
    setLanguageValidationMessage(null);
    setLanguages((prev) => {
      const exists = prev.some((lang) => lang.id === languageDraft.id);
      return exists
        ? prev.map((lang) => (lang.id === languageDraft.id ? languageDraft : lang))
        : [...prev, languageDraft];
    });
    setLanguageModalVisible(false);
  };

  const removeLanguage = (id: string) => {
    setLanguages((prev) => prev.filter((lang) => lang.id !== id));
  };

  const quickAddLanguage = (name: string) => {
    setLanguages((prev) => [
      ...prev,
      {
        id: generateId('lang'),
        name,
        proficiency: 'Fluent',
      },
    ]);
  };

  // ── Certification handlers ─────────────────────────────────────
  const openCertificationModal = (certification?: CoachCertification) => {
    setCertificationValidationMessage(null);
    setCertificationDraftState(certification ? { ...certification } : createBlankCertification());
    setCertificationModalVisible(true);
  };

  const saveCertification = () => {
    if (!certificationDraft.name || !certificationDraft.issuer || !certificationDraft.issueDate) {
      setCertificationValidationMessage(
        'Please add a certification name, issuer, and issue date.',
      );
      return;
    }
    setCertificationValidationMessage(null);
    setCertifications((prev) => {
      const exists = prev.some((cert) => cert.id === certificationDraft.id);
      return exists
        ? prev.map((cert) => (cert.id === certificationDraft.id ? certificationDraft : cert))
        : [certificationDraft, ...prev];
    });
    setCertificationModalVisible(false);
  };

  const removeCertification = (id: string) => {
    setCertifications((prev) => prev.filter((cert) => cert.id !== id));
  };

  // ── Save handler ───────────────────────────────────────────────
  const handleSave = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setFormMessage(null);
    return runAsyncTryCatchFinally(async () => {
      if (userIsCoach && priceRangeError) {
        setFormMessage(priceRangeError);
        return;
      }

      const typedCurrentUser = currentUser as AuthLikeUser | null;
      const currentDisplayName =
        typedCurrentUser?.fullName || typedCurrentUser?.name || typedCurrentUser?.username || '';
      const identityUpdates: Partial<AuthUserProfile> = {};
      if (fullName.trim() && fullName.trim() !== currentDisplayName.trim()) {
        Object.assign(identityUpdates, splitFullNameForAuth(fullName));
      }
      if (
        email.trim() &&
        email.trim().toLowerCase() !== (typedCurrentUser?.email ?? '').trim().toLowerCase()
      ) {
        identityUpdates.email = email.trim();
      }
      if (phone.trim() !== (typedCurrentUser?.phone ?? '').trim()) {
        identityUpdates.phone = phone.trim();
      }

      if (userIsCoach) {
        if (!coach) {
          setFormMessage('Coach profile is still loading. Please try again.');
          return;
        }

        if (Object.keys(identityUpdates).length > 0) {
          const identityResult = await authService.updateProfile(identityUpdates);
          if (!identityResult.success) {
            setFormMessage(identityResult.error.message);
            return;
          }
        }

        const qualificationLabels = certifications
          .map(formatQualification)
          .filter((value): value is string => Boolean(value));
        const maxPricePounds = parseOptionalInt(priceMax);
        const profileResult = await coachProfileService.updateSelfProfile({
          bio: bio.trim() || null,
          sessionRateMinor: Math.round(Number(priceMin) * 100),
          priceMaxMinor: maxPricePounds === null ? null : Math.round(maxPricePounds * 100),
          currency: 'GBP',
          website: website.trim() || null,
          socialLinks,
          experiences,
          languages,
          specialties: selectedFocuses,
          qualifications: qualificationLabels,
        });
        if (!profileResult.success) {
          setFormMessage(profileResult.error.message);
          return;
        }

      } else {
        if (!user) {
          setFormMessage('User profile is still loading. Please try again.');
          return;
        }

        if (bio.trim() !== (typedCurrentUser?.bio ?? '').trim()) {
          identityUpdates.bio = bio.trim();
        }
        if (Object.keys(identityUpdates).length > 0) {
          const identityResult = await authService.updateProfile(identityUpdates);
          if (!identityResult.success) {
            setFormMessage(identityResult.error.message);
            return;
          }
        }

        if (userIsAthlete && primaryPosition) {
          const childResult = await childService.updateChild(typedCurrentUser?.id ?? '', {
            primaryPosition,
          });
          if (!childResult.success) {
            setFormMessage(childResult.error.message);
            return;
          }
        }
      }

      uiFeedback.showToast('Profile updated successfully', 'success');
      router.back();
    }, (error) => {
      logger.error('Failed to save profile', error);
      setFormMessage('Failed to save profile. Please try again.');
    }, () => {
      isSavingRef.current = false;
      setIsSaving(false);
    });
  };

  const canSave = (!userIsCoach || priceRangeError === null) && !isSaving;

  return {
    // Identity
    userIsCoach,
    userIsAthlete,
    coach,
    user,
    initializing,
    loadError,
    formMessage,
    clearFormMessage,
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
    experienceValidationMessage,
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
    languageValidationMessage,
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
    certificationValidationMessage,
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
    isSaving,
  };
}
