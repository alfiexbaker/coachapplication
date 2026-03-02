import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { buildApp } from '../../app.js';

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
    const closePayload = closeAction.json() as { id: string; incidentId: string; actionType: string };
    assert.match(closePayload.id, /^sact_/);
    assert.equal(closePayload.incidentId, incident.id);
    assert.equal(closePayload.actionType, 'close_case');

    const closedIncident = await app.inject({
      method: 'GET',
      url: `/v1/safeguarding/incidents/${incident.id}`,
      headers: coachHeaders,
    });
    assert.equal(closedIncident.statusCode, 200);
    const closed = closedIncident.json() as { status: string; actions: Array<{ actionType: string }> };
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
    const reopened = reopenedIncident.json() as { status: string; actions: Array<{ actionType: string }> };
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
  });

  it('booking report-problem safety path enforces guardian relationship', async () => {
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
        bookingId: 'bok_booking-issue-2',
        category: 'booking_issue_safety',
        severity: 'high',
        summary: 'Safety report from bookings/report-problem for related child.',
      },
    });
    assert.equal(allowed.statusCode, 201);
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
