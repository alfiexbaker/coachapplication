/**
 * Hook for the Manage Packages screen.
 * Manages packages list, stats, CRUD operations, and create/edit modal.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { packageService } from '@/services/package-service';
import { createLogger } from '@/utils/logger';
import type { SessionPackage } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('ManagePackagesScreen');

interface PackageStats {
  totalPackagesSold: number;
  totalRevenue: number;
  activePackages: number;
  sessionsRedeemed: number;
}

interface ManagePackagesData {
  packages: SessionPackage[];
  stats: PackageStats;
}

const EMPTY_STATS: PackageStats = {
  totalPackagesSold: 0,
  totalRevenue: 0,
  activePackages: 0,
  sessionsRedeemed: 0,
};

export function usePackageManage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SessionPackage | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<ManagePackagesData>({
        packages: [],
        stats: EMPTY_STATS,
      });
    }

    try {
      const [packagesResult, statsResult] = await Promise.all([
        packageService.getCoachPackages(currentUser.id),
        packageService.getCoachPackageStats(currentUser.id),
      ]);
      if (!packagesResult.success) {
        return err(packagesResult.error);
      }
      if (!statsResult.success) {
        return err(statsResult.error);
      }

      return ok<ManagePackagesData>({
        packages: packagesResult.data,
        stats: statsResult.data,
      });
    } catch (loadError) {
      logger.error('Failed to load packages', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load packages.', loadError));
    }
  }, [currentUser?.id]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<ManagePackagesData>({
    load: loadData,
    deps: [currentUser?.id],
    isEmpty: (value) => value.packages.length === 0,
    refetchOnFocus: true,
  });

  const packages = data?.packages ?? [];
  const stats = data?.stats ?? EMPTY_STATS;

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    showToast(editingPackage ? 'Package updated successfully!' : 'Package created successfully!', 'success');
    setEditingPackage(null);
    retry();
  }, [editingPackage, showToast, retry]);

  const handleCreateError = useCallback((error: string) => { showToast(error, 'error'); }, [showToast]);

  const handleEditPackage = useCallback((pkg: SessionPackage) => {
    setEditingPackage(pkg);
    setShowCreateModal(true);
  }, []);

  const handleToggleActive = useCallback(async (pkg: SessionPackage) => {
    try {
      const updatedResult = await packageService.updatePackage(pkg.id, { isActive: !pkg.isActive });
      if (!updatedResult.success) {
        showToast(updatedResult.error.message, 'error');
        return;
      }
      if (updatedResult.data) {
        showToast(pkg.isActive ? 'Package deactivated' : 'Package activated', 'success');
        retry();
      }
    } catch { showToast('Failed to update package', 'error'); }
  }, [showToast, retry]);

  const handleDeletePackage = useCallback((pkg: SessionPackage) => {
    Alert.alert('Delete Package', `Are you sure you want to delete "${pkg.name}"? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const result = await packageService.deletePackage(pkg.id);
          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }
          if (result.data) { showToast('Package deleted', 'success'); retry(); }
        } catch { showToast('Failed to delete package', 'error'); }
      }},
    ]);
  }, [showToast, retry]);

  const openCreateModal = useCallback(() => { setEditingPackage(null); setShowCreateModal(true); }, []);
  const closeModal = useCallback(() => { setShowCreateModal(false); setEditingPackage(null); }, []);

  return {
    packages,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    stats,
    showCreateModal,
    editingPackage,
    handleRefresh: onRefresh,
    handleCreateSuccess,
    handleCreateError,
    handleEditPackage, handleToggleActive, handleDeletePackage,
    openCreateModal, closeModal,
  } satisfies {
    packages: SessionPackage[];
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    stats: PackageStats;
    showCreateModal: boolean;
    editingPackage: SessionPackage | null;
    handleRefresh: () => void;
    handleCreateSuccess: () => void;
    handleCreateError: (error: string) => void;
    handleEditPackage: (pkg: SessionPackage) => void;
    handleToggleActive: (pkg: SessionPackage) => Promise<void>;
    handleDeletePackage: (pkg: SessionPackage) => void;
    openCreateModal: () => void;
    closeModal: () => void;
  };
}
