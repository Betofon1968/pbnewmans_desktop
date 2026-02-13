// Tab prop extraction (safe, behavior-preserving)
// Limits tab inputs to values this tab actually consumes.

export const createAiLogisticsTabProps = (scope) => ({
  React: scope.React,
  addTruckToDirectory: scope.addTruckToDirectory,
  aiLogisticsSubTab: scope.aiLogisticsSubTab,
  driversDirectory: scope.driversDirectory,
  hasPendingChanges: scope.hasPendingChanges,
  palletTypes: scope.palletTypes,
  removeTruckFromDirectory: scope.removeTruckFromDirectory,
  setAiLogisticsSubTab: scope.setAiLogisticsSubTab,
  setPalletTypes: scope.setPalletTypes,
  storesDirectory: scope.storesDirectory,
  truckStatuses: scope.truckStatuses,
  trucksDirectory: scope.trucksDirectory,
  updateStoreDirectory: scope.updateStoreDirectory,
  updateTruckDirectory: scope.updateTruckDirectory,
});
