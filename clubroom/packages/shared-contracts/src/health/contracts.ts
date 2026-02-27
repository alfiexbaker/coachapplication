import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
});

export const readinessResponseSchema = z.object({
  status: z.literal('ready'),
  checks: z.object({
    api: z.enum(['ok', 'degraded', 'down']),
    database: z.enum(['ok', 'degraded', 'down', 'unknown']),
    objectStorage: z.enum(['ok', 'degraded', 'down', 'unknown']),
  }),
  timestamp: z.string().datetime(),
  requestId: z.string(),
});
