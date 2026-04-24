import type { ChatThreadSummary } from '@/constants/types';

const MAX_PREVIEW_ENTRIES = 24;

const threadPreviewCache = new Map<string, ChatThreadSummary>();

function clonePreview(thread: ChatThreadSummary): ChatThreadSummary {
  return {
    ...thread,
    postingAsOptions: thread.postingAsOptions ? [...thread.postingAsOptions] : undefined,
    pinnedObjectives: thread.pinnedObjectives ? [...thread.pinnedObjectives] : undefined,
  };
}

export function primeMessageThreadPreview(thread: ChatThreadSummary): void {
  const snapshot = clonePreview(thread);
  threadPreviewCache.delete(snapshot.id);
  threadPreviewCache.set(snapshot.id, snapshot);

  while (threadPreviewCache.size > MAX_PREVIEW_ENTRIES) {
    const oldestKey = threadPreviewCache.keys().next().value;
    if (!oldestKey) break;
    threadPreviewCache.delete(oldestKey);
  }
}

export function getMessageThreadPreview(threadId: string | null | undefined): ChatThreadSummary | null {
  if (!threadId) return null;
  return threadPreviewCache.get(threadId) ?? null;
}
