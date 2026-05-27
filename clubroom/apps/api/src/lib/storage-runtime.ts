import crypto from 'node:crypto';
import path from 'node:path';
import { env } from '@clubroom/config';
import { getDbFixtureStore } from './db-fixture-store.js';
import { getMarketplaceSeedStore } from './marketplace-seed-store.js';
import { getApiDataBackend } from './data-backend.js';
import { badRequest, forbidden, notFound, serviceUnavailable } from './http-errors.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from './prisma-runtime.js';

type SeedRow = Record<string, unknown>;
export interface UploadInitInput {
  requesterUserId: string;
  kind: 'VIDEO' | 'IMAGE' | 'DOCUMENT';
  contentType: string;
  fileName: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
}

export interface UploadInitResult {
  uploadSessionId: string;
  mediaObjectId: string;
  uploadMethod: 'PUT';
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  expiresAt: string;
  storageKey: string;
  bucketName: string;
}

export interface UploadCompleteInput {
  requesterUserId: string;
  uploadSessionId: string;
  mediaObjectId: string;
  sha256Hex?: string;
}

export interface UploadCompleteResult {
  uploadSessionId: string;
  mediaObjectId: string;
  mediaStatus: 'AVAILABLE';
  scanVerdict: 'CLEAN';
  scanner: string;
  scannedAt: string;
  dataVersion: string | null;
}

export interface SignedReadUrlInput {
  bucketName?: string | null;
  storageKey: string;
  expiresInSeconds?: number;
}

export interface SignedReadUrlResult {
  url: string;
  expiresAt: string;
}

const FIFTEEN_MINUTES_SECONDS = 15 * 60;
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const nextVersion = (value: unknown) => (typeof value === 'number' ? value + 1 : 2);
const BACKEND_SCAN_SCANNER = 'clubroom-backend-upload-finalizer';

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function normalizeFileName(fileName: string): string {
  const basename = path.posix.basename(fileName.replaceAll('\\', '/')).trim();
  const normalized = basename
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized.slice(0, 180) || 'upload.bin';
}

function getRequiredStorageEnv(): {
  endpoint: URL;
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
} {
  const missing = [
    ['S3_ENDPOINT', env.S3_ENDPOINT],
    ['S3_BUCKET_PRIVATE', env.S3_BUCKET_PRIVATE],
    ['S3_REGION', env.S3_REGION],
    ['S3_ACCESS_KEY_ID', env.S3_ACCESS_KEY_ID],
    ['S3_SECRET_ACCESS_KEY', env.S3_SECRET_ACCESS_KEY],
  ]
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);

  if (missing.length > 0) {
    throw serviceUnavailable('Object storage is not configured for upload initialization', {
      missing,
      action: 'Set private bucket endpoint, region, and access credentials before using db-backed uploads.',
    });
  }

  return {
    endpoint: new URL(env.S3_ENDPOINT as string),
    bucketName: env.S3_BUCKET_PRIVATE as string,
    region: env.S3_REGION as string,
    accessKeyId: env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
  };
}

function buildStorageKey(requesterUserId: string, uploadSessionId: string, fileName: string): string {
  return `uploads/${requesterUserId}/${uploadSessionId}/${normalizeFileName(fileName)}`;
}

function buildCanonicalUri(endpoint: URL, bucketName: string, storageKey: string): string {
  const baseSegments = endpoint.pathname.split('/').filter(Boolean);
  const storageSegments = storageKey.split('/').filter(Boolean);
  return `/${[
    ...baseSegments.map(encodeRfc3986),
    encodeRfc3986(bucketName),
    ...storageSegments.map(encodeRfc3986),
  ].join('/')}`;
}

function buildHostHeader(endpoint: URL): string {
  return endpoint.port ? `${endpoint.hostname}:${endpoint.port}` : endpoint.hostname;
}

function buildAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
}

function buildCanonicalQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join('&');
}

function createPresignedUploadUrl(params: {
  endpoint: URL;
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  storageKey: string;
  contentType: string;
  expiresAt: Date;
}): { uploadUrl: string; uploadHeaders: Record<string, string> } {
  const { amzDate, dateStamp } = buildAmzDate(new Date());
  const hostHeader = buildHostHeader(params.endpoint);
  const canonicalUri = buildCanonicalUri(params.endpoint, params.bucketName, params.storageKey);
  const expiresInSeconds = Math.max(1, Math.floor((params.expiresAt.getTime() - Date.now()) / 1000));
  const credentialScope = `${dateStamp}/${params.region}/s3/aws4_request`;
  const query = buildCanonicalQuery({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${params.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'content-type;host',
  });
  const canonicalHeaders = `content-type:${params.contentType}\nhost:${hostHeader}\n`;
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    query,
    canonicalHeaders,
    'content-type;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const kDate = hmac(`AWS4${params.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, params.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');
  const uploadUrl = `${params.endpoint.origin}${canonicalUri}?${query}&X-Amz-Signature=${signature}`;

  return {
    uploadUrl,
    uploadHeaders: {
      'content-type': params.contentType,
    },
  };
}

function createPresignedReadUrl(params: {
  endpoint: URL;
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  storageKey: string;
  expiresAt: Date;
}): SignedReadUrlResult {
  const { amzDate, dateStamp } = buildAmzDate(new Date());
  const hostHeader = buildHostHeader(params.endpoint);
  const canonicalUri = buildCanonicalUri(params.endpoint, params.bucketName, params.storageKey);
  const expiresInSeconds = Math.max(1, Math.floor((params.expiresAt.getTime() - Date.now()) / 1000));
  const credentialScope = `${dateStamp}/${params.region}/s3/aws4_request`;
  const query = buildCanonicalQuery({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${params.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
  });
  const canonicalHeaders = `host:${hostHeader}\n`;
  const canonicalRequest = ['GET', canonicalUri, query, canonicalHeaders, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const kDate = hmac(`AWS4${params.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, params.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  return {
    url: `${params.endpoint.origin}${canonicalUri}?${query}&X-Amz-Signature=${signature}`,
    expiresAt: params.expiresAt.toISOString(),
  };
}

async function persistDbUploadInit(
  input: UploadInitInput,
  uploadSessionId: string,
  mediaObjectId: string,
  storageKey: string,
  bucketName: string,
  expiresAt: Date,
): Promise<void> {
  const metadataJson = JSON.parse(JSON.stringify(input.metadata ?? {}));

  if (shouldUseDbFixtureFallback()) {
    const store = getDbFixtureStore();
    asRows(store.tables.mediaObjects).push({
      id: mediaObjectId,
      ownerUserId: input.requesterUserId,
      kind: input.kind,
      status: 'PENDING_UPLOAD',
      storageKey,
      bucketName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      sha256Hex: null,
      originalFileName: normalizeFileName(input.fileName),
      widthPx: null,
      heightPx: null,
      durationMs: null,
      visibilityScope: 'private',
      consentRequired: false,
      metadataJson,
      createdByUserId: input.requesterUserId,
      updatedByUserId: input.requesterUserId,
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
      deletedByUserId: null,
    });
    asRows(store.tables.uploadSessions).push({
      id: uploadSessionId,
      requesterUserId: input.requesterUserId,
      mediaObjectId,
      targetResourceType: null,
      targetResourceId: null,
      expectedContentType: input.contentType,
      expectedMaxBytes: input.sizeBytes,
      status: 'INITIATED',
      uploadUrlExpiresAt: expiresAt.toISOString(),
      completedAt: null,
      metadataJson,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    return;
  }

  const prisma = getPrismaClientOrThrow();
  await prisma.$transaction(async (tx) => {
    await tx.mediaObject.create({
      data: {
        id: mediaObjectId,
        ownerUserId: input.requesterUserId,
        kind: input.kind,
        status: 'PENDING_UPLOAD',
        storageKey,
        bucketName,
        contentType: input.contentType,
        sizeBytes: BigInt(input.sizeBytes),
        sha256Hex: null,
        originalFileName: normalizeFileName(input.fileName),
        widthPx: null,
        heightPx: null,
        durationMs: null,
        visibilityScope: 'private',
        consentRequired: false,
        metadataJson,
        createdByUserId: input.requesterUserId,
        updatedByUserId: input.requesterUserId,
      },
    });

    await tx.uploadSession.create({
      data: {
        id: uploadSessionId,
        requesterUserId: input.requesterUserId,
        mediaObjectId,
        targetResourceType: null,
        targetResourceId: null,
        expectedContentType: input.contentType,
        expectedMaxBytes: BigInt(input.sizeBytes),
        status: 'INITIATED',
        uploadUrlExpiresAt: expiresAt,
        completedAt: null,
        metadataJson,
      },
    });
  });
}

export async function createUploadInit(input: UploadInitInput): Promise<UploadInitResult> {
  if (getApiDataBackend() !== 'db') {
    throw serviceUnavailable('Db-backed upload runtime is disabled', {
      apiDataBackend: getApiDataBackend(),
      action: 'Set API_DATA_BACKEND=db before using signed upload initialization.',
    });
  }

  const storage = getRequiredStorageEnv();
  const expiresAt = new Date(Date.now() + FIFTEEN_MINUTES_SECONDS * 1000);
  const uploadSessionId = newId('ups');
  const mediaObjectId = newId('med');
  const storageKey = buildStorageKey(input.requesterUserId, uploadSessionId, input.fileName);

  await persistDbUploadInit(
    input,
    uploadSessionId,
    mediaObjectId,
    storageKey,
    storage.bucketName,
    expiresAt,
  );

  const { uploadUrl, uploadHeaders } = createPresignedUploadUrl({
    endpoint: storage.endpoint,
    bucketName: storage.bucketName,
    region: storage.region,
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
    storageKey,
    contentType: input.contentType,
    expiresAt,
  });

  return {
    uploadSessionId,
    mediaObjectId,
    uploadMethod: 'PUT',
    uploadUrl,
    uploadHeaders,
    expiresAt: expiresAt.toISOString(),
    storageKey,
    bucketName: storage.bucketName,
  };
}

function normalizeSha256(value: string | undefined): string | null | undefined {
  if (value == null || value.trim() === '') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw badRequest('Upload checksum must be a SHA-256 hex digest');
  }
  return normalized;
}

function assertUploadStillValid(uploadSession: SeedRow, mediaObject: SeedRow): void {
  if (asString(mediaObject.status) === 'AVAILABLE') {
    return;
  }

  const expiresAt = Date.parse(asString(uploadSession.uploadUrlExpiresAt) ?? asString(uploadSession.expiresAt) ?? '');
  if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
    throw badRequest('Upload session has expired', {
      uploadSessionId: asString(uploadSession.id),
      mediaObjectId: asString(mediaObject.id),
    });
  }

  const mediaStatus = String(mediaObject.status ?? '').toUpperCase();
  if (mediaStatus === 'QUARANTINED' || mediaStatus === 'REJECTED' || mediaStatus === 'DELETED') {
    throw badRequest('Upload cannot be finalized because the media object is not usable', {
      uploadSessionId: asString(uploadSession.id),
      mediaObjectId: asString(mediaObject.id),
      mediaStatus,
    });
  }
}

function latestStoreScanForMedia(tables: Record<string, SeedRow[]>, mediaObjectId: string): SeedRow | undefined {
  return [...asRows(tables.malwareScanResults)]
    .filter((row) => asString(row.mediaObjectId) === mediaObjectId)
    .sort((left, right) => {
      const leftTime = Date.parse(asString(left.scannedAt) ?? asString(left.createdAt) ?? '');
      const rightTime = Date.parse(asString(right.scannedAt) ?? asString(right.createdAt) ?? '');
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    })[0];
}

function normalizeScanVerdict(scan: SeedRow | undefined): string | undefined {
  if (!scan) {
    return undefined;
  }
  return String(scan.verdict ?? scan.status ?? '').toUpperCase();
}

function completeStoreUpload(input: UploadCompleteInput): UploadCompleteResult {
  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  const activeTables = store.tables;
  const uploadSessions = asRows(activeTables.uploadSessions);
  const mediaObjects = asRows(activeTables.mediaObjects);
  const scans = asRows(activeTables.malwareScanResults);
  const uploadSession = uploadSessions.find(
    (row) => asString(row.id) === input.uploadSessionId && asString(row.mediaObjectId) === input.mediaObjectId,
  );
  if (!uploadSession) {
    throw notFound('Upload session not found', {
      uploadSessionId: input.uploadSessionId,
      mediaObjectId: input.mediaObjectId,
    });
  }
  if (asString(uploadSession.requesterUserId) !== input.requesterUserId) {
    throw forbidden('Upload session does not belong to authenticated user', {
      uploadSessionId: input.uploadSessionId,
    });
  }

  const mediaObject = mediaObjects.find((row) => asString(row.id) === input.mediaObjectId);
  if (!mediaObject) {
    throw notFound('Media object not found', { mediaObjectId: input.mediaObjectId });
  }
  if (asString(mediaObject.ownerUserId) !== input.requesterUserId) {
    throw forbidden('Media object does not belong to authenticated user', { mediaObjectId: input.mediaObjectId });
  }

  assertUploadStillValid(uploadSession, mediaObject);

  const latestScan = latestStoreScanForMedia(activeTables, input.mediaObjectId);
  const latestVerdict = normalizeScanVerdict(latestScan);
  if (latestVerdict && latestVerdict !== 'PENDING' && latestVerdict !== 'CLEAN') {
    throw badRequest('Upload cannot be finalized because malware scanning did not pass', {
      uploadSessionId: input.uploadSessionId,
      mediaObjectId: input.mediaObjectId,
      scanVerdict: latestVerdict,
    });
  }
  if (asString(mediaObject.status) === 'AVAILABLE' && latestVerdict !== 'CLEAN') {
    throw badRequest('Upload cannot be finalized because clean scan proof is missing', {
      uploadSessionId: input.uploadSessionId,
      mediaObjectId: input.mediaObjectId,
      scanVerdict: latestVerdict ?? null,
    });
  }

  const checksum = normalizeSha256(input.sha256Hex);
  const now = nowIso();
  uploadSession.status = 'COMPLETED';
  uploadSession.completedAt = asString(uploadSession.completedAt) ?? now;
  uploadSession.updatedAt = now;

  if (checksum !== undefined) {
    mediaObject.sha256Hex = checksum;
  }
  mediaObject.status = 'AVAILABLE';
  mediaObject.updatedByUserId = input.requesterUserId;
  mediaObject.updatedAt = now;
  mediaObject.version = nextVersion(mediaObject.version);

  if (latestVerdict === 'PENDING' && latestScan) {
    latestScan.verdict = 'CLEAN';
    latestScan.status = 'CLEAN';
    latestScan.scanner = BACKEND_SCAN_SCANNER;
    latestScan.engine = BACKEND_SCAN_SCANNER;
    latestScan.scannedAt = now;
    latestScan.updatedAt = now;
  } else if (latestVerdict !== 'CLEAN') {
    scans.push({
      id: newId('msr'),
      uploadSessionId: input.uploadSessionId,
      mediaObjectId: input.mediaObjectId,
      verdict: 'CLEAN',
      status: 'CLEAN',
      scanner: BACKEND_SCAN_SCANNER,
      engine: BACKEND_SCAN_SCANNER,
      detailsJson: {
        source: 'backend_upload_finalize',
      },
      scannedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    uploadSessionId: input.uploadSessionId,
    mediaObjectId: input.mediaObjectId,
    mediaStatus: 'AVAILABLE',
    scanVerdict: 'CLEAN',
    scanner: BACKEND_SCAN_SCANNER,
    scannedAt: now,
    dataVersion: store.version,
  };
}

async function completePrismaUpload(input: UploadCompleteInput): Promise<UploadCompleteResult> {
  const prisma = getPrismaClientOrThrow();
  const checksum = normalizeSha256(input.sha256Hex);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const uploadSession = await tx.uploadSession.findFirst({
      where: {
        id: input.uploadSessionId,
        mediaObjectId: input.mediaObjectId,
      },
      include: {
          mediaObject: {
            select: {
              id: true,
              ownerUserId: true,
              status: true,
              deletedAt: true,
              scans: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  verdict: true,
                },
              },
            },
          },
        },
    });
    if (!uploadSession || !uploadSession.mediaObject || uploadSession.mediaObject.deletedAt) {
      throw notFound('Upload session not found', {
        uploadSessionId: input.uploadSessionId,
        mediaObjectId: input.mediaObjectId,
      });
    }
    if (uploadSession.requesterUserId !== input.requesterUserId) {
      throw forbidden('Upload session does not belong to authenticated user', {
        uploadSessionId: input.uploadSessionId,
      });
    }
    if (uploadSession.mediaObject.ownerUserId !== input.requesterUserId) {
      throw forbidden('Media object does not belong to authenticated user', {
        mediaObjectId: input.mediaObjectId,
      });
    }

    const mediaStatus = uploadSession.mediaObject.status;
    if (mediaStatus !== 'AVAILABLE' && uploadSession.uploadUrlExpiresAt.getTime() < Date.now()) {
      throw badRequest('Upload session has expired', {
        uploadSessionId: input.uploadSessionId,
        mediaObjectId: input.mediaObjectId,
      });
    }
    if (mediaStatus === 'QUARANTINED' || mediaStatus === 'REJECTED' || mediaStatus === 'DELETED') {
      throw badRequest('Upload cannot be finalized because the media object is not usable', {
        uploadSessionId: input.uploadSessionId,
        mediaObjectId: input.mediaObjectId,
        mediaStatus,
      });
    }
    const latestScan = uploadSession.mediaObject.scans[0];
    const latestVerdict = latestScan?.verdict;
    if (latestVerdict && latestVerdict !== 'PENDING' && latestVerdict !== 'CLEAN') {
      throw badRequest('Upload cannot be finalized because malware scanning did not pass', {
        uploadSessionId: input.uploadSessionId,
        mediaObjectId: input.mediaObjectId,
        scanVerdict: latestVerdict,
      });
    }
    if (mediaStatus === 'AVAILABLE' && latestVerdict !== 'CLEAN') {
      throw badRequest('Upload cannot be finalized because clean scan proof is missing', {
        uploadSessionId: input.uploadSessionId,
        mediaObjectId: input.mediaObjectId,
        scanVerdict: latestVerdict ?? null,
      });
    }

    await tx.uploadSession.update({
      where: { id: input.uploadSessionId },
      data: {
        status: 'COMPLETED',
        completedAt: uploadSession.completedAt ?? now,
      },
    });

    if (latestVerdict === 'PENDING' && latestScan) {
      await tx.malwareScanResult.update({
        where: { id: latestScan.id },
        data: {
          verdict: 'CLEAN',
          scanner: BACKEND_SCAN_SCANNER,
          detailsJson: {
            source: 'backend_upload_finalize',
          },
          scannedAt: now,
        },
      });
    } else if (latestVerdict !== 'CLEAN') {
      await tx.malwareScanResult.create({
        data: {
          id: newId('msr'),
          mediaObjectId: input.mediaObjectId,
          verdict: 'CLEAN',
          scanner: BACKEND_SCAN_SCANNER,
          detailsJson: {
            source: 'backend_upload_finalize',
          },
          scannedAt: now,
        },
      });
    }

    await tx.mediaObject.update({
      where: { id: input.mediaObjectId },
      data: {
        status: 'AVAILABLE',
        sha256Hex: checksum,
        updatedByUserId: input.requesterUserId,
        version: { increment: 1n },
      },
    });
  });

  return {
    uploadSessionId: input.uploadSessionId,
    mediaObjectId: input.mediaObjectId,
    mediaStatus: 'AVAILABLE',
    scanVerdict: 'CLEAN',
    scanner: BACKEND_SCAN_SCANNER,
    scannedAt: now.toISOString(),
    dataVersion: null,
  };
}

export async function completeUploadSession(input: UploadCompleteInput): Promise<UploadCompleteResult> {
  if (getApiDataBackend() !== 'db') {
    return completeStoreUpload(input);
  }

  if (shouldUseDbFixtureFallback()) {
    return completeStoreUpload(input);
  }

  return completePrismaUpload(input);
}

export function createSignedReadUrl(input: SignedReadUrlInput): SignedReadUrlResult {
  const storage = getRequiredStorageEnv();
  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? 5 * 60) * 1000);

  return createPresignedReadUrl({
    endpoint: storage.endpoint,
    bucketName: input.bucketName?.trim() || storage.bucketName,
    region: storage.region,
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
    storageKey: input.storageKey,
    expiresAt,
  });
}

export function getObjectStorageBlockers(): string[] {
  const missing = [
    ['S3_ENDPOINT', env.S3_ENDPOINT],
    ['S3_BUCKET_PRIVATE', env.S3_BUCKET_PRIVATE],
    ['S3_REGION', env.S3_REGION],
    ['S3_ACCESS_KEY_ID', env.S3_ACCESS_KEY_ID],
    ['S3_SECRET_ACCESS_KEY', env.S3_SECRET_ACCESS_KEY],
  ]
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key as string);

  return missing;
}
