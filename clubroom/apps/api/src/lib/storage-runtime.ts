import crypto from 'node:crypto';
import path from 'node:path';
import { env } from '@clubroom/config';
import { getDbFixtureStore } from './db-fixture-store.js';
import { getApiDataBackend } from './data-backend.js';
import { serviceUnavailable } from './http-errors.js';
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
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

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
