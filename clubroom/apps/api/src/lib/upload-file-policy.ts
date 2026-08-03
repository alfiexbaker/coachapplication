import path from 'node:path';
import { open } from 'node:fs/promises';

export type UploadFileKind = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

const MIME_TYPES_BY_KIND: Record<UploadFileKind, ReadonlySet<string>> = {
  IMAGE: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  VIDEO: new Set(['video/mp4', 'video/quicktime', 'video/x-m4v']),
  DOCUMENT: new Set(['application/pdf', 'text/plain']),
};

const EXTENSIONS_BY_MIME_TYPE: Record<string, ReadonlySet<string>> = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/webp': new Set(['.webp']),
  'image/heic': new Set(['.heic', '.heif']),
  'video/mp4': new Set(['.mp4']),
  'video/quicktime': new Set(['.mov']),
  'video/x-m4v': new Set(['.m4v']),
  'application/pdf': new Set(['.pdf']),
  'text/plain': new Set(['.txt']),
};

const ISO_BMFF_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/x-m4v']);
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']);

export class UploadFilePolicyError extends Error {
  readonly code: 'FILE_TYPE_UNSUPPORTED' | 'FILE_TYPE_MISMATCH' | 'FILE_CONTENT_INVALID';

  constructor(
    code: UploadFilePolicyError['code'],
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

function normalizedMimeType(value: string): string {
  return value.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

export function assertUploadDeclaration(input: {
  kind: UploadFileKind;
  contentType: string;
  fileName: string;
}): string {
  const contentType = normalizedMimeType(input.contentType);
  if (!MIME_TYPES_BY_KIND[input.kind].has(contentType)) {
    throw new UploadFilePolicyError(
      'FILE_TYPE_UNSUPPORTED',
      `${contentType || 'Unknown content type'} is not supported for ${input.kind.toLowerCase()} uploads`,
    );
  }

  const extension = path.extname(input.fileName.split(/[?#]/, 1)[0] ?? '').toLowerCase();
  const allowedExtensions = EXTENSIONS_BY_MIME_TYPE[contentType];
  if (!extension || !allowedExtensions?.has(extension)) {
    throw new UploadFilePolicyError(
      'FILE_TYPE_MISMATCH',
      'Upload filename extension does not match the declared content type',
    );
  }
  return contentType;
}

function startsWith(bytes: Buffer, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function isPlainText(bytes: Buffer): boolean {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return false;
  }
  return !bytes.some(
    (value) => value === 0 || (value < 0x20 && value !== 0x09 && value !== 0x0a && value !== 0x0d),
  );
}

function detectContentType(bytes: Buffer): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (bytes.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
    return HEIC_BRANDS.has(bytes.subarray(8, 12).toString('ascii')) ? 'image/heic' : 'video/iso-bmff';
  }
  if (isPlainText(bytes)) return 'text/plain';
  return null;
}

export async function assertUploadFileContent(input: {
  kind: UploadFileKind;
  contentType: string;
  fileName: string;
  filePath: string;
}): Promise<string> {
  const contentType = assertUploadDeclaration(input);
  const file = await open(input.filePath, 'r');
  try {
    const bytes = Buffer.alloc(8192);
    const { bytesRead } = await file.read(bytes, 0, bytes.length, 0);
    if (bytesRead === 0) {
      throw new UploadFilePolicyError('FILE_CONTENT_INVALID', 'Uploaded file is empty');
    }
    const detected = detectContentType(bytes.subarray(0, bytesRead));
    const matches =
      detected === contentType ||
      (detected === 'video/iso-bmff' && ISO_BMFF_VIDEO_TYPES.has(contentType));
    if (!matches) {
      throw new UploadFilePolicyError(
        'FILE_TYPE_MISMATCH',
        `Uploaded bytes do not match the declared ${contentType} content type`,
      );
    }
    return detected;
  } finally {
    await file.close();
  }
}
