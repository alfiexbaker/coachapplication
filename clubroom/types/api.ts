/**
 * API Type Definitions
 *
 * Common types for API requests and responses.
 * Used in conjunction with the HTTP client service.
 */

// ============================================================================
// Generic Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T> {
  data: T[];
  success: boolean;
  pagination: PaginationMeta;
  error?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error response structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

/**
 * Validation error response
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Full error response from API
 */
export interface ErrorResponse {
  success: false;
  error: string;
  errors?: ValidationError[];
  code?: string;
  statusCode?: number;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Search/filter parameters for list endpoints
 */
export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, string | number | boolean | string[]>;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Common Entity Types (for API responses)
// ============================================================================

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Entity with soft delete
 */
export interface SoftDeletableEntity extends BaseEntity {
  deletedAt?: string;
  isDeleted: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the data type from an ApiResponse
 */
export type ExtractData<T> = T extends ApiResponse<infer U> ? U : never;

/**
 * Create a type for creating a new entity (without id and timestamps)
 */
export type CreateDTO<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Create a type for updating an entity (all fields optional except id)
 */
export type UpdateDTO<T extends BaseEntity> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>> & {
  id: string;
};

// ============================================================================
// API Method Types
// ============================================================================

/**
 * Standard CRUD operations response types
 */
export interface CrudResponses<T> {
  list: PaginatedResponse<T>;
  get: ApiResponse<T>;
  create: ApiResponse<T>;
  update: ApiResponse<T>;
  delete: ApiResponse<{ deleted: boolean }>;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse<T> {
  success: boolean;
  succeeded: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  totalProcessed: number;
  totalSucceeded: number;
  totalFailed: number;
}
