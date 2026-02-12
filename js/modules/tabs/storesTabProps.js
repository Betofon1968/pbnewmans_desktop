// Stores tab prop extraction (safe, behavior-preserving)
// Keeps App.js focused on orchestration while the tab receives only what it uses.

export const createStoresTabProps = (app) => ({
  React: app.React,
  StatCard: app.StatCard,
  storesDirectory: app.storesDirectory,
  storeSearch: app.storeSearch,
  setStoreSearch: app.setStoreSearch,
  storeSort: app.storeSort,
  setStoreSort: app.setStoreSort,
  states: app.states,
  trailerSizes: app.trailerSizes,
  formatPhoneNumber: app.formatPhoneNumber,
  addStoreToDirectory: app.addStoreToDirectory,
  updateStoreDirectory: app.updateStoreDirectory,
  removeStoreFromDirectory: app.removeStoreFromDirectory,
  importStoresFromFile: app.importStoresFromFile,
});
