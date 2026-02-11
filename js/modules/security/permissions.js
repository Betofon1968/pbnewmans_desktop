export const findCurrentUserData = ({ user, usersDirectory }) => {
  const currentUserEmail = user?.email?.toLowerCase();
  return usersDirectory.find((u) => u.email?.toLowerCase() === currentUserEmail);
};

export const buildEffectivePermissions = ({ rolePermissions, currentUserRole, currentUserData }) => {
  const roleDefaults = rolePermissions[currentUserRole] || rolePermissions.Viewer;
  const customPerms = currentUserData?.permissions || {};
  return {
    tabs: { ...roleDefaults.tabs, ...customPerms.tabs },
    actions: { ...roleDefaults.actions, ...customPerms.actions },
  };
};

export const canAccessTabByPermissions = (userPermissions, tabName) => {
  const access = userPermissions.tabs[tabName];
  return access === 'edit' || access === 'view';
};

export const canEditTabByPermissions = (userPermissions, tabName) => {
  return userPermissions.tabs[tabName] === 'edit';
};

export const canPerformActionByPermissions = (userPermissions, actionName) => {
  return userPermissions.actions[actionName] === true;
};
