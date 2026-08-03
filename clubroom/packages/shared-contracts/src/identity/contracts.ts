import { z } from 'zod';

import { userIdSchema } from '../common/ids.js';

export const userDirectoryRoleSchema = z.enum(['COACH', 'PARENT', 'ADMIN', 'USER']);

export const adminUserSummarySchema = z
  .object({
    total: z.number().int().nonnegative(),
    coaches: z.number().int().nonnegative(),
    athletes: z.number().int().nonnegative(),
    parents: z.number().int().nonnegative(),
  })
  .strict();

export const adminUserSummaryResponseSchema = z
  .object({
    summary: adminUserSummarySchema,
    seedVersion: z.string().nullable(),
    requestId: z.string().min(1),
  })
  .strict();

export const userDirectoryEntrySchema = z
  .object({
    id: userIdSchema,
    name: z.string().trim().min(1).max(160),
    email: z.string().email().max(320).optional(),
    avatar: z.string().min(1).max(4096).optional(),
    postcode: z.string().trim().min(1).max(32).optional(),
    role: userDirectoryRoleSchema,
  })
  .strict();

export const userSearchQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(120),
    limit: z.coerce.number().int().min(1).max(20).optional(),
  })
  .strict();

export const userProfileParamsSchema = z
  .object({
    userId: z.string().trim().min(1).max(120),
  })
  .strict();

export const userSearchResponseSchema = z
  .object({
    users: z.array(userDirectoryEntrySchema).max(20),
    total: z.number().int().min(0).max(20),
    seedVersion: z.string().nullable(),
    requestId: z.string().min(1),
  })
  .strict();

export const userProfileResponseSchema = z
  .object({
    user: userDirectoryEntrySchema,
    seedVersion: z.string().nullable(),
    requestId: z.string().min(1),
  })
  .strict();

export type UserDirectoryRole = z.infer<typeof userDirectoryRoleSchema>;
export type UserDirectoryEntry = z.infer<typeof userDirectoryEntrySchema>;
export type AdminUserSummary = z.infer<typeof adminUserSummarySchema>;
export type AdminUserSummaryResponse = z.infer<typeof adminUserSummaryResponseSchema>;
