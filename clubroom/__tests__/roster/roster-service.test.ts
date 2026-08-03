import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import type { RosterEntry, RosterNote, User } from '@/constants/types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { type RemovalReason, rosterService } from '@/services/roster-service';

let sequence = 0;

function nextSuffix(): string {
  sequence += 1;
  return `${sequence}`;
}

function buildRosterInput(
  coachId: string,
  athleteId: string,
  parentId: string,
): Omit<RosterEntry, 'id'> {
  return {
    coachId,
    athleteId,
    parentId,
    status: 'ACTIVE',
    startDate: '2030-01-01',
    totalSessions: 0,
    totalRevenue: 0,
    averageRating: 0,
    notes: [],
    tags: [],
    primaryFocus: 'Passing',
    notificationPreference: 'ALL',
  };
}

async function withApiMode<T>(run: () => Promise<T>): Promise<T> {
  const originalDescriptor = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
  Object.defineProperty(apiClient, 'isMockMode', {
    configurable: true,
    get: () => false,
  });

  try {
    return await run();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(apiClient, 'isMockMode', originalDescriptor);
    } else {
      delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
    }
  }
}

describe('rosterService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.ROSTER_REMOVAL_HISTORY);
  });

  it('does not initialize roster fixtures as API-mode mock data', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services/roster-service.ts'), 'utf8');

    assert.ok(source.includes('this.mockData = USE_MOCK ? [...MOCK_ROSTER] : []'));
  });

  it('documents roster authority as /v1, not legacy /api routes', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services/roster-service.ts'), 'utf8');

    assert.doesNotMatch(source, /GET \/api\/coaches\/:id\/roster/);
    assert.match(source, /GET \/v1\/coaches\/:coachId\/roster/);
    assert.match(source, /GET \/v1\/coaches\/:coachId\/roster\/removals/);
    assert.match(source, /POST \/v1\/coaches\/:coachId\/roster\/removals\/:removalId\/undo/);
  });

  it('creates entry and returns it in getRoster (happy path)', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;
    const athleteId = `athlete-roster-${suffix}`;

    const createResult = await rosterService.create(
      buildRosterInput(coachId, athleteId, `parent-roster-${suffix}`),
    );

    assert.equal(createResult.success, true);

    const roster = await rosterService.getRoster(coachId);
    assert.equal(
      roster.some((entry) => entry.athleteId === athleteId),
      true,
    );
  });

  it('returns empty roster search results when query does not match (empty path)', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;

    await rosterService.create(
      buildRosterInput(coachId, `athlete-roster-${suffix}`, `parent-roster-${suffix}`),
    );

    const filtered = await rosterService.getRoster(coachId, { search: 'no-match-search-term' });
    assert.deepEqual(filtered, []);
  });

  it('hydrates mock roster detail display names consistently with the roster list', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;
    const athleteId = `athlete-roster-${suffix}`;
    const parentId = `parent-roster-${suffix}`;
    const existingUsers = await apiClient.get<User[]>(STORAGE_KEYS.USERS, []);

    try {
      await apiClient.set(STORAGE_KEYS.USERS, [
        ...existingUsers,
        {
          id: athleteId,
          name: 'Named Athlete',
          email: '',
          postcode: '',
          dateOfBirth: '',
          role: 'USER',
        },
        {
          id: parentId,
          name: 'Named Parent',
          email: '',
          postcode: '',
          dateOfBirth: '',
          role: 'USER',
        },
      ]);
      await rosterService.create(buildRosterInput(coachId, athleteId, parentId));

      const entry = await rosterService.getRosterEntry(coachId, athleteId);

      assert.equal(entry?.athleteName, 'Named Athlete');
      assert.equal(entry?.parentName, 'Named Parent');
    } finally {
      await apiClient.set(STORAGE_KEYS.USERS, existingUsers);
    }
  });

  it('uses the authenticated family identity for the seeded roster player', async () => {
    const existingUsers = await apiClient.get<User[]>(STORAGE_KEYS.USERS, []);

    try {
      await apiClient.set(STORAGE_KEYS.USERS, [
        ...existingUsers,
        {
          id: 'user2',
          name: 'Maisie Barton',
          email: '',
          postcode: '',
          dateOfBirth: '',
          role: 'USER',
        },
        {
          id: 'user4',
          name: 'Chris Barton',
          email: '',
          postcode: '',
          dateOfBirth: '',
          role: 'USER',
        },
      ]);

      const entry = await rosterService.getRosterEntry('coach1', 'user2');

      assert.equal(entry?.athleteName, 'Maisie Barton');
      assert.equal(entry?.parentName, 'Chris Barton');
    } finally {
      await apiClient.set(STORAGE_KEYS.USERS, existingUsers);
    }
  });

  it('returns err when updating status for missing athlete (error path)', async () => {
    const result = await rosterService.updateStatus(
      'coach-roster-missing',
      'athlete-missing',
      'PAUSED',
    );

    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('adds, updates, and deletes notes for an athlete', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;
    const athleteId = `athlete-roster-${suffix}`;

    await rosterService.create(buildRosterInput(coachId, athleteId, `parent-roster-${suffix}`));

    const noteResult = await rosterService.addNote(coachId, athleteId, 'Initial note');
    assert.equal(noteResult.success, true);
    if (!noteResult.success) return;
    const note = noteResult.data;
    assert.equal(note.content, 'Initial note');

    const updateResult = await rosterService.updateNote(
      coachId,
      athleteId,
      note.id,
      'Updated note',
    );
    assert.equal(updateResult.success, true);
    if (updateResult.success) {
      assert.equal(updateResult.data.content, 'Updated note');
    }

    const deleteResult = await rosterService.deleteNote(coachId, athleteId, note.id);
    assert.equal(deleteResult.success, true);

    const entry = await rosterService.getRosterEntry(coachId, athleteId);
    assert.ok(entry);
    assert.equal(entry?.notes.length, 0);
  });

  it('removes athlete to history and restores via undo', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;
    const athleteId = `athlete-roster-${suffix}`;

    await rosterService.create(buildRosterInput(coachId, athleteId, `parent-roster-${suffix}`));

    const removeResult = await rosterService.removeAthlete(coachId, athleteId, 'INACTIVE', {
      archive: true,
      customReason: 'No attendance',
    });

    assert.equal(removeResult.success, true);
    if (!removeResult.success) return;

    const history = await rosterService.getRemovalHistory(coachId);
    assert.equal(history.length, 1);
    assert.equal(history[0].athleteId, athleteId);

    const undoResult = await rosterService.undoRemoval(coachId, removeResult.data.id);
    assert.equal(undoResult.success, true);
    if (!undoResult.success) return;

    const restored = await rosterService.getRosterEntry(coachId, athleteId);
    assert.ok(restored);
    assert.equal(restored?.athleteId, athleteId);
  });

  it('does not describe non-archived roster removal as permanent athlete deletion', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;
    const athleteId = `athlete-roster-${suffix}`;

    await rosterService.create(buildRosterInput(coachId, athleteId, `parent-roster-${suffix}`));

    const removeResult = await rosterService.removeAthlete(coachId, athleteId, 'INACTIVE', {
      archive: false,
    });
    assert.equal(removeResult.success, true);
    if (!removeResult.success) return;

    const undoResult = await rosterService.undoRemoval(coachId, removeResult.data.id);
    assert.equal(undoResult.success, false);
    if (undoResult.success) return;

    assert.equal(
      undoResult.error.message,
      'Cannot restore - removal did not keep a restore snapshot',
    );
  });

  it('returns err when updating primary focus for missing athlete', async () => {
    const result = await rosterService.updatePrimaryFocus(
      'coach-roster-missing',
      'athlete-roster-missing',
      'Finishing',
    );

    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('uses v1 roster APIs for supported API-mode roster actions', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;
    const athleteId = `athlete-roster-${suffix}`;
    const parentId = `parent-roster-${suffix}`;

    const createResult = await rosterService.create(buildRosterInput(coachId, athleteId, parentId));
    assert.equal(createResult.success, true);

    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    const requestedBodies: unknown[] = [];
    let apiEntry: RosterEntry = {
      ...buildRosterInput(coachId, athleteId, parentId),
      id: `roster-api-${suffix}`,
      athleteName: 'API Athlete',
      parentName: 'API Parent',
    };
    let apiNote: RosterNote | null = null;
    let removalRecord: {
      id: string;
      coachId: string;
      athleteId: string;
      reason: RemovalReason;
      customReason?: string;
      archived: boolean;
      removedAt: string;
      previousStatus: RosterEntry['status'];
      totalSessions: number;
      totalRevenue: number;
      originalEntry?: RosterEntry;
    } | null = null;

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      requestedUrls.push(url);
      if (init?.body) {
        requestedBodies.push(JSON.parse(String(init.body)));
      }

      if (method === 'GET' && url.endsWith(`/v1/coaches/${coachId}/roster`)) {
        return new Response(
          JSON.stringify({
            entries: removalRecord ? [] : [apiEntry],
            total: removalRecord ? 0 : 1,
            requestId: 'req_roster_list_api',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (method === 'GET' && url.endsWith(`/v1/coaches/${coachId}/roster/${athleteId}`)) {
        if (removalRecord) {
          return new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({ entry: apiEntry, requestId: 'req_roster_detail_api' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (method === 'POST' && url.endsWith(`/v1/coaches/${coachId}/roster`)) {
        const body = JSON.parse(String(init?.body ?? '{}')) as Partial<RosterEntry>;
        const createdEntry: RosterEntry = {
          ...buildRosterInput(coachId, body.athleteId ?? `athlete-api-created-${suffix}`, parentId),
          id: `roster-api-created-${suffix}`,
          status: body.status ?? 'ACTIVE',
          tags: body.tags ?? [],
          primaryFocus: body.primaryFocus ?? undefined,
          notificationPreference: body.notificationPreference ?? 'ALL',
        };
        return new Response(
          JSON.stringify({ entry: createdEntry, requestId: 'req_roster_create_api' }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (method === 'POST' && url.endsWith(`/v1/coaches/${coachId}/roster/${athleteId}/notes`)) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { content?: string };
        apiNote = {
          id: `note-api-${suffix}`,
          content: body.content ?? '',
          createdAt: '2030-01-01T10:00:00.000Z',
        };
        apiEntry = {
          ...apiEntry,
          notes: [...apiEntry.notes, apiNote],
        };
        return new Response(
          JSON.stringify({ note: apiNote, requestId: 'req_roster_note_create_api' }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (
        method === 'PATCH' &&
        apiNote &&
        url.endsWith(`/v1/coaches/${coachId}/roster/${athleteId}/notes/${apiNote.id}`)
      ) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { content?: string };
        apiNote = {
          ...apiNote,
          content: body.content ?? apiNote.content,
          updatedAt: '2030-01-01T11:00:00.000Z',
        };
        apiEntry = {
          ...apiEntry,
          notes: apiEntry.notes.map((note) => (note.id === apiNote?.id ? apiNote : note)),
        };
        return new Response(
          JSON.stringify({ note: apiNote, requestId: 'req_roster_note_update_api' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (
        method === 'DELETE' &&
        apiNote &&
        url.endsWith(`/v1/coaches/${coachId}/roster/${athleteId}/notes/${apiNote.id}`)
      ) {
        const deletedNoteId = apiNote.id;
        apiEntry = {
          ...apiEntry,
          notes: apiEntry.notes.filter((note) => note.id !== deletedNoteId),
        };
        apiNote = null;
        return new Response(
          JSON.stringify({ removed: true, requestId: 'req_roster_note_delete_api' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (method === 'PATCH' && url.endsWith(`/v1/coaches/${coachId}/roster/${athleteId}`)) {
        const body = JSON.parse(String(init?.body ?? '{}')) as Partial<RosterEntry>;
        apiEntry = {
          ...apiEntry,
          ...body,
        };
        return new Response(
          JSON.stringify({ entry: apiEntry, requestId: 'req_roster_patch_api' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (method === 'DELETE' && url.endsWith(`/v1/coaches/${coachId}/roster/${athleteId}`)) {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          reason?: RemovalReason;
          customReason?: string;
          archive?: boolean;
        };
        removalRecord = {
          id: `removal-api-${suffix}`,
          coachId,
          athleteId,
          reason: body.reason ?? 'OTHER',
          customReason: body.customReason,
          archived: body.archive ?? true,
          removedAt: '2030-01-02T10:00:00.000Z',
          previousStatus: apiEntry.status,
          totalSessions: apiEntry.totalSessions,
          totalRevenue: apiEntry.totalRevenue,
          originalEntry: body.archive === false ? undefined : apiEntry,
        };
        return new Response(
          JSON.stringify({
            removed: true,
            removal: removalRecord,
            requestId: 'req_roster_delete_api',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (method === 'GET' && url.endsWith(`/v1/coaches/${coachId}/roster/removals`)) {
        return new Response(
          JSON.stringify({
            removals: removalRecord ? [removalRecord] : [],
            total: removalRecord ? 1 : 0,
            requestId: 'req_roster_removals_api',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (
        method === 'POST' &&
        removalRecord &&
        url.endsWith(`/v1/coaches/${coachId}/roster/removals/${removalRecord.id}/undo`)
      ) {
        removalRecord = null;
        return new Response(JSON.stringify({ entry: apiEntry, requestId: 'req_roster_undo_api' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ code: 'NOT_FOUND', message: url }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof globalThis.fetch;

    try {
      await withApiMode(async () => {
        const apiRoster = await rosterService.getRoster(coachId);
        assert.equal(apiRoster.length, 1);
        assert.equal(apiRoster[0].athleteName, 'API Athlete');

        const apiDetail = await rosterService.getRosterEntry(coachId, athleteId);
        assert.equal(apiDetail?.athleteId, athleteId);

        const apiCreate = await rosterService.create(
          buildRosterInput(coachId, `athlete-api-${suffix}`, `parent-api-${suffix}`),
        );
        assert.equal(apiCreate.success, true);
        if (apiCreate.success) {
          assert.equal(apiCreate.data.athleteId, `athlete-api-${suffix}`);
        }

        const note = await rosterService.addNote(coachId, athleteId, 'API note');
        assert.equal(note.success, true);
        if (!note.success) return;
        assert.equal(note.data.content, 'API note');

        const updatedNote = await rosterService.updateNote(
          coachId,
          athleteId,
          note.data.id,
          'Updated API note',
        );
        assert.equal(updatedNote.success, true);
        if (!updatedNote.success) return;
        assert.equal(updatedNote.data.content, 'Updated API note');

        const deletedNote = await rosterService.deleteNote(coachId, athleteId, note.data.id);
        assert.equal(deletedNote.success, true);

        const status = await rosterService.updateStatus(coachId, athleteId, 'PAUSED');
        assert.equal(status.success, true);
        if (status.success) assert.equal(status.data.status, 'PAUSED');

        const tags = await rosterService.updateTags(coachId, athleteId, ['priority']);
        assert.equal(tags.success, true);
        if (tags.success) assert.deepEqual(tags.data.tags, ['priority']);

        const focus = await rosterService.updatePrimaryFocus(coachId, athleteId, 'Finishing');
        assert.equal(focus.success, true);
        if (focus.success) assert.equal(focus.data.primaryFocus, 'Finishing');

        const removal = await rosterService.removeAthlete(coachId, athleteId, 'INACTIVE', {
          customReason: 'No attendance',
        });
        assert.equal(removal.success, true);
        if (!removal.success) return;
        assert.equal(removal.data.reason, 'INACTIVE');
        assert.equal(removal.data.customReason, 'No attendance');

        assert.equal(await rosterService.getRosterEntry(coachId, athleteId), null);

        const history = await rosterService.getRemovalHistory(coachId);
        assert.equal(history.length, 1);
        assert.equal(history[0].id, removal.data.id);

        const undo = await rosterService.undoRemoval(coachId, removal.data.id);
        assert.equal(undo.success, true);
        if (undo.success) assert.equal(undo.data.athleteId, athleteId);

        assert.ok(
          requestedUrls.some((url) => url.endsWith(`/v1/coaches/${coachId}/roster/${athleteId}`)),
        );
        assert.equal(
          requestedBodies.some(
            (body) =>
              (body as { reason?: string; customReason?: string }).reason === 'INACTIVE' &&
              (body as { reason?: string; customReason?: string }).customReason === 'No attendance',
          ),
          true,
        );
        assert.equal(
          requestedBodies.some((body) => (body as { content?: string }).content === 'API note'),
          true,
        );
        assert.equal(
          requestedBodies.some(
            (body) => (body as { content?: string }).content === 'Updated API note',
          ),
          true,
        );
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('surfaces API roster read failures instead of returning local or empty state', async () => {
    const originalFetch = globalThis.fetch;
    const suffix = nextSuffix();
    const coachId = `coach-roster-api-error-${suffix}`;
    const athleteId = `athlete-roster-api-error-${suffix}`;
    const localEntry: RosterEntry = {
      id: `local-roster-${suffix}`,
      ...buildRosterInput(coachId, athleteId, `parent-roster-api-error-${suffix}`),
      athleteName: 'Local Athlete',
    };

    await apiClient.set(STORAGE_KEYS.ROSTER, [localEntry]);
    await apiClient.set(STORAGE_KEYS.ROSTER_REMOVAL_HISTORY, [
      {
        id: `local-removal-${suffix}`,
        coachId,
        athleteId,
        reason: 'INACTIVE',
        archived: true,
        removedAt: '2030-01-01T10:00:00.000Z',
        previousStatus: 'ACTIVE',
        totalSessions: 1,
        totalRevenue: 10,
        originalEntry: localEntry,
      },
    ]);

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ code: 'ROSTER_DOWN', message: 'Roster unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof globalThis.fetch;

    try {
      await withApiMode(async () => {
        await assert.rejects(
          () => rosterService.getRoster(coachId),
          (error: unknown) =>
            typeof error === 'object' &&
            error !== null &&
            (error as { code?: string }).code === 'UNKNOWN',
        );
        await assert.rejects(
          () => rosterService.getRosterEntry(coachId, athleteId),
          (error: unknown) =>
            typeof error === 'object' &&
            error !== null &&
            (error as { code?: string }).code === 'UNKNOWN',
        );
        await assert.rejects(
          () => rosterService.getRemovalHistory(coachId),
          (error: unknown) =>
            typeof error === 'object' &&
            error !== null &&
            (error as { code?: string }).code === 'UNKNOWN',
        );
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fails inherited local roster storage aliases closed in API mode', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-api-boundary-${suffix}`;
    const athleteId = `athlete-roster-api-boundary-${suffix}`;
    const localEntry: RosterEntry = {
      id: `local-roster-boundary-${suffix}`,
      ...buildRosterInput(coachId, athleteId, `parent-roster-api-boundary-${suffix}`),
      athleteName: 'Local Boundary Athlete',
    };

    await apiClient.set(STORAGE_KEYS.ROSTER, [localEntry]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
      remove: typeof apiClient.remove;
    };
    const original = {
      get: client.get,
      set: client.set,
      remove: client.remove,
    };

    client.get = async () => {
      throw new Error('local roster reads should not run in API mode');
    };
    client.set = async () => {
      throw new Error('local roster writes should not run in API mode');
    };
    client.remove = async () => {
      throw new Error('local roster deletes should not run in API mode');
    };

    try {
      await withApiMode(async () => {
        const results = await Promise.all([
          rosterService.getAll(),
          rosterService.getPaged(),
          rosterService.getById(localEntry.id),
          rosterService.update(localEntry.id, { status: 'PAUSED' }),
          rosterService.delete(localEntry.id),
          rosterService.hardDelete(localEntry.id),
          rosterService.restore(localEntry.id),
          rosterService.count({ coachId }),
          rosterService.findOne({ coachId, athleteId }),
          rosterService.createMany([
            buildRosterInput(
              coachId,
              `athlete-create-many-${suffix}`,
              `parent-create-many-${suffix}`,
            ),
          ]),
          rosterService.deleteMany([localEntry.id]),
          rosterService.clear(),
        ]);

        for (const result of results) {
          assert.equal(result.success, false);
          assert.equal(!result.success && result.error.code, 'UNSUPPORTED');
        }

        assert.equal(await rosterService.exists(localEntry.id), false);
      });
    } finally {
      client.get = original.get;
      client.set = original.set;
      client.remove = original.remove;
    }
  });
});
