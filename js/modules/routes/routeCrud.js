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
  setRoutesByDate,
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
  const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  const pickDateWithCalendar = (defaultDate) =>
    new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0, 0, 0, 0.45)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '99999';

      const modal = document.createElement('div');
      modal.style.background = '#fff';
      modal.style.borderRadius = '10px';
      modal.style.padding = '16px';
      modal.style.width = '320px';
      modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';

      const title = document.createElement('div');
      title.textContent = 'Copy Route To Date';
      title.style.fontSize = '16px';
      title.style.fontWeight = '600';
      title.style.marginBottom = '10px';

      const input = document.createElement('input');
      input.type = 'date';
      input.value = defaultDate || '';
      input.style.width = '100%';
      input.style.padding = '10px';
      input.style.border = '1px solid #ccc';
      input.style.borderRadius = '6px';
      input.style.fontSize = '14px';
      input.style.boxSizing = 'border-box';

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.justifyContent = 'flex-end';
      actions.style.gap = '8px';
      actions.style.marginTop = '12px';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.padding = '8px 12px';
      cancelBtn.style.border = '1px solid #ddd';
      cancelBtn.style.borderRadius = '6px';
      cancelBtn.style.background = '#f5f5f5';
      cancelBtn.style.cursor = 'pointer';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.textContent = 'Copy';
      copyBtn.style.padding = '8px 12px';
      copyBtn.style.border = 'none';
      copyBtn.style.borderRadius = '6px';
      copyBtn.style.background = '#1a7f4b';
      copyBtn.style.color = '#fff';
      copyBtn.style.cursor = 'pointer';

      actions.appendChild(cancelBtn);
      actions.appendChild(copyBtn);
      modal.appendChild(title);
      modal.appendChild(input);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      let settled = false;
      const settle = (value) => {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKeyDown);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(value);
      };

      const onKeyDown = (e) => {
        if (e.key === 'Escape') settle(null);
      };
      document.addEventListener('keydown', onKeyDown);

      cancelBtn.onclick = () => settle(null);
      overlay.onclick = (e) => {
        if (e.target === overlay) settle(null);
      };
      copyBtn.onclick = () => settle((input.value || '').trim() || null);

      setTimeout(() => {
        input.focus();
      }, 0);
    });

  const getCopyTargetDate = async ({ targetDate, promptForDate, pickWithCalendar }) => {
    if (pickWithCalendar) {
      return await pickDateWithCalendar(selectedDate);
    }

    if (promptForDate) {
      const input = window.prompt(
        'Copy route to date (YYYY-MM-DD). Leave blank to keep current date.',
        selectedDate
      );
      if (input === null) return null;
      const normalizedInput = input.trim();
      return normalizedInput || selectedDate;
    }
    return targetDate || selectedDate;
  };

  const addRoute = () => {
    hasPendingChanges.current = true;
    pushUndo('Add new route', null, routes);

    const newId = generateUUID();
    const newStoreId = crypto.randomUUID();
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

  const copyRoute = async (routeId, options = {}) => {
    const routeToCopy = routes.find((r) => r.id === routeId);
    if (!routeToCopy) return;

    const targetDate = await getCopyTargetDate(options || {});
    if (!targetDate) return;

    if (!DATE_INPUT_PATTERN.test(targetDate)) {
      alert('Invalid date. Use YYYY-MM-DD format.');
      return;
    }

    const newId = generateUUID();
    const clonedRoute = JSON.parse(JSON.stringify(routeToCopy));
    const newRoute = {
      ...clonedRoute,
      id: newId,
      confirmed: false,
      confirmedBy: null,
      confirmedAt: null,
      stores: (clonedRoute.stores || []).map((store) => ({
        ...store,
        id: generateUUID(),
        notes: store.notes || '',
        internalNotes: store.internalNotes || '',
        driverNotes: store.driverNotes || ''
      }))
    };

    if (targetDate === selectedDate) {
      setRoutes((prev) => {
        const index = prev.findIndex((r) => r.id === routeId);
        const newRoutes = [...prev];
        newRoutes.splice(index + 1, 0, newRoute);
        return newRoutes.map((route, idx) => ({ ...route, route_order: idx }));
      });

      setExpandedRoutes((prev) => [...prev, newId]);
    } else {
      let targetExistingCount = (routesByDate[targetDate] || []).length;
      let nextRouteOrder = targetExistingCount;

      try {
        const { data: targetRows, error: targetRowsError } = await supabase
          .from('logistics_routes')
          .select('route_order')
          .eq('route_date', targetDate)
          .order('route_order', { ascending: true });

        if (!targetRowsError && Array.isArray(targetRows)) {
          targetExistingCount = targetRows.length;
          const maxRouteOrder = targetRows.reduce((maxValue, row) => {
            const currentValue = Number.isFinite(row?.route_order) ? row.route_order : -1;
            return Math.max(maxValue, currentValue);
          }, -1);
          nextRouteOrder = maxRouteOrder + 1;
        }
      } catch (orderError) {
        console.warn('Could not fetch target-date route order, using local fallback:', orderError);
      }

      const routeForTargetDate = {
        ...newRoute,
        route_order: nextRouteOrder
      };

      const payload = {
        id: routeForTargetDate.id,
        route_date: targetDate,
        route_order: routeForTargetDate.route_order,
        driver: routeForTargetDate.driver || null,
        truck: routeForTargetDate.truck || null,
        trailer: routeForTargetDate.trailer || null,
        stores: routeForTargetDate.stores || [],
        pallet_count: routeForTargetDate.palletCount || 8,
        confirmed: false,
        confirmed_by: null,
        confirmed_at: null,
        pickup_at_pb: routeForTargetDate.pickupAtPB || false,
        updated_by: userName || 'Anonymous'
      };

      const { error: copySaveError } = await supabase
        .from('logistics_routes')
        .upsert([payload], { onConflict: 'id', ignoreDuplicates: false });

      if (copySaveError) {
        console.error('Error copying route to another date:', copySaveError);
        alert('Could not copy route to selected date: ' + copySaveError.message);
        return;
      }

      try {
        if (updateChannelRef.current) {
          await updateChannelRef.current.send({
            type: 'broadcast',
            event: 'routes-changed',
            payload: {
              routeDate: targetDate,
              updatedBy: userName,
              ts: Date.now(),
              sessionId: sessionId.current
            }
          });
        }
      } catch (broadcastErr) {
        console.warn('Routes-changed broadcast failed after cross-date copy (non-critical):', broadcastErr);
      }

      setRoutesByDate((prev) => {
        const targetRoutes = prev[targetDate] || [];
        const updatedTargetRoutes = [...targetRoutes, routeForTargetDate];
        return {
          ...prev,
          [targetDate]: updatedTargetRoutes.map((route, idx) => ({ ...route, route_order: idx }))
        };
      });

      setDateRouteCounts((prev) => {
        const currentCount = typeof prev[targetDate] === 'number' ? prev[targetDate] : targetExistingCount;
        return {
          ...prev,
          [targetDate]: currentCount + 1
        };
      });

      logActivity(
        'create',
        'route',
        String(newId),
        routeToCopy.driver || routeToCopy.name || `Route #${routeForTargetDate.route_order + 1}`,
        'copy',
        selectedDate,
        targetDate,
        targetDate
      );

      alert(`Route copied to ${targetDate} (including notes).`);
      console.log(`📋 Route copied to ${targetDate} with new ID:`, newId);
      return;
    }

    const baseCount =
      targetDate === selectedDate
        ? routes.length
        : (routesByDate[targetDate] || []).length;

    setDateRouteCounts((prev) => {
      const currentCount = typeof prev[targetDate] === 'number' ? prev[targetDate] : baseCount;
      return {
        ...prev,
        [targetDate]: currentCount + 1
      };
    });

    logActivity(
      'create',
      'route',
      String(newId),
      routeToCopy.driver || routeToCopy.name || `Route #${newRoute.route_order + 1}`,
      'copy',
      selectedDate,
      targetDate,
      targetDate
    );

    console.log(`📋 Route copied to ${targetDate} with new ID:`, newId);
  };

  return {
    addRoute,
    removeRoute,
    copyRoute
  };
}
