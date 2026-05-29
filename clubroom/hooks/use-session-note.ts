import { useEffect, useState } from 'react';

import { progressService } from '@/services/progress-service';
import type { SessionNoteFields, SessionNoteRecord } from '@/services/progress-service';
import { createLogger } from '@/utils/logger';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

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
  const logger = createLogger('useSessionNote', { bookingId });

  const refresh = async () => {
    if (!bookingId) {
      logger.warn('Refresh requested without booking id');
      return;
    }
    setLoading(true);
    setError(null);

    await runAsyncTryCatchFinally(async () => {
      const record = await progressService.getSessionNote(bookingId);
      setNote(record);
      logger.debug('Session note loaded', { bookingId, hasNote: Boolean(record) });
    }, async err => {
      logger.error('Failed to load session note', err);
      setError('Unable to load coach notes right now. Pull to refresh in a moment.');
    }, () => {
      setLoading(false);
    });
  };

  const persist = async (fields: SessionNoteFields) => {
    if (!bookingId) {
      logger.warn('Persist requested without booking id');
      throw new Error('Missing booking id for session notes');
    }
    setLoading(true);
    setSaving(true);
    setError(null);

    return await runAsyncTryCatchFinally(async () => {
      logger.info('Saving session note', { bookingId, focusCount: fields.focus?.length ?? 0 });
      const record = await progressService.saveSessionNote(bookingId, fields);
      setNote(record);
      logger.success('Session note saved', { bookingId, updatedAt: record.updatedAt });
      return record;
    }, async err => {
      logger.error('Failed to save session note', err);
      setError('Saving notes failed. Please retry.');
      throw err;
    }, () => {
      setLoading(false);
      setSaving(false);
    });
  };

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

      await runAsyncTryCatchFinally(async () => {
        const record = await progressService.getSessionNote(bookingId);
        if (active) setNote(record);
      }, async err => {
        logger.error('Failed to load session note', err);
        if (active) setError('Unable to load coach notes right now. Pull to refresh in a moment.');
      }, () => {
        if (active) setLoading(false);
      });
    })();

    return () => {
      active = false;
    };
  }, [bookingId, logger]);

  return {
    note,
    loading,
    saving,
    error,
    refresh,
    persist,
  };
}
