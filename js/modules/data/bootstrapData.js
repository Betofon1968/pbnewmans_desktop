import {setupConfigRealtimeSync} from '../sync/networkSync.js?v=26.120';

const mapRouteRowToClient = (route) => ({
  id: route.id,
  driver: route.driver,
  truck: route.truck,
  trailer: route.trailer,
  stores: route.stores || [],
  palletCount: route.pallet_count || 8,
  confirmed: route.confirmed,
  confirmedBy: route.confirmed_by,
  confirmedAt: route.confirmed_at,
  pickupAtPB: route.pickup_at_pb || false,
  route_order: route.route_order,
  updated_at: route.updated_at,
});

const buildConfigSnapshot = (configData) => ({
  stores_directory: configData?.stores_directory || [],
  drivers_directory: configData?.drivers_directory || [],
  trucks_directory: configData?.trucks_directory || [],
  trailers_directory: configData?.trailers_directory || [],
  tractors_directory: configData?.tractors_directory || [],
  pallet_types: configData?.pallet_types || [],
  saved_invoices: configData?.saved_invoices || [],
});

export const setupBootstrapData = ({
  supabase,
  selectedDateRef,
  userName,
  userNameRef,
  hasPendingChanges,
  IS_BETA_BUILD,
  isNewerVersion,
  APP_VERSION,
  setVersionMismatch,
  enterServerUpdate,
  exitServerUpdate,
  setRoutesByDate,
  setDateRouteCounts,
  setStoresDirectory,
  setDriversDirectory,
  setTrucksDirectory,
  setTrailersDirectory,
  setTractorsDirectory,
  setPalletTypes,
  setSavedInvoices,
  setLastUpdated,
  lastSavedConfig,
  lastSavedData,
  deferredCacheWrite,
  setSyncStatus,
  isInitialLoad,
  onConfigStatusChange,
  onConfigReconnectReady,
}) => {
  let isDisposed = false;
  let prefetchTimeoutId = null;

  const loadData = async () => {
    try {
      const currentDate = selectedDateRef.current;
      console.log('📥 Loading data from NEW tables (logistics_routes + logistics_config)...');
      console.log('📅 Loading current date first:', currentDate);

      const [configResult, currentRoutesResult] = await Promise.all([
        supabase.from('logistics_config').select('*').eq('id', 'main').single(),
        supabase.from('logistics_routes').select('*').eq('route_date', currentDate).order('route_order', { ascending: true }),
      ]);

      const { data: configData, error: configError } = configResult;
      const { data: currentRoutesData, error: routesError } = currentRoutesResult;

      if (configError) {
        console.error('Config load error:', configError);
      }
      if (routesError) {
        console.error('Routes load error:', routesError);
        throw routesError;
      }

      console.log(`📊 Loaded ${currentRoutesData?.length || 0} routes for ${currentDate}`);
      enterServerUpdate();

      try {
        const routesByDateObj = {};
        if (currentRoutesData && currentRoutesData.length > 0) {
          routesByDateObj[currentDate] = currentRoutesData.map(mapRouteRowToClient);
        }

        setRoutesByDate((prev) => ({ ...prev, ...routesByDateObj }));
        setDateRouteCounts((prev) => ({ ...prev, [currentDate]: currentRoutesData?.length || 0 }));

        if (configData) {
          if (!IS_BETA_BUILD && configData.app_version && isNewerVersion(configData.app_version, APP_VERSION)) {
            console.log(`⚠ Version mismatch! Server: ${configData.app_version}, Local: ${APP_VERSION}`);
            setVersionMismatch({ serverVersion: configData.app_version });
          }

          if (!IS_BETA_BUILD && (!configData.app_version || isNewerVersion(APP_VERSION, configData.app_version))) {
            console.log(`📦 Updating database version: ${configData.app_version || 'none'} → ${APP_VERSION}`);
            supabase
              .from('logistics_config')
              .update({ app_version: APP_VERSION, updated_by: userName || 'version-sync' })
              .eq('id', 'main')
              .then(({ error }) => {
                if (error) console.error('Failed to update version:', error);
                else console.log(`✅ Database version updated to ${APP_VERSION}`);
              });
          }

          if (configData.stores_directory && configData.stores_directory.length > 0) setStoresDirectory(configData.stores_directory);
          if (configData.drivers_directory && configData.drivers_directory.length > 0) setDriversDirectory(configData.drivers_directory);
          if (configData.trucks_directory && configData.trucks_directory.length > 0) setTrucksDirectory(configData.trucks_directory);
          if (configData.trailers_directory && configData.trailers_directory.length > 0) setTrailersDirectory(configData.trailers_directory);
          if (configData.tractors_directory && configData.tractors_directory.length > 0) setTractorsDirectory(configData.tractors_directory);
          if (configData.pallet_types && configData.pallet_types.length > 0) setPalletTypes(configData.pallet_types);
          if (configData.saved_invoices && configData.saved_invoices.length > 0) setSavedInvoices(configData.saved_invoices);
          setLastUpdated(configData.updated_at);

          lastSavedConfig.current = JSON.stringify(buildConfigSnapshot(configData));
        }

        prefetchTimeoutId = setTimeout(async () => {
          if (isDisposed) return;
          console.log('📦 Background prefetch: loading surrounding dates...');
          const today = new Date(currentDate + 'T12:00:00');
          const startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 14);
          const endDate = new Date(today);
          endDate.setDate(endDate.getDate() + 7);
          const startDateStr = startDate.toLocaleDateString('en-CA');
          const endDateStr = endDate.toLocaleDateString('en-CA');

          let didEnterServerUpdate = false;
          enterServerUpdate();
          didEnterServerUpdate = true;
          try {
            const { data: prefetchData, error } = await supabase
              .from('logistics_routes')
              .select('route_date, id, driver, truck, trailer, stores, pallet_count, confirmed, confirmed_by, confirmed_at, pickup_at_pb, route_order, updated_at')
              .gte('route_date', startDateStr)
              .lte('route_date', endDateStr)
              .neq('route_date', currentDate)
              .order('route_date', { ascending: true })
              .order('route_order', { ascending: true });

            if (isDisposed) return;

            if (error) {
              console.error('Background prefetch error:', error);
              return;
            }

            const prefetchByDate = {};
            const dateCounts = {};
            prefetchData?.forEach((route) => {
              const date = route.route_date;
              if (!prefetchByDate[date]) {
                prefetchByDate[date] = [];
                dateCounts[date] = 0;
              }
              dateCounts[date]++;
              prefetchByDate[date].push(mapRouteRowToClient(route));
            });

            setRoutesByDate((prev) => ({ ...prev, ...prefetchByDate }));
            setDateRouteCounts((prev) => ({ ...prev, ...dateCounts }));
            console.log(
              `📦 Background prefetch complete: ${prefetchData?.length || 0} routes for ${Object.keys(prefetchByDate).length} dates`
            );
          } catch (err) {
            console.error('Background prefetch failed:', err);
          } finally {
            if (didEnterServerUpdate) {
              exitServerUpdate();
            }
          }
        }, 500);

        const configSnapshot = buildConfigSnapshot(configData);
        lastSavedData.current = JSON.stringify({
          routesByDate: routesByDateObj,
          storesDirectory: configSnapshot.stores_directory,
          driversDirectory: configSnapshot.drivers_directory,
          trucksDirectory: configSnapshot.trucks_directory,
          trailersDirectory: configSnapshot.trailers_directory,
          tractorsDirectory: configSnapshot.tractors_directory,
          palletTypes: configSnapshot.pallet_types,
          savedInvoices: configSnapshot.saved_invoices,
        });

        deferredCacheWrite('logistics_cache', {
          timestamp: Date.now(),
          routesByDate: routesByDateObj,
          storesDirectory: configSnapshot.stores_directory,
          driversDirectory: configSnapshot.drivers_directory,
          trucksDirectory: configSnapshot.trucks_directory,
          trailersDirectory: configSnapshot.trailers_directory,
          tractorsDirectory: configSnapshot.tractors_directory,
          palletTypes: configSnapshot.pallet_types,
          savedInvoices: configSnapshot.saved_invoices,
        });

        console.log('✅ Data loaded and cached');
      } finally {
        setTimeout(() => exitServerUpdate(), 300);
      }

      setSyncStatus('synced');
      isInitialLoad.current = false;
    } catch (error) {
      console.error('Error loading data:', error);
      setSyncStatus('error');
      isInitialLoad.current = false;
    }
  };

  loadData();

  const cleanupConfigRealtime = setupConfigRealtimeSync({
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
    onStatusChange: onConfigStatusChange,
    onReconnectReady: onConfigReconnectReady,
  });

  return () => {
    isDisposed = true;
    if (prefetchTimeoutId) {
      clearTimeout(prefetchTimeoutId);
      prefetchTimeoutId = null;
    }
    cleanupConfigRealtime();
  };
};
