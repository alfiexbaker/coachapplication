import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import {
  createSafeguardingActionRequestSchema,
  createSafeguardingIncidentRequestSchema,
  safeguardingActionResponseSchema,
  safeguardingIncidentIdSchema,
  safeguardingIncidentResponseSchema,
  type SafeguardingActionResponse,
  type SafeguardingIncidentResponse,
} from '@clubroom/shared-contracts';
import { forbidden, notFound } from '../../lib/http-errors.js';
import {
  assertCanAccessSafeguardingIncident,
  assertCanCreateSafeguardingIncident,
} from '../../lib/authz.js';

const incidentsById = new Map<string, SafeguardingIncidentResponse>();
const actionsByIncidentId = new Map<string, SafeguardingActionResponse[]>();

const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const seededAction = safeguardingActionResponseSchema.parse({
  id: 'sact_seed-review-note',
  incidentId: 'safe_seed-booking-safety',
  actionType: 'note_added',
  notes: 'Initial safeguarding triage completed for fixture incident.',
  performedByUserId: 'usr_clubadmin1',
  createdAt: '2026-02-27T11:00:00.000Z',
});

const seededIncident = safeguardingIncidentResponseSchema.parse({
  id: 'safe_seed-booking-safety',
  athleteId: 'ath_user1',
  bookingId: 'bok_seed-booking1',
  category: 'booking_issue_safety',
  severity: 'high',
  status: 'in_review',
  summary: 'Fixture: safety issue reported from bookings report-problem flow.',
  details: 'Used as default trust/ops test fixture in pre-API mode.',
  reportedByUserId: 'usr_parent1',
  createdAt: '2026-02-27T10:45:00.000Z',
  updatedAt: '2026-02-27T11:00:00.000Z',
  actions: [seededAction],
});

incidentsById.set(seededIncident.id, seededIncident);
actionsByIncidentId.set(seededIncident.id, [seededAction]);

const ensureAuthUserId = (userId?: string) => {
  if (!userId) {
    throw forbidden('Authenticated user is required');
  }
  return userId;
};

const trustOpsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/safeguarding/incidents', async (request, reply) => {
    const body = createSafeguardingIncidentRequestSchema.parse(request.body);
    assertCanCreateSafeguardingIncident(request, body.athleteId ?? null);
    const reportedByUserId = ensureAuthUserId(request.auth?.userId);
    const now = isoNow();

    const incident = safeguardingIncidentResponseSchema.parse({
      id: newId('safe'),
      athleteId: body.athleteId ?? null,
      bookingId: body.bookingId ?? null,
      category: body.category,
      severity: body.severity,
      status: 'open',
      summary: body.summary,
      details: body.details ?? null,
      reportedByUserId,
      createdAt: now,
      updatedAt: now,
      actions: [],
    });

    incidentsById.set(incident.id, incident);
    actionsByIncidentId.set(incident.id, []);
    return reply.status(201).send(incident);
  });

  app.get('/safeguarding/incidents/:incidentId', async (request, reply) => {
    const incidentId = safeguardingIncidentIdSchema.parse(
      (request.params as { incidentId: string }).incidentId,
    );
    const incident = incidentsById.get(incidentId);
    if (!incident) {
      throw notFound('Safeguarding incident not found', { incidentId });
    }
    assertCanAccessSafeguardingIncident(request, incident);
    return reply.send(incident);
  });

  app.post('/safeguarding/incidents/:incidentId/actions', async (request, reply) => {
    const incidentId = safeguardingIncidentIdSchema.parse(
      (request.params as { incidentId: string }).incidentId,
    );
    const incident = incidentsById.get(incidentId);
    if (!incident) {
      throw notFound('Safeguarding incident not found', { incidentId });
    }
    assertCanAccessSafeguardingIncident(request, incident);

    const body = createSafeguardingActionRequestSchema.parse(request.body);
    const performedByUserId = ensureAuthUserId(request.auth?.userId);
    const now = isoNow();

    const action = safeguardingActionResponseSchema.parse({
      id: newId('sact'),
      incidentId,
      actionType: body.actionType,
      notes: body.notes,
      performedByUserId,
      createdAt: now,
    });

    const existingActions = actionsByIncidentId.get(incidentId) ?? [];
    const nextActions = [action, ...existingActions];
    actionsByIncidentId.set(incidentId, nextActions);

    const nextStatus =
      body.actionType === 'close_case'
        ? 'closed'
        : body.actionType === 'reopen_case'
          ? 'in_review'
          : incident.status;

    const updatedIncident = safeguardingIncidentResponseSchema.parse({
      ...incident,
      status: nextStatus,
      updatedAt: now,
      actions: nextActions,
    });
    incidentsById.set(incidentId, updatedIncident);

    return reply.status(201).send(action);
  });
};

export default trustOpsRoutes;
