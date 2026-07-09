import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('drillService API mode', () => {
  it('does not hydrate drill fixtures from empty local storage in API mode', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services/drill-service.ts'), 'utf8');

    assert.doesNotMatch(source, /return\s+\[\.\.\.MOCK_DRILLS\];/);
    assert.doesNotMatch(source, /return\s+\[\.\.\.MOCK_ASSIGNMENTS\];/);
    assert.ok(source.includes('apiClient.isMockMode ? [...MOCK_DRILLS] : []'));
    assert.ok(source.includes('apiClient.isMockMode ? [...MOCK_ASSIGNMENTS] : []'));
  });

  it('reads and writes drill library through /v1/drills without local storage', async () => {
    const [{ drillService }, { apiClient }] = await Promise.all([
      import('@/services/drill-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    const requestedBodies: unknown[] = [];

    apiClient.get = async () => {
      throw new Error('local drill reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local drill writes should not run in API mode');
    };
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      requestedUrls.push(url);
      if (init?.body) {
        requestedBodies.push(JSON.parse(String(init.body)));
      }
      if (url.endsWith('/v1/drill-assignments/assignment_api_1/completion')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          completed?: boolean;
          completionNote?: string;
        };
        return new Response(
          JSON.stringify({
            assignment: {
              id: 'assignment_api_1',
              drillId: 'drill_api_1',
              athleteId: 'ath_athlete_api_drill',
              coachUserId: 'coach_api_drill',
              instructions: 'Loaded from assignment API',
              requiresEvidence: true,
              dueDate: '2026-07-10T10:00:00.000Z',
              status: body.completed ? 'SUBMITTED' : 'ASSIGNED',
              createdAt: '2026-07-01T10:00:00.000Z',
              updatedAt: '2026-07-03T10:00:00.000Z',
              drill: {
                id: 'drill_api_1',
                authorUserId: 'coach_api_drill',
                title: 'API drill',
                description: 'Loaded from backend',
                category: 'TECHNIQUE',
                difficulty: 'intermediate',
                duration: 25,
                createdAt: '2026-07-01T10:00:00.000Z',
                updatedAt: '2026-07-02T10:00:00.000Z',
              },
              submissions: body.completed
                ? [
                    {
                      id: 'submission_api_1',
                      status: 'SUBMITTED',
                      notes: body.completionNote,
                      submittedAt: '2026-07-03T10:00:00.000Z',
                    },
                  ]
                : [],
            },
            requestId: 'req_drill_assignment_completion_api',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (method === 'DELETE' && url.endsWith('/v1/drill-assignments/assignment_api_1')) {
        return new Response(
          JSON.stringify({
            removed: true,
            assignment: {
              id: 'assignment_api_1',
              athleteId: 'ath_athlete_api_drill',
              coachUserId: 'coach_api_drill',
              deletedAt: '2026-07-04T11:00:00.000Z',
            },
            requestId: 'req_drill_assignment_remove_api',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (method === 'GET' && url.endsWith('/v1/drill-assignments/assignment_api_1')) {
        return new Response(
          JSON.stringify({
            assignment: {
              id: 'assignment_api_1',
              drillId: 'drill_api_1',
              athleteId: 'ath_athlete_api_drill',
              coachUserId: 'coach_api_drill',
              instructions: 'Loaded from assignment detail API',
              requiresEvidence: true,
              dueDate: '2026-07-10T10:00:00.000Z',
              status: 'ASSIGNED',
              createdAt: '2026-07-01T10:00:00.000Z',
              updatedAt: '2026-07-02T10:00:00.000Z',
              drill: {
                id: 'drill_api_1',
                authorUserId: 'coach_api_drill',
                title: 'API drill',
                description: 'Loaded from backend',
                category: 'TECHNIQUE',
                difficulty: 'intermediate',
                duration: 25,
                createdAt: '2026-07-01T10:00:00.000Z',
                updatedAt: '2026-07-02T10:00:00.000Z',
              },
              submissions: [],
            },
            requestId: 'req_drill_assignment_detail_api',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (method === 'GET' && url.endsWith('/v1/drills/drill_api_1')) {
        return new Response(
          JSON.stringify({
            drill: {
              id: 'drill_api_1',
              authorUserId: 'coach_api_drill',
              title: 'API drill',
              description: 'Loaded from backend detail',
              category: 'TECHNIQUE',
              difficulty: 'intermediate',
              duration: 25,
              assignments: [{ id: 'assignment_api_1' }],
              createdAt: '2026-07-01T10:00:00.000Z',
              updatedAt: '2026-07-02T10:00:00.000Z',
            },
            requestId: 'req_drill_detail_api',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (method === 'POST' && url.endsWith('/v1/drills')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          coachId?: string;
          title?: string;
          description?: string;
          category?: string;
          duration?: number;
          difficulty?: string;
        };
        return new Response(
          JSON.stringify({
            drill: {
              id: 'drill_api_created',
              authorUserId: body.coachId,
              title: body.title,
              description: body.description,
              category: body.category,
              difficulty: body.difficulty,
              duration: body.duration,
              assignments: [],
              createdAt: '2026-07-04T09:00:00.000Z',
              updatedAt: '2026-07-04T09:00:00.000Z',
            },
            requestId: 'req_drill_create_api',
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (method === 'PATCH' && url.endsWith('/v1/drills/drill_api_1')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          title?: string;
          duration?: number;
        };
        return new Response(
          JSON.stringify({
            drill: {
              id: 'drill_api_1',
              authorUserId: 'coach_api_drill',
              title: body.title,
              description: 'Loaded from backend detail',
              category: 'TECHNIQUE',
              difficulty: 'intermediate',
              duration: body.duration,
              assignments: [{ id: 'assignment_api_1' }],
              createdAt: '2026-07-01T10:00:00.000Z',
              updatedAt: '2026-07-05T10:00:00.000Z',
            },
            requestId: 'req_drill_update_api',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (method === 'DELETE' && url.endsWith('/v1/drills/drill_api_1')) {
        return new Response(
          JSON.stringify({
            removed: true,
            drill: {
              id: 'drill_api_1',
              authorUserId: 'coach_api_drill',
              deletedAt: '2026-07-05T11:00:00.000Z',
            },
            requestId: 'req_drill_remove_api',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (method === 'GET' && url.includes('/athletes/') && url.includes('/drill-assignments')) {
        return new Response(
          JSON.stringify({
            athleteId: 'ath_athlete_api_drill',
            assignments: [
              {
                id: 'assignment_api_1',
                drillId: 'drill_api_1',
                athleteId: 'ath_athlete_api_drill',
                coachUserId: 'coach_api_drill',
                instructions: 'Loaded from assignment API',
                requiresEvidence: true,
                dueDate: '2026-07-10T10:00:00.000Z',
                status: 'ASSIGNED',
                createdAt: '2026-07-01T10:00:00.000Z',
                updatedAt: '2026-07-02T10:00:00.000Z',
                drill: {
                  id: 'drill_api_1',
                  authorUserId: 'coach_api_drill',
                  title: 'API drill',
                  description: 'Loaded from backend',
                  category: 'TECHNIQUE',
                  difficulty: 'intermediate',
                  duration: 25,
                  createdAt: '2026-07-01T10:00:00.000Z',
                  updatedAt: '2026-07-02T10:00:00.000Z',
                },
                submissions: [],
              },
            ],
            total: 1,
            requestId: 'req_drill_assignments_api',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (method === 'POST' && url.endsWith('/v1/drill-assignments')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          drillId?: string;
          athleteId?: string;
          dueDate?: string;
          instructions?: string;
        };
        return new Response(
          JSON.stringify({
            assignment: {
              id: 'assignment_api_created',
              drillId: body.drillId,
              athleteId: body.athleteId,
              coachUserId: 'coach_api_drill',
              instructions: body.instructions,
              requiresEvidence: false,
              dueDate: body.dueDate,
              status: 'ASSIGNED',
              createdAt: '2026-07-04T10:00:00.000Z',
              updatedAt: '2026-07-04T10:00:00.000Z',
              drill: {
                id: body.drillId,
                authorUserId: 'coach_api_drill',
                title: 'API drill',
                description: 'Loaded from backend',
                category: 'TECHNIQUE',
                difficulty: 'intermediate',
                duration: 25,
                createdAt: '2026-07-01T10:00:00.000Z',
                updatedAt: '2026-07-02T10:00:00.000Z',
              },
              submissions: [],
            },
            requestId: 'req_drill_assignment_create_api',
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      return new Response(
        JSON.stringify({
          drills: [
            {
              id: 'drill_api_1',
              authorUserId: 'coach_api_drill',
              title: 'API drill',
              description: 'Loaded from backend',
              category: 'TECHNIQUE',
              difficulty: 'intermediate',
              duration: 25,
              assignments: [{ id: 'assignment_api_1' }],
              createdAt: '2026-07-01T10:00:00.000Z',
              updatedAt: '2026-07-02T10:00:00.000Z',
            },
          ],
          total: 1,
          requestId: 'req_drill_api',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    try {
      const drills = await drillService.getDrillLibrary('coach_api_drill');
      assert.equal(requestedUrls[0], 'http://localhost:4000/v1/drills?coachUserId=coach_api_drill');
      assert.deepEqual(
        drills.map((drill) => ({
          id: drill.id,
          coachId: drill.coachId,
          title: drill.title,
          difficulty: drill.difficulty,
          assignmentCount: drill.assignmentCount,
        })),
        [
          {
            id: 'drill_api_1',
            coachId: 'coach_api_drill',
            title: 'API drill',
            difficulty: 'INTERMEDIATE',
            assignmentCount: 1,
          },
        ],
      );

      const drillDetail = await drillService.getDrillById('drill_api_1');
      assert.equal(requestedUrls[1], 'http://localhost:4000/v1/drills/drill_api_1');
      assert.deepEqual(
        drillDetail && {
          id: drillDetail.id,
          coachId: drillDetail.coachId,
          title: drillDetail.title,
          description: drillDetail.description,
          assignmentCount: drillDetail.assignmentCount,
        },
        {
          id: 'drill_api_1',
          coachId: 'coach_api_drill',
          title: 'API drill',
          description: 'Loaded from backend detail',
          assignmentCount: 1,
        },
      );

      const assignments = await drillService.getAthleteAssignments('athlete_api_drill', false);
      assert.equal(
        requestedUrls[2],
        'http://localhost:4000/v1/athletes/ath_athlete_api_drill/drill-assignments?includeCompleted=false',
      );
      assert.deepEqual(
        assignments.map((assignment) => ({
          id: assignment.id,
          drillId: assignment.drillId,
          athleteId: assignment.athleteId,
          assignedBy: assignment.assignedBy,
          dueDate: assignment.dueDate,
          isCompleted: assignment.isCompleted,
          drillTitle: assignment.drill?.title,
          requiresEvidence: assignment.requiresEvidence,
        })),
        [
          {
            id: 'assignment_api_1',
            drillId: 'drill_api_1',
            athleteId: 'ath_athlete_api_drill',
            assignedBy: 'coach_api_drill',
            dueDate: '2026-07-10T10:00:00.000Z',
            isCompleted: false,
            drillTitle: 'API drill',
            requiresEvidence: true,
          },
        ],
      );

      const assignmentDetail = await drillService.getAssignmentById('assignment_api_1');
      assert.equal(
        requestedUrls[3],
        'http://localhost:4000/v1/drill-assignments/assignment_api_1',
      );
      assert.equal(assignmentDetail?.id, 'assignment_api_1');
      assert.equal(assignmentDetail?.notes, 'Loaded from assignment detail API');

      const createdDrill = await drillService.createDrill('coach_api_drill', 'Coach API', {
        title: 'API created drill',
        description: 'Created on backend',
        category: 'TECHNIQUE',
        duration: 15,
        difficulty: 'BEGINNER',
      });
      assert.equal(requestedUrls[4], 'http://localhost:4000/v1/drills');
      assert.deepEqual(requestedBodies[0], {
        coachId: 'coach_api_drill',
        title: 'API created drill',
        description: 'Created on backend',
        category: 'TECHNIQUE',
        duration: 15,
        difficulty: 'BEGINNER',
      });
      assert.equal(createdDrill.id, 'drill_api_created');
      assert.equal(createdDrill.coachId, 'coach_api_drill');

      const updatedDrill = await drillService.updateDrill('drill_api_1', {
        title: 'Updated API drill',
        duration: 20,
      });
      assert.equal(requestedUrls[5], 'http://localhost:4000/v1/drills/drill_api_1');
      assert.deepEqual(requestedBodies[1], {
        title: 'Updated API drill',
        duration: 20,
      });
      assert.equal(updatedDrill?.title, 'Updated API drill');
      assert.equal(updatedDrill?.duration, 20);

      const removedDrill = await drillService.deleteDrill('drill_api_1');
      assert.equal(requestedUrls[6], 'http://localhost:4000/v1/drills/drill_api_1');
      assert.equal(removedDrill, true);

      const assignment = await drillService.assignDrill(
        'drill_api_1',
        'athlete_api_drill',
        'Athlete API',
        'coach_api_drill',
        'Coach API',
        {
          dueDate: '2026-07-10T10:00:00.000Z',
          notes: 'API homework note',
        },
      );
      assert.equal(requestedUrls[7], 'http://localhost:4000/v1/drill-assignments');
      assert.deepEqual(requestedBodies[2], {
        drillId: 'drill_api_1',
        athleteId: 'ath_athlete_api_drill',
        dueDate: '2026-07-10T10:00:00.000Z',
        instructions: 'API homework note',
      });
      assert.equal(assignment.success, true);
      assert.equal(assignment.success && assignment.data.id, 'assignment_api_created');
      assert.equal(assignment.success && assignment.data.notes, 'API homework note');

      const completed = await drillService.completeDrill('assignment_api_1', {
        athleteFeedback: 'Done cleanly',
        evidenceNotes: 'Two sets completed',
      });
      assert.equal(
        requestedUrls[8],
        'http://localhost:4000/v1/drill-assignments/assignment_api_1/completion',
      );
      assert.equal(completed?.isCompleted, true);
      assert.equal(completed?.athleteFeedback, 'Done cleanly\n\nTwo sets completed');

      const uncompleted = await drillService.uncompleteDrill('assignment_api_1');
      assert.equal(
        requestedUrls[9],
        'http://localhost:4000/v1/drill-assignments/assignment_api_1/completion',
      );
      assert.equal(uncompleted?.isCompleted, false);

      const removed = await drillService.deleteAssignment('assignment_api_1');
      assert.equal(
        requestedUrls[10],
        'http://localhost:4000/v1/drill-assignments/assignment_api_1',
      );
      assert.equal(removed, true);
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      globalThis.fetch = originalFetch;
    }
  });
});
