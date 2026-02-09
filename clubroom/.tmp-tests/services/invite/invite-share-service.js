"use strict";
/**
 * Invite Share Service
 *
 * Generates shareable deep links for session invites
 * and opens the native share dialog.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteShareService = void 0;
const react_native_1 = require("react-native");
const Linking = __importStar(require("expo-linking"));
const api_client_1 = require("../api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('InviteShareService');
exports.inviteShareService = {
    /**
     * Generate a shareable deep link for an invite.
     */
    async generateShareLink(inviteId) {
        try {
            // Check for existing link
            const storedLinks = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_SHARE_LINKS, []);
            const existing = storedLinks.find((l) => l.inviteId === inviteId);
            if (existing) {
                return (0, result_1.ok)(existing.link);
            }
            // Generate deep link using expo-linking
            const link = Linking.createURL(`session-invites/${inviteId}`);
            // Store it
            storedLinks.push({
                inviteId,
                link,
                createdAt: new Date().toISOString(),
            });
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.INVITE_SHARE_LINKS, storedLinks);
            logger.info('Share link generated', { inviteId, link });
            return (0, result_1.ok)(link);
        }
        catch (error) {
            logger.error('Failed to generate share link', error);
            return (0, result_1.err)((0, result_1.serviceError)('STORAGE', 'Failed to generate share link'));
        }
    },
    /**
     * Generate a share link and open the native Share dialog.
     */
    async shareInvite(inviteId, coachName, sessionTitle, date) {
        try {
            const linkResult = await this.generateShareLink(inviteId);
            if (!linkResult.success) {
                return (0, result_1.err)(linkResult.error);
            }
            const shareMessage = `Join my ${sessionTitle} session with Coach ${coachName} on ${date}!`;
            await react_native_1.Share.share(react_native_1.Platform.select({
                ios: {
                    message: shareMessage,
                    url: linkResult.data,
                },
                default: {
                    message: `${shareMessage}\n${linkResult.data}`,
                },
            }));
            // Emit shared event
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.INVITE_SHARED, {
                inviteId,
                sharedBy: coachName,
                shareLink: linkResult.data,
            });
            logger.info('Invite shared', { inviteId });
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            // User may have dismissed the share sheet — not a real error
            if (error instanceof Error && error.message?.includes('dismiss')) {
                return (0, result_1.ok)(undefined);
            }
            logger.error('Failed to share invite', error);
            return (0, result_1.err)((0, result_1.serviceError)('UNKNOWN', 'Failed to share invite'));
        }
    },
};
