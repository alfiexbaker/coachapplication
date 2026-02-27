import { z } from 'zod';

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_FAILED',
  'AUTH_INVALID_TOKEN',
  'AUTH_FORBIDDEN',
  'AUTH_ROLE_REQUIRED',
  'AUTH_GRANT_REQUIRED',
  'RESOURCE_NOT_FOUND',
  'VERSION_CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);

export const problemJsonSchema = z.object({
  type: z.string().url().or(z.string()),
  title: z.string(),
  status: z.number().int(),
  code: apiErrorCodeSchema,
  detail: z.string(),
  requestId: z.string(),
  details: z.unknown().optional(),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ProblemJson = z.infer<typeof problemJsonSchema>;
