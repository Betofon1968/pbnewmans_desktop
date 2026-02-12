export function createEquipmentDirectoryHandlers({
  trucksDirectory,
  trailersDirectory,
  tractorsDirectory,
  hasPendingChanges,
  lastInteractionTime,
  setTrucksDirectory,
  setTrailersDirectory,
  setTractorsDirectory,
  setDeleteConfirmModal
}) {
  const addTruckToDirectory = () => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();
    const newId = Math.max(...trucksDirectory.map((t) => t.id), 0) + 1;
    setTrucksDirectory((prev) => [
      ...prev,
      {
        id: newId,
        number: '',
        zone: 'Zone A',
        vin: '',
        make: 'Freightliner',
        model: '',
        year: '',
        plate: '',
        plateExp: '',
        maxTrailer: "53'",
        maxPallets: 22,
        status: 'Active',
        mileage: 0,
        lastService: '',
        nextService: '',
        assignedDriver: '',
        notes: ''
      }
    ]);
  };

  const updateTruckDirectory = (truckId, field, value) => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();
    setTrucksDirectory((prev) =>
      prev.map((truck) => {
        if (truck.id !== truckId) return truck;
        return { ...truck, [field]: value };
      })
    );
  };

  const removeTruckFromDirectory = (truckId) => {
    const truck = trucksDirectory.find((t) => t.id === truckId);
    setDeleteConfirmModal({
      type: 'Truck',
      id: truckId,
      name: truck ? `#${truck.number} - ${truck.make} ${truck.model}` : 'Unknown Truck',
      onConfirm: () => {
        hasPendingChanges.current = true;
        lastInteractionTime.current = Date.now();
        setTrucksDirectory((prev) => prev.filter((t) => t.id !== truckId));
      }
    });
  };

  const addTrailerToDirectory = () => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();
    const newId = Math.max(...trailersDirectory.map((t) => t.id), 0) + 1;
    setTrailersDirectory((prev) => [
      ...prev,
      {
        id: newId,
        number: '',
        type: 'Refrigerated',
        size: "53'",
        vin: '',
        make: 'Utility',
        model: '',
        year: '',
        plate: '',
        plateExp: '',
        maxPallets: 22,
        status: 'Active',
        notes: ''
      }
    ]);
  };

  const updateTrailerDirectory = (trailerId, field, value) => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();
    setTrailersDirectory((prev) =>
      prev.map((trailer) => {
        if (trailer.id !== trailerId) return trailer;
        return { ...trailer, [field]: value };
      })
    );
  };

  const removeTrailerFromDirectory = (trailerId) => {
    const trailer = trailersDirectory.find((t) => t.id === trailerId);
    setDeleteConfirmModal({
      type: 'Trailer',
      id: trailerId,
      name: trailer ? `#${trailer.number} - ${trailer.size} ${trailer.type}` : 'Unknown Trailer',
      onConfirm: () => {
        hasPendingChanges.current = true;
        lastInteractionTime.current = Date.now();
        setTrailersDirectory((prev) => prev.filter((t) => t.id !== trailerId));
      }
    });
  };

  const addTractorToDirectory = () => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();
    const newId = Math.max(...tractorsDirectory.map((t) => t.id), 0) + 1;
    setTractorsDirectory((prev) => [
      ...prev,
      {
        id: newId,
        number: '',
        vin: '',
        make: 'Freightliner',
        model: '',
        year: '',
        plate: '',
        plateExp: '',
        mileage: 0,
        status: 'Active',
        assignedTrailer: '',
        notes: ''
      }
    ]);
  };

  const updateTractorDirectory = (tractorId, field, value) => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();
    setTractorsDirectory((prev) =>
      prev.map((tractor) => {
        if (tractor.id !== tractorId) return tractor;
        return { ...tractor, [field]: value };
      })
    );
  };

  const removeTractorFromDirectory = (tractorId) => {
    const tractor = tractorsDirectory.find((t) => t.id === tractorId);
    setDeleteConfirmModal({
      type: 'Tractor',
      id: tractorId,
      name: tractor ? `#${tractor.number} - ${tractor.make} ${tractor.model}` : 'Unknown Tractor',
      onConfirm: () => {
        hasPendingChanges.current = true;
        lastInteractionTime.current = Date.now();
        setTractorsDirectory((prev) => prev.filter((t) => t.id !== tractorId));
      }
    });
  };

  return {
    addTruckToDirectory,
    updateTruckDirectory,
    removeTruckFromDirectory,
    addTrailerToDirectory,
    updateTrailerDirectory,
    removeTrailerFromDirectory,
    addTractorToDirectory,
    updateTractorDirectory,
    removeTractorFromDirectory
  };
}
