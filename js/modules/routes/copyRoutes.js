function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createCopyRoutesFromDateHandler({
  selectedDate,
  routesByDate,
  setInfoModal,
  hasPendingChanges,
  setRoutesByDate,
  setExpandedRoutes
}) {
  return function copyRoutesFromDate(fromDate, options = {}) {
    const {
      keepDrivers = false,
      keepTrucks = false,
      clearPallets = true,
      replaceExisting = false,
      sourceRoutes: sourceRoutesOverride = null
    } = options;

    const currentRoutes = routesByDate[selectedDate] || [];
    if (currentRoutes.length > 0 && !replaceExisting) {
      setInfoModal({
        type: 'warning',
        title: 'Cannot Copy Routes',
        message: 'This day already has existing routes.',
        details: [
          { label: 'Current Date', value: selectedDate },
          {
            label: 'Existing Routes',
            value: `${currentRoutes.length} route(s)`,
            highlight: true
          }
        ],
        note: 'Please delete existing routes first or select an empty day.'
      });
      return;
    }

    const sourceRoutes = Array.isArray(sourceRoutesOverride)
      ? sourceRoutesOverride
      : routesByDate[fromDate] || [];

    if (sourceRoutes.length === 0) {
      setInfoModal({
        type: 'warning',
        title: 'No Routes to Copy',
        message: 'The selected date has no routes to copy.',
        details: [{ label: 'Source Date', value: fromDate }]
      });
      return;
    }

    const copiedRoutes = sourceRoutes.map((route, idx) => ({
      ...route,
      id: generateUUID(),
      route_order: idx,
      driver: keepDrivers ? route.driver : '',
      truck: keepTrucks ? route.truck : '',
      trailer: keepTrucks ? route.trailer : '',
      confirmed: false,
      confirmedBy: null,
      confirmedAt: null,
      palletCount: 8,
      stores: route.stores.map((store, sIdx) => ({
        ...store,
        id: Date.now() + idx * 100 + sIdx,
        pallets: clearPallets ? ['', '', '', '', '', '', '', ''] : [...(store.pallets || [])],
        palletTypes: clearPallets
          ? ['FZ', 'FZ', 'FZ', 'FZ', 'FZ', 'FZ', 'DR', 'FH']
          : [...(store.palletTypes || ['FZ', 'FZ', 'FZ', 'FZ', 'FZ', 'FZ', 'DR', 'FH'])],
        palletLinks: [false, false, false, false, false, false, false, false],
        cases: clearPallets ? ['', '', '', '', '', '', '', ''] : [...(store.cases || [])],
        tc: clearPallets ? 0 : store.tc || 0,
        notes: '',
        internalNotes: '',
        driverNotes: ''
      }))
    }));

    hasPendingChanges.current = true;
    setRoutesByDate((prev) => ({
      ...prev,
      [selectedDate]: copiedRoutes
    }));
    setExpandedRoutes(copiedRoutes.map((r) => r.id));

    console.log(
      '📋 Copied',
      copiedRoutes.length,
      'routes from',
      fromDate,
      'to',
      selectedDate,
      'options:',
      options
    );

    const totalStores = copiedRoutes.reduce((sum, r) => sum + r.stores.length, 0);
    const optionsUsed = [];
    if (keepDrivers) optionsUsed.push('Driver assignments kept');
    if (keepTrucks) optionsUsed.push('Truck/trailer assignments kept');
    if (!clearPallets) optionsUsed.push('Pallet counts copied');

    setInfoModal({
      type: 'success',
      title: 'Routes Copied Successfully',
      message: 'Route structure has been copied to the selected date.',
      details: [
        { label: 'From Date', value: fromDate },
        { label: 'To Date', value: selectedDate },
        {
          label: 'Routes Copied',
          value: `${copiedRoutes.length} route(s)`,
          highlight: true
        },
        {
          label: 'Stores Copied',
          value: `${totalStores} store(s)`,
          highlight: true
        }
      ],
      note:
        optionsUsed.length > 0
          ? `✓ ${optionsUsed.join(' • ')}`
          : '📋 Stores copied with fresh pallet counts. Notes were cleared.'
    });
  };
}
