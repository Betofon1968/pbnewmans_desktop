import {syncLog} from './syncDebug.js?v=26.110';
export const setupDateRoutesSync = ({
  selectedDate,
  supabase,
  routesSubscriptionRef,
  routesSetupIdRef,
  enterServerUpdate,
  exitServerUpdate,
  setRoutesByDate,
  dirtyFieldsByRoute,
  mergeServerRouteIntoLocal,
  mapRouteRecordToClientRoute,
  lastAppliedRealtimeAtByDateRef,
  lastRowRealtimeAtByDateRef,
  localUserNameRef,
  recentLocalSaveByDateRouteRef,
  onStatusChange,
  localEchoSuppressMs = 6000,
  fullReloadSuppressionMs = 600,
}) => {
  if (!selectedDate) return () => {};

  routesSetupIdRef.current++;
  const thisSetupId = routesSetupIdRef.current;

  if (routesSubscriptionRef.current) {
    syncLog('📡 Removing previous date routes channel');
    supabase.removeChannel(routesSubscriptionRef.current);
    routesSubscriptionRef.current = null;
  }

  syncLog('📡 Subscribing to routes for date:', selectedDate);

  const routesSubscription = supabase
    .channel(`routes_${selectedDate}_${thisSetupId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'logistics_routes', filter: `route_date=eq.${selectedDate}` },
      (payload) => {
        if (thisSetupId !== routesSetupIdRef.current) {
          syncLog('📡 Routes callback ignored (stale setup)');
          return;
        }

        const eventDate = payload.new?.route_date || payload.old?.route_date || selectedDate;
        const lastFullReloadAt = lastAppliedRealtimeAtByDateRef?.current?.[eventDate] || 0;
        if (lastFullReloadAt && Date.now() - lastFullReloadAt < fullReloadSuppressionMs) {
          syncLog(
            `📡 Route ${payload.eventType} skipped for ${eventDate} (recent full reload ${Date.now() - lastFullReloadAt}ms ago)`
          );
          return;
        }

        syncLog(
          '📡 Route update for',
          selectedDate,
          ':',
          payload.eventType,
          'from:',
          payload.new?.updated_by || payload.old?.updated_by
        );

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const route = payload.new;
          const date = route.route_date;
          const nowTs = Date.now();

          const recentLocalByDate = recentLocalSaveByDateRouteRef?.current?.[date];
          if (recentLocalByDate) {
            Object.keys(recentLocalByDate).forEach((routeId) => {
              if (nowTs - recentLocalByDate[routeId] > 30000) delete recentLocalByDate[routeId];
            });
          }

          const localUserName = localUserNameRef?.current;
          const recentLocalTs = recentLocalByDate?.[route.id] || 0;
          if (
            localUserName &&
            route?.updated_by === localUserName &&
            recentLocalTs &&
            nowTs - recentLocalTs < localEchoSuppressMs
          ) {
            syncLog('📡 Route update skipped (local echo):', route.id);
            return;
          }

          enterServerUpdate();
          try {
            setRoutesByDate((prev) => {
              const updated = { ...prev };
              if (!updated[date]) updated[date] = [];

              const existingIdx = updated[date].findIndex((r) => r.id === route.id);
              const serverRouteObj = mapRouteRecordToClientRoute(route);

              const dirtyFields = dirtyFieldsByRoute.current[route.id];
              let finalRouteObj;
              if (dirtyFields && dirtyFields.size > 0 && existingIdx >= 0) {
                const localRoute = updated[date][existingIdx];
                finalRouteObj = mergeServerRouteIntoLocal(localRoute, serverRouteObj, dirtyFields);
                syncLog('🔀 Smart merge applied for route', route.id);
              } else {
                finalRouteObj = serverRouteObj;
              }

              if (existingIdx >= 0) {
                updated[date][existingIdx] = finalRouteObj;
              } else {
                updated[date].push(finalRouteObj);
              }

              updated[date].sort((a, b) => (a.route_order || 0) - (b.route_order || 0));
              syncLog('📡 Route synced:', route.driver || 'Unassigned', 'order:', finalRouteObj.route_order);
              if (lastRowRealtimeAtByDateRef?.current) {
                lastRowRealtimeAtByDateRef.current[date] = Date.now();
              }
              return updated;
            });
          } finally {
            setTimeout(() => exitServerUpdate(), 300);
          }
        }

        if (payload.eventType === 'DELETE') {
          const route = payload.old;
          const date = route.route_date;
          syncLog('📡 Route DELETE received via postgres_changes:', route.id);

          enterServerUpdate();
          try {
            setRoutesByDate((prev) => {
              const updated = { ...prev };
              if (updated[date]) updated[date] = updated[date].filter((r) => r.id !== route.id);
              if (lastRowRealtimeAtByDateRef?.current) {
                lastRowRealtimeAtByDateRef.current[date] = Date.now();
              }
              return updated;
            });
          } finally {
            setTimeout(() => exitServerUpdate(), 300);
          }
        }
      }
    )
    .subscribe((status) => {
      syncLog('📡 Routes subscription for', selectedDate, ':', status);
      if (typeof onStatusChange === 'function') onStatusChange(status, selectedDate);
    });

  routesSubscriptionRef.current = routesSubscription;

  return () => {
    if (routesSubscriptionRef.current) {
      supabase.removeChannel(routesSubscriptionRef.current);
      routesSubscriptionRef.current = null;
    }
  };
};
