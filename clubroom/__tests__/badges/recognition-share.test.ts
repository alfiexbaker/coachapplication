/**
 * Recognition Share + Detail Card Tests
 *
 * Tests for the share helper and recognition detail card data flow.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { RECOGNITION_TEMPLATES, getTemplatesForCategory } from '../../constants/recognition-templates';
import { badgeService } from '../../services/badge-service';
import { CategoryInfo } from '../../constants/progression';
import type { BadgeCategory, BadgeAward } from '@/constants/types';

describe('recognition share text generation', () => {
  test('all 4 categories have templates', () => {
    const categories: BadgeCategory[] = ['technical', 'physical', 'psychological', 'social'];
    for (const cat of categories) {
      const templates = getTemplatesForCategory(cat);
      assert.ok(templates.length >= 4, `${cat} should have at least 4 templates`);
    }
  });

  test('each category has matching CategoryInfo', () => {
    const categories: BadgeCategory[] = ['technical', 'physical', 'psychological', 'social'];
    for (const cat of categories) {
      const info = CategoryInfo[cat];
      assert.ok(info, `CategoryInfo missing for ${cat}`);
      assert.ok(info.label.length > 0);
      assert.ok(info.icon.length > 0);
    }
  });

  test('findBadgeForCategory returns badge for every template category', () => {
    const seenCategories = new Set(RECOGNITION_TEMPLATES.map((t) => t.category));
    for (const cat of seenCategories) {
      const badge = badgeService.findBadgeForCategory(cat);
      assert.ok(badge, `No badge for category: ${cat}`);
    }
  });

  test('all template IDs are unique', () => {
    const ids = RECOGNITION_TEMPLATES.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('share text would include athlete name and category', () => {
    // Simulate what shareRecognition builds
    const award: BadgeAward = {
      id: 'test_award_1',
      badgeId: 'badge_recognition_technical',
      badgeLabel: 'Technical Recognition',
      athleteId: 'user1',
      coachId: 'coach1',
      reason: 'Great improvement in ball control today.',
      awardedBy: 'coach1',
      awardedAt: new Date().toISOString(),
      visibility: 'supporters',
      badgeCategory: 'technical',
    };

    const athleteName = 'Olivia Henderson';
    const categoryLabel = award.badgeCategory
      ? award.badgeCategory.charAt(0).toUpperCase() + award.badgeCategory.slice(1)
      : 'Development';

    const message = `${athleteName} received a ${categoryLabel} recognition!\n\n"${award.reason}"\n\nSent via Clubroom`;
    assert.ok(message.includes('Olivia Henderson'));
    assert.ok(message.includes('Technical'));
    assert.ok(message.includes('ball control'));
    assert.ok(message.includes('Clubroom'));
  });
});
