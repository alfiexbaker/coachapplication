import { z } from 'zod';
import { bookingIdSchema, athleteIdSchema, userIdSchema } from '../common/ids.js';

export const bookingStatusSchema = z.enum([
  'PENDING',
  'AWAITING_CONFIRMATION',
  'CONFIRMED',
  'AWAITING_COMPLETION',
  'COMPLETED',
  'CANCELLED',
]);

export const createBookingRequestSchema = z.object({
  coachUserId: userIdSchema,
  athleteIds: z.array(athleteIdSchema).min(1).max(20),
  bookedByUserId: userIdSchema,
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(480),
  location: z.string().min(1).max(200),
  serviceType: z.string().min(1).max(80),
  sessionTemplateId: z.string().optional(),
  objectives: z.array(z.string().min(1).max(120)).max(20).default([]),
  notes: z.string().max(2000).optional(),
  priceMinor: z.number().int().nonnegative().optional(),
  currency: z.literal('GBP').default('GBP'),
  idempotencyKey: z.string().min(8).max(200).optional(),
});

export const bookingSeriesFrequencySchema = z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']);

export const createBookingSeriesOccurrenceSchema = z.object({
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(480),
  location: z.string().min(1).max(200).optional(),
});

export const createBookingSeriesRequestSchema = z.object({
  coachUserId: userIdSchema,
  athleteIds: z.array(athleteIdSchema).min(1).max(20),
  bookedByUserId: userIdSchema,
  occurrences: z.array(createBookingSeriesOccurrenceSchema).min(1).max(52),
  location: z.string().min(1).max(200),
  serviceType: z.string().min(1).max(80),
  sessionTemplateId: z.string().optional(),
  objectives: z.array(z.string().min(1).max(120)).max(20).default([]),
  notes: z.string().max(2000).optional(),
  priceMinor: z.number().int().nonnegative().optional(),
  currency: z.literal('GBP').default('GBP'),
  frequency: bookingSeriesFrequencySchema.default('CUSTOM'),
  patternLabel: z.string().min(1).max(160).optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
});

export const cancelBookingRequestSchema = z.object({
  reason: z.string().min(1).max(200),
  note: z.string().max(1000).optional(),
  expectedVersion: z.number().int().positive().optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
});

export const reopenBookingRequestSchema = z.object({
  note: z.string().max(1000).optional(),
  expectedVersion: z.number().int().positive().optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
});

export const inviteSelectedSlotSchema = z.object({
  date: z.string().min(1).max(40),
  startTime: z.string().min(1).max(20),
  endTime: z.string().min(1).max(20),
  location: z.string().max(200).optional(),
});

export const inviteResponseRequestSchema = z.object({
  response: z.enum(['ACCEPTED', 'DECLINED']),
  selectedSlot: inviteSelectedSlotSchema.optional(),
});

export const bookingParticipantSchema = z.object({
  athleteId: athleteIdSchema,
  guardianUserId: userIdSchema.optional(),
  status: z.enum(['confirmed', 'pending', 'cancelled']),
});

export const bookingResponseSchema = z.object({
  id: bookingIdSchema,
  coachUserId: userIdSchema,
  bookedByUserId: userIdSchema.optional(),
  status: bookingStatusSchema,
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int(),
  location: z.string(),
  serviceType: z.string().optional(),
  sessionTemplateId: z.string().nullable().optional(),
  objectives: z.array(z.string()),
  notes: z.string().nullable().optional(),
  priceMinor: z.number().int().nullable().optional(),
  currency: z.string().default('GBP'),
  participants: z.array(bookingParticipantSchema).default([]),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  cancelledAt: z.string().datetime().nullable().optional(),
});

export const bookingListResponseSchema = z.object({
  bookings: z.array(bookingResponseSchema),
  total: z.number().int().nonnegative(),
  seedVersion: z.string().nullable().optional(),
  requestId: z.string(),
});

export const bookingSeriesResponseSchema = z.object({
  id: z.string().regex(/^rec_[A-Za-z0-9-]+$/, 'Expected rec_... identifier'),
  coachUserId: userIdSchema,
  bookedByUserId: userIdSchema,
  athleteIds: z.array(athleteIdSchema),
  frequency: bookingSeriesFrequencySchema,
  patternLabel: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'PARTIAL', 'COMPLETED', 'CANCELLED']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  bookingIds: z.array(bookingIdSchema),
  totalPriceMinor: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().default('GBP'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createBookingSeriesResponseSchema = z.object({
  series: bookingSeriesResponseSchema,
  bookings: z.array(bookingResponseSchema),
  requestId: z.string().min(1),
});

export const inviteResponseResultSchema = z.object({
  inviteId: z.string().min(1),
  response: z.enum(['ACCEPTED', 'DECLINED']),
  status: z.enum(['ACCEPTED', 'DECLINED']),
  targetStatus: z.enum(['ACCEPTED', 'DECLINED']),
  respondedAt: z.string().datetime(),
  selectedSlot: inviteSelectedSlotSchema.optional(),
  registrationId: z.string().nullable().optional(),
  registrationStatus: z.enum(['REGISTERED', 'WAITLISTED']).nullable().optional(),
  booking: bookingResponseSchema.nullable().optional(),
  requestId: z.string(),
});

export const registerGroupSessionRequestSchema = z.object({
  athleteId: athleteIdSchema,
  parentUserId: userIdSchema.optional(),
});

export const groupSessionRegistrationStatusSchema = z.enum([
  'REGISTERED',
  'WAITLISTED',
  'CANCELLED',
  'ATTENDED',
  'NO_SHOW',
]);

export const groupSessionRegistrationResponseSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  athleteId: athleteIdSchema,
  parentUserId: userIdSchema,
  status: groupSessionRegistrationStatusSchema,
  registeredAt: z.string().datetime(),
  paidAt: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const registerGroupSessionResponseSchema = z.object({
  registration: groupSessionRegistrationResponseSchema,
  booking: bookingResponseSchema.nullable().optional(),
  sessionStatus: z.string().min(1),
  requestId: z.string(),
});

export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>;
export type BookingSeriesFrequency = z.infer<typeof bookingSeriesFrequencySchema>;
export type CreateBookingSeriesOccurrence = z.infer<
  typeof createBookingSeriesOccurrenceSchema
>;
export type CreateBookingSeriesRequest = z.infer<typeof createBookingSeriesRequestSchema>;
export type CancelBookingRequest = z.infer<typeof cancelBookingRequestSchema>;
export type ReopenBookingRequest = z.infer<typeof reopenBookingRequestSchema>;
export type BookingResponse = z.infer<typeof bookingResponseSchema>;
export type BookingListResponse = z.infer<typeof bookingListResponseSchema>;
export type BookingSeriesResponse = z.infer<typeof bookingSeriesResponseSchema>;
export type CreateBookingSeriesResponse = z.infer<typeof createBookingSeriesResponseSchema>;
export type InviteResponseRequest = z.infer<typeof inviteResponseRequestSchema>;
export type InviteResponseResult = z.infer<typeof inviteResponseResultSchema>;
export type RegisterGroupSessionRequest = z.infer<typeof registerGroupSessionRequestSchema>;
export type GroupSessionRegistrationResponse = z.infer<
  typeof groupSessionRegistrationResponseSchema
>;
export type RegisterGroupSessionResponse = z.infer<typeof registerGroupSessionResponseSchema>;
