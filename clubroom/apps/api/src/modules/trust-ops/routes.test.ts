import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { buildApp } from '../../app.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const uniqueSuffix = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function auditRows(tables: Record<string, SeedRow[]>, action: string, result: string): SeedRow[] {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === action && asString(row.result) === result,
  );
}

describe('trust-ops safeguarding routes', () => {
  const app = buildApp();

  after(async () => {
    await app.close();
  });

  it('creates and retrieves safeguarding incidents', async () => {
    const parentHeaders = {
      'x-auth-user-id': 'usr_parent1',
      'x-auth-roles': 'parent',
      'x-acting-role': 'parent',
      'x-guardian-athlete-ids': 'ath_user1',
    };

    const create = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: parentHeaders,
      payload: {
        athleteId: 'ath_user1',
        bookingId: 'bok_booking1a',
        category: 'booking_issue_safety',
        severity: 'high',
        summary: 'Parent reported unsafe conduct after session',
        details: 'Booking issue raised from bookings/report-problem path.',
      },
    });

    assert.equal(create.statusCode, 201);
    const incident = create.json() as { id: string; status: string; actions: unknown[] };
    assert.match(incident.id, /^safe_/);
    assert.equal(incident.status, 'open');
    assert.deepEqual(incident.actions, []);

    const get = await app.inject({
      method: 'GET',
      url: `/v1/safeguarding/incidents/${incident.id}`,
      headers: parentHeaders,
    });

    assert.equal(get.statusCode, 200);
    const fetched = get.json() as { id: string; status: string };
    assert.equal(fetched.id, incident.id);
    assert.equal(fetched.status, 'open');
  });

  it('lists safeguarding incidents with filters and audits sensitive reads', async () => {
    const suffix = uniqueSuffix();
    const athleteId = `ath_list${suffix}`;
    const otherAthleteId = `ath_other${suffix}`;
    const coachHeaders = {
      'x-auth-user-id': 'usr_coach1',
      'x-auth-roles': 'coach',
      'x-acting-role': 'coach',
      'x-coach-athlete-ids': `${athleteId},${otherAthleteId}`,
      'x-coach-verified': '1',
    };

    const targetCreate = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: coachHeaders,
      payload: {
        athleteId,
        category: 'session_conduct',
        severity: 'medium',
        summary: 'Filtered list target concern',
      },
    });
    assert.equal(targetCreate.statusCode, 201);
    const targetIncident = targetCreate.json() as { id: string };

    const otherCreate = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: coachHeaders,
      payload: {
        athleteId: otherAthleteId,
        category: 'session_conduct',
        severity: 'medium',
        summary: 'Filtered list unrelated concern',
      },
    });
    assert.equal(otherCreate.statusCode, 201);
    const otherIncident = otherCreate.json() as { id: string };

    const list = await app.inject({
      method: 'GET',
      url: `/v1/safeguarding/incidents?athleteId=${athleteId}&status=open&reportedBy=me`,
      headers: coachHeaders,
    });
    assert.equal(list.statusCode, 200);
    const payload = list.json() as { incidents: Array<{ id: string; athleteId: string }> };
    assert.equal(payload.incidents.some((incident) => incident.id === targetIncident.id), true);
    assert.equal(payload.incidents.some((incident) => incident.id === otherIncident.id), false);
    assert.equal(
      payload.incidents.every((incident) => incident.athleteId === athleteId),
      true,
    );

    const deniedAthleteId = `ath_denied${suffix}`;
    const denied = await app.inject({
      method: 'GET',
      url: `/v1/safeguarding/incidents?athleteId=${deniedAthleteId}&reportedBy=any`,
      headers: coachHeaders,
    });
    assert.equal(denied.statusCode, 403);

    const tables = getMarketplaceSeedStore().tables as Record<string, SeedRow[]>;
    assert.equal(
      auditRows(tables, 'safeguarding_incident.list', 'SUCCESS').some(
        (row) =>
          asString(row.actorUserId) === 'usr_coach1' &&
          asString(row.resourceId) === athleteId &&
          row.sensitiveRead === true,
      ),
      true,
    );
    assert.equal(
      auditRows(tables, 'safeguarding_incident.list', 'DENY').some(
        (row) =>
          asString(row.actorUserId) === 'usr_coach1' &&
          asString(row.resourceId) === deniedAthleteId &&
          row.sensitiveRead === true,
      ),
      true,
    );
  });

  it('appends actions and updates status for close/reopen transitions', async () => {
    const coachHeaders = {
      'x-auth-user-id': 'usr_coach1',
      'x-auth-roles': 'coach',
      'x-acting-role': 'coach',
      'x-coach-athlete-ids': 'ath_user2',
      'x-coach-verified': '1',
    };

    const create = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: coachHeaders,
      payload: {
        athleteId: 'ath_user2',
        category: 'session_conduct',
        summary: 'Concern raised from session completion end-flow.',
      },
    });
    assert.equal(create.statusCode, 201);
    const incident = create.json() as { id: string };

    const closeAction = await app.inject({
      method: 'POST',
      url: `/v1/safeguarding/incidents/${incident.id}/actions`,
      headers: coachHeaders,
      payload: {
        actionType: 'close_case',
        notes: 'Case closed after safeguarding review.',
      },
    });
    assert.equal(closeAction.statusCode, 201);
    const closePayload = closeAction.json() as {
      id: string;
      incidentId: string;
      actionType: string;
    };
    assert.match(closePayload.id, /^sact_/);
    assert.equal(closePayload.incidentId, incident.id);
    assert.equal(closePayload.actionType, 'close_case');

    const closedIncident = await app.inject({
      method: 'GET',
      url: `/v1/safeguarding/incidents/${incident.id}`,
      headers: coachHeaders,
    });
    assert.equal(closedIncident.statusCode, 200);
    const closed = closedIncident.json() as {
      status: string;
      actions: Array<{ actionType: string }>;
    };
    assert.equal(closed.status, 'closed');
    assert.equal(closed.actions[0]?.actionType, 'close_case');

    const reopenAction = await app.inject({
      method: 'POST',
      url: `/v1/safeguarding/incidents/${incident.id}/actions`,
      headers: coachHeaders,
      payload: {
        actionType: 'reopen_case',
        notes: 'New evidence submitted by guardian.',
      },
    });
    assert.equal(reopenAction.statusCode, 201);

    const reopenedIncident = await app.inject({
      method: 'GET',
      url: `/v1/safeguarding/incidents/${incident.id}`,
      headers: coachHeaders,
    });
    assert.equal(reopenedIncident.statusCode, 200);
    const reopened = reopenedIncident.json() as {
      status: string;
      actions: Array<{ actionType: string }>;
    };
    assert.equal(reopened.status, 'in_review');
    assert.equal(reopened.actions[0]?.actionType, 'reopen_case');
  });

  it('denies creation and access when actor has no athlete relationship', async () => {
    const deniedCreate = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: {
        'x-auth-user-id': 'usr_parent1',
        'x-auth-roles': 'parent',
        'x-acting-role': 'parent',
        'x-guardian-athlete-ids': 'ath_user1',
      },
      payload: {
        athleteId: 'ath_user3',
        category: 'medical_concern',
        summary: 'Should fail due to missing guardian relationship',
      },
    });
    assert.equal(deniedCreate.statusCode, 403);

    const create = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: {
        'x-auth-user-id': 'usr_parent1',
        'x-auth-roles': 'parent',
        'x-acting-role': 'parent',
        'x-guardian-athlete-ids': 'ath_user1',
      },
      payload: {
        athleteId: 'ath_user1',
        category: 'session_conduct',
        summary: 'Valid concern for related athlete',
      },
    });
    assert.equal(create.statusCode, 201);
    const incident = create.json() as { id: string };

    const deniedRead = await app.inject({
      method: 'GET',
      url: `/v1/safeguarding/incidents/${incident.id}`,
      headers: {
        'x-auth-user-id': 'usr_athlete99',
        'x-auth-roles': 'athlete',
        'x-acting-role': 'athlete',
      },
    });
    assert.equal(deniedRead.statusCode, 403);

    const deniedAction = await app.inject({
      method: 'POST',
      url: `/v1/safeguarding/incidents/${incident.id}/actions`,
      headers: {
        'x-auth-user-id': 'usr_athlete99',
        'x-auth-roles': 'athlete',
        'x-acting-role': 'athlete',
      },
      payload: {
        actionType: 'note_added',
        notes: 'Should fail due to missing athlete relationship',
      },
    });
    assert.equal(deniedAction.statusCode, 403);

    const tables = getMarketplaceSeedStore().tables as Record<string, SeedRow[]>;
    assert.equal(
      auditRows(tables, 'safeguarding_incident.create', 'DENY').some(
        (row) => asString(row.actorUserId) === 'usr_parent1',
      ),
      true,
    );
    assert.equal(
      auditRows(tables, 'safeguarding_incident.read', 'DENY').some(
        (row) =>
          asString(row.actorUserId) === 'usr_athlete99' &&
          asString(row.resourceId) === incident.id &&
          row.sensitiveRead === true,
      ),
      true,
    );
    assert.equal(
      auditRows(tables, 'safeguarding_incident.action', 'DENY').some(
        (row) =>
          asString(row.actorUserId) === 'usr_athlete99' && asString(row.resourceId) === incident.id,
      ),
      true,
    );
  });

  it('booking report-problem safety path enforces guardian relationship', async () => {
    const tables = getMarketplaceSeedStore().tables as Record<string, SeedRow[]>;
    const now = new Date().toISOString();
    const bookingId = 'bok_booking-issue-2';
    asRows(tables.bookings).push({
      id: bookingId,
      coachUserId: 'usr_coach1',
      bookedByUserId: 'usr_parent1',
      clubId: null,
      status: 'CONFIRMED',
      scheduledAt: now,
      durationMinutes: 60,
      location: 'Test pitch',
      serviceType: 'Support route test',
      groupSessionId: null,
      createdByUserId: 'usr_parent1',
      updatedByUserId: 'usr_parent1',
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });

    const denied = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: {
        'x-auth-user-id': 'usr_parent1',
        'x-auth-roles': 'parent',
        'x-acting-role': 'parent',
        'x-guardian-athlete-ids': 'ath_user1',
      },
      payload: {
        athleteId: 'ath_user3',
        bookingId: 'bok_booking-issue-1',
        category: 'booking_issue_safety',
        severity: 'high',
        summary: 'Safety report from bookings/report-problem for unrelated child.',
      },
    });
    assert.equal(denied.statusCode, 403);

    const allowed = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: {
        'x-auth-user-id': 'usr_parent1',
        'x-auth-roles': 'parent',
        'x-acting-role': 'parent',
        'x-guardian-athlete-ids': 'ath_user1,ath_user2',
      },
      payload: {
        athleteId: 'ath_user2',
        bookingId,
        category: 'booking_issue_safety',
        severity: 'high',
        summary: 'Safety report from bookings/report-problem for related child.',
      },
    });
    assert.equal(allowed.statusCode, 201);
    const incident = allowed.json() as { id: string };
    const supportNotification = asRows(tables.notifications).find(
      (row) =>
        asString(row.sourceType) === 'safeguarding_incident' &&
        asString(row.sourceId) === incident.id,
    );
    assert.equal(asString(supportNotification?.userId), 'usr_coach1');
    assert.equal(asString(supportNotification?.type), 'SUPPORT_UPDATE');
  });

  it('one-to-one raise concern path enforces coach assignment and verification', async () => {
    const deniedUnverified = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: {
        'x-auth-user-id': 'usr_coach1',
        'x-auth-roles': 'coach',
        'x-acting-role': 'coach',
        'x-coach-athlete-ids': 'ath_user1',
      },
      payload: {
        athleteId: 'ath_user1',
        category: 'session_conduct',
        severity: 'medium',
        summary: '1:1 concern from development session without verification',
      },
    });
    assert.equal(deniedUnverified.statusCode, 403);

    const deniedUnassigned = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: {
        'x-auth-user-id': 'usr_coach1',
        'x-auth-roles': 'coach',
        'x-acting-role': 'coach',
        'x-coach-athlete-ids': 'ath_user3',
        'x-coach-verified': '1',
      },
      payload: {
        athleteId: 'ath_user9',
        category: 'session_conduct',
        severity: 'medium',
        summary: '1:1 concern from development session without assignment',
      },
    });
    assert.equal(deniedUnassigned.statusCode, 403);

    const allowed = await app.inject({
      method: 'POST',
      url: '/v1/safeguarding/incidents',
      headers: {
        'x-auth-user-id': 'usr_coach1',
        'x-auth-roles': 'coach',
        'x-acting-role': 'coach',
        'x-coach-athlete-ids': 'ath_user2,ath_user1',
        'x-coach-verified': '1',
      },
      payload: {
        athleteId: 'ath_user2',
        category: 'session_conduct',
        severity: 'medium',
        summary: '1:1 concern from development session for assigned athlete',
      },
    });
    assert.equal(allowed.statusCode, 201);
  });
});
