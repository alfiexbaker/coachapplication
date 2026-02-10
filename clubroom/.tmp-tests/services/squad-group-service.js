"use strict";
/**
 * Squad Group Service
 *
 * Auto-provisions and syncs parent community groups for club squads.
 * When a squad is created, a SQUAD-type parent group is auto-created.
 * When members are added/removed from a squad, the group membership
 * is kept in sync. When a squad is deleted, the group is also deleted.
 *
 * Uses a SQUAD_GROUP_MAP storage key to persist squadId -> groupId mapping.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.squadGroupService = void 0;
const api_client_1 = require("./api-client");
const community_group_service_1 = require("./community/community-group-service");
const squad_service_1 = require("./squad-service");
const result_1 = require("@/types/result");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('SquadGroupService');
/**
 * Load the squad-to-group mapping from storage.
 */
async function loadMap() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SQUAD_GROUP_MAP, {});
    }
    catch (error) {
        logger.error('Failed to load squad group map', error);
        return {};
    }
}
/**
 * Persist the squad-to-group mapping.
 */
async function saveMap(map) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_GROUP_MAP, map);
        return (0, result_1.ok)(undefined);
    }
    catch (error) {
        logger.error('Failed to save squad group map', error);
        return (0, result_1.err)((0, result_1.storageError)('Failed to save squad group map'));
    }
}
exports.squadGroupService = {
    /**
     * Get or create the parent group for a squad.
     * If the group already exists (via mapping), returns it.
     * Otherwise, creates a new SQUAD-type group, persists the mapping,
     * and populates it with current squad parent members.
     */
    async getOrCreateSquadGroup(squadId, creatorId, creatorName) {
        // 1. Check existing mapping
        const map = await loadMap();
        const existingGroupId = map[squadId];
        if (existingGroupId) {
            const existingGroupResult = await community_group_service_1.communityGroupService.getGroup(existingGroupId);
            if (existingGroupResult.success) {
                logger.info('Returning existing squad group', { squadId, groupId: existingGroupId });
                return (0, result_1.ok)(existingGroupResult.data);
            }
            // Mapping exists but group was deleted — remove stale entry
            delete map[squadId];
            const staleResult = await saveMap(map);
            if (!staleResult.success) {
                return (0, result_1.err)(staleResult.error);
            }
        }
        // 2. Fetch squad info + parents for initial member seeding
        const squad = await squad_service_1.squadService.getSquad(squadId);
        if (!squad) {
            return (0, result_1.err)((0, result_1.notFound)('Squad', squadId));
        }
        let parentIds = [];
        let parentNames = [];
        try {
            const parents = await squad_service_1.squadService.getSquadParents(squadId);
            // Exclude creator from the memberIds list (they become OWNER automatically)
            parentIds = parents
                .filter((p) => p.parentId !== creatorId)
                .map((p) => p.parentId);
            parentNames = parents
                .filter((p) => p.parentId !== creatorId)
                .map((p) => p.parentName);
        }
        catch (error) {
            logger.warn('Failed to load squad parents for group seeding', error);
        }
        // 3. Create the group
        try {
            const newGroup = await community_group_service_1.communityGroupService.createGroup({
                name: `${squad.name} Parents`,
                description: `Parent group chat for ${squad.name}`,
                type: 'SQUAD',
                memberIds: parentIds,
                memberNames: parentNames,
                creatorId,
                creatorName,
                isPublic: false,
                clubId: squad.clubId,
            });
            if (!newGroup.success) {
                return (0, result_1.err)(newGroup.error);
            }
            // 4. Save mapping
            map[squadId] = newGroup.data.id;
            const mapResult = await saveMap(map);
            if (!mapResult.success) {
                return (0, result_1.err)(mapResult.error);
            }
            // 5. Also save groupId on the squad record for quick lookups
            try {
                const storedSquads = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CLUB_SQUADS, []);
                const idx = storedSquads.findIndex((s) => s.id === squadId);
                if (idx !== -1) {
                    storedSquads[idx].groupId = newGroup.data.id;
                    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CLUB_SQUADS, storedSquads);
                }
            }
            catch (error) {
                logger.warn('Failed to persist groupId on squad record', error);
            }
            logger.info('Created squad group', {
                squadId,
                groupId: newGroup.data.id,
                memberCount: newGroup.data.members.length,
            });
            return (0, result_1.ok)(newGroup.data);
        }
        catch (error) {
            logger.error('Failed to create squad group', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to create squad group'));
        }
    },
    /**
     * Sync a member addition to the squad's group.
     * Adds the parent to the group if not already a member.
     */
    async syncMemberToGroup(squadId, parentId, parentName) {
        const map = await loadMap();
        const groupId = map[squadId];
        if (!groupId) {
            logger.debug('No group mapping for squad, skipping sync', { squadId });
            return (0, result_1.ok)(undefined);
        }
        const result = await community_group_service_1.communityGroupService.addMemberDirect(groupId, parentId, parentName);
        if (!result.success) {
            logger.error('Failed to sync member to squad group', {
                squadId,
                groupId,
                parentId,
                error: result.error,
            });
            return (0, result_1.err)(result.error);
        }
        logger.info('Synced member to squad group', { squadId, groupId, parentId });
        return (0, result_1.ok)(undefined);
    },
    /**
     * Sync a member removal from the squad's group.
     * Removes the parent from the group.
     */
    async syncMemberRemovalFromGroup(squadId, parentId) {
        const map = await loadMap();
        const groupId = map[squadId];
        if (!groupId) {
            logger.debug('No group mapping for squad, skipping removal sync', { squadId });
            return (0, result_1.ok)(undefined);
        }
        const result = await community_group_service_1.communityGroupService.removeMemberDirect(groupId, parentId);
        if (!result.success) {
            logger.error('Failed to remove member from squad group', {
                squadId,
                groupId,
                parentId,
                error: result.error,
            });
            return (0, result_1.err)(result.error);
        }
        logger.info('Removed member from squad group', { squadId, groupId, parentId });
        return (0, result_1.ok)(undefined);
    },
    /**
     * Delete the group associated with a squad.
     * Called when a squad is deleted.
     */
    async deleteSquadGroup(squadId) {
        const map = await loadMap();
        const groupId = map[squadId];
        if (!groupId) {
            logger.debug('No group mapping for squad, nothing to delete', { squadId });
            return (0, result_1.ok)(undefined);
        }
        const result = await community_group_service_1.communityGroupService.deleteGroup(groupId);
        // Clean up mapping regardless of result
        delete map[squadId];
        const mapResult = await saveMap(map);
        if (!mapResult.success) {
            logger.warn('Failed to persist map cleanup after squad group delete', { squadId });
        }
        if (!result.success) {
            logger.error('Failed to delete squad group', { squadId, groupId, error: result.error });
            return (0, result_1.err)(result.error);
        }
        logger.info('Deleted squad group', { squadId, groupId });
        return (0, result_1.ok)(undefined);
    },
    /**
     * Get the group ID for a squad, if one exists.
     */
    async getGroupIdForSquad(squadId) {
        const map = await loadMap();
        return map[squadId] ?? null;
    },
};
