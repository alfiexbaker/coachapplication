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

import { apiClient } from "./api-client";
import { communityGroupService } from "./community/community-group-service";
import { squadService } from "./squad-service";
import {
  type Result,
  type ServiceError,
  ok,
  err,
  storageError,
  notFound,
} from "@/types/result";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { createLogger } from "@/utils/logger";
import type { ParentGroup } from "@/constants/types";
const logger = createLogger("SquadGroupService");

/** In-memory cache for squad->group mapping */
type SquadGroupMap = Record<string, string>;

/**
 * Load the squad-to-group mapping from storage.
 */
async function loadMap(): Promise<SquadGroupMap> {
  try {
    return await apiClient.get<SquadGroupMap>(STORAGE_KEYS.SQUAD_GROUP_MAP, {});
  } catch (error) {
    logger.error("Failed to load squad group map", error);
    return {};
  }
}

/**
 * Persist the squad-to-group mapping.
 */
async function saveMap(
  map: SquadGroupMap,
): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.SQUAD_GROUP_MAP, map);
    return ok(undefined);
  } catch (error) {
    logger.error("Failed to save squad group map", error);
    return err(storageError("Failed to save squad group map"));
  }
}
export const squadGroupService = {
  /**
   * Get or create the parent group for a squad.
   * If the group already exists (via mapping), returns it.
   * Otherwise, creates a new SQUAD-type group, persists the mapping,
   * and populates it with current squad parent members.
   */
  async getOrCreateSquadGroup(
    squadId: string,
    creatorId: string,
    creatorName: string,
  ): Promise<Result<ParentGroup, ServiceError>> {
    // 1. Check existing mapping
    const map = await loadMap();
    const existingGroupId = map[squadId];
    if (existingGroupId) {
      const existingGroupResult =
        await communityGroupService.getGroup(existingGroupId);
      if (existingGroupResult.success) {
        logger.info("Returning existing squad group", {
          squadId,
          groupId: existingGroupId,
        });
        return ok(existingGroupResult.data);
      }
      // Mapping exists but group was deleted — remove stale entry
      delete map[squadId];
      const staleResult = await saveMap(map);
      if (!staleResult.success) {
        return err(staleResult.error);
      }
    }

    // 2. Fetch squad info + parents for initial member seeding
    const squad = await squadService.getSquad(squadId);
    if (!squad) {
      return err(notFound("Squad", squadId));
    }
    let parentIds: string[] = [];
    let parentNames: string[] = [];
    try {
      const parents = await squadService.getSquadParents(squadId);
      // Exclude creator from the memberIds list (they become OWNER automatically)
      parentIds = parents.flatMap((p) =>
        p.parentId !== creatorId ? [p.parentId] : [],
      );
      parentNames = parents.flatMap((p) =>
        p.parentId !== creatorId ? [p.parentName] : [],
      );
    } catch (error) {
      logger.warn("Failed to load squad parents for group seeding", error);
    }

    // 3. Create the group
    try {
      const newGroup = await communityGroupService.createGroup({
        name: `${squad.name} Parents`,
        description: `Parent group chat for ${squad.name}`,
        type: "SQUAD",
        memberIds: parentIds,
        memberNames: parentNames,
        creatorId,
        creatorName,
        isPublic: false,
        clubId: squad.clubId,
      });
      if (!newGroup.success) {
        return err(newGroup.error);
      }

      // 4. Save mapping
      map[squadId] = newGroup.data.id;
      const mapResult = await saveMap(map);
      if (!mapResult.success) {
        return err(mapResult.error);
      }

      // 5. Also save groupId on the squad record for quick lookups
      try {
        const storedSquads = await apiClient.get<
          Array<{
            id: string;
            groupId?: string;
          }>
        >(STORAGE_KEYS.CLUB_SQUADS, []);
        const idx = storedSquads.findIndex((s) => s.id === squadId);
        if (idx !== -1) {
          storedSquads[idx].groupId = newGroup.data.id;
          await apiClient.set(STORAGE_KEYS.CLUB_SQUADS, storedSquads);
        }
      } catch (error) {
        logger.warn("Failed to persist groupId on squad record", error);
      }
      logger.info("Created squad group", {
        squadId,
        groupId: newGroup.data.id,
        memberCount: newGroup.data.members.length,
      });
      return ok(newGroup.data);
    } catch (error) {
      logger.error("Failed to create squad group", error);
      return err(storageError("Failed to create squad group"));
    }
  },
  /**
   * Sync a member addition to the squad's group.
   * Adds the parent to the group if not already a member.
   */
  async syncMemberToGroup(
    squadId: string,
    parentId: string,
    parentName: string,
  ): Promise<Result<void, ServiceError>> {
    const map = await loadMap();
    const groupId = map[squadId];
    if (!groupId) {
      logger.debug("No group mapping for squad, skipping sync", {
        squadId,
      });
      return ok(undefined);
    }
    const result = await communityGroupService.addMemberDirect(
      groupId,
      parentId,
      parentName,
    );
    if (!result.success) {
      logger.error("Failed to sync member to squad group", {
        squadId,
        groupId,
        parentId,
        error: result.error,
      });
      return err(result.error);
    }
    logger.info("Synced member to squad group", {
      squadId,
      groupId,
      parentId,
    });
    return ok(undefined);
  },
  /**
   * Sync a member removal from the squad's group.
   * Removes the parent from the group.
   */
  async syncMemberRemovalFromGroup(
    squadId: string,
    parentId: string,
  ): Promise<Result<void, ServiceError>> {
    const map = await loadMap();
    const groupId = map[squadId];
    if (!groupId) {
      logger.debug("No group mapping for squad, skipping removal sync", {
        squadId,
      });
      return ok(undefined);
    }
    const result = await communityGroupService.removeMemberDirect(
      groupId,
      parentId,
    );
    if (!result.success) {
      logger.error("Failed to remove member from squad group", {
        squadId,
        groupId,
        parentId,
        error: result.error,
      });
      return err(result.error);
    }
    logger.info("Removed member from squad group", {
      squadId,
      groupId,
      parentId,
    });
    return ok(undefined);
  },
  /**
   * Delete the group associated with a squad.
   * Called when a squad is deleted.
   */
  async deleteSquadGroup(squadId: string): Promise<Result<void, ServiceError>> {
    const map = await loadMap();
    const groupId = map[squadId];
    if (!groupId) {
      logger.debug("No group mapping for squad, nothing to delete", {
        squadId,
      });
      return ok(undefined);
    }
    const result = await communityGroupService.deleteGroup(groupId);

    // Clean up mapping regardless of result
    delete map[squadId];
    const mapResult = await saveMap(map);
    if (!mapResult.success) {
      logger.warn("Failed to persist map cleanup after squad group delete", {
        squadId,
      });
    }
    if (!result.success) {
      logger.error("Failed to delete squad group", {
        squadId,
        groupId,
        error: result.error,
      });
      return err(result.error);
    }
    logger.info("Deleted squad group", {
      squadId,
      groupId,
    });
    return ok(undefined);
  },
  /**
   * Get the group ID for a squad, if one exists.
   */
  async getGroupIdForSquad(squadId: string): Promise<string | null> {
    const map = await loadMap();
    return map[squadId] ?? null;
  },
};
