import { z } from 'zod';

export const prefixedId = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9-]+$`), `Expected ${prefix}_... identifier`);

export const userIdSchema = prefixedId('usr');
export const athleteIdSchema = prefixedId('ath');
export const coachIdSchema = prefixedId('usr');
export const bookingIdSchema = prefixedId('bok');
export const invoiceIdSchema = prefixedId('invc');
