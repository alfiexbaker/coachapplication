import { deepClone, loadLinkedDatasetSnapshot } from './linked-dataset.js';
import { getApiDataBackend } from './data-backend.js';
import { serviceUnavailable } from './http-errors.js';
import { shouldUseDbFixtureFallback } from './prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

interface RawSeedDataset {
  version: string;
  tables: SeedTables;
}

export interface DbFixtureStore {
  version: string;
  tables: SeedTables;
}

let cachedStore: DbFixtureStore | null = null;

function loadStore(): DbFixtureStore {
  const parsed = loadLinkedDatasetSnapshot() as RawSeedDataset;
  return {
    version: parsed.version,
    tables: deepClone(parsed.tables),
  };
}

export function getDbFixtureStore(): DbFixtureStore {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    throw serviceUnavailable('DB fixture fallback is disabled', {
      apiDataBackend: getApiDataBackend(),
      expected: 'Live Prisma authority',
      action: 'Use Prisma repositories or run the explicit database-free test fallback.',
    });
  }

  if (!cachedStore) {
    cachedStore = loadStore();
  }
  return cachedStore;
}

export function resetDbFixtureStoreForTests(): void {
  cachedStore = null;
}
