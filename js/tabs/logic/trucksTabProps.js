// Trucks tab prop extraction (safe, behavior-preserving)
// Limits tab inputs to the values TrucksTab actually consumes.

export const createTrucksTabProps = (scope) => ({
  React: scope.React,
  truckSubTab: scope.truckSubTab,
  setTruckSubTab: scope.setTruckSubTab,
  equipmentType: scope.equipmentType,
  setEquipmentType: scope.setEquipmentType,
  trucksDirectory: scope.trucksDirectory,
  truckMakes: scope.truckMakes,
  truckStatuses: scope.truckStatuses,
  addTruckToDirectory: scope.addTruckToDirectory,
  updateTruckDirectory: scope.updateTruckDirectory,
  removeTruckFromDirectory: scope.removeTruckFromDirectory,
  trailersDirectory: scope.trailersDirectory,
  trailerTypes: scope.trailerTypes,
  trailerSizes: scope.trailerSizes,
  trailerMakes: scope.trailerMakes,
  addTrailerToDirectory: scope.addTrailerToDirectory,
  updateTrailerDirectory: scope.updateTrailerDirectory,
  removeTrailerFromDirectory: scope.removeTrailerFromDirectory,
  tractorsDirectory: scope.tractorsDirectory,
  addTractorToDirectory: scope.addTractorToDirectory,
  updateTractorDirectory: scope.updateTractorDirectory,
  removeTractorFromDirectory: scope.removeTractorFromDirectory,
  driversDirectory: scope.driversDirectory,
});
