const STALE_PRESENCE_MS = 90000;

export const buildActiveUsersFromState = (state) => {
  const now = Date.now();
  const users = [];
  const userSessions = {};

  for (const key in state) {
    const presences = state[key];
    presences.forEach((presence) => {
      const onlineAt = presence.online_at ? new Date(presence.online_at).getTime() : 0;
      if (now - onlineAt > STALE_PRESENCE_MS) return;

      const groupKey = presence.user_id || presence.user_name;
      if (!groupKey) return;

      if (!userSessions[groupKey]) {
        userSessions[groupKey] = {
          userId: presence.user_id || null,
          name: presence.user_name || 'Unknown',
          count: 0,
          latestDate: null,
          latestJoin: null,
          session: null,
        };
      }

      userSessions[groupKey].count++;

      if (!userSessions[groupKey].latestJoin || presence.online_at > userSessions[groupKey].latestJoin) {
        userSessions[groupKey].latestJoin = presence.online_at;
        userSessions[groupKey].latestDate = presence.current_date;
        userSessions[groupKey].session = key;
        if (presence.user_name) {
          userSessions[groupKey].name = presence.user_name;
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
