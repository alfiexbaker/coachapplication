/**
 * Child Context Types
 *
 * Unified child identity types for the multi-child parent experience.
 * ChildInfo reconciles ChildReference (auth, sync) + ChildProfile (service, async)
 * into a single type consumed by all UI components.
 */

import type { ChildProfile } from '@/services/child-service';

/**
 * Unified child identity — reconciled from ChildReference (auth) + ChildProfile (service).
 * This is THE type that all UI components consume.
 */
export interface ChildInfo {
  /** Primary ID — uses ChildReference.childId for backward compat (e.g. 'user1') */
  id: string;

  /** ChildReference.childId (auth-layer ID). Always present for parents. */
  referenceId: string;

  /** ChildProfile.id (service-layer ID, e.g. 'child-1'). Null if no profile exists. */
  profileId: string | null;

  /** Display name: nickname || firstName || childName from ref */
  name: string;

  /** Full name: "firstName lastName" from profile, or childName from ref */
  fullName: string;

  /** Initials derived from fullName (e.g. "TH") */
  initials: string;

  /** Profile photo URL from ChildProfile.photoUrl */
  avatarUrl: string | null;

  /** Calculated age from dateOfBirth, or null */
  age: number | null;

  /** ISO date string from profile, or null */
  dateOfBirth: string | null;

  /** Stable color for visual identity (assigned by index from CHILD_COLORS) */
  colorCode: string;

  /** Squad IDs this child belongs to (populated in P6, empty initially) */
  squadIds: string[];

  /** Club IDs this child belongs to (populated in P6, empty initially) */
  clubIds: string[];

  /** Quick flag from profile */
  hasSpecialNeeds: boolean;

  /** Full ChildProfile when available (for screens needing medical/disability details) */
  profile: ChildProfile | null;
}

/**
 * Context value exposed by useChildContext().
 * This is the ONLY interface phases 2-7 should import for child data.
 */
export interface ChildContextValue {
  /** All reconciled children for the current parent. Empty array for non-parents. */
  children: ChildInfo[];

  /** Currently active child ID (ChildInfo.id). Null = "All" mode or no selection. */
  activeChildId: string | null;

  /** The active ChildInfo object, or null. */
  activeChild: ChildInfo | null;

  /** Set the active child. Pass null for "All" mode. Persists to storage + emits event. */
  setActiveChildId: (childId: string | null) => Promise<void>;

  /** True if parent has 2+ children */
  isMultiChild: boolean;

  /** True if currentUser has any children (1+) */
  isParent: boolean;

  /** O(1) lookup by ChildInfo.id. Returns undefined if not found. */
  getChildById: (childId: string) => ChildInfo | undefined;

  /** O(1) lookup by referenceId. For backward compat with ChildReference.childId consumers. */
  getChildByReferenceId: (refId: string) => ChildInfo | undefined;

  /** Set of all ChildInfo.referenceId values. For calendar conflict checking (P5). */
  familyAthleteIds: ReadonlySet<string>;

  /** True while initial load is in progress */
  loading: boolean;

  /** Force re-fetch from service */
  refresh: () => Promise<void>;
}

/** Fixed palette for child color coding (wraps around for 7+ children) */
export const CHILD_COLORS = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#10B981', // Emerald
] as const;
