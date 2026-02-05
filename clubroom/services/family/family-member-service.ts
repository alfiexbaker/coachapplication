/**
 * Family Member Service
 *
 * Handles CRUD operations for family members (children).
 * Single responsibility: manage children entities.
 */

import { apiClient } from '../api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { eventBus, ServiceEvents } from '../event-bus';
import {
  type FamilyMember,
  CHILD_COLORS,
} from './types';

const logger = createLogger('FamilyMemberService');

// Mock data for development
const MOCK_MEMBERS: FamilyMember[] = [
  {
    id: 'child_tom',
    name: 'Tom Henderson',
    avatar: undefined,
    relationship: 'son',
    age: 12,
    colorCode: CHILD_COLORS[0],
    dateOfBirth: '2013-03-15',
    skillLevel: 'INTERMEDIATE',
    primarySport: 'Football',
    totalSessions: 24,
    totalBadges: 8,
    isActive: true,
    addedAt: '2024-01-10T10:00:00.000Z',
  },
  {
    id: 'child_emma',
    name: 'Emma Henderson',
    avatar: undefined,
    relationship: 'daughter',
    age: 10,
    colorCode: CHILD_COLORS[1],
    dateOfBirth: '2015-07-22',
    skillLevel: 'BEGINNER',
    primarySport: 'Football',
    totalSessions: 12,
    totalBadges: 4,
    isActive: true,
    addedAt: '2024-03-15T14:00:00.000Z',
  },
];

class FamilyMemberService {
  private useMock = true;

  /**
   * Get all family members for storage.
   */
  private async loadMembers(): Promise<FamilyMember[]> {
    if (this.useMock) {
      return [...MOCK_MEMBERS];
    }
    return apiClient.get<FamilyMember[]>(STORAGE_KEYS.FAMILY_MEMBERS, []);
  }

  /**
   * Save members to storage.
   */
  private async saveMembers(members: FamilyMember[]): Promise<void> {
    if (this.useMock) {
      MOCK_MEMBERS.length = 0;
      MOCK_MEMBERS.push(...members);
      return;
    }
    await apiClient.set(STORAGE_KEYS.FAMILY_MEMBERS, members);
  }

  /**
   * Get all family members (children) for a parent.
   */
  async getAll(parentId: string): Promise<FamilyMember[]> {
    try {
      const members = await this.loadMembers();
      logger.info('Retrieved family members', { parentId, count: members.length });
      return members;
    } catch (error) {
      logger.error('Failed to get family members', { parentId, error });
      return [];
    }
  }

  /**
   * Get a single family member by ID.
   */
  async getById(childId: string): Promise<FamilyMember | null> {
    const members = await this.loadMembers();
    return members.find((m) => m.id === childId) || null;
  }

  /**
   * Add a new family member.
   */
  async create(
    parentId: string,
    data: Omit<FamilyMember, 'id' | 'colorCode' | 'addedAt' | 'isActive'>
  ): Promise<FamilyMember> {
    const members = await this.loadMembers();
    const colorIndex = members.length % CHILD_COLORS.length;

    const newMember: FamilyMember = {
      ...data,
      id: `child_${Date.now()}`,
      colorCode: CHILD_COLORS[colorIndex],
      isActive: true,
      addedAt: new Date().toISOString(),
    };

    members.push(newMember);
    await this.saveMembers(members);

    // Emit event for other services
    eventBus.emit(ServiceEvents.FAMILY_MEMBER_ADDED, {
      familyId: parentId,
      memberId: newMember.id,
    });

    logger.info('Family member added', { parentId, memberId: newMember.id });
    return newMember;
  }

  /**
   * Update a family member.
   */
  async update(
    childId: string,
    updates: Partial<FamilyMember>
  ): Promise<FamilyMember | null> {
    const members = await this.loadMembers();
    const index = members.findIndex((m) => m.id === childId);

    if (index === -1) {
      logger.warn('Family member not found for update', { childId });
      return null;
    }

    members[index] = { ...members[index], ...updates };
    await this.saveMembers(members);

    logger.info('Family member updated', { childId });
    return members[index];
  }

  /**
   * Remove a family member (soft delete by setting isActive = false).
   */
  async remove(childId: string): Promise<boolean> {
    const members = await this.loadMembers();
    const index = members.findIndex((m) => m.id === childId);

    if (index === -1) {
      return false;
    }

    members[index].isActive = false;
    await this.saveMembers(members);

    eventBus.emit(ServiceEvents.FAMILY_MEMBER_REMOVED, {
      memberId: childId,
    });

    logger.info('Family member removed', { childId });
    return true;
  }

  /**
   * Get active members only.
   */
  async getActive(parentId: string): Promise<FamilyMember[]> {
    const members = await this.getAll(parentId);
    return members.filter((m) => m.isActive);
  }
}

export const familyMemberService = new FamilyMemberService();
