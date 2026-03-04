import { deepClone, loadLinkedDatasetSnapshot } from './linked-dataset.js';

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
  if (!cachedStore) {
    cachedStore = loadStore();
  }
  return cachedStore;
}

export function resetDbFixtureStoreForTests(): void {
  cachedStore = null;
}
