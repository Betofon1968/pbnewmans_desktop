// Stores tab prop extraction (safe, behavior-preserving)
// Keeps App.js focused on orchestration while the tab receives only what it uses.

export const createStoresTabProps = (scope) => ({
  React: scope.React,
  StatCard: scope.StatCard,
  storesDirectory: scope.storesDirectory,
  states: scope.states,
  trailerSizes: scope.trailerSizes,
  formatPhoneNumber: scope.formatPhoneNumber,
  addStoreToDirectory: scope.addStoreToDirectory,
  updateStoreDirectory: scope.updateStoreDirectory,
  removeStoreFromDirectory: scope.removeStoreFromDirectory,
  importStoresFromFile: scope.importStoresFromFile,
});
