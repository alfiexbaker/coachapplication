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
  useEffect,
  useState,
  useRef,
  type ReactNode,
  type MutableRefObject,
  startTransition,
  use,
} from 'react';
import { useAuth } from '@/hooks/use-auth';
import { bookingSelfSettingService } from '@/services/booking-self-setting-service';
import { childService, type ChildSquadMembership } from '@/services/child-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import type { ChildReference } from '@/constants/user-types';
import { createLogger } from '@/utils/logger';
import { isBrowserFetchFailure } from '@/utils/network-errors';
import type { ChildInfo, ChildContextValue } from '@/types/child-context';

import { runAsyncTryCatchFinally } from '@/utils/async-control';
import {
  attachLiveSquadMemberships,
  reconcileChildren,
  scopeChildrenToCurrentUser,
  shouldLoadFamilyChildren,
} from './child-context-helpers';

const logger = createLogger('ChildContext');
const EMPTY_CHILD_REFS: ChildReference[] = [];

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ChildContext = createContext<ChildContextValue | undefined>(undefined);

interface ChildProviderProps {
  children: ReactNode;
}

interface ChildLoaderTargets {
  mountedRef: MutableRefObject<boolean>;
  activeUserIdRef: MutableRefObject<string | undefined>;
  setChildInfos: (value: ChildInfo[]) => void;
  setChildInfosOwnerUserId: (value: string | null) => void;
  setActiveChildIdState: (value: string | null) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
}

async function loadChildrenIntoState({
  userId,
  childRefs,
  mountedRef,
  activeUserIdRef,
  setChildInfos,
  setChildInfosOwnerUserId,
  setActiveChildIdState,
  setLoading,
  setError,
}: {
  userId: string | undefined;
  childRefs: ChildReference[];
} & ChildLoaderTargets) {
  const isActiveUser = () => mountedRef.current && activeUserIdRef.current === userId;

  if (!isActiveUser()) {
    return;
  }

  if (!userId) {
    setChildInfos([]);
    setChildInfosOwnerUserId(null);
    setActiveChildIdState(null);
    setError(null);
    setLoading(false);
    return;
  }

  setLoading(true);
  setError(null);

  return await runAsyncTryCatchFinally(
    async () => {
      const [profiles, storedActiveId] = await Promise.all([
        childService.getChildren(userId, { includeTrustData: false }),
        childService.getActiveChildId(),
      ]);

      if (isActiveUser()) {
        // Reconcile
        const reconciled = reconcileChildren(childRefs, profiles);
        const membershipTargets = Array.from(
          new Set(
            reconciled.flatMap((child) => {
              const ids = [
                child.profileId,
                child.id.startsWith('ath_') ? child.id : null,
                child.referenceId.startsWith('ath_') ? child.referenceId : null,
              ];
              return ids.filter((id): id is string => Boolean(id));
            }),
          ),
        );
        const membershipsByAthleteId = new Map<string, ChildSquadMembership[]>();
        await Promise.all(
          membershipTargets.map(async (athleteId) => {
            const result = await childService.getSquadMemberships(athleteId);
            if (!result.success) {
              throw new Error(result.error.message);
            }
            membershipsByAthleteId.set(athleteId, result.data);
          }),
        );
        if (!isActiveUser()) {
          return;
        }
        const withMembership = attachLiveSquadMemberships(reconciled, membershipsByAthleteId);
        setError(null);
        setChildInfos(withMembership);
        setChildInfosOwnerUserId(userId);

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
      }
    },
    async (error) => {
      if (isBrowserFetchFailure(error)) {
        logger.warn('Children fetch was interrupted', error);
      } else {
        logger.error('Failed to load children', error);
      }
      if (!isActiveUser()) return;

      setError(error instanceof Error ? error.message : 'Failed to load children.');
      setChildInfos([]);
      setChildInfosOwnerUserId(null);
      setActiveChildIdState(null);
    },
    () => {
      if (isActiveUser()) {
        setLoading(false);
      }
    },
  );
}

export function ChildProvider({ children: reactChildren }: ChildProviderProps) {
  const { currentUser } = useAuth();
  const [childInfos, setChildInfos] = useState<ChildInfo[]>([]);
  const [childInfosOwnerUserId, setChildInfosOwnerUserId] = useState<string | null>(null);
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);
  const [profileModeState, setProfileModeState] = useState<'self' | 'child'>('child');
  const [profileChildIdState, setProfileChildIdState] = useState<string | null>(null);
  const [selfProfileSelectionEnabled, setSelfProfileSelectionEnabled] = useState(false);
  const [selfProfileSelectionLoaded, setSelfProfileSelectionLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const childRefs = currentUser?.children ?? EMPTY_CHILD_REFS;
  const userId = currentUser?.id;
  const activeUserIdRef = useRef<string | undefined>(userId);
  const isParentUser = shouldLoadFamilyChildren(currentUser);
  const scopedChildInfos = scopeChildrenToCurrentUser({
    children: childInfos,
    ownerUserId: childInfosOwnerUserId,
    currentUserId: userId,
    isParentUser,
  });

  // Load on mount and when user changes
  useEffect(() => {
    mountedRef.current = true;
    activeUserIdRef.current = userId;
    if (!isParentUser) {
      setChildInfos([]);
      setChildInfosOwnerUserId(null);
      setActiveChildIdState(null);
      setError(null);
      setLoading(false);
      return () => {
        if (activeUserIdRef.current === userId) {
          activeUserIdRef.current = undefined;
        }
        mountedRef.current = false;
      };
    }

    void loadChildrenIntoState({
      userId,
      childRefs,
      mountedRef,
      activeUserIdRef,
      setChildInfos,
      setChildInfosOwnerUserId,
      setActiveChildIdState,
      setLoading,
      setError,
    });
    return () => {
      if (activeUserIdRef.current === userId) {
        activeUserIdRef.current = undefined;
      }
      mountedRef.current = false;
    };
  }, [childRefs, isParentUser, userId]);

  useEffect(() => {
    if (!userId) {
      startTransition(() => {
        setProfileModeState('child');
      });
      startTransition(() => {
        setProfileChildIdState(null);
      });
      startTransition(() => {
        setSelfProfileSelectionEnabled(false);
      });
      startTransition(() => {
        setSelfProfileSelectionLoaded(false);
      });
      return;
    }
    startTransition(() => {
      // App-session scoped profile mode should reset when account changes.
      setProfileModeState('child');
    });
    startTransition(() => {
      setProfileChildIdState(null);
    });
    startTransition(() => {
      setSelfProfileSelectionEnabled(false);
    });
    startTransition(() => {
      setSelfProfileSelectionLoaded(false);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;
    startTransition(() => {
      setSelfProfileSelectionEnabled(false);
    });
    startTransition(() => {
      setSelfProfileSelectionLoaded(false);
    });

    void bookingSelfSettingService
      .isEnabled(userId)
      .then((enabled) => {
        if (cancelled || !mountedRef.current) {
          return;
        }
        startTransition(() => {
          setSelfProfileSelectionEnabled(enabled);
        });
        startTransition(() => {
          setSelfProfileSelectionLoaded(true);
        });
      })
      .catch((error) => {
        logger.warn('Failed to load self-booking setting', { userId, error });
        if (cancelled || !mountedRef.current) {
          return;
        }
        startTransition(() => {
          setSelfProfileSelectionEnabled(false);
        });
        startTransition(() => {
          setSelfProfileSelectionLoaded(true);
        });
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
    if (!isParentUser) {
      return;
    }

    const unsub = onTyped(ServiceEvents.CHILD_PROFILES_UPDATED, () => {
      void loadChildrenIntoState({
        userId,
        childRefs,
        mountedRef,
        activeUserIdRef,
        setChildInfos,
        setChildInfosOwnerUserId,
        setActiveChildIdState,
        setLoading,
        setError,
      });
    });
    return unsub;
  }, [childRefs, isParentUser, userId]);

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
  const setActiveChildId = async (childId: string | null) => {
    // Optimistic update
    setActiveChildIdState(childId);
    if (childId) {
      setProfileModeState('child');
      setProfileChildIdState(childId);
    }

    const childInfo = childId ? scopedChildInfos.find((c) => c.id === childId) : undefined;
    try {
      await childService.setActiveChildId(childId, childInfo?.name);
    } catch (error) {
      logger.error('Failed to persist active child', error);
    }
  };

  // Derived values
  const childByIdMap = (() => {
    const map = new Map<string, ChildInfo>();
    for (const c of scopedChildInfos) {
      map.set(c.id, c);
    }
    return map;
  })();

  const childByRefIdMap = (() => {
    const map = new Map<string, ChildInfo>();
    for (const c of scopedChildInfos) {
      map.set(c.referenceId, c);
    }
    return map;
  })();

  const getChildById = (childId: string): ChildInfo | undefined => childByIdMap.get(childId);

  const getChildByReferenceId = (refId: string): ChildInfo | undefined =>
    childByRefIdMap.get(refId);

  const resolveValidChildId = (candidate: string | null | undefined): string | null => {
    if (!candidate) return null;
    return childByIdMap.has(candidate) ? candidate : null;
  };

  const familyAthleteIds = new Set(scopedChildInfos.map((c) => c.referenceId));

  const canSelectSelfProfile = scopedChildInfos.length === 0 || selfProfileSelectionEnabled;

  const activeChild = activeChildId ? (childByIdMap.get(activeChildId) ?? null) : null;
  const scopedActiveChildId = activeChild?.id ?? null;

  const isMultiChild = scopedChildInfos.length >= 2;

  const profileResolution = (() => {
    const validProfileChildId = resolveValidChildId(profileChildIdState);
    const validActiveChildId = resolveValidChildId(activeChildId);
    const selfProfileAllowed = scopedChildInfos.length === 0 || selfProfileSelectionEnabled;

    if (profileModeState === 'self') {
      if (!selfProfileAllowed) {
        const fallbackChildId =
          validProfileChildId ?? validActiveChildId ?? scopedChildInfos[0]?.id ?? null;
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
        validProfileChildId ?? validActiveChildId ?? scopedChildInfos[0]?.id ?? null;
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

    const childId = validProfileChildId ?? validActiveChildId ?? scopedChildInfos[0]?.id ?? null;
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
  })();

  const setProfileScope = async (next: { mode: 'self' | 'child'; childId?: string | null }) => {
    const previousMode = profileModeState;
    let nextMode: 'self' | 'child' = next.mode;
    let subjectId: string | null = null;
    let fallbackReason: string | null = null;
    const selfProfileAllowed = scopedChildInfos.length === 0 || selfProfileSelectionEnabled;

    if (next.mode === 'self') {
      if (!selfProfileAllowed) {
        const fallbackChildId =
          resolveValidChildId(next.childId) ??
          resolveValidChildId(profileChildIdState) ??
          resolveValidChildId(activeChildId) ??
          scopedChildInfos[0]?.id ??
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
          scopedChildInfos[0]?.id ??
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
        scopedChildInfos[0]?.id ??
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
  };

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

  const refresh = async () => {
    if (!isParentUser) {
      setChildInfos([]);
      setChildInfosOwnerUserId(null);
      setActiveChildIdState(null);
      setError(null);
      setLoading(false);
      return;
    }

    await loadChildrenIntoState({
      userId,
      childRefs,
      mountedRef,
      activeUserIdRef,
      setChildInfos,
      setChildInfosOwnerUserId,
      setActiveChildIdState,
      setLoading,
      setError,
    });
  };

  const value = {
    children: scopedChildInfos,
    activeChildId: scopedActiveChildId,
    activeChild,
    setActiveChildId,
    profileMode: profileResolution.mode,
    profileSubjectId: profileResolution.subjectId,
    canSelectSelfProfile,
    selfProfileSelectionLoaded,
    setProfileScope,
    isMultiChild,
    isParent: isParentUser || scopedChildInfos.length > 0,
    getChildById,
    getChildByReferenceId,
    familyAthleteIds,
    loading,
    error,
    refresh,
  };

  return <ChildContext.Provider value={value}>{reactChildren}</ChildContext.Provider>;
}

export function useChildContext(): ChildContextValue {
  const context = use(ChildContext);
  if (!context) {
    throw new Error('useChildContext must be used within a ChildProvider');
  }
  return context;
}
