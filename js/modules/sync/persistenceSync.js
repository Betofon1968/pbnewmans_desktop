import {syncLog} from './syncDebug.js?v=26.106';
const parseStoredJson = (key, fallbackValue) => {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return fallbackValue;
    const parsed = JSON.parse(rawValue);
    return parsed ?? fallbackValue;
  } catch (error) {
    console.warn(`Could not parse localStorage key "${key}", resetting to fallback.`, error);
    try {
      localStorage.removeItem(key);
    } catch (_) {}
    return fallbackValue;
  }
};

export const saveLocalBackupToStorage = (data) => {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      routesByDate: data.routesByDate,
      storesDirectory: data.storesDirectory,
      driversDirectory: data.driversDirectory,
      trucksDirectory: data.trucksDirectory,
      trailersDirectory: data.trailersDirectory,
      tractorsDirectory: data.tractorsDirectory,
      palletTypes: data.palletTypes,
      savedInvoices: data.savedInvoices,
    };

    localStorage.setItem('logistics_backup', JSON.stringify(backup));

    const backupHistory = parseStoredJson('logistics_backup_history', []);
    const safeBackupHistory = Array.isArray(backupHistory) ? backupHistory : [];
    safeBackupHistory.unshift(backup);
    if (safeBackupHistory.length > 5) safeBackupHistory.pop();
    localStorage.setItem('logistics_backup_history', JSON.stringify(safeBackupHistory));
  } catch (e) {
    console.warn('Could not save local backup:', e);
  }
};

export const restoreFromLocalBackup = ({
  backupIndex = 0,
  enterServerUpdate,
  exitServerUpdate,
  setRoutesByDate,
  setStoresDirectory,
  setDriversDirectory,
  setTrucksDirectory,
  setTrailersDirectory,
  setTractorsDirectory,
  setPalletTypes,
  setSavedInvoices,
  hasPendingChanges,
}) => {
  try {
    const backupHistoryRaw = parseStoredJson('logistics_backup_history', []);
    const backupHistory = Array.isArray(backupHistoryRaw) ? backupHistoryRaw : [];

    if (backupHistory.length > backupIndex) {
      const backup = backupHistory[backupIndex];
      if (
        window.confirm(
          `Restore backup from ${new Date(backup.timestamp).toLocaleString('en-US')}?\n\nThis will replace current data with the backup.`
        )
      ) {
        enterServerUpdate();
        try {
          setRoutesByDate(backup.routesByDate || {});
          setStoresDirectory(backup.storesDirectory || []);
          setDriversDirectory(backup.driversDirectory || []);
          setTrucksDirectory(backup.trucksDirectory || []);
          setTrailersDirectory(backup.trailersDirectory || []);
          setTractorsDirectory(backup.tractorsDirectory || []);
          setPalletTypes(backup.palletTypes || []);
          setSavedInvoices(backup.savedInvoices || []);
        } finally {
          setTimeout(() => {
            exitServerUpdate();
            hasPendingChanges.current = true;
          }, 100);
        }
        alert('Backup restored! Data will be saved to cloud shortly.');
        return true;
      }
    } else {
      alert('No backup found at index ' + backupIndex);
    }
  } catch (e) {
    console.error('Could not restore backup:', e);
    alert('Error restoring backup: ' + e.message);
  }

  return false;
};

export const exportBackupJson = ({
  userName,
  APP_VERSION,
  routesByDate,
  storesDirectory,
  driversDirectory,
  trucksDirectory,
  trailersDirectory,
  tractorsDirectory,
  palletTypes,
  savedInvoices,
}) => {
  try {
    const exportObj = {
      exportedAt: new Date().toISOString(),
      exportedBy: userName,
      version: APP_VERSION,
      data: {
        routesByDate,
        storesDirectory,
        driversDirectory,
        trucksDirectory,
        trailersDirectory,
        tractorsDirectory,
        palletTypes,
        savedInvoices,
      },
    };

    const dataStr = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logistics-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Backup downloaded successfully!');
  } catch (e) {
    console.error('Export failed:', e);
    alert('Export failed: ' + e.message);
  }
};

export const saveToSupabasePipeline = async ({
  supabase,
  userName,
  IS_BETA_BUILD,
  APP_VERSION,
  newRoutesByDate,
  newStoresDirectory,
  newDriversDirectory,
  newTrucksDirectory,
  newTrailersDirectory,
  newTractorsDirectory,
  newPalletTypes,
  newSavedInvoices,
  selectedDateRef,
  isInitialLoad,
  isFromServer,
  lastSavedData,
  lastSavedConfig,
  setSyncStatus,
  saveLocalBackup,
  setRoutesByDate,
  setDateRouteCounts,
  updateChannelRef,
  sessionId,
  dirtyFieldsByRoute,
  recentLocalSaveByDateRouteRef,
  clearDirtyFields,
  hasPendingChanges,
  editedStores,
  lastEditTime,
  setLastUpdated,
  setLastSuccessfulSave,
}) => {
  if (!navigator.onLine) {
    syncLog('⚠ Offline - skipping save. Data backed up locally.');
    setSyncStatus('error');
    saveLocalBackup({
      routesByDate: newRoutesByDate,
      storesDirectory: newStoresDirectory,
      driversDirectory: newDriversDirectory,
      trucksDirectory: newTrucksDirectory,
      trailersDirectory: newTrailersDirectory,
      tractorsDirectory: newTractorsDirectory,
      palletTypes: newPalletTypes,
      savedInvoices: newSavedInvoices,
    });
    return;
  }

  if (isInitialLoad.current) {
    syncLog('⚠ Save SKIPPED - initial load in progress');
    return;
  }

  if (isFromServer.current) {
    syncLog('⚠ Save SKIPPED - receiving data from server');
    return;
  }

  syncLog('💾 Save STARTING (row-per-route)...');

  if (lastSavedData.current === null) {
    syncLog('Skipping save - no data loaded from server yet');
    return;
  }

  const newDataStr = JSON.stringify({
    routesByDate: newRoutesByDate,
    storesDirectory: newStoresDirectory,
    driversDirectory: newDriversDirectory,
    trucksDirectory: newTrucksDirectory,
    trailersDirectory: newTrailersDirectory,
    tractorsDirectory: newTractorsDirectory,
    palletTypes: newPalletTypes,
    savedInvoices: newSavedInvoices,
  });

  if (newDataStr === lastSavedData.current) {
    hasPendingChanges.current = false;
    editedStores.current.clear();
    lastEditTime.current = {};
    syncLog('💾 No-op save detected; cleared pending edit protection');
    return;
  }

  saveLocalBackup({
    routesByDate: newRoutesByDate,
    storesDirectory: newStoresDirectory,
    driversDirectory: newDriversDirectory,
    trucksDirectory: newTrucksDirectory,
    trailersDirectory: newTrailersDirectory,
    tractorsDirectory: newTractorsDirectory,
    palletTypes: newPalletTypes,
    savedInvoices: newSavedInvoices,
  });

  const previousSavedData = lastSavedData.current;
  lastSavedData.current = newDataStr;
  setSyncStatus('syncing');

  try {
    const currentDate = selectedDateRef.current;
    const currentRoutes = newRoutesByDate[currentDate] || [];
    syncLog(`💾 Evaluating route changes for ${currentDate} (${currentRoutes.length} routes loaded)...`);

    const generateUUID = () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

    let previousDateRoutes = [];
    try {
      const previousObj = JSON.parse(previousSavedData || '{}');
      previousDateRoutes = previousObj?.routesByDate?.[currentDate] || [];
    } catch (e) {
      previousDateRoutes = [];
    }

    const previousById = new Map(previousDateRoutes.map((r) => [r.id, r]));
    const dirtyRouteIdsSet = new Set(Object.keys(dirtyFieldsByRoute?.current || {}));
    const areRouteFieldsEqual = (route, previousRoute, idx) => {
      if (!previousRoute) return false;
      const currentOrder = route.route_order !== undefined ? route.route_order : idx;
      const previousOrder = previousRoute.route_order !== undefined ? previousRoute.route_order : idx;
      if ((route.driver || '') !== (previousRoute.driver || '')) return false;
      if ((route.truck || '') !== (previousRoute.truck || '')) return false;
      if ((route.trailer || '') !== (previousRoute.trailer || '')) return false;
      if ((route.palletCount || 8) !== (previousRoute.palletCount || 8)) return false;
      if ((route.confirmed || false) !== (previousRoute.confirmed || false)) return false;
      if ((route.confirmedBy || null) !== (previousRoute.confirmedBy || null)) return false;
      if ((route.confirmedAt || null) !== (previousRoute.confirmedAt || null)) return false;
      if ((route.pickupAtPB || false) !== (previousRoute.pickupAtPB || false)) return false;
      if (currentOrder !== previousOrder) return false;
      return JSON.stringify(route.stores || []) === JSON.stringify(previousRoute.stores || []);
    };

    const changedRoutes = currentRoutes.filter((route, idx) => {
      if (dirtyRouteIdsSet.has(String(route.id))) return true;
      const previousRoute = previousById.get(route.id);
      return !areRouteFieldsEqual(route, previousRoute, idx);
    });

    syncLog(`💾 Batch saving ${changedRoutes.length} dirty routes for ${currentDate}...`);

    const routesPayload = changedRoutes.map((route, idx) => ({
      id: route.id && typeof route.id === 'string' && route.id.includes('-') ? route.id : generateUUID(),
      route_date: currentDate,
      route_order: route.route_order !== undefined ? route.route_order : currentRoutes.findIndex((r) => r.id === route.id),
      driver: route.driver || null,
      truck: route.truck || null,
      trailer: route.trailer || null,
      stores: route.stores || [],
      pallet_count: route.palletCount || 8,
      confirmed: route.confirmed || false,
      confirmed_by: route.confirmedBy || null,
      confirmed_at: route.confirmedAt || null,
      pickup_at_pb: route.pickupAtPB || false,
      updated_by: userName || 'Anonymous',
    }));

    if (routesPayload.length > 0) {
      const { error: routesError } = await supabase
        .from('logistics_routes')
        .upsert(routesPayload, { onConflict: 'id', ignoreDuplicates: false });

      if (routesError) {
        console.error('Error batch saving routes:', routesError);
        throw routesError;
      }

      const needsIdUpdate = changedRoutes.some((route, idx) => route.id !== routesPayload[idx].id);
      if (needsIdUpdate) {
        const idReplacements = {};
        changedRoutes.forEach((route, idx) => {
          if (route.id !== routesPayload[idx].id) {
            idReplacements[route.id] = routesPayload[idx].id;
          }
        });
        setRoutesByDate((prev) => ({
          ...prev,
          [currentDate]: currentRoutes.map((route) =>
            idReplacements[route.id] ? { ...route, id: idReplacements[route.id] } : route
          ),
        }));
      }

      if (recentLocalSaveByDateRouteRef?.current) {
        const nowTs = Date.now();
        const currentDateMap = { ...(recentLocalSaveByDateRouteRef.current[currentDate] || {}) };
        routesPayload.forEach((route) => {
          currentDateMap[route.id] = nowTs;
        });
        Object.keys(currentDateMap).forEach((routeId) => {
          if (nowTs - currentDateMap[routeId] > 30000) delete currentDateMap[routeId];
        });
        recentLocalSaveByDateRouteRef.current[currentDate] = currentDateMap;
      }
    } else {
      syncLog(`💾 No dirty routes to upsert for ${currentDate}`);
    }

    syncLog(`✅ Batch saved ${routesPayload.length} routes for ${currentDate}`);
    setDateRouteCounts((prev) => ({ ...prev, [currentDate]: currentRoutes.length }));

    if (routesPayload.length > 0 && updateChannelRef.current) {
      try {
        await updateChannelRef.current.send({
          type: 'broadcast',
          event: 'routes-changed',
          payload: {
            routeDate: currentDate,
            updatedBy: userName,
            routeIds: routesPayload.map((r) => r.id),
            ts: Date.now(),
            sessionId: sessionId.current,
          },
        });
        syncLog('📡 Routes change notification sent for', currentDate);
      } catch (broadcastErr) {
        console.warn('Broadcast failed (non-critical):', broadcastErr);
      }
    }

    const newConfigStr = JSON.stringify({
      stores_directory: newStoresDirectory,
      drivers_directory: newDriversDirectory,
      trucks_directory: newTrucksDirectory,
      trailers_directory: newTrailersDirectory,
      tractors_directory: newTractorsDirectory,
      pallet_types: newPalletTypes,
      saved_invoices: newSavedInvoices,
    });

    if (newConfigStr !== lastSavedConfig.current) {
      syncLog('💾 Saving config to logistics_config table...');

      const configPayload = {
        id: 'main',
        stores_directory: newStoresDirectory,
        drivers_directory: newDriversDirectory,
        trucks_directory: newTrucksDirectory,
        trailers_directory: newTrailersDirectory,
        tractors_directory: newTractorsDirectory,
        pallet_types: newPalletTypes,
        saved_invoices: newSavedInvoices,
        updated_by: userName || 'Anonymous',
      };

      if (!IS_BETA_BUILD) {
        configPayload.app_version = APP_VERSION;
      }

      const { error: configError } = await supabase.from('logistics_config').upsert(configPayload);
      if (configError) {
        console.error('Error saving config:', configError);
        throw configError;
      }

      lastSavedConfig.current = newConfigStr;
      syncLog('✅ Config saved successfully');
    } else {
      syncLog('💾 Config unchanged, skipping save');
    }

    currentRoutes.forEach((route) => {
      clearDirtyFields(route.id);
    });

    syncLog('🧹 Dirty fields cleared after save');

    setTimeout(() => {
      hasPendingChanges.current = false;
      editedStores.current.clear();
      lastEditTime.current = {};
      syncLog('Protection window ended');
    }, 3000);

    setSyncStatus('synced');
    setLastUpdated(new Date().toISOString());
    setLastSuccessfulSave(new Date().toISOString());
  } catch (error) {
    console.error('Error saving:', error);
    lastSavedData.current = previousSavedData;

    setTimeout(() => {
      hasPendingChanges.current = false;
      editedStores.current.clear();
      lastEditTime.current = {};
    }, 3000);

    setSyncStatus('error');
    alert('Error saving data: ' + error.message + '\n\nYour data is backed up locally.');
  }
};

export const setupDebouncedSave = ({
  isInitialLoad,
  isFromServer,
  hasPendingChanges,
  saveTimeoutRef,
  pendingSaveDataRef,
  routesByDate,
  storesDirectory,
  driversDirectory,
  trucksDirectory,
  trailersDirectory,
  tractorsDirectory,
  palletTypes,
  savedInvoices,
  saveToSupabase,
}) => {
  if (isInitialLoad.current || isFromServer.current || !hasPendingChanges.current) {
    return undefined;
  }

  syncLog('💾 Debounce: Setting 2 second save timer');

  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  const currentRoutesByDate = routesByDate;
  const currentStoresDirectory = storesDirectory;
  const currentDriversDirectory = driversDirectory;
  const currentTrucksDirectory = trucksDirectory;
  const currentTrailersDirectory = trailersDirectory;
  const currentTractorsDirectory = tractorsDirectory;
  const currentPalletTypes = palletTypes;
  const currentSavedInvoices = savedInvoices;

  pendingSaveDataRef.current = () => {
    syncLog('💾 Pending save executed');
    saveToSupabase(
      currentRoutesByDate,
      currentStoresDirectory,
      currentDriversDirectory,
      currentTrucksDirectory,
      currentTrailersDirectory,
      currentTractorsDirectory,
      currentPalletTypes,
      currentSavedInvoices
    );
  };

  saveTimeoutRef.current = setTimeout(() => {
    syncLog('💾 Debounce: Timer fired, calling saveToSupabase');
    saveToSupabase(
      currentRoutesByDate,
      currentStoresDirectory,
      currentDriversDirectory,
      currentTrucksDirectory,
      currentTrailersDirectory,
      currentTractorsDirectory,
      currentPalletTypes,
      currentSavedInvoices
    );
    pendingSaveDataRef.current = null;
  }, 2000);

  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
};
