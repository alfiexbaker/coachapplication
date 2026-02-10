import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { sessionRegistrationService } from '@/services/group-session/session-registration-service';
import { sessionCrudService } from '@/services/group-session/session-crud-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('SessionRegistrationService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.GROUP_SESSIONS);
    await apiClient.remove(STORAGE_KEYS.GROUP_REGISTRATIONS);
  });

  describe('register', () => {
    it('should register athlete to session successfully', async () => {
      const session = await sessionCrudService.createSession({
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'Test Session',
        description: 'Test',
        sessionType: 'CLINIC',
        schedule: [{ date: '2026-06-01', startTime: '10:00', endTime: '12:00' }],
        maxParticipants: 10,
        pricePerParticipant: 40,
        location: 'Test Park',
        isVirtual: false,
      });

      await sessionCrudService.publishSession(session.id);

      const result = await sessionRegistrationService.register({
        sessionId: session.id,
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Test Athlete',
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
      });

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.sessionId, session.id);
      assert.equal(result.data.status, 'REGISTERED');
      assert.ok(result.data.registeredAt);
    });

    it('should add to waitlist when session is full', async () => {
      const session = await sessionCrudService.createSession({
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'Full Session',
        description: 'Test',
        sessionType: 'CLINIC',
        schedule: [{ date: '2026-07-01', startTime: '10:00', endTime: '12:00' }],
        maxParticipants: 1,
        pricePerParticipant: 40,
        location: 'Test Park',
        isVirtual: false,
        waitlistEnabled: true,
      });

      await sessionCrudService.publishSession(session.id);

      // Register first athlete (fills session)
      await sessionRegistrationService.register({
        sessionId: session.id,
        athleteId: 'athlete1-' + Math.random().toString(36).slice(2),
        athleteName: 'Athlete 1',
        parentId: 'parent1',
        parentName: 'Parent 1',
      });

      // Second registration should go to waitlist
      const result = await sessionRegistrationService.register({
        sessionId: session.id,
        athleteId: 'athlete2-' + Math.random().toString(36).slice(2),
        athleteName: 'Athlete 2',
        parentId: 'parent2',
        parentName: 'Parent 2',
      });

      assert.ok(result.success);
      assert.equal(result.data.status, 'WAITLISTED');
    });

    it('should return err when session not found', async () => {
      const result = await sessionRegistrationService.register({
        sessionId: 'non-existent-session',
        athleteId: 'athlete1',
        athleteName: 'Athlete 1',
        parentId: 'parent1',
        parentName: 'Parent 1',
      });

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('cancelRegistration', () => {
    it('should cancel registration successfully', async () => {
      const session = await sessionCrudService.createSession({
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'Test Session',
        description: 'Test',
        sessionType: 'CLINIC',
        schedule: [{ date: '2026-08-01', startTime: '10:00', endTime: '12:00' }],
        maxParticipants: 10,
        pricePerParticipant: 40,
        location: 'Test Park',
        isVirtual: false,
      });

      await sessionCrudService.publishSession(session.id);

      const regResult = await sessionRegistrationService.register({
        sessionId: session.id,
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Test Athlete',
        parentId: 'test-parent',
        parentName: 'Test Parent',
      });

      assert.ok(regResult.success);

      const cancelResult = await sessionRegistrationService.cancelRegistration(regResult.data.id);

      assert.ok(cancelResult.success);
    });

    it('should return err when registration not found', async () => {
      const result = await sessionRegistrationService.cancelRegistration('non-existent-registration');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('getSessionRoster', () => {
    it('should return registrations for session', async () => {
      const session = await sessionCrudService.createSession({
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'Test Session',
        description: 'Test',
        sessionType: 'CAMP',
        schedule: [{ date: '2026-09-01', startTime: '09:00', endTime: '15:00' }],
        maxParticipants: 20,
        pricePerParticipant: 150,
        location: 'Test Camp',
        isVirtual: false,
      });

      await sessionCrudService.publishSession(session.id);

      await sessionRegistrationService.register({
        sessionId: session.id,
        athleteId: 'athlete1-' + Math.random().toString(36).slice(2),
        athleteName: 'Athlete 1',
        parentId: 'parent1',
        parentName: 'Parent 1',
      });

      await sessionRegistrationService.register({
        sessionId: session.id,
        athleteId: 'athlete2-' + Math.random().toString(36).slice(2),
        athleteName: 'Athlete 2',
        parentId: 'parent2',
        parentName: 'Parent 2',
      });

      const roster = await sessionRegistrationService.getSessionRoster(session.id);

      assert.ok(Array.isArray(roster));
      assert.ok(roster.length >= 2);
      assert.ok(roster.every(r => r.sessionId === session.id));
    });

    it('should return empty array for session with no registrations', async () => {
      const session = await sessionCrudService.createSession({
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'Empty Session',
        description: 'Test',
        sessionType: 'CLINIC',
        schedule: [{ date: '2026-10-01', startTime: '10:00', endTime: '12:00' }],
        maxParticipants: 10,
        pricePerParticipant: 40,
        location: 'Test Park',
        isVirtual: false,
      });

      const roster = await sessionRegistrationService.getSessionRoster(session.id);

      assert.ok(Array.isArray(roster));
      assert.equal(roster.length, 0);
    });
  });

  describe('markAttendance', () => {
    it('should mark attendance for registration', async () => {
      const session = await sessionCrudService.createSession({
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'Test Session',
        description: 'Test',
        sessionType: 'CLINIC',
        schedule: [{ date: '2026-11-01', startTime: '10:00', endTime: '12:00' }],
        maxParticipants: 10,
        pricePerParticipant: 40,
        location: 'Test Park',
        isVirtual: false,
      });

      await sessionCrudService.publishSession(session.id);

      const regResult = await sessionRegistrationService.register({
        sessionId: session.id,
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Test Athlete',
        parentId: 'test-parent',
        parentName: 'Test Parent',
      });

      assert.ok(regResult.success);

      const result = await sessionRegistrationService.markAttendance(
        regResult.data.id,
        '2026-11-01',
        true
      );

      assert.ok(result.success);
      assert.ok(result.data.attendedDates);
      assert.ok(result.data.attendedDates.includes('2026-11-01'));
    });

    it('should return err when registration not found', async () => {
      const result = await sessionRegistrationService.markAttendance(
        'non-existent-registration',
        '2026-11-01',
        true
      );

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('getParentRegistrations', () => {
    it('should return all registrations for parent', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);

      const session1 = await sessionCrudService.createSession({
        coachId: 'test-coach',
        coachName: 'Test Coach',
        title: 'Session 1',
        description: 'Test',
        sessionType: 'CLINIC',
        schedule: [{ date: '2026-12-01', startTime: '10:00', endTime: '12:00' }],
        maxParticipants: 10,
        pricePerParticipant: 40,
        location: 'Test Park',
        isVirtual: false,
      });

      await sessionCrudService.publishSession(session1.id);

      await sessionRegistrationService.register({
        sessionId: session1.id,
        athleteId: 'athlete1-' + Math.random().toString(36).slice(2),
        athleteName: 'Athlete 1',
        parentId,
        parentName: 'Test Parent',
      });

      const registrations = await sessionRegistrationService.getParentRegistrations(parentId);

      assert.ok(Array.isArray(registrations));
      assert.ok(registrations.length >= 1);
      assert.ok(registrations.every(r => r.parentId === parentId));
      assert.ok(registrations.every(r => r.session !== undefined));
    });

    it('should return empty array for parent with no registrations', async () => {
      const parentId = 'test-parent-empty-' + Math.random().toString(36).slice(2);
      const registrations = await sessionRegistrationService.getParentRegistrations(parentId);

      assert.ok(Array.isArray(registrations));
      assert.equal(registrations.length, 0);
    });
  });
});
