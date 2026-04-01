/**
 * Child Context — centralized source of truth for "who are this parent's children?"
 *
 * Reconciles two incompatible data sources:
 * - ChildReference (auth, sync): childId/childName from currentUser.children
 * - ChildProfile (service, async): rich profile data from childService
 *
 * Provides useChildContext() hook for all child-aware screens (Phases 2-7).
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/services/api-client';
import { bookingSelfSettingService } from '@/services/booking-self-setting-service';
import { childService, type ChildProfile } from '@/services/child-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import type { ClubSquad, SquadMember } from '@/constants/types';
import type { ChildInfo, ChildContextValue } from '@/types/child-context';
import { CHILD_COLORS } from '@/types/child-context';
import type { ChildReference } from '@/constants/user-types';

const logger = createLogger('ChildContext');

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function calculateAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// ---------------------------------------------------------------------------
// Reconciliation Algorithm
// ---------------------------------------------------------------------------

/**
 * Merge ChildReference[] (auth) + ChildProfile[] (service) into ChildInfo[].
 *
 * Strategy:
 * 1. Resolve references first for backward compatibility.
 * 2. Match profiles by ID first, then full name, then first name.
 * 3. Include unmatched profiles so newly added children appear immediately.
 */
export function reconcileChildren(
  refs: ChildReference[],
  profiles: ChildProfile[],
): ChildInfo[] {
  const profileById = new Map<string, ChildProfile>();
  // Build name-indexed lookup for profiles
  const profileByFullName = new Map<string, ChildProfile>();
  const profileByFirstName = new Map<string, ChildProfile>();
  for (const p of profiles) {
    profileById.set(p.id, p);
    profileByFullName.set(`${p.firstName} ${p.lastName}`.toLowerCase(), p);
    // Only use first-name fallback if no collision
    const firstKey = p.firstName.toLowerCase();
    if (!profileByFirstName.has(firstKey)) {
      profileByFirstName.set(firstKey, p);
    }
  }

  const matchedProfileIds = new Set<string>();

  const children: ChildInfo[] = refs.map((ref, index) => {
    const refNameLower = ref.childName.toLowerCase();

    // Try ID match first (most reliable)
    let profile = profileById.get(ref.childId) ?? null;

    // Try exact full name match
    if (!profile) {
      profile = profileByFullName.get(refNameLower) ?? null;
    }

    // Try first-name fallback
    if (!profile) {
      const firstName = ref.childName.split(' ')[0]?.toLowerCase();
      if (firstName) {
        profile = profileByFirstName.get(firstName) ?? null;
      }
    }

    if (profile) {
      matchedProfileIds.add(profile.id);
    }

    const name = profile?.nickname || profile?.firstName || ref.childName.split(' ')[0];
    const fullName = profile
      ? `${profile.firstName} ${profile.lastName}`
      : ref.childName;

    return {
      id: ref.childId,
      referenceId: ref.childId,
      profileId: profile?.id ?? null,
      name,
      fullName,
      initials: getInitials(fullName),
      avatarUrl: profile?.photoUrl ?? null,
      age: calculateAge(profile?.dateOfBirth),
      dateOfBirth: profile?.dateOfBirth ?? null,
      colorCode: CHILD_COLORS[index % CHILD_COLORS.length],
      squadIds: [],
      clubIds: [],
      hasSpecialNeeds: profile?.hasSpecialNeeds ?? false,
      profile,
    };
  });

  // Include profile-only children (e.g. newly created child profile before auth refs update).
  const unmatchedProfiles = profiles.filter((profile) => !matchedProfileIds.has(profile.id));
  const offset = children.length;

  for (let i = 0; i < unmatchedProfiles.length; i += 1) {
    const profile = unmatchedProfiles[i];
    const fullName = `${profile.firstName} ${profile.lastName}`;
    const name = profile.nickname || profile.firstName || fullName;

    children.push({
      id: profile.id,
      referenceId: profile.id,
      profileId: profile.id,
      name,
      fullName,
      initials: getInitials(fullName),
      avatarUrl: profile.photoUrl ?? null,
      age: calculateAge(profile.dateOfBirth),
      dateOfBirth: profile.dateOfBirth ?? null,
      colorCode: CHILD_COLORS[(offset + i) % CHILD_COLORS.length],
      squadIds: [],
      clubIds: [],
      hasSpecialNeeds: profile.hasSpecialNeeds,
      profile,
    });
  }

  return children;
}

/**
 * Attach squad + club memberships for each child using squad membership storage.
 */
export function attachMembershipData(
  children: ChildInfo[],
  squads: ClubSquad[],
  squadMembers: SquadMember[],
): ChildInfo[] {
  if (children.length === 0 || squadMembers.length === 0) {
    return children;
  }

  const clubIdBySquadId = new Map<string, string>();
  for (const squad of squads) {
    clubIdBySquadId.set(squad.id, squad.clubId);
  }

  const squadIdsByAthleteId = new Map<string, Set<string>>();
  for (const member of squadMembers) {
    if (member.status !== 'ACTIVE') continue;
    const existing = squadIdsByAthleteId.get(member.athleteId) ?? new Set<string>();
    existing.add(member.squadId);
    squadIdsByAthleteId.set(member.athleteId, existing);
  }

  return children.map((child) => {
    const athleteIds = new Set<string>([child.id, child.referenceId]);
    if (child.profileId) {
      athleteIds.add(child.profileId);
    }

    const squadIdSet = new Set<string>();
    for (const athleteId of athleteIds) {
      const membershipSquads = squadIdsByAthleteId.get(athleteId);
      if (!membershipSquads) continue;
      for (const squadId of membershipSquads) {
        squadIdSet.add(squadId);
      }
    }

    const clubIdSet = new Set<string>();
    for (const squadId of squadIdSet) {
      const clubId = clubIdBySquadId.get(squadId);
      if (clubId) {
        clubIdSet.add(clubId);
      }
    }

    return {
      ...child,
      squadIds: Array.from(squadIdSet),
      clubIds: Array.from(clubIdSet),
    };
  });
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ChildContext = createContext<ChildContextValue | undefined>(undefined);

interface ChildProviderProps {
  children: ReactNode;
}

export function ChildProvider({ children: reactChildren }: ChildProviderProps) {
  const { currentUser } = useAuth();
  const [childInfos, setChildInfos] = useState<ChildInfo[]>([]);
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);
  const [profileModeState, setProfileModeState] = useState<'self' | 'child'>('child');
  const [profileChildIdState, setProfileChildIdState] = useState<string | null>(null);
  const [selfProfileSelectionEnabled, setSelfProfileSelectionEnabled] = useState(false);
  const [selfProfileSelectionLoaded, setSelfProfileSelectionLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const childRefs = useMemo(() => currentUser?.children ?? [], [currentUser?.children]);
  const userId = currentUser?.id;
  const isParentUser = Boolean(currentUser?.hasChildren || childRefs.length > 0);

  // Main load function
  const loadChildren = useCallback(async () => {
    if (!userId) {
      setChildInfos([]);
      setActiveChildIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch profiles + active ID in parallel
      const [profiles, storedActiveId, squads, squadMembers] = await Promise.all([
        childService.getChildren(userId),
        childService.getActiveChildId(),
        apiClient.get<ClubSquad[]>(STORAGE_KEYS.CLUB_SQUADS, []),
        apiClient.get<SquadMember[]>(STORAGE_KEYS.SQUAD_MEMBERS, []),
      ]);

      if (!mountedRef.current) return;

      // Reconcile
      const reconciled = reconcileChildren(childRefs, profiles);
      const withMembership = attachMembershipData(reconciled, squads, squadMembers);
      setChildInfos(withMembership);

      // Validate and set active child
      if (storedActiveId && withMembership.some((c) => c.id === storedActiveId)) {
        setActiveChildIdState(storedActiveId);
      } else if (withMembership.length === 1) {
        // Auto-select only child
        setActiveChildIdState(withMembership[0].id);
      } else {
        // Multi-child: null = "All" mode
        setActiveChildIdState(null);
      }
    } catch (error) {
      logger.error('Failed to load children', error);
      if (!mountedRef.current) return;

      // Degraded mode: build from refs only
      const fallback = attachMembershipData(reconcileChildren(childRefs, []), [], []);
      setChildInfos(fallback);
      setActiveChildIdState(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [childRefs, isParentUser, userId]);

  // Load on mount and when user changes
  useEffect(() => {
    mountedRef.current = true;
    void loadChildren();
    return () => {
      mountedRef.current = false;
    };
  }, [loadChildren]);

  useEffect(() => {
    if (!userId) {
      setProfileModeState('child');
      setProfileChildIdState(null);
      setSelfProfileSelectionEnabled(false);
      setSelfProfileSelectionLoaded(false);
      return;
    }
    // App-session scoped profile mode should reset when account changes.
    setProfileModeState('child');
    setProfileChildIdState(null);
    setSelfProfileSelectionEnabled(false);
    setSelfProfileSelectionLoaded(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;
    setSelfProfileSelectionEnabled(false);
    setSelfProfileSelectionLoaded(false);

    void bookingSelfSettingService.isEnabled(userId).then((enabled) => {
      if (cancelled || !mountedRef.current) {
        return;
      }
      setSelfProfileSelectionEnabled(enabled);
      setSelfProfileSelectionLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    return onTyped(ServiceEvents.BOOKING_SELF_SETTING_CHANGED, (payload) => {
      if (payload.userId !== userId || !mountedRef.current) {
        return;
      }
      setSelfProfileSelectionEnabled(payload.enabled);
      setSelfProfileSelectionLoaded(true);
    });
  }, [userId]);

  // Subscribe to profile changes (create/update/delete)
  useEffect(() => {
    const unsub = onTyped(ServiceEvents.CHILD_PROFILES_UPDATED, () => {
      void loadChildren();
    });
    return unsub;
  }, [loadChildren]);

  // Subscribe to active child changes from elsewhere
  useEffect(() => {
    const unsub = onTyped(ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED, (payload) => {
      if (mountedRef.current) {
        setActiveChildIdState(payload.childId);
      }
    });
    return unsub;
  }, []);

  // Handlers
  const setActiveChildId = useCallback(
    async (childId: string | null) => {
      // Optimistic update
      setActiveChildIdState(childId);
      if (childId) {
        setProfileModeState('child');
        setProfileChildIdState(childId);
      }

      const childInfo = childId
        ? childInfos.find((c) => c.id === childId)
        : undefined;
      try {
        await childService.setActiveChildId(childId, childInfo?.name);
      } catch (error) {
        logger.error('Failed to persist active child', error);
      }
    },
    [childInfos],
  );

  // Derived values
  const childByIdMap = useMemo(() => {
    const map = new Map<string, ChildInfo>();
    for (const c of childInfos) {
      map.set(c.id, c);
    }
    return map;
  }, [childInfos]);

  const childByRefIdMap = useMemo(() => {
    const map = new Map<string, ChildInfo>();
    for (const c of childInfos) {
      map.set(c.referenceId, c);
    }
    return map;
  }, [childInfos]);

  const getChildById = useCallback(
    (childId: string): ChildInfo | undefined => childByIdMap.get(childId),
    [childByIdMap],
  );

  const getChildByReferenceId = useCallback(
    (refId: string): ChildInfo | undefined => childByRefIdMap.get(refId),
    [childByRefIdMap],
  );

  const resolveValidChildId = useCallback(
    (candidate: string | null | undefined): string | null => {
      if (!candidate) return null;
      return childByIdMap.has(candidate) ? candidate : null;
    },
    [childByIdMap],
  );

  const familyAthleteIds = useMemo(
    () => new Set(childInfos.map((c) => c.referenceId)),
    [childInfos],
  );

  const canSelectSelfProfile = childInfos.length === 0 || selfProfileSelectionEnabled;

  const activeChild = useMemo(
    () => (activeChildId ? childByIdMap.get(activeChildId) ?? null : null),
    [activeChildId, childByIdMap],
  );

  const isMultiChild = childInfos.length >= 2;

  const profileResolution = useMemo(() => {
    const validProfileChildId = resolveValidChildId(profileChildIdState);
    const validActiveChildId = resolveValidChildId(activeChildId);
    const selfProfileAllowed = childInfos.length === 0 || selfProfileSelectionEnabled;

    if (profileModeState === 'self') {
      if (!selfProfileAllowed) {
        const fallbackChildId =
          validProfileChildId ?? validActiveChildId ?? childInfos[0]?.id ?? null;
        if (fallbackChildId) {
          return {
            mode: 'child' as const,
            subjectId: fallbackChildId,
            fallbackReason: 'self_profile_disabled_fallback_child',
          };
        }
      }

      if (userId) {
        return {
          mode: 'self' as const,
          subjectId: userId,
          fallbackReason: null as string | null,
        };
      }

      const fallbackChildId =
        validProfileChildId ?? validActiveChildId ?? childInfos[0]?.id ?? null;
      if (fallbackChildId) {
        return {
          mode: 'child' as const,
          subjectId: fallbackChildId,
          fallbackReason: 'missing_user_fallback_child',
        };
      }

      return {
        mode: 'self' as const,
        subjectId: null,
        fallbackReason: 'missing_user_context',
      };
    }

    const childId = validProfileChildId ?? validActiveChildId ?? childInfos[0]?.id ?? null;
    if (childId) {
      return {
        mode: 'child' as const,
        subjectId: childId,
        fallbackReason: validProfileChildId ? null : 'invalid_child_scope_fallback',
      };
    }

    if (userId) {
      return {
        mode: 'self' as const,
        subjectId: userId,
        fallbackReason: 'no_children_fallback_self',
      };
    }

    return {
      mode: 'child' as const,
      subjectId: null,
      fallbackReason: 'missing_user_context',
    };
  }, [
    activeChildId,
    childInfos,
    profileChildIdState,
    profileModeState,
    resolveValidChildId,
    selfProfileSelectionEnabled,
    userId,
  ]);

  const setProfileScope = useCallback(
    async (next: { mode: 'self' | 'child'; childId?: string | null }) => {
      const previousMode = profileModeState;
      let nextMode: 'self' | 'child' = next.mode;
      let subjectId: string | null = null;
      let fallbackReason: string | null = null;
      const selfProfileAllowed = childInfos.length === 0 || selfProfileSelectionEnabled;

      if (next.mode === 'self') {
        if (!selfProfileAllowed) {
          const fallbackChildId =
            resolveValidChildId(next.childId) ??
            resolveValidChildId(profileChildIdState) ??
            resolveValidChildId(activeChildId) ??
            childInfos[0]?.id ??
            null;
          if (fallbackChildId) {
            nextMode = 'child';
            subjectId = fallbackChildId;
            fallbackReason = 'self_profile_disabled_fallback_child';
            setProfileModeState('child');
            setProfileChildIdState(fallbackChildId);
            if (activeChildId !== fallbackChildId) {
              await setActiveChildId(fallbackChildId);
            }
            logger.debug('Blocked self profile scope update because self selection is disabled', {
              requestedChildId: next.childId ?? null,
              fallbackChildId,
            });
            return;
          }
        }

        if (userId) {
          setProfileModeState('self');
          if (next.childId) {
            setProfileChildIdState(next.childId);
          }
          subjectId = userId;
        } else {
          const fallbackChildId =
            resolveValidChildId(next.childId) ??
            resolveValidChildId(profileChildIdState) ??
            resolveValidChildId(activeChildId) ??
            childInfos[0]?.id ??
            null;
          if (fallbackChildId) {
            nextMode = 'child';
            subjectId = fallbackChildId;
            fallbackReason = 'missing_user_fallback_child';
            setProfileModeState('child');
            setProfileChildIdState(fallbackChildId);
            if (activeChildId !== fallbackChildId) {
              await setActiveChildId(fallbackChildId);
            }
          } else {
            setProfileModeState('self');
            setProfileChildIdState(null);
            subjectId = null;
            fallbackReason = 'missing_user_context';
          }
        }
      } else {
        const resolvedChildId =
          resolveValidChildId(next.childId) ??
          resolveValidChildId(profileChildIdState) ??
          resolveValidChildId(activeChildId) ??
          childInfos[0]?.id ??
          null;

        if (resolvedChildId) {
          nextMode = 'child';
          subjectId = resolvedChildId;
          setProfileModeState('child');
          setProfileChildIdState(resolvedChildId);
          if (activeChildId !== resolvedChildId) {
            await setActiveChildId(resolvedChildId);
          }
        } else if (userId) {
          nextMode = 'self';
          subjectId = userId;
          fallbackReason = 'no_children_fallback_self';
          setProfileModeState('self');
          setProfileChildIdState(null);
        } else {
          nextMode = 'child';
          subjectId = null;
          fallbackReason = 'missing_user_context';
          setProfileModeState('child');
          setProfileChildIdState(null);
        }
      }

      logger.debug('Profile scope updated', {
        previousMode,
        requestedMode: next.mode,
        nextMode,
        subjectId,
        fallbackReason,
        requestedChildId: next.childId ?? null,
      });
    },
    [
      activeChildId,
      childInfos,
      profileChildIdState,
      profileModeState,
      resolveValidChildId,
      selfProfileSelectionEnabled,
      setActiveChildId,
      userId,
    ],
  );

  useEffect(() => {
    if (!profileResolution.fallbackReason) {
      return;
    }
    logger.debug('Profile scope fallback applied', {
      mode: profileResolution.mode,
      subjectId: profileResolution.subjectId,
      fallbackReason: profileResolution.fallbackReason,
      activeChildId,
      profileChildIdState,
      profileModeState,
    });
  }, [
    activeChildId,
    profileChildIdState,
    profileModeState,
    profileResolution.fallbackReason,
    profileResolution.mode,
    profileResolution.subjectId,
  ]);

  const refresh = useCallback(async () => {
    await loadChildren();
  }, [loadChildren]);

  const value = useMemo<ChildContextValue>(
    () => ({
      children: childInfos,
      activeChildId,
      activeChild,
      setActiveChildId,
      profileMode: profileResolution.mode,
      profileSubjectId: profileResolution.subjectId,
      canSelectSelfProfile,
      selfProfileSelectionLoaded,
      setProfileScope,
      isMultiChild,
      isParent: isParentUser || childInfos.length > 0,
      getChildById,
      getChildByReferenceId,
      familyAthleteIds,
      loading,
      refresh,
    }),
    [
      childInfos,
      activeChildId,
      activeChild,
      setActiveChildId,
      profileResolution.mode,
      profileResolution.subjectId,
      canSelectSelfProfile,
      selfProfileSelectionLoaded,
      setProfileScope,
      isMultiChild,
      isParentUser,
      getChildById,
      getChildByReferenceId,
      familyAthleteIds,
      loading,
      refresh,
    ],
  );

  return (
    <ChildContext.Provider value={value}>
      {reactChildren}
    </ChildContext.Provider>
  );
}

export function useChildContext(): ChildContextValue {
  const context = useContext(ChildContext);
  if (!context) {
    throw new Error('useChildContext must be used within a ChildProvider');
  }
  return context;
}
