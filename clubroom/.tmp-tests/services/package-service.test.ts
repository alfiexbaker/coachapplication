import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { packageService } from '@/services/package-service';
import { storageService } from '@/services/storage-service';

describe('PackageService', () => {
  const STORAGE_KEY_PACKAGES = 'clubroom.packages';
  const STORAGE_KEY_PURCHASES = 'clubroom.package_purchases';
  const STORAGE_KEY_REDEMPTIONS = 'clubroom.package_redemptions';

  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEY_PACKAGES);
    await storageService.removeItem(STORAGE_KEY_PURCHASES);
    await storageService.removeItem(STORAGE_KEY_REDEMPTIONS);
  });

  describe('createPackage', () => {
    it('should create a new package successfully', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        name: '5 Session Pack',
        description: 'Test package',
        sessionCount: 5,
        price: 200,
        discountPercent: 10,
        validDays: 60,
      };

      const result = await packageService.createPackage(params);

      assert.ok(result.id);
      assert.equal(result.coachId, params.coachId);
      assert.equal(result.name, params.name);
      assert.equal(result.sessionCount, 5);
      assert.equal(result.price, 200);
      assert.equal(result.isActive, true);
      assert.equal(result.pricePerSession, 40);
    });

    it('should calculate pricePerSession correctly', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        name: '10 Session Pack',
        sessionCount: 10,
        price: 350,
        discountPercent: 20,
        validDays: 90,
      };

      const result = await packageService.createPackage(params);

      assert.equal(result.pricePerSession, 35);
    });
  });

  describe('getAvailablePackages', () => {
    it('should return only active packages for coach', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await packageService.createPackage({
        coachId,
        coachName: 'Test Coach',
        name: 'Active Pack',
        sessionCount: 5,
        price: 200,
        discountPercent: 10,
        validDays: 60,
      });

      const pkg2 = await packageService.createPackage({
        coachId,
        coachName: 'Test Coach',
        name: 'Inactive Pack',
        sessionCount: 10,
        price: 350,
        discountPercent: 20,
        validDays: 90,
      });

      // Deactivate second package
      await packageService.updatePackage(pkg2.id, { isActive: false });

      const available = await packageService.getAvailablePackages(coachId);

      assert.equal(available.length, 1);
      assert.equal(available[0].name, 'Active Pack');
    });

    it('should return empty array for coach with no packages', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const available = await packageService.getAvailablePackages(coachId);

      assert.equal(available.length, 0);
    });
  });

  describe('updatePackage', () => {
    it('should update package fields successfully', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const pkg = await packageService.createPackage({
        coachId,
        coachName: 'Test Coach',
        name: 'Original Name',
        sessionCount: 5,
        price: 200,
        discountPercent: 10,
        validDays: 60,
      });

      const updated = await packageService.updatePackage(pkg.id, {
        name: 'Updated Name',
        price: 250,
      });

      assert.ok(updated);
      assert.equal(updated.name, 'Updated Name');
      assert.equal(updated.price, 250);
      assert.equal(updated.pricePerSession, 50);
    });

    it('should return null for non-existent package', async () => {
      const result = await packageService.updatePackage('nonexistent', { name: 'Test' });

      assert.equal(result, null);
    });
  });

  describe('deletePackage', () => {
    it('should soft delete package by marking inactive', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const pkg = await packageService.createPackage({
        coachId,
        coachName: 'Test Coach',
        name: 'Test Pack',
        sessionCount: 5,
        price: 200,
        discountPercent: 10,
        validDays: 60,
      });

      const result = await packageService.deletePackage(pkg.id);

      assert.equal(result, true);

      const retrieved = await packageService.getPackageById(pkg.id);
      assert.ok(retrieved);
      assert.equal(retrieved.isActive, false);
    });

    it('should return false for non-existent package', async () => {
      const result = await packageService.deletePackage('nonexistent');

      assert.equal(result, false);
    });
  });

  describe('formatExpirationDate', () => {
    it('should format expired date correctly', () => {
      const pastDate = new Date('2020-01-01').toISOString();
      const result = packageService.formatExpirationDate(pastDate);

      assert.equal(result, 'Expired');
    });

    it('should format near future dates correctly', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = packageService.formatExpirationDate(tomorrow.toISOString());

      assert.equal(result, 'Expires tomorrow');
    });
  });

  describe('calculateSavings', () => {
    it('should calculate savings correctly', () => {
      const pkg = {
        id: 'test',
        sessionCount: 5,
        price: 180,
      } as any;

      const savings = packageService.calculateSavings(pkg, 40);

      assert.equal(savings, 20); // 5 * 40 - 180 = 20
    });
  });
});
