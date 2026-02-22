/**
 * Availability Service
 *
 * Handles coach availability management including recurring templates and overrides.
 * This enables real scheduling that syncs with the booking system.
 *
 * API Integration Notes:
 * - GET /api/coaches/:id/availability?start=X&end=Y - Get available slots
 * - PUT /api/coaches/:id/availability/template - Set recurring template
 * - POST /api/coaches/:id/availability/override - Add exception
 * - WebSocket event: availability_updated
 */

import { apiClient } from './api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type {
  AvailabilityTemplate,
  AvailabilityOverride,
  AvailabilitySlot,
  SessionOffering,
} from '@/constants/types';
import type { Booking, BookingStatus } from '@/constants/app-types';
import { DAY_NAMES } from '@/constants/booking-types';
import { inviteHoldService } from './invite-hold-service';
import { sessionTemplateService } from './session-template-service';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import type { Result, ServiceError } from '@/types/result';
import { ok, err, storageError } from '@/types/result';
import { userService } from './user-service';

const logger = createLogger('AvailabilityService');
const USE_MOCK = api.useMock;

// Helper to load existing bookings from storage
async function loadBookings(): Promise<Booking[]> {
  try {
    return await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
  } catch (error) {
    logger.error('Failed to load bookings', error);
  }
  return [];
}

// Helper to load session offerings from storage
async function loadSessionOfferings(): Promise<SessionOffering[]> {
  try {
    return await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
  } catch (error) {
    logger.error('Failed to load session offerings', error);
  }
  return [];
}

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;

  const name = userResult.data.name?.trim();
  return name || fallback;
}

async function resolveBookingAthleteName(booking: Booking): Promise<string | undefined> {
  const athleteId = booking.athleteIds?.[0] ?? booking.athleteId;
  if (!athleteId) return undefined;
  return resolveUserName(athleteId, 'Athlete');
}

// Mock templates for development - coach availability
const MOCK_TEMPLATES: AvailabilityTemplate[] = [
  // Coach 1 - Jess Okafor (Goalkeeping)
  {
    id: 'tmpl_1',
    coachId: 'coach1',
    dayOfWeek: 1, // Monday
    startTime: '16:00',
    endTime: '19:00',
    isRecurring: true,
    maxConcurrent: 1,
    bufferMinutes: 15,
    location: 'Hyde Park',
  },
  {
    id: 'tmpl_2',
    coachId: 'coach1',
    dayOfWeek: 3, // Wednesday
    startTime: '16:00',
    endTime: '19:00',
    isRecurring: true,
    maxConcurrent: 1,
    bufferMinutes: 15,
    location: 'Hyde Park',
  },
  {
    id: 'tmpl_3',
    coachId: 'coach1',
    dayOfWeek: 5, // Friday
    startTime: '15:00',
    endTime: '18:00',
    isRecurring: true,
    maxConcurrent: 1,
    bufferMinutes: 15,
    location: "Regent's Park",
  },
  {
    id: 'tmpl_4',
    coachId: 'coach1',
    dayOfWeek: 6, // Saturday
    startTime: '09:00',
    endTime: '13:00',
    isRecurring: true,
    maxConcurrent: 2,
    bufferMinutes: 15,
    location: 'Hyde Park',
  },
  // Coach 2 - Reuben Carr (Striker Training)
  {
    id: 'tmpl_5',
    coachId: 'coach2',
    dayOfWeek: 2, // Tuesday
    startTime: '17:00',
    endTime: '20:00',
    isRecurring: true,
    maxConcurrent: 1,
    bufferMinutes: 15,
    location: 'Victoria Park',
  },
  {
    id: 'tmpl_6',
    coachId: 'coach2',
    dayOfWeek: 4, // Thursday
    startTime: '17:00',
    endTime: '20:00',
    isRecurring: true,
    maxConcurrent: 1,
    bufferMinutes: 15,
    location: 'Victoria Park',
  },
  {
    id: 'tmpl_7',
    coachId: 'coach2',
    dayOfWeek: 6, // Saturday
    startTime: '10:00',
    endTime: '14:00',
    isRecurring: true,
    maxConcurrent: 2,
    bufferMinutes: 15,
    location: 'Hackney Marshes',
  },
  // Coach 3 - Aiden Sharma (Youth Development)
  {
    id: 'tmpl_8',
    coachId: 'coach3',
    dayOfWeek: 1, // Monday
    startTime: '16:30',
    endTime: '19:30',
    isRecurring: true,
    maxConcurrent: 1,
    bufferMinutes: 15,
    location: 'Clapham Common',
  },
  {
    id: 'tmpl_9',
    coachId: 'coach3',
    dayOfWeek: 3, // Wednesday
    startTime: '16:30',
    endTime: '19:30',
    isRecurring: true,
    maxConcurrent: 1,
    bufferMinutes: 15,
    location: 'Clapham Common',
  },
  {
    id: 'tmpl_10',
    coachId: 'coach3',
    dayOfWeek: 0, // Sunday
    startTime: '09:00',
    endTime: '12:00',
    isRecurring: true,
    maxConcurrent: 2,
    bufferMinutes: 15,
    location: 'Battersea Park',
  },
];

const MOCK_OVERRIDES: AvailabilityOverride[] = [
  {
    id: 'ovr_1',
    coachId: 'coach1',
    date: '2026-01-20',
    isBlocked: true,
    reason: 'Personal appointment',
  },
];

let templatesCache: AvailabilityTemplate[] = [...MOCK_TEMPLATES];
let overridesCache: AvailabilityOverride[] = [...MOCK_OVERRIDES];

async function loadTemplates(): Promise<AvailabilityTemplate[]> {
  try {
    const stored = await apiClient.get<AvailabilityTemplate[] | null>(
      STORAGE_KEYS.AVAILABILITY_TEMPLATES,
      null,
    );
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load templates', error);
  }
  return [...MOCK_TEMPLATES];
}

async function saveTemplates(
  templates: AvailabilityTemplate[],
): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.AVAILABILITY_TEMPLATES, templates);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save templates', error);
    return err(storageError(`Failed to save templates: ${String(error)}`));
  }
}

async function loadOverrides(): Promise<AvailabilityOverride[]> {
  try {
    const stored = await apiClient.get<AvailabilityOverride[] | null>(
      STORAGE_KEYS.AVAILABILITY_OVERRIDES,
      null,
    );
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load overrides', error);
  }
  return [...MOCK_OVERRIDES];
}

async function saveOverrides(
  overrides: AvailabilityOverride[],
): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.AVAILABILITY_OVERRIDES, overrides);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save overrides', error);
    return err(storageError(`Failed to save overrides: ${String(error)}`));
  }
}

export const availabilityService = {
  /**
   * Get all availability templates for a coach
   */
  async getTemplates(coachId: string): Promise<AvailabilityTemplate[]> {
    if (USE_MOCK) {
      templatesCache = await loadTemplates();
      return templatesCache.filter((t) => t.coachId === coachId);
    }

    const response = await fetch(`/api/coaches/${coachId}/availability/templates`);
    return response.json();
  },

  /**
   * Create or update a template
   */
  async saveTemplate(
    template: Omit<AvailabilityTemplate, 'id'> & { id?: string },
  ): Promise<AvailabilityTemplate> {
    const savedTemplate: AvailabilityTemplate = {
      ...template,
      id: template.id || apiClient.generateId('tmpl'),
    };

    if (USE_MOCK) {
      templatesCache = await loadTemplates();
      const existingIndex = templatesCache.findIndex((t) => t.id === savedTemplate.id);

      if (existingIndex >= 0) {
        templatesCache[existingIndex] = savedTemplate;
      } else {
        templatesCache.push(savedTemplate);
      }

      await saveTemplates(templatesCache);
      return savedTemplate;
    }

    const response = await fetch(`/api/coaches/${template.coachId}/availability/templates`, {
      method: template.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedTemplate),
    });
    return response.json();
  },

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    if (USE_MOCK) {
      templatesCache = await loadTemplates();
      templatesCache = templatesCache.filter((t) => t.id !== templateId);
      await saveTemplates(templatesCache);
      return;
    }

    await fetch(`/api/availability/templates/${templateId}`, { method: 'DELETE' });
  },

  /**
   * Get all overrides for a coach within a date range
   */
  async getOverrides(
    coachId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AvailabilityOverride[]> {
    if (USE_MOCK) {
      overridesCache = await loadOverrides();
      let filtered = overridesCache.filter((o) => o.coachId === coachId);

      if (startDate) {
        filtered = filtered.filter((o) => o.date >= startDate);
      }
      if (endDate) {
        filtered = filtered.filter((o) => o.date <= endDate);
      }

      return filtered;
    }

    let url = `/api/coaches/${coachId}/availability/overrides`;
    if (startDate || endDate) {
      const params = new URLSearchParams();
      if (startDate) params.append('start', startDate);
      if (endDate) params.append('end', endDate);
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    return response.json();
  },

  /**
   * Create or update an override
   */
  async saveOverride(
    override: Omit<AvailabilityOverride, 'id'> & { id?: string },
  ): Promise<AvailabilityOverride> {
    const savedOverride: AvailabilityOverride = {
      ...override,
      id: override.id || apiClient.generateId('ovr'),
    };

    if (USE_MOCK) {
      overridesCache = await loadOverrides();

      // Remove existing override for same date if exists
      overridesCache = overridesCache.filter(
        (o) => !(o.coachId === savedOverride.coachId && o.date === savedOverride.date),
      );

      overridesCache.push(savedOverride);
      await saveOverrides(overridesCache);
      return savedOverride;
    }

    const response = await fetch(`/api/coaches/${override.coachId}/availability/overrides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedOverride),
    });
    return response.json();
  },

  /**
   * Delete an override
   */
  async deleteOverride(overrideId: string): Promise<void> {
    if (USE_MOCK) {
      overridesCache = await loadOverrides();
      overridesCache = overridesCache.filter((o) => o.id !== overrideId);
      await saveOverrides(overridesCache);
      return;
    }

    await fetch(`/api/availability/overrides/${overrideId}`, { method: 'DELETE' });
  },

  /**
   * Block a specific date
   */
  async blockDate(coachId: string, date: string, reason?: string): Promise<AvailabilityOverride> {
    return this.saveOverride({
      coachId,
      date,
      isBlocked: true,
      reason,
    });
  },

  /**
   * Unblock a specific date.
   * Removes both the modern override AND any legacy blocked-date range entry.
   */
  async unblockDate(coachId: string, date: string): Promise<void> {
    if (USE_MOCK) {
      overridesCache = await loadOverrides();
      overridesCache = overridesCache.filter((o) => !(o.coachId === coachId && o.date === date));
      await saveOverrides(overridesCache);

      // Also clean legacy BLOCKED_DATES key so schedule screen stays in sync
      await this.removeLegacyBlockedDate(coachId, date);
      return;
    }

    const overrides = await this.getOverrides(coachId);
    const override = overrides.find((o) => o.date === date);
    if (override) {
      await this.deleteOverride(override.id);
    }
  },

  /**
   * Remove a date from the legacy BLOCKED_DATES storage key.
   * Handles single-day ranges (remove entirely) and multi-day ranges (split).
   */
  async removeLegacyBlockedDate(coachId: string, date: string): Promise<void> {
    try {
      const allBlocked = await apiClient.get<Record<
        string,
        Array<{
          id: string;
          coachId: string;
          startDate: string;
          endDate: string;
          reason: string;
          createdAt: string;
        }>
      > | null>(STORAGE_KEYS.BLOCKED_DATES, null);
      if (!allBlocked?.[coachId]?.length) return;

      const cleaned: (typeof allBlocked)[string] = [];
      for (const bd of allBlocked[coachId]) {
        if (date < bd.startDate || date > bd.endDate) {
          // Not affected — keep as is
          cleaned.push(bd);
        } else if (bd.startDate === date && bd.endDate === date) {
          // Single-day range matching this date — remove entirely
        } else {
          // Multi-day range containing this date — split into up to two sub-ranges
          if (bd.startDate < date) {
            const prevDay = new Date(date + 'T12:00:00');
            prevDay.setDate(prevDay.getDate() - 1);
            cleaned.push({ ...bd, endDate: toDateStr(prevDay), id: `${bd.id}_l` });
          }
          if (bd.endDate > date) {
            const nextDay = new Date(date + 'T12:00:00');
            nextDay.setDate(nextDay.getDate() + 1);
            cleaned.push({ ...bd, startDate: toDateStr(nextDay), id: `${bd.id}_r` });
          }
        }
      }
      allBlocked[coachId] = cleaned;
      await apiClient.set(STORAGE_KEYS.BLOCKED_DATES, allBlocked);
    } catch (err) {
      logger.error('Failed to clean legacy blocked dates', err);
    }
  },

  /**
   * Get available slots for a date range (used by booking system)
   * Now checks against existing bookings to show only truly available slots
   */
  async getAvailableSlots(
    coachId: string,
    startDate: string,
    endDate: string,
    sessionDurationMinutes: number = 60,
  ): Promise<AvailabilitySlot[]> {
    const templates = await this.getTemplates(coachId);
    const overrides = await this.getOverrides(coachId, startDate, endDate);

    // Load existing bookings to check availability
    const existingBookings = await loadBookings();
    const sessionOfferings = await loadSessionOfferings();

    // Filter bookings for this coach in the date range
    const coachBookings = existingBookings.filter((booking) => {
      if (booking.coachId !== coachId) return false;
      if (booking.status === 'CANCELLED') return false;
      const bookingDate = booking.scheduledAt?.split('T')[0];
      return bookingDate >= startDate && bookingDate <= endDate;
    });

    // Filter session offerings for this coach
    const coachOfferings = sessionOfferings.filter((offering) => {
      if (offering.coachId !== coachId) return false;
      if (offering.status === 'cancelled') return false;
      const offeringDate = offering.scheduledAt?.split('T')[0];
      return offeringDate >= startDate && offeringDate <= endDate;
    });

    const slots: AvailabilitySlot[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Iterate through each day in range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = toDateStr(date);
      const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

      // Check for override on this date
      const override = overrides.find((o) => o.date === dateStr);

      if (override?.isBlocked) {
        // Date is blocked, skip
        continue;
      }

      if (override?.customSlots) {
        // Use custom slots for this date
        const dayTemplate = templates.find((t) => t.dayOfWeek === dayOfWeek);
        const fallbackLocation = dayTemplate?.location;

        for (const customSlot of override.customSlots) {
          const bookedCount = this.countBookingsForSlot(
            coachBookings,
            coachOfferings,
            dateStr,
            customSlot.startTime,
          );

          slots.push({
            date: dateStr,
            startTime: customSlot.startTime,
            endTime: customSlot.endTime,
            isAvailable: bookedCount < 1,
            bookedCount,
            maxBookings: 1,
            location: customSlot.location ?? fallbackLocation,
          });
        }
        continue;
      }

      // Use template for this day
      const dayTemplates = templates.filter((t) => t.dayOfWeek === dayOfWeek);

      for (const template of dayTemplates) {
        // Generate time slots based on template
        const [startHour, startMin] = template.startTime.split(':').map(Number);
        const [endHour, endMin] = template.endTime.split(':').map(Number);

        const templateStartMinutes = startHour * 60 + startMin;
        const templateEndMinutes = endHour * 60 + endMin;

        for (
          let slotStart = templateStartMinutes;
          slotStart + sessionDurationMinutes <= templateEndMinutes;
          slotStart += sessionDurationMinutes + template.bufferMinutes
        ) {
          const slotStartHour = Math.floor(slotStart / 60);
          const slotStartMin = slotStart % 60;
          const slotEndMinutes = slotStart + sessionDurationMinutes;
          const slotEndHour = Math.floor(slotEndMinutes / 60);
          const slotEndMin = slotEndMinutes % 60;

          const slotStartTime = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`;
          const slotEndTime = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`;

          const bookedCount = this.countBookingsForSlot(
            coachBookings,
            coachOfferings,
            dateStr,
            slotStartTime,
          );

          slots.push({
            date: dateStr,
            startTime: slotStartTime,
            endTime: slotEndTime,
            isAvailable: bookedCount < template.maxConcurrent,
            bookedCount,
            maxBookings: template.maxConcurrent,
            location: template.location,
          });
        }
      }
    }

    return slots.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  },

  /**
   * Count bookings for a specific slot
   */
  countBookingsForSlot(
    bookings: Booking[],
    offerings: SessionOffering[],
    date: string,
    startTime: string,
  ): number {
    let count = 0;

    // Count from regular bookings
    for (const booking of bookings) {
      const bookingDate = booking.scheduledAt?.split('T')[0];
      const bookingTime = booking.scheduledAt?.split('T')[1]?.substring(0, 5);
      if (bookingDate === date && bookingTime === startTime) {
        count++;
      }
    }

    // Count from session offerings (for group sessions, count registrations)
    for (const offering of offerings) {
      const offeringDate = offering.scheduledAt?.split('T')[0];
      const offeringTime = offering.scheduledAt?.split('T')[1]?.substring(0, 5);
      if (offeringDate === date && offeringTime === startTime) {
        // For session offerings, the slot is occupied
        count += offering.registrations?.filter((r) => r.status === 'confirmed').length || 1;
      }
    }

    return count;
  },

  /**
   * Get bookings for a coach within a date range
   */
  async getCoachBookings(coachId: string, startDate: string, endDate: string) {
    const bookings = await loadBookings();
    const offerings = await loadSessionOfferings();

    // Filter bookings for this coach
    const coachBookings = bookings.filter((booking) => {
      if (booking.coachId !== coachId) return false;
      const bookingDate = booking.scheduledAt?.split('T')[0];
      return bookingDate >= startDate && bookingDate <= endDate;
    });

    // Get registrations from offerings
    const coachOfferingBookings = await Promise.all(
      offerings
        .filter((offering) => offering.coachId === coachId)
        .filter((offering) => {
          const offeringDate = offering.scheduledAt?.split('T')[0];
          return offeringDate >= startDate && offeringDate <= endDate;
        })
        .map(async (offering) => ({
          id: offering.id,
          coachId: offering.coachId,
          coachName: await resolveUserName(offering.coachId, 'Coach'),
          scheduledAt: offering.scheduledAt,
          service: offering.title,
          location: offering.location,
          status: (offering.status === 'active'
            ? 'CONFIRMED'
            : offering.status?.toUpperCase()) as BookingStatus,
          isGroupSession: offering.sessionType === 'group',
          maxParticipants: offering.maxParticipants,
          currentParticipants:
            offering.registrations?.filter((r) => r.status === 'confirmed').length || 0,
          registrations: offering.registrations,
        })),
    );

    return [...coachBookings, ...coachOfferingBookings];
  },

  /**
   * Get slots that a coach can invite someone to.
   * Respects availability, existing bookings, session type tagging, AND pending invite holds.
   */
  async getInvitableSlots(
    coachId: string,
    startDate: string,
    endDate: string,
    sessionTemplateId?: string,
  ): Promise<AvailabilitySlot[]> {
    // Determine duration from session template
    let duration = 60;
    if (sessionTemplateId) {
      const template = await sessionTemplateService.getTemplate(sessionTemplateId);
      if (template) {
        duration = template.duration;
      }
    }

    // Get all available slots
    const allSlots = await this.getAvailableSlots(coachId, startDate, endDate, duration);

    // Filter to available only
    let invitable = allSlots.filter((s) => s.isAvailable);

    // If a session template is specified, filter by tagged availability blocks
    if (sessionTemplateId) {
      const templates = await this.getTemplates(coachId);
      const taggedDays = new Map<number, string[]>(); // dayOfWeek → templateIds that tagged it

      for (const t of templates) {
        if (t.sessionTemplateId) {
          const existing = taggedDays.get(t.dayOfWeek) || [];
          existing.push(t.sessionTemplateId);
          taggedDays.set(t.dayOfWeek, existing);
        }
      }

      // Only filter if some blocks are tagged (otherwise all are open to any type)
      if (taggedDays.size > 0) {
        invitable = invitable.filter((slot) => {
          const slotDay = new Date(slot.date + 'T00:00:00').getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
          const tagsForDay = taggedDays.get(slotDay);
          // If this day has no tagged blocks, it's open to any type
          if (!tagsForDay) return true;
          // If tagged, only allow matching session type
          return tagsForDay.includes(sessionTemplateId);
        });
      }
    }

    // Filter out slots held by pending invites
    const activeHolds = await inviteHoldService.getActiveHolds(coachId);
    if (activeHolds.length > 0) {
      invitable = invitable.filter((slot) => {
        return !activeHolds.some(
          (h) => h.slotDate === slot.date && h.slotStartTime === slot.startTime,
        );
      });
    }

    return invitable;
  },

  /**
   * Save a repeated override — generates individual overrides for each week
   * from the override's date through repeatUntil, all sharing the same repeatGroupId.
   */
  async saveRepeatedOverride(
    override: Omit<AvailabilityOverride, 'id'> & { repeatUntil: string },
  ): Promise<AvailabilityOverride[]> {
    const groupId = apiClient.generateId('rpg');
    const startDate = new Date(override.date + 'T00:00:00');
    const endDate = new Date(override.repeatUntil + 'T00:00:00');
    const results: AvailabilityOverride[] = [];

    let current = new Date(startDate);
    let index = 0;

    while (current <= endDate) {
      const dateStr = toDateStr(current);
      const saved = await this.saveOverride({
        ...override,
        date: dateStr,
        id: apiClient.generateId(`ovr_${index}`),
        repeatGroupId: groupId,
        repeatDayOfWeek: current.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        repeatUntil: override.repeatUntil,
      });
      results.push(saved);
      current.setDate(current.getDate() + 7);
      index++;
    }

    logger.info('Saved repeated overrides', {
      groupId,
      count: results.length,
      from: override.date,
      until: override.repeatUntil,
    });

    return results;
  },

  /**
   * Get a summary of availability for display
   */
  async getAvailabilitySummary(coachId: string): Promise<{
    weeklyHours: number;
    daysAvailable: string[];
    nextAvailableSlot?: AvailabilitySlot;
  }> {
    const templates = await this.getTemplates(coachId);

    // Calculate weekly hours
    let weeklyMinutes = 0;
    const daysAvailable: string[] = [];

    for (const template of templates) {
      const [startHour, startMin] = template.startTime.split(':').map(Number);
      const [endHour, endMin] = template.endTime.split(':').map(Number);
      const duration = endHour * 60 + endMin - (startHour * 60 + startMin);
      weeklyMinutes += duration;

      const dayName = DAY_NAMES[template.dayOfWeek];
      if (!daysAvailable.includes(dayName)) {
        daysAvailable.push(dayName);
      }
    }

    // Get next available slot
    const today = toDateStr(new Date());
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    const slots = await this.getAvailableSlots(coachId, today, toDateStr(twoWeeksLater));
    const nextAvailableSlot = slots.find((s) => s.isAvailable);

    return {
      weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
      daysAvailable,
      nextAvailableSlot,
    };
  },

  /**
   * Check for conflicts before blocking/removing availability.
   * Returns bookings and pending invite holds that fall on the given date(s).
   */
  async checkConflicts(
    coachId: string,
    dates: string[],
  ): Promise<{
    bookingCount: number;
    holdCount: number;
    bookings: { id: string; date: string; time: string; location?: string; athleteName?: string }[];
    holds: { date: string; time: string; inviteId: string }[];
  }> {
    if (dates.length === 0) return { bookingCount: 0, holdCount: 0, bookings: [], holds: [] };

    const startDate = dates.sort()[0];
    const endDate = dates.sort()[dates.length - 1];
    const dateSet = new Set(dates);

    // Check bookings
    const allBookings = await loadBookings();
    const conflictBookings = allBookings
      .filter((b) => {
        if (b.coachId !== coachId || b.status === 'CANCELLED') return false;
        const bookingDate = b.scheduledAt?.split('T')[0];
        return bookingDate ? dateSet.has(bookingDate) : false;
      })
      .map((b) => ({
        id: b.id,
        date: b.scheduledAt?.split('T')[0] || '',
        time: b.scheduledAt?.split('T')[1]?.substring(0, 5) || '',
        location: b.location,
        athleteName: (b as unknown as Record<string, unknown>).athleteName as string | undefined,
      }));

    // Check pending invite holds
    const activeHolds = await inviteHoldService.getActiveHolds(coachId);
    const conflictHolds = activeHolds
      .filter((h) => dateSet.has(h.slotDate))
      .map((h) => ({
        date: h.slotDate,
        time: h.slotStartTime,
        inviteId: h.inviteId,
      }));

    return {
      bookingCount: conflictBookings.length,
      holdCount: conflictHolds.length,
      bookings: conflictBookings,
      holds: conflictHolds,
    };
  },

  /**
   * Check conflicts for a specific day of week (recurring template removal).
   * Looks 4 weeks ahead to find affected bookings/holds.
   */
  async checkRecurringConflicts(
    coachId: string,
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  ): Promise<{
    bookingCount: number;
    holdCount: number;
    affectedDates: string[];
  }> {
    const today = new Date();
    const dates: string[] = [];

    // Check next 4 weeks for this day of week
    for (let w = 0; w < 4; w++) {
      const d = new Date(today);
      d.setDate(today.getDate() + ((dayOfWeek - today.getDay() + 7) % 7) + w * 7);
      if (d >= today) {
        dates.push(toDateStr(d));
      }
    }

    const result = await this.checkConflicts(coachId, dates);
    return {
      bookingCount: result.bookingCount,
      holdCount: result.holdCount,
      affectedDates: dates,
    };
  },

  /**
   * Bulk-update the location field on a list of bookings.
   */
  async updateBookingLocations(bookingIds: string[], newLocation: string): Promise<void> {
    if (bookingIds.length === 0) return;
    const allBookings = await loadBookings();
    let changed = false;
    for (const booking of allBookings) {
      if (bookingIds.includes(booking.id)) {
        booking.location = newLocation;
        changed = true;
      }
    }
    if (changed) {
      await apiClient.set(STORAGE_KEYS.BOOKINGS, allBookings);
    }
  },

  /**
   * Check if future bookings on a given day-of-week have a different location.
   * Looks 4 weeks ahead. Used when editing a recurring template's location.
   */
  async checkLocationDrift(
    coachId: string,
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6,
    newLocation: string,
  ): Promise<{
    affectedBookings: {
      id: string;
      date: string;
      time: string;
      location: string;
      athleteName?: string;
    }[];
    affectedCount: number;
  }> {
    const today = new Date();
    const dates: string[] = [];
    for (let w = 0; w < 4; w++) {
      const d = new Date(today);
      d.setDate(today.getDate() + ((dayOfWeek - today.getDay() + 7) % 7) + w * 7);
      if (d >= today) {
        dates.push(toDateStr(d));
      }
    }
    if (dates.length === 0) return { affectedBookings: [], affectedCount: 0 };

    const dateSet = new Set(dates);
    const allBookings = await loadBookings();

    const affected = await Promise.all(
      allBookings
        .filter((b) => {
          if (b.coachId !== coachId || b.status === 'CANCELLED') return false;
          const bookingDate = b.scheduledAt?.split('T')[0];
          if (!bookingDate || !dateSet.has(bookingDate)) return false;
          return b.location !== undefined && b.location !== newLocation;
        })
        .map(async (b) => ({
          id: b.id,
          date: b.scheduledAt?.split('T')[0] || '',
          time: b.scheduledAt?.split('T')[1]?.substring(0, 5) || '',
          location: b.location || '',
          athleteName: await resolveBookingAthleteName(b),
        })),
    );

    return { affectedBookings: affected, affectedCount: affected.length };
  },
};
