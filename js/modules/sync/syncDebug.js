const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

const parseBooleanLike = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  return TRUTHY_VALUES.has(String(value).trim().toLowerCase());
};

const getWindowSyncDebug = () => {
  if (typeof window === 'undefined') return false;
  return parseBooleanLike(window.SYNC_DEBUG);
};

const getQuerySyncDebug = () => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search || '');
    if (!params.has('sync_debug')) return null;
    return parseBooleanLike(params.get('sync_debug'));
  } catch (_err) {
    return null;
  }
};

const getLocalStorageSyncDebug = () => {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem('SYNC_DEBUG');
    if (value == null) return null;
    return parseBooleanLike(value);
  } catch (_err) {
    return null;
  }
};

export const isSyncDebugEnabled = () => {
  const queryValue = getQuerySyncDebug();
  if (queryValue !== null) return queryValue;

  const storageValue = getLocalStorageSyncDebug();
  if (storageValue !== null) return storageValue;

  return getWindowSyncDebug();
};

export const setSyncDebugEnabled = (enabled) => {
  const normalized = !!enabled;
  if (typeof window !== 'undefined') {
    window.SYNC_DEBUG = normalized;
    try {
      window.localStorage.setItem('SYNC_DEBUG', normalized ? '1' : '0');
    } catch (_err) {
      // Ignore storage issues in private mode.
    }
  }
  return normalized;
};

export const syncLog = (...args) => {
  if (!isSyncDebugEnabled()) return;
  console.log(...args);
};

if (typeof window !== 'undefined') {
  window.setSyncDebug = setSyncDebugEnabled;
  window.isSyncDebugEnabled = isSyncDebugEnabled;
}
