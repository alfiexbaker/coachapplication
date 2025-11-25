import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  SessionNoteFields,
  SessionNoteRecord,
  getSessionNote,
  saveSessionNote,
} from '@/services/session-notes-service';
import { createLogger } from '@/utils/logger';

interface UseSessionNoteResult {
  note: SessionNoteRecord | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  persist: (fields: SessionNoteFields) => Promise<SessionNoteRecord>;
}

export function useSessionNote(bookingId?: string): UseSessionNoteResult {
  const [note, setNote] = useState<SessionNoteRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logger = useMemo(() => createLogger('useSessionNote', { bookingId }), [bookingId]);

  const refresh = useCallback(async () => {
    if (!bookingId) {
      logger.warn('Refresh requested without booking id');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const record = await getSessionNote(bookingId);
      setNote(record);
      logger.debug('Session note loaded', { bookingId, hasNote: Boolean(record) });
    } catch (err) {
      logger.error('Failed to load session note', err);
      setError('Unable to load coach notes right now. Pull to refresh in a moment.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, logger]);

  const persist = useCallback(
    async (fields: SessionNoteFields) => {
      if (!bookingId) {
        logger.warn('Persist requested without booking id');
        throw new Error('Missing booking id for session notes');
      }
      setLoading(true);
      setSaving(true);
      setError(null);

      try {
        logger.info('Saving session note', { bookingId, focusCount: fields.focus?.length ?? 0 });
        const record = await saveSessionNote(bookingId, fields);
        setNote(record);
        logger.success('Session note saved', { bookingId, updatedAt: record.updatedAt });
        return record;
      } catch (err) {
        logger.error('Failed to save session note', err);
        setError('Saving notes failed. Please retry.');
        throw err;
      } finally {
        setLoading(false);
        setSaving(false);
      }
    },
    [bookingId, logger]
  );

  useEffect(() => {
    let active = true;

    (async () => {
      if (!bookingId) {
        setNote(null);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      logger.debug('Loading session note on mount', { bookingId });
      try {
        const record = await getSessionNote(bookingId);
        if (active) setNote(record);
      } catch (err) {
        logger.error('Failed to load session note', err);
        if (active) setError('Unable to load coach notes right now. Pull to refresh in a moment.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [bookingId]);

  return {
    note,
    loading,
    saving,
    error,
    refresh,
    persist,
  };
}
