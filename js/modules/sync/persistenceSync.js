import {syncLog} from './syncDebug.js?v=26.119';
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

const FAILED_SAVE_QUEUE_KEY = 'logistics_failed_save_queue';
const SAVE_RETRY_DELAYS_MS = [1000, 2000, 4000];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MUTATION_QUEUE_KEY = 'logistics_mutation_queue_v1';
const MAX_MUTATION_QUEUE_ITEMS = 100;

const ROUTE_CLIENT_TO_DB_FIELD = {
  driver: 'driver',
  truck: 'truck',
  trailer: 'trailer',
  stores: 'stores',
  palletCount: 'pallet_count',
  confirmed: 'confirmed',
  confirmedBy: 'confirmed_by',
  confirmedAt: 'confirmed_at',
  pickupAtPB: 'pickup_at_pb',
  route_order: 'route_order',
};

const ALL_ROUTE_DB_FIELDS = [
  'driver',
  'truck',
  'trailer',
  'stores',
  'pallet_count',
  'confirmed',
  'confirmed_by',
  'confirmed_at',
  'pickup_at_pb',
  'route_order',
];

const writeFailedSaveQueue = (queue) => {
  try {
    localStorage.setItem(FAILED_SAVE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('Could not persist failed save queue:', error);
  }
};

const readFailedSaveQueue = () => {
  const parsed = parseStoredJson(FAILED_SAVE_QUEUE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
};

const queueFailedSaveSnapshot = (snapshot, reason = 'save-failed') => {
  // Keep only the latest full-state snapshot; newer state supersedes older failed saves.
  const queueItem = {
    ...snapshot,
    queuedAt: new Date().toISOString(),
    reason,
  };
  writeFailedSaveQueue([queueItem]);
  syncLog('🗂 Failed save queued for reconnect retry');
};

const clearFailedSaveQueue = () => {
  try {
    localStorage.removeItem(FAILED_SAVE_QUEUE_KEY);
  } catch (error) {
    console.warn('Could not clear failed save queue:', error);
  }
};

const readMutationQueue = () => {
  const parsed = parseStoredJson(MUTATION_QUEUE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
};

const writeMutationQueue = (queue) => {
  try {
    localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('Could not persist mutation queue:', error);
  }
};

const clearMutationQueue = () => {
  try {
    localStorage.removeItem(MUTATION_QUEUE_KEY);
  } catch (error) {
    console.warn('Could not clear mutation queue:', error);
  }
};

const generateQueueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const buildRouteUpsertPayload = (route, routeDate, currentRoutes) => ({
  id:
    route.id && typeof route.id === 'string' && route.id.includes('-')
      ? route.id
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }),
  route_date: routeDate,
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
});

const getChangedRouteClientFields = (route, previousRoute, idx) => {
  const changed = new Set();
  if (!previousRoute) {
    Object.keys(ROUTE_CLIENT_TO_DB_FIELD).forEach((fieldName) => changed.add(fieldName));
    return changed;
  }

  const currentOrder = route.route_order !== undefined ? route.route_order : idx;
  const previousOrder = previousRoute.route_order !== undefined ? previousRoute.route_order : idx;
  if ((route.driver || '') !== (previousRoute.driver || '')) changed.add('driver');
  if ((route.truck || '') !== (previousRoute.truck || '')) changed.add('truck');
  if ((route.trailer || '') !== (previousRoute.trailer || '')) changed.add('trailer');
  if ((route.palletCount || 8) !== (previousRoute.palletCount || 8)) changed.add('palletCount');
  if ((route.confirmed || false) !== (previousRoute.confirmed || false)) changed.add('confirmed');
  if ((route.confirmedBy || null) !== (previousRoute.confirmedBy || null)) changed.add('confirmedBy');
  if ((route.confirmedAt || null) !== (previousRoute.confirmedAt || null)) changed.add('confirmedAt');
  if ((route.pickupAtPB || false) !== (previousRoute.pickupAtPB || false)) changed.add('pickupAtPB');
  if (currentOrder !== previousOrder) changed.add('route_order');
  if (JSON.stringify(route.stores || []) !== JSON.stringify(previousRoute.stores || [])) changed.add('stores');
  return changed;
};

const buildMutationOperationForCurrentState = ({
  selectedDateRef,
  userName,
  APP_VERSION,
  IS_BETA_BUILD,
  newRoutesByDate,
  newStoresDirectory,
  newDriversDirectory,
  newTrucksDirectory,
  newTrailersDirectory,
  newTractorsDirectory,
  newPalletTypes,
  newSavedInvoices,
  lastSavedData,
  lastSavedConfig,
  dirtyFieldsByRoute,
  dirtyFieldUpdatedAtByRouteRef,
}) => {
  const routeDate = selectedDateRef?.current;
  if (!routeDate) return null;

  const queuedAt = Date.now();
  const currentRoutes = newRoutesByDate?.[routeDate] || [];

  let previousDateRoutes = [];
  try {
    const previousObj = JSON.parse(lastSavedData?.current || '{}');
    previousDateRoutes = previousObj?.routesByDate?.[routeDate] || [];
  } catch (_) {
    previousDateRoutes = [];
  }

  const previousById = new Map(previousDateRoutes.map((r) => [String(r.id), r]));
  const routeMutations = [];

  currentRoutes.forEach((route, idx) => {
    const routeId = String(route.id);
    const payload = buildRouteUpsertPayload(route, routeDate, currentRoutes);
    const manuallyDirty = new Set(dirtyFieldsByRoute?.current?.[routeId] || []);
    const changedByDiff = getChangedRouteClientFields(route, previousById.get(routeId), idx);
    const dirtyClientFields = new Set([...manuallyDirty, ...changedByDiff]);
    if (dirtyClientFields.size === 0) return;

    const sourceTimestamps = dirtyFieldUpdatedAtByRouteRef?.current?.[routeId] || {};
    const dirtyDbFields = new Set();
    const dirtyDbFieldTimestamps = {};

    dirtyClientFields.forEach((clientField) => {
      const dbField = ROUTE_CLIENT_TO_DB_FIELD[clientField];
      if (!dbField) return;
      dirtyDbFields.add(dbField);
      const ts = Number(sourceTimestamps[clientField]) || queuedAt;
      dirtyDbFieldTimestamps[dbField] = ts;
    });

    if (dirtyDbFields.size === 0) {
      ALL_ROUTE_DB_FIELDS.forEach((dbField) => {
        dirtyDbFields.add(dbField);
        dirtyDbFieldTimestamps[dbField] = queuedAt;
      });
    }

    routeMutations.push({
      id: payload.id,
      payload: {
        ...payload,
        updated_by: userName || 'Anonymous',
      },
      dirtyFields: Array.from(dirtyDbFields),
      dirtyFieldTimestamps: dirtyDbFieldTimestamps,
    });
  });

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

  const newConfigStr = JSON.stringify({
    stores_directory: newStoresDirectory,
    drivers_directory: newDriversDirectory,
    trucks_directory: newTrucksDirectory,
    trailers_directory: newTrailersDirectory,
    tractors_directory: newTractorsDirectory,
    pallet_types: newPalletTypes,
    saved_invoices: newSavedInvoices,
  });
  let previousConfig = {};
  try {
    previousConfig = JSON.parse(lastSavedConfig?.current || '{}') || {};
  } catch (_) {
    previousConfig = {};
  }

  let configMutation = null;
  if (newConfigStr !== (lastSavedConfig?.current || null)) {
    const candidateKeys = [
      'stores_directory',
      'drivers_directory',
      'trucks_directory',
      'trailers_directory',
      'tractors_directory',
      'pallet_types',
      'saved_invoices',
    ];
    if (!IS_BETA_BUILD) candidateKeys.push('app_version');

    const changedKeys = candidateKeys.filter(
      (key) => JSON.stringify(configPayload[key] ?? null) !== JSON.stringify(previousConfig[key] ?? null)
    );
    configMutation = {
      payload: configPayload,
      changedKeys,
    };
  }

  if (routeMutations.length === 0 && (!configMutation || configMutation.changedKeys.length === 0)) {
    return null;
  }

  return {
    id: generateQueueId(),
    type: 'save-batch',
    queuedAt,
    routeDate,
    routeMutations,
    configMutation,
    updatedBy: userName || 'Anonymous',
  };
};

const enqueueMutationOperation = (operation) => {
  if (!operation) return;
  const queue = readMutationQueue();
  const mergedQueue = [...queue];
  const last = mergedQueue[mergedQueue.length - 1];

  if (last && last.type === operation.type && last.routeDate === operation.routeDate) {
    const mergedByRouteId = {};
    (last.routeMutations || []).forEach((item) => {
      mergedByRouteId[item.id] = item;
    });
    (operation.routeMutations || []).forEach((item) => {
      mergedByRouteId[item.id] = item;
    });
    const previousConfig = last.configMutation;
    const incomingConfig = operation.configMutation;
    const mergedConfig =
      previousConfig || incomingConfig
        ? {
            payload: incomingConfig?.payload || previousConfig?.payload,
            changedKeys: Array.from(new Set([...(previousConfig?.changedKeys || []), ...(incomingConfig?.changedKeys || [])])),
          }
        : null;

    mergedQueue[mergedQueue.length - 1] = {
      ...last,
      queuedAt: operation.queuedAt,
      routeMutations: Object.values(mergedByRouteId),
      configMutation: mergedConfig,
      updatedBy: operation.updatedBy || last.updatedBy,
    };
  } else {
    mergedQueue.push(operation);
  }

  if (mergedQueue.length > MAX_MUTATION_QUEUE_ITEMS) {
    mergedQueue.splice(0, mergedQueue.length - MAX_MUTATION_QUEUE_ITEMS);
  }
  writeMutationQueue(mergedQueue);
  syncLog(`🗂 Mutation queued (pending ${mergedQueue.length})`);
};

const resolveRouteConflict = ({ mutation, serverRow, queuedAt, fallbackUpdatedBy }) => {
  if (!serverRow) {
    return mutation.payload;
  }

  const serverUpdatedAtMs = Date.parse(serverRow.updated_at || 0) || 0;
  const hasConcurrentServerChange = serverUpdatedAtMs > Number(queuedAt || 0);
  if (!hasConcurrentServerChange) {
    return mutation.payload;
  }

  const dirtyFields = Array.isArray(mutation.dirtyFields) ? mutation.dirtyFields : [];
  const dirtyFieldSet = new Set(dirtyFields.length > 0 ? dirtyFields : ALL_ROUTE_DB_FIELDS);
  const resolved = {
    id: serverRow.id,
    route_date: mutation.payload.route_date || serverRow.route_date,
    route_order: serverRow.route_order ?? 0,
    driver: serverRow.driver || null,
    truck: serverRow.truck || null,
    trailer: serverRow.trailer || null,
    stores: serverRow.stores || [],
    pallet_count: serverRow.pallet_count || 8,
    confirmed: serverRow.confirmed || false,
    confirmed_by: serverRow.confirmed_by || null,
    confirmed_at: serverRow.confirmed_at || null,
    pickup_at_pb: serverRow.pickup_at_pb || false,
    updated_by: fallbackUpdatedBy,
  };

  dirtyFieldSet.forEach((fieldName) => {
    if (Object.prototype.hasOwnProperty.call(mutation.payload, fieldName)) {
      resolved[fieldName] = mutation.payload[fieldName];
    }
  });

  return resolved;
};

const resolveConfigConflict = ({ configMutation, serverConfig, queuedAt, fallbackUpdatedBy }) => {
  if (!configMutation || !configMutation.payload) return null;
  if (!serverConfig) return configMutation.payload;

  const serverUpdatedAtMs = Date.parse(serverConfig.updated_at || 0) || 0;
  const hasConcurrentServerChange = serverUpdatedAtMs > Number(queuedAt || 0);
  if (!hasConcurrentServerChange) {
    return configMutation.payload;
  }

  const changedKeys = Array.isArray(configMutation.changedKeys) ? configMutation.changedKeys : [];
  const resolved = {
    ...serverConfig,
    id: 'main',
    updated_by: fallbackUpdatedBy,
  };
  changedKeys.forEach((key) => {
    resolved[key] = configMutation.payload[key];
  });
  return resolved;
};

const replayMutationQueueOnReconnect = async ({
  supabase,
  userName,
  setSyncStatus,
  updateChannelRef,
  sessionId,
}) => {
  const queue = readMutationQueue();
  if (queue.length === 0) return false;

  syncLog(`🔁 Replaying ${queue.length} queued mutation batch(es)...`);
  if (typeof setSyncStatus === 'function') {
    setSyncStatus('syncing');
  }

  const remaining = [...queue];
  while (remaining.length > 0) {
    const operation = remaining[0];
    try {
      const routeMutations = Array.isArray(operation.routeMutations) ? operation.routeMutations : [];
      if (routeMutations.length > 0) {
        const routeIds = routeMutations.map((m) => m?.payload?.id).filter(Boolean);
        const existingById = new Map();
        if (routeIds.length > 0) {
          const { data: existingRows, error: existingRowsError } = await supabase
            .from('logistics_routes')
            .select('id,route_date,route_order,driver,truck,trailer,stores,pallet_count,confirmed,confirmed_by,confirmed_at,pickup_at_pb,updated_at,updated_by')
            .in('id', routeIds);
          if (existingRowsError) throw existingRowsError;
          (existingRows || []).forEach((row) => existingById.set(row.id, row));
        }

        const resolvedPayload = routeMutations.map((mutation) =>
          resolveRouteConflict({
            mutation,
            serverRow: existingById.get(mutation?.payload?.id),
            queuedAt: operation.queuedAt,
            fallbackUpdatedBy: userName || operation.updatedBy || 'Anonymous',
          })
        );

        if (resolvedPayload.length > 0) {
          const { error: upsertError } = await supabase
            .from('logistics_routes')
            .upsert(resolvedPayload, { onConflict: 'id', ignoreDuplicates: false });
          if (upsertError) throw upsertError;
        }

        if (updateChannelRef?.current) {
          try {
            await updateChannelRef.current.send({
              type: 'broadcast',
              event: 'routes-changed',
              payload: {
                routeDate: operation.routeDate,
                updatedBy: userName || operation.updatedBy || 'Anonymous',
                routeIds: resolvedPayload.map((r) => r.id),
                ts: Date.now(),
                sessionId: sessionId?.current,
              },
            });
          } catch (broadcastErr) {
            console.warn('Queued mutation broadcast failed (non-critical):', broadcastErr);
          }
        }
      }

      if (operation.configMutation && operation.configMutation.changedKeys?.length > 0) {
        const { data: currentConfig, error: currentConfigError } = await supabase
          .from('logistics_config')
          .select('*')
          .eq('id', 'main')
          .single();
        if (currentConfigError && currentConfigError.code !== 'PGRST116') {
          throw currentConfigError;
        }

        const resolvedConfig = resolveConfigConflict({
          configMutation: operation.configMutation,
          serverConfig: currentConfig || null,
          queuedAt: operation.queuedAt,
          fallbackUpdatedBy: userName || operation.updatedBy || 'Anonymous',
        });
        if (resolvedConfig) {
          const { error: configUpsertError } = await supabase.from('logistics_config').upsert(resolvedConfig);
          if (configUpsertError) throw configUpsertError;
        }
      }

      remaining.shift();
      writeMutationQueue(remaining);
      syncLog(`✅ Replayed queued mutation batch ${operation.id}`);
    } catch (error) {
      console.error('Failed replaying queued mutation batch:', operation?.id, error);
      writeMutationQueue(remaining);
      if (typeof setSyncStatus === 'function') {
        setSyncStatus('error');
      }
      return false;
    }
  }

  clearMutationQueue();
  syncLog('✅ All queued mutations replayed');
  return true;
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
  dirtyFieldUpdatedAtByRouteRef,
  recentLocalSaveByDateRouteRef,
  clearDirtyFields,
  acknowledgeDirtyFieldsSaved,
  hasPendingChanges,
  editedStores,
  lastEditTime,
  setLastUpdated,
  setLastSuccessfulSave,
}) => {
  const saveSnapshot = {
    routesByDate: newRoutesByDate,
    storesDirectory: newStoresDirectory,
    driversDirectory: newDriversDirectory,
    trucksDirectory: newTrucksDirectory,
    trailersDirectory: newTrailersDirectory,
    tractorsDirectory: newTractorsDirectory,
    palletTypes: newPalletTypes,
    savedInvoices: newSavedInvoices,
  };

  if (!navigator.onLine) {
    syncLog('⚠ Offline - skipping save. Data backed up locally.');
    setSyncStatus('error');
    saveLocalBackup(saveSnapshot);
    if (lastSavedData.current !== null) {
      const offlineMutation = buildMutationOperationForCurrentState({
        selectedDateRef,
        userName,
        APP_VERSION,
        IS_BETA_BUILD,
        newRoutesByDate,
        newStoresDirectory,
        newDriversDirectory,
        newTrucksDirectory,
        newTrailersDirectory,
        newTractorsDirectory,
        newPalletTypes,
        newSavedInvoices,
        lastSavedData,
        lastSavedConfig,
        dirtyFieldsByRoute,
        dirtyFieldUpdatedAtByRouteRef,
      });
      enqueueMutationOperation(offlineMutation);
    }
    queueFailedSaveSnapshot(saveSnapshot, 'offline-skip');
    return false;
  }

  if (isInitialLoad.current) {
    syncLog('⚠ Save SKIPPED - initial load in progress');
    return false;
  }

  if (isFromServer.current) {
    syncLog('⚠ Save SKIPPED - receiving data from server');
    return false;
  }

  syncLog('💾 Save STARTING (row-per-route)...');

  if (lastSavedData.current === null) {
    syncLog('Skipping save - no data loaded from server yet');
    return false;
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
    clearFailedSaveQueue();
    syncLog('💾 No-op save detected; cleared pending edit protection');
    return true;
  }

  saveLocalBackup(saveSnapshot);

  const previousSavedData = lastSavedData.current;
  lastSavedData.current = newDataStr;
  setSyncStatus('syncing');

  const runSaveAttempt = async () => {
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

      if (typeof acknowledgeDirtyFieldsSaved === 'function') {
        const acknowledgedAt = Date.now();
        routesPayload.forEach((savedRoute, idx) => {
          acknowledgeDirtyFieldsSaved(savedRoute.id, acknowledgedAt);
          const originalRouteId = changedRoutes[idx]?.id;
          if (originalRouteId && originalRouteId !== savedRoute.id) {
            acknowledgeDirtyFieldsSaved(originalRouteId, acknowledgedAt);
          }
        });
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

    const saveAcknowledgedAt = Date.now();
    currentRoutes.forEach((route) => {
      if (typeof acknowledgeDirtyFieldsSaved === 'function') {
        acknowledgeDirtyFieldsSaved(route.id, saveAcknowledgedAt);
      }
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
  };

  for (let attempt = 0; attempt <= SAVE_RETRY_DELAYS_MS.length; attempt++) {
    try {
      await runSaveAttempt();
      clearFailedSaveQueue();
      clearMutationQueue();
      return true;
    } catch (error) {
      const hasRetryLeft = attempt < SAVE_RETRY_DELAYS_MS.length;
      if (!hasRetryLeft) {
        console.error('Error saving after retries:', error);
        lastSavedData.current = previousSavedData;
        const failedMutation = buildMutationOperationForCurrentState({
          selectedDateRef,
          userName,
          APP_VERSION,
          IS_BETA_BUILD,
          newRoutesByDate,
          newStoresDirectory,
          newDriversDirectory,
          newTrucksDirectory,
          newTrailersDirectory,
          newTractorsDirectory,
          newPalletTypes,
          newSavedInvoices,
          lastSavedData,
          lastSavedConfig,
          dirtyFieldsByRoute,
          dirtyFieldUpdatedAtByRouteRef,
        });
        enqueueMutationOperation(failedMutation);
        queueFailedSaveSnapshot(saveSnapshot, 'save-error');

        setTimeout(() => {
          hasPendingChanges.current = false;
          editedStores.current.clear();
          lastEditTime.current = {};
        }, 3000);

        setSyncStatus('error');
        alert(
          'Error saving data after retry attempts: ' +
            error.message +
            '\n\nYour latest data was queued and will retry automatically when the connection is restored.'
        );
        return false;
      }

      const retryDelayMs = SAVE_RETRY_DELAYS_MS[attempt];
      console.warn(
        `Save attempt ${attempt + 1} failed. Retrying in ${Math.round(retryDelayMs / 1000)}s...`,
        error
      );
      syncLog(`🔁 Save retry ${attempt + 2}/${SAVE_RETRY_DELAYS_MS.length + 1} in ${retryDelayMs}ms`);
      await wait(retryDelayMs);
    }
  }

  return false;
};

export const retryQueuedSavesOnReconnect = async ({
  saveToSupabase,
  setSyncStatus,
  supabase,
  userName,
  updateChannelRef,
  sessionId,
}) => {
  if (!navigator.onLine) return false;
  let replayedAnything = false;

  if (supabase) {
    const didReplayMutations = await replayMutationQueueOnReconnect({
      supabase,
      userName,
      setSyncStatus,
      updateChannelRef,
      sessionId,
    });
    replayedAnything = replayedAnything || didReplayMutations;
    if (readMutationQueue().length > 0) {
      // Keep snapshot fallback untouched until mutation queue is fully drained.
      return replayedAnything;
    }
  }

  const queue = readFailedSaveQueue();
  if (queue.length === 0) return replayedAnything;

  const queuedSnapshot = queue[0];
  if (!queuedSnapshot || typeof queuedSnapshot !== 'object') {
    clearFailedSaveQueue();
    return replayedAnything;
  }

  syncLog(
    `🔁 Replaying queued save from ${queuedSnapshot.queuedAt || 'unknown time'} (${queuedSnapshot.reason || 'unknown'})`
  );
  if (typeof setSyncStatus === 'function') {
    setSyncStatus('syncing');
  }

  try {
    const didSave = await saveToSupabase(
      queuedSnapshot.routesByDate || {},
      queuedSnapshot.storesDirectory || [],
      queuedSnapshot.driversDirectory || [],
      queuedSnapshot.trucksDirectory || [],
      queuedSnapshot.trailersDirectory || [],
      queuedSnapshot.tractorsDirectory || [],
      queuedSnapshot.palletTypes || [],
      queuedSnapshot.savedInvoices || []
    );

    if (didSave) {
      clearFailedSaveQueue();
      syncLog('✅ Queued save replayed successfully after reconnect');
      return true;
    }

    syncLog('⚠ Queued save replay skipped or deferred');
    return false;
  } catch (error) {
    console.error('Queued save replay failed:', error);
    return replayedAnything;
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
