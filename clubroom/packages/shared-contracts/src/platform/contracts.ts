import { z } from 'zod';

export const apiVersionResponseSchema = z
  .object({
    service: z.literal('clubroom-api'),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
    apiVersion: z.literal('v1'),
    apiStatus: z.enum(['preview', 'stable', 'deprecated']),
    minimumDeprecationDays: z.number().int().nonnegative(),
    apiDataBackend: z.enum(['seed', 'db']),
    marketplaceSeedEnabled: z.boolean(),
  })
  .strict();

export type ApiVersionResponse = z.infer<typeof apiVersionResponseSchema>;
