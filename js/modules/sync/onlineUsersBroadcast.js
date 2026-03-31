import {syncLog} from './syncDebug.js';

const HEARTBEAT_MS = 15000;
const PRUNE_INTERVAL_MS = 10000;
const STALE_SESSION_MS = 45000;

const readField = (payload, ...fieldNames) => {
  for (const fieldName of fieldNames) {
    if (payload?.[fieldName] != null) return payload[fieldName];
  }
  return null;
};

const getSessionKey = (payload) =>
  readField(payload, 'sessionId', 'session_id', 'presence_ref', 'presenceRef', 'phx_ref');

export const setupOnlineUsersBroadcast = ({
  supabase,
  user,
  userName,
  selectedDateRef,
  sessionId,
  onUsersChanged,
}) => {
  if (!userName) {
    return {
      getState: () => ({}),
      announce: async () => false,
      refresh: () => false,
      cleanup: () => {},
      isSubscribed: () => false,
    };
  }

  let channel = null;
  let disposed = false;
  let subscribed = false;
  let heartbeatInterval = null;
  let pruneInterval = null;
  const sessions = new Map();

  const notifyUsersChanged = () => {
    if (typeof onUsersChanged === 'function') onUsersChanged();
  };

  const clearHeartbeatInterval = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  const clearPruneInterval = () => {
    if (pruneInterval) {
      clearInterval(pruneInterval);
      pruneInterval = null;
    }
  };

  const upsertSession = (payload) => {
    const sessionKey = getSessionKey(payload);
    if (!sessionKey) return false;

    const previous = sessions.get(sessionKey) || {};
    const now = Date.now();
    sessions.set(sessionKey, {
      sessionId: sessionKey,
      userId: readField(payload, 'user_id', 'userId', 'id') ?? previous.userId ?? null,
      userName: readField(payload, 'user_name', 'userName', 'name') ?? previous.userName ?? 'Online User',
      currentDate: readField(payload, 'current_date', 'currentDate') ?? previous.currentDate ?? null,
      onlineAt:
        readField(payload, 'online_at', 'onlineAt', 'joined_at', 'joinedAt') ??
        previous.onlineAt ??
        new Date(now).toISOString(),
      lastSeenAt: now,
    });
    return true;
  };

  const pruneSessions = () => {
    const now = Date.now();
    let didPrune = false;

    sessions.forEach((entry, key) => {
      if (key === sessionId.current) return;
      const lastSeenAt = Number(entry?.lastSeenAt) || 0;
      if (!lastSeenAt || now - lastSeenAt > STALE_SESSION_MS) {
        sessions.delete(key);
        didPrune = true;
      }
    });

    if (didPrune) notifyUsersChanged();
  };

  const buildState = () => {
    const now = Date.now();
    const state = {};

    sessions.forEach((entry, key) => {
      if (!entry) return;
      const lastSeenAt = Number(entry.lastSeenAt) || 0;
      if (key !== sessionId.current && lastSeenAt && now - lastSeenAt > STALE_SESSION_MS) return;

      state[key] = [
        {
          user_id: entry.userId || null,
          user_name: entry.userName || null,
          current_date: entry.currentDate || null,
          online_at: entry.onlineAt || new Date(lastSeenAt || now).toISOString(),
          session_id: key,
          sessionId: key,
        },
      ];
    });

    return state;
  };

  const announce = async (reason = 'heartbeat', explicitDate = selectedDateRef.current) => {
    if (disposed || !userName) return false;

    const payload = {
      sessionId: sessionId.current,
      session_id: sessionId.current,
      user_id: user?.id || null,
      user_name: userName,
      current_date: explicitDate,
      online_at: new Date().toISOString(),
    };

    upsertSession(payload);
    notifyUsersChanged();

    if (!channel || !subscribed) return false;

    try {
      await channel.send({
        type: 'broadcast',
        event: 'presence-announce',
        payload,
      });
      if (reason !== 'heartbeat') {
        syncLog(`Presence broadcast sent (${reason})`);
      }
      return true;
    } catch (error) {
      console.warn('Presence broadcast failed:', error);
      return false;
    }
  };

  const requestPeerAnnounce = async (reason = 'request') => {
    if (disposed || !channel || !subscribed) return false;

    try {
      await channel.send({
        type: 'broadcast',
        event: 'presence-request',
        payload: {
          sessionId: sessionId.current,
          session_id: sessionId.current,
          requested_at: new Date().toISOString(),
        },
      });
      syncLog(`Presence peer request sent (${reason})`);
      return true;
    } catch (error) {
      console.warn('Presence peer request failed:', error);
      return false;
    }
  };

  const announceLeave = async () => {
    const payload = {
      sessionId: sessionId.current,
      session_id: sessionId.current,
      user_id: user?.id || null,
      user_name: userName,
      current_date: selectedDateRef.current,
      online_at: new Date().toISOString(),
    };

    sessions.delete(sessionId.current);
    notifyUsersChanged();

    if (!channel || !subscribed) return false;

    try {
      await channel.send({
        type: 'broadcast',
        event: 'presence-leave',
        payload,
      });
      return true;
    } catch (error) {
      console.warn('Presence leave broadcast failed:', error);
      return false;
    }
  };

  const removeChannel = () => {
    subscribed = false;
    clearHeartbeatInterval();
    clearPruneInterval();

    const channelToRemove = channel;
    if (!channelToRemove) return;
    supabase.removeChannel(channelToRemove);
    channel = null;
  };

  const subscribe = () => {
    if (disposed || !userName) return;

    removeChannel();
    const nextChannel = supabase
      .channel('online-users-broadcast')
      .on('broadcast', { event: 'presence-announce' }, (payload) => {
        if (disposed || nextChannel !== channel) return;
        const incomingPayload = payload?.payload || {};
        if (!upsertSession(incomingPayload)) return;
        syncLog(
          'Presence announce received from:',
          readField(incomingPayload, 'user_name', 'userName', 'name') || getSessionKey(incomingPayload)
        );
        notifyUsersChanged();
      })
      .on('broadcast', { event: 'presence-request' }, (payload) => {
        if (disposed || nextChannel !== channel) return;
        const incomingPayload = payload?.payload || {};
        const requesterSession = getSessionKey(incomingPayload);
        if (!requesterSession || requesterSession === sessionId.current) return;
        syncLog('Presence peer request received from:', requesterSession);
        announce('reply');
      })
      .on('broadcast', { event: 'presence-leave' }, (payload) => {
        if (disposed || nextChannel !== channel) return;
        const sessionKey = getSessionKey(payload?.payload || {});
        if (!sessionKey) return;
        if (!sessions.delete(sessionKey)) return;
        notifyUsersChanged();
      })
      .subscribe(async (status) => {
        if (disposed || nextChannel !== channel) return;

        syncLog('Presence broadcast channel:', status);
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          clearHeartbeatInterval();
          clearPruneInterval();
          heartbeatInterval = setInterval(() => {
            announce('heartbeat');
          }, HEARTBEAT_MS);
          pruneInterval = setInterval(() => {
            pruneSessions();
          }, PRUNE_INTERVAL_MS);
          await announce('subscribed');
          await requestPeerAnnounce('subscribed');
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          subscribed = false;
          clearHeartbeatInterval();
          clearPruneInterval();
        }
      });

    channel = nextChannel;
  };

  subscribe();

  return {
    getState: buildState,
    announce,
    refresh: () => {
      pruneSessions();
      if (!channel || !subscribed) {
        subscribe();
        return false;
      }
      announce('refresh');
      requestPeerAnnounce('refresh');
      return true;
    },
    cleanup: () => {
      disposed = true;
      announceLeave();
      removeChannel();
    },
    isSubscribed: () => subscribed,
  };
};
