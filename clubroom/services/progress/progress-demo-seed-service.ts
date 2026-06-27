import { ok, type Result, type ServiceError } from '@/types/result';

export async function clearProgressDemoSeedData(
  athleteId: string,
): Promise<Result<void, ServiceError>> {
  void athleteId;
  return ok(undefined);
}

export async function ensureUser1DiamondTestDataSeeded(
  athleteId: string,
  athleteName?: string,
): Promise<Result<void, ServiceError>> {
  void athleteId;
  void athleteName;
  return ok(undefined);
}

export async function ensureProgressDemoSeeded(
  athleteId: string,
  athleteName?: string,
): Promise<Result<void, ServiceError>> {
  void athleteId;
  void athleteName;
  return ok(undefined);
}
