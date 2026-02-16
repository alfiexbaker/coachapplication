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
import { childService, type ChildProfile } from '@/services/child-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
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
 * 1. ChildReference[] is source of truth for "which children this parent has"
 * 2. Match profiles to refs by name (IDs don't align between sources)
 * 3. If no profile match, build ChildInfo from ref alone (degraded but usable)
 */
export function reconcileChildren(
  refs: ChildReference[],
  profiles: ChildProfile[],
): ChildInfo[] {
  // Build name-indexed lookup for profiles
  const profileByFullName = new Map<string, ChildProfile>();
  const profileByFirstName = new Map<string, ChildProfile>();
  for (const p of profiles) {
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

    // Try exact full name match
    let profile = profileByFullName.get(refNameLower) ?? null;

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

  return children;
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
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const childRefs = currentUser?.children;
  const userId = currentUser?.id;
  const isParentUser = Boolean(childRefs && childRefs.length > 0);

  // Main load function
  const loadChildren = useCallback(async () => {
    if (!userId || !childRefs || childRefs.length === 0) {
      setChildInfos([]);
      setActiveChildIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch profiles + active ID in parallel
      const [profiles, storedActiveId] = await Promise.all([
        childService.getChildren(userId),
        childService.getActiveChildId(),
      ]);

      if (!mountedRef.current) return;

      // Reconcile
      const reconciled = reconcileChildren(childRefs, profiles);
      setChildInfos(reconciled);

      // Validate and set active child
      if (storedActiveId && reconciled.some((c) => c.id === storedActiveId)) {
        setActiveChildIdState(storedActiveId);
      } else if (reconciled.length === 1) {
        // Auto-select only child
        setActiveChildIdState(reconciled[0].id);
      } else {
        // Multi-child: null = "All" mode
        setActiveChildIdState(null);
      }
    } catch (error) {
      logger.error('Failed to load children', error);
      if (!mountedRef.current) return;

      // Degraded mode: build from refs only
      const fallback = reconcileChildren(childRefs, []);
      setChildInfos(fallback);
      setActiveChildIdState(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, childRefs]);

  // Load on mount and when user changes
  useEffect(() => {
    mountedRef.current = true;
    void loadChildren();
    return () => {
      mountedRef.current = false;
    };
  }, [loadChildren]);

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

  const familyAthleteIds = useMemo(
    () => new Set(childInfos.map((c) => c.referenceId)),
    [childInfos],
  );

  const activeChild = useMemo(
    () => (activeChildId ? childByIdMap.get(activeChildId) ?? null : null),
    [activeChildId, childByIdMap],
  );

  const isMultiChild = childInfos.length >= 2;

  const refresh = useCallback(async () => {
    await loadChildren();
  }, [loadChildren]);

  const value = useMemo<ChildContextValue>(
    () => ({
      children: childInfos,
      activeChildId,
      activeChild,
      setActiveChildId,
      isMultiChild,
      isParent: isParentUser,
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
