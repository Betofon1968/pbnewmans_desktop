const STALE_PRESENCE_MS = 90000;

const parsePresenceTimestamp = (value) => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const normalizePresenceEntries = (entry) => {
  if (Array.isArray(entry)) return entry;
  if (Array.isArray(entry?.metas)) return entry.metas;
  if (entry && typeof entry === 'object') return [entry];
  return [];
};

const readPresenceField = (presence, ...fieldNames) => {
  for (const fieldName of fieldNames) {
    if (presence?.[fieldName] != null) return presence[fieldName];
    if (presence?.payload?.[fieldName] != null) return presence.payload[fieldName];
    if (presence?.meta?.[fieldName] != null) return presence.meta[fieldName];
  }
  return null;
};

export const buildActiveUsersFromState = (state) => {
  const now = Date.now();
  const users = [];
  const userSessions = {};

  for (const key in state) {
    const presences = normalizePresenceEntries(state[key]);

    presences.forEach((presence) => {
      const timestampValue = readPresenceField(
        presence,
        'online_at',
        'joined_at',
        'inserted_at',
        'updated_at'
      );
      const onlineAt = parsePresenceTimestamp(timestampValue) || now;
      if (now - onlineAt > STALE_PRESENCE_MS) return;

      const userId = readPresenceField(presence, 'user_id', 'id');
      const userName = readPresenceField(presence, 'user_name', 'name');
      const currentDate = readPresenceField(presence, 'current_date');
      const sessionRef = readPresenceField(presence, 'phx_ref', 'presence_ref', 'session_id') || key;
      const groupKey = userId || userName || sessionRef;
      if (!groupKey) return;

      if (!userSessions[groupKey]) {
        userSessions[groupKey] = {
          userId: userId || null,
          name: userName || 'Online User',
          count: 0,
          latestDate: null,
          latestJoin: null,
          latestJoinTs: 0,
          session: sessionRef,
        };
      }

      userSessions[groupKey].count++;

      if (!userSessions[groupKey].latestJoinTs || onlineAt > userSessions[groupKey].latestJoinTs) {
        userSessions[groupKey].latestJoinTs = onlineAt;
        userSessions[groupKey].latestJoin = timestampValue || new Date(onlineAt).toISOString();
        userSessions[groupKey].latestDate = currentDate;
        userSessions[groupKey].session = sessionRef;
        if (userName) {
          userSessions[groupKey].name = userName;
        }
      }
    });
  }

  for (const key in userSessions) {
    users.push({
      userId: userSessions[key].userId,
      name: userSessions[key].name,
      session: userSessions[key].session,
      joinedAt: userSessions[key].latestJoin,
      currentDate: userSessions[key].latestDate,
      sessionCount: userSessions[key].count,
    });
  }

  return users;
};
