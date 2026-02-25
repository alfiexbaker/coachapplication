/**
 * Hook to resolve denormalized booking fields (coachName, athleteNames, bookedByName).
 *
 * During the API migration, Booking objects may arrive without embedded name fields.
 * This hook resolves names from IDs, falling back to the embedded values when available.
 *
 * Usage:
 *   const { coachName, athleteNames, bookedByName } = useResolvedBooking(booking);
 */

import { useState, useEffect } from 'react';
import type { Booking } from '@/constants/app-types';

interface ResolvedBookingNames {
  coachName: string;
  athleteNames: string[];
  bookedByName: string;
  isResolved: boolean;
}

/**
 * Resolve user name from ID via userService.
 * Falls back to provided fallback if lookup fails.
 */
async function resolveUserName(
  userId: string | undefined,
  fallback: string,
): Promise<string> {
  if (!userId) return fallback;

  try {
    // Lazy import to avoid circular deps
    const { userService } = require('@/services/user-service') as {
      userService: { getUserById: (id: string) => Promise<{ success: boolean; data?: { name?: string; firstName?: string; lastName?: string } }> };
    };

    const result = await userService.getUserById(userId);
    if (result.success && result.data) {
      const user = result.data;
      return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || fallback;
    }
  } catch {
    // Fall through to fallback
  }

  return fallback;
}

/**
 * Resolve booking name fields from IDs, falling back to embedded values.
 */
export function useResolvedBooking(booking: Booking | null | undefined): ResolvedBookingNames {
  const [resolved, setResolved] = useState<ResolvedBookingNames>({
    coachName: booking?.coachName || 'Coach',
    athleteNames: booking?.athleteNames || [],
    bookedByName: booking?.bookedByName || '',
    isResolved: false,
  });

  useEffect(() => {
    if (!booking) return;

    // If all embedded names are present, no resolution needed
    if (booking.coachName && booking.athleteNames?.length && booking.bookedByName) {
      setResolved({
        coachName: booking.coachName,
        athleteNames: booking.athleteNames,
        bookedByName: booking.bookedByName,
        isResolved: true,
      });
      return;
    }

    let cancelled = false;

    async function resolve() {
      const [coachName, bookedByName] = await Promise.all([
        booking!.coachName
          ? Promise.resolve(booking!.coachName)
          : resolveUserName(booking!.coachId, 'Coach'),
        booking!.bookedByName
          ? Promise.resolve(booking!.bookedByName)
          : resolveUserName(booking!.bookedById, 'Booker'),
      ]);

      // Resolve athlete names
      let athleteNames = booking!.athleteNames || [];
      if (athleteNames.length === 0 && booking!.athleteIds?.length) {
        const resolved = await Promise.all(
          booking!.athleteIds.map((id) => resolveUserName(id, 'Athlete')),
        );
        athleteNames = resolved;
      }

      if (!cancelled) {
        setResolved({ coachName, athleteNames, bookedByName, isResolved: true });
      }
    }

    resolve();

    return () => {
      cancelled = true;
    };
  }, [booking?.id, booking?.coachId, booking?.coachName]);

  return resolved;
}

/**
 * Non-hook version for use in services and utilities.
 * Resolves a single booking's name fields.
 */
export async function resolveBookingNames(booking: Booking): Promise<{
  coachName: string;
  athleteNames: string[];
  bookedByName: string;
}> {
  const [coachName, bookedByName] = await Promise.all([
    booking.coachName
      ? Promise.resolve(booking.coachName)
      : resolveUserName(booking.coachId, 'Coach'),
    booking.bookedByName
      ? Promise.resolve(booking.bookedByName)
      : resolveUserName(booking.bookedById, 'Booker'),
  ]);

  let athleteNames = booking.athleteNames || [];
  if (athleteNames.length === 0 && booking.athleteIds?.length) {
    athleteNames = await Promise.all(
      booking.athleteIds.map((id) => resolveUserName(id, 'Athlete')),
    );
  }

  return { coachName, athleteNames, bookedByName };
}
