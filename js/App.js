import OverviewTab from './tabs/OverviewTab.js';
import DriversTab from './tabs/DriversTab.js';
import StoresTab from './tabs/StoresTab.js';
import TrucksTab from './tabs/TrucksTab.js';
import AiLogisticsTab from './tabs/AiLogisticsTab.js';
import AccountsTab from './tabs/AccountsTab.js';
import ReportsTab from './tabs/ReportsTab.js';
import SettingsTab from './tabs/SettingsTab.js';
import {generateBOLDocument} from './modules/bol.js';
import StatCard from './components/StatCard.js';
import RouteCard from './components/RouteCard.js';
import StoreSearchModal from './components/StoreSearchModal.js';
import AppModals from './components/AppModals.js';
import AppModalsSecondary from './components/AppModalsSecondary.js';
import AppModalsTertiary from './components/AppModalsTertiary.js';
import {initialRoutes,MAX_PALLETS,MIN_PALLETS,defaultDriverColors,initialStoresDirectory,initialDriversDirectory,initialTrucksDirectory,truckZones,truckMakes,truckStatuses,trailerMakes,trailerTypes,states,trailerSizes,licenseTypes,driverStatuses,rolePermissions,initialPalletTypes} from './modules/constants.js';
import AuthScreen from './modules/auth/AuthScreen.js';
import PasswordResetScreen from './modules/auth/PasswordResetScreen.js';
import {initializeAuthSession} from './modules/auth/session.js';
import {buildActiveUsersFromState as buildActiveUsersFromPresence} from './modules/sync/activeUsers.js';
import {mapRouteRecordToClientRoute} from './modules/sync/routeMapper.js';
import {setupRouteBroadcastSync} from './modules/sync/broadcastSync.js';
import {setupDateRoutesSync} from './modules/sync/dateRoutesSync.js';
import {setupPresenceTracking,syncPresenceDate} from './modules/sync/presenceSync.js';
import {setupOnlineOfflineSync} from './modules/sync/networkSync.js';
import {saveLocalBackupToStorage,restoreFromLocalBackup,exportBackupJson,saveToSupabasePipeline,retryQueuedSavesOnReconnect,setupDebouncedSave} from './modules/sync/persistenceSync.js';
import {createRouteCrudHandlers} from './modules/routes/routeCrud.js';
import {createRouteStoreOpsHandlers} from './modules/routes/routeStoreOps.js';
import {createRouteMutationsHandlers} from './modules/routes/routeMutations.js';
import {createCopyRoutesFromDateHandler} from './modules/routes/copyRoutes.js';
import {createPalletOpsHandlers} from './modules/routes/palletOps.js';
import {buildDriverColors,calculateTotalsFromRoutes,getDriverStatsFromRoutes,calculateRouteTotalFromStores} from './modules/routes/metrics.js';
import {createStoreDirectoryHandlers} from './modules/stores/storeDirectory.js';
import {createDriverDirectoryHandlers} from './modules/drivers/driverDirectory.js';
import {sendDriverExpirationAlertEmail} from './modules/drivers/driverAlerts.js';
import {createEquipmentDirectoryHandlers} from './modules/trucks/equipmentDirectory.js';
import {setupBootstrapData} from './modules/data/bootstrapData.js';
import {logActivityEntry} from './modules/activity/activityLog.js';
import {getTodayInTimezoneValue,getTomorrowInTimezoneValue,isFutureDateInTimezone} from './modules/time/dateUtils.js';
import {findCurrentUserData,buildEffectivePermissions,canAccessTabByPermissions,canEditTabByPermissions,canPerformActionByPermissions} from './modules/security/permissions.js';
import {getWeekDatesForDate,formatDateDisplayValue,formatDayNameShort,formatDayNumberValue,formatPhoneNumberValue,formatCurrencyValue,escapeHtmlValue,isDateTodayInTimezone,getNavigatedWeekDate} from './modules/utils/formatters.js';
import {parseCsvText} from './modules/utils/csv.js';
import {createStoresTabProps,createDriversTabProps,createTrucksTabProps,createOverviewTabProps,createReportsTabProps,createSettingsTabProps,createAiLogisticsTabProps,createAccountsTabProps,useDriversTab,useTrucksTab,useReportsTab,useSettingsTab,useAppModals,useAiLogisticsTab,useAccountsInvoices} from './tabs/logic/index.js';
import {getSyncStatusDisplayValue} from './modules/sync/syncStatus.js';
import {useSyncDebug} from './modules/sync/useSyncDebug.js';
import {APP_VERSION, APP_BUILD_DATE} from './generated/buildInfo.js';

// ╔╗
// ║  SECTION 1: CONFIGURATION & SETUP                                             ║
// ║  Supabase client initialization and global constants                          ║
// ╚
const{useState,useCallback,useEffect,useRef,useMemo}=React;// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL='https://pnienewghjsxrumcenfp.supabase.co';const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuaWVuZXdnaGpzeHJ1bWNlbmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNTkwNTEsImV4cCI6MjA3OTgzNTA1MX0.LBLTDLgVvW85ogQYSFyShEkKtg8_HenWzyLFvLq3ru8';const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);// Global handler for auth token errors - redirect to login gracefully
if(window.__authUnhandledRejectionHandler){window.removeEventListener('unhandledrejection',window.__authUnhandledRejectionHandler);}window.__authUnhandledRejectionHandler=event=>{const error=event.reason;const message=error?.message||String(error||'');// Browser extensions can throw this noisy async runtime error in page context.
if(message.includes('A listener indicated an asynchronous response by returning true')&&message.includes('message channel closed before a response was received')){event.preventDefault();return;}if(error?.name==='AuthApiError'||error?.message?.includes('Refresh Token')){console.warn(' Session expired, please log in again');event.preventDefault();// Suppress ugly console error
// Force sign out to clear stale tokens
supabase.auth.signOut().catch(()=>{});}};window.addEventListener('unhandledrejection',window.__authUnhandledRejectionHandler);// ─────────────────────────────────────────────────────────────────────────────
// APP VERSION - Update this when deploying new versions
// ─────────────────────────────────────────────────────────────────────────────
const IS_BETA_BUILD=true;const STARTUP_CACHE_KEY='logistics_cache';window.APP_VERSION=APP_VERSION;window.APP_BUILD_DATE=APP_BUILD_DATE;window.APP_IS_BETA=IS_BETA_BUILD;const sanitizeStartupCachePayload=data=>{if(!data||typeof data!=='object')return data;const sanitized={...data};delete sanitized.savedInvoices;return sanitized;};const readStartupCache=()=>{const parseCacheValue=rawValue=>{if(!rawValue)return null;const data=JSON.parse(rawValue);if(data.timestamp&&Date.now()-data.timestamp<3600000){return data;}return null;};try{const sessionCached=sessionStorage.getItem(STARTUP_CACHE_KEY);const sessionData=parseCacheValue(sessionCached);if(sessionData)return sessionData;}catch(e){console.warn('Startup cache read error (session):',e);}try{const localCached=localStorage.getItem(STARTUP_CACHE_KEY);const localData=parseCacheValue(localCached);if(localData)return localData;}catch(e){console.warn('Startup cache read error (local):',e);}return null;};const deferredCacheWrite=(key,data)=>{const doWrite=()=>{const value=typeof data==='string'?data:JSON.stringify(key===STARTUP_CACHE_KEY?sanitizeStartupCachePayload(data):data);if(key===STARTUP_CACHE_KEY){try{sessionStorage.setItem(key,value);try{localStorage.removeItem(key);}catch(_){ }return;}catch(e){console.warn('Startup cache skipped:',e?.name||e);return;}}try{localStorage.setItem(key,value);}catch(e){console.warn('Cache write error:',e);}};if('requestIdleCallback' in window){requestIdleCallback(doWrite,{timeout:2000});}else{setTimeout(doWrite,0);}};// ─────────────────────────────────────────────────────────────────────────────
// SENTRY ERROR MONITORING - Added v1.997
// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Sentry DSN configured for Elite Cold Storage
// https://sentry.io → Settings → Projects → [Your Project] → Client Keys
const SENTRY_DSN='https://24c836424db8cc061f59521932ff4d3d@o4510568624750592.ingest.us.sentry.io/4510568632549376';// Sentry init function - called after async script loads
window.initSentry=function(){if(typeof Sentry!=='undefined'&&SENTRY_DSN!=='YOUR_DSN_HERE'){Sentry.init({dsn:SENTRY_DSN,release:'logistics-dashboard@'+APP_VERSION,environment:window.location.hostname==='localhost'?'development':'production',// Capture 100% of errors (recommended for small apps)
tracesSampleRate:1.0,// Filter out common non-actionable errors
ignoreErrors:['ResizeObserver loop limit exceeded','ResizeObserver loop completed with undelivered notifications','Network request failed','Load failed','Failed to fetch','A listener indicated an asynchronous response by returning true'],// Scrub sensitive data before sending
beforeBreadcrumb(breadcrumb){// Remove route/store/driver data from breadcrumbs
if(breadcrumb.data){delete breadcrumb.data.stores;delete breadcrumb.data.drivers;delete breadcrumb.data.routes;delete breadcrumb.data.addresses;}return breadcrumb;},// Add context and scrub before sending
beforeSend(event,hint){// Don't send errors in development
if(window.location.hostname==='localhost'){console.log('Sentry would capture:',event);return null;}// Add session info as tags
event.tags=event.tags||{};event.tags.session_id=window.PRESENCE_SESSION_ID||'unknown';event.tags.build_date=window.APP_BUILD_DATE||'unknown';// Scrub sensitive data from extra context
if(event.extra){delete event.extra.stores;delete event.extra.drivers;delete event.extra.routes;delete event.extra.storesDirectory;delete event.extra.driversDirectory;delete event.extra.addresses;}// Scrub from breadcrumbs message text (store codes, names)
if(event.breadcrumbs){event.breadcrumbs=event.breadcrumbs.map(b=>{if(b.message){b.message=b.message.replace(/store[:\s]+\w+/gi,'store:[REDACTED]').replace(/driver[:\s]+\w+/gi,'driver:[REDACTED]');}return b;});}return event;}});console.log('✅ Sentry error monitoring initialized (v'+APP_VERSION+')');// Update page title with version
document.title='Logistics Dashboard v'+APP_VERSION;}else if(SENTRY_DSN==='YOUR_DSN_HERE'){console.log('⚠ Sentry not configured - replace YOUR_DSN_HERE with your DSN');}};// Try to init immediately if Sentry already loaded
if(typeof Sentry!=='undefined'){window.initSentry();}// ============================================
// SECURE ROUTING API CLIENT
// ============================================
// API keys are stored server-side in Supabase Secrets
// This client calls the Edge Function which proxies routing requests
const SecureRoutingAPI={endpoint:SUPABASE_URL+'/functions/v1/secure-routing',async request(body){try{// Get current session for secure Edge Function call
const{data:{session}}=await supabase.auth.getSession();if(!session){throw new Error('Not authenticated. Please log in to use routing features.');}const response=await fetch(this.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify(body)});const data=await response.json();if(!data.success){throw new Error(data.error||'Routing API error');}return data.data;}catch(error){console.error('SecureRoutingAPI error:',error);throw error;}},async testConnection(provider=null){return await this.request({action:'test',provider:provider});},async geocode(address){return await this.request({action:'geocode',address:address});},async calculateRoute(origin,destinations,options={}){return await this.request({action:'route',origin:origin,destinations:destinations,options:options});},async calculateRouteByCoords(waypoints,options={}){return await this.request({action:'route',waypoints:waypoints,options:options});}};// EMPTY initial routes - real data loads from Supabase
// Static app constants moved to modules/constants.js
// ╔╗
// ╔╗
// ║  SECTION 2: MAIN COMPONENT - LogisticsDashboard                               ║
// ║  All state declarations, hooks, and the main dashboard component              ║
// ╚
// ╚
function LogisticsDashboard({user}){// ─────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS (component level for accessibility from JSX)
// ─────────────────────────────────────────────────────────────────────────
// Helper to parse presence state into active users list
// - Groups by user_id (unique) with fallback to user_name
// - Prunes stale sessions older than 90 seconds
const buildActiveUsersFromState=buildActiveUsersFromPresence;const ensureSelfPresenceUser=({users,user,userName,session,currentDate})=>{const nextUsers=Array.isArray(users)?[...users]:[];const hasSelf=nextUsers.some(entry=>{if(user?.id!=null&&entry?.userId!=null&&String(entry.userId)===String(user.id))return true;return entry?.name===userName;});if(hasSelf)return nextUsers;nextUsers.unshift({userId:user?.id||null,name:userName||'You',session:session||'self',joinedAt:new Date().toISOString(),currentDate:currentDate||null,sessionCount:1,isFallback:true});return nextUsers;};
// ─────────────────────────────────────────────────────────────────────────
// STATE DECLARATIONS
// ─────────────────────────────────────────────────────────────────────────
// Get timezone from localStorage for initial date calculation
const savedTimezone=localStorage.getItem('logisticsTimezone')||'America/New_York';// Calendar state - initialize with tomorrow in the correct timezone
const[selectedDate,setSelectedDateState]=useState(()=>{const now=new Date();// Get today's date in the correct timezone (YYYY-MM-DD format)
const todayStr=now.toLocaleDateString('en-CA',{timeZone:savedTimezone});// Parse and add one day for tomorrow
const tomorrow=new Date(todayStr+'T12:00:00');tomorrow.setDate(tomorrow.getDate()+1);// Return in YYYY-MM-DD format (en-CA locale)
return tomorrow.toLocaleDateString('en-CA');});// Store selectedDate in a ref so setRoutes always has the current value
const selectedDateRef=useRef(selectedDate);selectedDateRef.current=selectedDate;// Refs for save-on-navigate feature
const pendingSaveDataRef=useRef(null);// SAFE DATE CHANGE: Flush pending saves before changing dates
// Load routes for a specific date from database
const loadDateRoutes=useCallback(async date=>{try{console.log('📅 Loading routes for date:',date);setSyncStatus('syncing');const{data:routesData,error:routesError}=await supabase.from('logistics_routes').select('*').eq('route_date',date).order('route_order',{ascending:true});if(routesError){console.error('Routes load error:',routesError);setSyncStatus('error');return;}enterServerUpdate();try{const loadedRoutes=routesData?routesData.map(mapRouteRecordToClientRoute):[];setRoutesByDate(prev=>({...prev,[date]:loadedRoutes}));setDateRouteCounts(prev=>({...prev,[date]:loadedRoutes.length}));console.log(`📊 Loaded ${loadedRoutes.length} routes for ${date}`);}finally{setTimeout(()=>exitServerUpdate(),300);}setSyncStatus('synced');}catch(error){console.error('Error loading date routes:',error);setSyncStatus('error');}},[]);const setSelectedDate=useCallback(newDate=>{// If there's a pending save timer, clear it and save immediately
if(saveTimeoutRef.current&&pendingSaveDataRef.current){console.log('📅 Date change: Flushing pending save before navigation');clearTimeout(saveTimeoutRef.current);saveTimeoutRef.current=null;// The pendingSaveDataRef will contain the function to call
if(pendingSaveDataRef.current){pendingSaveDataRef.current();pendingSaveDataRef.current=null;}}// Load routes for the new date from database
loadDateRoutes(newDate);setSelectedDateState(newDate);},[loadDateRoutes]);const weekLoadRequestRef=useRef(0);useEffect(()=>{let cancelled=false;const requestId=++weekLoadRequestRef.current;const anchorDate=new Date(selectedDate+'T12:00:00');if(Number.isNaN(anchorDate.getTime()))return()=>{cancelled=true;};const weekStart=new Date(anchorDate);weekStart.setDate(anchorDate.getDate()-anchorDate.getDay());const weekDates=[];for(let i=0;i<7;i++){const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);weekDates.push(d.toLocaleDateString('en-CA'));}const startDateStr=weekDates[0];const endDateStr=weekDates[6];(async()=>{try{const{data,error}=await supabase.from('logistics_routes').select('*').gte('route_date',startDateStr).lte('route_date',endDateStr).order('route_date',{ascending:true}).order('route_order',{ascending:true});if(error)throw error;if(cancelled||requestId!==weekLoadRequestRef.current)return;const weekRoutesByDate={};const weekCounts={};weekDates.forEach(date=>{weekRoutesByDate[date]=[];weekCounts[date]=0;});(data||[]).forEach(row=>{const routeDate=row.route_date;if(!weekRoutesByDate[routeDate])return;weekCounts[routeDate]++;weekRoutesByDate[routeDate].push(mapRouteRecordToClientRoute(row));});enterServerUpdate();try{setRoutesByDate(prev=>({...prev,...weekRoutesByDate}));setDateRouteCounts(prev=>({...prev,...weekCounts}));}finally{setTimeout(()=>exitServerUpdate(),300);}}catch(error){console.warn('Week routes prefetch failed:',error);}})();return()=>{cancelled=true;};},[selectedDate]);// PERFORMANCE: Load cached data from localStorage for instant startup
// PERFORMANCE: Load cached data from localStorage for instant startup (only once)
const[cachedData]=useState(()=>readStartupCache());// Routes stored by date - use cache for instant display
const[routesByDate,setRoutesByDate]=useState(cachedData?.routesByDate||{});const[dateRouteCounts,setDateRouteCounts]=useState({});// Lightweight counts for date tabs
// Get routes for selected date (or empty array if none)
const routes=routesByDate[selectedDate]||[];// Set routes for selected date - uses ref to always get current selectedDate
const setRoutes=useCallback(newRoutesOrUpdater=>{// Only mark pending changes if this is a LOCAL edit, not a server update
if(!isFromServer.current){hasPendingChanges.current=true;lastInteractionTime.current=Date.now();console.log('setRoutes called (local edit) - hasPendingChanges set to true');}else{console.log('setRoutes called (from server) - hasPendingChanges NOT set');}setRoutesByDate(prev=>{const currentDate=selectedDateRef.current;const currentRoutes=prev[currentDate]||[];const newRoutes=typeof newRoutesOrUpdater==='function'?newRoutesOrUpdater(currentRoutes):newRoutesOrUpdater;return{...prev,[currentDate]:newRoutes};});},[]);const[storesDirectory,setStoresDirectory]=useState(cachedData?.storesDirectory||[]);const[driversDirectory,setDriversDirectory]=useState(cachedData?.driversDirectory||[]);const[trucksDirectory,setTrucksDirectory]=useState(cachedData?.trucksDirectory||[]);const[trailersDirectory,setTrailersDirectory]=useState(cachedData?.trailersDirectory||[]);const[tractorsDirectory,setTractorsDirectory]=useState(cachedData?.tractorsDirectory||[]);const[palletTypes,setPalletTypes]=useState(cachedData?.palletTypes||[]);const{truckSubTab,setTruckSubTab,equipmentType,setEquipmentType}=useTrucksTab({React});const{aiLogisticsSubTab,setAiLogisticsSubTab}=useAiLogisticsTab({React});const{driversSubTab,setDriversSubTab,driverStatusFilter,setDriverStatusFilter,driverSortField,setDriverSortField,driverSortDirection,setDriverSortDirection,driverPrintModal,setDriverPrintModal,driverPrintStatus,setDriverPrintStatus,driverPrintSortField,setDriverPrintSortField,driverPrintSortDirection,setDriverPrintSortDirection,driverPrintFields,setDriverPrintFields}=useDriversTab({React});const{settingsSubTab,setSettingsSubTab,manifestFormat,setManifestFormat,pcMilerSettings,setPcMilerSettings,bolSettings,setBolSettings,userSearch,setUserSearch,userSort,setUserSort,userDeleteModal,setUserDeleteModal,activityLog,setActivityLog,activityLogFilter,setActivityLogFilter,activityLogLoading,setActivityLogLoading,loadActivityLog}=useSettingsTab({React,supabase});const[compactMode,setCompactMode]=useState(()=>{const saved=localStorage.getItem('pbnewmans_compactMode');return saved||'normal';});const compact=compactMode!=='normal';const{reportsSubTab,setReportsSubTab,reportDateRange,setReportDateRange}=useReportsTab({React});const{accountsSubTab,setAccountsSubTab,storeRatesSearch,setStoreRatesSearch,invoiceDateRange,setInvoiceDateRange,invoiceManualItems,setInvoiceManualItems,invoiceNumber,setInvoiceNumber,showInvoicePreview,setShowInvoicePreview,invoiceViewMode,setInvoiceViewMode,savedInvoices,setSavedInvoices,editingInvoiceId,setEditingInvoiceId,editingInvoiceUpdatedAt,setEditingInvoiceUpdatedAt,invoiceRateOverrides,setInvoiceRateOverrides,invoiceRoutes,setInvoiceRoutes,invoiceRoutesLoading,setInvoiceRoutesLoading,calculateInvoiceData}=useAccountsInvoices({React,cachedData,supabase,storesDirectory});const[activeTab,setActiveTab]=useState('Overview');const[expandedRoutes,setExpandedRoutes]=useState(initialRoutes.map(r=>r.id));const[syncStatus,setSyncStatus]=useState('connecting');const{syncDebugEnabled,setSyncDebugEnabled,syncHealth,connectionState,allCriticalSubscribed,registerChannelStatus,registerChannelReconnect,syncEvents,pushSyncEvent,copySyncLogs}=useSyncDebug({React});// Store search and sort
// Auto-expand all routes when selected date changes
useEffect(()=>{const currentRoutes=routesByDate[selectedDate]||[];setExpandedRoutes(currentRoutes.map(r=>r.id));},[selectedDate,routesByDate]);const[lastUpdated,setLastUpdated]=useState(null);const[userName,setUserName]=useState(()=>user?.user_metadata?.full_name||user?.email?.split('@')[0]||'');const userNameRef=useRef(userName);// Ref for use in subscription closure
userNameRef.current=userName;// Keep ref in sync with state
const userRef=useRef(user);// Ref for stable logout callback
userRef.current=user;// Keep ref in sync with auth state
const{showNameModal,setShowNameModal,showUserMenu,setShowUserMenu,showDisplayModeMenu,setShowDisplayModeMenu,showAccountsMenu,setShowAccountsMenu,moveStoreModal,setMoveStoreModal,storeSearchModal,setStoreSearchModal,storeSearchQuery,setStoreSearchQuery,storeSearchIndex,setStoreSearchIndex,permissionsModal,setPermissionsModal,deleteConfirmModal,setDeleteConfirmModal,showLogoutModal,setShowLogoutModal,storeChangeConfirmModal,setStoreChangeConfirmModal,infoModal,setInfoModal,driverViewModal,setDriverViewModal,routeMapModal,setRouteMapModal,expirationAlertsModal,setExpirationAlertsModal,showOnlineUsers,setShowOnlineUsers,copyRoutesModal,setCopyRoutesModal,versionMismatch,setVersionMismatch}=useAppModals({React});// Undo system - 5 levels
const[undoStack,setUndoStack]=useState([]);const[undoToast,setUndoToast]=useState(null);// { message, remaining }
const MAX_UNDO_LEVELS=5;// Push to undo stack (call before making changes)
const pushUndo=useCallback((description,routeId,previousRoutes)=>{setUndoStack(prev=>{const newStack=[...prev,{description,routeId,routeDate:selectedDateRef.current,previousRoutes:JSON.parse(JSON.stringify(previousRoutes)),// Deep clone
timestamp:Date.now()}];// Keep only last 5
return newStack.slice(-MAX_UNDO_LEVELS);});},[]);// Undo last change
const undoLastChange=useCallback(()=>{setUndoStack(prev=>{if(prev.length===0)return prev;const lastUndo=prev[prev.length-1];const newStack=prev.slice(0,-1);// Restore the previous routes - mark as user change so it saves
hasPendingChanges.current=true;setRoutesByDate(prevRoutes=>({...prevRoutes,[lastUndo.routeDate]:lastUndo.previousRoutes}));// Show toast
setUndoToast({message:`Undid: ${lastUndo.description}`,remaining:newStack.length});setTimeout(()=>setUndoToast(null),3000);console.log('↩ Undo:',lastUndo.description,`(${newStack.length} remaining)`);return newStack;});},[]);// Ctrl+Z keyboard handler
useEffect(()=>{const handleKeyDown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){// Don't undo if in an input field (except our route inputs)
const activeEl=document.activeElement;const tagName=activeEl?.tagName?.toLowerCase();if(tagName==='textarea')return;if(tagName==='input'&&activeEl.type!=='text'&&activeEl.type!=='number')return;e.preventDefault();undoLastChange();}};window.addEventListener('keydown',handleKeyDown);return()=>window.removeEventListener('keydown',handleKeyDown);},[undoLastChange]);
// Version check helper - compares version strings (e.g., "26.42" > "26.41")
const isNewerVersion=(serverVersion,localVersion)=>{if(!serverVersion||!localVersion)return false;const serverParts=serverVersion.split('.').map(Number);const localParts=localVersion.split('.').map(Number);for(let i=0;i<Math.max(serverParts.length,localParts.length);i++){const server=serverParts[i]||0;const local=localParts[i]||0;if(server>local)return true;if(server<local)return false;}return false;};// Set Sentry user context for error tracking (Added v1.997)
useEffect(()=>{if(typeof Sentry!=='undefined'&&user&&userName){Sentry.setUser({id:user.id,email:user.email,username:userName});}},[user,userName]);const[expirationAlertDays,setExpirationAlertDays]=useState(()=>{const saved=localStorage.getItem('expirationAlertDays');return saved?parseInt(saved):30;});const[selectedAlertRecipients,setSelectedAlertRecipients]=useState([]);const[activeUsers,setActiveUsers]=useState([]);const[presenceConnected,setPresenceConnected]=useState(false);const presenceConnectedRef=useRef(false);// Ref for use in timers/callbacks
const[isOnline,setIsOnline]=useState(navigator.onLine);const[needsReload,setNeedsReload]=useState(false);const[syncReconnectEscalated,setSyncReconnectEscalated]=useState(false);const offlineTimestamp=useRef(null);const wasOnlineRef=useRef(navigator.onLine);const shouldReplayQueuedSaveRef=useRef(false);const reconnectReplayInFlightRef=useRef(false);// Inactivity timeout (1 hour) - using refs to avoid re-binding listeners
const lastActivityRef=useRef(Date.now());const[showInactivityWarning,setShowInactivityWarning]=useState(false);const showInactivityWarningRef=useRef(false);const INACTIVITY_TIMEOUT=60*60*1000;// 1 hour in ms
const INACTIVITY_WARNING=55*60*1000;// 55 minutes in ms
// Data protection - track last successful save
const[lastSuccessfulSave,setLastSuccessfulSave]=useState(null);const[showDataProtectionPanel,setShowDataProtectionPanel]=useState(false);const[timezone,setTimezone]=useState(()=>{const saved=localStorage.getItem('logisticsTimezone');return saved||'America/New_York';});// Save BOL settings when changed
useEffect(()=>{localStorage.setItem('bolSettings',JSON.stringify(bolSettings));},[bolSettings]);// Save manifest format when changed
useEffect(()=>{localStorage.setItem('pbnewmans_manifestFormat',manifestFormat);},[manifestFormat]);const[usersDirectory,setUsersDirectory]=useState([]);const[usersLoading,setUsersLoading]=useState(true);const saveTimeoutRef=useRef(null);const isInitialLoad=useRef(true);const serverUpdateDepth=useRef(0);// Counter for nested server updates (prevents race conditions)
// Read-only check if we're receiving server data (use enter/exitServerUpdate to modify)
const isFromServer={get current(){return serverUpdateDepth.current>0;}};const enterServerUpdate=()=>{serverUpdateDepth.current++;};const exitServerUpdate=()=>{serverUpdateDepth.current=Math.max(0,serverUpdateDepth.current-1);};const lastSavedData=useRef(null);const lastSavedConfig=useRef(null);// Track last saved config to avoid unnecessary writes
const hasPendingChanges=useRef(false);// Track if we have unsaved local changes
const configDirtyRef=useRef(false);// Track if config (directories, settings) changed
const editedStores=useRef(new Set());// Track specific store IDs being edited
const lastEditTime=useRef({});// Track last edit time per store
const lastInteractionTime=useRef(0);// Track last user interaction timestamp
const presenceChannelRef=useRef(null);const isLoggingOutRef=useRef(false);// Prevent presence retry during logout
const hasTrackedOnceRef=useRef(false);// Only show connected after first successful track
const lastAppliedRealtimeAtByDateRef=useRef({});const lastRowRealtimeAtByDateRef=useRef({});const recentLocalSaveByDateRouteRef=useRef({});// Realtime dedupe/coalescing + self-echo suppression state per date
// NEW: Dirty field tracking for Excel-like merging
// Structure: { routeId: Set('driver', 'truck', 'stores', ...) }
const dirtyFieldsByRoute=useRef({});const dirtyFieldUpdatedAtByRouteRef=useRef({});const dirtyFieldAckAtByRouteRef=useRef({});// Helper: Mark a field as dirty for a route
const markFieldDirty=useCallback((routeId,fieldName)=>{const routeKey=String(routeId);if(!dirtyFieldsByRoute.current[routeKey]){dirtyFieldsByRoute.current[routeKey]=new Set();}dirtyFieldsByRoute.current[routeKey].add(fieldName);const fieldTimestamps={...(dirtyFieldUpdatedAtByRouteRef.current[routeKey]||{})};fieldTimestamps[fieldName]=Date.now();dirtyFieldUpdatedAtByRouteRef.current[routeKey]=fieldTimestamps;hasPendingChanges.current=true;console.log(` Dirty: ${routeId} -> ${fieldName}`,Array.from(dirtyFieldsByRoute.current[routeKey]));},[]);const acknowledgeDirtyFieldsSaved=useCallback((routeId,acknowledgedAt=Date.now())=>{if(!routeId)return;dirtyFieldAckAtByRouteRef.current[String(routeId)]=acknowledgedAt;},[]);// Helper: Clear dirty fields for a route (after save)
const clearDirtyFields=useCallback(routeId=>{if(routeId){const routeKey=String(routeId);delete dirtyFieldsByRoute.current[routeKey];delete dirtyFieldUpdatedAtByRouteRef.current[routeKey];}else{// Clear all
dirtyFieldsByRoute.current={};dirtyFieldUpdatedAtByRouteRef.current={};dirtyFieldAckAtByRouteRef.current={};}},[]);// Helper: Merge server route with local dirty fields (Excel-like)
const mergeServerRouteIntoLocal=useCallback((localRoute,serverRoute,dirtyFieldsSet)=>{if(!dirtyFieldsSet||dirtyFieldsSet.size===0)return serverRoute;const merged={...serverRoute};for(const field of dirtyFieldsSet){merged[field]=localRoute[field];}console.log(`🔀 Merged route ${localRoute.id}: kept local fields:`,Array.from(dirtyFieldsSet));return merged;},[]);// Helper to get current date in selected timezone
const getTodayInTimezone=useCallback(()=>getTodayInTimezoneValue(timezone),[timezone]);const getTomorrowInTimezone=useCallback(()=>getTomorrowInTimezoneValue(timezone),[timezone]);// Save timezone when it changes
useEffect(()=>{localStorage.setItem('logisticsTimezone',timezone);},[timezone]);// Get current user's role and custom permissions from usersDirectory
const currentUserData=useMemo(()=>findCurrentUserData({user,usersDirectory}),[user,usersDirectory]);const currentUserRole=currentUserData?.role||'Viewer';// Get effective permissions (role defaults + custom overrides)
const userPermissions=useMemo(()=>buildEffectivePermissions({rolePermissions,currentUserRole,currentUserData}),[currentUserRole,currentUserData]);const isAdmin=currentUserRole==='Admin';// Permission helper functions
const canAccessTab=useCallback(tabName=>canAccessTabByPermissions(userPermissions,tabName),[userPermissions]);const canEditTab=useCallback(tabName=>canEditTabByPermissions(userPermissions,tabName),[userPermissions]);const canPerformAction=useCallback(actionName=>canPerformActionByPermissions(userPermissions,actionName),[userPermissions]);// Check if user can edit routes for a specific date
const canEditDate=useCallback(dateStr=>{if(canPerformAction('editPastRoutes'))return true;return isFutureDateInTimezone(dateStr,timezone);},[canPerformAction,timezone]);// Check if current selected date is editable (also check tab permission)
const canEditCurrentDate=canEditDate(selectedDate)&&canEditTab('Overview');// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 3: UTILITY FUNCTIONS                                               ║
// ║  Date formatting, phone formatting, helper functions                        ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
// Calendar helper functions
const getWeekDates=dateStr=>getWeekDatesForDate(dateStr);// Handle logout - used by both logout button and inactivity timeout
const handleLogout=useCallback(async()=>{const wasLoggingOut=isLoggingOutRef.current;isLoggingOutRef.current=true;// Guard re-entry immediately before any async work
if(wasLoggingOut){console.log('Logout already in progress...');return;}
try{// Log logout activity before signing out (use ref for userName)
const currentUser=userRef.current;const currentUserName=userNameRef.current;if(currentUser){await supabase.from('activity_log').insert({user_id:currentUser.id,user_name:currentUserName||currentUser.email,action_type:'logout',entity_type:'session',entity_id:currentUser.id,entity_name:'User Session',field_changed:null,old_value:null,new_value:'Logged out',route_date:null});}// Clean up presence before signing out
if(presenceChannelRef.current){try{console.log('👋 Untracking presence on logout...');
await presenceChannelRef.current.untrack();supabase.removeChannel(presenceChannelRef.current);presenceChannelRef.current=null;setPresenceConnected(false);presenceConnectedRef.current=false;console.log('✅ Presence cleaned up on logout');}catch(presenceErr){console.warn('Presence cleanup error (non-critical):',presenceErr);}}// Clean up routes subscription
if(routesSubscriptionRef.current){try{supabase.removeChannel(routesSubscriptionRef.current);routesSubscriptionRef.current=null;console.log('✅ Routes subscription cleaned up');}catch(e){console.warn('Routes cleanup error:',e);}}// Clean up broadcast channels
if(deleteChannelRef.current){try{supabase.removeChannel(deleteChannelRef.current);deleteChannelRef.current=null;}catch(e){}}if(updateChannelRef.current){try{supabase.removeChannel(updateChannelRef.current);updateChannelRef.current=null;}catch(e){}}// CRITICAL: Clear auth token BEFORE signOut to prevent rehydration
const clearAuthStorage=()=>{try{localStorage.removeItem('sb-pnienewghjsxrumcenfp-auth-token');localStorage.removeItem('supabase.auth.token');Object.keys(localStorage).forEach(key=>{if(key.startsWith('sb-')||key.includes('supabase'))localStorage.removeItem(key);});}catch(e){}};clearAuthStorage();// Clear BEFORE signOut
const{error}=await supabase.auth.signOut({scope:'global'});if(error){console.error('SignOut returned error:',error);throw error;}console.log('✅ Logout complete');}catch(e){console.error('Logout error:',e);// Fallback: ensure local session is gone
try{localStorage.removeItem('sb-pnienewghjsxrumcenfp-auth-token');Object.keys(localStorage).forEach(key=>{if(key.startsWith('sb-'))localStorage.removeItem(key);});}catch(e2){}}finally{// Always clear UI state regardless of signOut result
setPresenceConnected(false);presenceConnectedRef.current=false;isLoggingOutRef.current=false;}},[]);const formatDateDisplay=formatDateDisplayValue;const formatDayName=formatDayNameShort;const formatDayNumber=formatDayNumberValue;const formatPhoneNumber=formatPhoneNumberValue;const formatCurrency=formatCurrencyValue;const escapeHtml=escapeHtmlValue;const isToday=dateStr=>isDateTodayInTimezone(dateStr,timezone);const navigateWeek=direction=>{setSelectedDate(getNavigatedWeekDate(selectedDate,direction));};const copyRoutesFromDate=createCopyRoutesFromDateHandler({selectedDate,routesByDate,setInfoModal,hasPendingChanges,setRoutesByDate,setExpandedRoutes});// Get dates that have routes (for showing indicators)
const datesWithRoutes=Object.keys(routesByDate).filter(d=>routesByDate[d]?.length>0);// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 4: DATA LOADING & SYNC                                             ║
// ║  Supabase data loading, real-time subscriptions, save operations            ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
// Save settings to localStorage
useEffect(()=>{localStorage.setItem('pcMilerSettings',JSON.stringify(pcMilerSettings));},[pcMilerSettings]);// Load users from Supabase
useEffect(()=>{const loadUsers=async()=>{try{const{data,error}=await supabase.from('allowed_users').select('*').order('id',{ascending:true});if(error)throw error;setUsersDirectory(data||[]);}catch(err){console.error('Error loading users:',err);}finally{setUsersLoading(false);}};loadUsers();},[]);// Generate a unique session ID
const sessionId=useRef((typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)));window.PRESENCE_SESSION_ID=sessionId.current;// Online/Offline detection - critical for preventing data loss on reconnection
useEffect(()=>setupOnlineOfflineSync({supabase,offlineTimestamp,setIsOnline,setSyncStatus,setNeedsReload,enterServerUpdate,exitServerUpdate,setRoutesByDate,setStoresDirectory,setDriversDirectory,setTrucksDirectory,setTrailersDirectory,setTractorsDirectory,setPalletTypes,setSavedInvoices,setLastUpdated,lastSavedData}),[]);// Browser close warning for unsaved changes
useEffect(()=>{const handleBeforeUnload=e=>{if(hasPendingChanges.current){const message='You have unsaved changes. Are you sure you want to leave?';e.preventDefault();e.returnValue=message;return message;}};window.addEventListener('beforeunload',handleBeforeUnload);return()=>{window.removeEventListener('beforeunload',handleBeforeUnload);};},[]);// Inactivity timeout tracking - optimized to not re-bind listeners
useEffect(()=>{showInactivityWarningRef.current=showInactivityWarning;},[showInactivityWarning]);useEffect(()=>{if(!userName)return;// Update last activity on user interaction (uses ref, no re-render)
const updateActivity=()=>{lastActivityRef.current=Date.now();if(showInactivityWarningRef.current){setShowInactivityWarning(false);}};// Track user activity - listeners bound ONCE
const events=['mousedown','keydown','scroll'];// mousemove removed - fires too frequently
events.forEach(event=>{window.addEventListener(event,updateActivity,{passive:true});});// Check for inactivity every minute
const checkInactivity=setInterval(()=>{const now=Date.now();const timeSinceActivity=now-lastActivityRef.current;if(timeSinceActivity>=INACTIVITY_TIMEOUT){// Auto logout after 1 hour
console.log('Inactivity timeout - logging out');handleLogout();}else if(timeSinceActivity>=INACTIVITY_WARNING&&!showInactivityWarningRef.current){// Show warning at 55 minutes
setShowInactivityWarning(true);}},60000);// Check every minute
return()=>{events.forEach(event=>{window.removeEventListener(event,updateActivity);});clearInterval(checkInactivity);};},[userName,handleLogout]);// Setup presence tracking
useEffect(()=>{// Keep ref in sync with state for use in timers
presenceConnectedRef.current=presenceConnected;},[presenceConnected]);useEffect(()=>setupPresenceTracking({supabase,user,userName,selectedDateRef,sessionId,presenceChannelRef,presenceConnectedRef,isLoggingOutRef,hasTrackedOnceRef,setActiveUsers,setPresenceConnected,buildActiveUsersFromState,handleLogout,onStatusChange:status=>{registerChannelStatus('presence',status);pushSyncEvent('Presence status: '+status,{type:'presence',status:status});},onTrackSuccess:()=>{registerChannelStatus('presence','SUBSCRIBED');},onReconnectReady:reconnect=>{registerChannelReconnect('presence',reconnect);}}),[userName,handleLogout,pushSyncEvent,registerChannelStatus,registerChannelReconnect]);// Re-track presence when selected date changes to update other users
useEffect(()=>{syncPresenceDate({presenceChannelRef,userName,user,presenceConnectedRef,selectedDate});},[selectedDate]);// Load data from Supabase on mount
useEffect(()=>setupBootstrapData({supabase,selectedDateRef,userName,userNameRef,hasPendingChanges,IS_BETA_BUILD,isNewerVersion,APP_VERSION,setVersionMismatch,enterServerUpdate,exitServerUpdate,setRoutesByDate,setDateRouteCounts,setStoresDirectory,setDriversDirectory,setTrucksDirectory,setTrailersDirectory,setTractorsDirectory,setPalletTypes,setSavedInvoices,setLastUpdated,lastSavedConfig,lastSavedData,deferredCacheWrite,setSyncStatus,isInitialLoad,onConfigStatusChange:status=>{registerChannelStatus('config',status);pushSyncEvent('Config status: '+status,{type:'config',status:status});},onConfigReconnectReady:reconnect=>{registerChannelReconnect('config',reconnect);}}),[registerChannelStatus,pushSyncEvent,registerChannelReconnect]);// BROADCAST CHANNELS - subscribe once on mount, not per-date
// These don't filter by date at the subscription level - they check selectedDateRef in handlers
const deleteChannelRef=useRef(null);const updateChannelRef=useRef(null);useEffect(()=>setupRouteBroadcastSync({supabase,selectedDateRef,sessionId,enterServerUpdate,exitServerUpdate,setRoutesByDate,setDateRouteCounts,mapRouteRecordToClientRoute,deleteChannelRef,updateChannelRef,lastAppliedRealtimeAtByDateRef,lastRowRealtimeAtByDateRef,onDeleteStatus:status=>{registerChannelStatus('broadcastDelete',status);pushSyncEvent('Broadcast delete status: '+status,{type:'broadcast',status:status});},onUpdateStatus:status=>{registerChannelStatus('broadcastUpdate',status);pushSyncEvent('Broadcast update status: '+status,{type:'broadcast',status:status});},onBroadcastEvent:event=>{pushSyncEvent('Broadcast event '+event.type+' for '+event.routeDate,{type:'broadcast',eventType:event.type,routeDate:event.routeDate});},onReconnectReady:(channel,reconnect)=>{registerChannelReconnect(channel,reconnect);},coalesceWindowMs:450,rowCoverageMs:900,recentApplySuppressionMs:500}),[registerChannelStatus,pushSyncEvent,registerChannelReconnect]);// Empty deps - subscribe once on mount
// Date-specific routes subscription - only syncs routes for the selected date
const routesSubscriptionRef=useRef(null);const routesSetupIdRef=useRef(0);// Token to ignore stale route callbacks
useEffect(()=>setupDateRoutesSync({selectedDate,supabase,routesSubscriptionRef,routesSetupIdRef,enterServerUpdate,exitServerUpdate,setRoutesByDate,dirtyFieldsByRoute,dirtyFieldUpdatedAtByRouteRef,dirtyFieldAckAtByRouteRef,mergeServerRouteIntoLocal,mapRouteRecordToClientRoute,lastAppliedRealtimeAtByDateRef,lastRowRealtimeAtByDateRef,localUserNameRef:userNameRef,recentLocalSaveByDateRouteRef,onStatusChange:(status,date)=>{registerChannelStatus('routes',status);pushSyncEvent('Routes subscription '+status+' for '+date,{type:'routes',status:status,routeDate:date});},onReconnectReady:reconnect=>{registerChannelReconnect('routes',reconnect);},localEchoSuppressMs:6000,fullReloadSuppressionMs:600}),[selectedDate,pushSyncEvent,registerChannelStatus,registerChannelReconnect]);// Log activity to Supabase
const logActivity=async(actionType,entityType,entityId,entityName,fieldChanged,oldValue,newValue,routeDate=null,details=null)=>{await logActivityEntry({supabase,user,userName,actionType,entityType,entityId,entityName,fieldChanged,oldValue,newValue,routeDate,details});};
// LOCAL BACKUP: Save to localStorage before every cloud save
const saveLocalBackup=useCallback(data=>{saveLocalBackupToStorage(data);},[]);const restoreFromBackup=useCallback((backupIndex=0)=>restoreFromLocalBackup({backupIndex,enterServerUpdate,exitServerUpdate,setRoutesByDate,setStoresDirectory,setDriversDirectory,setTrucksDirectory,setTrailersDirectory,setTractorsDirectory,setPalletTypes,setSavedInvoices,hasPendingChanges}),[]);const exportData=useCallback(()=>{exportBackupJson({userName,APP_VERSION,routesByDate,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes,savedInvoices});},[userName,routesByDate,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes,savedInvoices]);const saveToSupabase=useCallback(async(newRoutesByDate,newStoresDirectory,newDriversDirectory,newTrucksDirectory,newTrailersDirectory,newTractorsDirectory,newPalletTypes,newSavedInvoices)=>{return await saveToSupabasePipeline({supabase,userName,IS_BETA_BUILD,APP_VERSION,newRoutesByDate,newStoresDirectory,newDriversDirectory,newTrucksDirectory,newTrailersDirectory,newTractorsDirectory,newPalletTypes,newSavedInvoices,selectedDateRef,isInitialLoad,isFromServer,lastSavedData,lastSavedConfig,setSyncStatus,saveLocalBackup,setRoutesByDate,setDateRouteCounts,updateChannelRef,sessionId,dirtyFieldsByRoute,dirtyFieldUpdatedAtByRouteRef,recentLocalSaveByDateRouteRef,clearDirtyFields,acknowledgeDirtyFieldsSaved,hasPendingChanges,editedStores,lastEditTime,setLastUpdated,setLastSuccessfulSave});},[userName,saveLocalBackup,acknowledgeDirtyFieldsSaved]);useEffect(()=>{if(!isOnline){wasOnlineRef.current=false;return;}if(!wasOnlineRef.current){shouldReplayQueuedSaveRef.current=true;}wasOnlineRef.current=true;if(!shouldReplayQueuedSaveRef.current||needsReload||reconnectReplayInFlightRef.current)return;reconnectReplayInFlightRef.current=true;shouldReplayQueuedSaveRef.current=false;(async()=>{try{await retryQueuedSavesOnReconnect({saveToSupabase,setSyncStatus,supabase,userName,updateChannelRef,sessionId});}finally{reconnectReplayInFlightRef.current=false;}})();},[isOnline,needsReload,saveToSupabase]);useEffect(()=>setupDebouncedSave({isInitialLoad,isFromServer,hasPendingChanges,saveTimeoutRef,pendingSaveDataRef,routesByDate,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes,savedInvoices,saveToSupabase}),[routesByDate,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes,savedInvoices,saveToSupabase]);useEffect(()=>{if(!hasPendingChanges.current)return;if(isInitialLoad.current||isFromServer.current)return;if(saveTimeoutRef.current||pendingSaveDataRef.current)return;if(Object.keys(dirtyFieldsByRoute.current).length>0)return;hasPendingChanges.current=false;editedStores.current.clear();lastEditTime.current={};console.log('🧹 Cleared stale pending edit flag (no pending save)');},[routesByDate,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes]);// Check for username
useEffect(()=>{if(!userName){setShowNameModal(true);}},[userName]);// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 5: CALCULATIONS                                                    ║
// ║  Driver colors, statistics, route totals, pallet counts                     ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
// Generate dynamic driverColors from driversDirectory
const driverColors=buildDriverColors(driversDirectory);const handleSetUserName=name=>{setUserName(name);localStorage.setItem('userName',name);setShowNameModal(false);};const today=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'short',day:'numeric'});const calculateTotals=useCallback(()=>calculateTotalsFromRoutes({routes,palletTypes}),[routes,palletTypes]);const driverStats=getDriverStatsFromRoutes(routes);const calculateRouteTotal=(stores,palletCount=8,palletTypesConfig=[])=>calculateRouteTotalFromStores({stores,palletCount,palletTypesConfig});// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 6: ROUTE OPERATIONS (CRUD)                                         ║
// ║  Add, update, delete, move routes and stores                                ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
const toggleRouteExpand=routeId=>{setExpandedRoutes(prev=>prev.includes(routeId)?prev.filter(id=>id!==routeId):[...prev,routeId]);};// Log pallet change on blur (when user leaves field)
// Ref to store routes state when user starts editing a pallet (for undo)
const palletEditStartState=useRef(null);const logPalletChange=(routeId,storeId,palletIndex,oldValue,newValue)=>{if(oldValue===newValue)return;const route=routes.find(r=>r.id===routeId);const store=route?.stores?.find(s=>s.id===storeId);const storeName=store?`${store.code||''} ${store.name||''}`.trim():`Store ${storeId}`;const driverRoutes=routes.filter(r=>r.driver===route?.driver);const routeNum=driverRoutes.indexOf(route)+1;const routeName=route?.driver?`${route.driver} #${routeNum}`:`Route #${routeId}`;// Push to undo stack (using state captured on focus)
if(palletEditStartState.current){pushUndo(`Pallet ${palletIndex+1} on ${storeName}`,routeId,palletEditStartState.current);palletEditStartState.current=null;}logActivity('update','pallet',String(storeId),`${storeName} (${routeName})`,`Pallet ${palletIndex+1}`,oldValue||0,newValue||0,selectedDate);};// Handle pallet field focus - set protection flags to prevent real-time overwrites
const handlePalletFocus=()=>{hasPendingChanges.current=true;lastInteractionTime.current=Date.now();// Capture current routes state for undo
palletEditStartState.current=JSON.parse(JSON.stringify(routes));};// Log field change on blur (when user leaves field)
const logFieldChange=(entityType,entityId,entityName,field,oldValue,newValue,routeDate=null)=>{if(oldValue===newValue)return;logActivity('update',entityType,String(entityId),entityName,field,oldValue,newValue,routeDate);};const{updatePallet,updateStore,updateRoute,toggleRouteConfirmation}=createRouteMutationsHandlers({routes,selectedDate,userName,currentUserRole,setRoutes,pushUndo,logActivity,hasPendingChanges,lastInteractionTime,editedStores,lastEditTime,markFieldDirty});const{addStore,removeStore,moveRoute,moveStore}=createRouteStoreOpsHandlers({routes,selectedDate,setRoutes,setDeleteConfirmModal,pushUndo,logActivity,hasPendingChanges,markFieldDirty});const{addRoute,removeRoute,copyRoute}=createRouteCrudHandlers({routes,routesByDate,selectedDate,userName,sessionId,supabase,setRoutes,setRoutesByDate,setExpandedRoutes,setDateRouteCounts,setDeleteConfirmModal,pushUndo,logActivity,enterServerUpdate,exitServerUpdate,lastSavedData,hasPendingChanges,editedStores,lastEditTime,clearDirtyFields,deleteChannelRef,updateChannelRef});const{sortStorePalletsByType,addPalletColumn,removePalletColumn}=createPalletOpsHandlers({routes,setRoutes,pushUndo,markFieldDirty,MIN_PALLETS,MAX_PALLETS});// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 7: BOL & PRINT GENERATION                                          ║
// ║  Generate BOL (Bill of Lading / Delivery Report) for printing               ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
// Generate BOL (Bill of Lading / Delivery Report)
const generateBOL=async route=>generateBOLDocument({route,routes,selectedDate,bolSettings,palletTypes,storesDirectory,escapeHtml});// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 8: STORE DIRECTORY OPERATIONS                                      ║
// ║  Add, update, remove stores; CSV import                                     ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
const{addStoreToDirectory,updateStoreDirectory,removeStoreFromDirectory,importStoresFromFile}=createStoreDirectoryHandlers({storesDirectory,hasPendingChanges,lastInteractionTime,setStoresDirectory,setDeleteConfirmModal,logActivity,parseCsvText:parseCsvText});
// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 9: DRIVER DIRECTORY OPERATIONS                                     ║
// ║  Add, update, remove drivers; expiration alerts; CSV import                 ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
const{addDriverToDirectory,updateDriverDirectory,removeDriverFromDirectory,getExpiringDriverDocuments,importDriversFromFile}=createDriverDirectoryHandlers({driversDirectory,hasPendingChanges,lastInteractionTime,setDriversDirectory,setDeleteConfirmModal,parseCsvText:parseCsvText});
// Send expiration alert email
const sendExpirationAlertEmail=async(alerts,recipients)=>{await sendDriverExpirationAlertEmail({supabase,SUPABASE_URL,alerts,recipients,setInfoModal,setExpirationAlertsModal,setSelectedAlertRecipients});};
// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 10: EQUIPMENT OPERATIONS                                           ║
// ║  Trucks, Trailers, Tractors - add, update, remove                           ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
const{addTruckToDirectory,updateTruckDirectory,removeTruckFromDirectory,addTrailerToDirectory,updateTrailerDirectory,removeTrailerFromDirectory,addTractorToDirectory,updateTractorDirectory,removeTractorFromDirectory}=createEquipmentDirectoryHandlers({trucksDirectory,trailersDirectory,tractorsDirectory,hasPendingChanges,lastInteractionTime,setTrucksDirectory,setTrailersDirectory,setTractorsDirectory,setDeleteConfirmModal});
// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 11: IMPORT/EXPORT & SYNC                                           ║
// ║  Export/import data, sync status display                                    ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
// exportData is defined earlier with useCallback for data protection panel
const totals=calculateTotals();const effectiveSyncStatus=allCriticalSubscribed?syncStatus:'connecting';const statusDisplay=getSyncStatusDisplayValue({syncStatus,needsReload,isOnline:navigator.onLine,connectionState,allCriticalSubscribed});const showSyncDegradedBanner=isOnline&&connectionState==='reconnecting';const showSyncFailureBanner=showSyncDegradedBanner&&syncReconnectEscalated;const topBannerCount=(!isOnline?1:0)+(showSyncDegradedBanner?1:0);const contentTopOffset=44+topBannerCount*40;useEffect(()=>{if(connectionState!=='reconnecting'||!isOnline){setSyncReconnectEscalated(false);return;}const escalationTimer=setTimeout(()=>{setSyncReconnectEscalated(true);pushSyncEvent('⚠ Sync reconnecting too long - escalation banner shown',{type:'sync-monitor',status:'ESCALATED'});},180000);return()=>clearTimeout(escalationTimer);},[connectionState,isOnline,pushSyncEvent]);// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 12: MAIN RENDER - UI TABS                                          ║
// ║  Tab navigation, Overview, Print Options, Store Directory, etc.             ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
const overviewTabProps=useMemo(()=>createOverviewTabProps({React,addPalletColumn,addRoute,addStore,calculateRouteTotal,compactMode,copyRoute,currentUserRole,driversDirectory,expandedRoutes,generateBOL,handlePalletFocus,logPalletChange,moveRoute,moveStore,pcMilerSettings,removePalletColumn,removeRoute,removeStore,setCopyRoutesModal,setInfoModal,setMoveStoreModal,setRouteMapModal,setSelectedDate,setStoreChangeConfirmModal,setStoreSearchModal,sortStorePalletsByType,storesDirectory,RouteCard,bolSettings,canEditCurrentDate,compact,driverColors,driverStats,isAdmin,manifestFormat,palletTypes,routes,routesByDate,dateRouteCounts,selectedDate,toggleRouteConfirmation,toggleRouteExpand,totals,tractorsDirectory,trailersDirectory,trucksDirectory,updatePallet,updateRoute,updateStore,userName,getWeekDates,formatDateDisplay,formatDayNumber,escapeHtml,isToday,navigateWeek,getTodayInTimezone,getTomorrowInTimezone,activeUsers}),[
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
]);const storesTabProps=useMemo(()=>createStoresTabProps({React,StatCard,storesDirectory,states,trailerSizes,formatPhoneNumber,addStoreToDirectory,updateStoreDirectory,removeStoreFromDirectory,importStoresFromFile}),[
React,
StatCard,
storesDirectory,
states,
trailerSizes,
formatPhoneNumber,
addStoreToDirectory,
updateStoreDirectory,
removeStoreFromDirectory,
importStoresFromFile,
]);const driversTabProps=useMemo(()=>createDriversTabProps({React,driversSubTab,setDriversSubTab,driverStatusFilter,setDriverStatusFilter,driversDirectory,driverSortField,setDriverSortField,driverSortDirection,setDriverSortDirection,addDriverToDirectory,setDriverPrintModal,getExpiringDriverDocuments,setExpirationAlertsModal,driverPrintModal,driverPrintStatus,setDriverPrintStatus,driverPrintSortField,setDriverPrintSortField,driverPrintSortDirection,setDriverPrintSortDirection,driverPrintFields,setDriverPrintFields,escapeHtml,formatPhoneNumber,licenseTypes,states,trucksDirectory,driverStatuses,updateDriverDirectory,setDriverViewModal,removeDriverFromDirectory,importDriversFromFile}),[
React,
driversSubTab,
setDriversSubTab,
driverStatusFilter,
setDriverStatusFilter,
driversDirectory,
driverSortField,
setDriverSortField,
driverSortDirection,
setDriverSortDirection,
addDriverToDirectory,
setDriverPrintModal,
getExpiringDriverDocuments,
setExpirationAlertsModal,
driverPrintModal,
driverPrintStatus,
setDriverPrintStatus,
driverPrintSortField,
setDriverPrintSortField,
driverPrintSortDirection,
setDriverPrintSortDirection,
driverPrintFields,
setDriverPrintFields,
escapeHtml,
formatPhoneNumber,
licenseTypes,
states,
trucksDirectory,
driverStatuses,
updateDriverDirectory,
setDriverViewModal,
removeDriverFromDirectory,
importDriversFromFile,
]);const trucksTabProps=useMemo(()=>createTrucksTabProps({React,truckSubTab,setTruckSubTab,equipmentType,setEquipmentType,trucksDirectory,truckMakes,truckStatuses,addTruckToDirectory,updateTruckDirectory,removeTruckFromDirectory,trailersDirectory,trailerTypes,trailerSizes,trailerMakes,addTrailerToDirectory,updateTrailerDirectory,removeTrailerFromDirectory,tractorsDirectory,addTractorToDirectory,updateTractorDirectory,removeTractorFromDirectory,driversDirectory}),[
React,
truckSubTab,
setTruckSubTab,
equipmentType,
setEquipmentType,
trucksDirectory,
truckMakes,
truckStatuses,
addTruckToDirectory,
updateTruckDirectory,
removeTruckFromDirectory,
trailersDirectory,
trailerTypes,
trailerSizes,
trailerMakes,
addTrailerToDirectory,
updateTrailerDirectory,
removeTrailerFromDirectory,
tractorsDirectory,
addTractorToDirectory,
updateTractorDirectory,
removeTractorFromDirectory,
driversDirectory,
]);const aiLogisticsTabProps=useMemo(()=>createAiLogisticsTabProps({React,addTruckToDirectory,aiLogisticsSubTab,driversDirectory,hasPendingChanges,palletTypes,removeTruckFromDirectory,setAiLogisticsSubTab,setPalletTypes,storesDirectory,truckStatuses,trucksDirectory,updateStoreDirectory,updateTruckDirectory}),[
React,
addTruckToDirectory,
aiLogisticsSubTab,
driversDirectory,
hasPendingChanges,
palletTypes,
removeTruckFromDirectory,
setAiLogisticsSubTab,
setPalletTypes,
storesDirectory,
truckStatuses,
trucksDirectory,
updateStoreDirectory,
updateTruckDirectory,
]);const accountsTabProps=useMemo(()=>createAccountsTabProps({React,supabase,accountsSubTab,calculateInvoiceData,editingInvoiceId,editingInvoiceUpdatedAt,hasPendingChanges,formatCurrency,invoiceDateRange,invoiceManualItems,invoiceNumber,invoiceRateOverrides,invoiceRoutesLoading,invoiceViewMode,lastInteractionTime,savedInvoices,setDeleteConfirmModal,setAccountsSubTab,setEditingInvoiceId,setEditingInvoiceUpdatedAt,setInvoiceDateRange,setInvoiceManualItems,setInvoiceNumber,setInvoiceRateOverrides,setInvoiceViewMode,setStoreRatesSearch,setSavedInvoices,storeRatesSearch,storesDirectory,updateStoreDirectory,userName}),[
React,
supabase,
accountsSubTab,
calculateInvoiceData,
editingInvoiceId,
editingInvoiceUpdatedAt,
hasPendingChanges,
formatCurrency,
invoiceDateRange,
invoiceManualItems,
invoiceNumber,
invoiceRateOverrides,
invoiceRoutesLoading,
invoiceViewMode,
lastInteractionTime,
savedInvoices,
setDeleteConfirmModal,
setAccountsSubTab,
setEditingInvoiceId,
setEditingInvoiceUpdatedAt,
setInvoiceDateRange,
setInvoiceManualItems,
setInvoiceNumber,
setInvoiceRateOverrides,
setInvoiceViewMode,
setStoreRatesSearch,
setSavedInvoices,
storeRatesSearch,
storesDirectory,
updateStoreDirectory,
userName,
]);const reportsTabProps=useMemo(()=>createReportsTabProps({React,bolSettings,palletTypes,reportDateRange,reportsSubTab,routesByDate,setReportDateRange,setReportsSubTab,storesDirectory,escapeHtml}),[
React,
bolSettings,
palletTypes,
reportDateRange,
reportsSubTab,
routesByDate,
setReportDateRange,
setReportsSubTab,
storesDirectory,
escapeHtml,
]);const settingsTabProps=useMemo(()=>createSettingsTabProps({React,supabase,APP_BUILD_DATE,APP_VERSION,SUPABASE_URL,SecureRoutingAPI,activeUsers,activityLog,activityLogFilter,activityLogLoading,bolSettings,compactMode,driversDirectory,enterServerUpdate,exitServerUpdate,formatPhoneNumber,getTodayInTimezone,getTomorrowInTimezone,hasPendingChanges,lastUpdated,loadActivityLog,logActivity,manifestFormat,palletTypes,pcMilerSettings,presenceConnected,restoreFromBackup,rolePermissions,routes,routesByDate,selectedDate,setActivityLogFilter,setBolSettings,setCompactMode,setDriversDirectory,setInfoModal,setManifestFormat,setPalletTypes,setPcMilerSettings,setPermissionsModal,setRoutesByDate,setSavedInvoices,setSettingsSubTab,setStoresDirectory,setTimezone,setTractorsDirectory,setTrailersDirectory,setTrucksDirectory,setUserDeleteModal,setUserSearch,setUserSort,setUsersDirectory,settingsSubTab,storesDirectory,syncStatus:effectiveSyncStatus,syncDebugEnabled,setSyncDebugEnabled,syncHealth,syncEvents,copySyncLogs,timezone,tractorsDirectory,trailersDirectory,trucksDirectory,user,userDeleteModal,userName,userSearch,userSort,usersDirectory,usersLoading}),[
React,
supabase,
APP_BUILD_DATE,
APP_VERSION,
SUPABASE_URL,
SecureRoutingAPI,
activeUsers,
activityLog,
activityLogFilter,
activityLogLoading,
bolSettings,
compactMode,
driversDirectory,
enterServerUpdate,
exitServerUpdate,
formatPhoneNumber,
getTodayInTimezone,
getTomorrowInTimezone,
hasPendingChanges,
lastUpdated,
loadActivityLog,
logActivity,
manifestFormat,
palletTypes,
pcMilerSettings,
presenceConnected,
restoreFromBackup,
rolePermissions,
routes,
routesByDate,
selectedDate,
setActivityLogFilter,
setBolSettings,
setCompactMode,
setDriversDirectory,
setInfoModal,
setManifestFormat,
setPalletTypes,
setPcMilerSettings,
setPermissionsModal,
setRoutesByDate,
setSavedInvoices,
setSettingsSubTab,
setStoresDirectory,
setTimezone,
setTractorsDirectory,
setTrailersDirectory,
setTrucksDirectory,
setUserDeleteModal,
setUserSearch,
setUserSort,
setUsersDirectory,
settingsSubTab,
storesDirectory,
effectiveSyncStatus,
syncDebugEnabled,
setSyncDebugEnabled,
syncHealth,
syncEvents,
copySyncLogs,
timezone,
tractorsDirectory,
trailersDirectory,
trucksDirectory,
user,
userDeleteModal,
userName,
userSearch,
userSort,
usersDirectory,
usersLoading,
]);
return/*#__PURE__*/React.createElement("div",{style:{position:'relative',height:'100%',backgroundColor:'#f0f2f5',fontFamily:"'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",overflow:'hidden'}},showInactivityWarning&&/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9998}},/*#__PURE__*/React.createElement("div",{style:{background:'white',padding:'40px',borderRadius:'16px',boxShadow:'0 8px 40px rgba(0,0,0,0.3)',textAlign:'center',maxWidth:'450px'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:'60px',marginBottom:'16px'}},"\u23F0"),/*#__PURE__*/React.createElement("h2",{style:{margin:'0 0 12px',color:'#ff9800',fontSize:'24px'}},"Session Expiring"),/*#__PURE__*/React.createElement("p",{style:{color:'#333',fontSize:'16px',lineHeight:1.6,marginBottom:'24px'}},"You've been inactive for a while.",/*#__PURE__*/React.createElement("br",null),"Your session will expire in ",/*#__PURE__*/React.createElement("strong",null,"5 minutes"),"."),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:'12px',justifyContent:'center'}},/*#__PURE__*/React.createElement("button",{onClick:()=>{lastActivityRef.current=Date.now();setShowInactivityWarning(false);},style:{padding:'14px 32px',background:'#1a7f4b',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:600,cursor:'pointer'}},"Stay Logged In"),/*#__PURE__*/React.createElement("button",{onClick:handleLogout,style:{padding:'14px 32px',background:'#f5f5f5',color:'#666',border:'1px solid #ddd',borderRadius:'8px',fontSize:'16px',fontWeight:500,cursor:'pointer'}},"Logout Now")))),/*#__PURE__*/React.createElement(AppModalsTertiary,{copyRoutesModal:copyRoutesModal,setCopyRoutesModal:setCopyRoutesModal,selectedDate:selectedDate,dateRouteCounts:dateRouteCounts,routesByDate:routesByDate,routes:routes,setInfoModal:setInfoModal,supabase:supabase,setRoutesByDate:setRoutesByDate,copyRoutesFromDate:copyRoutesFromDate,moveStoreModal:moveStoreModal,setMoveStoreModal:setMoveStoreModal,driverColors:driverColors,setRoutes:setRoutes}),versionMismatch&&/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99999}},/*#__PURE__*/React.createElement("div",{style:{background:'white',borderRadius:'16px',padding:'32px',maxWidth:'450px',width:'90%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:'64px',marginBottom:'16px'}},"\uD83D\uDD04"),/*#__PURE__*/React.createElement("h2",{style:{margin:'0 0 12px',color:'#1a7f4b',fontSize:'24px'}},"Update Available!"),/*#__PURE__*/React.createElement("p",{style:{margin:'0 0 8px',color:'#666',fontSize:'16px'}},"A newer version of the dashboard is available."),/*#__PURE__*/React.createElement("p",{style:{margin:'0 0 24px',color:'#999',fontSize:'14px'}},"Your version: ",/*#__PURE__*/React.createElement("strong",{style:{color:'#d32f2f'}},"v",APP_VERSION),/*#__PURE__*/React.createElement("br",null),"Latest version: ",/*#__PURE__*/React.createElement("strong",{style:{color:'#1a7f4b'}},"v",versionMismatch.serverVersion)),/*#__PURE__*/React.createElement("p",{style:{margin:'0 0 24px',color:'#333',fontSize:'14px',background:'#fff3e0',padding:'12px',borderRadius:'8px',border:'1px solid #ffb74d'}},"\u26A0\uFE0F Please refresh to continue using the dashboard and ensure data syncs correctly with other users."),/*#__PURE__*/React.createElement("button",{onClick:()=>window.location.reload(true),style:{padding:'14px 32px',background:'linear-gradient(135deg, #1a7f4b 0%, #15633a 100%)',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:600,color:'white',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'8px'}},"\uD83D\uDD04 Refresh Now"))),undoToast&&/*#__PURE__*/React.createElement("div",{style:{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg, #424242 0%, #212121 100%)',color:'white',padding:'12px 24px',borderRadius:'8px',boxShadow:'0 4px 20px rgba(0,0,0,0.3)',zIndex:10000,display:'flex',alignItems:'center',gap:'12px',animation:'slideUp 0.3s ease-out'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'20px'}},"\u21A9\uFE0F"),/*#__PURE__*/React.createElement("div",null,/*#__PURE__*/React.createElement("div",{style:{fontWeight:600}},undoToast.message),/*#__PURE__*/React.createElement("div",{style:{fontSize:'12px',opacity:0.8}},undoToast.remaining>0?`${undoToast.remaining} more undo${undoToast.remaining>1?'s':''} available`:'No more undos')),/*#__PURE__*/React.createElement("span",{style:{fontSize:'11px',opacity:0.6,marginLeft:'8px'}},"Ctrl+Z")),showDataProtectionPanel&&/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9997}},/*#__PURE__*/React.createElement("div",{style:{background:'white',padding:'30px',borderRadius:'16px',boxShadow:'0 8px 40px rgba(0,0,0,0.3)',maxWidth:'500px',width:'90%'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}},/*#__PURE__*/React.createElement("h2",{style:{margin:0,color:'#1a7f4b',fontSize:'20px'}},"\uD83D\uDEE1\uFE0F Data Protection"),/*#__PURE__*/React.createElement("button",{onClick:()=>setShowDataProtectionPanel(false),style:{background:'none',border:'none',fontSize:'24px',cursor:'pointer',color:'#999'}},"\xD7")),/*#__PURE__*/React.createElement("div",{style:{background:'#f5f5f5',padding:'16px',borderRadius:'8px',marginBottom:'16px'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',justifyContent:'space-between',marginBottom:'8px'}},/*#__PURE__*/React.createElement("span",{style:{color:'#666'}},"Sync Status:"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:effectiveSyncStatus==='synced'?'#4caf50':effectiveSyncStatus==='error'?'#e53935':'#ff9800'}},effectiveSyncStatus==='synced'?'✅ Synced':effectiveSyncStatus==='error'?' Error':'🔄 Syncing...')),/*#__PURE__*/React.createElement("div",{style:{display:'flex',justifyContent:'space-between',marginBottom:'8px'}},/*#__PURE__*/React.createElement("span",{style:{color:'#666'}},"Last Successful Save:"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:'#333'}},lastSuccessfulSave?new Date(lastSuccessfulSave).toLocaleTimeString():'Not yet')),/*#__PURE__*/React.createElement("div",{style:{display:'flex',justifyContent:'space-between'}},/*#__PURE__*/React.createElement("span",{style:{color:'#666'}},"Local Backups:"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:'#333'}},(()=>{try{const history=JSON.parse(localStorage.getItem('logistics_backup_history')||'[]');return history.length+' saved';}catch{return'0 saved';}})()))),/*#__PURE__*/React.createElement("div",{style:{display:'flex',flexDirection:'column',gap:'10px'}},/*#__PURE__*/React.createElement("button",{onClick:()=>{exportData();},style:{padding:'12px 20px',background:'#1a7f4b',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}},"\uD83D\uDCBE Download Full Backup (JSON)"),/*#__PURE__*/React.createElement("button",{onClick:()=>{restoreFromBackup(0);setShowDataProtectionPanel(false);},style:{padding:'12px 20px',background:'#ff9800',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}},"\uD83D\uDD04 Restore Latest Local Backup"),/*#__PURE__*/React.createElement("button",{onClick:()=>{// Show backup history
try{const history=JSON.parse(localStorage.getItem('logistics_backup_history')||'[]');if(history.length===0){alert('No backups found.');return;}const options=history.map((b,i)=>`${i+1}. ${new Date(b.timestamp).toLocaleString('en-US')}`).join('\n');const choice=prompt(`Select backup to restore (1-${history.length}):\n\n${options}`);if(choice){const idx=parseInt(choice)-1;if(idx>=0&&idx<history.length){restoreFromBackup(idx);setShowDataProtectionPanel(false);}}}catch(e){alert('Error: '+e.message);}},style:{padding:'12px 20px',background:'#f5f5f5',color:'#333',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}},"\uD83D\uDCCB View Backup History")),/*#__PURE__*/React.createElement("p",{style:{marginTop:'16px',fontSize:'12px',color:'#888',textAlign:'center'}},"Backups are automatically saved before every cloud sync.",/*#__PURE__*/React.createElement("br",null),"Last 5 backups are kept in your browser."))),/*#__PURE__*/React.createElement(AppModals,{showNameModal:showNameModal,handleSetUserName:handleSetUserName,deleteConfirmModal:deleteConfirmModal,setDeleteConfirmModal:setDeleteConfirmModal,showLogoutModal:showLogoutModal,setShowLogoutModal:setShowLogoutModal,handleLogout:handleLogout,storeChangeConfirmModal:storeChangeConfirmModal,setStoreChangeConfirmModal:setStoreChangeConfirmModal,infoModal:infoModal,setInfoModal:setInfoModal}),/*#__PURE__*/React.createElement(AppModalsSecondary,{routeMapModal:routeMapModal,setRouteMapModal:setRouteMapModal,driverViewModal:driverViewModal,setDriverViewModal:setDriverViewModal,expirationAlertsModal:expirationAlertsModal,setExpirationAlertsModal:setExpirationAlertsModal,expirationAlertDays:expirationAlertDays,setExpirationAlertDays:setExpirationAlertDays,getExpiringDriverDocuments:getExpiringDriverDocuments,usersDirectory:usersDirectory,selectedAlertRecipients:selectedAlertRecipients,setSelectedAlertRecipients:setSelectedAlertRecipients,setInfoModal:setInfoModal,sendExpirationAlertEmail:sendExpirationAlertEmail,permissionsModal:permissionsModal,setPermissionsModal:setPermissionsModal,setUsersDirectory:setUsersDirectory}),storeSearchModal&&/*#__PURE__*/React.createElement(StoreSearchModal,{storeSearchModal:storeSearchModal,storesDirectory:storesDirectory,routes:routes,storeSearchQuery:storeSearchQuery,setStoreSearchQuery:setStoreSearchQuery,storeSearchIndex:storeSearchIndex,setStoreSearchIndex:setStoreSearchIndex,setStoreSearchModal:setStoreSearchModal,setStoreChangeConfirmModal:setStoreChangeConfirmModal,setRoutes:setRoutes,hasPendingChangesRef:hasPendingChanges}),/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:0,left:0,right:0,zIndex:102,background:'linear-gradient(135deg, #1a7f4b 0%, #15633b 100%)'}},!isOnline&&/*#__PURE__*/React.createElement("div",{style:{background:'#f44336',color:'white',padding:'10px 32px',textAlign:'center',fontWeight:600,fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'18px'}},"\u26A0\uFE0F"),"YOU ARE OFFLINE - Changes will NOT be saved until connection is restored",/*#__PURE__*/React.createElement("span",{style:{fontSize:'18px'}},"\u26A0\uFE0F")),showSyncDegradedBanner&&/*#__PURE__*/React.createElement("div",{style:{background:showSyncFailureBanner?'#d32f2f':'#ff9800',color:'white',padding:'10px 32px',textAlign:'center',fontWeight:600,fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'18px'}},showSyncFailureBanner?"\u274C":"\u26A0\uFE0F"),showSyncFailureBanner?'Sync failed — please refresh the page to restore real-time updates':'Real-time sync interrupted — other users\' changes may not appear until reconnected',showSyncFailureBanner&&/*#__PURE__*/React.createElement("button",{onClick:()=>window.location.reload(),style:{background:'white',color:'#d32f2f',border:'none',borderRadius:'6px',padding:'4px 10px',fontSize:'12px',fontWeight:700,cursor:'pointer'}},'Refresh now')),/*#__PURE__*/React.createElement("header",{style:{background:'linear-gradient(135deg, #1a7f4b 0%, #15633b 100%)',color:'white',padding:'0 20px',height:'44px',display:'flex',alignItems:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',fontSize:'12px'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px',marginRight:'8px'}},"\uD83D\uDE9B"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:700,fontSize:'13px'}},"Logistics Dashboard"),/*#__PURE__*/React.createElement("span",{style:{opacity:0.5,fontSize:'10px',marginLeft:'6px'}},"v",APP_VERSION),/*#__PURE__*/React.createElement("span",{style:{margin:'0 12px',opacity:0.3}},"|"),/*#__PURE__*/React.createElement("button",{onClick:undoLastChange,disabled:undoStack.length===0,title:undoStack.length>0?`Undo (${undoStack.length} available) - Ctrl+Z`:'Nothing to undo',style:{background:undoStack.length>0?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.1)',border:'none',borderRadius:'4px',padding:'3px 8px',cursor:undoStack.length>0?'pointer':'default',display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:undoStack.length>0?'white':'rgba(255,255,255,0.5)',marginRight:'8px'}},/*#__PURE__*/React.createElement("span",null,"\u21A9\uFE0F"),/*#__PURE__*/React.createElement("span",null,"Undo"),undoStack.length>0&&/*#__PURE__*/React.createElement("span",{style:{background:'rgba(255,255,255,0.3)',borderRadius:'10px',padding:'0 5px',fontSize:'10px'}},undoStack.length)),/*#__PURE__*/React.createElement("span",{style:{fontSize:'11px'}},new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})),/*#__PURE__*/React.createElement("span",{onClick:()=>setShowDataProtectionPanel(true),style:{margin:'0 8px',fontSize:'10px',background:'rgba(255,255,255,0.2)',padding:'2px 6px',borderRadius:'8px',display:'flex',alignItems:'center',gap:'4px',cursor:'pointer'},title:"Click for data protection options"},/*#__PURE__*/React.createElement("span",{style:{width:'6px',height:'6px',borderRadius:'50%',background:statusDisplay.color,display:'inline-block'}}),statusDisplay.text,lastSuccessfulSave&&/*#__PURE__*/React.createElement("span",{style:{opacity:0.7,marginLeft:'4px'}},"\u2022 ",new Date(lastSuccessfulSave).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})),/*#__PURE__*/React.createElement("span",{style:{fontSize:'10px',marginLeft:'2px'}},"\uD83D\uDEE1\uFE0F")),/*#__PURE__*/React.createElement("div",{className:"online-users-dropdown",style:{position:'relative'}},/*#__PURE__*/React.createElement("span",{onClick:()=>{const newState=!showOnlineUsers;setShowOnlineUsers(newState);},style:{fontSize:'10px',background:'rgba(255,255,255,0.15)',padding:'2px 6px',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}},/*#__PURE__*/React.createElement("span",{style:{width:'6px',height:'6px',borderRadius:'50%',background:presenceConnected||activeUsers.length>0?'#4caf50':'#ff9800',display:'inline-block'}}),"\uD83D\uDC65 Online: ",presenceConnected||activeUsers.length>0?activeUsers.length:'...',!presenceConnected&&activeUsers.length===0&&/*#__PURE__*/React.createElement("span",{style:{fontSize:'9px',opacity:0.7}}," \u26A0\uFE0F"),/*#__PURE__*/React.createElement("span",{style:{fontSize:'8px'}},showOnlineUsers?'▲':'▼')),showOnlineUsers&&/*#__PURE__*/React.createElement("div",{style:{position:'absolute',top:'100%',left:0,marginTop:'4px',background:'white',borderRadius:'6px',boxShadow:'0 4px 12px rgba(0,0,0,0.2)',padding:'8px 0',minWidth:'180px',zIndex:1000}},/*#__PURE__*/React.createElement("div",{style:{padding:'4px 12px',fontSize:'10px',color:'#888',borderBottom:'1px solid #eee',marginBottom:'4px',display:'flex',justifyContent:'space-between',alignItems:'center'}},/*#__PURE__*/React.createElement("span",null,"Connected Users"),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:'4px'}},/*#__PURE__*/React.createElement("button",{onClick:async e=>{e.stopPropagation();// Reload ONLY current date from server
try{setSyncStatus('syncing');// Load routes for current date only
const{data:routesData,error:routesError}=await supabase.from('logistics_routes').select('*').eq('route_date',selectedDate).order('route_order',{ascending:true});if(routesError)throw routesError;enterServerUpdate();try{// Convert routes for this date
const newRoutes=[];if(routesData&&routesData.length>0){routesData.forEach(route=>{newRoutes.push({id:route.id,driver:route.driver,truck:route.truck,trailer:route.trailer,stores:route.stores||[],palletCount:route.pallet_count||8,confirmed:route.confirmed,confirmedBy:route.confirmed_by,pickupAtPB:route.pickup_at_pb||false,route_order:route.route_order});});}// Update only the selected date, keep other dates as-is
setRoutesByDate(prev=>({...prev,[selectedDate]:newRoutes}));console.log(`✅ Reloaded ${selectedDate}: ${newRoutes.length} routes`);}finally{setTimeout(()=>exitServerUpdate(),300);}setSyncStatus('synced');}catch(err){console.error('Reload failed:',err);setSyncStatus('error');alert('Failed to reload data: '+err.message);}},style:{padding:'2px 6px',fontSize:'9px',background:'#fff3e0',border:'none',borderRadius:'3px',cursor:'pointer',color:'#e65100'},title:`Reload ${selectedDate} from server`},"\uD83D\uDD04 Reload"))),activeUsers.length>0?activeUsers.map((user,idx)=>/*#__PURE__*/React.createElement("div",{key:user.session,style:{padding:'6px 12px',fontSize:'11px',color:'#333',display:'flex',alignItems:'center',gap:'6px',background:user.name===userName?'#e8f5e9':user.currentDate===selectedDate&&user.name!==userName?'#fff3e0':'transparent'}},/*#__PURE__*/React.createElement("span",{style:{width:'8px',height:'8px',borderRadius:'50%',background:user.currentDate===selectedDate&&user.name!==userName?'#ff9800':'#4caf50'}}),user.name,user.sessionCount>1&&/*#__PURE__*/React.createElement("span",{style:{color:'#666',fontSize:'10px'}},"(",user.sessionCount," tabs)"),user.name===userName&&/*#__PURE__*/React.createElement("span",{style:{color:'#888',fontSize:'10px'}},"(you)"),user.currentDate&&user.name!==userName&&/*#__PURE__*/React.createElement("span",{style:{color:user.currentDate===selectedDate?'#e65100':'#888',fontSize:'10px',fontWeight:user.currentDate===selectedDate?'600':'normal'}},user.currentDate===selectedDate?'⚠ same date':`📅 ${(()=>{const d=new Date(user.currentDate+'T12:00:00');return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});})()}`))):!presenceConnected?/*#__PURE__*/React.createElement("div",{style:{padding:'8px 12px',fontSize:'11px',color:'#666'}},"Connecting..."):/*#__PURE__*/React.createElement("div",{style:{padding:'8px 12px',fontSize:'11px',color:'#333',display:'flex',alignItems:'center',gap:'6px'}},/*#__PURE__*/React.createElement("span",{style:{width:'8px',height:'8px',borderRadius:'50%',background:'#4caf50'}}),userName||'You'," ",/*#__PURE__*/React.createElement("span",{style:{color:'#888',fontSize:'10px'}},"(you)")))),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:'4px',marginLeft:'20px'}},canAccessTab('Overview')&&/*#__PURE__*/React.createElement("div",{className:"display-mode-dropdown",style:{position:'relative'}},/*#__PURE__*/React.createElement("button",{onClick:()=>setActiveTab('Overview'),onContextMenu:e=>{e.preventDefault();setShowDisplayModeMenu(!showDisplayModeMenu);},style:{background:activeTab==='Overview'?'rgba(255,255,255,0.2)':'transparent',color:'white',opacity:activeTab==='Overview'?1:0.8,border:'none',borderRadius:'4px',padding:'5px 12px',cursor:'pointer',fontSize:'11px',fontWeight:activeTab==='Overview'?600:400,position:'relative',display:'flex',alignItems:'center',gap:'4px'}},"Overview",/*#__PURE__*/React.createElement("span",{onClick:e=>{e.stopPropagation();setShowDisplayModeMenu(!showDisplayModeMenu);},style:{fontSize:'8px',opacity:0.6,padding:'2px 4px',marginLeft:'2px',borderRadius:'2px',cursor:'pointer'},onMouseEnter:e=>e.target.style.opacity='1',onMouseLeave:e=>e.target.style.opacity='0.6'},"\u25BC"),userPermissions.tabs['Overview']==='view'&&/*#__PURE__*/React.createElement("span",{style:{position:'absolute',top:'1px',right:'1px',fontSize:'7px',opacity:0.7}},"\uD83D\uDC41")),showDisplayModeMenu&&/*#__PURE__*/React.createElement("div",{style:{position:'absolute',top:'100%',left:'0',marginTop:'4px',background:'white',borderRadius:'8px',boxShadow:'0 4px 20px rgba(0,0,0,0.2)',minWidth:'200px',zIndex:1000,overflow:'hidden'}},/*#__PURE__*/React.createElement("div",{style:{padding:'8px 12px',background:'#f5f5f5',fontSize:'10px',fontWeight:600,color:'#666',textTransform:'uppercase',letterSpacing:'0.5px'}},"Display Mode"),[{value:'normal',label:'Normal',desc:'Default spacing',icon:''},{value:'compact',label:'Compact',desc:'Reduced spacing',icon:''},{value:'very-compact',label:'Very Compact',desc:'Maximum density',icon:'🔬'},{value:'single-row',label:'Single Row',desc:'Inline header',icon:'➖'},{value:'excel',label:'Excel (Beta)',desc:'Spreadsheet style',icon:'📊'}].map(mode=>/*#__PURE__*/React.createElement("div",{key:mode.value,onClick:()=>{setCompactMode(mode.value);localStorage.setItem('pbnewmans_compactMode',mode.value);setShowDisplayModeMenu(false);setActiveTab('Overview');},style:{padding:'10px 14px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',background:compactMode===mode.value?'#e8f5e9':'white',borderBottom:'1px solid #f0f0f0'},onMouseEnter:e=>e.currentTarget.style.background=compactMode===mode.value?'#e8f5e9':'#f9f9f9',onMouseLeave:e=>e.currentTarget.style.background=compactMode===mode.value?'#e8f5e9':'white'},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},mode.icon),/*#__PURE__*/React.createElement("div",{style:{flex:1}},/*#__PURE__*/React.createElement("div",{style:{fontSize:'13px',color:'#333',fontWeight:500}},mode.label),/*#__PURE__*/React.createElement("div",{style:{fontSize:'11px',color:'#888'}},mode.desc)),compactMode===mode.value&&/*#__PURE__*/React.createElement("span",{style:{color:'#1a7f4b',fontWeight:'bold'}},"\u2713"))))),['Drivers','Stores','Trucks','AI Logistics','Reports'].filter(tab=>canAccessTab(tab)).map(tab=>/*#__PURE__*/React.createElement("button",{key:tab,onClick:()=>{setActiveTab(tab);setShowAccountsMenu(false);},style:{background:activeTab===tab?'rgba(255,255,255,0.2)':'transparent',color:'white',opacity:activeTab===tab?1:0.8,border:'none',borderRadius:'4px',padding:'5px 12px',cursor:'pointer',fontSize:'11px',fontWeight:activeTab===tab?600:400,position:'relative'}},tab==='AI Logistics'?'🤖':''," ",tab,userPermissions.tabs[tab]==='view'&&/*#__PURE__*/React.createElement("span",{style:{position:'absolute',top:'1px',right:'1px',fontSize:'7px',opacity:0.7}},"\uD83D\uDC41"))),canAccessTab('Accounts')&&/*#__PURE__*/React.createElement("div",{className:"accounts-nav-dropdown",style:{position:'relative'}},/*#__PURE__*/React.createElement("button",{onClick:e=>{e.stopPropagation();setActiveTab('Accounts');setShowAccountsMenu(!showAccountsMenu);},style:{background:activeTab==='Accounts'?'rgba(255,255,255,0.2)':'transparent',color:'white',opacity:activeTab==='Accounts'?1:0.8,border:'none',borderRadius:'4px',padding:'5px 12px',cursor:'pointer',fontSize:'11px',fontWeight:activeTab==='Accounts'?600:400,position:'relative',display:'flex',alignItems:'center',gap:'4px'}},"💰 Accounts",/*#__PURE__*/React.createElement("span",{style:{fontSize:'8px',opacity:0.7}},"▼"),userPermissions.tabs['Accounts']==='view'&&/*#__PURE__*/React.createElement("span",{style:{position:'absolute',top:'1px',right:'1px',fontSize:'7px',opacity:0.7}},"\uD83D\uDC41")),showAccountsMenu&&/*#__PURE__*/React.createElement("div",{style:{position:'absolute',top:'100%',left:0,marginTop:'4px',background:'white',borderRadius:'8px',boxShadow:'0 4px 20px rgba(0,0,0,0.2)',minWidth:'220px',zIndex:1000,overflow:'hidden'}},['Chart of Accounts','Income Transactions','Expenses','Receive Payments','Invoices','Driver Settlements','Store Rates'].map(sub=>/*#__PURE__*/React.createElement("button",{key:sub,onClick:()=>{setAccountsSubTab(sub);setActiveTab('Accounts');setShowAccountsMenu(false);},style:{width:'100%',padding:'10px 12px',background:accountsSubTab===sub?'#e8f5e9':'white',color:'#333',border:'none',textAlign:'left',cursor:'pointer',fontSize:'12px',fontWeight:accountsSubTab===sub?600:500}},sub)))),canAccessTab('Settings')&&/*#__PURE__*/React.createElement("button",{onClick:()=>setActiveTab('Settings'),style:{background:activeTab==='Settings'?'rgba(255,255,255,0.2)':'transparent',color:'white',opacity:activeTab==='Settings'?1:0.8,border:'none',borderRadius:'4px',padding:'5px 12px',cursor:'pointer',fontSize:'11px',fontWeight:activeTab==='Settings'?600:400}},"\u2699\uFE0F Settings")),/*#__PURE__*/React.createElement("div",{style:{marginLeft:'auto',display:'flex',alignItems:'center',gap:'10px',fontSize:'11px',position:'relative'}},/*#__PURE__*/React.createElement("div",{onClick:()=>setShowUserMenu(!showUserMenu),style:{cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',padding:'4px 10px',background:showUserMenu?'rgba(255,255,255,0.2)':'transparent',borderRadius:'6px',transition:'background 0.2s'}},/*#__PURE__*/React.createElement("div",{style:{width:'28px',height:'28px',borderRadius:'50%',background:'#ff9800',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'12px',color:'white'}},(userName||'U').charAt(0).toUpperCase()),/*#__PURE__*/React.createElement("span",{style:{fontWeight:500}},userName||'User'),currentUserRole&&/*#__PURE__*/React.createElement("span",{style:{background:isAdmin?'#ff9800':'rgba(255,255,255,0.3)',padding:'1px 5px',borderRadius:'3px',fontSize:'9px',fontWeight:600}},currentUserRole),/*#__PURE__*/React.createElement("span",{style:{fontSize:'10px',opacity:0.8}},showUserMenu?'▲':'▼')),showUserMenu&&/*#__PURE__*/React.createElement(React.Fragment,null,/*#__PURE__*/React.createElement("div",{onClick:()=>setShowUserMenu(false),style:{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:999}}),/*#__PURE__*/React.createElement("div",{style:{position:'absolute',top:'100%',right:0,marginTop:'6px',background:'white',borderRadius:'10px',boxShadow:'0 4px 20px rgba(0,0,0,0.15)',minWidth:'260px',zIndex:1000,overflow:'hidden',border:'1px solid #e0e0e0'}},/*#__PURE__*/React.createElement("div",{onClick:()=>{setShowUserMenu(false);setShowNameModal(true);},style:{padding:'16px',borderBottom:'1px solid #e0e0e0',display:'flex',alignItems:'center',gap:'12px',cursor:'pointer',transition:'background 0.15s'},onMouseEnter:e=>e.currentTarget.style.background='#f9f9f9',onMouseLeave:e=>e.currentTarget.style.background='transparent'},/*#__PURE__*/React.createElement("div",{style:{width:'42px',height:'42px',borderRadius:'50%',background:'#ff9800',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'18px',color:'white'}},(userName||'U').charAt(0).toUpperCase()),/*#__PURE__*/React.createElement("div",{style:{flex:1}},/*#__PURE__*/React.createElement("div",{style:{fontWeight:600,color:'#333',fontSize:'14px'}},userName||'User'),/*#__PURE__*/React.createElement("div",{style:{color:'#666',fontSize:'12px'}},user?.email||'')),/*#__PURE__*/React.createElement("span",{style:{color:'#999',fontSize:'14px'}},"\u270F\uFE0F")),/*#__PURE__*/React.createElement("div",{style:{padding:'8px 0'}},/*#__PURE__*/React.createElement("button",{onClick:()=>{setShowUserMenu(false);setActiveTab('Settings');setSettingsSubTab('Display');},style:{width:'100%',padding:'10px 16px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',fontSize:'13px',color:'#333',transition:'background 0.15s'},onMouseEnter:e=>e.target.style.background='#f5f5f5',onMouseLeave:e=>e.target.style.background='transparent'},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\u2699\uFE0F"),/*#__PURE__*/React.createElement("span",null,"Settings")),/*#__PURE__*/React.createElement("button",{onClick:()=>{setShowUserMenu(false);setActiveTab('Settings');setSettingsSubTab('Users Management');},style:{width:'100%',padding:'10px 16px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',fontSize:'13px',color:'#333',transition:'background 0.15s'},onMouseEnter:e=>e.target.style.background='#f5f5f5',onMouseLeave:e=>e.target.style.background='transparent'},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\uD83D\uDEE0\uFE0F"),/*#__PURE__*/React.createElement("span",null,"Setup")),/*#__PURE__*/React.createElement("button",{onClick:()=>{setShowUserMenu(false);alert('Help Center is coming soon. For support, contact your administrator.');},style:{width:'100%',padding:'10px 16px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',fontSize:'13px',color:'#333',transition:'background 0.15s'},onMouseEnter:e=>e.target.style.background='#f5f5f5',onMouseLeave:e=>e.target.style.background='transparent'},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\u2753"),/*#__PURE__*/React.createElement("span",null,"Help Center"))),/*#__PURE__*/React.createElement("div",{style:{borderTop:'1px solid #e0e0e0',padding:'8px 0'}},/*#__PURE__*/React.createElement("button",{onClick:()=>{setShowUserMenu(false);setShowLogoutModal(true);},style:{width:'100%',padding:'10px 16px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',fontSize:'13px',color:'#333',transition:'background 0.15s'},onMouseEnter:e=>e.target.style.background='#f5f5f5',onMouseLeave:e=>e.target.style.background='transparent'},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\uD83D\uDEAA"),/*#__PURE__*/React.createElement("span",null,"Log Off"))))))),/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:contentTopOffset+'px',left:0,right:0,bottom:0,overflowY:'auto',overflowX:'hidden',background:'white'}},activeTab==='Overview'&&/*#__PURE__*/React.createElement(OverviewTab,{...overviewTabProps}),activeTab==='Stores'&&/*#__PURE__*/React.createElement(StoresTab,{...storesTabProps}),activeTab==='Drivers'&&/*#__PURE__*/React.createElement(DriversTab,{...driversTabProps}),activeTab==='Trucks'&&/*#__PURE__*/React.createElement(TrucksTab,{...trucksTabProps}),activeTab==='AI Logistics'&&/*#__PURE__*/React.createElement(AiLogisticsTab,{...aiLogisticsTabProps}),activeTab==='Accounts'&&/*#__PURE__*/React.createElement(AccountsTab,{...accountsTabProps}),activeTab==='Reports'&&/*#__PURE__*/React.createElement(ReportsTab,{...reportsTabProps}),activeTab==='Settings'&&/*#__PURE__*/React.createElement(SettingsTab,{...settingsTabProps}))));}// ╔╗
// ║  SECTION 14: STANDALONE COMPONENTS                                            ║
// ║  StatCard, RouteCard, AuthScreen, App, PasswordResetScreen                    ║
// ╚
// ─────────────────────────────────────────────────────────────────────────────────
// StatCard - Simple stat display card
// ─────────────────────────────────────────────────────────────────────────────────
// StatCard and RouteCard moved to components modules.

function App(){const[user,setUser]=useState(null);const[loading,setLoading]=useState(true);const[showPasswordReset,setShowPasswordReset]=useState(false);const[resetError,setResetError]=useState('');useEffect(()=>initializeAuthSession({supabase,setUser,setLoading,setShowPasswordReset,setResetError}),[]);if(loading){return/*#__PURE__*/React.createElement("div",{style:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg, #1a7f4b 0%, #15633b 100%)'}},/*#__PURE__*/React.createElement("div",{style:{textAlign:'center',color:'white'}},/*#__PURE__*/React.createElement("div",{className:"spinner",style:{width:'40px',height:'40px',borderWidth:'4px'}}),/*#__PURE__*/React.createElement("p",{style:{marginTop:'16px',fontSize:'16px'}},"Loading...")));}if(resetError){return/*#__PURE__*/React.createElement("div",{className:"auth-container"},/*#__PURE__*/React.createElement("div",{className:"auth-box"},/*#__PURE__*/React.createElement("div",{style:{textAlign:'center',marginBottom:'32px'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:'48px',marginBottom:'8px'}},"\u26A0\uFE0F"),/*#__PURE__*/React.createElement("h1",{style:{color:'#e53935',fontSize:'24px',fontWeight:700,margin:'0 0 8px'}},"Link Expired")),/*#__PURE__*/React.createElement("div",{className:"auth-error"},resetError),/*#__PURE__*/React.createElement("button",{onClick:()=>{setResetError('');window.location.href=window.location.pathname;},className:"auth-btn",style:{marginTop:'20px'}},"Back to Login")));}if(showPasswordReset){return/*#__PURE__*/React.createElement(PasswordResetScreen,{onComplete:()=>{setShowPasswordReset(false);window.location.hash='';},supabase:supabase});}if(!user){return/*#__PURE__*/React.createElement(AuthScreen,{onLogin:setUser,supabase:supabase,appVersion:APP_VERSION});}return/*#__PURE__*/React.createElement(LogisticsDashboard,{user:user});}// ============================================
// PASSWORD RESET SCREEN - Separate Component
// ============================================
// ─────────────────────────────────────────────────────────────────────────────────
// PasswordResetScreen - Password reset flow for users
// ─────────────────────────────────────────────────────────────────────────────────
export default App;
