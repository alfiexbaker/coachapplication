import { storageService } from './storage-service';

export type SessionNoteFields = {
  summary: string;
  focus: string[];
  improvements: string;
  homework: string;
  effort: number;
  attendance: string;
};

export type SessionNoteRecord = SessionNoteFields & {
  updatedAt: string;
};

const STORAGE_KEY = 'session_notes';

async function getAllNotes(): Promise<Record<string, SessionNoteRecord>> {
  return storageService.getItem<Record<string, SessionNoteRecord>>(STORAGE_KEY, {});
}

async function persistNotes(notes: Record<string, SessionNoteRecord>) {
  await storageService.setItem(STORAGE_KEY, notes);
}

export async function getSessionNote(bookingId: string): Promise<SessionNoteRecord | null> {
  const notes = await getAllNotes();
  return notes[bookingId] ?? null;
}

export async function saveSessionNote(
  bookingId: string,
  payload: SessionNoteFields
): Promise<SessionNoteRecord> {
  const existing = await getAllNotes();
  const record: SessionNoteRecord = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  await persistNotes({ ...existing, [bookingId]: record });
  return record;
}
