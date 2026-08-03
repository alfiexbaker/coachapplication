import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  UploadFilePolicyError,
  assertUploadDeclaration,
  assertUploadFileContent,
} from '../../lib/upload-file-policy.js';

async function withFile(
  name: string,
  bytes: Buffer,
  run: (filePath: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'clubroom-upload-policy-'));
  try {
    const filePath = path.join(directory, name);
    await writeFile(filePath, bytes, { mode: 0o600 });
    await run(filePath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe('upload file policy', () => {
  it('rejects unsupported declarations and mismatched extensions', () => {
    assert.throws(
      () =>
        assertUploadDeclaration({
          kind: 'DOCUMENT',
          contentType: 'text/html',
          fileName: 'document.html',
        }),
      (error: unknown) =>
        error instanceof UploadFilePolicyError && error.code === 'FILE_TYPE_UNSUPPORTED',
    );
    assert.throws(
      () =>
        assertUploadDeclaration({
          kind: 'IMAGE',
          contentType: 'image/jpeg',
          fileName: 'photo.png',
        }),
      (error: unknown) =>
        error instanceof UploadFilePolicyError && error.code === 'FILE_TYPE_MISMATCH',
    );
  });

  it('accepts matching PDF, text, image, and ISO BMFF bytes', async () => {
    await withFile('proof.pdf', Buffer.from('%PDF-1.7\n'), async (filePath) => {
      assert.equal(
        await assertUploadFileContent({
          kind: 'DOCUMENT',
          contentType: 'application/pdf',
          fileName: 'proof.pdf',
          filePath,
        }),
        'application/pdf',
      );
    });
    await withFile('note.txt', Buffer.from('Clubroom proof\n'), async (filePath) => {
      assert.equal(
        await assertUploadFileContent({
          kind: 'DOCUMENT',
          contentType: 'text/plain',
          fileName: 'note.txt',
          filePath,
        }),
        'text/plain',
      );
    });
    await withFile(
      'photo.png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      async (filePath) => {
        assert.equal(
          await assertUploadFileContent({
            kind: 'IMAGE',
            contentType: 'image/png',
            fileName: 'photo.png',
            filePath,
          }),
          'image/png',
        );
      },
    );
    await withFile(
      'clip.mp4',
      Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]),
      async (filePath) => {
        assert.equal(
          await assertUploadFileContent({
            kind: 'VIDEO',
            contentType: 'video/mp4',
            fileName: 'clip.mp4',
            filePath,
          }),
          'video/iso-bmff',
        );
      },
    );
  });

  it('rejects executable or malformed bytes despite a safe declaration', async () => {
    await withFile('proof.pdf', Buffer.from('MZ\x00\x02'), async (filePath) => {
      await assert.rejects(
        assertUploadFileContent({
          kind: 'DOCUMENT',
          contentType: 'application/pdf',
          fileName: 'proof.pdf',
          filePath,
        }),
        (error: unknown) =>
          error instanceof UploadFilePolicyError && error.code === 'FILE_TYPE_MISMATCH',
      );
    });
  });
});
