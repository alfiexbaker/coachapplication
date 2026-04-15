import { z } from 'zod';

const readinessCheckStatusSchema = z.enum(['ok', 'degraded', 'down']);

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
});

export const readinessResponseSchema = z.object({
  status: z.enum(['ready', 'degraded', 'down']),
  checks: z.object({
    api: readinessCheckStatusSchema,
    config: readinessCheckStatusSchema,
    database: readinessCheckStatusSchema,
    objectStorage: readinessCheckStatusSchema,
  }),
  issues: z.array(z.object({
    check: z.enum(['config', 'database', 'objectStorage']),
    status: z.enum(['degraded', 'down']),
    code: z.string(),
    message: z.string(),
    action: z.string().optional(),
  })).default([]),
  timestamp: z.string().datetime(),
  requestId: z.string(),
});
