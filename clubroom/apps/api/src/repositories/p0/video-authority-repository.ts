import crypto from 'node:crypto';
import { badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const normalizeAs = <T>(value: unknown): T => normalizeForJson(value) as T;
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const nextVersion = (value: unknown) => BigInt(typeof value === 'number' ? value + 1 : 2);
type StoreProvider = {
  version: string;
  tables: SeedTables;
};
export interface VideoRepositoryAccessParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
}
export interface VideoListParams extends VideoRepositoryAccessParams {
  coachId?: string;
  athleteId?: string;
}
export interface VideoDetailParams extends VideoRepositoryAccessParams {
  videoId: string;
}
export interface VideoCreateParams extends VideoRepositoryAccessParams {
  mediaObjectId: string;
  athleteId?: string | null;
  title?: string | null;
  description?: string | null;
  sourceContextType?: string | null;
  sourceContextId?: string | null;
  durationMs?: number | null;
}
export interface VideoUpdateParams extends VideoDetailParams {
  title?: string | null;
  description?: string | null;
}
export interface VideoVisibilityParams extends VideoDetailParams {
  visibility: 'PRIVATE' | 'SHARED';
  recipientUserIds?: string[];
}
export interface VideoAnnotationCreateParams extends VideoDetailParams {
  timestampMs: number;
  label: string;
  note?: string | null;
  annotationType: 'HIGHLIGHT' | 'IMPROVEMENT' | 'TECHNIQUE' | 'GENERAL';
}
export interface VideoAnnotationUpdateParams extends VideoAnnotationCreateParams {
  annotationId: string;
}
export interface VideoAnnotationDeleteParams extends VideoDetailParams {
  annotationId: string;
}
export interface VideoRecordBundle {
  video: SeedRow;
  mediaObject: SeedRow;
  annotations: SeedRow[];
  shares: SeedRow[];
}
export interface VideoListResult {
  items: VideoRecordBundle[];
  dataVersion: string | null;
}
export interface VideoRecordResult extends VideoRecordBundle {
  dataVersion: string | null;
}
export interface VideoAnnotationResult {
  annotation: SeedRow;
  dataVersion: string | null;
}
export interface VideoAuthorityRepository {
  listVideos(params: VideoListParams): Promise<VideoListResult>;
  getVideoDetail(params: VideoDetailParams): Promise<VideoRecordResult>;
  createVideo(params: VideoCreateParams): Promise<VideoRecordResult>;
  updateVideo(params: VideoUpdateParams): Promise<VideoRecordResult>;
  setVideoVisibility(params: VideoVisibilityParams): Promise<VideoRecordResult>;
  addVideoAnnotation(params: VideoAnnotationCreateParams): Promise<VideoAnnotationResult>;
  updateVideoAnnotation(params: VideoAnnotationUpdateParams): Promise<VideoAnnotationResult>;
  deleteVideoAnnotation(params: VideoAnnotationDeleteParams): Promise<void>;
  deleteVideo(params: VideoDetailParams): Promise<void>;
}
function activeRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter((row) => asString(row.deletedAt) == null);
}
function ensureRows(tables: SeedTables, key: string): SeedRow[] {
  const existing = tables[key];
  if (Array.isArray(existing)) {
    return existing;
  }
  const created: SeedRow[] = [];
  tables[key] = created;
  return created;
}
function normalizeVisibility(value: unknown): 'PRIVATE' | 'SHARED' {
  return String(value ?? '').toUpperCase() === 'SHARED' ? 'SHARED' : 'PRIVATE';
}
function isVideoManager(authUserId: string, isPrivilegedAdmin: boolean, video: SeedRow): boolean {
  return (
    isPrivilegedAdmin ||
    asString(video.coachUserId) === authUserId ||
    asString(video.createdByUserId) === authUserId ||
    asString(video.updatedByUserId) === authUserId
  );
}
function annotationColorForType(type: string): string {
  switch (type) {
    case 'HIGHLIGHT':
      return '#4CAF50';
    case 'IMPROVEMENT':
      return '#FF9800';
    case 'TECHNIQUE':
      return '#2196F3';
    default:
      return '#9E9E9E';
  }
}
function hydrateStoreVideoBundle(tables: SeedTables, video: SeedRow): VideoRecordBundle {
  const videoId = asString(video.id);
  const mediaObjectId = asString(video.mediaObjectId);
  const mediaObject = activeRows(asRows(tables.mediaObjects)).find(
    (row) => asString(row.id) === mediaObjectId,
  );
  if (!videoId || !mediaObject) {
    throw notFound('Video asset not found', {
      videoId,
      mediaObjectId,
    });
  }
  return {
    video,
    mediaObject,
    annotations: activeRows(asRows(tables.videoAnnotations)).filter(
      (row) => asString(row.videoId) === videoId,
    ),
    shares: activeRows(asRows(tables.videoShares)).filter(
      (row) => asString(row.videoId) === videoId,
    ),
  };
}
function readableShareUserIds(bundle: VideoRecordBundle): Set<string> {
  return new Set(
    bundle.shares.flatMap((row) => {
      const mapped = asString(row.sharedWithUserId);
      return Boolean(mapped) ? [mapped] : [];
    }),
  );
}
function canReadVideoBundle(
  authUserId: string,
  isPrivilegedAdmin: boolean,
  bundle: VideoRecordBundle,
): boolean {
  if (isVideoManager(authUserId, isPrivilegedAdmin, bundle.video)) {
    return true;
  }
  return (
    normalizeVisibility(bundle.video.visibility) === 'SHARED' &&
    readableShareUserIds(bundle).has(authUserId)
  );
}
function defaultShareRecipientUserIdsFromTables(
  tables: SeedTables,
  athleteId: string | undefined,
): string[] {
  if (!athleteId) {
    return [];
  }
  const athleteUserId = asString(
    activeRows(asRows(tables.athletes)).find((row) => asString(row.id) === athleteId)?.userId,
  );
  const guardianUserIds = activeRows(asRows(tables.guardianChildLinks)).flatMap((row) => {
    if (!(asString(row.athleteId) === athleteId)) return [];
    const mapped = asString(row.guardianUserId);
    return Boolean(mapped) ? [mapped] : [];
  });
  return Array.from(
    new Set(
      [athleteUserId, ...guardianUserIds].filter((userId): userId is string => Boolean(userId)),
    ),
  );
}
function assertAllowedShareRecipients(
  allowedUserIds: string[],
  requestedUserIds: string[],
  details: Record<string, unknown>,
): string[] {
  if (allowedUserIds.length === 0) {
    throw badRequest('Video does not have any linked family recipients to share with', details);
  }
  if (requestedUserIds.length === 0) {
    return allowedUserIds;
  }
  const allowed = new Set(allowedUserIds);
  const invalid = requestedUserIds.filter((userId) => !allowed.has(userId));
  if (invalid.length > 0) {
    throw badRequest('Video can only be shared with linked athlete or guardians', {
      ...details,
      invalidRecipientUserIds: invalid,
    });
  }
  return Array.from(new Set(requestedUserIds));
}
function assertFamilyAccessToAthlete(
  tables: SeedTables,
  authUserId: string,
  athleteId: string,
): void {
  const athleteUserId = asString(
    activeRows(asRows(tables.athletes)).find((row) => asString(row.id) === athleteId)?.userId,
  );
  if (athleteUserId === authUserId) {
    return;
  }
  const isGuardian = activeRows(asRows(tables.guardianChildLinks)).some(
    (row) => asString(row.athleteId) === athleteId && asString(row.guardianUserId) === authUserId,
  );
  if (!isGuardian) {
    throw forbidden('Athlete videos do not belong to authenticated user', {
      athleteId,
    });
  }
}
function mediaStatus(value: SeedRow): string {
  return String(value.status ?? '').toUpperCase();
}
function scanVerdict(value: SeedRow | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return String(value.verdict ?? value.status ?? '').toUpperCase();
}
function latestScanForMedia(tables: SeedTables, mediaObjectId: string): SeedRow | undefined {
  return asRows(tables.malwareScanResults).reduce<SeedRow | undefined>((latest, row) => {
    if (asString(row.mediaObjectId) !== mediaObjectId) {
      return latest;
    }
    if (!latest) {
      return row;
    }
    const rowTime = Date.parse(asString(row.scannedAt) ?? asString(row.createdAt) ?? '');
    const latestTime = Date.parse(asString(latest.scannedAt) ?? asString(latest.createdAt) ?? '');
    return (Number.isFinite(rowTime) ? rowTime : 0) > (Number.isFinite(latestTime) ? latestTime : 0)
      ? row
      : latest;
  }, undefined);
}
function assertMediaObjectReadyForVideo(tables: SeedTables, mediaObject: SeedRow): void {
  const mediaObjectId = asString(mediaObject.id);
  const status = mediaStatus(mediaObject);
  const latestScan = latestScanForMedia(tables, mediaObjectId ?? '');
  const verdict = scanVerdict(latestScan);
  if (status !== 'AVAILABLE' || verdict !== 'CLEAN') {
    throw badRequest(
      'Media object must be finalized and pass malware scanning before video creation',
      {
        mediaObjectId,
        mediaStatus: status || null,
        scanVerdict: verdict ?? null,
      },
    );
  }
}
class StoreVideoAuthorityRepository implements VideoAuthorityRepository {
  constructor(private readonly storeProvider: () => StoreProvider) {}
  async listVideos(params: VideoListParams): Promise<VideoListResult> {
    const store = this.storeProvider();
    let videos = activeRows(asRows(store.tables.videos));
    if (params.coachId) {
      if (!params.isPrivilegedAdmin && params.coachId !== params.authUserId) {
        throw forbidden('Coach videos do not belong to authenticated user', {
          coachId: params.coachId,
        });
      }
      videos = videos.filter((row) => asString(row.coachUserId) === params.coachId);
    } else if (params.athleteId) {
      if (!params.isPrivilegedAdmin) {
        assertFamilyAccessToAthlete(store.tables, params.authUserId, params.athleteId);
      }
      videos = videos.filter((row) => asString(row.athleteId) === params.athleteId);
    } else {
      throw badRequest('Coach id or athlete id is required to list videos');
    }
    const items = videos
      .flatMap((video) => {
        const mapped = hydrateStoreVideoBundle(store.tables, video);
        return canReadVideoBundle(params.authUserId, params.isPrivilegedAdmin, mapped)
          ? [mapped]
          : [];
      })
      .sort(
        (left, right) =>
          new Date(asString(right.video.createdAt) ?? 0).getTime() -
          new Date(asString(left.video.createdAt) ?? 0).getTime(),
      );
    return {
      items,
      dataVersion: store.version,
    };
  }
  async getVideoDetail(params: VideoDetailParams): Promise<VideoRecordResult> {
    const store = this.storeProvider();
    const video = activeRows(asRows(store.tables.videos)).find(
      (row) => asString(row.id) === params.videoId,
    );
    if (!video) {
      throw notFound('Video not found', {
        videoId: params.videoId,
      });
    }
    const bundle = hydrateStoreVideoBundle(store.tables, video);
    if (!canReadVideoBundle(params.authUserId, params.isPrivilegedAdmin, bundle)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    return {
      ...bundle,
      dataVersion: store.version,
    };
  }
  async createVideo(params: VideoCreateParams): Promise<VideoRecordResult> {
    const store = this.storeProvider();
    const now = nowIso();
    const mediaObject = activeRows(asRows(store.tables.mediaObjects)).find(
      (row) => asString(row.id) === params.mediaObjectId,
    );
    if (!mediaObject) {
      throw notFound('Media object not found', {
        mediaObjectId: params.mediaObjectId,
      });
    }
    if (!params.isPrivilegedAdmin && asString(mediaObject.ownerUserId) !== params.authUserId) {
      throw forbidden('Media object does not belong to authenticated user', {
        mediaObjectId: params.mediaObjectId,
      });
    }
    if (
      activeRows(asRows(store.tables.videos)).some(
        (row) => asString(row.mediaObjectId) === params.mediaObjectId,
      )
    ) {
      throw badRequest('Media object is already linked to a video', {
        mediaObjectId: params.mediaObjectId,
      });
    }
    assertMediaObjectReadyForVideo(store.tables, mediaObject);
    const video: SeedRow = {
      id: newId('vid'),
      mediaObjectId: params.mediaObjectId,
      athleteId: params.athleteId ?? null,
      coachUserId: params.authUserId,
      title: params.title?.trim() || null,
      description: params.description?.trim() || null,
      visibility: 'PRIVATE',
      sourceContextType: params.sourceContextType ?? null,
      sourceContextId: params.sourceContextId ?? null,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    asRows(store.tables.videos).push(video);
    mediaObject.updatedByUserId = params.authUserId;
    mediaObject.updatedAt = now;
    mediaObject.version = nextVersion(mediaObject.version);
    if (typeof params.durationMs === 'number' && params.durationMs > 0) {
      mediaObject.durationMs = params.durationMs;
    }
    return {
      ...hydrateStoreVideoBundle(store.tables, video),
      dataVersion: store.version,
    };
  }
  async updateVideo(params: VideoUpdateParams): Promise<VideoRecordResult> {
    const store = this.storeProvider();
    const video = activeRows(asRows(store.tables.videos)).find(
      (row) => asString(row.id) === params.videoId,
    );
    if (!video) {
      throw notFound('Video not found', {
        videoId: params.videoId,
      });
    }
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    video.title = params.title?.trim() || null;
    video.description = params.description?.trim() || null;
    video.updatedByUserId = params.authUserId;
    video.updatedAt = nowIso();
    video.version = nextVersion(video.version);
    return {
      ...hydrateStoreVideoBundle(store.tables, video),
      dataVersion: store.version,
    };
  }
  async setVideoVisibility(params: VideoVisibilityParams): Promise<VideoRecordResult> {
    const store = this.storeProvider();
    const video = activeRows(asRows(store.tables.videos)).find(
      (row) => asString(row.id) === params.videoId,
    );
    if (!video) {
      throw notFound('Video not found', {
        videoId: params.videoId,
      });
    }
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    const videoShares = ensureRows(store.tables, 'videoShares');
    const now = nowIso();
    const allowedRecipientUserIds = defaultShareRecipientUserIdsFromTables(
      store.tables,
      asString(video.athleteId),
    );
    const recipientUserIds =
      params.visibility === 'SHARED'
        ? assertAllowedShareRecipients(allowedRecipientUserIds, params.recipientUserIds ?? [], {
            videoId: params.videoId,
          })
        : [];
    video.visibility = params.visibility;
    video.updatedByUserId = params.authUserId;
    video.updatedAt = now;
    video.version = nextVersion(video.version);
    const activeShareRows = videoShares.filter(
      (row) => asString(row.videoId) === params.videoId && asString(row.deletedAt) == null,
    );
    const recipientUserIdSet = new Set(recipientUserIds);
    const shareByRecipientUserId = new Map(
      videoShares.flatMap((row) => {
        if (asString(row.videoId) !== params.videoId) {
          return [];
        }
        const recipientUserId = asString(row.sharedWithUserId);
        return recipientUserId ? [[recipientUserId, row] as const] : [];
      }),
    );
    for (const share of activeShareRows) {
      const recipientUserId = asString(share.sharedWithUserId);
      if (!recipientUserId || !recipientUserIdSet.has(recipientUserId)) {
        share.deletedAt = now;
        share.updatedByUserId = params.authUserId;
        share.updatedAt = now;
        share.version = nextVersion(share.version);
      }
    }
    for (const recipientUserId of recipientUserIds) {
      const existing = shareByRecipientUserId.get(recipientUserId);
      if (existing) {
        existing.deletedAt = null;
        existing.updatedByUserId = params.authUserId;
        existing.updatedAt = now;
        existing.version = nextVersion(existing.version);
        continue;
      }
      const createdShare = {
        id: `${params.videoId}:${recipientUserId}`,
        videoId: params.videoId,
        sharedWithUserId: recipientUserId,
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      videoShares.push(createdShare);
      shareByRecipientUserId.set(recipientUserId, createdShare);
    }
    return {
      ...hydrateStoreVideoBundle(store.tables, video),
      dataVersion: store.version,
    };
  }
  async addVideoAnnotation(params: VideoAnnotationCreateParams): Promise<VideoAnnotationResult> {
    const store = this.storeProvider();
    const bundle = await this.getVideoDetail(params);
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, bundle.video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    if (bundle.annotations.some((row) => asNumber(row.timestampMs) === params.timestampMs)) {
      throw badRequest('Annotation already exists at that timestamp', {
        videoId: params.videoId,
      });
    }
    const durationMs = asNumber(bundle.mediaObject.durationMs);
    if (typeof durationMs === 'number' && params.timestampMs > durationMs) {
      throw badRequest('Annotation timestamp exceeds video duration', {
        videoId: params.videoId,
      });
    }
    const now = nowIso();
    const annotation: SeedRow = {
      id: newId('ann'),
      videoId: params.videoId,
      authorUserId: params.authUserId,
      timestampMs: params.timestampMs,
      text: params.label.trim(),
      note: params.note?.trim() || null,
      annotationType: params.annotationType,
      color: annotationColorForType(params.annotationType),
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    ensureRows(store.tables, 'videoAnnotations').push(annotation);
    return {
      annotation,
      dataVersion: store.version,
    };
  }
  async updateVideoAnnotation(params: VideoAnnotationUpdateParams): Promise<VideoAnnotationResult> {
    const store = this.storeProvider();
    const bundle = await this.getVideoDetail(params);
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, bundle.video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    const annotation = ensureRows(store.tables, 'videoAnnotations').find(
      (row) => asString(row.id) === params.annotationId && asString(row.deletedAt) == null,
    );
    if (!annotation || asString(annotation.videoId) !== params.videoId) {
      throw notFound('Video annotation not found', {
        annotationId: params.annotationId,
      });
    }
    const duplicate = bundle.annotations.some(
      (row) =>
        asString(row.id) !== params.annotationId &&
        asNumber(row.timestampMs) === params.timestampMs,
    );
    if (duplicate) {
      throw badRequest('Annotation already exists at that timestamp', {
        videoId: params.videoId,
      });
    }
    const durationMs = asNumber(bundle.mediaObject.durationMs);
    if (typeof durationMs === 'number' && params.timestampMs > durationMs) {
      throw badRequest('Annotation timestamp exceeds video duration', {
        videoId: params.videoId,
      });
    }
    annotation.timestampMs = params.timestampMs;
    annotation.text = params.label.trim();
    annotation.note = params.note?.trim() || null;
    annotation.annotationType = params.annotationType;
    annotation.color = annotationColorForType(params.annotationType);
    annotation.updatedByUserId = params.authUserId;
    annotation.updatedAt = nowIso();
    annotation.version = nextVersion(annotation.version);
    return {
      annotation,
      dataVersion: store.version,
    };
  }
  async deleteVideoAnnotation(params: VideoAnnotationDeleteParams): Promise<void> {
    const store = this.storeProvider();
    const bundle = await this.getVideoDetail(params);
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, bundle.video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    const annotation = ensureRows(store.tables, 'videoAnnotations').find(
      (row) => asString(row.id) === params.annotationId && asString(row.videoId) === params.videoId,
    );
    if (!annotation || asString(annotation.deletedAt) != null) {
      throw notFound('Video annotation not found', {
        annotationId: params.annotationId,
      });
    }
    annotation.deletedAt = nowIso();
    annotation.updatedByUserId = params.authUserId;
    annotation.updatedAt = nowIso();
    annotation.version = nextVersion(annotation.version);
  }
  async deleteVideo(params: VideoDetailParams): Promise<void> {
    const store = this.storeProvider();
    const video = ensureRows(store.tables, 'videos').find(
      (row) => asString(row.id) === params.videoId,
    );
    if (!video || asString(video.deletedAt) != null) {
      throw notFound('Video not found', {
        videoId: params.videoId,
      });
    }
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    const now = nowIso();
    video.deletedAt = now;
    video.updatedByUserId = params.authUserId;
    video.updatedAt = now;
    video.version = nextVersion(video.version);
    for (const annotation of ensureRows(store.tables, 'videoAnnotations')) {
      if (
        asString(annotation.videoId) !== params.videoId ||
        asString(annotation.deletedAt) != null
      ) {
        continue;
      }
      annotation.deletedAt = now;
      annotation.updatedByUserId = params.authUserId;
      annotation.updatedAt = now;
      annotation.version = nextVersion(annotation.version);
    }
    for (const share of ensureRows(store.tables, 'videoShares')) {
      if (asString(share.videoId) !== params.videoId || asString(share.deletedAt) != null) {
        continue;
      }
      share.deletedAt = now;
      share.updatedByUserId = params.authUserId;
      share.updatedAt = now;
      share.version = nextVersion(share.version);
    }
  }
}
class PrismaVideoAuthorityRepository implements VideoAuthorityRepository {
  private readonly fallback = new StoreVideoAuthorityRepository(() => getDbFixtureStore());
  private async getVideoBundleOrThrow(videoId: string): Promise<VideoRecordBundle> {
    const prisma = getPrismaClientOrThrow();
    const video = normalizeAs<
      | (SeedRow & {
          mediaObject: SeedRow;
          annotations: SeedRow[];
          shares: SeedRow[];
        })
      | null
    >(
      await prisma.video.findFirst({
        where: {
          id: videoId,
          deletedAt: null,
        },
        include: {
          mediaObject: true,
          annotations: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              timestampMs: 'asc',
            },
          },
          shares: {
            where: {
              deletedAt: null,
            },
          },
        },
      }),
    );
    if (!video) {
      throw notFound('Video not found', {
        videoId,
      });
    }
    const { mediaObject, annotations, shares, ...videoRow } = video;
    return {
      video: videoRow,
      mediaObject: mediaObject as SeedRow,
      annotations: asRows(annotations),
      shares: asRows(shares),
    };
  }
  private async assertFamilyAccessToAthlete(authUserId: string, athleteId: string): Promise<void> {
    const prisma = getPrismaClientOrThrow();
    const athlete = await prisma.athlete.findUnique({
      where: {
        id: athleteId,
      },
      select: {
        userId: true,
      },
    });
    if (athlete?.userId === authUserId) {
      return;
    }
    const guardian = await prisma.guardianChildLink.findFirst({
      where: {
        athleteId,
        guardianUserId: authUserId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!guardian) {
      throw forbidden('Athlete videos do not belong to authenticated user', {
        athleteId,
      });
    }
  }
  private async defaultShareRecipientUserIds(athleteId: string | undefined): Promise<string[]> {
    if (!athleteId) {
      return [];
    }
    const prisma = getPrismaClientOrThrow();
    const [athlete, guardianLinks] = await Promise.all([
      prisma.athlete.findUnique({
        where: {
          id: athleteId,
        },
        select: {
          userId: true,
        },
      }),
      prisma.guardianChildLink.findMany({
        where: {
          athleteId,
          deletedAt: null,
        },
        select: {
          guardianUserId: true,
        },
      }),
    ]);
    return Array.from(
      new Set(
        [athlete?.userId, ...guardianLinks.map((row) => row.guardianUserId)].filter(
          (userId): userId is string => Boolean(userId),
        ),
      ),
    );
  }
  async listVideos(params: VideoListParams): Promise<VideoListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listVideos(params);
    }
    const prisma = getPrismaClientOrThrow();
    if (params.coachId) {
      if (!params.isPrivilegedAdmin && params.coachId !== params.authUserId) {
        throw forbidden('Coach videos do not belong to authenticated user', {
          coachId: params.coachId,
        });
      }
    } else if (params.athleteId) {
      if (!params.isPrivilegedAdmin) {
        await this.assertFamilyAccessToAthlete(params.authUserId, params.athleteId);
      }
    } else {
      throw badRequest('Coach id or athlete id is required to list videos');
    }
    const videos = normalizeAs<
      Array<
        SeedRow & {
          mediaObject: SeedRow;
          annotations: SeedRow[];
          shares: SeedRow[];
        }
      >
    >(
      await prisma.video.findMany({
        where: {
          deletedAt: null,
          ...(params.coachId
            ? {
                coachUserId: params.coachId,
              }
            : {}),
          ...(params.athleteId
            ? {
                athleteId: params.athleteId,
              }
            : {}),
        },
        include: {
          mediaObject: true,
          annotations: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              timestampMs: 'asc',
            },
          },
          shares: {
            where: {
              deletedAt: null,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    );
    return {
      items: videos.flatMap((item) => {
        const mapped = (({ mediaObject, annotations, shares, ...video }) => ({
          video,
          mediaObject,
          annotations: asRows(annotations),
          shares: asRows(shares),
        }))(item);
        return ((bundle) =>
          canReadVideoBundle(params.authUserId, params.isPrivilegedAdmin, bundle))(mapped)
          ? [mapped]
          : [];
      }),
      dataVersion: null,
    };
  }
  async getVideoDetail(params: VideoDetailParams): Promise<VideoRecordResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getVideoDetail(params);
    }
    const bundle = await this.getVideoBundleOrThrow(params.videoId);
    if (!canReadVideoBundle(params.authUserId, params.isPrivilegedAdmin, bundle)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    return {
      ...bundle,
      dataVersion: null,
    };
  }
  async createVideo(params: VideoCreateParams): Promise<VideoRecordResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createVideo(params);
    }
    const prisma = getPrismaClientOrThrow();
    await prisma.$transaction(async (tx) => {
      const mediaObject = await tx.mediaObject.findFirst({
        where: {
          id: params.mediaObjectId,
          deletedAt: null,
        },
        select: {
          id: true,
          ownerUserId: true,
          status: true,
          scans: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              verdict: true,
            },
          },
        },
      });
      if (!mediaObject) {
        throw notFound('Media object not found', {
          mediaObjectId: params.mediaObjectId,
        });
      }
      if (!params.isPrivilegedAdmin && mediaObject.ownerUserId !== params.authUserId) {
        throw forbidden('Media object does not belong to authenticated user', {
          mediaObjectId: params.mediaObjectId,
        });
      }
      const existing = await tx.video.findFirst({
        where: {
          mediaObjectId: params.mediaObjectId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (existing) {
        throw badRequest('Media object is already linked to a video', {
          mediaObjectId: params.mediaObjectId,
        });
      }
      const latestScan = mediaObject.scans[0];
      if (mediaObject.status !== 'AVAILABLE' || latestScan?.verdict !== 'CLEAN') {
        throw badRequest(
          'Media object must be finalized and pass malware scanning before video creation',
          {
            mediaObjectId: params.mediaObjectId,
            mediaStatus: mediaObject.status,
            scanVerdict: latestScan?.verdict ?? null,
          },
        );
      }
      await tx.video.create({
        data: {
          id: newId('vid'),
          mediaObjectId: params.mediaObjectId,
          athleteId: params.athleteId ?? null,
          coachUserId: params.authUserId,
          title: params.title?.trim() || null,
          description: params.description?.trim() || null,
          visibility: 'PRIVATE',
          sourceContextType: params.sourceContextType ?? null,
          sourceContextId: params.sourceContextId ?? null,
          createdByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
        },
      });
      await tx.mediaObject.update({
        where: {
          id: params.mediaObjectId,
        },
        data: {
          durationMs:
            typeof params.durationMs === 'number' && params.durationMs > 0
              ? params.durationMs
              : undefined,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1n,
          },
        },
      });
    });
    const created = await prisma.video.findFirst({
      where: {
        mediaObjectId: params.mediaObjectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!created) {
      throw notFound('Video not found after creation', {
        mediaObjectId: params.mediaObjectId,
      });
    }
    return this.getVideoDetail({
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
      videoId: created.id,
    });
  }
  async updateVideo(params: VideoUpdateParams): Promise<VideoRecordResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateVideo(params);
    }
    const bundle = await this.getVideoDetail(params);
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, bundle.video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    const prisma = getPrismaClientOrThrow();
    await prisma.video.update({
      where: {
        id: params.videoId,
      },
      data: {
        title: params.title?.trim() || null,
        description: params.description?.trim() || null,
        updatedByUserId: params.authUserId,
        version: {
          increment: 1n,
        },
      },
    });
    return this.getVideoDetail(params);
  }
  async setVideoVisibility(params: VideoVisibilityParams): Promise<VideoRecordResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.setVideoVisibility(params);
    }
    const bundle = await this.getVideoDetail(params);
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, bundle.video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    const allowedRecipientUserIds = await this.defaultShareRecipientUserIds(
      asString(bundle.video.athleteId),
    );
    const recipientUserIds =
      params.visibility === 'SHARED'
        ? assertAllowedShareRecipients(allowedRecipientUserIds, params.recipientUserIds ?? [], {
            videoId: params.videoId,
          })
        : [];
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.video.update({
          where: {
            id: params.videoId,
          },
          data: {
            visibility: params.visibility,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1n,
            },
          },
        }),
        tx.videoShare.updateMany({
          where: {
            videoId: params.videoId,
            deletedAt: null,
            ...(recipientUserIds.length > 0
              ? {
                  sharedWithUserId: {
                    notIn: recipientUserIds,
                  },
                }
              : {}),
          },
          data: {
            deletedAt: now,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1n,
            },
          },
        }),
        ...recipientUserIds.map((recipientUserId) =>
          tx.videoShare.upsert({
            where: {
              videoId_sharedWithUserId: {
                videoId: params.videoId,
                sharedWithUserId: recipientUserId,
              },
            },
            update: {
              deletedAt: null,
              updatedByUserId: params.authUserId,
              version: {
                increment: 1n,
              },
            },
            create: {
              id: `${params.videoId}:${recipientUserId}`,
              videoId: params.videoId,
              sharedWithUserId: recipientUserId,
              createdByUserId: params.authUserId,
              updatedByUserId: params.authUserId,
            },
          }),
        ),
      ]);
    });
    return this.getVideoDetail(params);
  }
  async addVideoAnnotation(params: VideoAnnotationCreateParams): Promise<VideoAnnotationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.addVideoAnnotation(params);
    }
    const bundle = await this.getVideoDetail(params);
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, bundle.video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    if (bundle.annotations.some((row) => asNumber(row.timestampMs) === params.timestampMs)) {
      throw badRequest('Annotation already exists at that timestamp', {
        videoId: params.videoId,
      });
    }
    const durationMs = asNumber(bundle.mediaObject.durationMs);
    if (typeof durationMs === 'number' && params.timestampMs > durationMs) {
      throw badRequest('Annotation timestamp exceeds video duration', {
        videoId: params.videoId,
      });
    }
    const prisma = getPrismaClientOrThrow();
    const annotation = normalizeAs<SeedRow>(
      await prisma.videoAnnotation.create({
        data: {
          id: newId('ann'),
          videoId: params.videoId,
          authorUserId: params.authUserId,
          timestampMs: params.timestampMs,
          text: params.label.trim(),
          note: params.note?.trim() || null,
          annotationType: params.annotationType,
          color: annotationColorForType(params.annotationType),
          createdByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
        },
      }),
    );
    return {
      annotation,
      dataVersion: null,
    };
  }
  async updateVideoAnnotation(params: VideoAnnotationUpdateParams): Promise<VideoAnnotationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateVideoAnnotation(params);
    }
    const bundle = await this.getVideoDetail(params);
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, bundle.video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    if (
      bundle.annotations.some(
        (row) =>
          asString(row.id) !== params.annotationId &&
          asNumber(row.timestampMs) === params.timestampMs,
      )
    ) {
      throw badRequest('Annotation already exists at that timestamp', {
        videoId: params.videoId,
      });
    }
    const durationMs = asNumber(bundle.mediaObject.durationMs);
    if (typeof durationMs === 'number' && params.timestampMs > durationMs) {
      throw badRequest('Annotation timestamp exceeds video duration', {
        videoId: params.videoId,
      });
    }
    const prisma = getPrismaClientOrThrow();
    const updated = normalizeAs<SeedRow>(
      await prisma.videoAnnotation.update({
        where: {
          id: params.annotationId,
        },
        data: {
          timestampMs: params.timestampMs,
          text: params.label.trim(),
          note: params.note?.trim() || null,
          annotationType: params.annotationType,
          color: annotationColorForType(params.annotationType),
          updatedByUserId: params.authUserId,
          version: {
            increment: 1n,
          },
        },
      }),
    );
    return {
      annotation: updated,
      dataVersion: null,
    };
  }
  async deleteVideoAnnotation(params: VideoAnnotationDeleteParams): Promise<void> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deleteVideoAnnotation(params);
    }
    const bundle = await this.getVideoDetail(params);
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, bundle.video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    const prisma = getPrismaClientOrThrow();
    await prisma.videoAnnotation.updateMany({
      where: {
        id: params.annotationId,
        videoId: params.videoId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updatedByUserId: params.authUserId,
        version: {
          increment: 1n,
        },
      },
    });
  }
  async deleteVideo(params: VideoDetailParams): Promise<void> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deleteVideo(params);
    }
    const bundle = await this.getVideoDetail(params);
    if (!isVideoManager(params.authUserId, params.isPrivilegedAdmin, bundle.video)) {
      throw forbidden('Video does not belong to authenticated user', {
        videoId: params.videoId,
      });
    }
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.video.update({
          where: {
            id: params.videoId,
          },
          data: {
            deletedAt: now,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1n,
            },
          },
        }),
        tx.videoAnnotation.updateMany({
          where: {
            videoId: params.videoId,
            deletedAt: null,
          },
          data: {
            deletedAt: now,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1n,
            },
          },
        }),
        tx.videoShare.updateMany({
          where: {
            videoId: params.videoId,
            deletedAt: null,
          },
          data: {
            deletedAt: now,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1n,
            },
          },
        }),
      ]);
    });
  }
}
const seedRepository = new StoreVideoAuthorityRepository(() => getMarketplaceSeedStore());
const prismaRepository = new PrismaVideoAuthorityRepository();
export function resolveVideoAuthorityRepository(): VideoAuthorityRepository {
  return getApiDataBackend() === 'db' ? prismaRepository : seedRepository;
}
