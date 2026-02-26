import type { Result, ServiceError } from '@/types/result';

type ProgressDemoSeedServiceLegacyModule = typeof import('./progress-demo-seed-service.legacy');

let modulePromise: Promise<ProgressDemoSeedServiceLegacyModule> | null = null;

async function loadLegacyModule(): Promise<ProgressDemoSeedServiceLegacyModule> {
  if (!modulePromise) {
    modulePromise = import('./progress-demo-seed-service.legacy');
  }

  return modulePromise;
}

export async function clearProgressDemoSeedData(
  athleteId: string,
): Promise<Result<void, ServiceError>> {
  const module = await loadLegacyModule();
  return module.clearProgressDemoSeedData(athleteId);
}

export async function ensureUser1DiamondTestDataSeeded(
  athleteId: string,
  athleteName?: string,
): Promise<Result<void, ServiceError>> {
  const module = await loadLegacyModule();
  return module.ensureUser1DiamondTestDataSeeded(athleteId, athleteName);
}

export async function ensureProgressDemoSeeded(
  athleteId: string,
  athleteName?: string,
): Promise<Result<void, ServiceError>> {
  const module = await loadLegacyModule();
  return module.ensureProgressDemoSeeded(athleteId, athleteName);
}
