/**
 * Base Service class with standardized CRUD operations.
 * All services should extend this to eliminate ~700 lines of duplicated code.
 */

import { apiClient } from './api-client';
import { createLogger } from '@/utils/logger';
import { emitTyped, type EventPayloads } from './event-bus';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  storageError,
} from '@/types/result';

const logger = createLogger('BaseService');

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QueryOptions<T> {
  filter?: Partial<T>;
  sort?: keyof T;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
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
  private invalidateCache(): void {
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

      // Apply filter
      if (options?.filter) {
        data = data.filter((item) =>
          Object.entries(options.filter!).every(
            ([key, value]) => item[key as keyof T] === value
          )
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

      // Apply pagination
      if (options?.offset !== undefined) {
        data = data.slice(options.offset);
      }
      if (options?.limit !== undefined) {
        data = data.slice(0, options.limit);
      }

      return ok(data);
    } catch (error) {
      logger.error(`Failed to get all ${this.entityName}`, error);
      return err(storageError(`Failed to retrieve ${this.entityName} list`));
    }
  }

  /**
   * Get a single entity by ID.
   */
  async getById(id: string): Promise<Result<T, ServiceError>> {
    try {
      const cache = await this.getCache();
      const item = cache.get(id);

      if (!item) {
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

      const updatedEntity = {
        ...data[index],
        ...updates,
        id, // Prevent ID change
        updatedAt: new Date().toISOString(),
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
  async delete(id: string): Promise<Result<void, ServiceError>> {
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

      // Emit delete event
      this.emit(`${this.entityName.toLowerCase()}:deleted`, { id, entity: deletedEntity });

      return ok(undefined);
    } catch (error) {
      logger.error(`Failed to delete ${this.entityName}`, error);
      return err(storageError(`Failed to delete ${this.entityName}`));
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
    inputs: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]
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
      const initialCount = data.length;
      const filtered = data.filter((entity) => !ids.includes(entity.id));
      const deletedCount = initialCount - filtered.length;

      if (deletedCount > 0) {
        const saveResult = await this.saveToStorage(filtered);
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
