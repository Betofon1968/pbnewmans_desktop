function OverviewTab(props){
  const {
    React,
    addPalletColumn,
    addRoute,
    addStore,
    calculateRouteTotal,
    compactMode,
    copyRoute,
    currentUserRole,
    driversDirectory,
    expandedRoutes,
    generateBOL,
    handlePalletFocus,
    logPalletChange,
    moveRoute,
    moveStore,
    pcMilerSettings,
    removePalletColumn,
    removeRoute,
    removeStore,
    setCopyRoutesModal,
    setInfoModal,
    setMoveStoreModal,
    setRouteMapModal,
    setSelectedDate,
    setStoreChangeConfirmModal,
    setStoreSearchModal,
    sortStorePalletsByType,
    storesDirectory,
    RouteCard,
    bolSettings,
    canEditCurrentDate,
    compact,
    driverColors,
    driverStats,
    isAdmin,
    manifestFormat,
    palletTypes,
    routes,
    routesByDate,
    dateRouteCounts,
    selectedDate,
    toggleRouteConfirmation,
    toggleRouteExpand,
    totals,
    tractorsDirectory,
    trailersDirectory,
    trucksDirectory,
    updatePallet,
    updateRoute,
    updateStore,
    userName,
    getWeekDates,
    formatDateDisplay,
    formatDayNumber,
    escapeHtml,
    isToday,
    navigateWeek,
    getTodayInTimezone,
    getTomorrowInTimezone,
    activeUsers,
  } = props;
  const sortedStoresDirectory=React.useMemo(
    ()=>[...storesDirectory].sort((a,b)=>String(a.code||'').localeCompare(String(b.code||''))),
    [storesDirectory]
  );
  const safeStorageGet = React.useCallback((key, fallbackValue = null) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallbackValue : value;
    } catch (error) {
      console.warn(`localStorage get failed for ${key}:`, error);
      return fallbackValue;
    }
  }, []);
  const safeStorageSet = React.useCallback((key, value) => {
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {
      console.warn(`localStorage set failed for ${key}:`, error);
    }
  }, []);
  return React.createElement(React.Fragment,null,
    /*#__PURE__*/React.createElement("div",{style:{position:'sticky',top:0,zIndex:100,display:'flex',gap:'4px',padding:'4px 16px',height:'26px',boxSizing:'content-box',background:'white',borderBottom:'1px solid #e0e0e0',alignItems:'center',fontSize:'10px',justifyContent:'space-between'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:'8px',minWidth:0,flexWrap:'nowrap',overflowX:'auto',paddingBottom:'1px'}},/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:'#1a7f4b',fontSize:'10px',whiteSpace:'nowrap'}},totals.routes," Routes"),/*#__PURE__*/React.createElement("span",{style:{color:'#ddd'}},"\u2022"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:'#1a7f4b',fontSize:'10px',whiteSpace:'nowrap'}},totals.truckSpots,"/",totals.totalPallets," PLT"),/*#__PURE__*/React.createElement("span",{style:{color:'#ddd'}},"\u2022"),palletTypes.filter(pt=>(totals.byType?.[pt.abbrev]||0)>0).map(pt=>/*#__PURE__*/React.createElement("span",{key:'type-'+pt.abbrev,style:{fontWeight:700,color:pt.color||'#666',fontSize:'10px',whiteSpace:'nowrap'}},pt.abbrev,":",totals.byType?.[pt.abbrev]||0)),Object.entries(driverStats||{}).sort((a,b)=>a[0].localeCompare(b[0])).map(([driver,count])=>{const driverInfo=driversDirectory.find(d=>d.name===driver||`${d.firstName||''} ${d.lastName||''}`.trim()===driver)||{};const borderColor=driverInfo.borderColor||'#999';const bgColor=driverInfo.bgColor||'white';return/*#__PURE__*/React.createElement("span",{key:'driver-'+driver,style:{padding:'1px 10px',border:`2px solid ${borderColor}`,borderRadius:'8px',fontWeight:600,color:borderColor,background:bgColor,fontSize:'10px',lineHeight:'16px',whiteSpace:'nowrap'}},driver,": ",count);})),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:'4px',alignItems:'center'}},/*#__PURE__*/React.createElement("select",{id:"printOrientation",defaultValue:safeStorageGet('printOrientation','portrait'),onChange:e=>safeStorageSet('printOrientation',e.target.value),style:{padding:'2px 4px',borderRadius:'3px',border:'1px solid #ddd',fontSize:'10px',cursor:'pointer'}},/*#__PURE__*/React.createElement("option",{value:"portrait"},"Portrait"),/*#__PURE__*/React.createElement("option",{value:"landscape"},"Landscape")),/*#__PURE__*/React.createElement("label",{style:{display:'flex',alignItems:'center',gap:'2px',fontSize:'10px',cursor:'pointer'},title:"Fit to page"},/*#__PURE__*/React.createElement("input",{type:"checkbox",id:"fitToPage",defaultChecked:safeStorageGet('printFitToPage','false')==='true',onChange:e=>safeStorageSet('printFitToPage',e.target.checked),style:{cursor:'pointer',width:'11px',height:'11px'}}),"Fit"),/*#__PURE__*/React.createElement("label",{style:{display:'flex',alignItems:'center',gap:'2px',fontSize:'10px',cursor:'pointer',background:'#fff3e0',padding:'1px 4px',borderRadius:'3px',border:'1px solid #ff9800'},title:"Group by route"},/*#__PURE__*/React.createElement("input",{type:"checkbox",id:"groupByRouteNum",defaultChecked:safeStorageGet('printGroupByRoute','false')==='true',onChange:e=>safeStorageSet('printGroupByRoute',e.target.checked),style:{cursor:'pointer',width:'11px',height:'11px'}}),"Grp"),/*#__PURE__*/React.createElement("label",{style:{display:'flex',alignItems:'center',gap:'2px',fontSize:'10px',cursor:'pointer',background:'#e3f2fd',padding:'1px 4px',borderRadius:'3px',border:'1px solid #2196f3'},title:"Hide empty columns"},/*#__PURE__*/React.createElement("input",{type:"checkbox",id:"hideEmptyCols",defaultChecked:safeStorageGet('printHideEmpty','false')==='true',onChange:e=>safeStorageSet('printHideEmpty',e.target.checked),style:{cursor:'pointer',width:'11px',height:'11px'}}),"Hide∅"),/*#__PURE__*/React.createElement("button",{onClick:()=>{// Get options
const orientation=document.getElementById('printOrientation').value;const fitToPage=document.getElementById('fitToPage').checked;const groupByRouteNum=document.getElementById('groupByRouteNum').checked;const hideEmptyCols=document.getElementById('hideEmptyCols').checked;// Common variables - use selectedDate for the route date, not today
const routeDate=new Date(selectedDate+'T12:00:00');const routeDateFormatted=routeDate.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});const routeDateShort=routeDate.toLocaleDateString('en-US',{weekday:'short',month:'numeric',day:'numeric'});const today=routeDateFormatted;// Use route date for manifest
const printTime=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});// Generate based on selected format
if(manifestFormat==='simple-list'){// Option 1: Simple List Format
// Find max pallets across all routes (include "?" pending pallets)
let maxPalletsByType={};palletTypes.forEach(pt=>{maxPalletsByType[pt.abbrev]=0;});routes.forEach(route=>{route.stores.forEach(store=>{const types=store.palletTypes||[];const countByType={};palletTypes.forEach(pt=>{countByType[pt.abbrev]=0;});(store.pallets||[]).forEach((p,idx)=>{// Include both numeric values AND "?" pending pallets - match metrics.js condition
if((p&&typeof p==='number'&&p>0)||p==='?'){const pType=types[idx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;countByType[normalized]=(countByType[normalized]||0)+1;}});palletTypes.forEach(pt=>{if(countByType[pt.abbrev]>maxPalletsByType[pt.abbrev]){maxPalletsByType[pt.abbrev]=countByType[pt.abbrev];}});});});// Filter to only pallet types that have at least one pallet
const activePalletTypes=palletTypes.filter(pt=>maxPalletsByType[pt.abbrev]>0);// Group routes by route number if option is checked
let routeGroups=[];if(groupByRouteNum){// Find max route number
let maxRouteNum=1;routes.forEach(route=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;if(routeNum>maxRouteNum)maxRouteNum=routeNum;});// Group by route number
for(let num=1;num<=maxRouteNum;num++){const groupRoutes=routes.filter(route=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);return driverRoutes.indexOf(route)+1===num;});if(groupRoutes.length>0){routeGroups.push({num,routes:groupRoutes});}}}else{// All routes in one group
routeGroups=[{num:0,routes:routes}];}// Generate manifest HTML with page breaks between route groups
// Calculate scale for fit-to-page
const storeCount=routes.reduce((sum,r)=>sum+r.stores.length,0);let scale=100;if(fitToPage){if(storeCount>40)scale=45;else if(storeCount>30)scale=55;else if(storeCount>20)scale=65;else if(storeCount>15)scale=75;else if(storeCount>10)scale=85;else if(storeCount>5)scale=95;}let manifestHTML=`
                      <html>
                      <head>
                        <title>Warehouse Manifest - ${routeDateShort}</title>
                        <style>
                          @page { size: ${orientation}; margin: ${fitToPage?'0.2in':'0.3in'}; }
                          @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
                          body { font-family: Arial, sans-serif; font-size: ${fitToPage?'9px':'10px'}; margin: 0; padding: ${fitToPage?'5px':'10px'}; }
                          ${fitToPage?`
                          .manifest-container {
                            transform: scale(${scale/100});
                            transform-origin: top left;
                            width: ${100/(scale/100)}%;
                          }
                          `:''}
                          .page { page-break-after: always; }
                          .page:last-child { page-break-after: avoid; }
                          .header { text-align: center; margin-bottom: ${fitToPage?'6px':'10px'}; border-bottom: 2px solid #1a7f4b; padding-bottom: ${fitToPage?'3px':'5px'}; }
                          .header h1 { margin: 0; font-size: ${fitToPage?'14px':'16px'}; color: #1a7f4b; }
                          .header p { margin: 2px 0 0; color: #666; font-size: ${fitToPage?'9px':'10px'}; }
                          .page-title { background: #f0f0f0; color: #333; padding: ${fitToPage?'5px 8px':'8px 12px'}; margin-bottom: ${fitToPage?'6px':'10px'}; border-radius: 4px; font-weight: bold; font-size: ${fitToPage?'12px':'14px'}; border: 1px solid #999; }
                          table { width: 100%; border-collapse: collapse; border: 1px solid #999; table-layout: fixed; }
                          th { padding: ${fitToPage?'3px 4px':'4px 6px'}; text-align: left; font-size: ${fitToPage?'8px':'9px'}; border: 1px solid #999; }
                          th.center { text-align: center; }
                          td { border: 1px solid #ccc; padding: ${fitToPage?'2px 4px':'3px 6px'}; font-size: ${fitToPage?'8px':'9px'}; overflow: hidden; text-overflow: ellipsis; }
                          td.center { text-align: center; }
                          .col-stop { width: ${fitToPage?'30px':'35px'}; }
                          .col-code { width: ${fitToPage?'40px':'45px'}; }
                          .col-name { width: auto; }
                          .col-pallet { width: ${fitToPage?'28px':'32px'}; }
                          .col-tc { width: ${fitToPage?'38px':'45px'}; }
                          .col-plt { width: ${fitToPage?'35px':'40px'}; }
                          .col-check { width: ${fitToPage?'25px':'30px'}; }
                          .route-row { background: #fafafa !important; font-weight: bold; border-top: 2px solid #666; }
                          .route-row.first { border-top: none; }
                          .route-total { background: #fff8e1 !important; font-weight: bold; }
                          .grand-total { background: #e8f5e9 !important; color: #1a7f4b !important; font-weight: bold; border-top: 2px solid #333; }
                        </style>
                      </head>
                      <body>
                      ${fitToPage?'<div class="manifest-container">':''}
                    `;// Build eco-friendly color map for pallet types
const ecoColors={'#2196f3':{bg:'#e3f2fd',text:'#1565c0',border:'#90caf9'},'#4caf50':{bg:'#e8f5e9',text:'#2e7d32',border:'#a5d6a7'},'#ff9800':{bg:'#fff3e0',text:'#e65100',border:'#ffcc80'},'#9c27b0':{bg:'#f3e5f5',text:'#7b1fa2',border:'#ce93d8'},'#f44336':{bg:'#ffebee',text:'#c62828',border:'#ef9a9a'},'#607d8b':{bg:'#eceff1',text:'#455a64',border:'#b0bec5'}};const getEcoColor=color=>ecoColors[color]||{bg:'#f5f5f5',text:'#333',border:'#999'};// Generate pages for each route group
routeGroups.forEach((group,gIdx)=>{manifestHTML+=`<div class="page">`;manifestHTML+=`
                        <div class="header">
                          <h1>🚛 WAREHOUSE MANIFEST</h1>
                          <p style="font-size: 16px; font-weight: bold; color: #1a7f4b; margin: 4px 0;">📅 ${routeDateShort}</p>
                          <p><strong>${escapeHtml(bolSettings.companyName)}</strong> - Printed: ${printTime}</p>
                        </div>
                      `;if(groupByRouteNum){manifestHTML+=`<div class="page-title">Route #${group.num} - All Drivers</div>`;}// Pallet Type Legend
manifestHTML+=`<div style="display: flex; justify-content: center; gap: 12px; padding: 6px; background: #fafafa; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px;">`;activePalletTypes.forEach(pt=>{const eco=getEcoColor(pt.color);manifestHTML+=`<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 9px;">
                          <span style="display: inline-block; width: 14px; height: 14px; background: ${eco.bg}; border: 1px solid ${eco.border}; border-radius: 2px;"></span>
                          <span style="color: ${eco.text}; font-weight: bold;">${pt.abbrev}</span> = ${pt.name}
                        </span>`;});manifestHTML+=`</div>`;// Grand totals for this group
let groupTotalPallets=0;let groupTotalCases=0;let groupLinkedCount=0;// Track total linked pallets
const groupTotalByType={};palletTypes.forEach(pt=>{groupTotalByType[pt.abbrev]=0;});// Generate rows for routes in this group
group.routes.forEach((route,rIdx)=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;const routeName=route.driver?route.driver+' #'+routeNum:'Route #'+(routes.indexOf(route)+1);// Calculate route totals (include "?" pending pallets, account for links)
let routeTotalPallets=0;let routeTotalCases=0;let routeLinkedCount=0;// Track linked pallets for adjusted count
const routeTotalByType={};palletTypes.forEach(pt=>{routeTotalByType[pt.abbrev]=0;});route.stores.forEach(store=>{const types=store.palletTypes||[];const links=store.palletLinks||[];(store.pallets||[]).forEach((p,idx)=>{// Include both numeric values AND "?" pending pallets - match metrics.js condition
if((p&&typeof p==='number'&&p>0)||p==='?'){routeTotalPallets++;if(links[idx]===true)routeLinkedCount++;// Only add numeric values to cases total
if(typeof p==='number'&&p>0){routeTotalCases+=p;}const pType=types[idx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;routeTotalByType[normalized]=(routeTotalByType[normalized]||0)+1;}});});// Adjusted pallet count for truck spots
const routeAdjustedPallets=routeTotalPallets-routeLinkedCount;// Calculate per-route max pallets when hiding empty columns
let routeMaxPalletsByType={};if(hideEmptyCols){palletTypes.forEach(pt=>{routeMaxPalletsByType[pt.abbrev]=0;});route.stores.forEach(store=>{const types=store.palletTypes||[];const countByType={};palletTypes.forEach(pt=>{countByType[pt.abbrev]=0;});(store.pallets||[]).forEach((p,idx)=>{if((p&&typeof p==='number'&&p>0)||p==='?'){const pType=types[idx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;countByType[normalized]=(countByType[normalized]||0)+1;}});palletTypes.forEach(pt=>{if(countByType[pt.abbrev]>routeMaxPalletsByType[pt.abbrev]){routeMaxPalletsByType[pt.abbrev]=countByType[pt.abbrev];}});});}else{routeMaxPalletsByType=maxPalletsByType;}// Filter active pallet types for this route
const routeActivePalletTypes=hideEmptyCols?activePalletTypes.filter(pt=>routeMaxPalletsByType[pt.abbrev]>0):activePalletTypes;// Get driver color from preferences
const driverInfo=driversDirectory.find(d=>d.name===route.driver||d.firstName===route.driver);const driverBorderColor=driverInfo?.borderColor||'#000';const driverBgColor=driverInfo?.bgColor||'#fafafa';// Start route table with driver color border
// Calculate total pallet columns across all types
let totalPalletCols=0;routeActivePalletTypes.forEach(pt=>{totalPalletCols+=Math.max(1,routeMaxPalletsByType[pt.abbrev]);});// Check if route is confirmed
const isZoneFormatConfirmed=route.confirmed===true;const zoneFormatBorderColor=!isZoneFormatConfirmed?'#c62828':driverBorderColor;manifestHTML+=`<table style="border: 3px solid ${zoneFormatBorderColor}; margin-bottom: 12px;">`;// Add colgroup for consistent column widths
manifestHTML+=`<colgroup>
                          <col style="width: 35px;">
                          <col style="width: 45px;">
                          <col style="width: auto;">`;routeActivePalletTypes.forEach(pt=>{const cols=Math.max(1,routeMaxPalletsByType[pt.abbrev]);for(let i=0;i<cols;i++){manifestHTML+=`<col style="width: 32px;">`;}});manifestHTML+=`
                          <col style="width: 45px;">
                          <col style="width: 40px;">
                          <col style="width: 30px;">
                        </colgroup>`;// Get route zones from stores (like "NJ & Manhattan")
const routeZonesOrStates=route.stores.map(s=>{const dirStore=storesDirectory.find(ds=>String(ds.code||'').trim()===String(s.code||'').trim());if(!dirStore)return null;return dirStore.zone&&dirStore.zone.trim()!==''?dirStore.zone:dirStore.state;}).filter(Boolean);const uniqueZones=[...new Set(routeZonesOrStates)];const routeZone=uniqueZones.length>0?uniqueZones.join(' & '):'';// Inline warning badge for unconfirmed routes (after zone)
const inlineWarningBadge=!isZoneFormatConfirmed?'<span style="background: #c62828; color: white; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; margin-left: 10px;">⚠ NOT CONFIRMED - PENDING APPROVAL - DO NOT LOAD</span>':'';// Route header row with type headers
manifestHTML+=`<tr>
                          <td colspan="3" style="font-weight: bold; background: ${driverBgColor}; border: 1px solid #000; border-left: none; border-right: none; border-top: none;">📦 ${escapeHtml(routeName)} &nbsp;&nbsp; 🚛 ${escapeHtml(route.truck||'TBD')}${escapeHtml(route.trailer?' / '+route.trailer:'')}${routeZone?' &nbsp;&nbsp; '+routeZone:''}${inlineWarningBadge}</td>`;routeActivePalletTypes.forEach(pt=>{const cols=Math.max(1,routeMaxPalletsByType[pt.abbrev]);const eco=getEcoColor(pt.color);manifestHTML+=`<td colspan="${cols}" class="center" style="background: ${eco.bg}; color: ${eco.text}; font-weight: bold; border: 1px solid #000;">${pt.abbrev}</td>`;});manifestHTML+=`
                          <td class="center" style="background: #f5f5f5; font-weight: bold; border: 1px solid #000; border-bottom: 1px solid #000;">TC</td>
                          <td class="center" style="background: #fff3e0; color: #e65100; font-weight: bold; border: 1px solid #000; border-bottom: 1px solid #000;">PLT</td>
                          <td class="center" style="background: #f5f5f5; border: 1px solid #000; border-bottom: 1px solid #000;">✓</td>
                        </tr>`;// Column numbers row
manifestHTML+=`<tr style="background: #f8f8f8; font-size: 9px;">
                          <td class="center" style="width: 25px; border-bottom: 1px solid #000;">STOP#</td>
                          <td style="width: 30px; border-bottom: 1px solid #000;">Code</td>
                          <td style="border-bottom: 1px solid #000; border-right: 1px solid #000;">Store Name</td>`;routeActivePalletTypes.forEach(pt=>{const cols=Math.max(1,routeMaxPalletsByType[pt.abbrev]);const eco=getEcoColor(pt.color);for(let i=1;i<=cols;i++){const isLast=i===cols;const rightBorder=isLast?'border-right: 1px solid #000;':'';manifestHTML+=`<td class="center" style="color: ${eco.text}; border-bottom: 1px solid #000; ${rightBorder}">${i}</td>`;}});manifestHTML+=`<td class="center" style="border-bottom: 1px solid #000; border-right: 1px solid #000;"></td><td class="center" style="border-bottom: 1px solid #000; border-right: 1px solid #000;"></td><td class="center" style="border-bottom: 1px solid #000;"></td></tr>`;// Store rows
route.stores.forEach((store,sIdx)=>{const types=store.palletTypes||[];const links=store.palletLinks||[];const isLastStore=sIdx===route.stores.length-1;const lastRowBorder=isLastStore?'border-bottom: 1px solid #000;':'';const dirStoreForName=storesDirectory.find(ds=>String(ds.code||'').trim()===String(store.code||'').trim());const displayStoreName=dirStoreForName?.name||store.name||'';const displayAddress=dirStoreForName?`${dirStoreForName.street||''}, ${dirStoreForName.city||''}, ${dirStoreForName.state||''} ${dirStoreForName.zip||''}`:'';// Group pallets by type (include "?" pending pallets)
// Also track which pallets are linked for display
const palletsByType={};const palletLinksbyType={};palletTypes.forEach(pt=>{palletsByType[pt.abbrev]=[];palletLinksbyType[pt.abbrev]=[];});let storeTotalPallets=0;let storeTotalCases=0;let linkedCount=0;// Count of linked pallets (to subtract from truck spots)
(store.pallets||[]).forEach((p,idx)=>{// Include both numeric values AND "?" pending pallets - match metrics.js condition
if((p&&typeof p==='number'&&p>0)||p==='?'){const pType=types[idx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;const isLinked=links[idx]===true;// This pallet is linked to previous
palletsByType[normalized].push({value:p,linked:isLinked});storeTotalPallets++;if(isLinked)linkedCount++;// Only add numeric values to cases total
if(typeof p==='number'&&p>0){storeTotalCases+=p;}}});// Adjusted pallet count for truck spots (linked pallets share a spot)
const adjustedPalletCount=storeTotalPallets-linkedCount;groupTotalPallets+=adjustedPalletCount;// Use adjusted count for totals
groupTotalCases+=storeTotalCases;groupLinkedCount+=linkedCount;// Track total linked for group
routeActivePalletTypes.forEach(pt=>{groupTotalByType[pt.abbrev]+=palletsByType[pt.abbrev].length;});const rowBg=sIdx%2===1?'background: #fafafa;':'';manifestHTML+=`<tr style="${rowBg}">
                            <td class="center" style="width: 25px; ${lastRowBorder}">${sIdx+1}</td>
                            <td style="width: 30px; font-weight: bold; ${lastRowBorder}">${escapeHtml(store.code||'')}</td>
                            <td style="${lastRowBorder} border-right: 1px solid #000;">${escapeHtml(displayStoreName)}</td>`;routeActivePalletTypes.forEach(pt=>{const cols=Math.max(1,routeMaxPalletsByType[pt.abbrev]);const pallets=palletsByType[pt.abbrev];const eco=getEcoColor(pt.color);for(let i=0;i<cols;i++){const isLast=i===cols-1;const rightBorder=isLast?'border-right: 1px solid #000;':'';if(i<pallets.length){const pallet=pallets[i];// Display "PLT" for pending pallets instead of "?"
const displayVal=pallet.value==='?'?'PLT':pallet.value;// Merged pallets - no indicator, just show the value
manifestHTML+=`<td class="center" style="color: ${eco.text}; font-weight: bold; ${lastRowBorder} ${rightBorder}">${displayVal}</td>`;}else{manifestHTML+=`<td class="center" style="color: #bbb; ${lastRowBorder} ${rightBorder}">-</td>`;}}});// Show adjusted pallet count (merged pallets count as 1 truck spot)
const pltDisplay=linkedCount>0?adjustedPalletCount:storeTotalPallets;manifestHTML+=`
                            <td class="center" style="border-right: 1px solid #000; ${lastRowBorder}">${storeTotalCases}</td>
                            <td class="center" style="font-weight: bold; border-right: 1px solid #000; ${lastRowBorder}">${pltDisplay}</td>
                            <td class="center" style="${lastRowBorder}"></td>
                          </tr>`;});// Route total row
manifestHTML+=`<tr class="route-total" style="background: ${driverBgColor};">
                          <td colspan="3" style="text-align: right; color: ${driverBorderColor}; font-weight: bold; border: 1px solid #000;">Route Total:</td>`;routeActivePalletTypes.forEach(pt=>{const cols=Math.max(1,routeMaxPalletsByType[pt.abbrev]);const eco=getEcoColor(pt.color);if(cols===1){manifestHTML+=`<td class="center" style="color: ${eco.text}; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; border-right: 1px solid #000;">${routeTotalByType[pt.abbrev]||0}</td>`;}else{manifestHTML+=`<td class="center" style="color: ${eco.text}; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000;">${routeTotalByType[pt.abbrev]||0}</td>`;for(let i=1;i<cols;i++){const isLast=i===cols-1;const rightBorder=isLast?'border-right: 1px solid #000;':'';manifestHTML+=`<td style="border-top: 1px solid #000; border-bottom: 1px solid #000; ${rightBorder}"></td>`;}}});// Route total with adjusted pallet count (no indicator)
const routePltDisplay=routeAdjustedPallets;manifestHTML+=`
                          <td class="center" style="font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; border-right: 1px solid #000;">${routeTotalCases}</td>
                          <td class="center" style="color: ${driverBorderColor}; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; border-right: 1px solid #000;">${routePltDisplay}</td>
                          <td style="border-top: 1px solid #000; border-bottom: 1px solid #000;"></td>
                        </tr>`;// Close route table
manifestHTML+=`</table>`;});// Grand total in separate table with same colgroup for alignment
manifestHTML+=`<table style="border: 2px solid #000;">`;// Add colgroup for consistent column widths (same as route tables)
manifestHTML+=`<colgroup>
                        <col style="width: 35px;">
                        <col style="width: 45px;">
                        <col style="width: auto;">`;activePalletTypes.forEach(pt=>{const cols=Math.max(1,maxPalletsByType[pt.abbrev]);for(let i=0;i<cols;i++){manifestHTML+=`<col style="width: 32px;">`;}});manifestHTML+=`
                        <col style="width: 45px;">
                        <col style="width: 40px;">
                        <col style="width: 30px;">
                      </colgroup>`;manifestHTML+=`<tr class="grand-total">
                        <td colspan="3" style="text-align: right; padding: 6px; color: #1a7f4b; border: 1px solid #000;">${groupByRouteNum?'ROUTE #'+group.num+' TOTAL':'GRAND TOTAL'}</td>`;activePalletTypes.forEach(pt=>{const cols=Math.max(1,maxPalletsByType[pt.abbrev]);const eco=getEcoColor(pt.color);if(cols===1){manifestHTML+=`<td class="center" style="color: ${eco.text}; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; border-right: 1px solid #000;">${groupTotalByType[pt.abbrev]||0}</td>`;}else{manifestHTML+=`<td class="center" style="color: ${eco.text}; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000;">${groupTotalByType[pt.abbrev]||0}</td>`;for(let i=1;i<cols;i++){const isLast=i===cols-1;const rightBorder=isLast?'border-right: 1px solid #000;':'';manifestHTML+=`<td style="border-top: 1px solid #000; border-bottom: 1px solid #000; ${rightBorder}"></td>`;}}});// Grand total with adjusted pallet count (no indicator)
const grandPltDisplay=groupTotalPallets;manifestHTML+=`
                        <td class="center" style="font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; border-right: 1px solid #000;">${groupTotalCases}</td>
                        <td class="center" style="color: #e65100; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; border-right: 1px solid #000;">${grandPltDisplay}</td>
                        <td style="border-top: 1px solid #000; border-bottom: 1px solid #000;"></td>
                      </tr>`;manifestHTML+=`
                        </table>
                        <div style="margin-top: 15px; text-align: center; font-size: 9px; color: #666;">
                          <strong>Warehouse Signature:</strong> _________________________ &nbsp;&nbsp;&nbsp; <strong>Date/Time:</strong> _________________________
                        </div>
                      </div>`;});manifestHTML+=`
                      ${fitToPage?'</div>':''}
                      </body>
                      </html>
                    `;const popup=window.open('','_blank','width=1100,height=800');popup.document.write(manifestHTML);popup.document.close();popup.onload=()=>popup.print();return;}if(manifestFormat==='loading-sequence'){// Option 5: Loading Sequence
// Calculate scale for fit-to-page
const storeCountLS=routes.reduce((sum,r)=>sum+r.stores.length,0);let scaleLS=100;if(fitToPage){if(storeCountLS>30)scaleLS=55;else if(storeCountLS>20)scaleLS=65;else if(storeCountLS>15)scaleLS=75;else if(storeCountLS>10)scaleLS=85;}let manifestHTML=`
                      <html>
                      <head>
                        <title>Loading Sequence - ${routeDateShort}</title>
                        <style>
                          @page { size: ${orientation}; margin: ${fitToPage?'0.25in':'0.4in'}; }
                          @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
                          body { font-family: Arial, sans-serif; font-size: ${fitToPage?'10px':'11px'}; margin: 0; padding: ${fitToPage?'5px':'10px'}; }
                          ${fitToPage?`
                          .manifest-container {
                            transform: scale(${scaleLS/100});
                            transform-origin: top left;
                            width: ${100/(scaleLS/100)}%;
                          }
                          `:''}
                          .header { text-align: center; margin-bottom: ${fitToPage?'10px':'15px'}; border-bottom: 3px solid #d32f2f; padding-bottom: ${fitToPage?'6px':'10px'}; }
                          .header h1 { margin: 0; font-size: ${fitToPage?'16px':'20px'}; color: #d32f2f; }
                          .warning { background: #ffebee; padding: ${fitToPage?'6px':'10px'}; border-radius: 6px; margin-bottom: ${fitToPage?'10px':'15px'}; color: #c62828; font-weight: bold; text-align: center; }
                          .route-section { margin-bottom: ${fitToPage?'12px':'20px'}; border: 2px solid #333; border-radius: 8px; overflow: hidden; }
                          .route-header { background: #333; color: white; padding: ${fitToPage?'6px 10px':'10px 15px'}; font-weight: bold; font-size: ${fitToPage?'12px':'14px'}; }
                          .load-item { display: flex; align-items: center; padding: ${fitToPage?'6px 10px':'10px 15px'}; border-bottom: 1px solid #eee; }
                          .load-item:nth-child(even) { background: #f9f9f9; }
                          .load-num { width: ${fitToPage?'30px':'40px'}; height: ${fitToPage?'30px':'40px'}; background: #d32f2f; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: ${fitToPage?'12px':'16px'}; margin-right: ${fitToPage?'10px':'15px'}; flex-shrink: 0; }
                          .load-details { flex: 1; }
                          .store-name { font-weight: bold; font-size: ${fitToPage?'11px':'13px'}; }
                          .store-info { font-size: ${fitToPage?'9px':'10px'}; color: #666; }
                          .pallet-tags { display: flex; gap: ${fitToPage?'3px':'5px'}; flex-wrap: wrap; }
                          .pallet-tag { padding: ${fitToPage?'2px 5px':'4px 8px'}; border-radius: 4px; color: white; font-size: ${fitToPage?'9px':'10px'}; font-weight: bold; text-align: center; min-width: ${fitToPage?'30px':'40px'}; }
                        </style>
                      </head>
                      <body>
                        ${fitToPage?'<div class="manifest-container">':''}
                        <div class="header">
                          <h1>⚠ LOADING SEQUENCE</h1>
                          <p style="font-size: ${fitToPage?'13px':'16px'}; font-weight: bold; color: #1a7f4b; margin: 4px 0;">📅 ${routeDateShort}</p>
                          <p>${escapeHtml(bolSettings.companyName)} - Printed: ${printTime}</p>
                        </div>
                        <div class="warning">⚠ LOAD IN THIS ORDER - First item goes to BACK of truck</div>
                    `;routes.forEach((route,rIdx)=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;const routeName=route.driver?route.driver+' #'+routeNum:'Route #'+(rIdx+1);// Check if route is confirmed
const isLoadOrderConfirmed=route.confirmed===true;manifestHTML+=`
                        <div class="route-section" style="${!isLoadOrderConfirmed?'border: 3px solid #c62828 !important;':''}">
                          ${!isLoadOrderConfirmed?'<div style="background: #c62828; color: white; text-align: center; padding: 6px; font-weight: bold; font-size: 11px;">⚠ NOT CONFIRMED - PENDING APPROVAL - DO NOT LOAD ⚠</div>':''}
                          <div class="route-header">🚛 ${escapeHtml(routeName)} ${!isLoadOrderConfirmed?'🔴':'✅'} - Truck: ${escapeHtml(route.truck||'TBD')}${escapeHtml(route.trailer?' / '+route.trailer:'')}</div>
                      `;// Reverse order for loading
const reversedStores=[...route.stores].reverse();reversedStores.forEach((store,sIdx)=>{const originalIdx=route.stores.length-sIdx;const types=store.palletTypes||[];const isLast=sIdx===0;const isFirst=sIdx===reversedStores.length-1;const dirStoreForName=storesDirectory.find(ds=>String(ds.code||'').trim()===String(store.code||'').trim());const displayStoreName=dirStoreForName?.name||store.name||'';manifestHTML+=`
                          <div class="load-item">
                            <div class="load-num">${sIdx+1}</div>
                            <div class="load-details">
                              <div class="store-name">${escapeHtml(store.code||'')} - ${escapeHtml(displayStoreName)}</div>
                              <div class="store-info">${isLast?'Last Delivery':isFirst?'First Delivery':'Stop '+originalIdx} • ${escapeHtml(routeName)}</div>
                            </div>
                            <div class="pallet-tags">
                        `;(store.pallets||[]).forEach((p,pIdx)=>{// Include both numeric values AND "?" pending pallets
if(p&&typeof p==='number'&&p>0||p==='?'){const pType=types[pIdx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;const typeConfig=palletTypes.find(pt=>pt.abbrev===normalized)||palletTypes[0];const displayVal=p==='?'?'PLT':p;manifestHTML+=`<div class="pallet-tag" style="background: ${typeConfig?.color||'#607d8b'};">${normalized}<br>${displayVal}</div>`;}});manifestHTML+=`
                            </div>
                          </div>
                        `;});manifestHTML+=`</div>`;});manifestHTML+=`
                        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #666;">
                          <strong>Warehouse Signature:</strong> _________________________ &nbsp;&nbsp;&nbsp; <strong>Date/Time:</strong> _________________________
                        </div>
                        ${fitToPage?'</div>':''}
                      </body>
                      </html>
                    `;const popup=window.open('','_blank','width=900,height=800');popup.document.write(manifestHTML);popup.document.close();popup.onload=()=>popup.print();return;}if(manifestFormat==='summary-cards'){// Option 2: Route Summary Cards
// Calculate scale for fit-to-page
const routeCountSC=routes.length;let scaleSC=100;if(fitToPage){if(routeCountSC>10)scaleSC=60;else if(routeCountSC>8)scaleSC=70;else if(routeCountSC>6)scaleSC=80;else if(routeCountSC>4)scaleSC=90;}let manifestHTML=`
                      <html>
                      <head>
                        <title>Route Summary - ${routeDateShort}</title>
                        <style>
                          @page { size: ${orientation}; margin: ${fitToPage?'0.25in':'0.4in'}; }
                          @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
                          body { font-family: Arial, sans-serif; font-size: ${fitToPage?'10px':'11px'}; margin: 0; padding: ${fitToPage?'5px':'10px'}; }
                          ${fitToPage?`
                          .manifest-container {
                            transform: scale(${scaleSC/100});
                            transform-origin: top left;
                            width: ${100/(scaleSC/100)}%;
                          }
                          `:''}
                          .header { text-align: center; margin-bottom: ${fitToPage?'12px':'20px'}; border-bottom: 3px solid #1a7f4b; padding-bottom: ${fitToPage?'6px':'10px'}; }
                          .header h1 { margin: 0; font-size: ${fitToPage?'16px':'20px'}; color: #1a7f4b; }
                          .cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: ${fitToPage?'10px':'15px'}; }
                          .route-card { border: 3px solid #1976d2; border-radius: ${fitToPage?'6px':'10px'}; overflow: hidden; }
                          .route-card-header { background: #e3f2fd; padding: ${fitToPage?'8px 10px':'12px 15px'}; border-bottom: 2px solid #1976d2; }
                          .route-card-header h3 { margin: 0; font-size: ${fitToPage?'12px':'14px'}; color: #1976d2; }
                          .route-card-body { padding: ${fitToPage?'10px':'15px'}; }
                          .stats-row { display: flex; gap: ${fitToPage?'6px':'10px'}; flex-wrap: wrap; justify-content: center; }
                          .stat-box { text-align: center; padding: ${fitToPage?'5px 8px':'8px 12px'}; border-radius: 6px; min-width: ${fitToPage?'40px':'50px'}; }
                          .stat-label { font-size: ${fitToPage?'8px':'9px'}; color: #666; text-transform: uppercase; }
                          .stat-value { font-size: ${fitToPage?'16px':'20px'}; font-weight: bold; }
                          .grand-total { margin-top: ${fitToPage?'12px':'20px'}; padding: ${fitToPage?'10px':'15px'}; background: #e8f5e9; border: 2px solid #1a7f4b; border-radius: 8px; text-align: center; }
                        </style>
                      </head>
                      <body>
                        ${fitToPage?'<div class="manifest-container">':''}
                        <div class="header">
                          <h1>📊 ROUTE SUMMARY</h1>
                          <p style="font-size: ${fitToPage?'13px':'16px'}; font-weight: bold; color: #1a7f4b; margin: 4px 0;">📅 ${routeDateShort}</p>
                          <p>${escapeHtml(bolSettings.companyName)} - Printed: ${printTime}</p>
                        </div>
                        <div class="cards-grid">
                    `;let grandTotalPallets=0;const grandTotalByType={};palletTypes.forEach(pt=>{grandTotalByType[pt.abbrev]=0;});routes.forEach((route,rIdx)=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;const routeName=route.driver?route.driver+' #'+routeNum:'Route #'+(rIdx+1);const driverInfo=driversDirectory.find(d=>d.name===route.driver||d.firstName===route.driver);const borderColor=driverInfo?.borderColor||'#1976d2';const bgColor=driverInfo?.bgColor||'#e3f2fd';// Check if route is confirmed
const isCardRouteConfirmed=route.confirmed===true;let routeTotal=0;const routeByType={};palletTypes.forEach(pt=>{routeByType[pt.abbrev]=0;});route.stores.forEach(store=>{const types=store.palletTypes||[];(store.pallets||[]).forEach((p,pIdx)=>{// Include both numeric values AND "?" pending pallets
if(p&&typeof p==='number'&&p>0||p==='?'){routeTotal++;grandTotalPallets++;const pType=types[pIdx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;routeByType[normalized]++;grandTotalByType[normalized]++;}});});manifestHTML+=`
                        <div class="route-card" style="border-color: ${!isCardRouteConfirmed?'#c62828':borderColor};">
                          ${!isCardRouteConfirmed?'<div style="background: #c62828; color: white; text-align: center; padding: 4px 8px; font-size: 10px; font-weight: bold;">⚠ NOT CONFIRMED - DO NOT LOAD</div>':''}
                          <div class="route-card-header" style="background: ${bgColor}; border-color: ${borderColor};">
                            <h3 style="color: ${borderColor};">🚛 ${escapeHtml(routeName)} ${!isCardRouteConfirmed?'🔴':'✅'} - Truck: ${escapeHtml(route.truck||'TBD')}${escapeHtml(route.trailer?' / '+route.trailer:'')}</h3>
                            <div style="font-size: 11px; color: #666;">${route.stores.length} Stores</div>
                          </div>
                          <div class="route-card-body">
                            <div class="stats-row">
                      `;palletTypes.forEach(pt=>{manifestHTML+=`
                          <div class="stat-box" style="background: ${pt.color}15; border: 2px solid ${pt.color};">
                            <div class="stat-label">${pt.abbrev}</div>
                            <div class="stat-value" style="color: ${pt.color};">${routeByType[pt.abbrev]}</div>
                          </div>
                        `;});manifestHTML+=`
                              <div class="stat-box" style="background: #fff3e0; border: 2px solid #ff9800;">
                                <div class="stat-label">TOTAL</div>
                                <div class="stat-value" style="color: #ff9800;">${routeTotal}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      `;});manifestHTML+=`
                        </div>
                        <div class="grand-total">
                          <div style="font-size: 12px; color: #666;">GRAND TOTAL - ALL ROUTES</div>
                          <div style="font-size: 28px; font-weight: bold; color: #1a7f4b;">${grandTotalPallets} Pallets</div>
                          <div style="margin-top: 10px; display: flex; gap: 15px; justify-content: center;">
                    `;palletTypes.forEach(pt=>{manifestHTML+=`<span style="color: ${pt.color}; font-weight: bold;">${pt.abbrev}: ${grandTotalByType[pt.abbrev]}</span>`;});manifestHTML+=`
                          </div>
                        </div>
                        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #666;">
                          <strong>Warehouse Signature:</strong> _________________________ &nbsp;&nbsp;&nbsp; <strong>Date/Time:</strong> _________________________
                        </div>
                        ${fitToPage?'</div>':''}
                      </body>
                      </html>
                    `;const popup=window.open('','_blank','width=900,height=800');popup.document.write(manifestHTML);popup.document.close();popup.onload=()=>popup.print();return;}if(manifestFormat==='pick-list'){// Option 3: Pallet Pick List
// Calculate scale for fit-to-page
const typeCountPL=palletTypes.filter(pt=>{let hasStores=false;routes.forEach(route=>{route.stores.forEach(store=>{const types=store.palletTypes||[];(store.pallets||[]).forEach((p,pIdx)=>{if(p&&typeof p==='number'&&p>0||p==='?'){const pType=types[pIdx]||'FZ';if(pType===pt.abbrev)hasStores=true;}});});});return hasStores;}).length;let scalePL=100;if(fitToPage){if(typeCountPL>4)scalePL=70;else if(typeCountPL>3)scalePL=80;else if(typeCountPL>2)scalePL=90;}let manifestHTML=`
                      <html>
                      <head>
                        <title>Pallet Pick List - ${routeDateShort}</title>
                        <style>
                          @page { size: ${orientation}; margin: ${fitToPage?'0.25in':'0.4in'}; }
                          @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
                          body { font-family: Arial, sans-serif; font-size: ${fitToPage?'10px':'11px'}; margin: 0; padding: ${fitToPage?'5px':'10px'}; }
                          ${fitToPage?`
                          .manifest-container {
                            transform: scale(${scalePL/100});
                            transform-origin: top left;
                            width: ${100/(scalePL/100)}%;
                          }
                          `:''}
                          .header { text-align: center; margin-bottom: ${fitToPage?'12px':'20px'}; border-bottom: 3px solid #1a7f4b; padding-bottom: ${fitToPage?'6px':'10px'}; }
                          .header h1 { margin: 0; font-size: ${fitToPage?'16px':'20px'}; color: #1a7f4b; }
                          .type-section { margin-bottom: ${fitToPage?'12px':'20px'}; border-radius: 8px; overflow: hidden; }
                          .type-header { padding: ${fitToPage?'8px 10px':'12px 15px'}; color: white; font-weight: bold; font-size: ${fitToPage?'12px':'14px'}; display: flex; justify-content: space-between; }
                          .type-stores { padding: ${fitToPage?'10px':'15px'}; background: #f9f9f9; }
                          .store-tag { display: inline-block; background: white; padding: ${fitToPage?'4px 8px':'6px 12px'}; margin: ${fitToPage?'3px':'4px'}; border-radius: 6px; border: 1px solid #ddd; font-size: ${fitToPage?'10px':'11px'}; }
                          .store-tag strong { margin-right: 5px; }
                        </style>
                      </head>
                      <body>
                        ${fitToPage?'<div class="manifest-container">':''}
                        <div class="header">
                          <h1>🧊 PALLET PICK LIST</h1>
                          <p style="font-size: ${fitToPage?'13px':'16px'}; font-weight: bold; color: #1a7f4b; margin: 4px 0;">📅 ${routeDateShort}</p>
                          <p>${escapeHtml(bolSettings.companyName)} - Printed: ${printTime}</p>
                        </div>
                    `;// Group by type
const storesByType={};palletTypes.forEach(pt=>{storesByType[pt.abbrev]=[];});routes.forEach((route,rIdx)=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;const routeName=route.driver?route.driver+' #'+routeNum:'Route #'+(rIdx+1);route.stores.forEach(store=>{const types=store.palletTypes||[];const countByType={};palletTypes.forEach(pt=>{countByType[pt.abbrev]=0;});(store.pallets||[]).forEach((p,pIdx)=>{// Include both numeric values AND "?" pending pallets
if(p&&typeof p==='number'&&p>0||p==='?'){const pType=types[pIdx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;countByType[normalized]++;}});palletTypes.forEach(pt=>{if(countByType[pt.abbrev]>0){storesByType[pt.abbrev].push({code:store.code,name:store.name,count:countByType[pt.abbrev],route:routeName,truck:route.truck});}});});});palletTypes.forEach(pt=>{const stores=storesByType[pt.abbrev];const totalPallets=stores.reduce((sum,s)=>sum+s.count,0);manifestHTML+=`
                        <div class="type-section" style="border: 3px solid ${pt.color};">
                          <div class="type-header" style="background: ${pt.color};">
                            <span>${pt.abbrev==='FZ'?'🧊':pt.abbrev==='DR'?'🥬':'📦'} ${pt.name} (${pt.abbrev})</span>
                            <span>${totalPallets} Pallets</span>
                          </div>
                          <div class="type-stores">
                      `;if(stores.length>0){stores.forEach(s=>{manifestHTML+=`<span class="store-tag"><strong>${s.code}</strong> ${s.name} (${s.count}) - ${s.route}</span>`;});}else{manifestHTML+=`<em style="color: #999;">No pallets of this type</em>`;}manifestHTML+=`
                          </div>
                        </div>
                      `;});manifestHTML+=`
                        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #666;">
                          <strong>Warehouse Signature:</strong> _________________________ &nbsp;&nbsp;&nbsp; <strong>Date/Time:</strong> _________________________
                        </div>
                        ${fitToPage?'</div>':''}
                      </body>
                      </html>
                    `;const popup=window.open('','_blank','width=900,height=800');popup.document.write(manifestHTML);popup.document.close();popup.onload=()=>popup.print();return;}if(manifestFormat==='driver-checklist'){// Option 4: Driver Checklist
// Calculate scale for fit-to-page
const storeCountDC=routes.reduce((sum,r)=>sum+r.stores.length,0);let scaleDC=100;if(fitToPage){if(storeCountDC>30)scaleDC=60;else if(storeCountDC>20)scaleDC=70;else if(storeCountDC>15)scaleDC=80;else if(storeCountDC>10)scaleDC=90;}let manifestHTML=`
                      <html>
                      <head>
                        <title>Driver Checklist - ${routeDateShort}</title>
                        <style>
                          @page { size: ${orientation}; margin: ${fitToPage?'0.25in':'0.4in'}; }
                          @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
                          body { font-family: Arial, sans-serif; font-size: ${fitToPage?'10px':'11px'}; margin: 0; padding: ${fitToPage?'5px':'10px'}; }
                          ${fitToPage?`
                          .manifest-container {
                            transform: scale(${scaleDC/100});
                            transform-origin: top left;
                            width: ${100/(scaleDC/100)}%;
                          }
                          `:''}
                          .route-page { page-break-after: always; }
                          .route-page:last-child { page-break-after: avoid; }
                          .driver-header { padding: ${fitToPage?'10px':'15px'}; border-radius: 8px 8px 0 0; color: white; font-size: ${fitToPage?'14px':'16px'}; font-weight: bold; }
                          .checklist-table { width: 100%; border-collapse: collapse; }
                          .checklist-table td { border: 1px solid #ddd; padding: ${fitToPage?'8px':'12px'}; font-size: ${fitToPage?'11px':'12px'}; }
                          .checkbox { width: ${fitToPage?'35px':'40px'}; text-align: center; }
                          .checkbox-box { width: ${fitToPage?'20px':'24px'}; height: ${fitToPage?'20px':'24px'}; border: 2px solid #333; display: inline-block; }
                          .signature-area { margin-top: ${fitToPage?'20px':'30px'}; display: flex; gap: ${fitToPage?'25px':'40px'}; }
                          .signature-box { flex: 1; }
                          .signature-line { border-bottom: 1px solid #333; height: ${fitToPage?'30px':'40px'}; margin-top: 5px; }
                          .signature-label { font-size: ${fitToPage?'10px':'11px'}; color: #666; }
                        </style>
                      </head>
                      <body>
                        ${fitToPage?'<div class="manifest-container">':''}
                    `;routes.forEach((route,rIdx)=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;const routeName=route.driver?route.driver+' #'+routeNum:'Route #'+(rIdx+1);const driverInfo=driversDirectory.find(d=>d.name===route.driver||d.firstName===route.driver);const bgColor=driverInfo?.borderColor||'#ff9800';let routeTotal=0;route.stores.forEach(store=>{(store.pallets||[]).forEach(p=>{if(p&&typeof p==='number'&&p>0||p==='?')routeTotal++;});});manifestHTML+=`
                        <div class="route-page">
                          <div class="driver-header" style="background: ${bgColor};">
                            👤 ${escapeHtml(routeName)} &nbsp;&nbsp;|&nbsp;&nbsp; 🚛 Truck: ${escapeHtml(route.truck||'TBD')}${escapeHtml(route.trailer?' / '+route.trailer:'')} &nbsp;&nbsp;|&nbsp;&nbsp; 📦 ${routeTotal} Pallets
                          </div>
                          <table class="checklist-table">
                      `;route.stores.forEach((store,sIdx)=>{let storePallets=0;(store.pallets||[]).forEach(p=>{if(p&&typeof p==='number'&&p>0||p==='?')storePallets++;});const dirStoreForName=storesDirectory.find(ds=>String(ds.code||'').trim()===String(store.code||'').trim());const displayStoreName=dirStoreForName?.name||store.name||'';manifestHTML+=`
                          <tr>
                            <td class="checkbox"><div class="checkbox-box"></div></td>
                            <td><strong>${sIdx+1}. ${escapeHtml(store.code||'')}</strong> - ${escapeHtml(displayStoreName)}</td>
                            <td style="text-align: right; width: 80px;"><strong>${storePallets} PLT</strong></td>
                          </tr>
                        `;});manifestHTML+=`
                          </table>
                          <div class="signature-area">
                            <div class="signature-box">
                              <div class="signature-label">Driver Signature:</div>
                              <div class="signature-line"></div>
                            </div>
                            <div class="signature-box">
                              <div class="signature-label">Warehouse Signature:</div>
                              <div class="signature-line"></div>
                            </div>
                            <div class="signature-box">
                              <div class="signature-label">Date/Time:</div>
                              <div class="signature-line"></div>
                            </div>
                          </div>
                        </div>
                      `;});manifestHTML+=`${fitToPage?'</div>':''}</body></html>`;const popup=window.open('','_blank','width=900,height=800');popup.document.write(manifestHTML);popup.document.close();popup.onload=()=>popup.print();return;}if(manifestFormat==='store-labels'){// Option 6: Store Labels
// Calculate scale for fit-to-page
const totalLabelsSL=routes.reduce((sum,r)=>{return sum+r.stores.reduce((storeSum,store)=>{return storeSum+(store.pallets||[]).filter(p=>p&&typeof p==='number'&&p>0||p==='?').length;},0);},0);let scaleSL=100;if(fitToPage){if(totalLabelsSL>30)scaleSL=60;else if(totalLabelsSL>24)scaleSL=70;else if(totalLabelsSL>18)scaleSL=80;else if(totalLabelsSL>12)scaleSL=90;}let manifestHTML=`
                      <html>
                      <head>
                        <title>Store Labels - ${routeDateShort}</title>
                        <style>
                          @page { size: ${orientation}; margin: ${fitToPage?'0.2in':'0.3in'}; }
                          @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
                          body { font-family: Arial, sans-serif; font-size: ${fitToPage?'10px':'11px'}; margin: 0; padding: ${fitToPage?'5px':'10px'}; }
                          ${fitToPage?`
                          .manifest-container {
                            transform: scale(${scaleSL/100});
                            transform-origin: top left;
                            width: ${100/(scaleSL/100)}%;
                          }
                          `:''}
                          .labels-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: ${fitToPage?'6px':'10px'}; }
                          .label-tag { border: 2px dashed #333; padding: ${fitToPage?'8px':'12px'}; text-align: center; border-radius: 6px; page-break-inside: avoid; }
                          .store-code { font-size: ${fitToPage?'20px':'24px'}; font-weight: bold; }
                          .store-name { font-size: ${fitToPage?'9px':'10px'}; color: #666; margin: ${fitToPage?'4px':'6px'} 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                          .pallet-info { font-size: ${fitToPage?'10px':'12px'}; font-weight: bold; padding: ${fitToPage?'4px 8px':'6px 10px'}; border-radius: 4px; color: white; display: inline-block; }
                          .route-info { font-size: ${fitToPage?'8px':'9px'}; margin-top: ${fitToPage?'4px':'6px'}; color: #666; }
                        </style>
                      </head>
                      <body>
                        ${fitToPage?'<div class="manifest-container">':''}
                        <div class="labels-grid">
                    `;routes.forEach((route,rIdx)=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;const routeName=route.driver?route.driver+' #'+routeNum:'Route #'+(rIdx+1);// Check if route is confirmed
const isLabelRouteConfirmed=route.confirmed===true;route.stores.forEach(store=>{const types=store.palletTypes||[];const dirStoreForName=storesDirectory.find(ds=>String(ds.code||'').trim()===String(store.code||'').trim());const displayStoreName=dirStoreForName?.name||store.name||'';// Group pallets by type
const palletsByType={};palletTypes.forEach(pt=>{palletsByType[pt.abbrev]=[];});(store.pallets||[]).forEach((p,pIdx)=>{// Include both numeric values AND "?" pending pallets
if(p&&typeof p==='number'&&p>0||p==='?'){const pType=types[pIdx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;palletsByType[normalized].push(p);}});// Create label for each pallet
palletTypes.forEach(pt=>{const pallets=palletsByType[pt.abbrev];pallets.forEach((cases,pIdx)=>{manifestHTML+=`
                              <div class="label-tag" style="${!isLabelRouteConfirmed?'border-color: #c62828;':''}">
                                ${!isLabelRouteConfirmed?'<div style="background: #c62828; color: white; font-size: 8px; font-weight: bold; padding: 2px; margin: -12px -12px 6px -12px; border-radius: 4px 4px 0 0;">⚠ NOT CONFIRMED</div>':''}
                                <div class="store-code">${escapeHtml(store.code||'')}</div>
                                <div class="store-name">${escapeHtml(displayStoreName)}</div>
                                <div class="pallet-info" style="background: ${pt.color};">${pt.abbrev} ${pIdx+1}/${pallets.length}</div>
                                <div style="font-size: 11px; margin-top: 4px;">${cases==='?'?'PLT (TBD)':cases+' cases'}</div>
                                <div class="route-info">${escapeHtml(routeName)} ${!isLabelRouteConfirmed?'🔴':''} • 🚛 ${escapeHtml(route.truck||'TBD')}${escapeHtml(route.trailer?' / '+route.trailer:'')}</div>
                              </div>
                            `;});});});});manifestHTML+=`
                        </div>
                        ${fitToPage?'</div>':''}
                      </body>
                      </html>
                    `;const popup=window.open('','_blank','width=1000,height=800');popup.document.write(manifestHTML);popup.document.close();popup.onload=()=>popup.print();return;}// Default: Original manifest format (for other options not yet implemented)
// Generate Warehouse Manifest with colors
// Check if any routes are not confirmed
const unconfirmedRoutes=routes.filter(r=>!r.confirmed);const hasUnconfirmedRoutes=unconfirmedRoutes.length>0;// Calculate scaling based on content
const routeCount=routes.length;const storeCount=routes.reduce((sum,r)=>sum+r.stores.length,0);// Estimate scale: base on total content
let scale=100;if(fitToPage){if(storeCount>30)scale=50;else if(storeCount>20)scale=60;else if(storeCount>15)scale=70;else if(storeCount>10)scale=80;else if(storeCount>5)scale=90;}// Watermark CSS
const watermarkCSS=hasUnconfirmedRoutes?`
                    .watermark {
                      position: fixed;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%) rotate(-45deg);
                      font-size: 72px;
                      font-weight: bold;
                      color: rgba(255, 0, 0, 0.15);
                      white-space: nowrap;
                      z-index: 1000;
                      pointer-events: none;
                    }
                    .watermark-banner {
                      background: #c62828;
                      color: white;
                      text-align: center;
                      padding: 10px 20px;
                      font-size: 14px;
                      font-weight: bold;
                      margin-bottom: 10px;
                      border-radius: 4px;
                    }
                    @media print {
                      .watermark, .watermark-banner { 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                    }
                  `:'';// Watermark HTML
const watermarkHTML=hasUnconfirmedRoutes?`
                    <div class="watermark">⚠ PENDING APPROVAL - DO NOT LOAD ⚠</div>
                    <div class="watermark-banner">
                      ⚠ WARNING: ${unconfirmedRoutes.length} ROUTE${unconfirmedRoutes.length>1?'S':''} NOT CONFIRMED 
                      (${unconfirmedRoutes.map(r=>r.driver||'Unassigned').join(', ')}) - 
                      GET ADMIN APPROVAL BEFORE LOADING
                    </div>
                  `:'';let manifestHTML=`
                    <html>
                    <head>
                      <title>Warehouse Manifest - ${routeDateShort}</title>
                      <style>
                        ${watermarkCSS}
                        @page { 
                          size: ${orientation}; 
                          margin: ${compact?'0.2in':fitToPage?'0.25in':'0.4in'}; 
                        }
                        ${fitToPage?`
                        html, body {
                          width: 100%;
                          height: 100%;
                        }
                        .manifest-container {
                          transform: scale(${scale/100});
                          transform-origin: top left;
                          width: ${100/(scale/100)}%;
                        }
                        @media print {
                          body {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                          }
                        }
                        `:''}
                        body { font-family: Arial, sans-serif; font-size: ${compact?'8px':fitToPage?'10px':'11px'}; margin: 0; padding: ${compact?'2px':fitToPage?'5px':'0'}; }
                        .header { text-align: center; margin-bottom: ${compact?'4px':fitToPage?'8px':'15px'}; border-bottom: ${compact?'2px':'3px'} solid #1a7f4b; padding-bottom: ${compact?'2px':fitToPage?'5px':'10px'}; }
                        .header h1 { margin: 0; font-size: ${compact?'12px':fitToPage?'16px':'22px'}; color: #1a7f4b; }
                        .header p { margin: ${compact?'1px':'3px'} 0 0; color: #666; font-size: ${compact?'8px':fitToPage?'10px':'12px'}; }
                        .route-section { margin-bottom: ${compact?'4px':fitToPage?'10px':'20px'}; page-break-inside: ${fitToPage?'auto':'avoid'}; }
                        .route-header { padding: ${compact?'2px 4px':fitToPage?'4px 8px':'8px 12px'}; font-weight: bold; font-size: ${compact?'9px':fitToPage?'11px':'14px'}; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0; }
                        .route-header .truck-info { background: #fff; padding: ${compact?'1px 4px':fitToPage?'2px 8px':'4px 12px'}; border-radius: 3px; font-size: ${compact?'9px':fitToPage?'12px':'16px'}; }
                        table { width: 100%; border-collapse: collapse; }
                        th { color: white; padding: ${compact?'1px 2px':fitToPage?'3px 4px':'6px 8px'}; text-align: left; font-size: ${compact?'7px':fitToPage?'8px':'10px'}; }
                        th.center { text-align: center; }
                        td { border: 1px solid #ddd; padding: ${compact?'1px 2px':fitToPage?'2px 4px':'5px 8px'}; font-size: ${compact?'8px':fitToPage?'9px':'11px'}; }
                        td.center { text-align: center; }
                        .pallet-cell { width: ${compact?'20px':fitToPage?'25px':'35px'}; text-align: center; font-weight: bold; }
                        .totals-row { font-weight: bold; }
                        .summary { margin-top: ${compact?'4px':fitToPage?'10px':'25px'}; border: 2px solid #1a7f4b; border-radius: 4px; padding: ${compact?'4px':fitToPage?'8px':'15px'}; }
                        .summary h3 { color: #1a7f4b; margin: 0 0 ${compact?'4px':fitToPage?'8px':'15px'} 0; text-align: center; font-size: ${compact?'10px':fitToPage?'12px':'16px'}; }
                        .summary-grid { display: flex; gap: ${compact?'4px':fitToPage?'10px':'20px'}; justify-content: center; flex-wrap: wrap; }
                        .summary-item { text-align: center; padding: ${compact?'2px 4px':fitToPage?'5px 10px':'10px 20px'}; border: 1px solid #ccc; border-radius: 4px; min-width: ${compact?'30px':fitToPage?'50px':'80px'}; }
                        .summary-label { font-size: ${compact?'6px':fitToPage?'8px':'10px'}; color: #666; text-transform: uppercase; }
                        .summary-value { font-size: ${compact?'12px':fitToPage?'16px':'24px'}; font-weight: bold; }
                        .driver-section { margin-top: ${compact?'2px':fitToPage?'4px':'8px'}; padding: ${compact?'1px 4px':fitToPage?'3px 8px':'5px 12px'}; background: #f5f5f5; font-size: ${compact?'7px':fitToPage?'9px':'11px'}; color: #666; }
                        .check-box { width: ${compact?'10px':fitToPage?'14px':'20px'}; height: ${compact?'10px':fitToPage?'14px':'20px'}; border: 1px solid #333; display: inline-block; margin-right: 2px; vertical-align: middle; }
                        .loaded-column { width: ${compact?'30px':fitToPage?'45px':'60px'}; text-align: center; }
                      </style>
                    </head>
                    <body>
                      ${watermarkHTML}
                      <div class="${fitToPage?'manifest-container':''}">
                      <div class="header">
                        <h1>🚛 WAREHOUSE LOADING MANIFEST</h1>
                        <p style="font-size: 14px; font-weight: bold; color: #1a7f4b; margin: 4px 0;">📅 ${routeDateShort}</p>
                        <p><strong>${escapeHtml(bolSettings.companyName)}</strong>${compact?'':' - Printed: '+printTime}${fitToPage&&!compact?' - <em>Scaled to fit</em>':''}${compact?' - <em>COMPACT</em>':''}</p>
                      </div>
                  `;let grandTotalPallets=0;const grandTotalByType={};palletTypes.forEach(pt=>{grandTotalByType[pt.abbrev]=0;});routes.forEach((route,idx)=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;const routeName=route.driver?route.driver+' #'+routeNum:'Route #'+(idx+1);const driverInfo=driversDirectory.find(d=>d.name===route.driver||d.firstName===route.driver);const bgColor=driverInfo?.bgColor||'#f5f5f5';const borderColor=driverInfo?.borderColor||'#666';// Check if route is confirmed
const isRouteConfirmedManifest=route.confirmed===true;// Calculate route totals
let routeTotal=0;const routeByType={};palletTypes.forEach(pt=>{routeByType[pt.abbrev]=0;});route.stores.forEach(store=>{const types=store.palletTypes||[];(store.pallets||[]).forEach((p,pIdx)=>{// Include both numeric values AND "?" pending pallets
if(p&&typeof p==='number'&&p>0||p==='?'){routeTotal++;grandTotalPallets++;const pType=types[pIdx]||palletTypes[0]?.abbrev||'FZ';const normalizedType=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;routeByType[normalizedType]=(routeByType[normalizedType]||0)+1;grandTotalByType[normalizedType]=(grandTotalByType[normalizedType]||0)+1;}});});// Per-route warning banner for unconfirmed routes
const routeWarningBanner=!isRouteConfirmedManifest?`
                      <div style="background: #c62828; color: white; text-align: center; padding: ${compact?'4px 8px':'6px 12px'}; font-size: ${compact?'10px':'12px'}; font-weight: bold; border-radius: ${compact?'4px 4px 0 0':'8px 8px 0 0'};">
                        ⚠ NOT CONFIRMED - PENDING APPROVAL - DO NOT LOAD ⚠
                      </div>
                    `:'';manifestHTML+=`
                      <div class="route-section" style="border: ${compact?'2px':'3px'} solid ${!isRouteConfirmedManifest?'#c62828':borderColor}; border-radius: ${compact?'4px':'8px'};">
                        ${routeWarningBanner}
                        <div class="route-header" style="background: ${bgColor}; border-bottom: ${compact?'1px':'2px'} solid ${borderColor}; color: ${borderColor}; ${!isRouteConfirmedManifest?'border-radius: 0;':''}">
                          <span>${compact?'':'📦 '}${escapeHtml(routeName)} - ${route.stores.length} Stops ${!isRouteConfirmedManifest?'🔴':'✅'}</span>
                          <span class="truck-info" style="border: ${compact?'1px':'2px'} solid ${borderColor}; color: ${borderColor}; font-weight: bold;">${compact?'':'🚛 '}TRUCK: ${escapeHtml(route.truck||'TBD')}${escapeHtml(route.trailer?' / '+route.trailer:'')}</span>
                          <span style="font-weight: bold;">PLT: ${routeTotal}</span>
                        </div>
                        <table>
                          <thead>
                            <tr style="background: ${borderColor};">
                              <th style="width: ${compact?'25px':'40px'};">#</th>
                              <th style="width: ${compact?'50px':'70px'};">CODE</th>
                              <th>STORE NAME</th>
                    `;// Find max pallets in this route
const maxPallets=Math.max(...route.stores.map(s=>{let count=0;if(s.pallets){s.pallets.forEach(p=>{if(p&&typeof p==='number'&&p>0||p==='?')count++;});}return count;}),1);// Add individual pallet column headers (1, 2, 3, etc.)
for(let i=0;i<maxPallets;i++){manifestHTML+=`<th class="center" style="width: ${compact?'25px':'45px'};">${i+1}</th>`;}manifestHTML+=`
                              <th class="center" style="width: ${compact?'30px':'50px'};">TOT</th>
                              <th class="loaded-column">${compact?'✓':'LOADED ✓'}</th>
                            </tr>
                          </thead>
                          <tbody>
                    `;route.stores.forEach((store,sIdx)=>{const types=store.palletTypes||[];const links=store.palletLinks||[];const dirStoreForName=storesDirectory.find(ds=>String(ds.code||'').trim()===String(store.code||'').trim());const displayStoreName=dirStoreForName?.name||store.name||'';// Get pallets with values and their original indices
const palletsWithValues=[];(store.pallets||[]).forEach((p,idx)=>{// Include both numeric values AND "?" pending pallets
if(p&&typeof p==='number'&&p>0||p==='?'){palletsWithValues.push({value:p,index:idx,type:types[idx],isLinked:links[idx]});}});const storeTotal=palletsWithValues.length;manifestHTML+=`
                        <tr>
                          <td class="center" style="font-weight: bold;">${sIdx+1}</td>
                          <td style="font-weight: bold;">${escapeHtml(store.code||'')}</td>
                          <td>${escapeHtml(displayStoreName)}</td>
                      `;// Add individual pallet cells with merged border styling
for(let i=0;i<maxPallets;i++){if(i<palletsWithValues.length){const pallet=palletsWithValues[i];const nextPallet=palletsWithValues[i+1];const pType=pallet.type||palletTypes[0]?.abbrev||'FZ';const normalizedType=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;const typeConfig=palletTypes.find(pt=>pt.abbrev===normalizedType)||palletTypes[0];// Check if this pallet is linked to previous or next is linked to this
const isLinkedToPrev=pallet.isLinked;const isLinkedToNext=nextPallet&&nextPallet.isLinked;if(compact){// Compact mode: simple text with color
const displayVal=pallet.value==='?'?'PLT':pallet.value;manifestHTML+=`<td class="center" style="font-weight: bold; color: ${typeConfig?.color||'#607d8b'}; font-size: 8px;">${normalizedType}<br>${displayVal}</td>`;}else{// Border styling for merged effect
let borderStyle='border: 2px solid '+(typeConfig?.color||'#607d8b')+';';let borderRadius='border-radius: 4px;';let marginStyle='';if(isLinkedToPrev&&isLinkedToNext){// Middle of a merge group
borderRadius='border-radius: 0;';borderStyle='border: 2px solid #ff9800; border-left: none; border-right: none;';marginStyle='margin: 0 -1px;';}else if(isLinkedToPrev){// End of merge group (linked to previous)
borderRadius='border-radius: 0 4px 4px 0;';borderStyle='border: 2px solid #ff9800; border-left: none;';marginStyle='margin-left: -1px;';}else if(isLinkedToNext){// Start of merge group (next is linked to this)
borderRadius='border-radius: 4px 0 0 4px;';borderStyle='border: 2px solid #ff9800; border-right: none;';marginStyle='margin-right: -1px;';}const bgColor=isLinkedToPrev||isLinkedToNext?'#fff3e0':'white';const displayVal=pallet.value==='?'?'PLT':pallet.value;manifestHTML+=`<td class="center" style="padding: 3px;">
                              <div style="background: ${bgColor}; ${borderStyle} ${borderRadius} padding: 2px; text-align: center; ${marginStyle}">
                                <div style="background: ${typeConfig?.color||'#607d8b'}; color: white; border-radius: 2px; padding: 2px;">
                                  <div style="font-size: 9px; font-weight: bold;">${normalizedType}</div>
                                  <div style="font-size: 11px; font-weight: bold;">${displayVal}</div>
                                </div>
                              </div>
                            </td>`;}}else{manifestHTML+=`<td class="center" style="color: #ccc;">-</td>`;}}manifestHTML+=`
                          <td class="center" style="font-weight: bold; color: ${borderColor}; font-size: 13px;">${storeTotal}</td>
                          <td class="center"><span class="check-box"></span></td>
                        </tr>
                      `;});// Route totals row with driver color
manifestHTML+=`
                      <tr class="totals-row" style="background: ${bgColor};">
                        <td colspan="${3+maxPallets}" style="text-align: right; color: ${borderColor}; font-weight: bold; padding-right: 10px;">ROUTE TOTAL:</td>
                        <td class="center" style="color: ${borderColor}; font-weight: bold; font-size: 14px;">${routeTotal}</td>
                        <td></td>
                      </tr>
                    `;manifestHTML+=`
                          </tbody>
                        </table>
                      </div>
                    `;});// Grand summary
manifestHTML+=`
                    <div class="summary">
                      <h3>📊 GRAND TOTAL - ALL ROUTES</h3>
                      <div class="summary-grid">
                        <div class="summary-item">
                          <div class="summary-label">ROUTES</div>
                          <div class="summary-value">${routes.length}</div>
                        </div>
                        <div class="summary-item">
                          <div class="summary-label">TOTAL PALLETS</div>
                          <div class="summary-value" style="color: #1a7f4b;">${grandTotalPallets}</div>
                        </div>
                  `;palletTypes.forEach(pt=>{manifestHTML+=`
                      <div class="summary-item" style="border: 2px solid ${pt.color};">
                        <div class="summary-label">${pt.abbrev}</div>
                        <div class="summary-value" style="color: ${pt.color};">${grandTotalByType[pt.abbrev]||0}</div>
                      </div>
                    `;});manifestHTML+=`
                      </div>
                      <div style="margin-top: ${fitToPage?'10px':'20px'}; text-align: center; font-size: ${fitToPage?'9px':'11px'}; color: #666;">
                        <strong>Warehouse Signature:</strong> _________________________ &nbsp;&nbsp;&nbsp; <strong>Date/Time:</strong> _________________________
                      </div>
                    </div>
                    </div>
                    </body>
                    </html>
                  `;const popup=window.open('','_blank','width=1100,height=800');popup.document.write(manifestHTML);popup.document.close();popup.onload=()=>popup.print();},style:{background:'#333',color:'white',border:'none',borderRadius:'4px',padding:'4px 10px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',fontWeight:500},title:"Print Manifest"},"\uD83D\uDDA8 Print"),/*#__PURE__*/React.createElement("button",{onClick:()=>{// Generate image summary for the selected date
const dateObj=new Date(selectedDate+'T12:00:00');const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const dayName=dayNames[dateObj.getDay()];const dateDisplay=`${dayName}, ${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;// Check if any routes are not confirmed
const unconfirmedRoutesSummary=routes.filter(r=>!r.confirmed);const hasUnconfirmedSummary=unconfirmedRoutesSummary.length>0;let grandTotalPallets=0;let grandTotalStores=0;let grandTotalTruckSpots=0;let grandTotalLinked=0;let grandTotalCases=0;let grandHasPending=false;const grandTotalByType={};const grandCasesByType={};const grandHasPendingByType={};palletTypes.forEach(pt=>{grandTotalByType[pt.abbrev]=0;grandCasesByType[pt.abbrev]=0;grandHasPendingByType[pt.abbrev]=false;});// Build HTML for each route
let routesHTML='';routes.forEach((route,rIdx)=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;const routeName=route.driver?`${route.driver} #${routeNum}`:`Route #${rIdx+1}`;// First pass: find which types are used and calculate cases
const routeByType={};const routeCasesByType={};const routeHasPendingByType={};palletTypes.forEach(pt=>{routeByType[pt.abbrev]=0;routeCasesByType[pt.abbrev]=0;routeHasPendingByType[pt.abbrev]=false;});let routeTotalCases=0;let routeHasPending=false;route.stores.forEach(store=>{const types=store.palletTypes||[];(store.pallets||[]).forEach((p,pIdx)=>{if(p&&typeof p==='number'&&p>0||p==='?'){const pType=types[pIdx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;routeByType[normalized]=(routeByType[normalized]||0)+1;grandTotalByType[normalized]=(grandTotalByType[normalized]||0)+1;if(p==='?'){routeHasPendingByType[normalized]=true;routeHasPending=true;}else{routeCasesByType[normalized]+=p;routeTotalCases+=p;}}});});const activeTypes=palletTypes.filter(pt=>routeByType[pt.abbrev]>0);let routePallets=0;let routeTruckSpots=0;let routeTotalLinked=0;// Collect all store data first to build rows
const storeData=[];route.stores.forEach((store,sIdx)=>{const dirStore=storesDirectory.find(ds=>String(ds.code||'').trim()===String(store.code||'').trim());const storeName=dirStore?.name||store.name||'';const types=store.palletTypes||[];const links=store.palletLinks||[];// Track individual cases by type
const casesByTypeList={};palletTypes.forEach(pt=>{casesByTypeList[pt.abbrev]=[];});let storePallets=0;let linkedCount=0;(store.pallets||[]).forEach((p,pIdx)=>{if(p&&typeof p==='number'&&p>0||p==='?'){storePallets++;if(links[pIdx])linkedCount++;const pType=types[pIdx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;// Add case to the list (PLT for pending)
if(p==='?'){casesByTypeList[normalized].push('PLT');}else{casesByTypeList[normalized].push(p);}}});const truckSpots=storePallets-linkedCount;routePallets+=storePallets;routeTruckSpots+=truckSpots;routeTotalLinked+=linkedCount;storeData.push({code:store.code,name:storeName,casesByTypeList,storePallets,truckSpots,linkedCount});});// Get driver color from preferences
const driverInfo=driversDirectory.find(d=>d.name===route.driver||d.firstName===route.driver);const driverBgColor=driverInfo?.borderColor||'#1a7f4b';const driverBgLight=driverInfo?.bgColor||'#e8f5e9';// Check if route is confirmed
const isRouteSummaryConfirmed=route.confirmed===true;// Build header row with active types only
const headerCols=activeTypes.map(pt=>`<th style="padding: 4px 2px; border-bottom: 2px solid ${driverBgColor}; text-align: center; min-width: 50px; background: ${pt.color}15; color: ${pt.color}; font-weight: 700;">${pt.abbrev}</th>`).join('');// Per-route warning for unconfirmed
const summaryRouteWarning=!isRouteSummaryConfirmed?`
                      <div style="background: #c62828; color: white; text-align: center; padding: 2px 6px; font-size: 7px; font-weight: bold;">
                        ⚠ NOT CONFIRMED
                      </div>
                    `:'';// Route header - with type columns
routesHTML+=`
                      <div style="margin-bottom: 8px; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 2px solid ${!isRouteSummaryConfirmed?'#c62828':driverBgColor};">
                        ${summaryRouteWarning}
                        <div style="background: ${driverBgColor}; color: white; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center;">
                          <span style="font-size: 9px; font-weight: 700;">${escapeHtml(routeName)} ${!isRouteSummaryConfirmed?'🔴':'✅'}</span>
                          <span style="font-size: 8px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 10px;">
                            Truck: ${escapeHtml(route.truck||'TBD')}${route.trailer?' | Tr: '+route.trailer:''}
                          </span>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
                          <thead>
                            <tr style="background: ${driverBgLight};">
                              <th style="padding: 4px; border-bottom: 2px solid ${driverBgColor}; text-align: center; width: 20px;">#</th>
                              <th style="padding: 4px; border-bottom: 2px solid ${driverBgColor}; text-align: left;">Store</th>
                              ${headerCols}
                              <th style="padding: 4px 2px; border-bottom: 2px solid ${driverBgColor}; text-align: center; min-width: 35px; background: #1a7f4b15; color: #1a7f4b; font-weight: 700;">PLT</th>
                            </tr>
                          </thead>
                          <tbody>
                    `;// Build store rows
storeData.forEach((store,sIdx)=>{const rowBg=sIdx%2===0?'white':'#fafafa';const pltDisplay=store.linkedCount>0?`${store.truckSpots}*`:store.truckSpots;// Build cells for each active type
const typeCells=activeTypes.map(pt=>{const cases=store.casesByTypeList[pt.abbrev]||[];if(cases.length>0){return`<td style="padding: 3px 2px; border-bottom: 1px solid #eee; text-align: center; color: #000; font-weight: 600;">${cases.join(', ')}</td>`;}else{return`<td style="padding: 3px 2px; border-bottom: 1px solid #eee; text-align: center; color: #ccc;">-</td>`;}}).join('');routesHTML+=`
                        <tr style="background: ${rowBg};">
                          <td style="padding: 3px 4px; border-bottom: 1px solid #eee; font-weight: 700; color: #000; text-align: center;">${sIdx+1}.</td>
                          <td style="padding: 3px 4px; border-bottom: 1px solid #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">
                            <span style="font-weight: 600; color: #000;">${String(store.code||'')}</span>
                            <span style="color: #000;"> - ${store.name||''}</span>
                          </td>
                          ${typeCells}
                          <td style="padding: 3px 2px; border-bottom: 1px solid #eee; font-weight: 700; color: #1a7f4b; text-align: center;">${pltDisplay}</td>
                        </tr>
                      `;});// Route total row
const routePltDisplay=routeTotalLinked>0?`${routeTruckSpots}*`:routeTruckSpots;const totalTypeCells=activeTypes.map(pt=>{const count=routeByType[pt.abbrev]||0;return`<td style="padding: 4px 2px; text-align: center; font-weight: 700; color: ${pt.color}; border-top: 2px solid ${driverBgColor};">${count}</td>`;}).join('');routesHTML+=`
                            <tr style="background: ${driverBgLight};">
                              <td colspan="2" style="padding: 4px; font-weight: 700; color: ${driverBgColor}; text-align: right; border-top: 2px solid ${driverBgColor};">Total:</td>
                              ${totalTypeCells}
                              <td style="padding: 4px 2px; font-weight: 700; color: #1a7f4b; text-align: center; border-top: 2px solid ${driverBgColor};">${routePltDisplay}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    `;grandTotalPallets+=routePallets;grandTotalTruckSpots+=routeTruckSpots;grandTotalLinked+=routeTotalLinked;grandTotalStores+=route.stores.length;});// Grand total section
const grandActiveTypes=palletTypes.filter(pt=>grandTotalByType[pt.abbrev]>0);const imageHTML=`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="UTF-8">
                      <title>Routes - ${dateDisplay}</title>
                      <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          min-height: 100vh;
                          padding: 8px;
                          font-size: 8px;
                        }
                        .container {
                          max-width: 480px;
                          margin: 0 auto;
                        }
                        .header {
                          background: white;
                          border-radius: 8px;
                          padding: 8px;
                          margin-bottom: 8px;
                          text-align: center;
                          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                        }
                        .header h1 {
                          font-size: 12px;
                          color: #333;
                          margin-bottom: 2px;
                        }
                        .header .date {
                          font-size: 9px;
                          color: #666;
                        }
                        .grand-total {
                          background: linear-gradient(135deg, #1a7f4b 0%, #2e7d32 100%);
                          border-radius: 8px;
                          padding: 8px;
                          color: white;
                          text-align: center;
                          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                        }
                        .grand-total h2 {
                          font-size: 9px;
                          margin-bottom: 6px;
                          opacity: 0.9;
                        }
                        .grand-total .stats {
                          display: flex;
                          justify-content: center;
                          gap: 6px;
                          flex-wrap: wrap;
                        }
                        .grand-total .stat {
                          background: rgba(255,255,255,0.2);
                          padding: 3px 8px;
                          border-radius: 10px;
                          font-weight: 600;
                          font-size: 8px;
                        }
                        .instructions {
                          text-align: center;
                          margin-top: 8px;
                          color: white;
                          font-size: 7px;
                          opacity: 0.8;
                        }
                        @media print {
                          body { background: white; padding: 0; }
                          .instructions { display: none; }
                          .watermark, .watermark-banner { 
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                          }
                        }
                        ${hasUnconfirmedSummary?`
                        .watermark {
                          position: fixed;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%) rotate(-45deg);
                          font-size: 48px;
                          font-weight: bold;
                          color: rgba(255, 0, 0, 0.2);
                          white-space: nowrap;
                          z-index: 1000;
                          pointer-events: none;
                        }
                        .watermark-banner {
                          background: #c62828;
                          color: white;
                          text-align: center;
                          padding: 6px 12px;
                          font-size: 10px;
                          font-weight: bold;
                          margin-bottom: 8px;
                          border-radius: 4px;
                        }
                        `:''}
                      </style>
                    </head>
                    <body>
                      ${hasUnconfirmedSummary?`
                        <div class="watermark">⚠ PENDING APPROVAL ⚠</div>
                        <div class="watermark-banner">
                          ⚠ ${unconfirmedRoutesSummary.length} ROUTE${unconfirmedRoutesSummary.length>1?'S':''} NOT CONFIRMED
                        </div>
                      `:''}
                      <div class="container">
                        <div class="header">
                          <h1>Route Summary</h1>
                          <div class="date">${dateDisplay}</div>
                        </div>
                        
                        ${routesHTML}
                        
                        <div class="grand-total">
                          <h2>GRAND TOTAL</h2>
                          <div class="stats">
                            ${grandActiveTypes.map(pt=>{return`<span class="stat">${grandTotalByType[pt.abbrev]} ${pt.abbrev}</span>`;}).join('')}
                            <span class="stat" style="background: rgba(255,255,255,0.3);">${grandTotalTruckSpots}${grandTotalLinked>0?'*':''} PLT</span>
                            <span class="stat">${grandTotalStores} stops</span>
                            <span class="stat">${routes.length} routes</span>
                          </div>
                        </div>
                        
                        <div class="instructions">
                          Take a screenshot to share via text message
                        </div>
                        
                        <div style="display: flex; gap: 8px; justify-content: center; margin-top: 10px;" class="action-buttons">
                          <button onclick="window.print()" style="background: #1a7f4b; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            Print
                          </button>
                          <button onclick="exportToExcel()" style="background: #217346; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            Export Excel
                          </button>
                        </div>
                        
                        <scr`+`ipt src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></scr`+`ipt>
                        <scr`+`ipt>
                          window.routeData = null;
                          window.palletTypesList = null;
                          window.dateStr = null;
                          
                          function exportToExcel() {
                            if (!window.XLSX) {
                              alert('Excel library still loading, please try again in a moment.');
                              return;
                            }
                            const wb = XLSX.utils.book_new();
                            const data = [];
                            
                            data.push(['Route Summary - ' + window.dateStr]);
                            data.push([]);
                            
                            window.routeData.forEach(function(route) {
                              data.push([route.name, 'Truck: ' + route.truck + (route.trailer ? ' | Trailer: ' + route.trailer : '')]);
                              
                              var headers = ['#', 'Store Code', 'Store Name'];
                              window.palletTypesList.forEach(function(pt) { headers.push(pt); });
                              headers.push('PLT');
                              data.push(headers);
                              
                              var totals = {};
                              window.palletTypesList.forEach(function(pt) { totals[pt] = 0; });
                              var totalPlt = 0;
                              
                              route.stores.forEach(function(store, idx) {
                                var row = [idx + 1, store.code, store.name];
                                window.palletTypesList.forEach(function(pt) {
                                  var cases = store.casesByType[pt] || [];
                                  row.push(cases.length > 0 ? cases.join(', ') : '-');
                                  totals[pt] += cases.length;
                                });
                                row.push(store.hasMerged ? store.truckSpots + '*' : store.truckSpots);
                                totalPlt += store.truckSpots;
                                data.push(row);
                              });
                              
                              var totalRow = ['', '', 'Total:'];
                              window.palletTypesList.forEach(function(pt) { totalRow.push(totals[pt] || '-'); });
                              totalRow.push(totalPlt);
                              data.push(totalRow);
                              data.push([]);
                            });
                            
                            var ws = XLSX.utils.aoa_to_sheet(data);
                            XLSX.utils.book_append_sheet(wb, ws, 'Routes');
                            XLSX.writeFile(wb, 'route-summary-' + new Date().toISOString().split('T')[0] + '.xlsx');
                          }
                        </scr`+`ipt>
                        
                        <style>
                          @media print {
                            .instructions, .action-buttons { display: none !important; }
                            body { background: white !important; padding: 0 !important; }
                            .container { max-width: 100% !important; }
                          }
                        </style>
                      </div>
                    </body>
                    </html>
                  `;const popup=window.open('','_blank','width=520,height=800');popup.document.write(imageHTML);popup.document.close();// Inject data for Excel export
const exportData=routes.map(route=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;const routeName=route.driver?route.driver+' #'+routeNum:'Route #'+(routes.indexOf(route)+1);return{name:routeName,truck:route.truck||'TBD',trailer:route.trailer||'',stores:route.stores.map(store=>{const dirStore=storesDirectory.find(ds=>String(ds.code||'').trim()===String(store.code||'').trim());const storeName=dirStore?.name||store.name||'';const types=store.palletTypes||[];const links=store.palletLinks||[];const casesByType={};let storePallets=0;let linkedCount=0;(store.pallets||[]).forEach((p,pIdx)=>{if(p&&typeof p==='number'&&p>0||p==='?'){storePallets++;if(links[pIdx])linkedCount++;const pType=types[pIdx]||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;if(!casesByType[normalized])casesByType[normalized]=[];casesByType[normalized].push(p==='?'?'PLT':p);}});return{code:store.code,name:storeName,casesByType,pallets:storePallets,truckSpots:storePallets-linkedCount,hasMerged:linkedCount>0};})};});popup.routeData=exportData;popup.palletTypesList=palletTypes.map(pt=>pt.abbrev);popup.dateStr=dateDisplay;},style:{background:'#007AFF',color:'white',border:'none',borderRadius:'4px',padding:'4px 10px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',fontWeight:500},title:"Route Summary"},"\uD83D\uDCCA Summary"),/*#__PURE__*/React.createElement("button",{onClick:()=>{// Generate Excel/CSV for the selected date
const dateObj=new Date(selectedDate+'T12:00:00');const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const dayName=dayNames[dateObj.getDay()];const dateDisplay=`${dayName} ${dateObj.getMonth()+1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;// Get all active pallet types across all routes
const allActiveTypes=new Set();routes.forEach(route=>{route.stores.forEach(store=>{const types=store.palletTypes||[];(store.pallets||[]).forEach((p,pIdx)=>{if(p&&typeof p==='number'&&p>0||p==='?'){const pType=types[pIdx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;allActiveTypes.add(normalized);}});});});const activeTypesList=palletTypes.filter(pt=>allActiveTypes.has(pt.abbrev));// Build CSV content
let csv='';routes.forEach((route,rIdx)=>{const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNum=driverRoutes.indexOf(route)+1;// Shorten driver name (first name + last initial)
const driverParts=(route.driver||'Route').split(' ');const shortName=driverParts.length>1?`${driverParts[0]} #${routeNum}`:`${route.driver||'Route'} #${routeNum}`;// Route header row
csv+=`"${shortName}",,${route.truck||''}\n`;// Column headers
let headerRow='#,Store Code,Store Name';activeTypesList.forEach(pt=>{headerRow+=','+pt.abbrev;});headerRow+=',TP,TC';csv+=headerRow+'\n';let routeTruckSpots=0;let routeCases=0;const routeByType={};activeTypesList.forEach(pt=>{routeByType[pt.abbrev]=0;});route.stores.forEach((store,sIdx)=>{const dirStore=storesDirectory.find(ds=>String(ds.code||'').trim()===String(store.code||'').trim());const storeName=(dirStore?.name||store.name||'').replace(/,/g,' ');const storeCode=String(store.code||'').replace(/,/g,' ');const types=store.palletTypes||[];const links=store.palletLinks||[];// Count pallets by type for this store
const storeByType={};activeTypesList.forEach(pt=>{storeByType[pt.abbrev]=0;});let storePallets=0;let linkedCount=0;let storeCases=0;(store.pallets||[]).forEach((p,pIdx)=>{if(p&&typeof p==='number'&&p>0||p==='?'){storePallets++;if(links[pIdx])linkedCount++;const pType=types[pIdx]||palletTypes[0]?.abbrev||'FZ';const normalized=pType==='F'?'FZ':pType==='D'?'DR':pType==='S'?'SP':pType;storeByType[normalized]=(storeByType[normalized]||0)+1;routeByType[normalized]=(routeByType[normalized]||0)+1;if(typeof p==='number')storeCases+=p;}});const truckSpots=storePallets-linkedCount;routeTruckSpots+=truckSpots;routeCases+=storeCases;// Build CSV row - store code as text to preserve leading zeros
let row=`${sIdx+1},"=""${storeCode}""","${storeName}"`;activeTypesList.forEach(pt=>{row+=','+(storeByType[pt.abbrev]||0);});row+=','+truckSpots+','+storeCases;csv+=row+'\n';});// Route total row
let totalRow=`TOTAL,${route.stores.length} stores,`;activeTypesList.forEach(pt=>{totalRow+=','+(routeByType[pt.abbrev]||0);});totalRow+=','+routeTruckSpots+','+routeCases;csv+=totalRow+'\n\n';});// Download CSV file
const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Route-Summary-${selectedDate}.csv`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);},style:{background:'#217346',color:'white',border:'none',borderRadius:'4px',padding:'4px 10px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',fontWeight:500},title:"Export to Excel"},"\uD83D\uDCE5 Excel"))),
    /*#__PURE__*/React.createElement("div",{style:{position:'sticky',top:'35px',zIndex:99,background:'white',padding:'4px 16px',borderBottom:'1px solid #e0e0e0'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:'3px',width:'100%',alignItems:'center'}},/*#__PURE__*/React.createElement("button",{onClick:()=>navigateWeek(-1),style:{padding:'2px 6px',border:'1px solid #cfd8dc',borderRadius:'3px',background:'#f8fbff',cursor:'pointer',fontSize:'11px',fontWeight:700,color:'#1565c0'}},"\u25C0"),getWeekDates(selectedDate).map(dateStr=>{// Use dateRouteCounts for count display (always available)
const routeCount=dateRouteCounts[dateStr]||0;// Use routesByDate for pallet calculations (only if loaded)
const dayRoutes=routesByDate[dateStr]||[];const isSelected=dateStr===selectedDate;const isTodayDate=isToday(dateStr);// Calculate total pallets and truck spots for this day (only if loaded)
let dayTotalPallets=0;let dayTruckSpots=0;dayRoutes.forEach(route=>{(route.stores||[]).forEach(store=>{const pallets=store.pallets||[];const links=store.palletLinks||[];pallets.forEach((p,idx)=>{if(p&&typeof p==='number'&&p>0||p==='?'){dayTotalPallets++;if(!links[idx])dayTruckSpots++;}});});});return/*#__PURE__*/React.createElement("button",{key:dateStr,onClick:()=>setSelectedDate(dateStr),style:{flex:1,padding:'3px 2px',border:isSelected?'2px solid #1976d2':'1px solid #ddd',borderRadius:'3px',background:isSelected?'#e3f2fd':'white',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'0px',fontSize:'10px',minWidth:'110px'}},/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:isSelected?'#1976d2':'#333'}},formatDateDisplay(dateStr).split(',')[0]," ",formatDayNumber(dateStr)),/*#__PURE__*/React.createElement("span",{style:{fontSize:'8px',color:routeCount>0?isSelected?'#1976d2':'#666':'#999'}},routeCount>0?`${routeCount}R - ${dayTruckSpots}/${dayTotalPallets} PLT`:'—'));}),/*#__PURE__*/React.createElement("button",{onClick:()=>navigateWeek(1),style:{padding:'2px 6px',border:'1px solid #cfd8dc',borderRadius:'3px',background:'#f8fbff',cursor:'pointer',fontSize:'11px',fontWeight:700,color:'#1565c0'}},"\u25B6"),/*#__PURE__*/React.createElement("div",{style:{marginLeft:'auto',display:'flex',gap:'3px',alignItems:'center'}},/*#__PURE__*/React.createElement("button",{onClick:()=>setSelectedDate(getTodayInTimezone()),style:{padding:'2px 6px',border:'1px solid #e65100',borderRadius:'3px',background:'#fff8e1',cursor:'pointer',fontSize:'9px',color:'#e65100',fontWeight:600}},"Today"),/*#__PURE__*/React.createElement("button",{onClick:()=>setSelectedDate(getTomorrowInTimezone()),style:{padding:'2px 6px',border:'1px solid #1a7f4b',borderRadius:'3px',background:'#e8f5e9',cursor:'pointer',fontSize:'9px',color:'#1a7f4b',fontWeight:600}},"Tmrw"),/*#__PURE__*/React.createElement("input",{type:"date",value:selectedDate,onChange:e=>setSelectedDate(e.target.value),style:{padding:'2px 4px',border:'1px solid #ddd',borderRadius:'3px',fontSize:'9px',width:'100px'}}),/*#__PURE__*/React.createElement("button",{onClick:()=>{if(routes.length>0){setInfoModal({type:'warning',title:'Cannot Copy Routes',message:'This day already has existing routes.',details:[{label:'Current Date',value:selectedDate},{label:'Existing Routes',value:routes.length+' route(s)',highlight:true}],note:'Delete existing routes first or select an empty day.'});return;}setCopyRoutesModal({sourceDate:'',keepDrivers:true,keepTrucks:true,clearPallets:true,replaceExisting:false});},disabled:routes.length>0,title:routes.length>0?'Delete existing routes first to copy from another day':'Copy routes from another day',style:{padding:'2px 6px',border:'1px solid #f57c00',borderRadius:'3px',fontSize:'9px',background:routes.length>0?'#f5f5f5':'#fff8e1',color:routes.length>0?'#999':'#e65100',fontWeight:600,cursor:routes.length>0?'not-allowed':'pointer'}},"\uD83D\uDCC5 Copy")))),
    /*#__PURE__*/React.createElement(React.Fragment,null,(()=>{const otherUsersOnSameDate=activeUsers.filter(u=>u.name!==userName&&u.currentDate===selectedDate);if(otherUsersOnSameDate.length===0)return null;return/*#__PURE__*/React.createElement("div",{style:{background:'linear-gradient(135deg, #ff5722 0%, #e64a19 100%)',color:'white',padding:'12px 20px',display:'flex',alignItems:'center',gap:'12px',fontWeight:'500',boxShadow:'0 2px 8px rgba(255,87,34,0.3)',animation:'pulse 2s infinite'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'20px'}},"\u26A0\uFE0F"),/*#__PURE__*/React.createElement("div",null,/*#__PURE__*/React.createElement("div",{style:{fontWeight:'600'}},"Concurrent Editing Warning"),/*#__PURE__*/React.createElement("div",{style:{fontSize:'13px',opacity:0.95}},otherUsersOnSameDate.length===1?`${otherUsersOnSameDate[0].name} is also editing this date. Changes may be overwritten!`:`${otherUsersOnSameDate.map(u=>u.name).join(', ')} are also editing this date. Changes may be overwritten!`)),/*#__PURE__*/React.createElement("div",{style:{marginLeft:'auto',fontSize:'12px',opacity:0.8}},"\uD83D\uDCA1 Tip: Coordinate with other users or wait until they're done"));})(),(()=>{// Check for truck conflicts (same truck, different drivers)
const truckConflicts=[];const truckUsage={};const seenTruckRouteIds=new Set();// Prevent duplicates
routes.forEach((route,index)=>{// Skip if we've already processed this route (deduplication)
if(seenTruckRouteIds.has(route.id))return;seenTruckRouteIds.add(route.id);if(route.truck&&route.driver){if(!truckUsage[route.truck]){truckUsage[route.truck]=[];}if(!truckUsage[route.truck].find(r=>r.driver===route.driver)){truckUsage[route.truck].push({driver:route.driver,routeName:route.name||`Route #${index+1}`,routeIndex:index+1});}}});Object.keys(truckUsage).forEach(truck=>{if(truckUsage[truck].length>1){truckConflicts.push({truck,drivers:truckUsage[truck]});}});// Check for trailer conflicts (same trailer, different routes)
const trailerConflicts=[];const trailerUsage={};const seenRouteIds=new Set();// Prevent duplicates
routes.forEach((route,index)=>{// Skip if we've already processed this route (deduplication)
if(seenRouteIds.has(route.id))return;seenRouteIds.add(route.id);if(route.trailer){if(!trailerUsage[route.trailer]){trailerUsage[route.trailer]=[];}trailerUsage[route.trailer].push({driver:route.driver||'Unassigned',routeName:route.name||`Route ${index+1}`,routeId:route.id,routeIndex:index+1});}});Object.keys(trailerUsage).forEach(trailer=>{if(trailerUsage[trailer].length>1){trailerConflicts.push({trailer,routes:trailerUsage[trailer]});}});const hasConflicts=truckConflicts.length>0||trailerConflicts.length>0;if(!hasConflicts)return null;return/*#__PURE__*/React.createElement("div",{style:{padding:'8px 16px 0'}},/*#__PURE__*/React.createElement("div",{style:{maxWidth:'1600px',margin:'0 auto'}},/*#__PURE__*/React.createElement("div",{style:{background:'linear-gradient(135deg, #fff3e0 0%, #ffecb3 100%)',border:'1px solid #ff9800',borderRadius:'8px',padding:'10px 14px',marginBottom:'0'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:'12px',marginBottom:truckConflicts.length+trailerConflicts.length>1?'12px':'0'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'24px'}},"\u26A0\uFE0F"),/*#__PURE__*/React.createElement("div",null,/*#__PURE__*/React.createElement("div",{style:{fontWeight:700,color:'#e65100',fontSize:'15px'}},"Equipment Conflict Detected!"),/*#__PURE__*/React.createElement("div",{style:{fontSize:'12px',color:'#bf360c'}},truckConflicts.length>0&&trailerConflicts.length>0?`${truckConflicts.length} truck and ${trailerConflicts.length} trailer conflict${trailerConflicts.length>1?'s':''}`:truckConflicts.length>0?`${truckConflicts.length} truck conflict${truckConflicts.length>1?'s':''}`:`${trailerConflicts.length} trailer conflict${trailerConflicts.length>1?'s':''}`))),truckConflicts.map((conflict,idx)=>/*#__PURE__*/React.createElement("div",{key:'truck-'+idx,style:{background:'white',borderRadius:'8px',padding:'10px 14px',marginTop:'10px',border:'1px solid #ffcc80'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\uD83D\uDE9B"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:'#e65100'}},"Truck ",conflict.truck),/*#__PURE__*/React.createElement("span",{style:{fontSize:'11px',color:'#888'}},"assigned to ",conflict.drivers.length," different drivers")),/*#__PURE__*/React.createElement("div",{style:{display:'flex',flexWrap:'wrap',gap:'8px'}},conflict.drivers.map((d,dIdx)=>/*#__PURE__*/React.createElement("span",{key:dIdx,style:{background:'#ffecb3',padding:'4px 10px',borderRadius:'4px',fontSize:'12px',color:'#bf360c',fontWeight:500}},"\uD83D\uDC64 ",d.driver," ",/*#__PURE__*/React.createElement("span",{style:{color:'#999'}},"(",d.routeName,")")))))),trailerConflicts.map((conflict,idx)=>/*#__PURE__*/React.createElement("div",{key:'trailer-'+idx,style:{background:'white',borderRadius:'8px',padding:'10px 14px',marginTop:'10px',border:'1px solid #ffcc80'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\uD83D\uDE9A"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:'#e65100'}},"Trailer ",conflict.trailer),/*#__PURE__*/React.createElement("span",{style:{fontSize:'11px',color:'#888'}},"assigned to ",conflict.routes.length," different routes")),/*#__PURE__*/React.createElement("div",{style:{display:'flex',flexWrap:'wrap',gap:'8px'}},conflict.routes.map((r,rIdx)=>/*#__PURE__*/React.createElement("span",{key:rIdx,style:{background:'#ffecb3',padding:'4px 10px',borderRadius:'4px',fontSize:'12px',color:'#bf360c',fontWeight:500}},"\uD83D\uDCE6 Route #",r.routeIndex," ",/*#__PURE__*/React.createElement("span",{style:{color:'#999'}},"(",r.driver,")")))))))));})(),/*#__PURE__*/React.createElement("div",{style:{padding:'10px 16px'}},/*#__PURE__*/React.createElement("div",{style:{maxWidth:'1600px',margin:'0 auto'}},routes.length===0&&/*#__PURE__*/React.createElement("div",{style:{background:'white',borderRadius:'8px',padding:'24px 16px',textAlign:'center',marginBottom:'10px',border:'2px dashed #e0e0e0'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:'48px',marginBottom:'12px'}},"\uD83D\uDCE6"),/*#__PURE__*/React.createElement("h3",{style:{margin:'0 0 8px 0',color:'#666'}},"No routes for ",formatDateDisplay(selectedDate)),/*#__PURE__*/React.createElement("p",{style:{margin:0,color:'#999',fontSize:'14px'}},"Add a new route below or copy from a previous date")),routes.map((route,index)=>{// Calculate route number for this driver
const driverRoutes=routes.filter(r=>r.driver===route.driver);const routeNumber=driverRoutes.indexOf(route)+1;return/*#__PURE__*/React.createElement(RouteCard,{key:route.id,route:route,routeNumber:routeNumber,routeIndex:index,expanded:expandedRoutes.includes(route.id),onToggle:()=>toggleRouteExpand(route.id),onUpdatePallet:updatePallet,onLogPalletChange:logPalletChange,onPalletFocus:handlePalletFocus,onUpdateStore:updateStore,onUpdateRoute:updateRoute,onAddStore:addStore,onRemoveStore:removeStore,onRemoveRoute:removeRoute,onCopyRoute:copyRoute,onMoveStore:moveStore,onMoveRoute:moveRoute,onSortStorePallets:sortStorePalletsByType,onGenerateBOL:generateBOL,onOpenRouteMap:data=>setRouteMapModal(data),setMoveStoreModal:setMoveStoreModal,setStoreSearchModal:setStoreSearchModal,setStoreChangeConfirmModal:setStoreChangeConfirmModal,onAddPalletColumn:()=>addPalletColumn(route.id),onRemovePalletColumn:()=>removePalletColumn(route.id),calculateTotal:calculateRouteTotal,trucksDirectory:trucksDirectory,tractorsDirectory:tractorsDirectory,trailersDirectory:trailersDirectory,driverColors:driverColors,storesDirectory:storesDirectory,sortedStoresDirectory:sortedStoresDirectory,driversDirectory:driversDirectory,palletTypesConfig:palletTypes.filter(pt=>!pt.inactive),canEdit:canEditCurrentDate,pcMilerSettings:pcMilerSettings,compactMode:compactMode,onToggleConfirmation:toggleRouteConfirmation,currentUserRole:currentUserRole});}),canEditCurrentDate?/*#__PURE__*/React.createElement("button",{onClick:addRoute,style:{width:'100%',padding:'12px',border:'2px dashed #ccc',borderRadius:'8px',background:'transparent',cursor:'pointer',fontSize:'13px',color:'#666',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',marginTop:'10px'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\u2295")," Add New Route"):/*#__PURE__*/React.createElement("div",{style:{width:'100%',padding:'12px',borderRadius:'8px',background:'#fff3e0',border:'1px solid #ffcc80',fontSize:'12px',color:'#e65100',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',marginTop:'10px'}},"\uD83D\uDD12 This date is locked. ",isAdmin?'':'Only admins can edit past/current routes.'))))
  );
}

export default window.React.memo(OverviewTab);
