import type { FastifyPluginAsync } from 'fastify';
import {
  createSafeguardingActionRequestSchema,
  createSafeguardingIncidentRequestSchema,
  safeguardingIncidentIdSchema,
} from '@clubroom/shared-contracts';
import { forbidden, notFound } from '../../lib/http-errors.js';
import {
  assertCanAccessSafeguardingIncident,
  assertCanCreateSafeguardingIncident,
} from '../../lib/authz.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { resolveSafeguardingRepository } from '../../repositories/p0/safeguarding-repository.js';

const ensureAuthUserId = (userId?: string) => {
  if (!userId) {
    throw forbidden('Authenticated user is required');
  }
  return userId;
};

const trustOpsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/safeguarding/incidents', async (request, reply) => {
    const body = createSafeguardingIncidentRequestSchema.parse(request.body);
    await assertCanCreateSafeguardingIncident(request, body.athleteId ?? null);
    const reportedByUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveSafeguardingRepository();
    const incident = await repository.createIncident(body, reportedByUserId);
    await recordAuditEvent({
      request,
      action: 'safeguarding_incident.create',
      resourceType: 'safeguarding_incident',
      resourceId: incident.id,
      result: 'SUCCESS',
      metadata: {
        athleteId: incident.athleteId,
        bookingId: incident.bookingId,
        category: incident.category,
      },
    });

    return reply.status(201).send(incident);
  });

  app.get('/safeguarding/incidents/:incidentId', async (request, reply) => {
    const incidentId = safeguardingIncidentIdSchema.parse(
      (request.params as { incidentId: string }).incidentId,
    );
    const repository = resolveSafeguardingRepository();
    const incident = await repository.getIncidentById(incidentId);
    if (!incident) {
      throw notFound('Safeguarding incident not found', { incidentId });
    }
    await assertCanAccessSafeguardingIncident(request, incident);
    await recordAuditEvent({
      request,
      action: 'safeguarding_incident.read',
      resourceType: 'safeguarding_incident',
      resourceId: incident.id,
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        athleteId: incident.athleteId,
      },
    });
    return reply.send(incident);
  });

  app.post('/safeguarding/incidents/:incidentId/actions', async (request, reply) => {
    const incidentId = safeguardingIncidentIdSchema.parse(
      (request.params as { incidentId: string }).incidentId,
    );
    const repository = resolveSafeguardingRepository();
    const incident = await repository.getIncidentById(incidentId);
    if (!incident) {
      throw notFound('Safeguarding incident not found', { incidentId });
    }
    await assertCanAccessSafeguardingIncident(request, incident);

    const body = createSafeguardingActionRequestSchema.parse(request.body);
    const performedByUserId = ensureAuthUserId(request.auth?.userId);
    const result = await repository.addAction(incidentId, body, performedByUserId);
    await recordAuditEvent({
      request,
      action: 'safeguarding_incident.action',
      resourceType: 'safeguarding_incident',
      resourceId: result.incident.id,
      result: 'SUCCESS',
      metadata: {
        actionId: result.action.id,
        actionType: result.action.actionType,
        status: result.incident.status,
      },
    });

    return reply.status(201).send(result.action);
  });
};

export default trustOpsRoutes;
