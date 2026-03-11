import { z } from 'zod';

export {
  clubAccessLevels,
  clubCapabilities,
  clubRelationshipLayers,
  clubVisibilityAreas,
  organizationCommercialModes,
  organizationRoles,
} from './definitions.js';

export type {
  ClubAccessLevel,
  ClubCapability,
  ClubRelationshipLayer,
  ClubRole,
  ClubVisibilityArea,
  OrganizationCommercialMode,
  OrganizationRole,
} from './definitions.js';

import {
  clubAccessLevels,
  clubCapabilities,
  clubRelationshipLayers,
  clubVisibilityAreas,
  organizationCommercialModes,
  organizationRoles,
} from './definitions.js';

export const organizationRoleSchema = z.enum(organizationRoles);
export const clubRoleSchema = organizationRoleSchema;

export const organizationCommercialModeSchema = z.enum(organizationCommercialModes);
export const clubRelationshipLayerSchema = z.enum(clubRelationshipLayers);
export const clubAccessLevelSchema = z.enum(clubAccessLevels);
export const clubCapabilitySchema = z.enum(clubCapabilities);
export const clubVisibilityAreaSchema = z.enum(clubVisibilityAreas);
