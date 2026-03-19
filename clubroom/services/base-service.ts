/**
 * Base Service class with standardized CRUD operations.
 * All services should extend this to eliminate ~700 lines of duplicated code.
 */

import { apiClient } from './api-client';
import { createLogger } from '@/utils/logger';
import { emitTyped, type EventPayloads } from './event-bus';
import { type Result, type ServiceError, ok, err, notFound, storageError, conflictError } from '@/types/result';

const logger = createLogger('BaseService');

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deletedAt?: string;
}

export interface QueryOptions<T> {
  filter?: Partial<T>;
  sort?: keyof T;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  /** Cursor-based pagination: page size */
  first?: number;
  /** Cursor-based pagination: cursor (ISO date or ID) */
  after?: string;
  /** Include soft-deleted entities (default: false) */
  includeDeleted?: boolean;
}

export interface PagedResult<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
    totalCount?: number;
  };
}

export abstract class BaseService<T extends BaseEntity> {
  protected abstract storageKey: string;
  protected abstract entityName: string;

  /**
   * Override to enable mock data in development.
   */
  protected useMock = false;
  protected mockData: T[] = [];

  /**
   * In-memory cache indexed by entity ID for O(1) lookups.
   * Lazily populated on first read access.
   */
  private _cache: Map<string, T> | null = null;
  private _cacheTimestamp = 0;

  /** Maximum age (ms) before cache is considered stale. Subclasses can override. */
  protected cacheMaxAge = 30_000;

  /**
   * Returns the ID-indexed cache, lazily loading from storage on first access
   * or when the cache has exceeded its TTL.
   */
  private async getCache(): Promise<Map<string, T>> {
    const now = Date.now();
    if (this._cache === null || now - this._cacheTimestamp > this.cacheMaxAge) {
      const data = await this.loadFromStorage();
      this._cache = new Map(data.map((item) => [item.id, item]));
      this._cacheTimestamp = now;
    }
    return this._cache;
  }

  /**
   * Invalidate the in-memory cache. Called after every write operation.
   */
  protected invalidateCache(): void {
    this._cache = null;
    this._cacheTimestamp = 0;
  }

  /**
   * Generate a unique ID for new entities.
   */
  protected generateId(): string {
    return apiClient.generateId(this.entityName.toLowerCase());
  }

  /**
   * Emit an event through the event bus.
   */
  protected emit(event: string, data: unknown): void {
    emitTyped(event as keyof EventPayloads, data as EventPayloads[keyof EventPayloads]);
  }

  /**
   * Load all entities from storage.
   */
  protected async loadFromStorage(): Promise<T[]> {
    if (this.useMock) {
      return this.mockData;
    }

    try {
      return await apiClient.get<T[]>(this.storageKey, []);
    } catch (error) {
      logger.error(`Failed to load ${this.entityName}`, error);
      return [];
    }
  }

  /**
   * Save all entities to storage.
   */
  protected async saveToStorage(data: T[]): Promise<Result<void, ServiceError>> {
    if (this.useMock) {
      this.mockData = data;
      return ok(undefined);
    }

    try {
      await apiClient.set(this.storageKey, data);
      return ok(undefined);
    } catch (error) {
      logger.error(`Failed to save ${this.entityName}`, error);
      return err(storageError(`Failed to save ${this.entityName}`));
    }
  }

  /**
   * Get all entities, optionally filtered and sorted.
   */
  async getAll(options?: QueryOptions<T>): Promise<Result<T[], ServiceError>> {
    try {
      const cache = await this.getCache();
      let data = Array.from(cache.values());

      // Filter soft-deleted unless explicitly included
      if (!options?.includeDeleted) {
        data = data.filter((item) => !item.deletedAt);
      }

      // Apply filter
      if (options?.filter) {
        data = data.filter((item) =>
          Object.entries(options.filter!).every(([key, value]) => item[key as keyof T] === value),
        );
      }

      // Apply sort
      if (options?.sort) {
        const direction = options.sortDirection === 'desc' ? -1 : 1;
        data.sort((a, b) => {
          const aVal = a[options.sort!];
          const bVal = b[options.sort!];
          if (aVal < bVal) return -1 * direction;
          if (aVal > bVal) return 1 * direction;
          return 0;
        });
      }

      // Apply legacy offset/limit pagination
      if (options?.offset !== undefined) {
        data = data.slice(options.offset);
      }
      if (options?.limit !== undefined) {
        data = data.slice(0, options.limit);
      }

      // Apply cursor-based pagination
      if (options?.after) {
        const cursorIndex = data.findIndex((item) => item.id === options.after);
        if (cursorIndex !== -1) {
          data = data.slice(cursorIndex + 1);
        }
      }
      if (options?.first !== undefined) {
        data = data.slice(0, options.first);
      }

      return ok(data);
    } catch (error) {
      logger.error(`Failed to get all ${this.entityName}`, error);
      return err(storageError(`Failed to retrieve ${this.entityName} list`));
    }
  }

  /**
   * Get entities with cursor-based pagination metadata.
   */
  async getPaged(options?: QueryOptions<T>): Promise<Result<PagedResult<T>, ServiceError>> {
    try {
      const cache = await this.getCache();
      let data = Array.from(cache.values());

      // Filter soft-deleted unless explicitly included
      if (!options?.includeDeleted) {
        data = data.filter((item) => !item.deletedAt);
      }

      // Apply filter
      if (options?.filter) {
        data = data.filter((item) =>
          Object.entries(options.filter!).every(([key, value]) => item[key as keyof T] === value),
        );
      }

      // Apply sort
      if (options?.sort) {
        const direction = options.sortDirection === 'desc' ? -1 : 1;
        data.sort((a, b) => {
          const aVal = a[options.sort!];
          const bVal = b[options.sort!];
          if (aVal < bVal) return -1 * direction;
          if (aVal > bVal) return 1 * direction;
          return 0;
        });
      }

      const totalCount = data.length;

      // Apply cursor
      if (options?.after) {
        const cursorIndex = data.findIndex((item) => item.id === options.after);
        if (cursorIndex !== -1) {
          data = data.slice(cursorIndex + 1);
        }
      }

      const pageSize = options?.first ?? data.length;
      const hasNextPage = data.length > pageSize;
      const items = data.slice(0, pageSize);
      const endCursor = items.length > 0 ? items[items.length - 1].id : null;

      return ok({
        items,
        pageInfo: { hasNextPage, endCursor, totalCount },
      });
    } catch (error) {
      logger.error(`Failed to get paged ${this.entityName}`, error);
      return err(storageError(`Failed to retrieve ${this.entityName} page`));
    }
  }

  /**
   * Get a single entity by ID.
   */
  async getById(id: string): Promise<Result<T, ServiceError>> {
    try {
      const cache = await this.getCache();
      const item = cache.get(id);

      if (!item || item.deletedAt) {
        return err(notFound(this.entityName, id));
      }

      return ok(item);
    } catch (error) {
      logger.error(`Failed to get ${this.entityName} by id`, error);
      return err(storageError(`Failed to retrieve ${this.entityName}`));
    }
  }

  /**
   * Create a new entity.
   */
  async create(input: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<T, ServiceError>> {
    try {
      // Validate input
      const validationResult = this.validate(input as Partial<T>);
      if (!validationResult.success) {
        return validationResult;
      }

      const data = await this.loadFromStorage();
      const now = new Date().toISOString();

      const newEntity = {
        ...input,
        id: this.generateId(),
        createdAt: now,
        updatedAt: now,
        version: 1,
      } as T;

      data.push(newEntity);
      const saveResult = await this.saveToStorage(data);

      if (!saveResult.success) {
        return saveResult;
      }

      this.invalidateCache();

      // Emit create event
      this.emit(`${this.entityName.toLowerCase()}:created`, newEntity);

      return ok(newEntity);
    } catch (error) {
      logger.error(`Failed to create ${this.entityName}`, error);
      return err(storageError(`Failed to create ${this.entityName}`));
    }
  }

  /**
   * Update an existing entity.
   */
  async update(id: string, updates: Partial<T>): Promise<Result<T, ServiceError>> {
    try {
      const data = await this.loadFromStorage();
      const index = data.findIndex((entity) => entity.id === id);

      if (index === -1) {
        return err(notFound(this.entityName, id));
      }

      // Validate updates
      const validationResult = this.validate(updates);
      if (!validationResult.success) {
        return validationResult;
      }

      // Optimistic locking: reject if version doesn't match
      const existing = data[index];
      if (updates.version !== undefined && existing.version !== undefined
          && updates.version !== existing.version) {
        return err(conflictError(
          `${this.entityName} was modified by another process (expected version ${updates.version}, found ${existing.version})`
        ));
      }

      const updatedEntity = {
        ...existing,
        ...updates,
        id, // Prevent ID change
        updatedAt: new Date().toISOString(),
        version: (existing.version ?? 0) + 1,
      };

      data[index] = updatedEntity;
      const saveResult = await this.saveToStorage(data);

      if (!saveResult.success) {
        return saveResult;
      }

      this.invalidateCache();

      // Emit update event
      this.emit(`${this.entityName.toLowerCase()}:updated`, updatedEntity);

      return ok(updatedEntity);
    } catch (error) {
      logger.error(`Failed to update ${this.entityName}`, error);
      return err(storageError(`Failed to update ${this.entityName}`));
    }
  }

  /**
   * Delete an entity by ID.
   */
  /**
   * Soft-delete an entity by setting deletedAt. Use hardDelete() for permanent removal.
   */
  async delete(id: string): Promise<Result<void, ServiceError>> {
    try {
      const data = await this.loadFromStorage();
      const index = data.findIndex((entity) => entity.id === id);

      if (index === -1) {
        return err(notFound(this.entityName, id));
      }

      const entity = data[index];
      data[index] = {
        ...entity,
        deletedAt: new Date().toISOString(),
        version: (entity.version ?? 0) + 1,
      };

      const saveResult = await this.saveToStorage(data);
      if (!saveResult.success) {
        return saveResult;
      }

      this.invalidateCache();

      // Emit delete event
      this.emit(`${this.entityName.toLowerCase()}:deleted`, { id, entity });

      return ok(undefined);
    } catch (error) {
      logger.error(`Failed to delete ${this.entityName}`, error);
      return err(storageError(`Failed to delete ${this.entityName}`));
    }
  }

  /**
   * Permanently remove an entity from storage.
   */
  async hardDelete(id: string): Promise<Result<void, ServiceError>> {
    try {
      const data = await this.loadFromStorage();
      const index = data.findIndex((entity) => entity.id === id);

      if (index === -1) {
        return err(notFound(this.entityName, id));
      }

      const deletedEntity = data[index];
      data.splice(index, 1);

      const saveResult = await this.saveToStorage(data);
      if (!saveResult.success) {
        return saveResult;
      }

      this.invalidateCache();
      this.emit(`${this.entityName.toLowerCase()}:deleted`, { id, entity: deletedEntity });

      return ok(undefined);
    } catch (error) {
      logger.error(`Failed to hard-delete ${this.entityName}`, error);
      return err(storageError(`Failed to delete ${this.entityName}`));
    }
  }

  /**
   * Restore a soft-deleted entity.
   */
  async restore(id: string): Promise<Result<T, ServiceError>> {
    try {
      const data = await this.loadFromStorage();
      const index = data.findIndex((entity) => entity.id === id);

      if (index === -1) {
        return err(notFound(this.entityName, id));
      }

      const entity = data[index];
      if (!entity.deletedAt) {
        return ok(entity); // Not deleted, nothing to restore
      }

      const restored = {
        ...entity,
        deletedAt: undefined,
        updatedAt: new Date().toISOString(),
        version: (entity.version ?? 0) + 1,
      };
      data[index] = restored;

      const saveResult = await this.saveToStorage(data);
      if (!saveResult.success) {
        return saveResult as Result<T, ServiceError>;
      }

      this.invalidateCache();
      return ok(restored);
    } catch (error) {
      logger.error(`Failed to restore ${this.entityName}`, error);
      return err(storageError(`Failed to restore ${this.entityName}`));
    }
  }

  /**
   * Check if an entity exists.
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.getById(id);
    return result.success;
  }

  /**
   * Count entities, optionally filtered.
   */
  async count(filter?: Partial<T>): Promise<Result<number, ServiceError>> {
    const result = await this.getAll({ filter });
    if (!result.success) return result;
    return ok(result.data.length);
  }

  /**
   * Find first entity matching filter.
   */
  async findOne(filter: Partial<T>): Promise<Result<T | null, ServiceError>> {
    const result = await this.getAll({ filter, limit: 1 });
    if (!result.success) return result;
    return ok(result.data[0] || null);
  }

  /**
   * Override in subclasses to add custom validation.
   * Return ok(undefined) if valid, err(validationError) if invalid.
   */
  protected validate(_input: Partial<T>): Result<void, ServiceError> {
    return ok(undefined);
  }

  /**
   * Bulk create entities.
   */
  async createMany(
    inputs: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<Result<T[], ServiceError>> {
    try {
      const data = await this.loadFromStorage();
      const now = new Date().toISOString();
      const newEntities: T[] = [];

      for (const input of inputs) {
        const validationResult = this.validate(input as Partial<T>);
        if (!validationResult.success) {
          return validationResult as Result<T[], ServiceError>;
        }

        newEntities.push({
          ...input,
          id: this.generateId(),
          createdAt: now,
          updatedAt: now,
          version: 1,
        } as T);
      }

      data.push(...newEntities);
      const saveResult = await this.saveToStorage(data);

      if (!saveResult.success) {
        return err(saveResult.error);
      }

      this.invalidateCache();

      return ok(newEntities);
    } catch (error) {
      logger.error(`Failed to create multiple ${this.entityName}`, error);
      return err(storageError(`Failed to create ${this.entityName} entities`));
    }
  }

  /**
   * Delete multiple entities by IDs.
   */
  async deleteMany(ids: string[]): Promise<Result<number, ServiceError>> {
    try {
      const data = await this.loadFromStorage();
      const now = new Date().toISOString();
      let deletedCount = 0;

      for (let i = 0; i < data.length; i++) {
        if (ids.includes(data[i].id) && !data[i].deletedAt) {
          data[i] = {
            ...data[i],
            deletedAt: now,
            version: (data[i].version ?? 0) + 1,
          };
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        const saveResult = await this.saveToStorage(data);
        if (!saveResult.success) {
          return saveResult as Result<number, ServiceError>;
        }

        this.invalidateCache();
      }

      return ok(deletedCount);
    } catch (error) {
      logger.error(`Failed to delete multiple ${this.entityName}`, error);
      return err(storageError(`Failed to delete ${this.entityName} entities`));
    }
  }

  /**
   * Clear all entities (useful for testing).
   */
  async clear(): Promise<Result<void, ServiceError>> {
    const result = await this.saveToStorage([]);
    this.invalidateCache();
    return result;
  }
}
