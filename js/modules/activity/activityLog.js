export const logActivityEntry = async ({
  supabase,
  user,
  userName,
  actionType,
  entityType,
  entityId,
  entityName,
  fieldChanged,
  oldValue,
  newValue,
  routeDate = null,
  details = null,
}) => {
  if (!user) {
    console.warn('⚠ logActivity skipped - user is null (auth issue?)');
    return;
  }

  try {
    console.log(` Logging activity: ${actionType} ${entityType} by ${userName}`);
    const { error } = await supabase.from('activity_log').insert({
      user_id: user.id,
      user_name: userName || user.email,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      field_changed: fieldChanged,
      old_value: oldValue ? String(oldValue) : null,
      new_value: newValue ? String(newValue) : null,
      route_date: routeDate,
      details,
    });

    if (error) console.error(' Error logging activity:', error);
    else console.log(`✅ Activity logged: ${actionType} ${entityType}`);
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

export const loadActivityLogEntries = async ({
  supabase,
  activityLogFilter,
  setActivityLog,
  setActivityLogLoading,
}) => {
  setActivityLogLoading(true);

  try {
    let query = supabase.from('activity_log').select('*').order('timestamp', { ascending: false });

    const now = new Date();
    if (activityLogFilter.dateRange === '24hours') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      query = query.gte('timestamp', yesterday.toISOString());
    } else if (activityLogFilter.dateRange === '7days') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte('timestamp', weekAgo.toISOString());
    } else if (activityLogFilter.dateRange === '30days') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      query = query.gte('timestamp', monthAgo.toISOString());
    }

    if (activityLogFilter.user) {
      query = query.eq('user_name', activityLogFilter.user);
    }

    if (activityLogFilter.entityType) {
      query = query.eq('entity_type', activityLogFilter.entityType);
    }

    query = query.limit(500);
    const { data, error } = await query;
    if (error) throw error;

    let filtered = data || [];
    if (activityLogFilter.search) {
      const searchLower = activityLogFilter.search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          (log.entity_name && String(log.entity_name).toLowerCase().includes(searchLower)) ||
          (log.field_changed && String(log.field_changed).toLowerCase().includes(searchLower)) ||
          (log.old_value && String(log.old_value).toLowerCase().includes(searchLower)) ||
          (log.new_value && String(log.new_value).toLowerCase().includes(searchLower)) ||
          (log.user_name && String(log.user_name).toLowerCase().includes(searchLower))
      );
    }

    setActivityLog(filtered);
  } catch (err) {
    console.error('Error loading activity log:', err);
    setActivityLog([]);
  } finally {
    setActivityLogLoading(false);
  }
};
