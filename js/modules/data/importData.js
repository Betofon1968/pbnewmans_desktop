export function importDataFromFile({
  event,
  setRoutesByDate,
  setStoresDirectory,
  setDriversDirectory,
  setTrucksDirectory,
  setTrailersDirectory,
  setTractorsDirectory,
  setPalletTypes
}) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.routesByDate) {
        setRoutesByDate(data.routesByDate);
      } else if (data.routes) {
        const today = new Date().toLocaleDateString('en-CA');
        setRoutesByDate({ [today]: data.routes });
      }
      if (data.storesDirectory) setStoresDirectory(data.storesDirectory);
      if (data.driversDirectory) setDriversDirectory(data.driversDirectory);
      if (data.trucksDirectory) setTrucksDirectory(data.trucksDirectory);
      if (data.trailersDirectory) setTrailersDirectory(data.trailersDirectory);
      if (data.tractorsDirectory) setTractorsDirectory(data.tractorsDirectory);
      if (data.palletTypes) setPalletTypes(data.palletTypes);
      alert('Data imported successfully!');
    } catch (err) {
      alert('Failed to import data. Please check the file format.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
