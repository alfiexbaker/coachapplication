"use strict";
/**
 * Base Service class with standardized CRUD operations.
 * All services should extend this to eliminate ~700 lines of duplicated code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const api_client_1 = require("./api-client");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("./event-bus");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('BaseService');
class BaseService {
    constructor() {
        /**
         * Override to enable mock data in development.
         */
        this.useMock = false;
        this.mockData = [];
        /**
         * In-memory cache indexed by entity ID for O(1) lookups.
         * Lazily populated on first read access.
         */
        this._cache = null;
        this._cacheTimestamp = 0;
        /** Maximum age (ms) before cache is considered stale. Subclasses can override. */
        this.cacheMaxAge = 30000;
    }
    /**
     * Returns the ID-indexed cache, lazily loading from storage on first access
     * or when the cache has exceeded its TTL.
     */
    async getCache() {
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
    invalidateCache() {
        this._cache = null;
        this._cacheTimestamp = 0;
    }
    /**
     * Generate a unique ID for new entities.
     */
    generateId() {
        return api_client_1.apiClient.generateId(this.entityName.toLowerCase());
    }
    /**
     * Emit an event through the event bus.
     */
    emit(event, data) {
        (0, event_bus_1.emitTyped)(event, data);
    }
    /**
     * Load all entities from storage.
     */
    async loadFromStorage() {
        if (this.useMock) {
            return this.mockData;
        }
        try {
            return await api_client_1.apiClient.get(this.storageKey, []);
        }
        catch (error) {
            logger.error(`Failed to load ${this.entityName}`, error);
            return [];
        }
    }
    /**
     * Save all entities to storage.
     */
    async saveToStorage(data) {
        if (this.useMock) {
            this.mockData = data;
            return (0, result_1.ok)(undefined);
        }
        try {
            await api_client_1.apiClient.set(this.storageKey, data);
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error(`Failed to save ${this.entityName}`, error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to save ${this.entityName}`));
        }
    }
    /**
     * Get all entities, optionally filtered and sorted.
     */
    async getAll(options) {
        try {
            const cache = await this.getCache();
            let data = Array.from(cache.values());
            // Apply filter
            if (options?.filter) {
                data = data.filter((item) => Object.entries(options.filter).every(([key, value]) => item[key] === value));
            }
            // Apply sort
            if (options?.sort) {
                const direction = options.sortDirection === 'desc' ? -1 : 1;
                data.sort((a, b) => {
                    const aVal = a[options.sort];
                    const bVal = b[options.sort];
                    if (aVal < bVal)
                        return -1 * direction;
                    if (aVal > bVal)
                        return 1 * direction;
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
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error(`Failed to get all ${this.entityName}`, error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to retrieve ${this.entityName} list`));
        }
    }
    /**
     * Get a single entity by ID.
     */
    async getById(id) {
        try {
            const cache = await this.getCache();
            const item = cache.get(id);
            if (!item) {
                return (0, result_1.err)((0, result_1.notFound)(this.entityName, id));
            }
            return (0, result_1.ok)(item);
        }
        catch (error) {
            logger.error(`Failed to get ${this.entityName} by id`, error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to retrieve ${this.entityName}`));
        }
    }
    /**
     * Create a new entity.
     */
    async create(input) {
        try {
            // Validate input
            const validationResult = this.validate(input);
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
            };
            data.push(newEntity);
            const saveResult = await this.saveToStorage(data);
            if (!saveResult.success) {
                return saveResult;
            }
            this.invalidateCache();
            // Emit create event
            this.emit(`${this.entityName.toLowerCase()}:created`, newEntity);
            return (0, result_1.ok)(newEntity);
        }
        catch (error) {
            logger.error(`Failed to create ${this.entityName}`, error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to create ${this.entityName}`));
        }
    }
    /**
     * Update an existing entity.
     */
    async update(id, updates) {
        try {
            const data = await this.loadFromStorage();
            const index = data.findIndex((entity) => entity.id === id);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)(this.entityName, id));
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
            return (0, result_1.ok)(updatedEntity);
        }
        catch (error) {
            logger.error(`Failed to update ${this.entityName}`, error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to update ${this.entityName}`));
        }
    }
    /**
     * Delete an entity by ID.
     */
    async delete(id) {
        try {
            const data = await this.loadFromStorage();
            const index = data.findIndex((entity) => entity.id === id);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)(this.entityName, id));
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
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error(`Failed to delete ${this.entityName}`, error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to delete ${this.entityName}`));
        }
    }
    /**
     * Check if an entity exists.
     */
    async exists(id) {
        const result = await this.getById(id);
        return result.success;
    }
    /**
     * Count entities, optionally filtered.
     */
    async count(filter) {
        const result = await this.getAll({ filter });
        if (!result.success)
            return result;
        return (0, result_1.ok)(result.data.length);
    }
    /**
     * Find first entity matching filter.
     */
    async findOne(filter) {
        const result = await this.getAll({ filter, limit: 1 });
        if (!result.success)
            return result;
        return (0, result_1.ok)(result.data[0] || null);
    }
    /**
     * Override in subclasses to add custom validation.
     * Return ok(undefined) if valid, err(validationError) if invalid.
     */
    validate(_input) {
        return (0, result_1.ok)(undefined);
    }
    /**
     * Bulk create entities.
     */
    async createMany(inputs) {
        try {
            const data = await this.loadFromStorage();
            const now = new Date().toISOString();
            const newEntities = [];
            for (const input of inputs) {
                const validationResult = this.validate(input);
                if (!validationResult.success) {
                    return validationResult;
                }
                newEntities.push({
                    ...input,
                    id: this.generateId(),
                    createdAt: now,
                    updatedAt: now,
                });
            }
            data.push(...newEntities);
            const saveResult = await this.saveToStorage(data);
            if (!saveResult.success) {
                return (0, result_1.err)(saveResult.error);
            }
            this.invalidateCache();
            return (0, result_1.ok)(newEntities);
        }
        catch (error) {
            logger.error(`Failed to create multiple ${this.entityName}`, error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to create ${this.entityName} entities`));
        }
    }
    /**
     * Delete multiple entities by IDs.
     */
    async deleteMany(ids) {
        try {
            const data = await this.loadFromStorage();
            const initialCount = data.length;
            const filtered = data.filter((entity) => !ids.includes(entity.id));
            const deletedCount = initialCount - filtered.length;
            if (deletedCount > 0) {
                const saveResult = await this.saveToStorage(filtered);
                if (!saveResult.success) {
                    return saveResult;
                }
                this.invalidateCache();
            }
            return (0, result_1.ok)(deletedCount);
        }
        catch (error) {
            logger.error(`Failed to delete multiple ${this.entityName}`, error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to delete ${this.entityName} entities`));
        }
    }
    /**
     * Clear all entities (useful for testing).
     */
    async clear() {
        const result = await this.saveToStorage([]);
        this.invalidateCache();
        return result;
    }
}
exports.BaseService = BaseService;
