/**
 * useEditProfile — Form state management for the Edit Profile screen.
 *
 * Manages all form state, validation, save handlers, and modal state
 * for both coach and parent profile editing flows.
 */

import { useState, useEffect, useRef, type SetStateAction } from 'react';

import { router } from 'expo-router';

import { FOOTBALL_OBJECTIVES } from '@/constants/booking-types';
import { api } from '@/constants/config';
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
import {
  coachProfileService,
  mapCoachSelfProfileResponse,
  type CoachSelfProfileResponse,
} from '@/services/coach-profile-service';
import { discoverService } from '@/services/discover-service';
import { generateId } from '@/utils/generate-id';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';
import {
  firstSocialLinksError,
  validateSocialLinkInput,
} from '@/packages/shared-contracts/src/common/social-links';

const logger = createLogger('EditProfile');

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

function sanitizePriceInput(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

function parseOptionalInt(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function withoutLegacySocialWebsite(socialLinks: SocialLinks): SocialLinks {
  const canonicalLinks = { ...socialLinks };
  delete canonicalLinks.website;
  return canonicalLinks;
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

function createMockCoachProfile(currentUser: AuthLikeUser): CoachProfile {
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

type ResolvedCoachProfile = {
  coach: CoachProfile;
  authority: CoachSelfProfileResponse | null;
};

async function resolveCoachProfile(currentUser: AuthLikeUser): Promise<ResolvedCoachProfile> {
  if (api.useMock) {
    const byIdResult = await discoverService.getCoachById(currentUser.id);
    if (byIdResult.success && byIdResult.data) {
      return { coach: byIdResult.data, authority: null };
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
        return { coach: matchedCoach, authority: null };
      }
    }

    return { coach: createMockCoachProfile(currentUser), authority: null };
  }

  const result = await coachProfileService.getSelfProfile();
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return {
    coach: mapCoachSelfProfileResponse(result.data, currentUser),
    authority: result.data,
  };
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

type EditProfileFingerprintState = EditProfileState & {
  primaryPosition: PositionRole | null;
};

function createEditProfileFingerprint(state: EditProfileFingerprintState): string {
  return JSON.stringify({
    ...state,
    fullName: state.fullName.trim(),
    bio: state.bio.trim(),
    email: state.email.trim().toLowerCase(),
    phone: state.phone.trim(),
    website: state.website.trim(),
  });
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
  const [priceMin, setPriceMinState] = useState('');
  const [priceMax, setPriceMaxState] = useState('');
  const [selectedFocuses, setSelectedFocuses] = useState<FootballObjective[]>([]);
  const [experiences, setExperiences] = useState<CoachExperience[]>([]);
  const [languages, setLanguages] = useState<CoachLanguage[]>([]);
  const [certifications, setCertifications] = useState<CoachCertification[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const priceRangeError = (() => {
    if (!userIsCoach) return null;
    const min = parseOptionalInt(priceMin);
    const max = parseOptionalInt(priceMax);
    if (priceMin.trim() && min === null) return 'Use whole pounds';
    if (priceMax.trim() && max === null) return 'Use whole pounds';
    if (min !== null && min < 10) return 'Minimum price must be £10 or more';
    if (max !== null && max > 200) return 'Maximum price must be £200 or less';
    if (min !== null && max !== null && min > max) return 'Minimum must be lower than maximum';
    return null;
  })();
  const socialLinksError = firstSocialLinksError(socialLinks);
  const websiteError = validateSocialLinkInput('website', website);
  const profileLinksError = socialLinksError ?? websiteError;

  const setPriceMin = (value: string) => {
    setPriceMinState(sanitizePriceInput(value));
  };
  const setPriceMax = (value: string) => {
    setPriceMaxState(sanitizePriceInput(value));
  };

  // ── Modal drafts ───────────────────────────────────────────────
  const [experienceDraft, setExperienceDraftState] = useState<CoachExperience>(() =>
    createBlankExperience(),
  );
  const [isExperienceModalVisible, setExperienceModalVisibleState] = useState(false);
  const [languageDraft, setLanguageDraftState] = useState<CoachLanguage>(() =>
    createBlankLanguage(),
  );
  const [isLanguageModalVisible, setLanguageModalVisibleState] = useState(false);
  const [certificationDraft, setCertificationDraftState] = useState<CoachCertification>(() =>
    createBlankCertification(),
  );
  const [isCertificationModalVisible, setCertificationModalVisibleState] = useState(false);
  const [experienceValidationMessage, setExperienceValidationMessage] = useState<string | null>(
    null,
  );
  const [languageValidationMessage, setLanguageValidationMessage] = useState<string | null>(null);
  const [certificationValidationMessage, setCertificationValidationMessage] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [initialFingerprint, setInitialFingerprint] = useState<string | null>(null);
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
      setInitialFingerprint(null);

      const applyFormValues = (values: EditProfileFingerprintState) => {
        const canonicalValues = {
          ...values,
          socialLinks: withoutLegacySocialWebsite(values.socialLinks),
        };
        setFullName(values.fullName);
        setBio(values.bio);
        setEmail(values.email);
        setPhone(values.phone);
        setPrimaryPosition(values.primaryPosition);
        setWebsite(values.website);
        setPriceMin(values.priceMin);
        setPriceMax(values.priceMax);
        setSelectedFocuses(values.selectedFocuses);
        setExperiences(values.experiences);
        setLanguages(values.languages);
        setCertifications(values.certifications);
        setSocialLinks(canonicalValues.socialLinks);
        setInitialFingerprint(createEditProfileFingerprint(canonicalValues));
      };

      return await runAsyncTryCatchFinally(
        async () => {
          if (!currentUser) {
            setCoach(null);
            setUser(null);
            applyFormValues({
              fullName: '',
              bio: '',
              email: '',
              phone: '',
              primaryPosition: null,
              website: '',
              priceMin: '',
              priceMax: '',
              selectedFocuses: [],
              experiences: [],
              languages: [],
              certifications: [],
              socialLinks: {},
            });
            return;
          }

          const typedCurrentUser = currentUser as AuthLikeUser;
          if (typedCurrentUser.role === 'COACH') {
            const resolved = await resolveCoachProfile(typedCurrentUser);
            if (!active) return;

            const resolvedCoach = resolved.coach;
            const authorityProfile = resolved.authority?.profile;
            setCoach(resolvedCoach);
            setUser(null);
            applyFormValues({
              fullName: resolvedCoach.fullName,
              bio: authorityProfile?.bio ?? resolvedCoach.bio ?? resolvedCoach.shortBio ?? '',
              email: resolvedCoach.email || typedCurrentUser.email || '',
              phone: resolvedCoach.phone || typedCurrentUser.phone || '',
              primaryPosition: null,
              website: authorityProfile?.website ?? resolvedCoach.website ?? '',
              priceMin: authorityProfile
                ? authorityProfile.sessionRateMinor == null
                  ? ''
                  : String(authorityProfile.sessionRateMinor / 100)
                : resolvedCoach.priceRange.min.toString(),
              priceMax: authorityProfile
                ? authorityProfile.priceMaxMinor == null
                  ? ''
                  : String(authorityProfile.priceMaxMinor / 100)
                : resolvedCoach.priceRange.max.toString(),
              selectedFocuses: authorityProfile
                ? (authorityProfile.specialties ?? []).filter((focus): focus is FootballObjective =>
                    FOOTBALL_OBJECTIVES.includes(focus as FootballObjective),
                  )
                : resolvedCoach.footballFocuses || [],
              experiences: authorityProfile?.experiencesJson ?? resolvedCoach.experiences ?? [],
              languages: authorityProfile?.languagesJson ?? resolvedCoach.languages ?? [],
              certifications: authorityProfile
                ? (authorityProfile.qualifications ?? []).map((name, index) => ({
                    id: `qualification_${authorityProfile.userId}_${index}`,
                    name,
                    issuer: '',
                    issueDate: '',
                    expiryDate: '',
                    credentialUrl: '',
                  }))
                : resolvedCoach.certifications || [],
              socialLinks: authorityProfile?.socialLinksJson ?? resolvedCoach.socialLinks ?? {},
            });
            return;
          }

          const resolvedUser = createEditableUserProfile(typedCurrentUser);
          if (!active) return;

          let resolvedPrimaryPosition: PositionRole | null = null;
          if (typedCurrentUser.role === 'ATHLETE') {
            const childProfile = await childService.getChild(typedCurrentUser.id);
            if (!active) return;
            resolvedPrimaryPosition = childProfile?.primaryPosition ?? null;
          }

          setUser(resolvedUser);
          setCoach(null);
          applyFormValues({
            fullName: resolvedUser.fullName,
            bio: resolvedUser.bio || '',
            email: resolvedUser.email,
            phone: resolvedUser.phone || '',
            primaryPosition: resolvedPrimaryPosition,
            website: '',
            priceMin: '',
            priceMax: '',
            selectedFocuses: [],
            experiences: [],
            languages: [],
            certifications: [],
            socialLinks: {},
          });
        },
        async (error) => {
          if (!active) return;
          logger.error('Failed to initialize edit profile state', error);
          setLoadError('Failed to load profile data. Pull down to retry.');
        },
        () => {
          if (active) {
            setInitializing(false);
          }
        },
      );
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
      setExperienceValidationMessage('Role, club or organisation, and start date are required.');
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
      setLanguageValidationMessage('Language is required.');
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

  // ── Certification handlers ─────────────────────────────────────
  const openCertificationModal = (certification?: CoachCertification) => {
    setCertificationValidationMessage(null);
    setCertificationDraftState(certification ? { ...certification } : createBlankCertification());
    setCertificationModalVisible(true);
  };

  const saveCertification = () => {
    const qualification = formatQualification(certificationDraft);
    if (!qualification) {
      setCertificationValidationMessage('Qualification name is required.');
      return;
    }
    if (qualification.length > 120) {
      setCertificationValidationMessage('Name and issuer must be 120 characters or fewer.');
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
  const currentFingerprint = createEditProfileFingerprint({
    fullName,
    bio,
    email,
    phone,
    primaryPosition,
    website,
    priceMin,
    priceMax,
    selectedFocuses,
    experiences,
    languages,
    certifications,
    socialLinks,
  });
  const hasChanges = initialFingerprint !== null && currentFingerprint !== initialFingerprint;
  const profileReady = userIsCoach ? coach !== null : user !== null;
  const canSave =
    profileReady &&
    hasChanges &&
    (!userIsCoach || (priceRangeError === null && profileLinksError === null)) &&
    !initializing &&
    !isSaving;

  const handleSave = async () => {
    if (!canSave || isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setFormMessage(null);
    return runAsyncTryCatchFinally(
      async () => {
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
          const minPricePounds = parseOptionalInt(priceMin);
          const maxPricePounds = parseOptionalInt(priceMax);
          const profileResult = await coachProfileService.updateSelfProfile({
            bio: bio.trim() || null,
            sessionRateMinor: minPricePounds === null ? null : Math.round(minPricePounds * 100),
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
      },
      (error) => {
        logger.error('Failed to save profile', error);
        setFormMessage('Failed to save profile. Please try again.');
      },
      () => {
        isSavingRef.current = false;
        setIsSaving(false);
      },
    );
  };

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
    websiteError,
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
    languageValidationMessage,
    languageDraft,
    setLanguageDraft,
    isLanguageModalVisible,
    setLanguageModalVisible,
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
