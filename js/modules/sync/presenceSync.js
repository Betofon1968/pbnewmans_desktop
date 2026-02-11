import {syncLog} from './syncDebug.js?v=26.108';
export const setupPresenceTracking = ({
  supabase,
  user,
  userName,
  selectedDateRef,
  sessionId,
  presenceChannelRef,
  presenceConnectedRef,
  isLoggingOutRef,
  hasTrackedOnceRef,
  setActiveUsers,
  setPresenceConnected,
  buildActiveUsersFromState,
  handleLogout,
  onStatusChange,
  onTrackSuccess,
}) => {
  if (!userName) return () => {};

  let fallbackTimer = setTimeout(() => {
    if (!presenceConnectedRef.current) {
      setActiveUsers((prev) =>
        prev.length === 0
          ? [
              {
                name: userName,
                session: 'self',
                joinedAt: new Date().toISOString(),
                currentDate: selectedDateRef.current,
                sessionCount: 1,
                isFallback: true,
              },
            ]
          : prev
      );
      syncLog('⚠ Presence fallback: showing self (not fully connected)');
    }
  }, 2000);

  let retryCount = 0;
  const maxRetries = 3;
  let syncInterval = null;
  let selfHealInterval = null;
  let subscriptionTimeout = null;
  let isTrackingInFlight = false;
  let trackingSetupId = 0;
  let currentSetupId = 0;
  let trackFailStreak = 0;
  let hasGivenUp = false;
  let isRestartingPresence = false;
  let reconnectTimer = null;
  let retryTimer = null;
  let closeGraceTimer = null;
  let stableTimer = null;
  let closeRecoveryTimer = null;
  let lastPresenceStatus = 'INIT';
  let reconnectBackoffMs = 60000;
  let setupEpoch = 0;
  let reconnectGeneration = 0;
  const transientTimeouts = new Set();
  let disposed = false;

  const clearFallbackTimer = () => {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
  };

  const clearSubscriptionTimeout = () => {
    if (subscriptionTimeout) {
      clearTimeout(subscriptionTimeout);
      subscriptionTimeout = null;
    }
  };

  const clearSyncInterval = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  };

  const clearSelfHealInterval = () => {
    if (selfHealInterval) {
      clearInterval(selfHealInterval);
      selfHealInterval = null;
    }
  };

  const clearReconnectTimer = () => {
    reconnectGeneration++;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const clearCloseGraceTimer = () => {
    if (closeGraceTimer) {
      clearTimeout(closeGraceTimer);
      closeGraceTimer = null;
    }
  };

  const clearStableTimer = () => {
    if (stableTimer) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }
  };

  const clearCloseRecoveryTimer = () => {
    if (closeRecoveryTimer) {
      clearTimeout(closeRecoveryTimer);
      closeRecoveryTimer = null;
    }
  };

  const clearTransientTimeouts = () => {
    transientTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    transientTimeouts.clear();
  };

  const scheduleTransientTimeout = (callback, delayMs) => {
    const timeoutId = setTimeout(() => {
      transientTimeouts.delete(timeoutId);
      callback();
    }, delayMs);
    transientTimeouts.add(timeoutId);
    return timeoutId;
  };

  const clearRuntimeTimers = ({ keepReconnectTimer = false } = {}) => {
    clearFallbackTimer();
    clearSubscriptionTimeout();
    clearSyncInterval();
    clearSelfHealInterval();
    clearRetryTimer();
    clearCloseGraceTimer();
    clearStableTimer();
    clearCloseRecoveryTimer();
    clearTransientTimeouts();
    if (!keepReconnectTimer) clearReconnectTimer();
  };

  const restartPresenceForSetup = (expectedSetupId = null) => {
    if (disposed) return false;
    if (expectedSetupId !== null && expectedSetupId !== currentSetupId) return false;
    restartPresence();
    return true;
  };

  const schedulePresenceReconnect = (reason) => {
    if (disposed) return;
    if (reconnectTimer) return;
    if (isLoggingOutRef.current) return;

    const thisGeneration = reconnectGeneration;
    const delay = reconnectBackoffMs + Math.floor(Math.random() * 3000);
    syncLog(`⚠ Presence degraded (${reason}). Will retry in ${Math.round(delay / 1000)}s`);

    reconnectTimer = setTimeout(() => {
      if (thisGeneration !== reconnectGeneration) return;
      reconnectTimer = null;
      if (disposed) return;
      if (isLoggingOutRef.current) return;
      if (!navigator.onLine || document.visibilityState !== 'visible') {
        const deferredDelay = 15000 + Math.floor(Math.random() * 2000);
        syncLog(`📡 Presence recovery deferred (online=${navigator.onLine}, visible=${document.visibilityState === 'visible'}). Retrying in ${Math.round(deferredDelay / 1000)}s`);
        reconnectTimer = setTimeout(() => {
          if (thisGeneration !== reconnectGeneration) return;
          reconnectTimer = null;
          if (disposed || isLoggingOutRef.current) return;
          schedulePresenceReconnect('deferred retry');
        }, deferredDelay);
        return;
      }
      retryCount = 0;
      reconnectBackoffMs = Math.min(reconnectBackoffMs * 2, 10 * 60 * 1000);
      syncLog('🔄 Attempting presence recovery...');
      restartPresenceForSetup();
    }, delay);
  };

  const trackPresence = async (channel, date = selectedDateRef.current, setupId = currentSetupId) => {
    if (disposed) return false;
    if (setupId !== currentSetupId) return false;
    if (isTrackingInFlight && trackingSetupId === setupId) return false;
    if (!userName) return false;

    isTrackingInFlight = true;
    trackingSetupId = setupId;
    try {
      await channel.track({
        user_id: user?.id || null,
        user_name: userName,
        online_at: new Date().toISOString(),
        current_date: date,
      });

      if (disposed || setupId !== currentSetupId || channel !== presenceChannelRef.current) {
        if (!disposed) syncLog('📡 Track completed but channel was replaced, ignoring result');
        return false;
      }

      trackFailStreak = 0;

      if (!hasTrackedOnceRef.current) {
        hasTrackedOnceRef.current = true;
        setPresenceConnected(true);
        presenceConnectedRef.current = true;
        syncLog('📡 Presence: first track successful, now showing connected');
      }

      return true;
    } catch (e) {
      trackFailStreak++;
      console.warn('Presence track failed:', e);
      if (trackFailStreak >= 3) {
        syncLog('⚠ Presence track failing repeatedly, marking degraded');
        setPresenceConnected(false);
        presenceConnectedRef.current = false;
        hasTrackedOnceRef.current = false;
        schedulePresenceReconnect('track failures');
      }
      return false;
    } finally {
      if (trackingSetupId === setupId) {
        isTrackingInFlight = false;
        trackingSetupId = 0;
      }
    }
  };

  const restartPresence = () => {
    if (disposed) return;
    isRestartingPresence = true;
    currentSetupId++;
    clearRuntimeTimers();
    isTrackingInFlight = false;
    trackingSetupId = 0;

    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    setupPresence();
    isRestartingPresence = false;
  };

  const setupPresence = () => {
    if (disposed) return;
    currentSetupId++;
    setupEpoch++;
    const thisSetupId = currentSetupId;
    const thisSetupEpoch = setupEpoch;
    hasGivenUp = false;
    hasTrackedOnceRef.current = false;
    clearRuntimeTimers({ keepReconnectTimer: true });
    isTrackingInFlight = false;
    trackingSetupId = 0;

    const channel = supabase.channel('online-users', { config: { presence: { key: sessionId.current } } });
    presenceChannelRef.current = channel;

    const thisSubscriptionTimeout = setTimeout(() => {
      if (subscriptionTimeout !== thisSubscriptionTimeout) return;
      subscriptionTimeout = null;
      if (thisSetupId !== currentSetupId || thisSetupEpoch !== setupEpoch) return;
      if (disposed) return;
      console.warn('Presence subscription timeout, retrying...');

      if (retryCount < maxRetries) {
        retryCount++;
        restartPresence();
      } else if (!hasGivenUp) {
        hasGivenUp = true;
          syncLog('⚠ Presence: max retries reached, staying in degraded state');
          clearSyncInterval();
          clearSelfHealInterval();
          setPresenceConnected(false);
          presenceConnectedRef.current = false;
          supabase.removeChannel(channel);
        presenceChannelRef.current = null;
        schedulePresenceReconnect('subscription timeout');
      }
    }, 10000);
    subscriptionTimeout = thisSubscriptionTimeout;

    channel
      .on('presence', { event: 'sync' }, () => {
        if (thisSetupId !== currentSetupId) return;
        const state = channel.presenceState();
        setActiveUsers(buildActiveUsersFromState(state));
      })
      .on('presence', { event: 'join' }, () => {
        if (thisSetupId !== currentSetupId) return;
        scheduleTransientTimeout(() => {
          if (thisSetupId !== currentSetupId) return;
          const state = channel.presenceState();
          setActiveUsers(buildActiveUsersFromState(state));
        }, 100);
      })
      .on('presence', { event: 'leave' }, () => {
        if (thisSetupId !== currentSetupId) return;
        scheduleTransientTimeout(() => {
          if (thisSetupId !== currentSetupId) return;
          const state = channel.presenceState();
          setActiveUsers(buildActiveUsersFromState(state));
        }, 100);
      })
      .subscribe(async (status) => {
        if (disposed) return;
        if (thisSetupId !== currentSetupId || thisSetupEpoch !== setupEpoch) return;
        if (channel !== presenceChannelRef.current) return;

        syncLog('Presence subscription status:', status);
        lastPresenceStatus = status;
        if (typeof onStatusChange === 'function') onStatusChange(status);

        if (status === 'SUBSCRIBED') {
          clearSubscriptionTimeout();
          clearFallbackTimer();
          clearRetryTimer();
          clearCloseGraceTimer();
          clearStableTimer();
          clearCloseRecoveryTimer();
          clearReconnectTimer();
          hasGivenUp = false;
          trackFailStreak = 0;
          retryCount = 0;
          reconnectBackoffMs = 60000;

          stableTimer = setTimeout(() => {
            stableTimer = null;
            if (disposed) return;
            if (thisSetupId === currentSetupId && presenceConnectedRef.current) {
              retryCount = 0;
              reconnectBackoffMs = 60000;
              syncLog('📡 Presence stable for 10s, reset retry count and backoff');
            }
          }, 10000);

          clearSyncInterval();
          syncInterval = setInterval(() => {
            if (thisSetupId === currentSetupId) trackPresence(channel, selectedDateRef.current, thisSetupId);
          }, 30000);

          clearSelfHealInterval();
          selfHealInterval = setInterval(() => {
            if (thisSetupId === currentSetupId && presenceChannelRef.current) {
              const state = presenceChannelRef.current.presenceState();
              setActiveUsers(buildActiveUsersFromState(state));
            }
          }, 15000);

          await trackPresence(channel, selectedDateRef.current, thisSetupId);
          if (typeof onTrackSuccess === 'function') onTrackSuccess();
        } else if (status === 'CHANNEL_ERROR') {
          if (thisSetupId !== currentSetupId) return;
          if (isLoggingOutRef.current) return;
          if (isRestartingPresence) return;
          clearSubscriptionTimeout();

          if (retryCount < maxRetries) {
            retryCount++;
            syncLog(`Presence channel error, retrying (${retryCount}/${maxRetries})...`);
            clearRetryTimer();
            retryTimer = setTimeout(() => {
              retryTimer = null;
              if (thisSetupId === currentSetupId && !isRestartingPresence) restartPresenceForSetup(thisSetupId);
            }, 2000 * retryCount);
          } else if (!hasGivenUp) {
            hasGivenUp = true;
            syncLog('⚠ Presence: max retries reached, giving up');
            clearSyncInterval();
            clearSelfHealInterval();
            setPresenceConnected(false);
            presenceConnectedRef.current = false;
            supabase.removeChannel(channel);
            presenceChannelRef.current = null;
            schedulePresenceReconnect('CHANNEL_ERROR');
          }
        } else if (status === 'CLOSED' || status === 'TIMED_OUT') {
          if (thisSetupId !== currentSetupId) return;
          if (isLoggingOutRef.current) {
            syncLog('Presence CLOSED during logout - not retrying');
            return;
          }
          if (isRestartingPresence) {
            syncLog('Presence CLOSED during intentional restart - not retrying');
            return;
          }

          clearSubscriptionTimeout();
          if (closeRecoveryTimer) return;
          clearCloseGraceTimer();
          closeRecoveryTimer = setTimeout(() => {
            closeRecoveryTimer = null;
            if (disposed) return;
            if (thisSetupId !== currentSetupId) return;
            if (lastPresenceStatus === 'SUBSCRIBED') return;
            if (isRestartingPresence || isLoggingOutRef.current) return;

            setPresenceConnected(false);
            presenceConnectedRef.current = false;

            if (retryCount < maxRetries) {
              retryCount++;
              syncLog(`Presence remained ${status}, recovering (${retryCount}/${maxRetries})...`);
              restartPresenceForSetup(thisSetupId);
            } else if (!hasGivenUp) {
              hasGivenUp = true;
              syncLog('⚠ Presence: max retries reached, giving up');
              clearSyncInterval();
              clearSelfHealInterval();
              presenceChannelRef.current = null;
              schedulePresenceReconnect(status);
            }
          }, 3000);
        }
      });
  };

  setupPresence();

  let lastPresenceTrackAt = 0;
  const PRESENCE_THROTTLE_MS = 15000;

  const throttledTrackPresence = () => {
    if (disposed) return;
    const now = Date.now();
    if (now - lastPresenceTrackAt < PRESENCE_THROTTLE_MS) return;
    if (!presenceChannelRef.current || !presenceConnectedRef.current) return;
    lastPresenceTrackAt = now;
    trackPresence(presenceChannelRef.current, selectedDateRef.current, currentSetupId);
  };

  const handleVisibilityChange = () => {
    if (disposed) return;
    if (document.visibilityState === 'visible' && presenceChannelRef.current && userName) {
      syncLog('👁️ Tab visible again, re-tracking presence immediately');
      lastPresenceTrackAt = Date.now();
      trackPresence(presenceChannelRef.current, selectedDateRef.current, currentSetupId);
    }
  };

  const handleFocus = () => {
    throttledTrackPresence();
  };

  const handleOnlinePresence = () => {
    if (disposed) return;
    if (!presenceConnectedRef.current && userName) {
      syncLog(' Network online, attempting presence recovery...');
      retryCount = 0;
      reconnectBackoffMs = 60000;
      clearReconnectTimer();
      restartPresenceForSetup();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleOnlinePresence);

  const forceLogoutChannel = supabase
    .channel('force-logout')
    .on('broadcast', { event: 'logout-all' }, (payload) => {
      syncLog('Force logout received:', payload);
      if (payload.payload?.initiatedBy !== userName) {
        alert('⚠ You have been logged out by an administrator.\n\nInitiated by: ' + (payload.payload?.initiatedBy || 'Admin'));
        handleLogout();
      }
    })
    .subscribe();

  return () => {
    disposed = true;
    clearRuntimeTimers();
    isTrackingInFlight = false;
    trackingSetupId = 0;
    setPresenceConnected(false);
    presenceConnectedRef.current = false;

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleOnlinePresence);

    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    supabase.removeChannel(forceLogoutChannel);
  };
};

export const syncPresenceDate = ({ presenceChannelRef, userName, user, presenceConnectedRef, selectedDate }) => {
  if (!presenceChannelRef.current || !userName || !presenceConnectedRef.current) return;

  syncLog('📅 Date changed, re-tracking presence with date:', selectedDate);
  presenceChannelRef.current
    .track({
      user_id: user?.id || null,
      user_name: userName,
      online_at: new Date().toISOString(),
      current_date: selectedDate,
    })
    .catch((e) => console.warn('Presence track failed (date change):', e));
};
