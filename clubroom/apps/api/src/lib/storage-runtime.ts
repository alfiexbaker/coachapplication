import crypto from 'node:crypto';
import path from 'node:path';
import { env } from '@clubroom/config';
import { Prisma } from '@clubroom/db';
import { getDbFixtureStore } from './db-fixture-store.js';
import { getMarketplaceSeedStore } from './marketplace-seed-store.js';
import { getApiDataBackend } from './data-backend.js';
import { badRequest, conflict, forbidden, notFound, serviceUnavailable } from './http-errors.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from './prisma-runtime.js';
import { UploadFilePolicyError, assertUploadDeclaration } from './upload-file-policy.js';
import { isUploadScannerReady } from './upload-scanner-heartbeat.js';

type SeedRow = Record<string, unknown>;
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

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
  mediaStatus: 'UPLOADED_UNSCANNED' | 'AVAILABLE';
  scanVerdict: 'PENDING' | 'ERROR' | 'CLEAN';
  scanner: string | null;
  scannedAt: string | null;
  pending: boolean;
  retryAfterMs: number | null;
  dataVersion: string | null;
}

export interface UploadStatusResult {
  uploadSessionId: string;
  mediaObjectId: string;
  uploadStatus: string;
  mediaStatus: string;
  scanVerdict: UploadScanVerdict;
  scanner: string | null;
  scannedAt: string | null;
  pending: boolean;
  readyToComplete: boolean;
  retryAfterMs: number | null;
  errorCode: string | null;
  dataVersion: string | null;
}

export type UploadScanVerdict = 'PENDING' | 'CLEAN' | 'INFECTED' | 'ERROR';

export interface UploadScanResultInput {
  uploadSessionId: string;
  mediaObjectId: string;
  sourceResultId?: string;
  scanAttemptId?: string;
  verdict: UploadScanVerdict;
  scanner: string;
  objectSizeBytes?: number;
  objectETag?: string;
  sha256Hex?: string;
  sealedStorageKey?: string;
  scannedAt?: string | Date | null;
  details?: Record<string, unknown>;
  recordedByUserId?: string;
  requireActiveAttempt?: boolean;
}

export interface UploadScanResultRecord {
  id: string;
  uploadSessionId: string;
  mediaObjectId: string;
  sourceResultId: string | null;
  scanAttemptId: string | null;
  verdict: UploadScanVerdict;
  scanner: string;
  objectSizeBytes: number | null;
  objectETag: string | null;
  sha256Hex: string | null;
  sealedStorageKey: string | null;
  scannedAt: string | null;
  replayed: boolean;
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

export interface SignedWriteUrlInput {
  bucketName?: string | null;
  storageKey: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds?: number;
}

const FIFTEEN_MINUTES_SECONDS = 15 * 60;
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const nextVersion = (value: unknown) => (typeof value === 'number' ? value + 1 : 2);

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
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
      action:
        'Set private bucket endpoint, region, and access credentials before using db-backed uploads.',
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

function buildStorageKey(
  requesterUserId: string,
  uploadSessionId: string,
  fileName: string,
): string {
  return `uploads/${requesterUserId}/${uploadSessionId}/${normalizeFileName(fileName)}`;
}

export function buildSealedStorageKey(sourceStorageKey: string, sha256: string): string {
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    throw badRequest('Sealed upload storage key requires a valid SHA-256 digest');
  }
  const directory = path.posix.dirname(sourceStorageKey);
  const extension = path.posix.extname(sourceStorageKey).slice(0, 20);
  return `${directory}/sealed/${sha256}${extension}`;
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
  contentLength: number;
  expiresAt: Date;
}): { uploadUrl: string; uploadHeaders: Record<string, string> } {
  const { amzDate, dateStamp } = buildAmzDate(new Date());
  const hostHeader = buildHostHeader(params.endpoint);
  const canonicalUri = buildCanonicalUri(params.endpoint, params.bucketName, params.storageKey);
  const expiresInSeconds = Math.max(
    1,
    Math.floor((params.expiresAt.getTime() - Date.now()) / 1000),
  );
  const credentialScope = `${dateStamp}/${params.region}/s3/aws4_request`;
  const query = buildCanonicalQuery({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${params.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'content-length;content-type;host',
  });
  const canonicalHeaders = `content-length:${params.contentLength}\ncontent-type:${params.contentType}\nhost:${hostHeader}\n`;
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    query,
    canonicalHeaders,
    'content-length;content-type;host',
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
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8')
    .digest('hex');
  const uploadUrl = `${params.endpoint.origin}${canonicalUri}?${query}&X-Amz-Signature=${signature}`;

  return {
    uploadUrl,
    uploadHeaders: {
      'content-type': params.contentType,
    },
  };
}

function createPresignedObjectUrl(params: {
  method: 'GET' | 'DELETE';
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
  const expiresInSeconds = Math.max(
    1,
    Math.floor((params.expiresAt.getTime() - Date.now()) / 1000),
  );
  const credentialScope = `${dateStamp}/${params.region}/s3/aws4_request`;
  const query = buildCanonicalQuery({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${params.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
  });
  const canonicalHeaders = `host:${hostHeader}\n`;
  const canonicalRequest = [
    params.method,
    canonicalUri,
    query,
    canonicalHeaders,
    'host',
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
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8')
    .digest('hex');

  return {
    url: `${params.endpoint.origin}${canonicalUri}?${query}&X-Amz-Signature=${signature}`,
    expiresAt: params.expiresAt.toISOString(),
  };
}

function scanDetailsJson(input: {
  uploadSessionId: string;
  source: string;
  details?: Record<string, unknown>;
}): JsonObject {
  const details = JSON.parse(JSON.stringify(input.details ?? {})) as JsonObject;
  return {
    ...details,
    uploadSessionId: input.uploadSessionId,
    source: input.source,
  };
}

function normalizeScanDate(
  value: string | Date | null | undefined,
  verdict: UploadScanVerdict,
): Date | null {
  if (value === null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw badRequest('Invalid malware scan timestamp');
    }
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw badRequest('Invalid malware scan timestamp');
    }
    return parsed;
  }
  return verdict === 'PENDING' ? null : new Date();
}

function mediaStatusForScanVerdict(
  verdict: UploadScanVerdict,
): 'QUARANTINED' | 'UPLOADED_UNSCANNED' {
  if (verdict === 'INFECTED') {
    return 'QUARANTINED';
  }
  return 'UPLOADED_UNSCANNED';
}

const TERMINAL_UPLOAD_SCAN_ERROR_CODES = new Set([
  'DECLARED_SIZE_EXCEEDS_SCAN_LIMIT',
  'FILE_CONTENT_INVALID',
  'FILE_TYPE_MISMATCH',
  'FILE_TYPE_UNSUPPORTED',
  'OBJECT_EXCEEDS_SCAN_LIMIT',
  'OBJECT_SIZE_MISMATCH',
  'SCAN_LIMIT_EXCEEDED',
]);

export function shouldRejectUploadScanError(
  errorCode: string | null | undefined,
  attemptNumber: number,
  maxAttempts = env.API_UPLOAD_SCAN_MAX_ATTEMPTS,
): boolean {
  return (
    Boolean(errorCode && TERMINAL_UPLOAD_SCAN_ERROR_CODES.has(errorCode)) ||
    attemptNumber >= maxAttempts
  );
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
    .join(',')}}`;
}

function scanRequestHash(input: {
  uploadSessionId: string;
  mediaObjectId: string;
  sourceResultId?: string;
  scanAttemptId?: string;
  verdict: UploadScanVerdict;
  scanner: string;
  objectSizeBytes?: number;
  objectETag?: string;
  sha256Hex?: string;
  sealedStorageKey?: string;
  scannedAt: string | null;
  detailsJson: JsonObject;
}): string {
  return crypto.createHash('sha256').update(stableJson(input), 'utf8').digest('hex');
}

function scanUploadSessionId(detailsJson: unknown): string | undefined {
  if (!detailsJson || typeof detailsJson !== 'object' || Array.isArray(detailsJson)) {
    return undefined;
  }
  return asString((detailsJson as Record<string, unknown>).uploadSessionId);
}

function assertMatchingScanReplay(
  existing: {
    id: string;
    mediaObjectId: string;
    sourceResultId: string | null;
    scanAttemptId: string | null;
    verdict: UploadScanVerdict;
    scanner: string | null;
    objectSizeBytes: bigint | number | null;
    objectETag: string | null;
    sha256Hex: string | null;
    sealedStorageKey: string | null;
    requestHash: string | null;
    detailsJson: unknown;
    scannedAt: Date | string | null;
  },
  input: UploadScanResultInput,
  requestHash: string,
): UploadScanResultRecord {
  if (
    existing.mediaObjectId !== input.mediaObjectId ||
    existing.verdict !== input.verdict ||
    existing.scanner !== input.scanner ||
    scanUploadSessionId(existing.detailsJson) !== input.uploadSessionId ||
    existing.requestHash !== requestHash
  ) {
    throw conflict('Scanner result id has already been used with a different payload', {
      sourceResultId: input.sourceResultId,
    });
  }

  return {
    id: existing.id,
    uploadSessionId: input.uploadSessionId,
    mediaObjectId: existing.mediaObjectId,
    sourceResultId: existing.sourceResultId,
    scanAttemptId: existing.scanAttemptId,
    verdict: existing.verdict,
    scanner: existing.scanner as string,
    objectSizeBytes:
      typeof existing.objectSizeBytes === 'bigint'
        ? Number(existing.objectSizeBytes)
        : existing.objectSizeBytes,
    objectETag: existing.objectETag,
    sha256Hex: existing.sha256Hex,
    sealedStorageKey: existing.sealedStorageKey,
    scannedAt:
      existing.scannedAt instanceof Date ? existing.scannedAt.toISOString() : existing.scannedAt,
    replayed: true,
  };
}

async function persistDbUploadInit(
  input: UploadInitInput,
  uploadSessionId: string,
  mediaObjectId: string,
  storageKey: string,
  bucketName: string,
  expiresAt: Date,
  cleanupDueAt: Date,
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
      scanClaimedAt: null,
      scanClaimedBy: null,
      activeScanAttemptId: null,
      scanLeaseExpiresAt: null,
      scanAttemptCount: 0,
      scanNextAttemptAt: null,
      scanLastError: null,
      cleanScanResultId: null,
      stagingStorageKey: storageKey,
      stagingCleanupDueAt: cleanupDueAt.toISOString(),
      stagingCleanupClaimedAt: null,
      stagingCleanupClaimedBy: null,
      stagingCleanupLeaseExpiresAt: null,
      stagingCleanupCompletedAt: null,
      stagingCleanupNextAttemptAt: null,
      stagingCleanupLastError: null,
      metadataJson,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    asRows(store.tables.malwareScanResults).push({
      id: newId('msr'),
      uploadSessionId,
      mediaObjectId,
      sourceResultId: null,
      scanAttemptId: null,
      verdict: 'PENDING',
      status: 'PENDING',
      scanner: 'upload-init',
      engine: 'upload-init',
      detailsJson: scanDetailsJson({ uploadSessionId, source: 'upload-init' }),
      objectSizeBytes: null,
      objectETag: null,
      sha256Hex: null,
      sealedStorageKey: null,
      requestHash: null,
      scannedAt: null,
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
        stagingStorageKey: storageKey,
        stagingCleanupDueAt: cleanupDueAt,
        metadataJson,
      },
    });

    await tx.malwareScanResult.create({
      data: {
        id: newId('msr'),
        uploadSessionId,
        mediaObjectId,
        verdict: 'PENDING',
        scanner: 'upload-init',
        detailsJson: scanDetailsJson({ uploadSessionId, source: 'upload-init' }),
        scannedAt: null,
      },
    });
  });
}

export async function recordUploadMalwareScanResult(
  input: UploadScanResultInput,
): Promise<UploadScanResultRecord> {
  if (getApiDataBackend() !== 'db') {
    throw serviceUnavailable('Db-backed upload runtime is disabled', {
      apiDataBackend: getApiDataBackend(),
      action: 'Set API_DATA_BACKEND=db before recording upload scan results.',
    });
  }
  if (input.verdict === 'PENDING') {
    throw badRequest('PENDING scan results are created by upload initialization only');
  }
  if (input.requireActiveAttempt && (!input.sourceResultId || !input.scanAttemptId)) {
    throw badRequest('Scanner callbacks require sourceResultId and scanAttemptId');
  }
  if (
    input.requireActiveAttempt &&
    input.verdict !== 'ERROR' &&
    (input.objectSizeBytes == null || !input.objectETag || !input.sha256Hex)
  ) {
    throw badRequest('Completed scanner verdicts require object size, ETag, and SHA-256 proof');
  }
  if (input.requireActiveAttempt && input.verdict === 'CLEAN' && !input.sealedStorageKey) {
    throw badRequest('Clean scanner verdicts require a server-sealed storage key');
  }
  if (input.verdict !== 'CLEAN' && input.sealedStorageKey) {
    throw badRequest('Only clean scanner verdicts may include a sealed storage key');
  }
  if (!input.requireActiveAttempt && input.verdict === 'CLEAN') {
    throw forbidden('Only the active scanner worker may record a CLEAN verdict');
  }

  const scannedAt = normalizeScanDate(input.scannedAt, input.verdict);
  const scannedAtIso = scannedAt?.toISOString() ?? null;
  const scanId = newId('msr');
  const normalizedSha256 = normalizeSha256(input.sha256Hex);
  const detailsJson = scanDetailsJson({
    uploadSessionId: input.uploadSessionId,
    source: 'scan-result',
    details: input.details,
  });
  const requestHash = scanRequestHash({
    uploadSessionId: input.uploadSessionId,
    mediaObjectId: input.mediaObjectId,
    sourceResultId: input.sourceResultId,
    scanAttemptId: input.scanAttemptId,
    verdict: input.verdict,
    scanner: input.scanner,
    objectSizeBytes: input.objectSizeBytes,
    objectETag: input.objectETag,
    sha256Hex: normalizedSha256,
    sealedStorageKey: input.sealedStorageKey,
    scannedAt: scannedAtIso,
    detailsJson,
  });

  if (shouldUseDbFixtureFallback()) {
    const store = getDbFixtureStore();
    const existingResult = input.sourceResultId
      ? asRows(store.tables.malwareScanResults).find(
          (row) => asString(row.sourceResultId) === input.sourceResultId,
        )
      : undefined;
    if (existingResult) {
      return assertMatchingScanReplay(
        {
          id: asString(existingResult.id) as string,
          mediaObjectId: asString(existingResult.mediaObjectId) as string,
          sourceResultId: asString(existingResult.sourceResultId) ?? null,
          scanAttemptId: asString(existingResult.scanAttemptId) ?? null,
          verdict: asString(existingResult.verdict) as UploadScanVerdict,
          scanner: asString(existingResult.scanner) ?? null,
          objectSizeBytes:
            typeof existingResult.objectSizeBytes === 'number'
              ? existingResult.objectSizeBytes
              : null,
          objectETag: asString(existingResult.objectETag) ?? null,
          sha256Hex: asString(existingResult.sha256Hex) ?? null,
          sealedStorageKey: asString(existingResult.sealedStorageKey) ?? null,
          requestHash: asString(existingResult.requestHash) ?? null,
          detailsJson: existingResult.detailsJson,
          scannedAt: asString(existingResult.scannedAt) ?? null,
        },
        input,
        requestHash,
      );
    }
    const uploadSession = asRows(store.tables.uploadSessions).find(
      (row) =>
        asString(row.id) === input.uploadSessionId &&
        asString(row.mediaObjectId) === input.mediaObjectId,
    );
    if (!uploadSession) {
      throw notFound('Upload session not found', {
        uploadSessionId: input.uploadSessionId,
        mediaObjectId: input.mediaObjectId,
      });
    }
    const mediaObject = asRows(store.tables.mediaObjects).find(
      (row) => asString(row.id) === input.mediaObjectId,
    );
    if (!mediaObject || asString(mediaObject.deletedAt)) {
      throw notFound('Upload session not found', {
        uploadSessionId: input.uploadSessionId,
        mediaObjectId: input.mediaObjectId,
      });
    }
    if (asString(uploadSession.status) === 'COMPLETED') {
      throw conflict('Completed uploads cannot accept additional scan results', {
        uploadSessionId: input.uploadSessionId,
      });
    }
    if (input.requireActiveAttempt) {
      const leaseExpiresAt = Date.parse(asString(uploadSession.scanLeaseExpiresAt) ?? '');
      if (
        asString(uploadSession.activeScanAttemptId) !== input.scanAttemptId ||
        !Number.isFinite(leaseExpiresAt) ||
        leaseExpiresAt <= Date.now()
      ) {
        throw conflict('Scanner callback does not own the active upload scan lease', {
          uploadSessionId: input.uploadSessionId,
          scanAttemptId: input.scanAttemptId,
        });
      }
      if (
        input.objectSizeBytes != null &&
        input.objectSizeBytes !== Number(mediaObject.sizeBytes)
      ) {
        throw badRequest('Scanner object size does not match the upload declaration');
      }
      if (
        input.verdict === 'CLEAN' &&
        input.sealedStorageKey !==
          buildSealedStorageKey(asString(mediaObject.storageKey) ?? '', normalizedSha256 as string)
      ) {
        throw badRequest('Scanner sealed storage key does not match the upload proof');
      }
    }

    asRows(store.tables.malwareScanResults).push({
      id: scanId,
      uploadSessionId: input.uploadSessionId,
      mediaObjectId: input.mediaObjectId,
      sourceResultId: input.sourceResultId ?? null,
      scanAttemptId: input.scanAttemptId ?? null,
      verdict: input.verdict,
      status: input.verdict,
      scanner: input.scanner,
      engine: input.scanner,
      objectSizeBytes: input.objectSizeBytes ?? null,
      objectETag: input.objectETag ?? null,
      sha256Hex: normalizedSha256 ?? null,
      sealedStorageKey: input.sealedStorageKey ?? null,
      requestHash,
      detailsJson,
      scannedAt: scannedAtIso,
      createdAt: scannedAtIso ?? nowIso(),
      updatedAt: nowIso(),
    });

    const errorCode =
      input.verdict === 'ERROR' ? (asString(input.details?.errorCode) ?? 'SCAN_ERROR') : null;
    const terminalError =
      input.verdict === 'ERROR' &&
      shouldRejectUploadScanError(errorCode, Number(uploadSession.scanAttemptCount ?? 0));
    const nextStatus = terminalError ? 'REJECTED' : mediaStatusForScanVerdict(input.verdict);
    mediaObject.status = nextStatus;
    if (input.verdict === 'CLEAN') {
      mediaObject.storageKey = input.sealedStorageKey;
    }
    mediaObject.updatedByUserId = input.recordedByUserId ?? asString(mediaObject.updatedByUserId);
    mediaObject.updatedAt = nowIso();
    mediaObject.version = nextVersion(mediaObject.version);
    uploadSession.status =
      input.verdict === 'CLEAN'
        ? 'SCAN_CLEAN'
        : input.verdict === 'INFECTED'
          ? 'REJECTED'
          : terminalError
            ? 'REJECTED'
            : 'SCAN_RETRY';
    uploadSession.cleanScanResultId = input.verdict === 'CLEAN' ? scanId : null;
    uploadSession.scanClaimedAt = null;
    uploadSession.scanClaimedBy = null;
    uploadSession.activeScanAttemptId = null;
    uploadSession.scanLeaseExpiresAt = null;
    uploadSession.scanNextAttemptAt =
      input.verdict === 'ERROR' && !terminalError
        ? new Date(Date.now() + 30_000).toISOString()
        : null;
    uploadSession.scanLastError = errorCode;
    uploadSession.updatedAt = nowIso();

    return {
      id: scanId,
      uploadSessionId: input.uploadSessionId,
      mediaObjectId: input.mediaObjectId,
      sourceResultId: input.sourceResultId ?? null,
      scanAttemptId: input.scanAttemptId ?? null,
      verdict: input.verdict,
      scanner: input.scanner,
      objectSizeBytes: input.objectSizeBytes ?? null,
      objectETag: input.objectETag ?? null,
      sha256Hex: normalizedSha256 ?? null,
      sealedStorageKey: input.sealedStorageKey ?? null,
      scannedAt: scannedAtIso,
      replayed: false,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const findExistingResult = async () =>
    input.sourceResultId
      ? prisma.malwareScanResult.findUnique({
          where: { sourceResultId: input.sourceResultId },
          select: {
            id: true,
            mediaObjectId: true,
            sourceResultId: true,
            scanAttemptId: true,
            verdict: true,
            scanner: true,
            objectSizeBytes: true,
            objectETag: true,
            sha256Hex: true,
            sealedStorageKey: true,
            requestHash: true,
            detailsJson: true,
            scannedAt: true,
          },
        })
      : null;
  const existingResult = await findExistingResult();
  if (existingResult) {
    return assertMatchingScanReplay(existingResult, input, requestHash);
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "UploadSession" WHERE "id" = ${input.uploadSessionId} FOR UPDATE`,
        );
        const uploadSession = await tx.uploadSession.findFirst({
          where: {
            id: input.uploadSessionId,
            mediaObjectId: input.mediaObjectId,
          },
          select: {
            id: true,
            status: true,
            activeScanAttemptId: true,
            scanLeaseExpiresAt: true,
            scanAttemptCount: true,
            mediaObject: {
              select: {
                id: true,
                deletedAt: true,
                status: true,
                sizeBytes: true,
                storageKey: true,
                updatedByUserId: true,
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
        if (uploadSession.status === 'COMPLETED') {
          throw conflict('Completed uploads cannot accept additional scan results', {
            uploadSessionId: input.uploadSessionId,
          });
        }
        if (input.requireActiveAttempt) {
          if (
            uploadSession.activeScanAttemptId !== input.scanAttemptId ||
            !uploadSession.scanLeaseExpiresAt ||
            uploadSession.scanLeaseExpiresAt.getTime() <= Date.now()
          ) {
            throw conflict('Scanner callback does not own the active upload scan lease', {
              uploadSessionId: input.uploadSessionId,
              scanAttemptId: input.scanAttemptId,
            });
          }
          if (
            input.objectSizeBytes != null &&
            BigInt(input.objectSizeBytes) !== uploadSession.mediaObject.sizeBytes
          ) {
            throw badRequest('Scanner object size does not match the upload declaration');
          }
          if (
            input.verdict === 'CLEAN' &&
            input.sealedStorageKey !==
              buildSealedStorageKey(
                uploadSession.mediaObject.storageKey,
                normalizedSha256 as string,
              )
          ) {
            throw badRequest('Scanner sealed storage key does not match the upload proof');
          }
        }

        await tx.malwareScanResult.create({
          data: {
            id: scanId,
            uploadSessionId: input.uploadSessionId,
            mediaObjectId: input.mediaObjectId,
            sourceResultId: input.sourceResultId,
            scanAttemptId: input.scanAttemptId,
            verdict: input.verdict,
            scanner: input.scanner,
            objectSizeBytes: input.objectSizeBytes == null ? null : BigInt(input.objectSizeBytes),
            objectETag: input.objectETag,
            sha256Hex: normalizedSha256,
            sealedStorageKey: input.sealedStorageKey,
            requestHash,
            detailsJson,
            scannedAt,
          },
        });

        const errorCode =
          input.verdict === 'ERROR' ? (asString(input.details?.errorCode) ?? 'SCAN_ERROR') : null;
        const terminalError =
          input.verdict === 'ERROR' &&
          shouldRejectUploadScanError(errorCode, uploadSession.scanAttemptCount);
        const nextMediaStatus = terminalError
          ? 'REJECTED'
          : mediaStatusForScanVerdict(input.verdict);
        await tx.mediaObject.update({
          where: { id: input.mediaObjectId },
          data: {
            status: nextMediaStatus,
            ...(input.verdict === 'CLEAN' ? { storageKey: input.sealedStorageKey } : {}),
            updatedByUserId: input.recordedByUserId ?? uploadSession.mediaObject.updatedByUserId,
            version: { increment: 1n },
          },
        });
        const retryDelayMs = Math.min(
          5 * 60_000,
          5_000 * 2 ** Math.min(Math.max(uploadSession.scanAttemptCount - 1, 0), 6),
        );
        await tx.uploadSession.update({
          where: { id: input.uploadSessionId },
          data: {
            status:
              input.verdict === 'CLEAN'
                ? 'SCAN_CLEAN'
                : input.verdict === 'INFECTED'
                  ? 'REJECTED'
                  : terminalError
                    ? 'REJECTED'
                    : 'SCAN_RETRY',
            cleanScanResultId: input.verdict === 'CLEAN' ? scanId : null,
            scanClaimedAt: null,
            scanClaimedBy: null,
            activeScanAttemptId: null,
            scanLeaseExpiresAt: null,
            scanNextAttemptAt:
              input.verdict === 'ERROR' && !terminalError
                ? new Date(Date.now() + retryDelayMs)
                : null,
            scanLastError: errorCode,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      },
    );
  } catch (error) {
    if (existingResult) {
      return assertMatchingScanReplay(existingResult, input, requestHash);
    }
    if (input.sourceResultId) {
      const racedResult = await findExistingResult();
      if (racedResult) {
        return assertMatchingScanReplay(racedResult, input, requestHash);
      }
    }
    throw error;
  }

  return {
    id: scanId,
    uploadSessionId: input.uploadSessionId,
    mediaObjectId: input.mediaObjectId,
    sourceResultId: input.sourceResultId ?? null,
    scanAttemptId: input.scanAttemptId ?? null,
    verdict: input.verdict,
    scanner: input.scanner,
    objectSizeBytes: input.objectSizeBytes ?? null,
    objectETag: input.objectETag ?? null,
    sha256Hex: normalizedSha256 ?? null,
    sealedStorageKey: input.sealedStorageKey ?? null,
    scannedAt: scannedAtIso,
    replayed: false,
  };
}

export async function createUploadInit(input: UploadInitInput): Promise<UploadInitResult> {
  if (getApiDataBackend() !== 'db') {
    throw serviceUnavailable('Db-backed upload runtime is disabled', {
      apiDataBackend: getApiDataBackend(),
      action: 'Set API_DATA_BACKEND=db before using signed upload initialization.',
    });
  }

  let contentType: string;
  try {
    contentType = assertUploadDeclaration(input);
  } catch (error) {
    if (error instanceof UploadFilePolicyError) {
      throw badRequest(error.message, { errorCode: error.code });
    }
    throw error;
  }
  const normalizedInput = { ...input, contentType };
  const storage = getRequiredStorageEnv();
  if (!shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    if (!(await isUploadScannerReady({ prisma }))) {
      throw serviceUnavailable('Media uploads are temporarily unavailable', {
        errorCode: 'UPLOAD_SCANNER_UNAVAILABLE',
        action: 'Start a healthy upload scanner worker before accepting private uploads.',
      });
    }
  }
  const expiresAt = new Date(Date.now() + FIFTEEN_MINUTES_SECONDS * 1000);
  const cleanupDueAt = new Date(
    expiresAt.getTime() + env.API_UPLOAD_STAGING_CLEANUP_GRACE_MS,
  );
  const uploadSessionId = newId('ups');
  const mediaObjectId = newId('med');
  const storageKey = buildStorageKey(
    normalizedInput.requesterUserId,
    uploadSessionId,
    normalizedInput.fileName,
  );

  await persistDbUploadInit(
    normalizedInput,
    uploadSessionId,
    mediaObjectId,
    storageKey,
    storage.bucketName,
    expiresAt,
    cleanupDueAt,
  );

  const { uploadUrl, uploadHeaders } = createPresignedUploadUrl({
    endpoint: storage.endpoint,
    bucketName: storage.bucketName,
    region: storage.region,
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
    storageKey,
    contentType: normalizedInput.contentType,
    contentLength: normalizedInput.sizeBytes,
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

function normalizeSha256(value: string | undefined): string | undefined {
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

  const expiresAt = Date.parse(
    asString(uploadSession.uploadUrlExpiresAt) ?? asString(uploadSession.expiresAt) ?? '',
  );
  if (
    asString(uploadSession.status) === 'INITIATED' &&
    Number.isFinite(expiresAt) &&
    expiresAt < Date.now()
  ) {
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

function latestStoreScanForMedia(
  tables: Record<string, SeedRow[]>,
  mediaObjectId: string,
): SeedRow | undefined {
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

function normalizeScanVerdict(scan: SeedRow | undefined): string | undefined {
  if (!scan) {
    return undefined;
  }
  return String(scan.verdict ?? scan.status ?? '').toUpperCase();
}

function getStoreUploadStatus(input: {
  requesterUserId: string;
  uploadSessionId: string;
}): UploadStatusResult {
  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  const uploadSession = asRows(store.tables.uploadSessions).find(
    (row) => asString(row.id) === input.uploadSessionId,
  );
  if (!uploadSession) {
    throw notFound('Upload session not found', { uploadSessionId: input.uploadSessionId });
  }
  const requesterUserId =
    asString(uploadSession.requesterUserId) ?? asString(uploadSession.ownerUserId);
  if (requesterUserId !== input.requesterUserId) {
    throw forbidden('Upload session does not belong to authenticated user', {
      uploadSessionId: input.uploadSessionId,
    });
  }

  const mediaObjectId = asString(uploadSession.mediaObjectId);
  const mediaObject = asRows(store.tables.mediaObjects).find(
    (row) => asString(row.id) === mediaObjectId,
  );
  if (!mediaObjectId || !mediaObject || asString(mediaObject.deletedAt)) {
    throw notFound('Upload media object not found', {
      uploadSessionId: input.uploadSessionId,
    });
  }
  if (asString(mediaObject.ownerUserId) !== input.requesterUserId) {
    throw forbidden('Media object does not belong to authenticated user', { mediaObjectId });
  }

  const uploadStatus = asString(uploadSession.status) ?? 'UNKNOWN';
  const mediaStatus = asString(mediaObject.status) ?? 'UNKNOWN';
  const latestScan = latestStoreScanForMedia(store.tables, mediaObjectId);
  const latestVerdict = normalizeScanVerdict(latestScan);
  const scanVerdict: UploadScanVerdict =
    latestVerdict === 'CLEAN' ||
    latestVerdict === 'INFECTED' ||
    latestVerdict === 'ERROR'
      ? latestVerdict
      : 'PENDING';
  const completed = uploadStatus === 'COMPLETED' && mediaStatus === 'AVAILABLE';
  const readyToComplete = uploadStatus === 'SCAN_CLEAN' && scanVerdict === 'CLEAN';
  const terminalFailure =
    uploadStatus === 'REJECTED' ||
    ['QUARANTINED', 'REJECTED', 'DELETED'].includes(mediaStatus) ||
    scanVerdict === 'INFECTED';

  return {
    uploadSessionId: input.uploadSessionId,
    mediaObjectId,
    uploadStatus,
    mediaStatus,
    scanVerdict: completed ? 'CLEAN' : scanVerdict,
    scanner: asString(latestScan?.scanner) ?? asString(latestScan?.engine) ?? null,
    scannedAt: asString(latestScan?.scannedAt) ?? null,
    pending: !completed && !readyToComplete && !terminalFailure,
    readyToComplete,
    retryAfterMs: !completed && !readyToComplete && !terminalFailure ? 5000 : null,
    errorCode:
      asString(uploadSession.scanLastError) ??
      (scanVerdict === 'INFECTED' ? 'MALWARE_DETECTED' : null),
    dataVersion: store.version,
  };
}

async function getPrismaUploadStatus(input: {
  requesterUserId: string;
  uploadSessionId: string;
}): Promise<UploadStatusResult> {
  const prisma = getPrismaClientOrThrow();
  const uploadSession = await prisma.uploadSession.findUnique({
    where: { id: input.uploadSessionId },
    include: {
      cleanScanResult: {
        select: {
          uploadSessionId: true,
          mediaObjectId: true,
          verdict: true,
        },
      },
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
              verdict: true,
              scanner: true,
              scannedAt: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
  if (!uploadSession || !uploadSession.mediaObject || uploadSession.mediaObject.deletedAt) {
    throw notFound('Upload session not found', { uploadSessionId: input.uploadSessionId });
  }
  if (uploadSession.requesterUserId !== input.requesterUserId) {
    throw forbidden('Upload session does not belong to authenticated user', {
      uploadSessionId: input.uploadSessionId,
    });
  }
  if (uploadSession.mediaObject.ownerUserId !== input.requesterUserId) {
    throw forbidden('Media object does not belong to authenticated user', {
      mediaObjectId: uploadSession.mediaObject.id,
    });
  }

  const latestScan = uploadSession.mediaObject.scans[0];
  const completed =
    uploadSession.status === 'COMPLETED' && uploadSession.mediaObject.status === 'AVAILABLE';
  const readyToComplete =
    uploadSession.status === 'SCAN_CLEAN' &&
    uploadSession.cleanScanResult?.verdict === 'CLEAN' &&
    uploadSession.cleanScanResult.uploadSessionId === uploadSession.id &&
    uploadSession.cleanScanResult.mediaObjectId === uploadSession.mediaObject.id;
  if (
    (uploadSession.status === 'COMPLETED' && !completed) ||
    (uploadSession.status === 'SCAN_CLEAN' && !readyToComplete)
  ) {
    throw conflict('Upload scan authority is inconsistent', {
      uploadSessionId: uploadSession.id,
      mediaObjectId: uploadSession.mediaObject.id,
    });
  }
  const scanVerdict: UploadScanVerdict = completed
    ? 'CLEAN'
    : (latestScan?.verdict ?? 'PENDING');
  const terminalFailure =
    uploadSession.status === 'REJECTED' ||
    ['QUARANTINED', 'REJECTED', 'DELETED'].includes(uploadSession.mediaObject.status) ||
    scanVerdict === 'INFECTED';

  return {
    uploadSessionId: uploadSession.id,
    mediaObjectId: uploadSession.mediaObject.id,
    uploadStatus: uploadSession.status,
    mediaStatus: uploadSession.mediaObject.status,
    scanVerdict,
    scanner: latestScan?.scanner ?? null,
    scannedAt: (latestScan?.scannedAt ?? latestScan?.createdAt)?.toISOString() ?? null,
    pending: !completed && !readyToComplete && !terminalFailure,
    readyToComplete,
    retryAfterMs: !completed && !readyToComplete && !terminalFailure ? 5000 : null,
    errorCode:
      uploadSession.scanLastError ?? (scanVerdict === 'INFECTED' ? 'MALWARE_DETECTED' : null),
    dataVersion: null,
  };
}

export async function getUploadSessionStatus(input: {
  requesterUserId: string;
  uploadSessionId: string;
}): Promise<UploadStatusResult> {
  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    return getStoreUploadStatus(input);
  }
  return getPrismaUploadStatus(input);
}

function completeStoreUpload(input: UploadCompleteInput): UploadCompleteResult {
  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  const activeTables = store.tables;
  const uploadSessions = asRows(activeTables.uploadSessions);
  const mediaObjects = asRows(activeTables.mediaObjects);
  const uploadSession = uploadSessions.find(
    (row) =>
      asString(row.id) === input.uploadSessionId &&
      asString(row.mediaObjectId) === input.mediaObjectId,
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
    throw forbidden('Media object does not belong to authenticated user', {
      mediaObjectId: input.mediaObjectId,
    });
  }

  assertUploadStillValid(uploadSession, mediaObject);

  const cleanScan = asRows(activeTables.malwareScanResults).find(
    (row) =>
      asString(row.id) === asString(uploadSession.cleanScanResultId) &&
      asString(row.uploadSessionId) === input.uploadSessionId &&
      asString(row.mediaObjectId) === input.mediaObjectId,
  );
  if (
    asString(uploadSession.status) !== 'SCAN_CLEAN' ||
    normalizeScanVerdict(cleanScan) !== 'CLEAN'
  ) {
    const latestScan = latestStoreScanForMedia(activeTables, input.mediaObjectId);
    const latestVerdict = normalizeScanVerdict(latestScan);
    if (asString(uploadSession.status) === 'INITIATED') {
      uploadSession.status = 'UPLOADED';
    }
    uploadSession.updatedAt = nowIso();
    if (asString(mediaObject.status) === 'PENDING_UPLOAD') {
      mediaObject.status = 'UPLOADED_UNSCANNED';
      mediaObject.updatedByUserId = input.requesterUserId;
      mediaObject.updatedAt = nowIso();
      mediaObject.version = nextVersion(mediaObject.version);
    }
    return {
      uploadSessionId: input.uploadSessionId,
      mediaObjectId: input.mediaObjectId,
      mediaStatus: 'UPLOADED_UNSCANNED',
      scanVerdict: latestVerdict === 'ERROR' ? 'ERROR' : 'PENDING',
      scanner: asString(latestScan?.scanner) ?? null,
      scannedAt: asString(latestScan?.scannedAt) ?? null,
      pending: true,
      retryAfterMs: 5000,
      dataVersion: store.version,
    };
  }

  const checksum = normalizeSha256(input.sha256Hex);
  const scannerChecksum = asString(cleanScan?.sha256Hex);
  const sealedStorageKey = asString(cleanScan?.sealedStorageKey);
  const scannerSize = cleanScan?.objectSizeBytes;
  if (
    !scannerChecksum ||
    !sealedStorageKey ||
    sealedStorageKey !== asString(mediaObject.storageKey) ||
    typeof scannerSize !== 'number' ||
    scannerSize !== Number(mediaObject.sizeBytes)
  ) {
    throw badRequest('Clean scan proof is missing exact object integrity data');
  }
  if (checksum !== undefined && checksum !== scannerChecksum) {
    throw badRequest('Upload checksum does not match scanner-verified bytes');
  }
  const now = nowIso();
  uploadSession.status = 'COMPLETED';
  uploadSession.completedAt = asString(uploadSession.completedAt) ?? now;
  uploadSession.updatedAt = now;

  mediaObject.sha256Hex = scannerChecksum;
  mediaObject.status = 'AVAILABLE';
  mediaObject.updatedByUserId = input.requesterUserId;
  mediaObject.updatedAt = now;
  mediaObject.version = nextVersion(mediaObject.version);

  return {
    uploadSessionId: input.uploadSessionId,
    mediaObjectId: input.mediaObjectId,
    mediaStatus: 'AVAILABLE',
    scanVerdict: 'CLEAN',
    scanner: asString(cleanScan?.scanner) ?? asString(cleanScan?.engine) ?? 'unknown',
    scannedAt: asString(cleanScan?.scannedAt) ?? asString(cleanScan?.createdAt) ?? now,
    pending: false,
    retryAfterMs: null,
    dataVersion: store.version,
  };
}

async function completePrismaUpload(input: UploadCompleteInput): Promise<UploadCompleteResult> {
  const prisma = getPrismaClientOrThrow();
  const checksum = normalizeSha256(input.sha256Hex);
  const now = new Date();
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "UploadSession" WHERE "id" = ${input.uploadSessionId} FOR UPDATE`,
      );
      const uploadSession = await tx.uploadSession.findFirst({
        where: {
          id: input.uploadSessionId,
          mediaObjectId: input.mediaObjectId,
        },
        include: {
          cleanScanResult: {
            select: {
              id: true,
              uploadSessionId: true,
              mediaObjectId: true,
              verdict: true,
              scanner: true,
              objectSizeBytes: true,
              sha256Hex: true,
              sealedStorageKey: true,
              scannedAt: true,
              createdAt: true,
            },
          },
          mediaObject: {
            select: {
              id: true,
              ownerUserId: true,
              status: true,
              sizeBytes: true,
              storageKey: true,
              deletedAt: true,
              scans: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  verdict: true,
                  scanner: true,
                  scannedAt: true,
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
      if (
        uploadSession.status === 'INITIATED' &&
        mediaStatus !== 'AVAILABLE' &&
        uploadSession.uploadUrlExpiresAt.getTime() < Date.now()
      ) {
        throw badRequest('Upload session has expired', {
          uploadSessionId: input.uploadSessionId,
          mediaObjectId: input.mediaObjectId,
        });
      }
      if (
        mediaStatus === 'QUARANTINED' ||
        mediaStatus === 'REJECTED' ||
        mediaStatus === 'DELETED'
      ) {
        throw badRequest('Upload cannot be finalized because the media object is not usable', {
          uploadSessionId: input.uploadSessionId,
          mediaObjectId: input.mediaObjectId,
          mediaStatus,
        });
      }
      if (uploadSession.status === 'COMPLETED' && mediaStatus === 'AVAILABLE') {
        const completedScan = uploadSession.cleanScanResult;
        if (
          !completedScan ||
          completedScan.verdict !== 'CLEAN' ||
          !completedScan.sealedStorageKey ||
          completedScan.sealedStorageKey !== uploadSession.mediaObject.storageKey
        ) {
          throw conflict('Completed upload is missing its clean scan authority');
        }
        return {
          uploadSessionId: input.uploadSessionId,
          mediaObjectId: input.mediaObjectId,
          mediaStatus: 'AVAILABLE',
          scanVerdict: 'CLEAN',
          scanner: completedScan.scanner,
          scannedAt: (completedScan.scannedAt ?? completedScan.createdAt).toISOString(),
          pending: false,
          retryAfterMs: null,
          dataVersion: null,
        };
      }
      const cleanScan = uploadSession.cleanScanResult;
      if (
        uploadSession.status !== 'SCAN_CLEAN' ||
        !cleanScan ||
        cleanScan.uploadSessionId !== input.uploadSessionId ||
        cleanScan.mediaObjectId !== input.mediaObjectId ||
        cleanScan.verdict !== 'CLEAN'
      ) {
        if (uploadSession.status === 'INITIATED') {
          await tx.uploadSession.update({
            where: { id: input.uploadSessionId },
            data: {
              status: 'UPLOADED',
              scanNextAttemptAt: null,
            },
          });
        }
        if (mediaStatus === 'PENDING_UPLOAD') {
          await tx.mediaObject.update({
            where: { id: input.mediaObjectId },
            data: {
              status: 'UPLOADED_UNSCANNED',
              updatedByUserId: input.requesterUserId,
              version: { increment: 1n },
            },
          });
        }
        const latestScan = uploadSession.mediaObject.scans[0];
        return {
          uploadSessionId: input.uploadSessionId,
          mediaObjectId: input.mediaObjectId,
          mediaStatus: 'UPLOADED_UNSCANNED',
          scanVerdict: latestScan?.verdict === 'ERROR' ? 'ERROR' : 'PENDING',
          scanner: latestScan?.scanner ?? null,
          scannedAt: latestScan?.scannedAt?.toISOString() ?? null,
          pending: true,
          retryAfterMs: 5000,
          dataVersion: null,
        };
      }
      if (
        !cleanScan.sha256Hex ||
        !cleanScan.sealedStorageKey ||
        cleanScan.sealedStorageKey !== uploadSession.mediaObject.storageKey ||
        cleanScan.objectSizeBytes == null ||
        cleanScan.objectSizeBytes !== uploadSession.mediaObject.sizeBytes
      ) {
        throw badRequest('Clean scan proof is missing exact object integrity data');
      }
      if (checksum !== undefined && checksum !== cleanScan.sha256Hex) {
        throw badRequest('Upload checksum does not match scanner-verified bytes');
      }

      await tx.uploadSession.update({
        where: { id: input.uploadSessionId },
        data: {
          status: 'COMPLETED',
          completedAt: uploadSession.completedAt ?? now,
        },
      });

      await tx.mediaObject.update({
        where: { id: input.mediaObjectId },
        data: {
          status: 'AVAILABLE',
          sha256Hex: cleanScan.sha256Hex,
          updatedByUserId: input.requesterUserId,
          version: { increment: 1n },
        },
      });
      return {
        uploadSessionId: input.uploadSessionId,
        mediaObjectId: input.mediaObjectId,
        mediaStatus: 'AVAILABLE',
        scanVerdict: 'CLEAN',
        scanner: cleanScan.scanner,
        scannedAt: (cleanScan.scannedAt ?? cleanScan.createdAt ?? now).toISOString(),
        pending: false,
        retryAfterMs: null,
        dataVersion: null,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
}

export async function completeUploadSession(
  input: UploadCompleteInput,
): Promise<UploadCompleteResult> {
  if (getApiDataBackend() !== 'db') {
    return completeStoreUpload(input);
  }

  if (shouldUseDbFixtureFallback()) {
    return completeStoreUpload(input);
  }

  return completePrismaUpload(input);
}

export function createSignedPrivateWriteUrl(input: SignedWriteUrlInput): {
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
} {
  const storage = getRequiredStorageEnv();
  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? 5 * 60) * 1000);
  return createPresignedUploadUrl({
    endpoint: storage.endpoint,
    bucketName: input.bucketName?.trim() || storage.bucketName,
    region: storage.region,
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
    storageKey: input.storageKey,
    contentType: input.contentType,
    contentLength: input.contentLength,
    expiresAt,
  });
}

export function createSignedReadUrl(input: SignedReadUrlInput): SignedReadUrlResult {
  const storage = getRequiredStorageEnv();
  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? 5 * 60) * 1000);

  return createPresignedObjectUrl({
    method: 'GET',
    endpoint: storage.endpoint,
    bucketName: input.bucketName?.trim() || storage.bucketName,
    region: storage.region,
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
    storageKey: input.storageKey,
    expiresAt,
  });
}

export async function deletePrivateStorageObject(input: SignedReadUrlInput): Promise<void> {
  const storage = getRequiredStorageEnv();
  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? 60) * 1000);
  const signed = createPresignedObjectUrl({
    method: 'DELETE',
    endpoint: storage.endpoint,
    bucketName: input.bucketName?.trim() || storage.bucketName,
    region: storage.region,
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
    storageKey: input.storageKey,
    expiresAt,
  });
  const response = await fetch(signed.url, {
    method: 'DELETE',
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok && response.status !== 404) {
    throw serviceUnavailable('Private object storage cleanup failed', {
      status: response.status,
      storageKey: input.storageKey,
    });
  }
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
