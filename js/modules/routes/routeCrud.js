function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createRouteCrudHandlers({
  routes,
  routesByDate,
  selectedDate,
  userName,
  sessionId,
  supabase,
  setRoutes,
  setExpandedRoutes,
  setDateRouteCounts,
  setDeleteConfirmModal,
  pushUndo,
  logActivity,
  enterServerUpdate,
  exitServerUpdate,
  lastSavedData,
  hasPendingChanges,
  editedStores,
  lastEditTime,
  clearDirtyFields,
  deleteChannelRef,
  updateChannelRef
}) {
  const addRoute = () => {
    hasPendingChanges.current = true;
    pushUndo('Add new route', null, routes);

    const newId = generateUUID();
    const newStoreId = Date.now();
    const currentRoutes = routes;
    const newRouteOrder = currentRoutes.length;
    const newRouteName = `Route #${newRouteOrder + 1}`;

    console.log('➕ Creating new route:', {
      id: newId,
      route_order: newRouteOrder,
      name: newRouteName
    });

    setRoutes((prev) => [
      ...prev,
      {
        id: newId,
        name: newRouteName,
        region: 'New Region',
        driver: '',
        truck: '',
        trailer: '',
        palletCount: 8,
        confirmed: false,
        confirmedBy: null,
        confirmedAt: null,
        route_order: newRouteOrder,
        stores: [
          {
            id: newStoreId,
            code: '',
            name: '',
            pallets: Array(8).fill(null),
            palletTypes: ['FZ', 'FZ', 'FZ', 'FZ', 'FZ', 'FZ', 'DR', 'FH'],
            palletLinks: Array(8).fill(false),
            tc: 0,
            fz: 0,
            dr: 0,
            fresh: null,
            notes: '',
            internalNotes: '',
            driverNotes: ''
          }
        ]
      }
    ]);
    setExpandedRoutes((prev) => [...prev, newId]);
    setDateRouteCounts((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || 0) + 1
    }));
    logActivity('create', 'route', String(newId), newRouteName, null, null, null, selectedDate);
  };

  const removeRoute = (routeId) => {
    const route = routes.find((r) => r.id === routeId);
    const driverRoutes = routes.filter((r) => r.driver === route?.driver);
    const routeNum = driverRoutes.indexOf(route) + 1;
    const routeName = route?.driver ? `${route.driver} #${routeNum}` : `Route #${routeNum}`;

    setDeleteConfirmModal({
      type: 'Route',
      id: routeId,
      name: `${routeName} (${route?.stores?.length || 0} stores)`,
      onConfirm: async () => {
        pushUndo(`Delete ${routeName}`, routeId, routes);

        if (routeId) {
          try {
            console.log('🗑 Deleting from logistics_routes where id =', routeId);
            const { error } = await supabase.from('logistics_routes').delete().eq('id', routeId).select();
            if (error) {
              console.error(' Error deleting route:', error);
              alert('Error deleting route: ' + error.message);
              return;
            }
            console.log('✅ Route deleted from database');

            if (deleteChannelRef.current) {
              try {
                await deleteChannelRef.current.send({
                  type: 'broadcast',
                  event: 'route-deleted',
                  payload: {
                    routeId: routeId,
                    routeDate: selectedDate,
                    deletedBy: userName,
                    sessionId: sessionId.current
                  }
                });
                console.log('📡 Delete broadcast sent');
              } catch (broadcastErr) {
                console.warn('Delete broadcast failed (non-critical):', broadcastErr);
              }
            }

            if (updateChannelRef.current) {
              try {
                await updateChannelRef.current.send({
                  type: 'broadcast',
                  event: 'routes-changed',
                  payload: {
                    routeDate: selectedDate,
                    updatedBy: userName,
                    ts: Date.now(),
                    sessionId: sessionId.current
                  }
                });
                console.log('📡 Routes change notification sent after delete');
              } catch (broadcastErr) {
                console.warn('Routes-changed broadcast failed after delete (non-critical):', broadcastErr);
              }
            }
          } catch (err) {
            console.error(' Exception deleting route:', err);
            alert('Error deleting route: ' + err.message);
            return;
          }
        }

        enterServerUpdate();
        try {
          setRoutes((prev) => prev.filter((r) => r.id !== routeId));
          setExpandedRoutes((prev) => prev.filter((id) => id !== routeId));
          setDateRouteCounts((prev) => ({
            ...prev,
            [selectedDate]: Math.max(0, (prev[selectedDate] || 1) - 1)
          }));

          let parsedSaved = {};
          try {
            parsedSaved = JSON.parse(lastSavedData.current || '{}');
          } catch (parseErr) {
            parsedSaved = {};
          }
          lastSavedData.current = JSON.stringify({
            ...parsedSaved,
            routesByDate: Object.fromEntries(
              Object.entries(routesByDate).map(([date, dateRoutes]) => [
                date,
                dateRoutes.filter((r) => r.id !== routeId)
              ])
            )
          });
        } finally {
          setTimeout(() => {
            exitServerUpdate();
            hasPendingChanges.current = false;
            editedStores.current.clear();
            lastEditTime.current = {};
            clearDirtyFields(routeId);
            console.log('🗑 Delete complete, flags cleared');
          }, 100);
        }

        logActivity(
          'delete',
          'route',
          String(routeId),
          routeName,
          null,
          `${route?.stores?.length || 0} stores`,
          null,
          selectedDate
        );
      }
    });
  };

  const copyRoute = (routeId) => {
    const routeToCopy = routes.find((r) => r.id === routeId);
    if (!routeToCopy) return;

    const newId = generateUUID();
    const newRoute = {
      ...JSON.parse(JSON.stringify(routeToCopy)),
      id: newId,
      confirmed: false,
      confirmedBy: null,
      confirmedAt: null,
      stores: routeToCopy.stores.map((store, idx) => ({
        ...store,
        id: Date.now() + idx
      }))
    };

    setRoutes((prev) => {
      const index = prev.findIndex((r) => r.id === routeId);
      const newRoutes = [...prev];
      newRoutes.splice(index + 1, 0, newRoute);
      return newRoutes.map((route, idx) => ({ ...route, route_order: idx }));
    });

    setExpandedRoutes((prev) => [...prev, newId]);
    console.log('📋 Route copied with new ID:', newId);
  };

  return {
    addRoute,
    removeRoute,
    copyRoute
  };
}
