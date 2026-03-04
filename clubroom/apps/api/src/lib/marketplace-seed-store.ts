import { assertSeedBackendEnabled } from './data-backend.js';
import { deepClone, loadLinkedDatasetSnapshot } from './linked-dataset.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

interface RawSeedDataset {
  version: string;
  tables: SeedTables;
}

export interface MarketplaceSeedStore {
  version: string;
  tables: SeedTables;
}

let cachedStore: MarketplaceSeedStore | null = null;

function loadStore(): MarketplaceSeedStore {
  const parsed = loadLinkedDatasetSnapshot() as RawSeedDataset;
  return {
    version: parsed.version,
    tables: deepClone(parsed.tables),
  };
}

export function getMarketplaceSeedStore(): MarketplaceSeedStore {
  assertSeedBackendEnabled('marketplace seed store');
  if (!cachedStore) {
    cachedStore = loadStore();
  }
  return cachedStore;
}

export function resetMarketplaceSeedStoreForTests(): void {
  cachedStore = null;
}
