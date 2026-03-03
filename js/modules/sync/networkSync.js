import {syncLog} from './syncDebug.js?v=26.120';
export const setupOnlineOfflineSync = ({
  supabase,
  offlineTimestamp,
  setIsOnline,
  setSyncStatus,
  setNeedsReload,
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
  setLastUpdated,
  lastSavedData,
}) => {
  const handleOffline = () => {
    syncLog('⚠ Connection lost!');
    setIsOnline(false);
    offlineTimestamp.current = Date.now();
    setSyncStatus('error');
  };

  const handleOnline = async () => {
    syncLog('🔄 Connection restored! Checking for data updates...');
    setIsOnline(true);

    const wasOfflineMs = offlineTimestamp.current ? Date.now() - offlineTimestamp.current : 0;
    const wasOfflineSec = Math.round(wasOfflineMs / 1000);

    if (wasOfflineMs > 30000) {
      syncLog(`Was offline for ${wasOfflineSec} seconds. Forcing data reload to prevent overwrites.`);
      setNeedsReload(true);
      setSyncStatus('connecting');

      try {
        const { data: configData, error: configError } = await supabase
          .from('logistics_config')
          .select('stores_directory,drivers_directory,trucks_directory,trailers_directory,tractors_directory,pallet_types,saved_invoices,updated_at')
          .eq('id', 'main')
          .single();

        if (configError) {
          console.error('Config reload error after reconnect:', configError);
        }

        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 30);

        const startDateStr = startDate.toLocaleDateString('en-CA');
        const endDateStr = endDate.toLocaleDateString('en-CA');

        const { data: routesData, error: routesError } = await supabase
          .from('logistics_routes')
          .select('id,route_date,driver,truck,trailer,stores,pallet_count,confirmed,confirmed_by,pickup_at_pb,route_order')
          .gte('route_date', startDateStr)
          .lte('route_date', endDateStr)
          .order('route_date', { ascending: false })
          .order('route_order', { ascending: true });

        if (routesError) throw routesError;

        enterServerUpdate();
        try {
          const routesByDateObj = {};
          if (routesData && routesData.length > 0) {
            routesData.forEach((route) => {
              const date = route.route_date;
              if (!routesByDateObj[date]) routesByDateObj[date] = [];
              routesByDateObj[date].push({
                id: route.id,
                driver: route.driver,
                truck: route.truck,
                trailer: route.trailer,
                stores: route.stores || [],
                palletCount: route.pallet_count || 8,
                confirmed: route.confirmed,
                confirmedBy: route.confirmed_by,
                pickupAtPB: route.pickup_at_pb || false,
                route_order: route.route_order,
              });
            });
            setRoutesByDate(routesByDateObj);
          }

          if (configData) {
            if (configData.stores_directory?.length > 0) setStoresDirectory(configData.stores_directory);
            if (configData.drivers_directory?.length > 0) setDriversDirectory(configData.drivers_directory);
            if (configData.trucks_directory?.length > 0) setTrucksDirectory(configData.trucks_directory);
            if (configData.trailers_directory?.length > 0) setTrailersDirectory(configData.trailers_directory);
            if (configData.tractors_directory?.length > 0) setTractorsDirectory(configData.tractors_directory);
            if (configData.pallet_types?.length > 0) setPalletTypes(configData.pallet_types);
            if (configData.saved_invoices?.length > 0) setSavedInvoices(configData.saved_invoices);
            setLastUpdated(configData.updated_at);
          }

          lastSavedData.current = JSON.stringify({
            routesByDate: routesByDateObj,
            storesDirectory: configData?.stores_directory || [],
            driversDirectory: configData?.drivers_directory || [],
            trucksDirectory: configData?.trucks_directory || [],
            trailersDirectory: configData?.trailers_directory || [],
            tractorsDirectory: configData?.tractors_directory || [],
            palletTypes: configData?.pallet_types || [],
            savedInvoices: configData?.saved_invoices || [],
          });
        } finally {
          setTimeout(() => exitServerUpdate(), 300);
        }

        syncLog('✅ Data reloaded from server after reconnection');
        alert(
          `⚠ You were offline for ${wasOfflineSec} seconds.\n\nFresh data has been loaded from the server to prevent overwrites.\n\nIf you had unsaved changes, you can restore them from Settings > Restore Backup.`
        );
        setSyncStatus('synced');
      } catch (err) {
        console.error('Error reloading data after reconnection:', err);
        setSyncStatus('error');
      }

      setNeedsReload(false);
    } else {
      setSyncStatus('synced');
    }

    offlineTimestamp.current = null;
  };

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  const checkInterval = setInterval(() => {
    const currentlyOnline = navigator.onLine;
    setIsOnline((prev) => {
      if (prev !== currentlyOnline) {
        syncLog(`Online status changed: ${prev} → ${currentlyOnline}`);
        if (!currentlyOnline && !offlineTimestamp.current) {
          offlineTimestamp.current = Date.now();
        }
      }
      return currentlyOnline;
    });
  }, 5000);

  return () => {
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
    clearInterval(checkInterval);
  };
};

export const setupConfigRealtimeSync = ({
  supabase,
  userNameRef,
  hasPendingChanges,
  IS_BETA_BUILD,
  isNewerVersion,
  APP_VERSION,
  setVersionMismatch,
  enterServerUpdate,
  exitServerUpdate,
  setStoresDirectory,
  setDriversDirectory,
  setTrucksDirectory,
  setTrailersDirectory,
  setTractorsDirectory,
  setPalletTypes,
  setSavedInvoices,
  onStatusChange,
  onReconnectReady,
}) => {
  let disposed = false;
  let configSubscription = null;

  const removeConfigSubscription = () => {
    if (!configSubscription) return;
    supabase.removeChannel(configSubscription);
    configSubscription = null;
  };

  const subscribeConfig = () => {
    if (disposed) return;
    removeConfigSubscription();
    configSubscription = supabase
      .channel('config_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logistics_config' }, (payload) => {
        const currentUserName = userNameRef.current;
        if (payload.new && payload.new.updated_by === currentUserName) return;
        if (hasPendingChanges.current) return;

        if (payload.new) {
          syncLog('📡 Config updated from:', payload.new.updated_by);

          if (!IS_BETA_BUILD && payload.new.app_version && isNewerVersion(payload.new.app_version, APP_VERSION)) {
            syncLog(`⚠ Version mismatch detected! Server: ${payload.new.app_version}, Local: ${APP_VERSION}`);
            setVersionMismatch({ serverVersion: payload.new.app_version });
            return;
          }

          enterServerUpdate();
          try {
            if (payload.new.stores_directory) setStoresDirectory(payload.new.stores_directory);
            if (payload.new.drivers_directory) setDriversDirectory(payload.new.drivers_directory);
            if (payload.new.trucks_directory) setTrucksDirectory(payload.new.trucks_directory);
            if (payload.new.trailers_directory) setTrailersDirectory(payload.new.trailers_directory);
            if (payload.new.tractors_directory) setTractorsDirectory(payload.new.tractors_directory);
            if (payload.new.pallet_types) setPalletTypes(payload.new.pallet_types);
            if (payload.new.saved_invoices) setSavedInvoices(payload.new.saved_invoices);
          } finally {
            setTimeout(() => exitServerUpdate(), 300);
          }
        }
      })
      .subscribe((status) => {
        syncLog('📡 Config subscription:', status);
        if (typeof onStatusChange === 'function') onStatusChange(status);
      });
  };

  if (typeof onReconnectReady === 'function') {
    onReconnectReady(() => {
      if (disposed) return false;
      syncLog('🔄 Reconnecting config subscription');
      subscribeConfig();
      return true;
    });
  }

  subscribeConfig();

  return () => {
    disposed = true;
    if (typeof onReconnectReady === 'function') {
      onReconnectReady(null);
    }
    removeConfigSubscription();
  };
};
