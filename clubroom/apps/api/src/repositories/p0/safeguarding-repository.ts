import crypto from 'node:crypto';
import type {
  CreateSafeguardingActionRequest,
  CreateSafeguardingIncidentRequest,
  SafeguardingActionResponse,
  SafeguardingIncidentResponse,
} from '@clubroom/shared-contracts';
import {
  safeguardingActionResponseSchema,
  safeguardingIncidentResponseSchema,
} from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { notFound } from '../../lib/http-errors.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

type ContractStatus = 'open' | 'in_review' | 'closed';
type StoreStatus = 'OPEN' | 'IN_REVIEW' | 'CLOSED';

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export interface SafeguardingRepository {
  createIncident(
    body: CreateSafeguardingIncidentRequest,
    reportedByUserId: string,
  ): Promise<SafeguardingIncidentResponse>;
  getIncidentById(incidentId: string): Promise<SafeguardingIncidentResponse | null>;
  addAction(
    incidentId: string,
    body: CreateSafeguardingActionRequest,
    performedByUserId: string,
  ): Promise<{ action: SafeguardingActionResponse; incident: SafeguardingIncidentResponse }>;
}

function isActiveRow(row: SeedRow): boolean {
  return !asString(row.deletedAt);
}

function normalizeIncidentId(id: string): string {
  return id.startsWith('saf_') ? `safe_${id.slice('saf_'.length)}` : id;
}

function denormalizeIncidentId(id: string): string {
  return id.startsWith('safe_') ? `saf_${id.slice('safe_'.length)}` : id;
}

function normalizeActionId(id: string): string {
  return id.startsWith('sac_') ? `sact_${id.slice('sac_'.length)}` : id;
}

function denormalizeActionId(id: string): string {
  return id.startsWith('sact_') ? `sac_${id.slice('sact_'.length)}` : id;
}

function toContractStatus(value: string | undefined): ContractStatus {
  switch ((value ?? '').toUpperCase()) {
    case 'IN_REVIEW':
    case 'ESCALATED':
      return 'in_review';
    case 'RESOLVED':
    case 'CLOSED':
      return 'closed';
    case 'OPEN':
    default:
      return 'open';
  }
}

function fromActionTypeToStatus(actionType: string, currentStatus: ContractStatus): ContractStatus {
  if (actionType === 'close_case') {
    return 'closed';
  }
  if (actionType === 'reopen_case') {
    return 'in_review';
  }
  return currentStatus;
}

function toStoreStatus(status: ContractStatus): StoreStatus {
  switch (status) {
    case 'in_review':
      return 'IN_REVIEW';
    case 'closed':
      return 'CLOSED';
    case 'open':
    default:
      return 'OPEN';
  }
}

function toContractSeverity(value: string | undefined): 'low' | 'medium' | 'high' | 'critical' {
  switch ((value ?? '').toUpperCase()) {
    case 'LOW':
      return 'low';
    case 'HIGH':
      return 'high';
    case 'CRITICAL':
      return 'critical';
    case 'MEDIUM':
    default:
      return 'medium';
  }
}

function toStoreSeverity(value: string): string {
  return value.toUpperCase();
}

function toContractActionType(
  value: string | undefined,
): CreateSafeguardingActionRequest['actionType'] {
  switch ((value ?? '').toUpperCase()) {
    case 'ESCALATED':
      return 'escalated';
    case 'CONTACTED_GUARDIAN':
      return 'contacted_guardian';
    case 'CONTACTED_AUTHORITY':
      return 'contacted_authority';
    case 'CLOSED':
      return 'close_case';
    case 'REOPENED':
      return 'reopen_case';
    case 'NOTE_ADDED':
    case 'ASSIGNED_REVIEW':
    default:
      return 'note_added';
  }
}

function toStoreActionType(value: CreateSafeguardingActionRequest['actionType']): string {
  switch (value) {
    case 'close_case':
      return 'CLOSED';
    case 'reopen_case':
      return 'REOPENED';
    case 'contacted_guardian':
      return 'CONTACTED_GUARDIAN';
    case 'contacted_authority':
      return 'CONTACTED_AUTHORITY';
    case 'escalated':
      return 'ESCALATED';
    case 'note_added':
    default:
      return 'NOTE_ADDED';
  }
}

function mapAction(row: SeedRow): SafeguardingActionResponse {
  return safeguardingActionResponseSchema.parse({
    id: normalizeActionId(asString(row.id) ?? ''),
    incidentId: normalizeIncidentId(
      asString(row.safeguardingIncidentId) ?? asString(row.incidentId) ?? '',
    ),
    actionType: toContractActionType(asString(row.actionType)),
    notes: asString(row.note) ?? asString(row.notes) ?? '',
    performedByUserId: asString(row.actorUserId) ?? asString(row.performedByUserId) ?? '',
    createdAt: asString(row.occurredAt) ?? asString(row.createdAt) ?? isoNow(),
  });
}

function mapIncident(row: SeedRow, actionRows: SeedRow[]): SafeguardingIncidentResponse {
  return safeguardingIncidentResponseSchema.parse({
    id: normalizeIncidentId(asString(row.id) ?? ''),
    athleteId: asString(row.athleteId) ?? null,
    bookingId: asString(row.bookingId) ?? null,
    category: asString(row.category) ?? 'other',
    severity: toContractSeverity(asString(row.severity)),
    status: toContractStatus(asString(row.status)),
    summary: asString(row.summary) ?? asString(row.title) ?? '',
    details: asString(row.details) ?? asString(row.detailsEncrypted) ?? null,
    reportedByUserId: asString(row.reportedByUserId) ?? '',
    createdAt: asString(row.createdAt) ?? isoNow(),
    updatedAt: asString(row.updatedAt) ?? asString(row.createdAt) ?? isoNow(),
    actions: actionRows
      .map((action) => mapAction(action))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
  });
}

function findSeedIncident(tables: SeedTables, incidentId: string): SeedRow | undefined {
  return asRows(tables.safeguardingIncidents).find((row) => {
    const candidateId = asString(row.id) ?? '';
    return candidateId === incidentId || candidateId === denormalizeIncidentId(incidentId);
  });
}

function getSeedActions(tables: SeedTables, incidentId: string): SeedRow[] {
  return asRows(tables.safeguardingIncidentActions).filter((row) => {
    const candidateId = asString(row.safeguardingIncidentId) ?? asString(row.incidentId) ?? '';
    return candidateId === incidentId || candidateId === denormalizeIncidentId(incidentId);
  });
}

class SeedSafeguardingRepository implements SafeguardingRepository {
  protected tables(): SeedTables {
    return getMarketplaceSeedStore().tables;
  }

  async createIncident(
    body: CreateSafeguardingIncidentRequest,
    reportedByUserId: string,
  ): Promise<SafeguardingIncidentResponse> {
    const tables = this.tables();
    const incidents = asRows(tables.safeguardingIncidents);
    const now = isoNow();
    const row = {
      id: newId('safe'),
      athleteId: body.athleteId ?? null,
      bookingId: body.bookingId ?? null,
      category: body.category,
      reportedByUserId,
      assignedToUserId: null,
      status: 'OPEN',
      severity: toStoreSeverity(body.severity),
      title: body.summary,
      summary: body.summary,
      detailsEncrypted: body.details ?? null,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      deletedAt: null,
    };
    incidents.push(row);
    return mapIncident(row, []);
  }

  async getIncidentById(incidentId: string): Promise<SafeguardingIncidentResponse | null> {
    const tables = this.tables();
    const incident = findSeedIncident(tables, incidentId);
    if (!incident || !isActiveRow(incident)) {
      return null;
    }
    return mapIncident(incident, getSeedActions(tables, asString(incident.id) ?? incidentId));
  }

  async addAction(
    incidentId: string,
    body: CreateSafeguardingActionRequest,
    performedByUserId: string,
  ): Promise<{ action: SafeguardingActionResponse; incident: SafeguardingIncidentResponse }> {
    const tables = this.tables();
    const incident = findSeedIncident(tables, incidentId);
    if (!incident || !isActiveRow(incident)) {
      throw notFound('Safeguarding incident not found', { incidentId });
    }

    const actions = asRows(tables.safeguardingIncidentActions);
    const now = isoNow();
    const actionRow = {
      id: newId('sact'),
      safeguardingIncidentId: asString(incident.id) ?? incidentId,
      actionType: toStoreActionType(body.actionType),
      note: body.notes,
      metadataJson: {},
      actorUserId: performedByUserId,
      occurredAt: now,
    };
    actions.push(actionRow);

    const nextStatus = fromActionTypeToStatus(
      body.actionType,
      toContractStatus(asString(incident.status)),
    );
    incident.status = toStoreStatus(nextStatus);
    incident.updatedAt = now;
    incident.closedAt = nextStatus === 'closed' ? now : null;

    const mappedAction = mapAction(actionRow);
    const mappedIncident = mapIncident(
      incident,
      getSeedActions(tables, asString(incident.id) ?? incidentId),
    );
    return {
      action: mappedAction,
      incident: mappedIncident,
    };
  }
}

class FixtureSafeguardingRepository extends SeedSafeguardingRepository {
  protected override tables(): SeedTables {
    return getDbFixtureStore().tables;
  }
}

class DbSafeguardingRepository implements SafeguardingRepository {
  async createIncident(
    body: CreateSafeguardingIncidentRequest,
    reportedByUserId: string,
  ): Promise<SafeguardingIncidentResponse> {
    if (shouldUseDbFixtureFallback()) {
      return new FixtureSafeguardingRepository().createIncident(body, reportedByUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const created = await prisma.safeguardingIncident.create({
      data: {
        id: newId('safe'),
        athleteId: body.athleteId ?? null,
        bookingId: body.bookingId ?? null,
        category: body.category,
        reportedByUserId,
        status: 'OPEN',
        severity: toStoreSeverity(body.severity),
        title: body.summary,
        summary: body.summary,
        detailsEncrypted: body.details ?? null,
        occurredAt: new Date(),
      },
    });
    return mapIncident(normalizeForJson(created) as SeedRow, []);
  }

  async getIncidentById(incidentId: string): Promise<SafeguardingIncidentResponse | null> {
    if (shouldUseDbFixtureFallback()) {
      return new FixtureSafeguardingRepository().getIncidentById(incidentId);
    }

    const prisma = getPrismaClientOrThrow();
    const incident = await prisma.safeguardingIncident.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: incidentId }, { id: denormalizeIncidentId(incidentId) }],
      },
      include: {
        actions: {
          orderBy: {
            occurredAt: 'desc',
          },
        },
      },
    });
    if (!incident) {
      return null;
    }
    return mapIncident(
      normalizeForJson(incident) as SeedRow,
      normalizeForJson(incident.actions) as SeedRow[],
    );
  }

  async addAction(
    incidentId: string,
    body: CreateSafeguardingActionRequest,
    performedByUserId: string,
  ): Promise<{ action: SafeguardingActionResponse; incident: SafeguardingIncidentResponse }> {
    if (shouldUseDbFixtureFallback()) {
      return new FixtureSafeguardingRepository().addAction(incidentId, body, performedByUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const current = await prisma.safeguardingIncident.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: incidentId }, { id: denormalizeIncidentId(incidentId) }],
      },
    });
    if (!current) {
      throw notFound('Safeguarding incident not found', { incidentId });
    }

    const now = new Date();
    const nextStatus = fromActionTypeToStatus(body.actionType, toContractStatus(current.status));

    const result = await prisma.$transaction(async (tx) => {
      const [action, updated] = await Promise.all([
        tx.safeguardingIncidentAction.create({
          data: {
            id: newId('sact'),
            safeguardingIncidentId: current.id,
            actorUserId: performedByUserId,
            actionType: toStoreActionType(body.actionType),
            note: body.notes,
            metadataJson: {},
            occurredAt: now,
          },
        }),
        tx.safeguardingIncident.update({
          where: { id: current.id },
          data: {
            status: toStoreStatus(nextStatus),
            closedAt: nextStatus === 'closed' ? now : null,
          },
          include: {
            actions: {
              orderBy: {
                occurredAt: 'desc',
              },
            },
          },
        }),
      ]);
      return { action, updated };
    });

    return {
      action: mapAction(normalizeForJson(result.action) as SeedRow),
      incident: mapIncident(
        normalizeForJson(result.updated) as SeedRow,
        normalizeForJson(result.updated.actions) as SeedRow[],
      ),
    };
  }
}

const seedRepository = new SeedSafeguardingRepository();
const dbRepository = new DbSafeguardingRepository();

export function resolveSafeguardingRepository(): SafeguardingRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
