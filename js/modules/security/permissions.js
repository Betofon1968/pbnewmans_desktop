const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const mergePermissionTree = (baseValue, overrideValue) => {
  if (!isPlainObject(baseValue) && !isPlainObject(overrideValue)) {
    return overrideValue === undefined ? baseValue : overrideValue;
  }

  const baseObj = isPlainObject(baseValue) ? baseValue : {};
  const overrideObj = isPlainObject(overrideValue) ? overrideValue : {};
  const merged = { ...baseObj };

  Object.keys(overrideObj).forEach((key) => {
    const baseChild = baseObj[key];
    const overrideChild = overrideObj[key];
    if (overrideChild === undefined) return;
    merged[key] = mergePermissionTree(baseChild, overrideChild);
  });

  return merged;
};

const toBooleanPermission = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'on', 'allowed', 'allow'].includes(normalized);
  }
  return false;
};

const toTabAccessLevel = (value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'edit') return 'edit';
    if (normalized === 'view') return 'view';
    if (normalized === 'none') return 'none';
  }

  if (toBooleanPermission(value)) return 'view';
  return 'none';
};

const resolveTabAccess = (tabs, tabName) => {
  const access = tabs?.[tabName];
  if (isPlainObject(access)) {
    return toTabAccessLevel(access.access ?? access.level ?? access.mode ?? access.value ?? access.self);
  }
  return toTabAccessLevel(access);
};

export const findCurrentUserData = ({ user, usersDirectory }) => {
  const currentUserEmail = user?.email?.toLowerCase();
  return usersDirectory.find((u) => u.email?.toLowerCase() === currentUserEmail);
};

export const buildEffectivePermissions = ({ rolePermissions, currentUserRole, currentUserData }) => {
  const roleDefaults = rolePermissions[currentUserRole] || rolePermissions.Viewer || {};
  const customPerms = currentUserData?.permissions || {};

  return {
    tabs: mergePermissionTree(roleDefaults.tabs || {}, customPerms.tabs || {}),
    actions: mergePermissionTree(roleDefaults.actions || {}, customPerms.actions || {}),
  };
};

export const canAccessTabByPermissions = (userPermissions, tabName) => {
  const access = resolveTabAccess(userPermissions?.tabs, tabName);
  return access === 'edit' || access === 'view';
};

export const canEditTabByPermissions = (userPermissions, tabName) => {
  return resolveTabAccess(userPermissions?.tabs, tabName) === 'edit';
};

export const canPerformActionByPermissions = (userPermissions, actionName) => {
  return toBooleanPermission(userPermissions?.actions?.[actionName]);
};
