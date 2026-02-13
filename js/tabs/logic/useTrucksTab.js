export function useTrucksTab({ React }) {
  const { useState } = React;

  const [truckSubTab, setTruckSubTab] = useState('Equipment');
  const [equipmentType, setEquipmentType] = useState('Trucks');

  return {
    truckSubTab,
    setTruckSubTab,
    equipmentType,
    setEquipmentType
  };
}
