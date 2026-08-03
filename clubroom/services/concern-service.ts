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
import { apiClient } from './api-client';
import { BaseService, type PagedResult, type QueryOptions } from './base-service';
import { emitTyped, ServiceEvents } from './event-bus';
import { notificationService } from './notification-service';
import { reportService } from './report-service';
import { safeguardingService } from '@/services/trust';
import type { SafeguardingIncident } from '@/services/trust/safeguarding-service';
import { createLogger } from '@/utils/logger';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  validationError,
  serviceError,
} from '@/types/result';

const logger = createLogger('ConcernService');

type ApiSafeguardingCategory =
  | 'session_conduct'
  | 'injury_followup'
  | 'medical_concern'
  | 'booking_issue_safety'
  | 'other';
type ApiSafeguardingSeverity = 'low' | 'medium' | 'high' | 'critical';
type ApiSafeguardingStatus = 'open' | 'in_review' | 'closed';

const API_CATEGORY_FROM_CONCERN_TYPE: Record<ConcernType, ApiSafeguardingCategory> = {
  BEHAVIORAL: 'session_conduct',
  SAFEGUARDING: 'session_conduct',
  MEDICAL: 'medical_concern',
  ATTENDANCE: 'other',
  PARENT_COMMUNICATION: 'other',
};

const API_SEVERITY_FROM_CONCERN_SEVERITY: Record<ConcernSeverity, ApiSafeguardingSeverity> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'critical',
};

const CONCERN_STATUS_FROM_API_STATUS: Record<ApiSafeguardingStatus, ConcernStatus> = {
  open: 'OPEN',
  in_review: 'IN_PROGRESS',
  closed: 'RESOLVED',
};

const CONCERN_TYPE_FROM_API_CATEGORY: Record<ApiSafeguardingCategory, ConcernType> = {
  session_conduct: 'BEHAVIORAL',
  injury_followup: 'MEDICAL',
  medical_concern: 'MEDICAL',
  booking_issue_safety: 'SAFEGUARDING',
  other: 'SAFEGUARDING',
};

const CONCERN_SEVERITY_FROM_API_SEVERITY: Record<ApiSafeguardingSeverity, ConcernSeverity> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'URGENT',
};

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
  parentId?: string;
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
  escalatedAt?: string;
  escalationReason?: string;
  parentNotifiedAt?: string;
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

type ApiSafeguardingAction = SafeguardingIncident['actions'][number];

function latestApiAction(
  incident: SafeguardingIncident,
  actionType: ApiSafeguardingAction['actionType'],
): ApiSafeguardingAction | undefined {
  return incident.actions
    .filter((action) => action.actionType === actionType)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

function mapApiIncidentToConcern(incident: SafeguardingIncident): AthleteConcern | null {
  if (!incident.athleteId) {
    return null;
  }

  const closedAction = latestApiAction(incident, 'close_case');
  const escalatedAction = latestApiAction(incident, 'escalated');
  const status =
    incident.status === 'closed'
      ? 'RESOLVED'
      : escalatedAction
        ? 'ESCALATED'
        : CONCERN_STATUS_FROM_API_STATUS[incident.status];

  return {
    id: incident.id,
    coachId: incident.reportedByUserId,
    athleteId: incident.athleteId,
    athleteName: incident.athleteId,
    type: CONCERN_TYPE_FROM_API_CATEGORY[incident.category],
    severity: CONCERN_SEVERITY_FROM_API_SEVERITY[incident.severity],
    title: incident.summary,
    description: incident.details ?? incident.summary,
    status,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
    resolvedAt: closedAction?.createdAt,
    resolution: closedAction?.notes,
    escalatedAt: escalatedAction?.createdAt,
    escalationReason: escalatedAction?.notes,
  };
}

function actionTypeForConcernStatus(status: ConcernStatus): ApiSafeguardingAction['actionType'] {
  switch (status) {
    case 'RESOLVED':
      return 'close_case';
    case 'IN_PROGRESS':
      return 'reopen_case';
    case 'ESCALATED':
      return 'escalated';
    case 'OPEN':
    default:
      return 'note_added';
  }
}

// ============================================================================
// SERVICE
// ============================================================================

class ConcernServiceImpl extends BaseService<AthleteConcern> {
  protected storageKey = STORAGE_KEYS.CONCERNS;
  protected entityName = 'Concern';

  private unsupportedGenericStorageMethod(method: string): Result<never, ServiceError> {
    return err(
      serviceError(
        'UNSUPPORTED',
        `Concern ${method} is mock-only. Use the safeguarding /v1 concern methods in API mode.`,
      ),
    );
  }

  override async getAll(
    options?: QueryOptions<AthleteConcern>,
  ): Promise<Result<AthleteConcern[], ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('getAll');
    return super.getAll(options);
  }

  override async getPaged(
    options?: QueryOptions<AthleteConcern>,
  ): Promise<Result<PagedResult<AthleteConcern>, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('getPaged');
    return super.getPaged(options);
  }

  override async getById(id: string): Promise<Result<AthleteConcern, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('getById');
    return super.getById(id);
  }

  override async create(
    input: Omit<AthleteConcern, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Result<AthleteConcern, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('create');
    return super.create(input);
  }

  override async update(
    id: string,
    updates: Partial<AthleteConcern>,
  ): Promise<Result<AthleteConcern, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('update');
    return super.update(id, updates);
  }

  override async delete(id: string): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('delete');
    return super.delete(id);
  }

  override async hardDelete(id: string): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('hardDelete');
    return super.hardDelete(id);
  }

  override async restore(id: string): Promise<Result<AthleteConcern, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('restore');
    return super.restore(id);
  }

  override async exists(id: string): Promise<boolean> {
    if (!apiClient.isMockMode) {
      void this.unsupportedGenericStorageMethod('exists');
      return false;
    }
    return super.exists(id);
  }

  override async count(filter?: Partial<AthleteConcern>): Promise<Result<number, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('count');
    return super.count(filter);
  }

  override async findOne(
    filter: Partial<AthleteConcern>,
  ): Promise<Result<AthleteConcern | null, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('findOne');
    return super.findOne(filter);
  }

  override async createMany(
    inputs: Omit<AthleteConcern, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<Result<AthleteConcern[], ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('createMany');
    return super.createMany(inputs);
  }

  override async deleteMany(ids: string[]): Promise<Result<number, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('deleteMany');
    return super.deleteMany(ids);
  }

  override async clear(): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) return this.unsupportedGenericStorageMethod('clear');
    return super.clear();
  }

  private shouldAutoEscalate(type: ConcernType, severity: ConcernSeverity): boolean {
    if (severity === 'URGENT') return true;
    if (severity === 'HIGH' && (type === 'SAFEGUARDING' || type === 'MEDICAL')) return true;
    return false;
  }

  private async runEscalationSideEffects(
    concern: AthleteConcern,
    timestamp: string,
  ): Promise<AthleteConcern> {
    const reportResult = await reportService.submitReport({
      reportedUserId: concern.athleteId,
      reportedByUserId: concern.coachId,
      type: 'safety_concern',
      context: 'profile',
      description: `${concern.title}\n\n${concern.description}`,
    });
    if (!reportResult.success) {
      logger.error('Failed to mirror escalated concern to reports', {
        concernId: concern.id,
        error: reportResult.error.message,
      });
    }

    if (!concern.parentId) {
      return concern;
    }

    const parentNotifyResult = await notificationService.create({
      id: `notif_concern_${Date.now()}`,
      type: 'reminder',
      notificationType: 'MESSAGE_RECEIVED',
      title: 'Important Safeguarding Update',
      body: `A ${CONCERN_TYPE_LABELS[concern.type].toLowerCase()} concern was raised for ${concern.athleteName}.`,
      recipientId: concern.parentId,
      recipientRole: 'parent',
      deepLink: `/roster/${concern.athleteId}/raise-concern`,
      read: false,
      timeLabel: 'Just now',
    });

    if (!parentNotifyResult.success) {
      return concern;
    }

    return {
      ...concern,
      parentNotifiedAt: timestamp,
    };
  }

  private emitConcernRaised(concern: AthleteConcern): void {
    emitTyped(ServiceEvents.CONCERN_RAISED, {
      concernId: concern.id,
      coachId: concern.coachId,
      athleteId: concern.athleteId,
      athleteName: concern.athleteName,
      type: concern.type,
      severity: concern.severity,
    });
  }

  /**
   * Raise a new concern about an athlete.
   */
  async raiseConcern(
    input: Omit<AthleteConcern, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
  ): Promise<Result<AthleteConcern, ServiceError>> {
    if (!input.title.trim()) {
      return err(validationError('Title is required'));
    }
    if (!input.description.trim()) {
      return err(validationError('Description is required'));
    }

    const autoEscalate = this.shouldAutoEscalate(input.type, input.severity);
    const now = new Date().toISOString();
    const escalationReason = autoEscalate
      ? `${CONCERN_TYPE_LABELS[input.type]} concern marked ${CONCERN_SEVERITY_LABELS[input.severity]}`
      : undefined;

    if (!apiClient.isMockMode) {
      const incidentResult = await safeguardingService.createIncident({
        athleteId: input.athleteId,
        category: API_CATEGORY_FROM_CONCERN_TYPE[input.type],
        severity: API_SEVERITY_FROM_CONCERN_SEVERITY[input.severity],
        summary: input.title.trim(),
        details: input.actionTaken
          ? `${input.description.trim()}\n\nAction taken: ${input.actionTaken.trim()}`
          : input.description.trim(),
      });
      if (!incidentResult.success) {
        return incidentResult;
      }

      const incident = incidentResult.data;
      let updatedAt = incident.updatedAt;
      let escalatedAt = autoEscalate ? now : undefined;

      if (autoEscalate && escalationReason) {
        const escalationAction = await safeguardingService.addAction(
          incident.id,
          {
            actionType: 'escalated',
            notes: input.actionTaken?.trim()
              ? `${escalationReason}\n\nImmediate action: ${input.actionTaken.trim()}`
              : escalationReason,
          },
          input.athleteId,
        );

        if (!escalationAction.success) {
          logger.error('Failed to append required escalation action to safeguarding incident', {
            incidentId: incident.id,
            athleteId: input.athleteId,
            error: escalationAction.error.message,
          });
          return err(escalationAction.error);
        } else {
          updatedAt = escalationAction.data.createdAt;
          escalatedAt = escalationAction.data.createdAt;
        }
      }

      let concern: AthleteConcern = {
        id: incident.id,
        coachId: input.coachId,
        athleteId: input.athleteId,
        parentId: input.parentId,
        athleteName: input.athleteName,
        type: input.type,
        severity: input.severity,
        title: input.title.trim(),
        description: input.description.trim(),
        actionTaken: input.actionTaken,
        followUpDate: input.followUpDate,
        status: autoEscalate ? 'ESCALATED' : CONCERN_STATUS_FROM_API_STATUS[incident.status],
        createdAt: incident.createdAt,
        updatedAt,
        escalatedAt,
        escalationReason,
      };

      this.emitConcernRaised(concern);
      logger.info('Concern raised via API', {
        id: concern.id,
        type: input.type,
        autoEscalate,
      });
      return ok(concern);
    }

    const result = await this.create({
      ...input,
      status: autoEscalate ? 'ESCALATED' : 'OPEN',
      escalatedAt: autoEscalate ? now : undefined,
      escalationReason,
    } as Omit<AthleteConcern, 'id' | 'createdAt' | 'updatedAt'>);

    if (!result.success) {
      return result;
    }

    let concern = result.data;
    if (autoEscalate) {
      concern = await this.runEscalationSideEffects(concern, now);

      if (concern.parentNotifiedAt && concern.parentNotifiedAt !== result.data.parentNotifiedAt) {
        const updateResult = await this.update(result.data.id, {
          parentNotifiedAt: concern.parentNotifiedAt,
        } as Partial<AthleteConcern>);
        if (updateResult.success) {
          concern = updateResult.data;
        }
      }
    }

    this.emitConcernRaised(concern);
    logger.info('Concern raised', { id: concern.id, type: input.type, autoEscalate });
    return ok(concern);
  }

  /**
   * Get all concerns for a specific athlete.
   */
  async getForAthlete(
    coachId: string,
    athleteId: string,
  ): Promise<Result<AthleteConcern[], ServiceError>> {
    if (!apiClient.isMockMode) {
      void coachId;
      const result = await safeguardingService.listIncidents({
        athleteId,
        reportedBy: 'me',
        limit: 100,
      });
      if (!result.success) {
        return result;
      }
      return ok(
        result.data.incidents.flatMap((incident) => {
          const concern = mapApiIncidentToConcern(incident);
          return concern ? [concern] : [];
        }),
      );
    }

    return this.getAll({
      filter: { coachId, athleteId } as Partial<AthleteConcern>,
      sort: 'createdAt' as keyof AthleteConcern,
      sortDirection: 'desc',
    });
  }

  /**
   * Get all open concerns for a coach.
   */
  async getOpenConcerns(coachId: string): Promise<Result<AthleteConcern[], ServiceError>> {
    if (!apiClient.isMockMode) {
      void coachId;
      const result = await safeguardingService.listIncidents({
        status: ['open', 'in_review'],
        reportedBy: 'me',
        limit: 100,
      });
      if (!result.success) {
        return result;
      }
      return ok(
        result.data.incidents.flatMap((incident) => {
          const concern = mapApiIncidentToConcern(incident);
          return concern ? [concern] : [];
        }),
      );
    }

    const result = await this.getAll({
      filter: { coachId } as Partial<AthleteConcern>,
    });
    if (!result.success) return result;

    return ok(result.data.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS'));
  }

  /**
   * Resolve a concern.
   */
  async resolveConcern(
    id: string,
    resolution: string,
  ): Promise<Result<AthleteConcern, ServiceError>> {
    if (!apiClient.isMockMode) {
      const trimmedResolution = resolution.trim();
      if (!trimmedResolution) {
        return err(validationError('Resolution is required'));
      }

      const actionResult = await safeguardingService.addAction(id, {
        actionType: 'close_case',
        notes: trimmedResolution,
      });
      if (!actionResult.success) {
        return actionResult;
      }

      const incidentResult = await safeguardingService.getIncident(id);
      if (!incidentResult.success) {
        return incidentResult;
      }
      const concern = mapApiIncidentToConcern(incidentResult.data);
      if (!concern) {
        return err(serviceError('NOT_FOUND', 'Concern is not linked to an athlete.'));
      }

      emitTyped(ServiceEvents.CONCERN_RESOLVED, {
        concernId: id,
        resolution: trimmedResolution,
      });
      return ok(concern);
    }

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
    status: ConcernStatus,
  ): Promise<Result<AthleteConcern, ServiceError>> {
    if (!apiClient.isMockMode) {
      const actionResult = await safeguardingService.addAction(id, {
        actionType: actionTypeForConcernStatus(status),
        notes: `Concern status updated to ${CONCERN_STATUS_LABELS[status]}.`,
      });
      if (!actionResult.success) {
        return actionResult;
      }

      const incidentResult = await safeguardingService.getIncident(id);
      if (!incidentResult.success) {
        return incidentResult;
      }
      const concern = mapApiIncidentToConcern(incidentResult.data);
      if (!concern) {
        return err(serviceError('NOT_FOUND', 'Concern is not linked to an athlete.'));
      }

      emitTyped(ServiceEvents.CONCERN_UPDATED, {
        concernId: id,
        status: concern.status,
        changes: { status: concern.status },
      });
      return ok(concern);
    }

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
