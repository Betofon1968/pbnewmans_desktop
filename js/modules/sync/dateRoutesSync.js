import {syncLog} from './syncDebug.js?v=26.114';

const getActiveDirtyFields = ({ dirtyFields, dirtyFieldTimestamps, lastAcknowledgedSaveAt }) => {
  if (!dirtyFields) return new Set();

  const active = new Set();
  const lastAck = Number(lastAcknowledgedSaveAt) || 0;
  const timestamps = dirtyFieldTimestamps && typeof dirtyFieldTimestamps === 'object' ? dirtyFieldTimestamps : {};

  const addIfActive = (fieldName, explicitTimestamp) => {
    if (typeof fieldName !== 'string' || fieldName.length === 0) return;
    const fieldTimestamp = Number(explicitTimestamp || timestamps[fieldName] || 0);
    // If no timestamp exists (legacy state), keep legacy behavior and treat as active dirty.
    if (!fieldTimestamp || fieldTimestamp > lastAck) {
      active.add(fieldName);
    }
  };

  if (dirtyFields instanceof Set) {
    dirtyFields.forEach((fieldName) => addIfActive(fieldName));
    return active;
  }

  if (Array.isArray(dirtyFields)) {
    dirtyFields.forEach((fieldName) => addIfActive(fieldName));
    return active;
  }

  if (typeof dirtyFields === 'object') {
    if (dirtyFields.fields && typeof dirtyFields.fields === 'object') {
      Object.entries(dirtyFields.fields).forEach(([fieldName, fieldTimestamp]) =>
        addIfActive(fieldName, fieldTimestamp)
      );
      return active;
    }
    Object.keys(dirtyFields).forEach((fieldName) => addIfActive(fieldName));
  }

  return active;
};

export const setupDateRoutesSync = ({
  selectedDate,
  supabase,
  routesSubscriptionRef,
  routesSetupIdRef,
  enterServerUpdate,
  exitServerUpdate,
  setRoutesByDate,
  dirtyFieldsByRoute,
  dirtyFieldUpdatedAtByRouteRef,
  dirtyFieldAckAtByRouteRef,
  mergeServerRouteIntoLocal,
  mapRouteRecordToClientRoute,
  lastAppliedRealtimeAtByDateRef,
  lastRowRealtimeAtByDateRef,
  localUserNameRef,
  recentLocalSaveByDateRouteRef,
  onStatusChange,
  onReconnectReady,
  localEchoSuppressMs = 6000,
  fullReloadSuppressionMs = 600,
}) => {
  if (!selectedDate) return () => {};

  let isDisposed = false;
  let activeDate = selectedDate;
  let activeChannel = null;

  const removeRoutesChannel = () => {
    const channelToRemove = activeChannel || routesSubscriptionRef.current;
    if (!channelToRemove) return;
    supabase.removeChannel(channelToRemove);
    if (routesSubscriptionRef.current === channelToRemove) {
      routesSubscriptionRef.current = null;
    }
    activeChannel = null;
  };

  const subscribeToDate = (routeDate) => {
    if (!routeDate || isDisposed) return;
    activeDate = routeDate;

    routesSetupIdRef.current++;
    const thisSetupId = routesSetupIdRef.current;

    if (routesSubscriptionRef.current || activeChannel) {
      syncLog('📡 Removing previous date routes channel');
      removeRoutesChannel();
    }

    syncLog('📡 Subscribing to routes for date:', routeDate);

    const routesSubscription = supabase
      .channel(`routes_${routeDate}_${thisSetupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logistics_routes', filter: `route_date=eq.${routeDate}` },
        (payload) => {
          if (thisSetupId !== routesSetupIdRef.current) {
            syncLog('📡 Routes callback ignored (stale setup)');
            return;
          }

          const eventDate = payload.new?.route_date || payload.old?.route_date || routeDate;
          const lastFullReloadAt = lastAppliedRealtimeAtByDateRef?.current?.[eventDate] || 0;
          if (lastFullReloadAt && Date.now() - lastFullReloadAt < fullReloadSuppressionMs) {
            syncLog(
              `📡 Route ${payload.eventType} skipped for ${eventDate} (recent full reload ${Date.now() - lastFullReloadAt}ms ago)`
            );
            return;
          }

          syncLog(
            '📡 Route update for',
            routeDate,
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
                const dirtyFieldTimestamps = dirtyFieldUpdatedAtByRouteRef?.current?.[route.id];
                const lastAcknowledgedSaveAt = dirtyFieldAckAtByRouteRef?.current?.[route.id] || 0;
                const activeDirtyFields = getActiveDirtyFields({
                  dirtyFields,
                  dirtyFieldTimestamps,
                  lastAcknowledgedSaveAt,
                });
                if (dirtyFields && activeDirtyFields.size === 0) {
                  delete dirtyFieldsByRoute.current[route.id];
                  if (dirtyFieldUpdatedAtByRouteRef?.current) {
                    delete dirtyFieldUpdatedAtByRouteRef.current[route.id];
                  }
                }
                let finalRouteObj;
                if (activeDirtyFields.size > 0 && existingIdx >= 0) {
                  const localRoute = updated[date][existingIdx];
                  finalRouteObj = mergeServerRouteIntoLocal(localRoute, serverRouteObj, activeDirtyFields);
                  syncLog('🔀 Smart merge applied for route', route.id, 'fields:', Array.from(activeDirtyFields));
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
        syncLog('📡 Routes subscription for', routeDate, ':', status);
        if (typeof onStatusChange === 'function') onStatusChange(status, routeDate);
      });

    activeChannel = routesSubscription;
    routesSubscriptionRef.current = routesSubscription;
  };

  if (typeof onReconnectReady === 'function') {
    onReconnectReady(() => {
      if (isDisposed || !activeDate) return false;
      syncLog('🔄 Reconnecting routes subscription for', activeDate);
      subscribeToDate(activeDate);
      return true;
    });
  }

  subscribeToDate(selectedDate);

  return () => {
    isDisposed = true;
    if (typeof onReconnectReady === 'function') {
      onReconnectReady(null);
    }
    removeRoutesChannel();
  };
};
