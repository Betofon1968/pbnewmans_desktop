export function createRouteMutationsHandlers({
  routes,
  selectedDate,
  userName,
  currentUserRole,
  setRoutes,
  pushUndo,
  logActivity,
  hasPendingChanges,
  lastInteractionTime,
  editedStores,
  lastEditTime,
  markFieldDirty
}) {
  const EDIT_TRACKING_TTL_MS = 120000;
  const EDIT_TRACKING_SWEEP_MS = 30000;
  let lastEditSweepAt = 0;

  const updatePallet = (routeId, storeId, palletIndex, value) => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();

    const storeKey = `${routeId}-${storeId}`;
    editedStores.current.add(storeKey);
    lastEditTime.current[storeKey] = Date.now();

    const now = Date.now();
    if (now - lastEditSweepAt >= EDIT_TRACKING_SWEEP_MS) {
      Object.keys(lastEditTime.current).forEach((key) => {
        if (now - lastEditTime.current[key] > EDIT_TRACKING_TTL_MS) {
          editedStores.current.delete(key);
          delete lastEditTime.current[key];
        }
      });
      lastEditSweepAt = now;
    }

    const lowerVal = typeof value === 'string' ? value.toLowerCase().trim() : '';
    const isPending = value === '?' || lowerVal === 'p' || lowerVal === 'plt';
    const parsed = parseInt(value, 10);
    const newValue = value === '' ? null : isPending ? '?' : Number.isFinite(parsed) ? parsed : null;

    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;
        return {
          ...r,
          stores: r.stores.map((s) => {
            if (s.id !== storeId) return s;

            const newPallets = [...(s.pallets || [])];
            while (newPallets.length <= palletIndex) {
              newPallets.push(null);
            }
            newPallets[palletIndex] = newValue;

            const newTc = newPallets.reduce((sum, p) => sum + (typeof p === 'number' ? p : 0), 0);
            return { ...s, pallets: newPallets, tc: newTc };
          })
        };
      })
    );
  };

  const updateStore = (routeId, storeId, field, value) => {
    markFieldDirty(routeId, 'stores');
    lastInteractionTime.current = Date.now();

    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;
        return {
          ...r,
          stores: r.stores.map((s) => {
            if (s.id !== storeId) return s;

            if (field === 'palletType') {
              const palletTypes = [...(s.palletTypes || Array(r.palletCount || 8).fill('F'))];
              if (value.index < 0 || value.index >= palletTypes.length) return s;
              palletTypes[value.index] = value.type;
              return { ...s, palletTypes };
            }

            if (field === 'palletLink') {
              const palletLinks = [...(s.palletLinks || Array(r.palletCount || 8).fill(false))];
              if (value.index < 0 || value.index >= palletLinks.length) return s;
              palletLinks[value.index] = !palletLinks[value.index];
              return { ...s, palletLinks };
            }

            return { ...s, [field]: value };
          })
        };
      })
    );
  };

  const updateRoute = (routeId, field, value) => {
    markFieldDirty(routeId, field);
    lastInteractionTime.current = Date.now();

    const route = routes.find((r) => r.id === routeId);
    const oldValue = route ? route[field] : null;
    const driverRoutes = routes.filter((r) => r.driver === route?.driver);
    const routeNum = driverRoutes.indexOf(route) + 1;
    const routeName = route?.driver ? `${route.driver} #${routeNum}` : `Route #${routeId}`;

    if (['driver', 'truck', 'trailer'].includes(field) && oldValue !== value) {
      pushUndo(`${field} change on ${routeName}`, routeId, routes);
    }

    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;
        return { ...r, [field]: value };
      })
    );

    if (['driver', 'truck', 'trailer', 'name', 'region'].includes(field) && oldValue !== value) {
      logActivity('update', 'route', String(routeId), routeName, field, oldValue, value, selectedDate);
    }
  };

  const toggleRouteConfirmation = (routeId) => {
    if (currentUserRole !== 'Admin') {
      alert('Only administrators can confirm routes.');
      return;
    }

    hasPendingChanges.current = true;
    const route = routes.find((r) => r.id === routeId);
    const driverRoutes = routes.filter((r) => r.driver === route?.driver);
    const routeNum = driverRoutes.indexOf(route) + 1;
    const routeName = route?.driver ? route.driver + ' #' + routeNum : 'Route #' + routeNum;
    const isConfirming = !route?.confirmed;

    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === routeId) {
          return {
            ...r,
            confirmed: isConfirming,
            confirmedBy: isConfirming ? userName : null,
            confirmedAt: isConfirming ? new Date().toISOString() : null
          };
        }
        return r;
      })
    );

    logActivity(
      isConfirming ? 'confirm' : 'unconfirm',
      'route',
      String(routeId),
      routeName,
      'confirmed',
      isConfirming ? 'No' : 'Yes',
      isConfirming ? 'Yes' : 'No',
      selectedDate,
      isConfirming ? 'Route confirmed for loading' : 'Route confirmation removed'
    );
  };

  return {
    updatePallet,
    updateStore,
    updateRoute,
    toggleRouteConfirmation
  };
}
