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
import type { ChildInfo, ChildContextValue } from '@/types/child-context';

import { runAsyncTryCatchFinally } from '@/utils/async-control';
import { attachLiveSquadMemberships, reconcileChildren } from './child-context-helpers';

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
  setChildInfos: (value: ChildInfo[]) => void;
  setActiveChildIdState: (value: string | null) => void;
  setLoading: (value: boolean) => void;
}

async function loadChildrenIntoState({
  userId,
  childRefs,
  mountedRef,
  setChildInfos,
  setActiveChildIdState,
  setLoading,
}: {
  userId: string | undefined;
  childRefs: ChildReference[];
} & ChildLoaderTargets) {
  if (!userId) {
    setChildInfos([]);
    setActiveChildIdState(null);
    setLoading(false);
    return;
  }

  setLoading(true);

  return await runAsyncTryCatchFinally(
    async () => {
      const [profiles, storedActiveId] = await Promise.all([
        childService.getChildren(userId),
        childService.getActiveChildId(),
      ]);

      if (mountedRef.current) {
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
              logger.warn('Failed to load child squad memberships', {
                athleteId,
                error: result.error.message,
              });
              return;
            }
            membershipsByAthleteId.set(athleteId, result.data);
          }),
        );
        if (!mountedRef.current) {
          return;
        }
        const withMembership = attachLiveSquadMemberships(reconciled, membershipsByAthleteId);
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
      }
    },
    async (error) => {
      logger.error('Failed to load children', error);
      if (!mountedRef.current) return;

      // Degraded mode: build from refs only
      const fallback = reconcileChildren(childRefs, []);
      setChildInfos(fallback);
      setActiveChildIdState(null);
    },
    () => {
      if (mountedRef.current) {
        setLoading(false);
      }
    },
  );
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

  const childRefs = currentUser?.children ?? EMPTY_CHILD_REFS;
  const userId = currentUser?.id;
  const isParentUser = Boolean(currentUser?.hasChildren || childRefs.length > 0);

  // Load on mount and when user changes
  useEffect(() => {
    mountedRef.current = true;
    void loadChildrenIntoState({
      userId,
      childRefs,
      mountedRef,
      setChildInfos,
      setActiveChildIdState,
      setLoading,
    });
    return () => {
      mountedRef.current = false;
    };
  }, [childRefs, userId]);

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

    void bookingSelfSettingService.isEnabled(userId).then((enabled) => {
      if (cancelled || !mountedRef.current) {
        return;
      }
      startTransition(() => {
        setSelfProfileSelectionEnabled(enabled);
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
    const unsub = onTyped(ServiceEvents.CHILD_PROFILES_UPDATED, () => {
      void loadChildrenIntoState({
        userId,
        childRefs,
        mountedRef,
        setChildInfos,
        setActiveChildIdState,
        setLoading,
      });
    });
    return unsub;
  }, [childRefs, userId]);

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

    const childInfo = childId ? childInfos.find((c) => c.id === childId) : undefined;
    try {
      await childService.setActiveChildId(childId, childInfo?.name);
    } catch (error) {
      logger.error('Failed to persist active child', error);
    }
  };

  // Derived values
  const childByIdMap = (() => {
    const map = new Map<string, ChildInfo>();
    for (const c of childInfos) {
      map.set(c.id, c);
    }
    return map;
  })();

  const childByRefIdMap = (() => {
    const map = new Map<string, ChildInfo>();
    for (const c of childInfos) {
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

  const familyAthleteIds = new Set(childInfos.map((c) => c.referenceId));

  const canSelectSelfProfile = childInfos.length === 0 || selfProfileSelectionEnabled;

  const activeChild = activeChildId ? (childByIdMap.get(activeChildId) ?? null) : null;

  const isMultiChild = childInfos.length >= 2;

  const profileResolution = (() => {
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
  })();

  const setProfileScope = async (next: { mode: 'self' | 'child'; childId?: string | null }) => {
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
    await loadChildrenIntoState({
      userId,
      childRefs,
      mountedRef,
      setChildInfos,
      setActiveChildIdState,
      setLoading,
    });
  };

  const value = {
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
