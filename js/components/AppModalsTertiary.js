export default function AppModalsTertiary({
  copyRoutesModal,
  setCopyRoutesModal,
  selectedDate,
  dateRouteCounts,
  routesByDate,
  routes,
  setInfoModal,
  supabase,
  setRoutesByDate,
  copyRoutesFromDate,
  moveStoreModal,
  setMoveStoreModal,
  driverColors,
  setRoutes,
}) {
  const [moveMode, setMoveMode] = React.useState('same-day');
  const [moveSourceDate, setMoveSourceDate] = React.useState(selectedDate);
  const [moveTargetDate, setMoveTargetDate] = React.useState(selectedDate);
  const [isLoadingTargetRoutes, setIsLoadingTargetRoutes] = React.useState(false);
  const [isMovingStore, setIsMovingStore] = React.useState(false);

  const mapRouteRecordToClientRoute = React.useCallback((row) => ({
    id: row.id,
    route_order: row.route_order,
    driver: row.driver || '',
    truck: row.truck || '',
    trailer: row.trailer || '',
    stores: row.stores || [],
    palletCount: row.pallet_count || 8,
    confirmed: row.confirmed || false,
    confirmedBy: row.confirmed_by || null,
    confirmedAt: row.confirmed_at || null,
    pickupAtPB: row.pickup_at_pb || false,
  }), []);

  const createMovedStoreId = React.useCallback(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `store-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const closeMoveStoreModal = React.useCallback(() => {
    setMoveStoreModal(null);
    setMoveMode('same-day');
    setMoveSourceDate(selectedDate);
    setMoveTargetDate(selectedDate);
    setIsLoadingTargetRoutes(false);
    setIsMovingStore(false);
  }, [selectedDate, setMoveStoreModal]);

  React.useEffect(() => {
    if (!moveStoreModal) return;
    setMoveMode('same-day');
    setMoveSourceDate(selectedDate);
    setMoveTargetDate(selectedDate);
  }, [moveStoreModal, selectedDate]);

  const getRouteDateCandidates = React.useCallback((date) => {
    if (!date) return [];
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!isoMatch) return [date];
    const [, year, month, day] = isoMatch;
    const monthShort = String(Number(month));
    const dayShort = String(Number(day));
    return Array.from(
      new Set([
        `${year}-${month}-${day}`,
        `${month}/${day}/${year}`,
        `${monthShort}/${dayShort}/${year}`,
        `${month}/${dayShort}/${year}`,
        `${monthShort}/${day}/${year}`,
      ])
    );
  }, []);

  const loadRoutesForDate = React.useCallback(async (date, options = {}) => {
    const { forceRefresh = false } = options;
    if (!date) return [];
    if (!forceRefresh && Array.isArray(routesByDate[date])) return routesByDate[date];

    setIsLoadingTargetRoutes(true);
    try {
      const candidates = getRouteDateCandidates(date);
      let rows = [];
      let lastError = null;

      for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i];
        const { data, error } = await supabase
          .from('logistics_routes')
          .select('*')
          .eq('route_date', candidate)
          .order('route_order', { ascending: true });
        if (error) {
          lastError = error;
          continue;
        }
        rows = data || [];
        if (rows.length > 0 || i === candidates.length - 1) break;
      }

      if (lastError && rows.length === 0) throw lastError;

      const loadedRoutes = rows.map(mapRouteRecordToClientRoute);
      setRoutesByDate((prev) => ({ ...prev, [date]: loadedRoutes }));
      return loadedRoutes;
    } catch (error) {
      console.error('Error loading target date routes:', error);
      setInfoModal({
        type: 'error',
        title: 'Error Loading Routes',
        message: `Failed to load routes for ${date}: ${error.message}`,
      });
      return [];
    } finally {
      setIsLoadingTargetRoutes(false);
    }
  }, [getRouteDateCandidates, mapRouteRecordToClientRoute, routesByDate, setInfoModal, setRoutesByDate, supabase]);

  React.useEffect(() => {
    if (!moveStoreModal || moveMode !== 'another-day') return;
    if (!moveTargetDate || routesByDate[moveTargetDate]) return;
    loadRoutesForDate(moveTargetDate);
  }, [loadRoutesForDate, moveMode, moveStoreModal, moveTargetDate, routesByDate]);

  const destinationDate = moveMode === 'another-day' ? moveTargetDate : moveSourceDate;
  const destinationRoutes = React.useMemo(() => {
    if (!moveStoreModal) return [];
    const routeList =
      moveMode === 'another-day'
        ? (routesByDate[destinationDate] || [])
        : routes;
    return routeList.filter((route) => {
      if (destinationDate !== moveSourceDate) return true;
      return route.id !== moveStoreModal.routeId;
    });
  }, [destinationDate, moveMode, moveSourceDate, moveStoreModal, routes, routesByDate]);

  const getRouteDisplayName = React.useCallback((targetRoute, routeList) => {
    const driverKey = targetRoute.driver || '';
    const driverRoutes = routeList.filter((route) => (route.driver || '') === driverKey);
    const routeIndex = driverRoutes.findIndex((route) => route.id === targetRoute.id);
    const routeNum = routeIndex >= 0 ? routeIndex + 1 : 1;
    return targetRoute.driver ? `${targetRoute.driver} #${routeNum}` : `Route #${routeNum}`;
  }, []);

  const getRouteLoadSummary = React.useCallback((targetRoute) => {
    let totalPallets = 0;
    let consolidatedPallets = 0;

    (targetRoute.stores || []).forEach((store) => {
      const pallets = store.pallets || [];
      const palletLinks = store.palletLinks || [];

      pallets.forEach((palletValue, index) => {
        const hasPallet = palletValue === '?' || (Number(palletValue) > 0);
        if (!hasPallet) return;

        totalPallets += 1;
        if (!palletLinks[index]) {
          consolidatedPallets += 1;
        }
      });
    });

    return {
      stores: (targetRoute.stores || []).length,
      consolidatedPallets,
      totalPallets,
    };
  }, []);

  const handleMoveStore = React.useCallback(async (targetRoute) => {
    if (!moveStoreModal || isMovingStore) return;
    const sourceDate = moveSourceDate || selectedDate;
    const targetDate = moveMode === 'another-day' ? moveTargetDate : sourceDate;
    if (!targetDate) return;

    let sourceRoutes = sourceDate === selectedDate ? routes : routesByDate[sourceDate] || [];
    let targetRoutes = targetDate === selectedDate ? routes : routesByDate[targetDate] || [];

    if (targetDate !== selectedDate && !routesByDate[targetDate]) {
      targetRoutes = await loadRoutesForDate(targetDate);
    }
    if (!targetRoutes || targetRoutes.length === 0) {
      setInfoModal({
        type: 'warning',
        title: 'No Routes Available',
        message: `No routes were found on ${targetDate}. Create a route there first, then move the store.`,
      });
      return;
    }

    const sourceRoute = sourceRoutes.find((route) => route.id === moveStoreModal.routeId);
    if (!sourceRoute) {
      setInfoModal({
        type: 'error',
        title: 'Route Not Found',
        message: 'Could not find the source route. Please close and try again.',
      });
      return;
    }
    const storeToMove = (sourceRoute.stores || []).find((store) => store.id === moveStoreModal.storeId);
    if (!storeToMove) {
      setInfoModal({
        type: 'error',
        title: 'Store Not Found',
        message: 'Could not find this store in the source route.',
      });
      return;
    }

    const destinationRoute = targetRoutes.find((route) => route.id === targetRoute.id);
    if (!destinationRoute) {
      setInfoModal({
        type: 'error',
        title: 'Destination Not Found',
        message: 'The destination route is no longer available. Please try again.',
      });
      return;
    }

    if (sourceDate === targetDate) {
      const movedStore = { ...storeToMove, id: createMovedStoreId() };
      setRoutes((prev) => prev.map((route) => {
        if (route.id === moveStoreModal.routeId) {
          return { ...route, stores: (route.stores || []).filter((store) => store.id !== moveStoreModal.storeId) };
        }
        if (route.id === destinationRoute.id) {
          return { ...route, stores: [...(route.stores || []), movedStore] };
        }
        return route;
      }));
      closeMoveStoreModal();
      return;
    }

    const sourceStoresAfterMove = (sourceRoute.stores || []).filter((store) => store.id !== moveStoreModal.storeId);
    const destinationStoresBeforeMove = destinationRoute.stores || [];
    const destinationStoresAfterMove = [...destinationStoresBeforeMove, { ...storeToMove, id: createMovedStoreId() }];

    setIsMovingStore(true);
    try {
      const { error: addToTargetError } = await supabase
        .from('logistics_routes')
        .update({ stores: destinationStoresAfterMove })
        .eq('id', destinationRoute.id);
      if (addToTargetError) throw addToTargetError;

      const { error: removeFromSourceError } = await supabase
        .from('logistics_routes')
        .update({ stores: sourceStoresAfterMove })
        .eq('id', sourceRoute.id);
      if (removeFromSourceError) {
        await supabase
          .from('logistics_routes')
          .update({ stores: destinationStoresBeforeMove })
          .eq('id', destinationRoute.id);
        throw removeFromSourceError;
      }

      setRoutesByDate((prev) => {
        const nextSourceRoutes = (prev[sourceDate] || []).map((route) => (
          route.id === sourceRoute.id
            ? { ...route, stores: sourceStoresAfterMove }
            : route
        ));
        const nextTargetRoutes = (prev[targetDate] || []).map((route) => (
          route.id === destinationRoute.id
            ? { ...route, stores: destinationStoresAfterMove }
            : route
        ));
        return {
          ...prev,
          [sourceDate]: nextSourceRoutes,
          [targetDate]: nextTargetRoutes,
        };
      });
      closeMoveStoreModal();
    } catch (error) {
      console.error('Error moving store to another day:', error);
      setInfoModal({
        type: 'error',
        title: 'Move Failed',
        message: `Could not move this store: ${error.message}`,
      });
    } finally {
      setIsMovingStore(false);
    }
  }, [
    closeMoveStoreModal,
    createMovedStoreId,
    isMovingStore,
    loadRoutesForDate,
    moveMode,
    moveSourceDate,
    moveStoreModal,
    moveTargetDate,
    routes,
    routesByDate,
    selectedDate,
    setInfoModal,
    setRoutes,
    setRoutesByDate,
    supabase,
  ]);

  const sourceDateRouteCount = React.useMemo(() => {
    const sourceDate = copyRoutesModal?.sourceDate;
    if (!sourceDate) return 0;
    if (Array.isArray(routesByDate[sourceDate])) return routesByDate[sourceDate].length;
    return dateRouteCounts[sourceDate] || 0;
  }, [copyRoutesModal, dateRouteCounts, routesByDate]);

  const sourceDateKnownEmpty = React.useMemo(() => {
    const sourceDate = copyRoutesModal?.sourceDate;
    if (!sourceDate) return false;
    return Array.isArray(routesByDate[sourceDate]) && routesByDate[sourceDate].length === 0;
  }, [copyRoutesModal, routesByDate]);

  const renderMoveStoreModal = React.useCallback(() => {
    if (!moveStoreModal) return null;
    return /*#__PURE__*/React.createElement(
      "div",
      {
        style: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }
      },
      /*#__PURE__*/React.createElement(
        "div",
        {
          style: {
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            minWidth: '380px',
            maxWidth: '520px',
            width: '95vw'
          }
        },
        /*#__PURE__*/React.createElement("h3", { style: { margin: '0 0 16px', color: '#1a7f4b' } }, "Move Store to Another Route"),
        /*#__PURE__*/React.createElement("p", { style: { margin: '0 0 16px', color: '#666' } }, "Moving: ", /*#__PURE__*/React.createElement("strong", null, moveStoreModal.storeName)),
        /*#__PURE__*/React.createElement(
          "div",
          { style: { display: 'flex', gap: '8px', marginBottom: '12px' } },
          /*#__PURE__*/React.createElement(
            "button",
            {
              onClick: () => setMoveMode('same-day'),
              disabled: isMovingStore,
              style: {
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: moveMode === 'same-day' ? '#1a7f4b' : 'white',
                color: moveMode === 'same-day' ? 'white' : '#333',
                cursor: isMovingStore ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }
            },
            "Same Day (Default)"
          ),
          /*#__PURE__*/React.createElement(
            "button",
            {
              onClick: () => setMoveMode('another-day'),
              disabled: isMovingStore,
              style: {
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: moveMode === 'another-day' ? '#1a7f4b' : 'white',
                color: moveMode === 'another-day' ? 'white' : '#333',
                cursor: isMovingStore ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }
            },
            "Another Day"
          )
        ),
        moveMode === 'another-day' && /*#__PURE__*/React.createElement(
          "div",
          { style: { marginBottom: '14px' } },
          /*#__PURE__*/React.createElement("label", { style: { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#555' } }, "Target Date"),
          /*#__PURE__*/React.createElement("input", {
            type: "date",
            value: moveTargetDate || '',
            onChange: (event) => setMoveTargetDate(event.target.value),
            disabled: isMovingStore,
            style: {
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '14px'
            }
          })
        ),
        /*#__PURE__*/React.createElement(
          "p",
          { style: { margin: '0 0 10px', color: '#333' } },
          "Select destination route",
          destinationDate ? ` (${destinationDate})` : '',
          ":"
        ),
        isLoadingTargetRoutes && /*#__PURE__*/React.createElement("div", { style: { fontSize: '13px', color: '#666', marginBottom: '10px' } }, "Loading routes..."),
        /*#__PURE__*/React.createElement(
          "div",
          { style: { maxHeight: '300px', overflowY: 'auto' } },
          destinationRoutes.map((targetRoute) => {
            const routeListForLabels = moveMode === 'another-day' ? routesByDate[destinationDate] || [] : routes;
            const routeName = getRouteDisplayName(targetRoute, routeListForLabels);
            const colors = driverColors[targetRoute.driver] || { bg: '#f5f5f5', border: '#999', header: '#666' };
            const loadSummary = getRouteLoadSummary(targetRoute);
            return /*#__PURE__*/React.createElement(
              "div",
              {
                key: targetRoute.id,
                onClick: () => handleMoveStore(targetRoute),
                style: {
                  padding: '12px',
                  marginBottom: '8px',
                  background: colors.bg,
                  border: `2px solid ${colors.border}`,
                  borderRadius: '8px',
                  cursor: isMovingStore ? 'not-allowed' : 'pointer',
                  opacity: isMovingStore ? 0.6 : 1
                }
              },
              /*#__PURE__*/React.createElement("div", { style: { fontWeight: 600, color: colors.header } }, routeName),
              /*#__PURE__*/React.createElement(
                "div",
                { style: { fontSize: '12px', color: '#666' } },
                loadSummary.stores,
                " stores • ",
                loadSummary.consolidatedPallets,
                "/",
                loadSummary.totalPallets,
                " PLT"
              )
            );
          }),
          !isLoadingTargetRoutes && destinationRoutes.length === 0 && /*#__PURE__*/React.createElement(
            "div",
            {
              style: {
                padding: '12px',
                borderRadius: '8px',
                background: '#fff3e0',
                color: '#e65100',
                fontSize: '13px'
              }
            },
            "No destination routes available for this date."
          )
        ),
        /*#__PURE__*/React.createElement(
          "button",
          {
            onClick: closeMoveStoreModal,
            disabled: isMovingStore,
            style: {
              marginTop: '16px',
              width: '100%',
              padding: '10px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isMovingStore ? 'not-allowed' : 'pointer'
            }
          },
          isMovingStore ? 'Moving...' : 'Cancel'
        )
      )
    );
  }, [
    closeMoveStoreModal,
    destinationDate,
    destinationRoutes,
    driverColors,
    getRouteLoadSummary,
    getRouteDisplayName,
    handleMoveStore,
    isLoadingTargetRoutes,
    isMovingStore,
    moveMode,
    moveStoreModal,
    moveTargetDate,
    routes,
    routesByDate,
  ]);

  return /*#__PURE__*/ React.createElement(
    React.Fragment,
    null,
    copyRoutesModal&&/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999},onClick:e=>{if(e.target===e.currentTarget)setCopyRoutesModal(null);}},/*#__PURE__*/React.createElement("div",{style:{background:'white',padding:'24px',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',width:'420px',maxWidth:'95vw'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}},/*#__PURE__*/React.createElement("h3",{style:{margin:0,fontSize:'18px',color:'#333',display:'flex',alignItems:'center',gap:'10px'}},"\uD83D\uDCC5 Copy Routes From Date"),/*#__PURE__*/React.createElement("button",{onClick:()=>setCopyRoutesModal(null),style:{background:'none',border:'none',fontSize:'24px',color:'#999',cursor:'pointer',padding:'0',lineHeight:1}},"\xD7")),/*#__PURE__*/React.createElement("div",{style:{marginBottom:'16px'}},/*#__PURE__*/React.createElement("label",{style:{fontSize:'13px',color:'#666',display:'block',marginBottom:'8px'}},"Select date to copy from:"),/*#__PURE__*/React.createElement("input",{type:"date",value:copyRoutesModal.sourceDate,onChange:e=>setCopyRoutesModal(prev=>({...prev,sourceDate:e.target.value})),max:selectedDate,style:{width:'100%',padding:'12px 14px',border:'2px solid #e0e0e0',borderRadius:'8px',fontSize:'15px',boxSizing:'border-box'}})),copyRoutesModal.sourceDate&&/*#__PURE__*/React.createElement("div",{style:{padding:'12px',background:sourceDateRouteCount>0?'#e8f5e9':sourceDateKnownEmpty?'#fff3e0':'#e3f2fd',borderRadius:'8px',marginBottom:'16px',fontSize:'13px',color:sourceDateRouteCount>0?'#2e7d32':sourceDateKnownEmpty?'#e65100':'#1565c0'}},sourceDateRouteCount>0?/*#__PURE__*/React.createElement(React.Fragment,null,"\u2713 Found ",/*#__PURE__*/React.createElement("strong",null,sourceDateRouteCount," routes")," on this date",routesByDate[copyRoutesModal.sourceDate]&&/*#__PURE__*/React.createElement("div",{style:{marginTop:'6px',fontSize:'12px',opacity:0.8}},(()=>{const driverCounts={};(routesByDate[copyRoutesModal.sourceDate]||[]).forEach(r=>{const d=r.driver||'Unassigned';driverCounts[d]=(driverCounts[d]||0)+1;});return Object.entries(driverCounts).map(([d,c])=>`${d} ×${c}`).join(', ');})())):sourceDateKnownEmpty?/*#__PURE__*/React.createElement(React.Fragment,null,"\u26A0\uFE0F No routes found on this date"):/*#__PURE__*/React.createElement(React.Fragment,null,"\u2139\uFE0F Route count not loaded yet. Click Copy Routes to check this date.")),copyRoutesModal.replaceExisting&&/*#__PURE__*/React.createElement("div",{style:{padding:'12px',background:'#fff3e0',border:'2px solid #ff9800',borderRadius:'8px',marginBottom:'16px',fontSize:'13px',color:'#e65100'}},/*#__PURE__*/React.createElement("strong",null,"\u26A0\uFE0F Warning: "),"This will REPLACE ",routes.length," existing route(s) on ",selectedDate),/*#__PURE__*/React.createElement("div",{style:{marginBottom:'20px'}},/*#__PURE__*/React.createElement("label",{style:{fontSize:'13px',color:'#666',display:'block',marginBottom:'10px'}},"Copy options:"),/*#__PURE__*/React.createElement("label",{style:{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#1a7f4b',marginBottom:'8px',cursor:'pointer',fontWeight:600}},/*#__PURE__*/React.createElement("input",{type:"checkbox",checked:!!copyRoutesModal.copyEverything,onChange:e=>setCopyRoutesModal(prev=>({...prev,copyEverything:e.target.checked,keepDrivers:e.target.checked?true:prev.keepDrivers,keepTrucks:e.target.checked?true:prev.keepTrucks,clearPallets:e.target.checked?false:prev.clearPallets})),style:{width:'16px',height:'16px',accentColor:'#1a7f4b'}}),"Copy everything including notes"),/*#__PURE__*/React.createElement("label",{style:{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#333',marginBottom:'8px',cursor:'pointer'}},/*#__PURE__*/React.createElement("input",{type:"checkbox",checked:copyRoutesModal.keepDrivers,onChange:e=>setCopyRoutesModal(prev=>({...prev,copyEverything:false,keepDrivers:e.target.checked})),style:{width:'16px',height:'16px',accentColor:'#1a7f4b'}}),"Keep driver assignments"),/*#__PURE__*/React.createElement("label",{style:{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#333',marginBottom:'8px',cursor:'pointer'}},/*#__PURE__*/React.createElement("input",{type:"checkbox",checked:copyRoutesModal.keepTrucks,onChange:e=>setCopyRoutesModal(prev=>({...prev,copyEverything:false,keepTrucks:e.target.checked})),style:{width:'16px',height:'16px',accentColor:'#1a7f4b'}}),"Keep truck/trailer assignments"),/*#__PURE__*/React.createElement("label",{style:{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#333',cursor:'pointer'}},/*#__PURE__*/React.createElement("input",{type:"checkbox",checked:copyRoutesModal.clearPallets,onChange:e=>setCopyRoutesModal(prev=>({...prev,copyEverything:false,clearPallets:e.target.checked})),style:{width:'16px',height:'16px',accentColor:'#1a7f4b'}}),"Clear pallet counts (start fresh)")),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:'12px',justifyContent:'flex-end'}},/*#__PURE__*/React.createElement("button",{onClick:()=>setCopyRoutesModal(null),style:{padding:'10px 20px',background:'#f5f5f5',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:500,color:'#666',cursor:'pointer'}},"Cancel"),/*#__PURE__*/React.createElement("button",{onClick:async()=>{if(!copyRoutesModal.sourceDate){setInfoModal({type:'warning',title:'Select a Date',message:'Please select a date to copy routes from.'});return;}try{const hasCachedRoutes=Array.isArray(routesByDate[copyRoutesModal.sourceDate]);const shouldForceRefresh=hasCachedRoutes&&routesByDate[copyRoutesModal.sourceDate].length===0;const sourceRoutes=hasCachedRoutes&&!shouldForceRefresh?routesByDate[copyRoutesModal.sourceDate]:await loadRoutesForDate(copyRoutesModal.sourceDate,{forceRefresh:shouldForceRefresh});if(!sourceRoutes||sourceRoutes.length===0){setInfoModal({type:'warning',title:'No Routes Found',message:'The selected date has no routes to copy.'});return;}copyRoutesFromDate(copyRoutesModal.sourceDate,{keepDrivers:copyRoutesModal.keepDrivers,keepTrucks:copyRoutesModal.keepTrucks,clearPallets:copyRoutesModal.clearPallets,copyEverything:copyRoutesModal.copyEverything||false,replaceExisting:copyRoutesModal.replaceExisting||false,sourceRoutes});setCopyRoutesModal(null);}catch(err){console.error('Error loading routes:',err);setInfoModal({type:'error',title:'Error Loading Routes',message:'Failed to load routes from the selected date: '+err.message});}},disabled:!copyRoutesModal.sourceDate,style:{padding:'10px 20px',background:!copyRoutesModal.sourceDate?'#ccc':'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,color:'white',cursor:!copyRoutesModal.sourceDate?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:'6px'}},"\uD83D\uDCCB Copy ",sourceDateRouteCount>0?`${sourceDateRouteCount} Routes`:'Routes')))),
    renderMoveStoreModal()
  );
}
