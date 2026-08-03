import { badRequest } from '../../lib/http-errors.js';

type PostMetadataPolicyInput = {
  clubId?: string;
  communityGroupId?: string;
  metadata?: Record<string, unknown>;
};

const backendOwnedMetadataKeys = ['attachments', 'isPinned', 'pinnedBy', 'pinnedAt'] as const;

function hasNonEmptyValue(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

/**
 * Metadata can describe a post, but it must never pretend to narrow backend visibility.
 */
export function assertSupportedPostMetadata(input: PostMetadataPolicyInput): void {
  const metadata = input.metadata ?? {};

  const forgedBackendField = backendOwnedMetadataKeys.find((key) =>
    Object.prototype.hasOwnProperty.call(metadata, key),
  );
  if (forgedBackendField) {
    throw badRequest('Post metadata cannot set backend-owned fields', {
      field: forgedBackendField,
    });
  }

  if (hasNonEmptyValue(metadata.imageUrl) || hasNonEmptyValue(metadata.videoUrl)) {
    throw badRequest('Post media must use finalized attachment proof');
  }

  if (!input.clubId || input.communityGroupId) return;

  if (metadata.audience !== undefined && metadata.audience !== 'club') {
    throw badRequest('Club posts currently support club-wide audience only');
  }
  if (hasNonEmptyValue(metadata.squadId)) {
    throw badRequest('Squad-targeted posts require a dedicated backend visibility contract');
  }
}
