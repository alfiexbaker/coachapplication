import {
  SessionPackage,
  PackagePurchase,
  PackageRedemption,
} from '@/constants/types';
import { storageService } from './storage-service';
import { api } from '@/constants/config';
import { walletService } from './wallet-service';
import { createLogger } from '@/utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_KEY_PACKAGES = 'clubroom.packages';
const STORAGE_KEY_PURCHASES = 'clubroom.package_purchases';
const STORAGE_KEY_REDEMPTIONS = 'clubroom.package_redemptions';
const USE_MOCK = api.useMock;
const logger = createLogger('PackageService');

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_PACKAGES: SessionPackage[] = [
  {
    id: 'pkg_1',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    name: '5 Session Starter Pack',
    description: 'Perfect for beginners. Get 5 one-on-one sessions at a discounted rate.',
    sessionCount: 5,
    price: 200,
    discountPercent: 10,
    validDays: 60,
    isActive: true,
    currency: 'GBP',
    pricePerSession: 40,
    createdAt: '2024-10-01T10:00:00.000Z',
    focus: ['Dribbling', 'Passing'],
  },
  {
    id: 'pkg_2',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    name: '10 Session Pro Bundle',
    description: 'Our most popular package. Serious training for serious players with 10 sessions.',
    sessionCount: 10,
    price: 350,
    discountPercent: 20,
    validDays: 90,
    isActive: true,
    currency: 'GBP',
    pricePerSession: 35,
    createdAt: '2024-10-01T10:00:00.000Z',
    focus: ['Finishing', 'Conditioning'],
  },
  {
    id: 'pkg_3',
    coachId: 'coach2',
    coachName: 'Mike Thompson',
    name: '5 Session Group Training',
    description: 'Small group training sessions focusing on teamwork and tactics.',
    sessionCount: 5,
    price: 125,
    discountPercent: 15,
    validDays: 45,
    isActive: true,
    sessionType: 'group',
    currency: 'GBP',
    pricePerSession: 25,
    createdAt: '2024-11-15T09:00:00.000Z',
    focus: ['Passing', 'Defending'],
  },
  {
    id: 'pkg_4',
    coachId: 'coach2',
    coachName: 'Mike Thompson',
    name: '10 Session Elite Bundle',
    description: 'Premium coaching package with personalized training plans and video analysis.',
    sessionCount: 10,
    price: 400,
    discountPercent: 25,
    validDays: 120,
    isActive: true,
    currency: 'GBP',
    pricePerSession: 40,
    createdAt: '2024-11-15T09:00:00.000Z',
    focus: ['Finishing', 'Goalkeeping'],
  },
  {
    id: 'pkg_5',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    name: '3 Session Trial Pack',
    description: 'Try before you commit with 3 introductory sessions.',
    sessionCount: 3,
    price: 120,
    discountPercent: 5,
    validDays: 30,
    isActive: true,
    currency: 'GBP',
    pricePerSession: 40,
    createdAt: '2024-12-01T08:00:00.000Z',
  },
];

const MOCK_PURCHASES: PackagePurchase[] = [
  {
    id: 'purchase_1',
    userId: 'parent1',
    userName: 'John Henderson',
    packageId: 'pkg_1',
    packageName: '5 Session Starter Pack',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    sessionsTotal: 5,
    sessionsUsed: 2,
    sessionsRemaining: 3,
    purchasedAt: '2024-12-01T14:00:00.000Z',
    expiresAt: '2025-01-30T14:00:00.000Z',
    status: 'ACTIVE',
    pricePaid: 200,
    currency: 'GBP',
    redeemedBookingIds: ['booking_001', 'booking_003'],
    transactionId: 'txn_pkg_1',
  },
  {
    id: 'purchase_2',
    userId: 'parent2',
    userName: 'Lisa Wilson',
    packageId: 'pkg_2',
    packageName: '10 Session Pro Bundle',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    sessionsTotal: 10,
    sessionsUsed: 10,
    sessionsRemaining: 0,
    purchasedAt: '2024-09-15T10:00:00.000Z',
    expiresAt: '2024-12-15T10:00:00.000Z',
    status: 'EXHAUSTED',
    pricePaid: 350,
    currency: 'GBP',
    redeemedBookingIds: [],
    transactionId: 'txn_pkg_2',
  },
];

const MOCK_REDEMPTIONS: PackageRedemption[] = [
  {
    id: 'redeem_1',
    purchaseId: 'purchase_1',
    bookingId: 'booking_001',
    redeemedAt: '2024-12-10T15:00:00.000Z',
    userId: 'parent1',
  },
  {
    id: 'redeem_2',
    purchaseId: 'purchase_1',
    bookingId: 'booking_003',
    redeemedAt: '2024-12-20T11:00:00.000Z',
    userId: 'parent1',
  },
];

// ============================================================================
// TYPES
// ============================================================================

/** Parameters for creating a new package */
export interface CreatePackageParams {
  coachId: string;
  coachName: string;
  name: string;
  description?: string;
  sessionCount: number;
  price: number;
  discountPercent: number;
  validDays: number;
  sessionType?: string;
  focus?: string[];
}

/** Parameters for updating a package */
export interface UpdatePackageParams {
  name?: string;
  description?: string;
  sessionCount?: number;
  price?: number;
  discountPercent?: number;
  validDays?: number;
  isActive?: boolean;
  sessionType?: string;
  focus?: string[];
}

/** Result of a package purchase attempt */
export interface PurchaseResult {
  success: boolean;
  purchase?: PackagePurchase;
  error?: string;
  newWalletBalance?: number;
}

/** Result of a session redemption attempt */
export interface RedemptionResult {
  success: boolean;
  redemption?: PackageRedemption;
  purchase?: PackagePurchase;
  error?: string;
}

// ============================================================================
// PACKAGE SERVICE
// ============================================================================

/**
 * Service for managing session packages and bundles.
 * Handles package CRUD operations, purchases, and session redemptions.
 */
class PackageService {
  // ==========================================================================
  // PACKAGE RETRIEVAL
  // ==========================================================================

  /**
   * Get all available packages for a specific coach
   * @param coachId - The coach's unique identifier
   * @returns Array of active packages for the coach
   */
  async getAvailablePackages(coachId: string): Promise<SessionPackage[]> {
    const packages = await this.getAllPackages();
    const available = packages.filter(
      (pkg) => pkg.coachId === coachId && pkg.isActive
    );
    logger.info('available_packages_retrieved', { coachId, count: available.length });
    return available;
  }

  /**
   * Get all packages (active and inactive) for a coach - used in coach management
   * @param coachId - The coach's unique identifier
   * @returns Array of all packages for the coach
   */
  async getCoachPackages(coachId: string): Promise<SessionPackage[]> {
    const packages = await this.getAllPackages();
    const coachPackages = packages.filter((pkg) => pkg.coachId === coachId);
    logger.info('coach_packages_retrieved', { coachId, count: coachPackages.length });
    return coachPackages;
  }

  /**
   * Get a single package by ID
   * @param packageId - The package's unique identifier
   * @returns The package or null if not found
   */
  async getPackageById(packageId: string): Promise<SessionPackage | null> {
    const packages = await this.getAllPackages();
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg) {
      logger.info('package_retrieved', { packageId, name: pkg.name });
    } else {
      logger.warn('package_not_found', { packageId });
    }
    return pkg || null;
  }

  /**
   * Get all packages from all coaches (for discovery)
   * @returns Array of all active packages
   */
  async discoverPackages(): Promise<SessionPackage[]> {
    const packages = await this.getAllPackages();
    const active = packages.filter((pkg) => pkg.isActive);
    logger.info('packages_discovered', { count: active.length });
    return active;
  }

  /**
   * Get all packages (internal use)
   */
  private async getAllPackages(): Promise<SessionPackage[]> {
    if (USE_MOCK) {
      return storageService.getItem<SessionPackage[]>(STORAGE_KEY_PACKAGES, MOCK_PACKAGES);
    }
    return storageService.getItem<SessionPackage[]>(STORAGE_KEY_PACKAGES, []);
  }

  /**
   * Save packages to storage
   */
  private async savePackages(packages: SessionPackage[]): Promise<void> {
    await storageService.setItem(STORAGE_KEY_PACKAGES, packages);
  }

  // ==========================================================================
  // PACKAGE MANAGEMENT (COACH)
  // ==========================================================================

  /**
   * Create a new session package (coach only)
   * @param params - Package creation parameters
   * @returns The created package
   */
  async createPackage(params: CreatePackageParams): Promise<SessionPackage> {
    const packages = await this.getAllPackages();

    const newPackage: SessionPackage = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      coachId: params.coachId,
      coachName: params.coachName,
      name: params.name,
      description: params.description,
      sessionCount: params.sessionCount,
      price: params.price,
      discountPercent: params.discountPercent,
      validDays: params.validDays,
      isActive: true,
      sessionType: params.sessionType,
      focus: params.focus as SessionPackage['focus'],
      currency: 'GBP',
      pricePerSession: Math.round((params.price / params.sessionCount) * 100) / 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    packages.push(newPackage);
    await this.savePackages(packages);

    logger.info('package_created', {
      id: newPackage.id,
      name: newPackage.name,
      coachId: newPackage.coachId,
      sessionCount: newPackage.sessionCount,
      price: newPackage.price,
    });

    return newPackage;
  }

  /**
   * Update an existing package (coach only)
   * @param packageId - The package to update
   * @param params - Fields to update
   * @returns The updated package or null if not found
   */
  async updatePackage(
    packageId: string,
    params: UpdatePackageParams
  ): Promise<SessionPackage | null> {
    const packages = await this.getAllPackages();
    const index = packages.findIndex((p) => p.id === packageId);

    if (index === -1) {
      logger.warn('update_package_not_found', { packageId });
      return null;
    }

    const updatedPackage: SessionPackage = {
      ...packages[index],
      ...params,
      focus: params.focus as SessionPackage['focus'],
      updatedAt: new Date().toISOString(),
    };

    // Recalculate price per session if price or count changed
    if (params.price !== undefined || params.sessionCount !== undefined) {
      const price = params.price ?? packages[index].price;
      const count = params.sessionCount ?? packages[index].sessionCount;
      updatedPackage.pricePerSession = Math.round((price / count) * 100) / 100;
    }

    packages[index] = updatedPackage;
    await this.savePackages(packages);

    logger.info('package_updated', { packageId, updates: Object.keys(params) });
    return updatedPackage;
  }

  /**
   * Delete a package (coach only) - actually deactivates it
   * @param packageId - The package to delete
   * @returns True if deleted successfully
   */
  async deletePackage(packageId: string): Promise<boolean> {
    const packages = await this.getAllPackages();
    const index = packages.findIndex((p) => p.id === packageId);

    if (index === -1) {
      logger.warn('delete_package_not_found', { packageId });
      return false;
    }

    // Soft delete - mark as inactive
    packages[index] = {
      ...packages[index],
      isActive: false,
      updatedAt: new Date().toISOString(),
    };

    await this.savePackages(packages);
    logger.info('package_deleted', { packageId });
    return true;
  }

  /**
   * Permanently remove a package (coach only, use with caution)
   * @param packageId - The package to remove
   * @returns True if removed successfully
   */
  async permanentlyDeletePackage(packageId: string): Promise<boolean> {
    const packages = await this.getAllPackages();
    const index = packages.findIndex((p) => p.id === packageId);

    if (index === -1) {
      return false;
    }

    packages.splice(index, 1);
    await this.savePackages(packages);
    logger.info('package_permanently_deleted', { packageId });
    return true;
  }

  // ==========================================================================
  // PURCHASE MANAGEMENT
  // ==========================================================================

  /**
   * Purchase a package using wallet balance
   * @param userId - The user making the purchase
   * @param userName - User's display name
   * @param packageId - The package to purchase
   * @returns Purchase result with success status
   */
  async purchasePackage(
    userId: string,
    userName: string,
    packageId: string
  ): Promise<PurchaseResult> {
    const pkg = await this.getPackageById(packageId);

    if (!pkg) {
      return { success: false, error: 'Package not found' };
    }

    if (!pkg.isActive) {
      return { success: false, error: 'This package is no longer available' };
    }

    // Check wallet balance
    const hasFunds = await walletService.hasSufficientBalance(userId, pkg.price);
    if (!hasFunds) {
      const balance = await walletService.getBalance(userId);
      return {
        success: false,
        error: `Insufficient balance. You have \u00A3${balance.toFixed(2)} but need \u00A3${pkg.price.toFixed(2)}`,
      };
    }

    try {
      // Process payment through wallet
      const paymentResult = await walletService.payForBooking(
        userId,
        `package_${packageId}`,
        pkg.price,
        {
          description: `Package: ${pkg.name}`,
          packageId,
          coachId: pkg.coachId,
          ...(pkg.coachName != null && { coachName: pkg.coachName }),
          sessionCount: pkg.sessionCount,
        }
      );

      if (!paymentResult.success) {
        return { success: false, error: paymentResult.error };
      }

      // Create purchase record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pkg.validDays);

      const purchase: PackagePurchase = {
        id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userName,
        packageId: pkg.id,
        packageName: pkg.name,
        coachId: pkg.coachId,
        coachName: pkg.coachName,
        sessionsTotal: pkg.sessionCount,
        sessionsUsed: 0,
        sessionsRemaining: pkg.sessionCount,
        purchasedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: 'ACTIVE',
        pricePaid: pkg.price,
        currency: pkg.currency || 'GBP',
        redeemedBookingIds: [],
        transactionId: paymentResult.transaction?.id,
      };

      const purchases = await this.getAllPurchases();
      purchases.push(purchase);
      await this.savePurchases(purchases);

      logger.info('package_purchased', {
        purchaseId: purchase.id,
        packageId,
        userId,
        price: pkg.price,
        sessionCount: pkg.sessionCount,
      });

      return {
        success: true,
        purchase,
        newWalletBalance: paymentResult.newBalance,
      };
    } catch (error) {
      logger.error('package_purchase_failed', { packageId, userId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }

  /**
   * Get all purchases for a user
   * @param userId - The user's unique identifier
   * @returns Array of user's package purchases
   */
  async getUserPackages(userId: string): Promise<PackagePurchase[]> {
    const purchases = await this.getAllPurchases();
    const userPurchases = purchases
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());

    // Update status for expired packages
    const now = new Date();
    let hasChanges = false;
    for (const purchase of userPurchases) {
      if (purchase.status === 'ACTIVE') {
        const expiresAt = new Date(purchase.expiresAt);
        if (expiresAt < now) {
          purchase.status = 'EXPIRED';
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await this.savePurchases(purchases);
    }

    logger.info('user_packages_retrieved', { userId, count: userPurchases.length });
    return userPurchases;
  }

  /**
   * Get active purchases for a user (for booking flow)
   * @param userId - The user's unique identifier
   * @param coachId - Optional: filter by coach
   * @returns Array of active purchases with remaining sessions
   */
  async getActiveUserPackages(
    userId: string,
    coachId?: string
  ): Promise<PackagePurchase[]> {
    const userPackages = await this.getUserPackages(userId);
    let active = userPackages.filter(
      (p) => p.status === 'ACTIVE' && p.sessionsRemaining > 0
    );

    if (coachId) {
      active = active.filter((p) => p.coachId === coachId);
    }

    return active;
  }

  /**
   * Get a purchase by ID
   * @param purchaseId - The purchase's unique identifier
   * @returns The purchase or null if not found
   */
  async getPurchaseById(purchaseId: string): Promise<PackagePurchase | null> {
    const purchases = await this.getAllPurchases();
    return purchases.find((p) => p.id === purchaseId) || null;
  }

  /**
   * Get all purchases (internal use)
   */
  private async getAllPurchases(): Promise<PackagePurchase[]> {
    if (USE_MOCK) {
      return storageService.getItem<PackagePurchase[]>(STORAGE_KEY_PURCHASES, MOCK_PURCHASES);
    }
    return storageService.getItem<PackagePurchase[]>(STORAGE_KEY_PURCHASES, []);
  }

  /**
   * Save purchases to storage
   */
  private async savePurchases(purchases: PackagePurchase[]): Promise<void> {
    await storageService.setItem(STORAGE_KEY_PURCHASES, purchases);
  }

  // ==========================================================================
  // SESSION REDEMPTION
  // ==========================================================================

  /**
   * Redeem a session from a package for a booking
   * @param purchaseId - The purchase to redeem from
   * @param bookingId - The booking to apply the session to
   * @param userId - The user redeeming the session
   * @returns Redemption result
   */
  async redeemSession(
    purchaseId: string,
    bookingId: string,
    userId: string
  ): Promise<RedemptionResult> {
    const purchases = await this.getAllPurchases();
    const purchaseIndex = purchases.findIndex((p) => p.id === purchaseId);

    if (purchaseIndex === -1) {
      return { success: false, error: 'Purchase not found' };
    }

    const purchase = purchases[purchaseIndex];

    // Validate ownership
    if (purchase.userId !== userId) {
      return { success: false, error: 'This package does not belong to you' };
    }

    // Validate status
    if (purchase.status !== 'ACTIVE') {
      return { success: false, error: `Package is ${purchase.status.toLowerCase()}` };
    }

    // Check expiration
    if (new Date(purchase.expiresAt) < new Date()) {
      purchase.status = 'EXPIRED';
      await this.savePurchases(purchases);
      return { success: false, error: 'Package has expired' };
    }

    // Check remaining sessions
    if (purchase.sessionsRemaining <= 0) {
      purchase.status = 'EXHAUSTED';
      await this.savePurchases(purchases);
      return { success: false, error: 'No sessions remaining' };
    }

    // Check if booking already redeemed
    if (purchase.redeemedBookingIds?.includes(bookingId)) {
      return { success: false, error: 'Session already redeemed for this booking' };
    }

    // Create redemption record
    const redemption: PackageRedemption = {
      id: `redeem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      purchaseId,
      bookingId,
      redeemedAt: new Date().toISOString(),
      userId,
    };

    const redemptions = await this.getAllRedemptions();
    redemptions.push(redemption);
    await this.saveRedemptions(redemptions);

    // Update purchase
    purchase.sessionsUsed += 1;
    purchase.sessionsRemaining -= 1;
    purchase.redeemedBookingIds = [...(purchase.redeemedBookingIds || []), bookingId];

    if (purchase.sessionsRemaining === 0) {
      purchase.status = 'EXHAUSTED';
    }

    purchases[purchaseIndex] = purchase;
    await this.savePurchases(purchases);

    logger.info('session_redeemed', {
      redemptionId: redemption.id,
      purchaseId,
      bookingId,
      sessionsRemaining: purchase.sessionsRemaining,
    });

    return { success: true, redemption, purchase };
  }

  /**
   * Get all redemptions (internal use)
   */
  private async getAllRedemptions(): Promise<PackageRedemption[]> {
    if (USE_MOCK) {
      return storageService.getItem<PackageRedemption[]>(STORAGE_KEY_REDEMPTIONS, MOCK_REDEMPTIONS);
    }
    return storageService.getItem<PackageRedemption[]>(STORAGE_KEY_REDEMPTIONS, []);
  }

  /**
   * Save redemptions to storage
   */
  private async saveRedemptions(redemptions: PackageRedemption[]): Promise<void> {
    await storageService.setItem(STORAGE_KEY_REDEMPTIONS, redemptions);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Format price as currency string
   * @param amount - The amount to format
   * @param currency - Currency code (default: GBP)
   * @returns Formatted currency string
   */
  formatPrice(amount: number, currency: string = 'GBP'): string {
    const symbol = currency === 'GBP' ? '\u00A3' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * Calculate savings amount for a package
   * @param pkg - The package to calculate savings for
   * @param singleSessionPrice - Price of a single session
   * @returns Amount saved compared to buying individually
   */
  calculateSavings(pkg: SessionPackage, singleSessionPrice: number): number {
    const regularPrice = singleSessionPrice * pkg.sessionCount;
    return regularPrice - pkg.price;
  }

  /**
   * Format days remaining until expiration
   * @param expiresAt - Expiration date string
   * @returns Formatted string describing time remaining
   */
  formatExpirationDate(expiresAt: string): string {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Expires today';
    } else if (diffDays === 1) {
      return 'Expires tomorrow';
    } else if (diffDays < 7) {
      return `Expires in ${diffDays} days`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Expires in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
    } else {
      return expires.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: expires.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  }

  /**
   * Get package purchase stats for a coach (for earnings)
   * @param coachId - The coach's unique identifier
   * @returns Stats about package sales
   */
  async getCoachPackageStats(coachId: string): Promise<{
    totalPackagesSold: number;
    totalRevenue: number;
    activePackages: number;
    sessionsRedeemed: number;
  }> {
    const purchases = await this.getAllPurchases();
    const coachPurchases = purchases.filter((p) => p.coachId === coachId);

    const totalPackagesSold = coachPurchases.length;
    const totalRevenue = coachPurchases.reduce((sum, p) => sum + p.pricePaid, 0);
    const activePackages = coachPurchases.filter((p) => p.status === 'ACTIVE').length;
    const sessionsRedeemed = coachPurchases.reduce((sum, p) => sum + p.sessionsUsed, 0);

    return { totalPackagesSold, totalRevenue, activePackages, sessionsRedeemed };
  }

  // ==========================================================================
  // DATA SEEDING & RESET
  // ==========================================================================

  /**
   * Seed demo data (for testing/demos)
   */
  async seedDemoData(): Promise<void> {
    await this.savePackages(MOCK_PACKAGES);
    await this.savePurchases(MOCK_PURCHASES);
    await this.saveRedemptions(MOCK_REDEMPTIONS);
    logger.info('demo_data_seeded', {
      packageCount: MOCK_PACKAGES.length,
      purchaseCount: MOCK_PURCHASES.length,
      redemptionCount: MOCK_REDEMPTIONS.length,
    });
  }

  /**
   * Clear all package data (for testing)
   */
  async clearAllData(): Promise<void> {
    await storageService.setItem(STORAGE_KEY_PACKAGES, []);
    await storageService.setItem(STORAGE_KEY_PURCHASES, []);
    await storageService.setItem(STORAGE_KEY_REDEMPTIONS, []);
    logger.info('package_data_cleared');
  }
}

// Export singleton instance
export const packageService = new PackageService();
