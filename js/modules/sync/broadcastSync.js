import {syncLog} from './syncDebug.js';

export const setupRouteBroadcastSync = ({
  supabase,
  selectedDateRef,
  sessionId,
  enterServerUpdate,
  exitServerUpdate,
  setRoutesByDate,
  setDateRouteCounts,
  mapRouteRecordToClientRoute,
  deleteChannelRef,
  updateChannelRef,
  lastAppliedRealtimeAtByDateRef,
  lastRowRealtimeAtByDateRef,
  onDeleteStatus,
  onUpdateStatus,
  onBroadcastEvent,
  onReconnectReady,
  coalesceWindowMs = 450,
  rowCoverageMs = 900,
  recentApplySuppressionMs = 500,
  duplicateBroadcastSuppressionMs = 5000,
}) => {
  const pendingReloadTimersByDate = new Map();
  const pendingReloadMetaByDate = new Map();
  const recentBroadcastFingerprints = new Map();
  const serverUpdateExitTimers = new Set();
  const appliedRealtimeRef = lastAppliedRealtimeAtByDateRef || { current: {} };
  const rowRealtimeRef = lastRowRealtimeAtByDateRef || { current: {} };
  let deleteChannel = null;
  let updateChannel = null;
  let disposed = false;

  const scheduleExitServerUpdate = (delayMs = 300) => {
    const timerId = setTimeout(() => {
      serverUpdateExitTimers.delete(timerId);
      if (disposed) return;
      try {
        exitServerUpdate();
      } catch (err) {
        console.error('exitServerUpdate failed:', err);
      }
    }, delayMs);
    serverUpdateExitTimers.add(timerId);
  };

  const buildRouteIdsKey = (routeIds) => {
    if (!Array.isArray(routeIds) || routeIds.length === 0) return '';
    return routeIds.map((routeId) => String(routeId)).sort().join(',');
  };

  const pruneRecentBroadcastFingerprints = (now = Date.now()) => {
    recentBroadcastFingerprints.forEach((seenAt, fingerprint) => {
      if (now - seenAt > duplicateBroadcastSuppressionMs) {
        recentBroadcastFingerprints.delete(fingerprint);
      }
    });
  };

  const buildBroadcastFingerprint = ({
    type,
    routeDate,
    routeId,
    senderSessionId,
    senderName,
    eventTs,
    routeIds,
  }) => {
    const normalizedRouteDate = routeDate || 'unknown-date';
    const normalizedSender = senderSessionId || senderName || 'unknown-sender';
    const normalizedTs = Number.isFinite(Number(eventTs)) ? String(Number(eventTs)) : '';
    const normalizedIds = routeId ? String(routeId) : buildRouteIdsKey(routeIds);
    const keyPart = normalizedTs || normalizedIds;
    if (!keyPart) return null;
    return `${type}|${normalizedRouteDate}|${normalizedSender}|${keyPart}`;
  };

  const isDuplicateBroadcast = (fingerprint, now = Date.now()) => {
    if (!fingerprint) return false;
    pruneRecentBroadcastFingerprints(now);
    const lastSeenAt = recentBroadcastFingerprints.get(fingerprint) || 0;
    if (lastSeenAt && now - lastSeenAt < duplicateBroadcastSuppressionMs) {
      return true;
    }
    recentBroadcastFingerprints.set(fingerprint, now);
    return false;
  };

  const applyRouteDateSnapshot = (routeDate, loadedRoutes, reason) => {
    const now = Date.now();
    const lastAppliedAt = appliedRealtimeRef.current[routeDate] || 0;
    if (lastAppliedAt && now - lastAppliedAt < recentApplySuppressionMs) {
      syncLog(`Skip full reload for ${routeDate} (${reason}) - applied ${now - lastAppliedAt}ms ago`);
      return false;
    }

    const isSelectedDate = routeDate === selectedDateRef.current;
    if (isSelectedDate) {
      enterServerUpdate();
      try {
        setRoutesByDate((prev) => ({ ...prev, [routeDate]: loadedRoutes }));
        setDateRouteCounts((prev) => ({ ...prev, [routeDate]: loadedRoutes.length }));
      } finally {
        scheduleExitServerUpdate(300);
      }
    } else {
      setRoutesByDate((prev) => ({ ...prev, [routeDate]: loadedRoutes }));
      setDateRouteCounts((prev) => ({ ...prev, [routeDate]: loadedRoutes.length }));
    }

    appliedRealtimeRef.current[routeDate] = Date.now();
    syncLog(`Routes reloaded (${reason}) for ${routeDate}`);
    return true;
  };

  const reloadRouteDateFromDb = async (routeDate, reason) => {
    const { data: routesData, error: routesError } = await supabase
      .from('logistics_routes')
      .select('*')
      .eq('route_date', routeDate)
      .order('route_order', { ascending: true });
    if (routesError) throw routesError;
    const loadedRoutes = routesData ? routesData.map(mapRouteRecordToClientRoute) : [];
    return applyRouteDateSnapshot(routeDate, loadedRoutes, reason);
  };

  const scheduleCoalescedReload = (routeDate, reason, receivedAt = Date.now()) => {
    pendingReloadMetaByDate.set(routeDate, { reason, receivedAt });

    const existingTimer = pendingReloadTimersByDate.get(routeDate);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      pendingReloadTimersByDate.delete(routeDate);
      const meta = pendingReloadMetaByDate.get(routeDate) || { reason, receivedAt };
      pendingReloadMetaByDate.delete(routeDate);

      const lastRowAt = rowRealtimeRef.current[routeDate] || 0;
      if (lastRowAt && lastRowAt >= meta.receivedAt - rowCoverageMs) {
        syncLog(`Skip full reload for ${routeDate} (${meta.reason}) - row updates already covered it`);
        return;
      }

      reloadRouteDateFromDb(routeDate, meta.reason).catch((err) => {
        console.error('Coalesced broadcast reload failed:', err);
      });
    }, coalesceWindowMs);

    pendingReloadTimersByDate.set(routeDate, timer);
  };

  const removeDeleteChannel = () => {
    const channelToRemove = deleteChannel || deleteChannelRef.current;
    if (!channelToRemove) return;
    supabase.removeChannel(channelToRemove);
    if (deleteChannelRef.current === channelToRemove) {
      deleteChannelRef.current = null;
    }
    deleteChannel = null;
  };

  const removeUpdateChannel = () => {
    const channelToRemove = updateChannel || updateChannelRef.current;
    if (!channelToRemove) return;
    supabase.removeChannel(channelToRemove);
    if (updateChannelRef.current === channelToRemove) {
      updateChannelRef.current = null;
    }
    updateChannel = null;
  };

  const subscribeDeleteChannel = () => {
    if (disposed) return;
    removeDeleteChannel();
    const nextDeleteChannel = supabase
      .channel('route-deletions')
      .on('broadcast', { event: 'route-deleted' }, async (payload) => {
        if (disposed) return;
        if (nextDeleteChannel !== deleteChannelRef.current || nextDeleteChannel !== deleteChannel) {
          syncLog("Delete broadcast ignored (stale channel)");
          return;
        }

        const { routeId, routeDate, deletedBy, sessionId: senderSessionId, ts: eventTs } = payload.payload || {};
        if (!routeDate) return;
        if (senderSessionId && senderSessionId === sessionId.current) return;
        const receivedAt = Date.now();
        const fingerprint = buildBroadcastFingerprint({
          type: 'route-deleted',
          routeDate,
          routeId,
          senderSessionId,
          senderName: deletedBy,
          eventTs,
        });
        if (isDuplicateBroadcast(fingerprint, receivedAt)) {
          syncLog('Skip duplicate route-deleted broadcast for', routeDate, 'route:', routeId, 'from:', deletedBy);
          return;
        }

        syncLog('Route deletion broadcast received:', routeId, 'from:', deletedBy);
        if (typeof onBroadcastEvent === 'function') {
          onBroadcastEvent({
            type: 'route-deleted',
            routeDate,
            routeId,
            user: deletedBy,
            receivedAt,
          });
        }
        scheduleCoalescedReload(routeDate, 'route-deleted broadcast', receivedAt);
      })
      .subscribe((status) => {
        if (disposed) return;
        if (nextDeleteChannel !== deleteChannelRef.current || nextDeleteChannel !== deleteChannel) {
          syncLog("Delete broadcast status ignored (stale channel):", status);
          return;
        }

        syncLog('Delete broadcast channel:', status);
        if (typeof onDeleteStatus === 'function') {
          onDeleteStatus(status);
        }
      });
    deleteChannel = nextDeleteChannel;
    deleteChannelRef.current = nextDeleteChannel;
  };

  const subscribeUpdateChannel = () => {
    if (disposed) return;
    removeUpdateChannel();
    const nextUpdateChannel = supabase
      .channel('route-updates')
      .on('broadcast', { event: 'routes-changed' }, async (payload) => {
        if (disposed) return;
        if (nextUpdateChannel !== updateChannelRef.current || nextUpdateChannel !== updateChannel) {
          syncLog("Update broadcast ignored (stale channel)");
          return;
        }

        const { routeDate, updatedBy, sessionId: senderSessionId, routeIds, ts: eventTs } = payload.payload || {};
        if (!routeDate) return;
        if (senderSessionId && senderSessionId === sessionId.current) return;
        const receivedAt = Date.now();
        const fingerprint = buildBroadcastFingerprint({
          type: 'routes-changed',
          routeDate,
          senderSessionId,
          senderName: updatedBy,
          eventTs,
          routeIds,
        });
        if (isDuplicateBroadcast(fingerprint, receivedAt)) {
          syncLog('Skip duplicate routes-changed broadcast for', routeDate, 'from:', updatedBy);
          return;
        }

        syncLog('Routes change notification received for', routeDate, 'from:', updatedBy);
        if (typeof onBroadcastEvent === 'function') {
          onBroadcastEvent({
            type: 'routes-changed',
            routeDate,
            user: updatedBy,
            receivedAt,
          });
        }
        scheduleCoalescedReload(routeDate, 'routes-changed broadcast', receivedAt);
      })
      .subscribe((status) => {
        if (disposed) return;
        if (nextUpdateChannel !== updateChannelRef.current || nextUpdateChannel !== updateChannel) {
          syncLog("Update broadcast status ignored (stale channel):", status);
          return;
        }

        syncLog('Update broadcast channel:', status);
        if (typeof onUpdateStatus === 'function') {
          onUpdateStatus(status);
        }
      });
    updateChannel = nextUpdateChannel;
    updateChannelRef.current = nextUpdateChannel;
  };

  if (typeof onReconnectReady === 'function') {
    onReconnectReady('broadcastDelete', () => {
      if (disposed) return false;
      syncLog('Reconnect delete broadcast channel');
      subscribeDeleteChannel();
      return true;
    });
    onReconnectReady('broadcastUpdate', () => {
      if (disposed) return false;
      syncLog('Reconnect update broadcast channel');
      subscribeUpdateChannel();
      return true;
    });
  }

  subscribeDeleteChannel();
  subscribeUpdateChannel();

  return () => {
    disposed = true;
    if (typeof onReconnectReady === 'function') {
      onReconnectReady('broadcastDelete', null);
      onReconnectReady('broadcastUpdate', null);
    }
    pendingReloadTimersByDate.forEach((timerId) => clearTimeout(timerId));
    pendingReloadTimersByDate.clear();
    pendingReloadMetaByDate.clear();
    recentBroadcastFingerprints.clear();
    serverUpdateExitTimers.forEach((timerId) => clearTimeout(timerId));
    serverUpdateExitTimers.clear();
    removeDeleteChannel();
    removeUpdateChannel();
  };
};
