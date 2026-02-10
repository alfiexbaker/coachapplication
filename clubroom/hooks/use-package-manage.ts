/**
 * Hook for the Manage Packages screen.
 * Manages packages list, stats, CRUD operations, and create/edit modal.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { packageService } from '@/services/package-service';
import { createLogger } from '@/utils/logger';
import type { SessionPackage } from '@/constants/types';

const logger = createLogger('ManagePackagesScreen');

export function usePackageManage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SessionPackage | null>(null);
  const [stats, setStats] = useState({ totalPackagesSold: 0, totalRevenue: 0, activePackages: 0, sessionsRedeemed: 0 });

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [packagesResult, statsResult] = await Promise.all([
        packageService.getCoachPackages(currentUser.id),
        packageService.getCoachPackageStats(currentUser.id),
      ]);
      if (!packagesResult.success) {
        showToast(packagesResult.error.message, 'error');
        setPackages([]);
        return;
      }
      if (!statsResult.success) {
        showToast(statsResult.error.message, 'error');
        setStats({ totalPackagesSold: 0, totalRevenue: 0, activePackages: 0, sessionsRedeemed: 0 });
        return;
      }
      setPackages(packagesResult.data);
      setStats(statsResult.data);
    } catch (error) {
      logger.error('Failed to load packages:', error);
      showToast('Failed to load packages', 'error');
    }
  }, [currentUser?.id, showToast]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    showToast(editingPackage ? 'Package updated successfully!' : 'Package created successfully!', 'success');
    setEditingPackage(null);
    loadData();
  }, [editingPackage, showToast, loadData]);

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
        loadData();
      }
    } catch { showToast('Failed to update package', 'error'); }
  }, [showToast, loadData]);

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
          if (result.data) { showToast('Package deleted', 'success'); loadData(); }
        } catch { showToast('Failed to delete package', 'error'); }
      }},
    ]);
  }, [showToast, loadData]);

  const openCreateModal = useCallback(() => { setEditingPackage(null); setShowCreateModal(true); }, []);
  const closeModal = useCallback(() => { setShowCreateModal(false); setEditingPackage(null); }, []);

  return {
    packages, refreshing, stats, showCreateModal, editingPackage,
    handleRefresh, handleCreateSuccess, handleCreateError,
    handleEditPackage, handleToggleActive, handleDeletePackage,
    openCreateModal, closeModal,
  };
}
