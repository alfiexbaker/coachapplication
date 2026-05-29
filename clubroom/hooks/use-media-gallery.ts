import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { mediaService } from '@/services/media-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('UseMediaGallery');

export interface MediaGalleryItem {
  id: string;
  type: 'photo' | 'video';
  sessionId: string;
  uri: string;
  thumbnailUri: string;
  capturedAt: string;
  duration?: number;
}

export interface MediaGalleryGroup {
  key: string;
  label: string;
  items: MediaGalleryItem[];
}

interface MediaGalleryData {
  items: MediaGalleryItem[];
}

function groupByMonth(items: MediaGalleryItem[]): MediaGalleryGroup[] {
  const grouped = new Map<string, MediaGalleryItem[]>();

  for (const item of items) {
    const parsed = new Date(item.capturedAt);
    if (Number.isNaN(parsed.getTime())) {
      continue;
    }
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
    const existing = grouped.get(key) ?? [];
    existing.push(item);
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .sort((left, right) => (left[0] < right[0] ? 1 : -1))
    .map(([key, monthItems]) => {
      const first = monthItems[0];
      const date = new Date(first.capturedAt);
      const label = date.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      });

      return {
        key,
        label,
        items: Array.from(monthItems).toSorted(
          (leftItem, rightItem) =>
            new Date(rightItem.capturedAt).getTime() - new Date(leftItem.capturedAt).getTime(),
        ),
      };
    });
}

export function useMediaGallery(athleteIdParam?: string | null) {
  const { currentUser } = useAuth();
  const { children, activeChildId } = useChildContext();

  const resolvedAthleteId = (() => {
    if (athleteIdParam) {
      return athleteIdParam;
    }
    if (currentUser?.role === 'PARENT') {
      return activeChildId ?? children[0]?.id ?? null;
    }
    if (currentUser?.role === 'COACH') {
      return null;
    }
    return currentUser?.id ?? null;
  })();

  const load = async () => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing user context.'));
    }
    if (!resolvedAthleteId) {
      return ok<MediaGalleryData>({ items: [] });
    }

    const mediaResult = await mediaService.listMediaForAthlete(resolvedAthleteId);
    if (!mediaResult.success) {
      logger.error('Failed to load media gallery', {
        athleteId: resolvedAthleteId,
        error: mediaResult.error,
      });
      return err(serviceError('STORAGE', 'Failed to load media gallery.', mediaResult.error));
    }

    const items: MediaGalleryItem[] = [];
    for (const entry of mediaResult.data) {
      for (const photo of entry.photos) {
        items.push({
          id: `${entry.sessionId}_photo_${photo.uri}`,
          type: 'photo',
          sessionId: entry.sessionId,
          uri: photo.uri,
          thumbnailUri: photo.thumbnailUri,
          capturedAt: photo.capturedAt,
        });
      }
      if (entry.video) {
        items.push({
          id: `${entry.sessionId}_video_${entry.video.uri}`,
          type: 'video',
          sessionId: entry.sessionId,
          uri: entry.video.uri,
          thumbnailUri: entry.video.thumbnailUri,
          capturedAt: entry.video.capturedAt,
          duration: entry.video.duration,
        });
      }
    }

    items.sort(
      (left, right) =>
        new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime(),
    );

    return ok<MediaGalleryData>({ items });
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<MediaGalleryData>({
    load,
    deps: [currentUser?.id, resolvedAthleteId],
    isEmpty: (value) => value.items.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: resolvedAthleteId
      ? `media-gallery:${currentUser?.id ?? 'missing'}:${resolvedAthleteId}`
      : `media-gallery:${currentUser?.id ?? 'missing'}:none`,
  });

  const items = data?.items ?? [];
  const groups = groupByMonth(items);

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    items,
    groups,
    resolvedAthleteId,
  } satisfies {
    status: ScreenStatus;
    error: ServiceError | null;
    loading: boolean;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    items: MediaGalleryItem[];
    groups: MediaGalleryGroup[];
    resolvedAthleteId: string | null;
  };
}
