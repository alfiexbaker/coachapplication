/**
 * Concern Service
 *
 * Manages coach concerns about athletes — behavioral, safeguarding,
 * medical, attendance, and parent communication issues.
 *
 * Extends BaseService<AthleteConcern> for standardized CRUD, caching,
 * and storage operations.
 */

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { BaseService } from './base-service';
import { emitTyped, ServiceEvents } from './event-bus';
import { createLogger } from '@/utils/logger';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  validationError,
} from '@/types/result';

const logger = createLogger('ConcernService');

// ============================================================================
// TYPES
// ============================================================================

export type ConcernType =
  | 'BEHAVIORAL'
  | 'SAFEGUARDING'
  | 'MEDICAL'
  | 'ATTENDANCE'
  | 'PARENT_COMMUNICATION';

export type ConcernSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ConcernStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';

export interface AthleteConcern {
  id: string;
  coachId: string;
  athleteId: string;
  athleteName: string;
  type: ConcernType;
  severity: ConcernSeverity;
  title: string;
  description: string;
  actionTaken?: string;
  followUpDate?: string;
  status: ConcernStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export const CONCERN_TYPE_LABELS: Record<ConcernType, string> = {
  BEHAVIORAL: 'Behavioral',
  SAFEGUARDING: 'Safeguarding',
  MEDICAL: 'Medical',
  ATTENDANCE: 'Attendance',
  PARENT_COMMUNICATION: 'Parent Communication',
};

export const CONCERN_TYPE_ICONS: Record<ConcernType, string> = {
  BEHAVIORAL: 'alert-circle',
  SAFEGUARDING: 'shield',
  MEDICAL: 'medkit',
  ATTENDANCE: 'time',
  PARENT_COMMUNICATION: 'chatbubbles',
};

export const CONCERN_SEVERITY_LABELS: Record<ConcernSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const CONCERN_STATUS_LABELS: Record<ConcernStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  ESCALATED: 'Escalated',
};

// ============================================================================
// SERVICE
// ============================================================================

class ConcernServiceImpl extends BaseService<AthleteConcern> {
  protected storageKey = STORAGE_KEYS.CONCERNS;
  protected entityName = 'Concern';

  /**
   * Raise a new concern about an athlete.
   */
  async raiseConcern(
    input: Omit<AthleteConcern, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<Result<AthleteConcern, ServiceError>> {
    if (!input.title.trim()) {
      return err(validationError('Title is required'));
    }
    if (!input.description.trim()) {
      return err(validationError('Description is required'));
    }

    const result = await this.create({
      ...input,
      status: 'OPEN',
    } as Omit<AthleteConcern, 'id' | 'createdAt' | 'updatedAt'>);

    if (result.success) {
      emitTyped(ServiceEvents.CONCERN_RAISED, {
        concernId: result.data.id,
        coachId: result.data.coachId,
        athleteId: result.data.athleteId,
        athleteName: result.data.athleteName,
        type: result.data.type,
        severity: result.data.severity,
      });
      logger.info('Concern raised', { id: result.data.id, type: input.type });
    }

    return result;
  }

  /**
   * Get all concerns for a specific athlete.
   */
  async getForAthlete(
    coachId: string,
    athleteId: string
  ): Promise<Result<AthleteConcern[], ServiceError>> {
    return this.getAll({
      filter: { coachId, athleteId } as Partial<AthleteConcern>,
      sort: 'createdAt' as keyof AthleteConcern,
      sortDirection: 'desc',
    });
  }

  /**
   * Get all open concerns for a coach.
   */
  async getOpenConcerns(
    coachId: string
  ): Promise<Result<AthleteConcern[], ServiceError>> {
    const result = await this.getAll({
      filter: { coachId } as Partial<AthleteConcern>,
    });
    if (!result.success) return result;

    return ok(
      result.data.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS')
    );
  }

  /**
   * Resolve a concern.
   */
  async resolveConcern(
    id: string,
    resolution: string
  ): Promise<Result<AthleteConcern, ServiceError>> {
    const result = await this.update(id, {
      status: 'RESOLVED',
      resolution,
      resolvedAt: new Date().toISOString(),
    } as Partial<AthleteConcern>);

    if (result.success) {
      emitTyped(ServiceEvents.CONCERN_RESOLVED, {
        concernId: id,
        resolution,
      });
    }

    return result;
  }

  /**
   * Update concern status.
   */
  async updateStatus(
    id: string,
    status: ConcernStatus
  ): Promise<Result<AthleteConcern, ServiceError>> {
    const result = await this.update(id, {
      status,
    } as Partial<AthleteConcern>);

    if (result.success) {
      emitTyped(ServiceEvents.CONCERN_UPDATED, {
        concernId: id,
        status,
        changes: { status },
      });
    }

    return result;
  }

  /**
   * Get severity color for display.
   */
  getSeverityColor(severity: ConcernSeverity): string {
    const colors: Record<ConcernSeverity, string> = {
      LOW: '#6B7280',
      MEDIUM: '#CA8A04',
      HIGH: '#EA580C',
      URGENT: '#DC2626',
    };
    return colors[severity];
  }

  /**
   * Get status color for display.
   */
  getStatusColor(status: ConcernStatus): string {
    const colors: Record<ConcernStatus, string> = {
      OPEN: '#DC2626',
      IN_PROGRESS: '#CA8A04',
      RESOLVED: '#16A34A',
      ESCALATED: '#7C3AED',
    };
    return colors[status];
  }
}

export const concernService = new ConcernServiceImpl();
