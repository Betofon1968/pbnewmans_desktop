export function useSyncDebug({ React }) {
  const { useState, useCallback, useRef, useEffect } = React;

  const CRITICAL_CHANNELS = ['presence', 'routes', 'broadcastDelete', 'broadcastUpdate', 'config'];
  const DEGRADED_STATUSES = new Set(['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT']);
  const RECONNECT_TRIGGER_MS = 15000;
  const RECONNECT_COOLDOWN_MS = 20000;
  const RECONNECT_SCAN_INTERVAL_MS = 3000;
  const normalizeChannelStatus = (status) => String(status || 'INIT').toUpperCase();

  const [syncDebugEnabled, setSyncDebugEnabledState] = useState(() => {
    try {
      return window.isSyncDebugEnabled ? window.isSyncDebugEnabled() : false;
    } catch (e) {
      return false;
    }
  });

  const [syncHealth, setSyncHealth] = useState(() => ({
    presence: 'INIT',
    routes: 'INIT',
    broadcastDelete: 'INIT',
    broadcastUpdate: 'INIT',
    config: 'INIT',
    lastPresenceAt: null,
    lastRoutesAt: null,
    lastBroadcastAt: null,
    lastConfigAt: null,
    globalConnection: 'connecting',
    allCriticalSubscribed: false,
  }));

  const channelStatusesRef = useRef({
    presence: 'INIT',
    routes: 'INIT',
    broadcastDelete: 'INIT',
    broadcastUpdate: 'INIT',
    config: 'INIT',
  });
  const channelReconnectorsRef = useRef({});
  const degradedSinceByChannelRef = useRef({});
  const lastReconnectAttemptByChannelRef = useRef({});
  const hadAllSubscribedRef = useRef(false);

  const deriveConnectionState = useCallback((statuses) => {
    const criticalStatuses = CRITICAL_CHANNELS.map((channel) => normalizeChannelStatus(statuses[channel]));
    const allCriticalSubscribed = criticalStatuses.every((status) => status === 'SUBSCRIBED');
    const hasDegradedChannel = criticalStatuses.some((status) => DEGRADED_STATUSES.has(status));

    if (allCriticalSubscribed) {
      hadAllSubscribedRef.current = true;
      return { globalConnection: 'connected', allCriticalSubscribed: true };
    }

    if (hadAllSubscribedRef.current && hasDegradedChannel) {
      return { globalConnection: 'reconnecting', allCriticalSubscribed: false };
    }

    if (hadAllSubscribedRef.current) {
      return { globalConnection: 'reconnecting', allCriticalSubscribed: false };
    }

    return { globalConnection: 'connecting', allCriticalSubscribed: false };
  }, []);

  const [syncEvents, setSyncEvents] = useState([]);

  const registerChannelStatus = useCallback((channel, rawStatus) => {
    const normalizedStatus = normalizeChannelStatus(rawStatus);
    const nextStatuses = { ...channelStatusesRef.current, [channel]: normalizedStatus };
    channelStatusesRef.current = nextStatuses;

    if (DEGRADED_STATUSES.has(normalizedStatus)) {
      if (!degradedSinceByChannelRef.current[channel]) {
        degradedSinceByChannelRef.current[channel] = Date.now();
      }
    } else {
      delete degradedSinceByChannelRef.current[channel];
      delete lastReconnectAttemptByChannelRef.current[channel];
    }

    const now = new Date().toISOString();
    const connection = deriveConnectionState(nextStatuses);

    setSyncHealth((prev) => {
      const next = {
        ...prev,
        [channel]: normalizedStatus,
        ...connection,
      };

      if (channel === 'presence') next.lastPresenceAt = now;
      if (channel === 'routes') next.lastRoutesAt = now;
      if (channel === 'broadcastDelete' || channel === 'broadcastUpdate') next.lastBroadcastAt = now;
      if (channel === 'config') next.lastConfigAt = now;

      return next;
    });
  }, [deriveConnectionState]);

  const registerChannelReconnect = useCallback((channel, reconnectCallback) => {
    if (!channel) return;

    if (typeof reconnectCallback === 'function') {
      channelReconnectorsRef.current[channel] = reconnectCallback;
      return;
    }

    delete channelReconnectorsRef.current[channel];
    delete degradedSinceByChannelRef.current[channel];
    delete lastReconnectAttemptByChannelRef.current[channel];
  }, []);

  const pushSyncEvent = useCallback((message, meta = {}) => {
    setSyncEvents((prev) => {
      const next = [...prev, { time: new Date().toISOString(), message, ...meta }];
      if (next.length > 200) {
        next.splice(0, next.length - 200);
      }
      return next;
    });
  }, []);

  const setSyncDebugEnabled = useCallback((enabled) => {
    const normalized = !!enabled;
    if (typeof window !== 'undefined' && typeof window.setSyncDebug === 'function') {
      window.setSyncDebug(normalized);
    }
    setSyncDebugEnabledState(normalized);
  }, []);

  const copySyncLogs = useCallback(async () => {
    try {
      const lines = syncEvents.map((e) => `[${e.time}] ${e.message}`).join('\n');
      await navigator.clipboard.writeText(lines || '');
      alert('Logs copied to clipboard');
    } catch (err) {
      alert('Copy failed: ' + err.message);
    }
  }, [syncEvents]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!navigator.onLine) return;

      const now = Date.now();
      CRITICAL_CHANNELS.forEach((channel) => {
        const status = normalizeChannelStatus(channelStatusesRef.current[channel]);
        if (!DEGRADED_STATUSES.has(status)) return;

        const degradedSince = degradedSinceByChannelRef.current[channel];
        if (!degradedSince || now - degradedSince < RECONNECT_TRIGGER_MS) return;

        const lastAttemptAt = lastReconnectAttemptByChannelRef.current[channel] || 0;
        if (now - lastAttemptAt < RECONNECT_COOLDOWN_MS) return;

        const reconnectCallback = channelReconnectorsRef.current[channel];
        if (typeof reconnectCallback !== 'function') return;

        lastReconnectAttemptByChannelRef.current[channel] = now;
        pushSyncEvent(`🔄 Reconnect requested for ${channel} (${status})`, {
          type: 'sync-monitor',
          channel,
          status,
        });

        try {
          const maybePromise = reconnectCallback();
          if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch((error) => {
              console.warn(`Reconnect callback failed for ${channel}:`, error);
              pushSyncEvent(`❌ Reconnect failed for ${channel}: ${error?.message || error}`, {
                type: 'sync-monitor',
                channel,
                status: 'RECONNECT_FAILED',
              });
            });
          }
        } catch (error) {
          console.warn(`Reconnect callback failed for ${channel}:`, error);
          pushSyncEvent(`❌ Reconnect failed for ${channel}: ${error?.message || error}`, {
            type: 'sync-monitor',
            channel,
            status: 'RECONNECT_FAILED',
          });
        }
      });
    }, RECONNECT_SCAN_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [pushSyncEvent]);

  return {
    syncDebugEnabled,
    setSyncDebugEnabled,
    syncHealth,
    registerChannelStatus,
    registerChannelReconnect,
    connectionState: syncHealth.globalConnection,
    allCriticalSubscribed: syncHealth.allCriticalSubscribed,
    syncEvents,
    pushSyncEvent,
    copySyncLogs
  };
}
