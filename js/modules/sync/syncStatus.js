export function getSyncStatusDisplayValue({ syncStatus, needsReload, isOnline }) {
  if (!isOnline) {
    return { text: '⚠ OFFLINE', color: '#f44336' };
  }
  if (needsReload) {
    return { text: 'Reloading...', color: '#ff9800' };
  }
  switch (syncStatus) {
    case 'connecting':
      return { text: 'Connecting...', color: '#ff9800' };
    case 'syncing':
      return { text: 'Saving...', color: '#2196f3' };
    case 'synced':
      return { text: 'Synced', color: '#4caf50' };
    case 'error':
      return { text: 'Connection Error', color: '#f44336' };
    default:
      return { text: 'Unknown', color: '#999' };
  }
}
