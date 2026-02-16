"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitials = getInitials;
exports.reconcileChildren = reconcileChildren;
exports.ChildProvider = ChildProvider;
exports.useChildContext = useChildContext;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Child Context — centralized source of truth for "who are this parent's children?"
 *
 * Reconciles two incompatible data sources:
 * - ChildReference (auth, sync): childId/childName from currentUser.children
 * - ChildProfile (service, async): rich profile data from childService
 *
 * Provides useChildContext() hook for all child-aware screens (Phases 2-7).
 */
const react_1 = require("react");
const use_auth_1 = require("@/hooks/use-auth");
const child_service_1 = require("@/services/child-service");
const event_bus_1 = require("@/services/event-bus");
const logger_1 = require("@/utils/logger");
const child_context_1 = require("@/types/child-context");
const logger = (0, logger_1.createLogger)('ChildContext');
// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function getInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0)
        return '?';
    if (parts.length === 1)
        return parts[0][0]?.toUpperCase() ?? '?';
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
function calculateAge(dateOfBirth) {
    if (!dateOfBirth)
        return null;
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
function reconcileChildren(refs, profiles) {
    // Build name-indexed lookup for profiles
    const profileByFullName = new Map();
    const profileByFirstName = new Map();
    for (const p of profiles) {
        profileByFullName.set(`${p.firstName} ${p.lastName}`.toLowerCase(), p);
        // Only use first-name fallback if no collision
        const firstKey = p.firstName.toLowerCase();
        if (!profileByFirstName.has(firstKey)) {
            profileByFirstName.set(firstKey, p);
        }
    }
    const matchedProfileIds = new Set();
    const children = refs.map((ref, index) => {
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
            colorCode: child_context_1.CHILD_COLORS[index % child_context_1.CHILD_COLORS.length],
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
const ChildContext = (0, react_1.createContext)(undefined);
function ChildProvider({ children: reactChildren }) {
    const { currentUser } = (0, use_auth_1.useAuth)();
    const [childInfos, setChildInfos] = (0, react_1.useState)([]);
    const [activeChildId, setActiveChildIdState] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const mountedRef = (0, react_1.useRef)(true);
    const childRefs = currentUser?.children;
    const userId = currentUser?.id;
    const isParentUser = Boolean(childRefs && childRefs.length > 0);
    // Main load function
    const loadChildren = (0, react_1.useCallback)(async () => {
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
                child_service_1.childService.getChildren(userId),
                child_service_1.childService.getActiveChildId(),
            ]);
            if (!mountedRef.current)
                return;
            // Reconcile
            const reconciled = reconcileChildren(childRefs, profiles);
            setChildInfos(reconciled);
            // Validate and set active child
            if (storedActiveId && reconciled.some((c) => c.id === storedActiveId)) {
                setActiveChildIdState(storedActiveId);
            }
            else if (reconciled.length === 1) {
                // Auto-select only child
                setActiveChildIdState(reconciled[0].id);
            }
            else {
                // Multi-child: null = "All" mode
                setActiveChildIdState(null);
            }
        }
        catch (error) {
            logger.error('Failed to load children', error);
            if (!mountedRef.current)
                return;
            // Degraded mode: build from refs only
            const fallback = reconcileChildren(childRefs, []);
            setChildInfos(fallback);
            setActiveChildIdState(null);
        }
        finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [userId, childRefs]);
    // Load on mount and when user changes
    (0, react_1.useEffect)(() => {
        mountedRef.current = true;
        void loadChildren();
        return () => {
            mountedRef.current = false;
        };
    }, [loadChildren]);
    // Subscribe to profile changes (create/update/delete)
    (0, react_1.useEffect)(() => {
        const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.CHILD_PROFILES_UPDATED, () => {
            void loadChildren();
        });
        return unsub;
    }, [loadChildren]);
    // Subscribe to active child changes from elsewhere
    (0, react_1.useEffect)(() => {
        const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED, (payload) => {
            if (mountedRef.current) {
                setActiveChildIdState(payload.childId);
            }
        });
        return unsub;
    }, []);
    // Handlers
    const setActiveChildId = (0, react_1.useCallback)(async (childId) => {
        // Optimistic update
        setActiveChildIdState(childId);
        const childInfo = childId
            ? childInfos.find((c) => c.id === childId)
            : undefined;
        try {
            await child_service_1.childService.setActiveChildId(childId, childInfo?.name);
        }
        catch (error) {
            logger.error('Failed to persist active child', error);
        }
    }, [childInfos]);
    // Derived values
    const childByIdMap = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const c of childInfos) {
            map.set(c.id, c);
        }
        return map;
    }, [childInfos]);
    const childByRefIdMap = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const c of childInfos) {
            map.set(c.referenceId, c);
        }
        return map;
    }, [childInfos]);
    const getChildById = (0, react_1.useCallback)((childId) => childByIdMap.get(childId), [childByIdMap]);
    const getChildByReferenceId = (0, react_1.useCallback)((refId) => childByRefIdMap.get(refId), [childByRefIdMap]);
    const familyAthleteIds = (0, react_1.useMemo)(() => new Set(childInfos.map((c) => c.referenceId)), [childInfos]);
    const activeChild = (0, react_1.useMemo)(() => (activeChildId ? childByIdMap.get(activeChildId) ?? null : null), [activeChildId, childByIdMap]);
    const isMultiChild = childInfos.length >= 2;
    const refresh = (0, react_1.useCallback)(async () => {
        await loadChildren();
    }, [loadChildren]);
    const value = (0, react_1.useMemo)(() => ({
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
    }), [
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
    ]);
    return ((0, jsx_runtime_1.jsx)(ChildContext.Provider, { value: value, children: reactChildren }));
}
function useChildContext() {
    const context = (0, react_1.useContext)(ChildContext);
    if (!context) {
        throw new Error('useChildContext must be used within a ChildProvider');
    }
    return context;
}
