export function createRouteStoreOpsHandlers({
  routes,
  selectedDate,
  setRoutes,
  setDeleteConfirmModal,
  pushUndo,
  logActivity,
  hasPendingChanges,
  markFieldDirty
}) {
  const addStore = (routeId) => {
    hasPendingChanges.current = true;

    const newId = crypto.randomUUID();
    const route = routes.find((r) => r.id === routeId);
    const driverRoutes = routes.filter((r) => r.driver === route?.driver);
    const routeNum = driverRoutes.indexOf(route) + 1;
    const routeName = route?.driver ? `${route.driver} #${routeNum}` : `Route #${routeId}`;

    pushUndo(`Add store to ${routeName}`, routeId, routes);
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;

        const palletTypesForRoute = [];
        for (let i = 0; i < r.palletCount; i++) {
          if (i < 6) {
            palletTypesForRoute.push('FZ');
          } else if (i === 6) {
            palletTypesForRoute.push('DR');
          } else if (i === 7) {
            palletTypesForRoute.push('FH');
          } else {
            palletTypesForRoute.push('FZ');
          }
        }

        return {
          ...r,
          stores: [
            ...r.stores,
            {
              id: newId,
              code: '',
              name: '',
              pallets: Array(r.palletCount).fill(null),
              palletTypes: palletTypesForRoute,
              palletLinks: Array(r.palletCount).fill(false),
              tc: 0,
              fresh: null,
              notes: '',
              internalNotes: '',
              driverNotes: ''
            }
          ]
        };
      })
    );

    logActivity('create', 'store', String(newId), `New store on ${routeName}`, null, null, null, selectedDate);
  };

  const removeStore = (routeId, storeId) => {
    const route = routes.find((r) => r.id === routeId);
    const store = route?.stores?.find((s) => s.id === storeId);
    const storeName = store ? `${store.code || ''} ${store.name || ''}`.trim() : `Store ${storeId}`;
    const driverRoutes = routes.filter((r) => r.driver === route?.driver);
    const routeNum = driverRoutes.indexOf(route) + 1;
    const routeName = route?.driver ? `${route.driver} #${routeNum}` : `Route #${routeId}`;

    setDeleteConfirmModal({
      type: 'Store',
      id: storeId,
      name: `${storeName} from ${routeName}`,
      onConfirm: () => {
        hasPendingChanges.current = true;
        pushUndo(`Delete ${storeName || 'store'} from ${routeName}`, routeId, routes);
        setRoutes((prev) =>
          prev.map((r) => {
            if (r.id !== routeId) return r;
            return { ...r, stores: r.stores.filter((s) => s.id !== storeId) };
          })
        );
        logActivity('delete', 'store', String(storeId), `${storeName} from ${routeName}`, null, storeName, null, selectedDate);
      }
    });
  };

  const moveRoute = (routeId, direction) => {
    console.log('📦 moveRoute called:', routeId, direction);
    hasPendingChanges.current = true;
    setRoutes((prev) => {
      const routesCopy = [...prev];
      const index = routesCopy.findIndex((r) => r.id === routeId);
      if (index === -1) {
        console.log('📦 Route not found:', routeId);
        return prev;
      }
      if ((direction === 'up' && index === 0) || (direction === 'down' && index === routesCopy.length - 1)) {
        console.log('📦 Cannot move further:', direction);
        return prev;
      }

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [routesCopy[index], routesCopy[newIndex]] = [routesCopy[newIndex], routesCopy[index]];

      const updatedRoutes = routesCopy.map((route, idx) => ({ ...route, route_order: idx }));
      markFieldDirty(routesCopy[index].id, 'route_order');
      markFieldDirty(routesCopy[newIndex].id, 'route_order');
      console.log(
        '📦 Routes reordered:',
        updatedRoutes.map((r) => ({ id: r.id?.substring(0, 8), order: r.route_order, driver: r.driver }))
      );
      return updatedRoutes;
    });
  };

  const moveStore = (routeId, storeId, direction) => {
    hasPendingChanges.current = true;
    setRoutes((prev) =>
      prev.map((route) => {
        if (route.id !== routeId) return route;

        const stores = [...route.stores];
        const index = stores.findIndex((s) => s.id === storeId);
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === stores.length - 1)) {
          return route;
        }

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [stores[index], stores[newIndex]] = [stores[newIndex], stores[index]];
        return { ...route, stores };
      })
    );
  };

  return {
    addStore,
    removeStore,
    moveRoute,
    moveStore
  };
}
