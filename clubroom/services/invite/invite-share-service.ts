/**
 * Invite Share Service
 *
 * Generates shareable deep links for session invites
 * and opens the native share dialog.
 */

import { Share, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { apiClient } from '../api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import type { Result, ServiceError } from '@/types/result';
import { ok, err, serviceError } from '@/types/result';

const logger = createLogger('InviteShareService');

interface StoredShareLink {
  inviteId: string;
  link: string;
  createdAt: string;
}

export const inviteShareService = {
  /**
   * Generate a shareable deep link for an invite.
   */
  async generateShareLink(inviteId: string): Promise<Result<string, ServiceError>> {
    try {
      // Check for existing link
      const storedLinks = await apiClient.get<StoredShareLink[]>(
        STORAGE_KEYS.INVITE_SHARE_LINKS,
        []
      );
      const existing = storedLinks.find((l) => l.inviteId === inviteId);
      if (existing) {
        return ok(existing.link);
      }

      // Generate deep link using expo-linking
      const link = Linking.createURL(`session-invites/${inviteId}`);

      // Store it
      storedLinks.push({
        inviteId,
        link,
        createdAt: new Date().toISOString(),
      });
      await apiClient.set(STORAGE_KEYS.INVITE_SHARE_LINKS, storedLinks);

      logger.info('Share link generated', { inviteId, link });

      return ok(link);
    } catch (error) {
      logger.error('Failed to generate share link', error);
      return err(serviceError('STORAGE', 'Failed to generate share link'));
    }
  },

  /**
   * Generate a share link and open the native Share dialog.
   */
  async shareInvite(
    inviteId: string,
    coachName: string,
    sessionTitle: string,
    date: string
  ): Promise<Result<void, ServiceError>> {
    try {
      const linkResult = await this.generateShareLink(inviteId);
      if (!linkResult.success) {
        return err(linkResult.error);
      }

      const shareMessage = `Join my ${sessionTitle} session with Coach ${coachName} on ${date}!`;

      await Share.share(
        Platform.select({
          ios: {
            message: shareMessage,
            url: linkResult.data,
          },
          default: {
            message: `${shareMessage}\n${linkResult.data}`,
          },
        }) as { message: string; url?: string }
      );

      // Emit shared event
      emitTyped(ServiceEvents.INVITE_SHARED, {
        inviteId,
        sharedBy: coachName,
        shareLink: linkResult.data,
      });

      logger.info('Invite shared', { inviteId });

      return ok(undefined);
    } catch (error) {
      // User may have dismissed the share sheet — not a real error
      if (error instanceof Error && error.message?.includes('dismiss')) {
        return ok(undefined);
      }
      logger.error('Failed to share invite', error);
      return err(serviceError('UNKNOWN', 'Failed to share invite'));
    }
  },
};
