import type { Result, ServiceError } from '@/types/result';

type ProgressDemoSeedModule = typeof import('./progress-demo-seed-service');

let modulePromise: Promise<ProgressDemoSeedModule> | null = null;

function loadModule(): Promise<ProgressDemoSeedModule> {
  if (!modulePromise) {
    modulePromise = import('./progress-demo-seed-service');
  }
  return modulePromise;
}

export async function clearProgressDemoSeedData(
  athleteId: string,
): Promise<Result<void, ServiceError>> {
  const mod = await loadModule();
  return mod.clearProgressDemoSeedData(athleteId);
}

export async function ensureUser1DiamondTestDataSeeded(): Promise<Result<void, ServiceError>> {
  const mod = await loadModule();
  return mod.ensureUser1DiamondTestDataSeeded();
}

export async function ensureProgressDemoSeeded(
  athleteId: string,
  options?: Parameters<ProgressDemoSeedModule['ensureProgressDemoSeeded']>[1],
): Promise<Result<void, ServiceError>> {
  const mod = await loadModule();
  return mod.ensureProgressDemoSeeded(athleteId, options);
}
