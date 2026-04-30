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
      copyEverything = false,
      replaceExisting = false,
      sourceRoutes: sourceRoutesOverride = null
    } = options;
    const shouldKeepDrivers = copyEverything || keepDrivers;
    const shouldKeepTrucks = copyEverything || keepTrucks;
    const shouldClearPallets = copyEverything ? false : clearPallets;
    // Notes (store-level) and pickupAtPB (route-level) are only carried over
    // when "Copy everything including notes" is on. Otherwise they reset.
    const shouldKeepNotes = copyEverything;
    const shouldKeepPickupAtPB = copyEverything;

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

    const copiedRoutes = sourceRoutes.map((route, idx) => {
      const palletCount = route.palletCount || route.pallet_count || 8;

      return {
        ...route,
        id: generateUUID(),
        route_order: idx,
        driver: shouldKeepDrivers ? route.driver : '',
        truck: shouldKeepTrucks ? route.truck : '',
        trailer: shouldKeepTrucks ? route.trailer : '',
        confirmed: false,
        confirmedBy: null,
        confirmedAt: null,
        pickupAtPB: shouldKeepPickupAtPB ? !!route.pickupAtPB : false,
        palletCount,
        stores: (route.stores || []).map((store) => {
          const sourcePallets = Array.isArray(store.pallets) ? store.pallets : [];
          const sourcePalletTypes = Array.isArray(store.palletTypes) ? store.palletTypes : [];
          const sourcePalletLinks = Array.isArray(store.palletLinks) ? store.palletLinks : [];
          const columnCount = Math.max(
            palletCount,
            sourcePallets.length,
            sourcePalletTypes.length,
            sourcePalletLinks.length
          );

          return {
            ...store,
            id: crypto.randomUUID(),
            pallets: shouldClearPallets
              ? Array(columnCount).fill(null)
              : [...sourcePallets],
            palletTypes: sourcePalletTypes.length > 0
              ? [...sourcePalletTypes]
              : Array(columnCount).fill('FZ'),
            // When clearing pallet counts, also clear merge indicators —
            // empty cells should never display "linked to previous".
            palletLinks: shouldClearPallets
              ? Array(columnCount).fill(false)
              : sourcePalletLinks.length > 0
                ? [...sourcePalletLinks]
                : Array(columnCount).fill(false),
            tc: shouldClearPallets ? 0 : store.tc || 0,
            notes: shouldKeepNotes ? (store.notes || '') : '',
            internalNotes: shouldKeepNotes ? (store.internalNotes || '') : '',
            driverNotes: shouldKeepNotes ? (store.driverNotes || '') : ''
          };
        })
      };
    });

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
    if (copyEverything) {
      optionsUsed.push('Everything copied including notes & flags');
    } else {
      if (shouldKeepDrivers) optionsUsed.push('Driver assignments kept');
      if (shouldKeepTrucks) optionsUsed.push('Truck/trailer assignments kept');
      if (!shouldClearPallets) optionsUsed.push('Pallet counts copied');
      else optionsUsed.push('Pallet counts cleared');
      optionsUsed.push('Notes cleared');
    }

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
          : '📋 Stores copied with fresh pallet counts and notes.'
    });
  };
}
