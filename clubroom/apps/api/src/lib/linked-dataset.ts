import fs from 'node:fs';
import path from 'node:path';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

export interface LinkedDataset {
  version: string;
  tables: SeedTables;
}

interface RawLinkedDataset {
  version: string;
  tables: SeedTables;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function resolveLinkedDatasetPath(): string {
  const primary = path.resolve(process.cwd(), 'docs/backend-api/test-data/marketplace/linked-dataset.json');
  if (fs.existsSync(primary)) {
    return primary;
  }

  const fallback = path.resolve(
    process.cwd(),
    '../../docs/backend-api/test-data/marketplace/linked-dataset.json',
  );
  if (fs.existsSync(fallback)) {
    return fallback;
  }

  throw new Error('Marketplace linked dataset not found');
}

export function loadLinkedDatasetSnapshot(): LinkedDataset {
  const datasetPath = resolveLinkedDatasetPath();
  const raw = fs.readFileSync(datasetPath, 'utf8');
  const parsed = JSON.parse(raw) as RawLinkedDataset;
  return {
    version: parsed.version,
    tables: deepClone(parsed.tables),
  };
}
