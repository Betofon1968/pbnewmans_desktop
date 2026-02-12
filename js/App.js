import OverviewTab from './tabs/OverviewTab.js?v=26.110';
import DriversTab from './tabs/DriversTab.js?v=26.110';
import StoresTab from './tabs/StoresTab.js?v=26.110';
import TrucksTab from './tabs/TrucksTab.js?v=26.110';
import AiLogisticsTab from './tabs/AiLogisticsTab.js?v=26.110';
import AccountsTab from './tabs/AccountsTab.js?v=26.110';
import ReportsTab from './tabs/ReportsTab.js?v=26.110';
import SettingsTab from './tabs/SettingsTab.js?v=26.110';
import {generateBOLDocument} from './modules/bol.js?v=26.110';
import StatCard from './components/StatCard.js?v=26.110';
import RouteCard from './components/RouteCard.js?v=26.110';
import StoreSearchModal from './components/StoreSearchModal.js?v=26.110';
import AppModals from './components/AppModals.js?v=26.110';
import AppModalsSecondary from './components/AppModalsSecondary.js?v=26.110';
import AppModalsTertiary from './components/AppModalsTertiary.js?v=26.110';
import {initialRoutes,MAX_PALLETS,MIN_PALLETS,defaultDriverColors,initialStoresDirectory,initialDriversDirectory,initialTrucksDirectory,truckZones,truckMakes,truckStatuses,trailerMakes,trailerTypes,states,trailerSizes,licenseTypes,driverStatuses,rolePermissions,initialPalletTypes} from './modules/constants.js?v=26.110';
import AuthScreen from './modules/auth/AuthScreen.js?v=26.110';
import PasswordResetScreen from './modules/auth/PasswordResetScreen.js?v=26.110';
import {initializeAuthSession} from './modules/auth/session.js?v=26.110';
import {buildActiveUsersFromState as buildActiveUsersFromPresence} from './modules/sync/activeUsers.js?v=26.110';
import {mapRouteRecordToClientRoute} from './modules/sync/routeMapper.js?v=26.110';
import {setupRouteBroadcastSync} from './modules/sync/broadcastSync.js?v=26.110';
import {setupDateRoutesSync} from './modules/sync/dateRoutesSync.js?v=26.110';
import {setupPresenceTracking,syncPresenceDate} from './modules/sync/presenceSync.js?v=26.110';
import {setupOnlineOfflineSync} from './modules/sync/networkSync.js?v=26.110';
import {saveLocalBackupToStorage,restoreFromLocalBackup,exportBackupJson,saveToSupabasePipeline,setupDebouncedSave} from './modules/sync/persistenceSync.js?v=26.110';
import {createRouteCrudHandlers} from './modules/routes/routeCrud.js?v=26.110';
import {createRouteStoreOpsHandlers} from './modules/routes/routeStoreOps.js?v=26.110';
import {createRouteMutationsHandlers} from './modules/routes/routeMutations.js?v=26.110';
import {buildDriverColors,calculateTotalsFromRoutes,getDriverStatsFromRoutes,calculateRouteTotalFromStores} from './modules/routes/metrics.js?v=26.110';
import {createStoreDirectoryHandlers} from './modules/stores/storeDirectory.js?v=26.110';
import {createDriverDirectoryHandlers} from './modules/drivers/driverDirectory.js?v=26.110';
import {sendDriverExpirationAlertEmail} from './modules/drivers/driverAlerts.js?v=26.110';
import {createEquipmentDirectoryHandlers} from './modules/trucks/equipmentDirectory.js?v=26.110';
import {importDataFromFile} from './modules/data/importData.js?v=26.110';
import {setupBootstrapData} from './modules/data/bootstrapData.js?v=26.110';
import {logActivityEntry,loadActivityLogEntries} from './modules/activity/activityLog.js?v=26.110';
import {useAccountsInvoices} from './tabs/accounts/useAccountsInvoices.js?v=26.110';
import {getTodayInTimezoneValue,getTomorrowInTimezoneValue,isFutureDateInTimezone} from './modules/time/dateUtils.js?v=26.110';
import {findCurrentUserData,buildEffectivePermissions,canAccessTabByPermissions,canEditTabByPermissions,canPerformActionByPermissions} from './modules/security/permissions.js?v=26.110';
import {getWeekDatesForDate,formatDateDisplayValue,formatDayNameShort,formatDayNumberValue,formatPhoneNumberValue,formatCurrencyValue,escapeHtmlValue,isDateTodayInTimezone,getNavigatedWeekDate} from './modules/utils/formatters.js?v=26.110';
import {parseCsvText} from './modules/utils/csv.js?v=26.110';
import {createStoresTabProps} from './modules/tabs/storesTabProps.js?v=26.110';
import {getSyncStatusDisplayValue} from './modules/sync/syncStatus.js?v=26.110';

// ╔╗
// ║  SECTION 1: CONFIGURATION & SETUP                                             ║
// ║  Supabase client initialization and global constants                          ║
// ╚
const{useState,useCallback,useEffect,useRef,useMemo}=React;// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL='https://pnienewghjsxrumcenfp.supabase.co';const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuaWVuZXdnaGpzeHJ1bWNlbmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNTkwNTEsImV4cCI6MjA3OTgzNTA1MX0.LBLTDLgVvW85ogQYSFyShEkKtg8_HenWzyLFvLq3ru8';const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);// Global handler for auth token errors - redirect to login gracefully
if(window.__authUnhandledRejectionHandler){window.removeEventListener('unhandledrejection',window.__authUnhandledRejectionHandler);}window.__authUnhandledRejectionHandler=event=>{const error=event.reason;if(error?.name==='AuthApiError'||error?.message?.includes('Refresh Token')){console.warn(' Session expired, please log in again');event.preventDefault();// Suppress ugly console error
// Force sign out to clear stale tokens
supabase.auth.signOut().catch(()=>{});}};window.addEventListener('unhandledrejection',window.__authUnhandledRejectionHandler);// ─────────────────────────────────────────────────────────────────────────────
// APP VERSION - Update this when deploying new versions
// ─────────────────────────────────────────────────────────────────────────────
const APP_VERSION='26.110';const APP_BUILD_DATE='2026-01-23';const IS_BETA_BUILD=true;window.APP_VERSION=APP_VERSION;window.APP_BUILD_DATE=APP_BUILD_DATE;window.APP_IS_BETA=IS_BETA_BUILD;const deferredCacheWrite=(key,data)=>{const doWrite=()=>{try{localStorage.setItem(key,typeof data==='string'?data:JSON.stringify(data));}catch(e){console.warn('Cache write error:',e);}};if('requestIdleCallback' in window){requestIdleCallback(doWrite,{timeout:2000});}else{setTimeout(doWrite,0);}};// ─────────────────────────────────────────────────────────────────────────────
// SENTRY ERROR MONITORING - Added v1.997
// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Sentry DSN configured for Elite Cold Storage
// https://sentry.io → Settings → Projects → [Your Project] → Client Keys
const SENTRY_DSN='https://24c836424db8cc061f59521932ff4d3d@o4510568624750592.ingest.us.sentry.io/4510568632549376';// Sentry init function - called after async script loads
window.initSentry=function(){if(typeof Sentry!=='undefined'&&SENTRY_DSN!=='YOUR_DSN_HERE'){Sentry.init({dsn:SENTRY_DSN,release:'logistics-dashboard@'+APP_VERSION,environment:window.location.hostname==='localhost'?'development':'production',// Capture 100% of errors (recommended for small apps)
tracesSampleRate:1.0,// Filter out common non-actionable errors
ignoreErrors:['ResizeObserver loop limit exceeded','ResizeObserver loop completed with undelivered notifications','Network request failed','Load failed','Failed to fetch'],// Scrub sensitive data before sending
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
const buildActiveUsersFromState=buildActiveUsersFromPresence;
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
const loadDateRoutes=useCallback(async date=>{try{console.log('📅 Loading routes for date:',date);setSyncStatus('syncing');const{data:routesData,error:routesError}=await supabase.from('logistics_routes').select('*').eq('route_date',date).order('route_order',{ascending:true});if(routesError){console.error('Routes load error:',routesError);setSyncStatus('error');return;}enterServerUpdate();try{const loadedRoutes=routesData?routesData.map(mapRouteRecordToClientRoute):[];setRoutesByDate(prev=>({...prev,[date]:loadedRoutes}));console.log(`📊 Loaded ${loadedRoutes.length} routes for ${date}`);}finally{setTimeout(()=>exitServerUpdate(),300);}setSyncStatus('synced');}catch(error){console.error('Error loading date routes:',error);setSyncStatus('error');}},[]);const setSelectedDate=useCallback(newDate=>{// If there's a pending save timer, clear it and save immediately
if(saveTimeoutRef.current&&pendingSaveDataRef.current){console.log('📅 Date change: Flushing pending save before navigation');clearTimeout(saveTimeoutRef.current);saveTimeoutRef.current=null;// The pendingSaveDataRef will contain the function to call
if(pendingSaveDataRef.current){pendingSaveDataRef.current();pendingSaveDataRef.current=null;}}// Load routes for the new date from database
loadDateRoutes(newDate);setSelectedDateState(newDate);},[loadDateRoutes]);// PERFORMANCE: Load cached data from localStorage for instant startup
// PERFORMANCE: Load cached data from localStorage for instant startup (only once)
const[cachedData]=useState(()=>{try{const cached=localStorage.getItem('logistics_cache');if(cached){const data=JSON.parse(cached);// Only use cache if less than 1 hour old
if(data.timestamp&&Date.now()-data.timestamp<3600000){return data;}}}catch(e){console.warn('Cache read error:',e);}return null;});// Routes stored by date - use cache for instant display
const[routesByDate,setRoutesByDate]=useState(cachedData?.routesByDate||{});const[dateRouteCounts,setDateRouteCounts]=useState({});// Lightweight counts for date tabs
// Get routes for selected date (or empty array if none)
const routes=routesByDate[selectedDate]||[];// Set routes for selected date - uses ref to always get current selectedDate
const setRoutes=useCallback(newRoutesOrUpdater=>{// Only mark pending changes if this is a LOCAL edit, not a server update
if(!isFromServer.current){hasPendingChanges.current=true;lastInteractionTime.current=Date.now();console.log('setRoutes called (local edit) - hasPendingChanges set to true');}else{console.log('setRoutes called (from server) - hasPendingChanges NOT set');}setRoutesByDate(prev=>{const currentDate=selectedDateRef.current;const currentRoutes=prev[currentDate]||[];const newRoutes=typeof newRoutesOrUpdater==='function'?newRoutesOrUpdater(currentRoutes):newRoutesOrUpdater;return{...prev,[currentDate]:newRoutes};});},[]);const[storesDirectory,setStoresDirectory]=useState(cachedData?.storesDirectory||[]);const[driversDirectory,setDriversDirectory]=useState(cachedData?.driversDirectory||[]);const[trucksDirectory,setTrucksDirectory]=useState(cachedData?.trucksDirectory||[]);const[trailersDirectory,setTrailersDirectory]=useState(cachedData?.trailersDirectory||[]);const[tractorsDirectory,setTractorsDirectory]=useState(cachedData?.tractorsDirectory||[]);const[palletTypes,setPalletTypes]=useState(cachedData?.palletTypes||[]);const[truckSubTab,setTruckSubTab]=useState('Equipment');const[equipmentType,setEquipmentType]=useState('Trucks');const[aiLogisticsSubTab,setAiLogisticsSubTab]=useState('Pallet Setup');const[driversSubTab,setDriversSubTab]=useState('Driver Directory');const[driverStatusFilter,setDriverStatusFilter]=useState('All');const[driverSortField,setDriverSortField]=useState(null);const[driverSortDirection,setDriverSortDirection]=useState('asc');const[driverPrintModal,setDriverPrintModal]=useState(false);const[driverPrintStatus,setDriverPrintStatus]=useState('All');const[driverPrintSortField,setDriverPrintSortField]=useState('lastName');const[driverPrintSortDirection,setDriverPrintSortDirection]=useState('asc');const[driverPrintFields,setDriverPrintFields]=useState({firstName:true,lastName:true,phone:true,email:true,license:true,dlNumber:true,dlState:true,dob:false,licenseExp:true,mcExp:true,truck:true,status:true,hireDate:false});const[settingsSubTab,setSettingsSubTab]=useState('Users Management');const[manifestFormat,setManifestFormat]=useState(()=>{const saved=localStorage.getItem('pbnewmans_manifestFormat');return saved||'simple-list';});const[compactMode,setCompactMode]=useState(()=>{const saved=localStorage.getItem('pbnewmans_compactMode');return saved||'normal';});const[reportsSubTab,setReportsSubTab]=useState('Daily Summary');const[reportDateRange,setReportDateRange]=useState(()=>{const today=new Date();const weekAgo=new Date(today);weekAgo.setDate(weekAgo.getDate()-7);return{start:weekAgo.toLocaleDateString('en-CA'),end:today.toLocaleDateString('en-CA')};});const{accountsSubTab,setAccountsSubTab,storeRatesSearch,setStoreRatesSearch,invoiceDateRange,setInvoiceDateRange,invoiceManualItems,setInvoiceManualItems,invoiceNumber,setInvoiceNumber,showInvoicePreview,setShowInvoicePreview,invoiceViewMode,setInvoiceViewMode,savedInvoices,setSavedInvoices,editingInvoiceId,setEditingInvoiceId,editingInvoiceUpdatedAt,setEditingInvoiceUpdatedAt,invoiceRateOverrides,setInvoiceRateOverrides,invoiceRoutes,setInvoiceRoutes,invoiceRoutesLoading,setInvoiceRoutesLoading,calculateInvoiceData}=useAccountsInvoices({React,cachedData,supabase,storesDirectory});const[activeTab,setActiveTab]=useState('Overview');const[expandedRoutes,setExpandedRoutes]=useState(initialRoutes.map(r=>r.id));const[syncStatus,setSyncStatus]=useState('connecting');const[syncDebugEnabled,setSyncDebugEnabledState]=useState(()=>{try{return window.isSyncDebugEnabled?window.isSyncDebugEnabled():false;}catch(e){return false;}});const[syncHealth,setSyncHealth]=useState(()=>({presence:'INIT',routes:'INIT',broadcastDelete:'INIT',broadcastUpdate:'INIT',lastPresenceAt:null,lastRoutesAt:null,lastBroadcastAt:null}));const[syncEvents,setSyncEvents]=useState([]);// Store search and sort
const[storeSearch,setStoreSearch]=useState('');const[activityLog,setActivityLog]=useState([]);const[activityLogFilter,setActivityLogFilter]=useState({dateRange:'7days',user:'',entityType:'',search:''});const[activityLogLoading,setActivityLogLoading]=useState(false);const[storeSort,setStoreSort]=useState({field:'code',direction:'asc'});const pushSyncEvent=useCallback((message,meta={})=>{setSyncEvents(prev=>{const next=[...prev,{time:new Date().toISOString(),message,...meta}];if(next.length>200){next.splice(0,next.length-200);}return next;});},[]);const setSyncDebugEnabled=useCallback(enabled=>{const normalized=!!enabled;if(typeof window!=='undefined'&&typeof window.setSyncDebug==='function'){window.setSyncDebug(normalized);}setSyncDebugEnabledState(normalized);},[]);const copySyncLogs=useCallback(async()=>{try{const lines=syncEvents.map(e=>`[${e.time}] ${e.message}`).join('\\n');await navigator.clipboard.writeText(lines||'');alert('Logs copied to clipboard');}catch(err){alert('Copy failed: '+err.message);}},[syncEvents]);// Auto-expand all routes when selected date changes
useEffect(()=>{const currentRoutes=routesByDate[selectedDate]||[];setExpandedRoutes(currentRoutes.map(r=>r.id));},[selectedDate,routesByDate]);const[lastUpdated,setLastUpdated]=useState(null);const[userName,setUserName]=useState(()=>user?.user_metadata?.full_name||user?.email?.split('@')[0]||'');const userNameRef=useRef(userName);// Ref for use in subscription closure
userNameRef.current=userName;// Keep ref in sync with state
const userRef=useRef(user);// Ref for stable logout callback
userRef.current=user;// Keep ref in sync with auth state
const[showNameModal,setShowNameModal]=useState(false);const[showUserMenu,setShowUserMenu]=useState(false);const[showDisplayModeMenu,setShowDisplayModeMenu]=useState(false);const[showAccountsMenu,setShowAccountsMenu]=useState(false);const[moveStoreModal,setMoveStoreModal]=useState(null);const[mapViewer,setMapViewer]=useState({open:false,routeId:null,title:'',stops:[],externalUrl:''});// Undo system - 5 levels
const[undoStack,setUndoStack]=useState([]);const[undoToast,setUndoToast]=useState(null);// { message, remaining }
const MAX_UNDO_LEVELS=5;// Push to undo stack (call before making changes)
const pushUndo=useCallback((description,routeId,previousRoutes)=>{setUndoStack(prev=>{const newStack=[...prev,{description,routeId,routeDate:selectedDateRef.current,previousRoutes:JSON.parse(JSON.stringify(previousRoutes)),// Deep clone
timestamp:Date.now()}];// Keep only last 5
return newStack.slice(-MAX_UNDO_LEVELS);});},[]);// Undo last change
const undoLastChange=useCallback(()=>{setUndoStack(prev=>{if(prev.length===0)return prev;const lastUndo=prev[prev.length-1];const newStack=prev.slice(0,-1);// Restore the previous routes - mark as user change so it saves
hasPendingChanges.current=true;setRoutesByDate(prevRoutes=>({...prevRoutes,[lastUndo.routeDate]:lastUndo.previousRoutes}));// Show toast
setUndoToast({message:`Undid: ${lastUndo.description}`,remaining:newStack.length});setTimeout(()=>setUndoToast(null),3000);console.log('↩ Undo:',lastUndo.description,`(${newStack.length} remaining)`);return newStack;});},[]);// Ctrl+Z keyboard handler
useEffect(()=>{const handleKeyDown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){// Don't undo if in an input field (except our route inputs)
const activeEl=document.activeElement;const tagName=activeEl?.tagName?.toLowerCase();if(tagName==='textarea')return;if(tagName==='input'&&activeEl.type!=='text'&&activeEl.type!=='number')return;e.preventDefault();undoLastChange();}};window.addEventListener('keydown',handleKeyDown);return()=>window.removeEventListener('keydown',handleKeyDown);},[undoLastChange]);const[storeSearchModal,setStoreSearchModal]=useState(null);// { routeId, storeId }
const[storeSearchQuery,setStoreSearchQuery]=useState('');const[storeSearchIndex,setStoreSearchIndex]=useState(0);const[permissionsModal,setPermissionsModal]=useState(null);// { userId, userName, role, permissions }
const[deleteConfirmModal,setDeleteConfirmModal]=useState(null);// { type, id, name, onConfirm }
const[showLogoutModal,setShowLogoutModal]=useState(false);// Logout confirmation modal
const[storeChangeConfirmModal,setStoreChangeConfirmModal]=useState(null);// { fromCode, fromName, toCode, toName, onConfirm }
const[infoModal,setInfoModal]=useState(null);// { type: 'success'|'info'|'warning', title, message, details }
const[driverViewModal,setDriverViewModal]=useState(null);// driver object to view
const[routeMapModal,setRouteMapModal]=useState(null);// { routeName, stops, gmapsUrl }
const[expirationAlertsModal,setExpirationAlertsModal]=useState(false);const[showWeekCalendar,setShowWeekCalendar]=useState(false);const[showOnlineUsers,setShowOnlineUsers]=useState(false);const[copyRoutesModal,setCopyRoutesModal]=useState(null);// { sourceDate, keepDrivers, keepTrucks, clearPallets }
const[versionMismatch,setVersionMismatch]=useState(null);// { serverVersion } - shows update required modal
// Version check helper - compares version strings (e.g., "26.42" > "26.41")
const isNewerVersion=(serverVersion,localVersion)=>{if(!serverVersion||!localVersion)return false;const serverParts=serverVersion.split('.').map(Number);const localParts=localVersion.split('.').map(Number);for(let i=0;i<Math.max(serverParts.length,localParts.length);i++){const server=serverParts[i]||0;const local=localParts[i]||0;if(server>local)return true;if(server<local)return false;}return false;};// Close online users dropdown when clicking outside
useEffect(()=>{const handleClickOutside=e=>{if(showOnlineUsers&&!e.target.closest('.online-users-dropdown')){setShowOnlineUsers(false);}};document.addEventListener('click',handleClickOutside);return()=>document.removeEventListener('click',handleClickOutside);},[showOnlineUsers]);// Close display mode dropdown when clicking outside
useEffect(()=>{const handleClickOutside=e=>{if(showDisplayModeMenu&&!e.target.closest('.display-mode-dropdown')){setShowDisplayModeMenu(false);}};document.addEventListener('click',handleClickOutside);return()=>document.removeEventListener('click',handleClickOutside);},[showDisplayModeMenu]);useEffect(()=>{const handleAccountsMenuOutside=e=>{if(showAccountsMenu&&!e.target.closest('.accounts-nav-dropdown')){setShowAccountsMenu(false);}};document.addEventListener('click',handleAccountsMenuOutside);return()=>document.removeEventListener('click',handleAccountsMenuOutside);},[showAccountsMenu]);// Set Sentry user context for error tracking (Added v1.997)
useEffect(()=>{if(typeof Sentry!=='undefined'&&user&&userName){Sentry.setUser({id:user.id,email:user.email,username:userName});}},[user,userName]);const[expirationAlertDays,setExpirationAlertDays]=useState(()=>{const saved=localStorage.getItem('expirationAlertDays');return saved?parseInt(saved):30;});const[selectedAlertRecipients,setSelectedAlertRecipients]=useState([]);const[activeUsers,setActiveUsers]=useState([]);const[presenceConnected,setPresenceConnected]=useState(false);const presenceConnectedRef=useRef(false);// Ref for use in timers/callbacks
const[isOnline,setIsOnline]=useState(navigator.onLine);const[needsReload,setNeedsReload]=useState(false);const offlineTimestamp=useRef(null);// Inactivity timeout (1 hour) - using refs to avoid re-binding listeners
const lastActivityRef=useRef(Date.now());const[showInactivityWarning,setShowInactivityWarning]=useState(false);const showInactivityWarningRef=useRef(false);const INACTIVITY_TIMEOUT=60*60*1000;// 1 hour in ms
const INACTIVITY_WARNING=55*60*1000;// 55 minutes in ms
// Data protection - track last successful save
const[lastSuccessfulSave,setLastSuccessfulSave]=useState(null);const[showDataProtectionPanel,setShowDataProtectionPanel]=useState(false);const[timezone,setTimezone]=useState(()=>{const saved=localStorage.getItem('logisticsTimezone');return saved||'America/New_York';});const[pcMilerSettings,setPcMilerSettings]=useState(()=>{const saved=localStorage.getItem('pcMilerSettings');return saved?JSON.parse(saved):{// API keys are now stored server-side in Supabase Secrets
// These fields are kept for backward compatibility but ignored
apiKey:'',googleMapsKey:'',geoapifyKey:'',// Routing options (still configurable client-side)
geoapifyTruckMode:'truck',geoapifyRouteType:'balanced',geoapifyTraffic:'free_flow',geoapifyAvoid:'none',roundTrip:false,vehicleType:'Truck',routeType:'Practical',distanceUnits:'Miles',originAddress:'110 Middlesex Ave, Carteret, NJ 07008',originName:'Newmans Refrigerated Service'};});const[bolSettings,setBolSettings]=useState(()=>{const saved=localStorage.getItem('bolSettings');return saved?JSON.parse(saved):{companyName:'Newmans Refrigerated Service, Inc.',companyAddress:'110 Middlesex Avenue, Carteret, NJ 07008',documentTitle:'DELIVERY REPORT',instructions:'Set reefer unit to 0°F for frozen pallets',contactName:'Anand Allan',contactPhone:'(646) 549-1335',palletColumns:9,emptyRows:8,palletColumnWidth:28,totalColumnWidth:22,fontSizeTitle:22,fontSizePalletValue:12,fontSizePalletType:8,fontSizeTotals:10,fontSizeStoreInfo:11,showMiles:true,showDriveTime:true,showTotalTime:true,showInspectionSection:true,showNotesSection:true,showSignatureSection:true,mergeIndicatorStyle:'arrow-orange',// arrow-orange, arrow-black, bracket, line-thick, line-double, none
printBackgroundGraphics:true,printHeadersFooters:false};});// Save BOL settings when changed
useEffect(()=>{localStorage.setItem('bolSettings',JSON.stringify(bolSettings));},[bolSettings]);// Save manifest format when changed
useEffect(()=>{localStorage.setItem('pbnewmans_manifestFormat',manifestFormat);},[manifestFormat]);const[usersDirectory,setUsersDirectory]=useState([]);const[usersLoading,setUsersLoading]=useState(true);const[userSearch,setUserSearch]=useState('');const[userSort,setUserSort]=useState({field:'name',direction:'asc'});const[userDeleteModal,setUserDeleteModal]=useState(null);const saveTimeoutRef=useRef(null);const isInitialLoad=useRef(true);const serverUpdateDepth=useRef(0);// Counter for nested server updates (prevents race conditions)
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
const dirtyFieldsByRoute=useRef({});// Helper: Mark a field as dirty for a route
const markFieldDirty=useCallback((routeId,fieldName)=>{if(!dirtyFieldsByRoute.current[routeId]){dirtyFieldsByRoute.current[routeId]=new Set();}dirtyFieldsByRoute.current[routeId].add(fieldName);hasPendingChanges.current=true;console.log(` Dirty: ${routeId} -> ${fieldName}`,Array.from(dirtyFieldsByRoute.current[routeId]));},[]);// Helper: Clear dirty fields for a route (after save)
const clearDirtyFields=useCallback(routeId=>{if(routeId){delete dirtyFieldsByRoute.current[routeId];}else{// Clear all
dirtyFieldsByRoute.current={};}},[]);// Helper: Merge server route with local dirty fields (Excel-like)
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
const handleLogout=useCallback(async()=>{if(isLoggingOutRef.current){console.log('Logout already in progress...');return;}isLoggingOutRef.current=true;// Prevent any reconnect logic immediately
try{// Log logout activity before signing out (use ref for userName)
const currentUser=userRef.current;const currentUserName=userNameRef.current;if(currentUser){await supabase.from('activity_log').insert({user_id:currentUser.id,user_name:currentUserName||currentUser.email,action_type:'logout',entity_type:'session',entity_id:currentUser.id,entity_name:'User Session',field_changed:null,old_value:null,new_value:'Logged out',route_date:null});}// Clean up presence before signing out
if(presenceChannelRef.current){try{console.log('👋 Untracking presence on logout...');
await presenceChannelRef.current.untrack();supabase.removeChannel(presenceChannelRef.current);presenceChannelRef.current=null;setPresenceConnected(false);presenceConnectedRef.current=false;console.log('✅ Presence cleaned up on logout');}catch(presenceErr){console.warn('Presence cleanup error (non-critical):',presenceErr);}}// Clean up routes subscription
if(routesSubscriptionRef.current){try{supabase.removeChannel(routesSubscriptionRef.current);routesSubscriptionRef.current=null;console.log('✅ Routes subscription cleaned up');}catch(e){console.warn('Routes cleanup error:',e);}}// Clean up broadcast channels
if(deleteChannelRef.current){try{supabase.removeChannel(deleteChannelRef.current);deleteChannelRef.current=null;}catch(e){}}if(updateChannelRef.current){try{supabase.removeChannel(updateChannelRef.current);updateChannelRef.current=null;}catch(e){}}// CRITICAL: Clear auth token BEFORE signOut to prevent rehydration
const clearAuthStorage=()=>{try{localStorage.removeItem('sb-pnienewghjsxrumcenfp-auth-token');localStorage.removeItem('supabase.auth.token');Object.keys(localStorage).forEach(key=>{if(key.startsWith('sb-')||key.includes('supabase'))localStorage.removeItem(key);});}catch(e){}};clearAuthStorage();// Clear BEFORE signOut
const{error}=await supabase.auth.signOut({scope:'global'});if(error){console.error('SignOut returned error:',error);throw error;}console.log('✅ Logout complete');}catch(e){console.error('Logout error:',e);// Fallback: ensure local session is gone
try{localStorage.removeItem('sb-pnienewghjsxrumcenfp-auth-token');Object.keys(localStorage).forEach(key=>{if(key.startsWith('sb-'))localStorage.removeItem(key);});}catch(e2){}}finally{// Always clear UI state regardless of signOut result
setPresenceConnected(false);presenceConnectedRef.current=false;isLoggingOutRef.current=false;}},[]);const formatDateDisplay=formatDateDisplayValue;const formatDayName=formatDayNameShort;const formatDayNumber=formatDayNumberValue;const formatPhoneNumber=formatPhoneNumberValue;const formatCurrency=formatCurrencyValue;const escapeHtml=escapeHtmlValue;const isToday=dateStr=>isDateTodayInTimezone(dateStr,timezone);const navigateWeek=direction=>{setSelectedDate(getNavigatedWeekDate(selectedDate,direction));};const copyRoutesFromDate=(fromDate,options={})=>{const{keepDrivers=false,keepTrucks=false,clearPallets=true,replaceExisting=false,sourceRoutes:sourceRoutesOverride=null}=options;// Check if current day already has routes (skip if replaceExisting)
const currentRoutes=routesByDate[selectedDate]||[];if(currentRoutes.length>0&&!replaceExisting){setInfoModal({type:'warning',title:'Cannot Copy Routes',message:'This day already has existing routes.',details:[{label:'Current Date',value:selectedDate},{label:'Existing Routes',value:currentRoutes.length+' route(s)',highlight:true}],note:'Please delete existing routes first or select an empty day.'});return;}const sourceRoutes=Array.isArray(sourceRoutesOverride)?sourceRoutesOverride:routesByDate[fromDate]||[];if(sourceRoutes.length===0){setInfoModal({type:'warning',title:'No Routes to Copy',message:'The selected date has no routes to copy.',details:[{label:'Source Date',value:fromDate}]});return;}// Generate UUID helper
const generateUUID=()=>{return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){const r=Math.random()*16|0;const v=c==='x'?r:r&0x3|0x8;return v.toString(16);});};// Deep copy routes with new UUIDs - respect options
const copiedRoutes=sourceRoutes.map((route,idx)=>({...route,id:generateUUID(),route_order:idx,// Keep or clear driver based on option
driver:keepDrivers?route.driver:'',// Keep or clear truck/trailer based on option
truck:keepTrucks?route.truck:'',trailer:keepTrucks?route.trailer:'',confirmed:false,// Always reset confirmation status for new day
confirmedBy:null,confirmedAt:null,palletCount:8,// Ensure 8 columns
stores:route.stores.map((store,sIdx)=>({...store,id:Date.now()+idx*100+sIdx,// Clear or keep pallets based on option
pallets:clearPallets?['','','','','','','','']:[...(store.pallets||[])],// Set default pallet types: 6 FZ, 1 DR, 1 FH
palletTypes:clearPallets?['FZ','FZ','FZ','FZ','FZ','FZ','DR','FH']:[...(store.palletTypes||['FZ','FZ','FZ','FZ','FZ','FZ','DR','FH'])],palletLinks:[false,false,false,false,false,false,false,false],cases:clearPallets?['','','','','','','','']:[...(store.cases||[])],// Clear total cases (TC) if clearing pallets
tc:clearPallets?0:store.tc||0,// Clear ALL notes fields always
notes:'',internalNotes:'',driverNotes:''}))}));// Mark pending changes to prevent real-time sync from overwriting
hasPendingChanges.current=true;setRoutesByDate(prev=>({...prev,[selectedDate]:copiedRoutes}));setExpandedRoutes(copiedRoutes.map(r=>r.id));console.log('📋 Copied',copiedRoutes.length,'routes from',fromDate,'to',selectedDate,'options:',options);// Show styled confirmation modal
const totalStores=copiedRoutes.reduce((sum,r)=>sum+r.stores.length,0);const optionsUsed=[];if(keepDrivers)optionsUsed.push('Driver assignments kept');if(keepTrucks)optionsUsed.push('Truck/trailer assignments kept');if(!clearPallets)optionsUsed.push('Pallet counts copied');setInfoModal({type:'success',title:'Routes Copied Successfully',message:'Route structure has been copied to the selected date.',details:[{label:'From Date',value:fromDate},{label:'To Date',value:selectedDate},{label:'Routes Copied',value:copiedRoutes.length+' route(s)',highlight:true},{label:'Stores Copied',value:totalStores+' store(s)',highlight:true}],note:optionsUsed.length>0?'✓ '+optionsUsed.join(' • '):'📋 Stores copied with fresh pallet counts. Notes were cleared.'});};// Get dates that have routes (for showing indicators)
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
const events=['mousedown','keydown','scroll'];// mousemove removed - fires too frequentlyevents.forEach(event=>{window.addEventListener(event,updateActivity,{passive:true});});// Check for inactivity every minute
const checkInactivity=setInterval(()=>{const now=Date.now();const timeSinceActivity=now-lastActivityRef.current;if(timeSinceActivity>=INACTIVITY_TIMEOUT){// Auto logout after 1 hour
console.log('Inactivity timeout - logging out');handleLogout();}else if(timeSinceActivity>=INACTIVITY_WARNING&&!showInactivityWarningRef.current){// Show warning at 55 minutes
setShowInactivityWarning(true);}},60000);// Check every minute
return()=>{events.forEach(event=>{window.removeEventListener(event,updateActivity);});clearInterval(checkInactivity);};},[userName,handleLogout]);// Setup presence tracking
useEffect(()=>{// Keep ref in sync with state for use in timers
presenceConnectedRef.current=presenceConnected;},[presenceConnected]);useEffect(()=>setupPresenceTracking({supabase,user,userName,selectedDateRef,sessionId,presenceChannelRef,presenceConnectedRef,isLoggingOutRef,hasTrackedOnceRef,setActiveUsers,setPresenceConnected,buildActiveUsersFromState,handleLogout,onStatusChange:status=>{setSyncHealth(prev=>({...prev,presence:status,lastPresenceAt:new Date().toISOString()}));pushSyncEvent('Presence status: '+status,{type:'presence',status:status});},onTrackSuccess:()=>{setSyncHealth(prev=>({...prev,lastPresenceAt:new Date().toISOString()}));}}),[userName,handleLogout,pushSyncEvent]);// Re-track presence when selected date changes to update other users
useEffect(()=>{syncPresenceDate({presenceChannelRef,userName,user,presenceConnectedRef,selectedDate});},[selectedDate]);// Load data from Supabase on mount
useEffect(()=>setupBootstrapData({supabase,selectedDateRef,userName,userNameRef,hasPendingChanges,IS_BETA_BUILD,isNewerVersion,APP_VERSION,setVersionMismatch,enterServerUpdate,exitServerUpdate,setRoutesByDate,setDateRouteCounts,setStoresDirectory,setDriversDirectory,setTrucksDirectory,setTrailersDirectory,setTractorsDirectory,setPalletTypes,setSavedInvoices,setLastUpdated,lastSavedConfig,lastSavedData,deferredCacheWrite,setSyncStatus,isInitialLoad}),[]);// BROADCAST CHANNELS - subscribe once on mount, not per-date
// These don't filter by date at the subscription level - they check selectedDateRef in handlers
const deleteChannelRef=useRef(null);const updateChannelRef=useRef(null);useEffect(()=>setupRouteBroadcastSync({supabase,selectedDateRef,sessionId,enterServerUpdate,exitServerUpdate,setRoutesByDate,setDateRouteCounts,mapRouteRecordToClientRoute,deleteChannelRef,updateChannelRef,lastAppliedRealtimeAtByDateRef,lastRowRealtimeAtByDateRef,onDeleteStatus:status=>{setSyncHealth(prev=>({...prev,broadcastDelete:status,lastBroadcastAt:new Date().toISOString()}));pushSyncEvent('Broadcast delete status: '+status,{type:'broadcast',status:status});},onUpdateStatus:status=>{setSyncHealth(prev=>({...prev,broadcastUpdate:status,lastBroadcastAt:new Date().toISOString()}));pushSyncEvent('Broadcast update status: '+status,{type:'broadcast',status:status});},onBroadcastEvent:event=>{setSyncHealth(prev=>({...prev,lastBroadcastAt:new Date().toISOString()}));pushSyncEvent('Broadcast event '+event.type+' for '+event.routeDate,{type:'broadcast',eventType:event.type,routeDate:event.routeDate});},coalesceWindowMs:450,rowCoverageMs:900,recentApplySuppressionMs:500}),[]);// Empty deps - subscribe once on mount
// Date-specific routes subscription - only syncs routes for the selected date
const routesSubscriptionRef=useRef(null);const routesSetupIdRef=useRef(0);// Token to ignore stale route callbacks
useEffect(()=>setupDateRoutesSync({selectedDate,supabase,routesSubscriptionRef,routesSetupIdRef,enterServerUpdate,exitServerUpdate,setRoutesByDate,dirtyFieldsByRoute,mergeServerRouteIntoLocal,mapRouteRecordToClientRoute,lastAppliedRealtimeAtByDateRef,lastRowRealtimeAtByDateRef,localUserNameRef:userNameRef,recentLocalSaveByDateRouteRef,onStatusChange:(status,date)=>{setSyncHealth(prev=>({...prev,routes:status,lastRoutesAt:new Date().toISOString()}));pushSyncEvent('Routes subscription '+status+' for '+date,{type:'routes',status:status,routeDate:date});},localEchoSuppressMs:6000,fullReloadSuppressionMs:600}),[selectedDate,pushSyncEvent]);// Log activity to Supabase
const logActivity=async(actionType,entityType,entityId,entityName,fieldChanged,oldValue,newValue,routeDate=null,details=null)=>{await logActivityEntry({supabase,user,userName,actionType,entityType,entityId,entityName,fieldChanged,oldValue,newValue,routeDate,details});};
const loadActivityLog=async()=>{await loadActivityLogEntries({supabase,activityLogFilter,setActivityLog,setActivityLogLoading});};// LOCAL BACKUP: Save to localStorage before every cloud save
const saveLocalBackup=useCallback(data=>{saveLocalBackupToStorage(data);},[]);const restoreFromBackup=useCallback((backupIndex=0)=>restoreFromLocalBackup({backupIndex,enterServerUpdate,exitServerUpdate,setRoutesByDate,setStoresDirectory,setDriversDirectory,setTrucksDirectory,setTrailersDirectory,setTractorsDirectory,setPalletTypes,setSavedInvoices,hasPendingChanges}),[]);const exportData=useCallback(()=>{exportBackupJson({userName,APP_VERSION,routesByDate,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes,savedInvoices});},[userName,routesByDate,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes,savedInvoices]);const saveToSupabase=useCallback(async(newRoutesByDate,newStoresDirectory,newDriversDirectory,newTrucksDirectory,newTrailersDirectory,newTractorsDirectory,newPalletTypes,newSavedInvoices)=>{await saveToSupabasePipeline({supabase,userName,IS_BETA_BUILD,APP_VERSION,newRoutesByDate,newStoresDirectory,newDriversDirectory,newTrucksDirectory,newTrailersDirectory,newTractorsDirectory,newPalletTypes,newSavedInvoices,selectedDateRef,isInitialLoad,isFromServer,lastSavedData,lastSavedConfig,setSyncStatus,saveLocalBackup,setRoutesByDate,setDateRouteCounts,updateChannelRef,sessionId,dirtyFieldsByRoute,recentLocalSaveByDateRouteRef,clearDirtyFields,hasPendingChanges,editedStores,lastEditTime,setLastUpdated,setLastSuccessfulSave});},[userName,saveLocalBackup]);useEffect(()=>setupDebouncedSave({isInitialLoad,isFromServer,hasPendingChanges,saveTimeoutRef,pendingSaveDataRef,routesByDate,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes,savedInvoices,saveToSupabase}),[routesByDate,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes,savedInvoices,saveToSupabase]);useEffect(()=>{if(!hasPendingChanges.current)return;if(isInitialLoad.current||isFromServer.current)return;if(saveTimeoutRef.current||pendingSaveDataRef.current)return;if(Object.keys(dirtyFieldsByRoute.current).length>0)return;hasPendingChanges.current=false;editedStores.current.clear();lastEditTime.current={};console.log('🧹 Cleared stale pending edit flag (no pending save)');},[routesByDate,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes,savedInvoices]);// Check for username
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
const logFieldChange=(entityType,entityId,entityName,field,oldValue,newValue,routeDate=null)=>{if(oldValue===newValue)return;logActivity('update',entityType,String(entityId),entityName,field,oldValue,newValue,routeDate);};const{updatePallet,updateStore,updateRoute,toggleRouteConfirmation}=createRouteMutationsHandlers({routes,selectedDate,userName,currentUserRole,setRoutes,pushUndo,logActivity,hasPendingChanges,lastInteractionTime,editedStores,lastEditTime,markFieldDirty});const{addStore,removeStore,moveRoute,moveStore}=createRouteStoreOpsHandlers({routes,selectedDate,setRoutes,setDeleteConfirmModal,pushUndo,logActivity,hasPendingChanges,markFieldDirty});const{addRoute,removeRoute,copyRoute}=createRouteCrudHandlers({routes,routesByDate,selectedDate,userName,sessionId,supabase,setRoutes,setExpandedRoutes,setDateRouteCounts,setDeleteConfirmModal,pushUndo,logActivity,enterServerUpdate,exitServerUpdate,lastSavedData,hasPendingChanges,editedStores,lastEditTime,clearDirtyFields,deleteChannelRef,updateChannelRef});// Sort pallets by type for a single store (using palletTypes config order)
const sortStorePalletsByType=(routeId,storeId,palletTypesConfig)=>{if(!palletTypesConfig||palletTypesConfig.length===0)return;setRoutes(prev=>prev.map(route=>{if(route.id!==routeId)return route;const newStores=route.stores.map(store=>{if(store.id!==storeId)return store;const palletsList=store.pallets||[];const types=store.palletTypes||[];const links=store.palletLinks||[];// Create array of pallet data with indices
const palletData=palletsList.map((value,idx)=>{const rawType=types[idx]||palletTypesConfig[0]?.abbrev||'FZ';// Normalize old format (F, D, S) to new format (FZ, DR, SP)
const normalizedType=rawType==='F'?'FZ':rawType==='D'?'DR':rawType==='S'?'SP':rawType;return{value,type:normalizedType,link:links[idx]||false,hasValue:value!==null&&value!==undefined&&value!==''};});// Separate filled and empty pallets
const filled=palletData.filter(p=>p.hasValue);const empty=palletData.filter(p=>!p.hasValue);// Sort filled pallets by palletTypes order (not alphabetically)
filled.sort((a,b)=>{const aIndex=palletTypesConfig.findIndex(pt=>pt.abbrev===a.type);const bIndex=palletTypesConfig.findIndex(pt=>pt.abbrev===b.type);// If type not found, put at end
const aOrder=aIndex>=0?aIndex:999;const bOrder=bIndex>=0?bIndex:999;return aOrder-bOrder;});// Combine: sorted filled pallets first, then empty slots
const sorted=[...filled,...empty];// Rebuild arrays
const newPallets=sorted.map(p=>p.value);const newTypes=sorted.map(p=>p.type);const newLinks=sorted.map(p=>p.link);return{...store,pallets:newPallets,palletTypes:newTypes,palletLinks:newLinks};});return{...route,stores:newStores};}));};const addPalletColumn=routeId=>{setRoutes(prev=>prev.map(route=>{if(route.id!==routeId)return route;if(route.palletCount>=MAX_PALLETS)return route;const newCount=route.palletCount+1;return{...route,palletCount:newCount,stores:route.stores.map(store=>{let newPallets=[...(store.pallets||[])];let newPalletTypes=[...(store.palletTypes||Array(route.palletCount).fill('F'))];let newPalletLinks=[...(store.palletLinks||Array(route.palletCount).fill(false))];while(newPallets.length<newCount){newPallets.push(null);newPalletTypes.push('F');newPalletLinks.push(false);}return{...store,pallets:newPallets,palletTypes:newPalletTypes,palletLinks:newPalletLinks};})};}));};const removePalletColumn=routeId=>{setRoutes(prev=>prev.map(route=>{if(route.id!==routeId)return route;if(route.palletCount<=MIN_PALLETS)return route;// Check if the last column is empty for all stores
const lastColumnIndex=route.palletCount-1;const lastColumnHasData=route.stores.some(store=>{const pallets=store.pallets||[];return pallets[lastColumnIndex]!==null&&pallets[lastColumnIndex]!==undefined;});if(lastColumnHasData){alert('Cannot remove column - it contains data. Clear the values first.');return route;}const newCount=route.palletCount-1;return{...route,palletCount:newCount,stores:route.stores.map(store=>{const pallets=store.pallets||[];const newPallets=pallets.slice(0,newCount);const newPalletTypes=(store.palletTypes||Array(route.palletCount).fill('F')).slice(0,newCount);const newPalletLinks=(store.palletLinks||Array(route.palletCount).fill(false)).slice(0,newCount);const newTc=newPallets.reduce((sum,p)=>sum+(typeof p==='number'?p:0),0);return{...store,pallets:newPallets,palletTypes:newPalletTypes,palletLinks:newPalletLinks,tc:newTc};})};}));};// ─────────────────────────────────────────────────────────────────────────
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
const importData=event=>{importDataFromFile({event,setRoutesByDate,setStoresDirectory,setDriversDirectory,setTrucksDirectory,setTrailersDirectory,setTractorsDirectory,setPalletTypes});};const totals=calculateTotals();const statusDisplay=getSyncStatusDisplayValue({syncStatus,needsReload,isOnline:navigator.onLine});// ─────────────────────────────────────────────────────────────────────────
// ╔╗
// ║  SECTION 12: MAIN RENDER - UI TABS                                          ║
// ║  Tab navigation, Overview, Print Options, Store Directory, etc.             ║
// ╚
// ─────────────────────────────────────────────────────────────────────────
const app=useMemo(()=>({
React:typeof React==='undefined'?undefined:React,
addPalletColumn:typeof addPalletColumn==='undefined'?undefined:addPalletColumn,
addRoute:typeof addRoute==='undefined'?undefined:addRoute,
addStore:typeof addStore==='undefined'?undefined:addStore,
calculateRouteTotal:typeof calculateRouteTotal==='undefined'?undefined:calculateRouteTotal,
copyRoute:typeof copyRoute==='undefined'?undefined:copyRoute,
currentUserRole:typeof currentUserRole==='undefined'?undefined:currentUserRole,
expandedRoutes:typeof expandedRoutes==='undefined'?undefined:expandedRoutes,
generateBOL:typeof generateBOL==='undefined'?undefined:generateBOL,
handlePalletFocus:typeof handlePalletFocus==='undefined'?undefined:handlePalletFocus,
logPalletChange:typeof logPalletChange==='undefined'?undefined:logPalletChange,
moveRoute:typeof moveRoute==='undefined'?undefined:moveRoute,
moveStore:typeof moveStore==='undefined'?undefined:moveStore,
removePalletColumn:typeof removePalletColumn==='undefined'?undefined:removePalletColumn,
removeRoute:typeof removeRoute==='undefined'?undefined:removeRoute,
removeStore:typeof removeStore==='undefined'?undefined:removeStore,
setCopyRoutesModal:typeof setCopyRoutesModal==='undefined'?undefined:setCopyRoutesModal,
setMoveStoreModal:typeof setMoveStoreModal==='undefined'?undefined:setMoveStoreModal,
setRouteMapModal:typeof setRouteMapModal==='undefined'?undefined:setRouteMapModal,
setSelectedDate:typeof setSelectedDate==='undefined'?undefined:setSelectedDate,
setStoreChangeConfirmModal:typeof setStoreChangeConfirmModal==='undefined'?undefined:setStoreChangeConfirmModal,
setStoreSearchModal:typeof setStoreSearchModal==='undefined'?undefined:setStoreSearchModal,
sortStorePalletsByType:typeof sortStorePalletsByType==='undefined'?undefined:sortStorePalletsByType,
supabase:typeof supabase==='undefined'?undefined:supabase,
toggleRouteConfirmation:typeof toggleRouteConfirmation==='undefined'?undefined:toggleRouteConfirmation,
toggleRouteExpand:typeof toggleRouteExpand==='undefined'?undefined:toggleRouteExpand,
updatePallet:typeof updatePallet==='undefined'?undefined:updatePallet,
updateRoute:typeof updateRoute==='undefined'?undefined:updateRoute,
updateStore:typeof updateStore==='undefined'?undefined:updateStore,
user:typeof user==='undefined'?undefined:user,
activeTab:typeof activeTab==='undefined'?undefined:activeTab,
setActiveTab:typeof setActiveTab==='undefined'?undefined:setActiveTab,
$:typeof $==='undefined'?undefined:$,
ADMIN:typeof ADMIN==='undefined'?undefined:ADMIN,
ALL:typeof ALL==='undefined'?undefined:ALL,
APPROVAL:typeof APPROVAL==='undefined'?undefined:APPROVAL,
APP_BUILD_DATE:typeof APP_BUILD_DATE==='undefined'?undefined:APP_BUILD_DATE,
APP_VERSION:typeof APP_VERSION==='undefined'?undefined:APP_VERSION,
All:typeof All==='undefined'?undefined:All,
Analysis:typeof Analysis==='undefined'?undefined:Analysis,
Arial:typeof Arial==='undefined'?undefined:Arial,
Avenue:typeof Avenue==='undefined'?undefined:Avenue,
Avg:typeof Avg==='undefined'?undefined:Avg,
BACK:typeof BACK==='undefined'?undefined:BACK,
BEFORE:typeof BEFORE==='undefined'?undefined:BEFORE,
BILL:typeof BILL==='undefined'?undefined:BILL,
Baguette:typeof Baguette==='undefined'?undefined:Baguette,
BlinkMacSystemFont:typeof BlinkMacSystemFont==='undefined'?undefined:BlinkMacSystemFont,
CODE:typeof CODE==='undefined'?undefined:CODE,
CONFIRMED:typeof CONFIRMED==='undefined'?undefined:CONFIRMED,
Carteret:typeof Carteret==='undefined'?undefined:Carteret,
Cases:typeof Cases==='undefined'?undefined:Cases,
Checklist:typeof Checklist==='undefined'?undefined:Checklist,
Close:typeof Close==='undefined'?undefined:Close,
Code:typeof Code==='undefined'?undefined:Code,
Commercial:typeof Commercial==='undefined'?undefined:Commercial,
Count:typeof Count==='undefined'?undefined:Count,
DELIVERY:typeof DELIVERY==='undefined'?undefined:DELIVERY,
DO:typeof DO==='undefined'?undefined:DO,
DOCTYPE:typeof DOCTYPE==='undefined'?undefined:DOCTYPE,
Dashboard:typeof Dashboard==='undefined'?undefined:Dashboard,
Delivered:typeof Delivered==='undefined'?undefined:Delivered,
Deliveries:typeof Deliveries==='undefined'?undefined:Deliveries,
Delivery:typeof Delivery==='undefined'?undefined:Delivery,
Driver:typeof Driver==='undefined'?undefined:Driver,
Drivers:typeof Drivers==='undefined'?undefined:Drivers,
Excel:typeof Excel==='undefined'?undefined:Excel,
Export:typeof Export==='undefined'?undefined:Export,
First:typeof First==='undefined'?undefined:First,
GET:typeof GET==='undefined'?undefined:GET,
GRAND:typeof GRAND==='undefined'?undefined:GRAND,
IN:typeof IN==='undefined'?undefined:IN,
Inc:typeof Inc==='undefined'?undefined:Inc,
Invoice:typeof Invoice==='undefined'?undefined:Invoice,
LIST:typeof LIST==='undefined'?undefined:LIST,
LOAD:typeof LOAD==='undefined'?undefined:LOAD,
LOADING:typeof LOADING==='undefined'?undefined:LOADING,
Labels:typeof Labels==='undefined'?undefined:Labels,
List:typeof List==='undefined'?undefined:List,
Loading:typeof Loading==='undefined'?undefined:Loading,
Logistics:typeof Logistics==='undefined'?undefined:Logistics,
MANIFEST:typeof MANIFEST==='undefined'?undefined:MANIFEST,
Manifest:typeof Manifest==='undefined'?undefined:Manifest,
Metric:typeof Metric==='undefined'?undefined:Metric,
Middlesex:typeof Middlesex==='undefined'?undefined:Middlesex,
Moonachie:typeof Moonachie==='undefined'?undefined:Moonachie,
NAME:typeof NAME==='undefined'?undefined:NAME,
NJ:typeof NJ==='undefined'?undefined:NJ,
NOT:typeof NOT==='undefined'?undefined:NOT,
Name:typeof Name==='undefined'?undefined:Name,
Net:typeof Net==='undefined'?undefined:Net,
Newmans:typeof Newmans==='undefined'?undefined:Newmans,
No:typeof No==='undefined'?undefined:No,
ORDER:typeof ORDER==='undefined'?undefined:ORDER,
Overview:typeof Overview==='undefined'?undefined:Overview,
PALLET:typeof PALLET==='undefined'?undefined:PALLET,
PALLETS:typeof PALLETS==='undefined'?undefined:PALLETS,
PB$:typeof PB$==='undefined'?undefined:PB$,
PENDING:typeof PENDING==='undefined'?undefined:PENDING,
PICK:typeof PICK==='undefined'?undefined:PICK,
PLT:typeof PLT==='undefined'?undefined:PLT,
Pallet:typeof Pallet==='undefined'?undefined:Pallet,
Pallets:typeof Pallets==='undefined'?undefined:Pallets,
Paris:typeof Paris==='undefined'?undefined:Paris,
Payment:typeof Payment==='undefined'?undefined:Payment,
Percentage:typeof Percentage==='undefined'?undefined:Percentage,
Performance:typeof Performance==='undefined'?undefined:Performance,
Pick:typeof Pick==='undefined'?undefined:Pick,
Please:typeof Please==='undefined'?undefined:Please,
Print:typeof Print==='undefined'?undefined:Print,
ROUTE:typeof ROUTE==='undefined'?undefined:ROUTE,
ROUTE$:typeof ROUTE$==='undefined'?undefined:ROUTE$,
ROUTES:typeof ROUTES==='undefined'?undefined:ROUTES,
Refrigerated:typeof Refrigerated==='undefined'?undefined:Refrigerated,
Report:typeof Report==='undefined'?undefined:Report,
Roboto:typeof Roboto==='undefined'?undefined:Roboto,
Route:typeof Route==='undefined'?undefined:Route,
RouteCard:typeof RouteCard==='undefined'?undefined:RouteCard,
Routes:typeof Routes==='undefined'?undefined:Routes,
SEQUENCE:typeof SEQUENCE==='undefined'?undefined:SEQUENCE,
SERVICES:typeof SERVICES==='undefined'?undefined:SERVICES,
STOP:typeof STOP==='undefined'?undefined:STOP,
STORE:typeof STORE==='undefined'?undefined:STORE,
SUMMARY:typeof SUMMARY==='undefined'?undefined:SUMMARY,
SUPABASE_URL:typeof SUPABASE_URL==='undefined'?undefined:SUPABASE_URL,
SecureRoutingAPI:typeof SecureRoutingAPI==='undefined'?undefined:SecureRoutingAPI,
Sequence:typeof Sequence==='undefined'?undefined:Sequence,
Service:typeof Service==='undefined'?undefined:Service,
StatCard:typeof StatCard==='undefined'?undefined:StatCard,
Stops:typeof Stops==='undefined'?undefined:Stops,
Store:typeof Store==='undefined'?undefined:Store,
Stores:typeof Stores==='undefined'?undefined:Stores,
Summary:typeof Summary==='undefined'?undefined:Summary,
TC:typeof TC==='undefined'?undefined:TC,
THIS:typeof THIS==='undefined'?undefined:THIS,
TOT:typeof TOT==='undefined'?undefined:TOT,
TOTAL:typeof TOTAL==='undefined'?undefined:TOTAL,
TOTALS:typeof TOTALS==='undefined'?undefined:TOTALS,
Take:typeof Take==='undefined'?undefined:Take,
Thank:typeof Thank==='undefined'?undefined:Thank,
Total:typeof Total==='undefined'?undefined:Total,
Type:typeof Type==='undefined'?undefined:Type,
USA:typeof USA==='undefined'?undefined:USA,
Updated:typeof Updated==='undefined'?undefined:Updated,
Value:typeof Value==='undefined'?undefined:Value,
W:typeof W==='undefined'?undefined:W,
WAREHOUSE:typeof WAREHOUSE==='undefined'?undefined:WAREHOUSE,
Warehouse:typeof Warehouse==='undefined'?undefined:Warehouse,
XLSX:typeof XLSX==='undefined'?undefined:XLSX,
_:typeof _==='undefined'?undefined:_,
_________________________:typeof _________________________==='undefined'?undefined:_________________________,
a:typeof a==='undefined'?undefined:a,
a7f4b:typeof a7f4b==='undefined'?undefined:a7f4b,
aVal:typeof aVal==='undefined'?undefined:aVal,
accountsSubTab:typeof accountsSubTab==='undefined'?undefined:accountsSubTab,
activePalletTypes:typeof activePalletTypes==='undefined'?undefined:activePalletTypes,
activeProviders:typeof activeProviders==='undefined'?undefined:activeProviders,
activeUsers:typeof activeUsers==='undefined'?undefined:activeUsers,
activityLog:typeof activityLog==='undefined'?undefined:activityLog,
activityLogFilter:typeof activityLogFilter==='undefined'?undefined:activityLogFilter,
activityLogLoading:typeof activityLogLoading==='undefined'?undefined:activityLogLoading,
addDriverToDirectory:typeof addDriverToDirectory==='undefined'?undefined:addDriverToDirectory,
addStoreToDirectory:typeof addStoreToDirectory==='undefined'?undefined:addStoreToDirectory,
addTractorToDirectory:typeof addTractorToDirectory==='undefined'?undefined:addTractorToDirectory,
addTrailerToDirectory:typeof addTrailerToDirectory==='undefined'?undefined:addTrailerToDirectory,
addTruckToDirectory:typeof addTruckToDirectory==='undefined'?undefined:addTruckToDirectory,
aiLogisticsSubTab:typeof aiLogisticsSubTab==='undefined'?undefined:aiLogisticsSubTab,
align:typeof align==='undefined'?undefined:align,
all:typeof all==='undefined'?undefined:all,
already:typeof already==='undefined'?undefined:already,
also:typeof also==='undefined'?undefined:also,
always:typeof always==='undefined'?undefined:always,
and:typeof and==='undefined'?undefined:and,
apple:typeof apple==='undefined'?undefined:apple,
are:typeof are==='undefined'?undefined:are,
area:typeof area==='undefined'?undefined:area,
as:typeof as==='undefined'?undefined:as,
assignedTruck:typeof assignedTruck==='undefined'?undefined:assignedTruck,
auto:typeof auto==='undefined'?undefined:auto,
avoid:typeof avoid==='undefined'?undefined:avoid,
b:typeof b==='undefined'?undefined:b,
bVal:typeof bVal==='undefined'?undefined:bVal,
ba2:typeof ba2==='undefined'?undefined:ba2,
backup:typeof backup==='undefined'?undefined:backup,
backupHistory:typeof backupHistory==='undefined'?undefined:backupHistory,
banner:typeof banner==='undefined'?undefined:banner,
be:typeof be==='undefined'?undefined:be,
between:typeof between==='undefined'?undefined:between,
blob:typeof blob==='undefined'?undefined:blob,
block:typeof block==='undefined'?undefined:block,
body:typeof body==='undefined'?undefined:body,
bolSettings:typeof bolSettings==='undefined'?undefined:bolSettings,
bold:typeof bold==='undefined'?undefined:bold,
border:typeof border==='undefined'?undefined:border,
box:typeof box==='undefined'?undefined:box,
br:typeof br==='undefined'?undefined:br,
btn:typeof btn==='undefined'?undefined:btn,
business:typeof business==='undefined'?undefined:business,
button:typeof button==='undefined'?undefined:button,
buttons:typeof buttons==='undefined'?undefined:buttons,
by:typeof by==='undefined'?undefined:by,
c62828:typeof c62828==='undefined'?undefined:c62828,
calculateInvoiceData:typeof calculateInvoiceData==='undefined'?undefined:calculateInvoiceData,
canAccessTab:typeof canAccessTab==='undefined'?undefined:canAccessTab,
canEditCurrentDate:typeof canEditCurrentDate==='undefined'?undefined:canEditCurrentDate,
canEditDate:typeof canEditDate==='undefined'?undefined:canEditDate,
canEditTab:typeof canEditTab==='undefined'?undefined:canEditTab,
canPerformAction:typeof canPerformAction==='undefined'?undefined:canPerformAction,
card:typeof card==='undefined'?undefined:card,
cards:typeof cards==='undefined'?undefined:cards,
cases:typeof cases==='undefined'?undefined:cases,
ccc:typeof ccc==='undefined'?undefined:ccc,
cell:typeof cell==='undefined'?undefined:cell,
center:typeof center==='undefined'?undefined:center,
channel:typeof channel==='undefined'?undefined:channel,
charset:typeof charset==='undefined'?undefined:charset,
check:typeof check==='undefined'?undefined:check,
child:typeof child==='undefined'?undefined:child,
code:typeof code==='undefined'?undefined:code,
codes:typeof codes==='undefined'?undefined:codes,
col:typeof col==='undefined'?undefined:col,
colgroup:typeof colgroup==='undefined'?undefined:colgroup,
collapse:typeof collapse==='undefined'?undefined:collapse,
color:typeof color==='undefined'?undefined:color,
colspan:typeof colspan==='undefined'?undefined:colspan,
column:typeof column==='undefined'?undefined:column,
compact:typeof compact==='undefined'?undefined:compact,
compactMode:typeof compactMode==='undefined'?undefined:compactMode,
configured:typeof configured==='undefined'?undefined:configured,
confirmMsg:typeof confirmMsg==='undefined'?undefined:confirmMsg,
conflict$:typeof conflict$==='undefined'?undefined:conflict$,
count:typeof count==='undefined'?undefined:count,
countByType:typeof countByType==='undefined'?undefined:countByType,
csv:typeof csv==='undefined'?undefined:csv,
d:typeof d==='undefined'?undefined:d,
d2:typeof d2==='undefined'?undefined:d2,
d32f2f:typeof d32f2f==='undefined'?undefined:d32f2f,
dailyData:typeof dailyData==='undefined'?undefined:dailyData,
dashed:typeof dashed==='undefined'?undefined:dashed,
data:typeof data==='undefined'?undefined:data,
date:typeof date==='undefined'?undefined:date,
dateDisplay:typeof dateDisplay==='undefined'?undefined:dateDisplay,
dateObj:typeof dateObj==='undefined'?undefined:dateObj,
dateRoutes:typeof dateRoutes==='undefined'?undefined:dateRoutes,
day:typeof day==='undefined'?undefined:day,
dayName:typeof dayName==='undefined'?undefined:dayName,
dayOfWeek:typeof dayOfWeek==='undefined'?undefined:dayOfWeek,
dayTotalPallets:typeof dayTotalPallets==='undefined'?undefined:dayTotalPallets,
dayTruckSpots:typeof dayTruckSpots==='undefined'?undefined:dayTruckSpots,
daysUntilService:typeof daysUntilService==='undefined'?undefined:daysUntilService,
ddd:typeof ddd==='undefined'?undefined:ddd,
deg:typeof deg==='undefined'?undefined:deg,
delivered:typeof delivered==='undefined'?undefined:delivered,
deliveries:typeof deliveries==='undefined'?undefined:deliveries,
details:typeof details==='undefined'?undefined:details,
dirStore:typeof dirStore==='undefined'?undefined:dirStore,
dirStoreForName:typeof dirStoreForName==='undefined'?undefined:dirStoreForName,
displayDate:typeof displayDate==='undefined'?undefined:displayDate,
displayStoreName:typeof displayStoreName==='undefined'?undefined:displayStoreName,
displayVal:typeof displayVal==='undefined'?undefined:displayVal,
div:typeof div==='undefined'?undefined:div,
driver:typeof driver==='undefined'?undefined:driver,
driverColors:typeof driverColors==='undefined'?undefined:driverColors,
driverData:typeof driverData==='undefined'?undefined:driverData,
driverParts:typeof driverParts==='undefined'?undefined:driverParts,
driverPrintFields:typeof driverPrintFields==='undefined'?undefined:driverPrintFields,
driverPrintModal:typeof driverPrintModal==='undefined'?undefined:driverPrintModal,
driverPrintSortDirection:typeof driverPrintSortDirection==='undefined'?undefined:driverPrintSortDirection,
driverPrintSortField:typeof driverPrintSortField==='undefined'?undefined:driverPrintSortField,
driverPrintStatus:typeof driverPrintStatus==='undefined'?undefined:driverPrintStatus,
driverRoutes:typeof driverRoutes==='undefined'?undefined:driverRoutes,
driverSortDirection:typeof driverSortDirection==='undefined'?undefined:driverSortDirection,
driverSortField:typeof driverSortField==='undefined'?undefined:driverSortField,
driverStatusFilter:typeof driverStatusFilter==='undefined'?undefined:driverStatusFilter,
driverStatuses:typeof driverStatuses==='undefined'?undefined:driverStatuses,
driversDirectory:typeof driversDirectory==='undefined'?undefined:driversDirectory,
driversSubTab:typeof driversSubTab==='undefined'?undefined:driversSubTab,
duplicate:typeof duplicate==='undefined'?undefined:duplicate,
e:typeof e==='undefined'?undefined:e,
e3f2fd:typeof e3f2fd==='undefined'?undefined:e3f2fd,
e7d32:typeof e7d32==='undefined'?undefined:e7d32,
e8f5e9:typeof e8f5e9==='undefined'?undefined:e8f5e9,
editing:typeof editing==='undefined'?undefined:editing,
editingInvoiceId:typeof editingInvoiceId==='undefined'?undefined:editingInvoiceId,
setEditingInvoiceId:typeof setEditingInvoiceId==='undefined'?undefined:setEditingInvoiceId,
editingInvoiceUpdatedAt:typeof editingInvoiceUpdatedAt==='undefined'?undefined:editingInvoiceUpdatedAt,
setEditingInvoiceUpdatedAt:typeof setEditingInvoiceUpdatedAt==='undefined'?undefined:setEditingInvoiceUpdatedAt,
eea:typeof eea==='undefined'?undefined:eea,
eee:typeof eee==='undefined'?undefined:eee,
el:typeof el==='undefined'?undefined:el,
ellipsis:typeof ellipsis==='undefined'?undefined:ellipsis,
em:typeof em==='undefined'?undefined:em,
enterServerUpdate:typeof enterServerUpdate==='undefined'?undefined:enterServerUpdate,
equipmentType:typeof equipmentType==='undefined'?undefined:equipmentType,
err:typeof err==='undefined'?undefined:err,
error:typeof error==='undefined'?undefined:error,
even:typeof even==='undefined'?undefined:even,
event:typeof event==='undefined'?undefined:event,
exact:typeof exact==='undefined'?undefined:exact,
existingToday:typeof existingToday==='undefined'?undefined:existingToday,
exists:typeof exists==='undefined'?undefined:exists,
exitServerUpdate:typeof exitServerUpdate==='undefined'?undefined:exitServerUpdate,
exportToExcel:typeof exportToExcel==='undefined'?undefined:exportToExcel,
f:typeof f==='undefined'?undefined:f,
f0f0f0:typeof f0f0f0==='undefined'?undefined:f0f0f0,
f5f5f5:typeof f5f5f5==='undefined'?undefined:f5f5f5,
f9f9f9:typeof f9f9f9==='undefined'?undefined:f9f9f9,
fafafa:typeof fafafa==='undefined'?undefined:fafafa,
ffebee:typeof ffebee==='undefined'?undefined:ffebee,
fff:typeof fff==='undefined'?undefined:fff,
fff8e1:typeof fff8e1==='undefined'?undefined:fff8e1,
field:typeof field==='undefined'?undefined:field,
fieldLabels:typeof fieldLabels==='undefined'?undefined:fieldLabels,
file:typeof file==='undefined'?undefined:file,
filteredDrivers:typeof filteredDrivers==='undefined'?undefined:filteredDrivers,
firstRoute:typeof firstRoute==='undefined'?undefined:firstRoute,
fitToPage:typeof fitToPage==='undefined'?undefined:fitToPage,
fixed:typeof fixed==='undefined'?undefined:fixed,
flex:typeof flex==='undefined'?undefined:flex,
font:typeof font==='undefined'?undefined:font,
formatCurrency:typeof formatCurrency==='undefined'?undefined:formatCurrency,
formatPhoneNumber:typeof formatPhoneNumber==='undefined'?undefined:formatPhoneNumber,
fr:typeof fr==='undefined'?undefined:fr,
generateInvoicePDF:typeof generateInvoicePDF==='undefined'?undefined:generateInvoicePDF,
getExpiringDriverDocuments:typeof getExpiringDriverDocuments==='undefined'?undefined:getExpiringDriverDocuments,
getInvoiceDisplayDate:typeof getInvoiceDisplayDate==='undefined'?undefined:getInvoiceDisplayDate,
getTodayInTimezone:typeof getTodayInTimezone==='undefined'?undefined:getTodayInTimezone,
getTomorrowInTimezone:typeof getTomorrowInTimezone==='undefined'?undefined:getTomorrowInTimezone,
getWeekDates:typeof getWeekDates==='undefined'?undefined:getWeekDates,
formatDateDisplay:typeof formatDateDisplay==='undefined'?undefined:formatDateDisplay,
formatDayName:typeof formatDayName==='undefined'?undefined:formatDayName,
formatDayNumber:typeof formatDayNumber==='undefined'?undefined:formatDayNumber,
isToday:typeof isToday==='undefined'?undefined:isToday,
navigateWeek:typeof navigateWeek==='undefined'?undefined:navigateWeek,
goes:typeof goes==='undefined'?undefined:goes,
gradient:typeof gradient==='undefined'?undefined:gradient,
grandActiveTypes:typeof grandActiveTypes==='undefined'?undefined:grandActiveTypes,
grandPltDisplay:typeof grandPltDisplay==='undefined'?undefined:grandPltDisplay,
grandTotal:typeof grandTotal==='undefined'?undefined:grandTotal,
grandTotalByType:typeof grandTotalByType==='undefined'?undefined:grandTotalByType,
grandTotalLinked:typeof grandTotalLinked==='undefined'?undefined:grandTotalLinked,
grandTotalPallets:typeof grandTotalPallets==='undefined'?undefined:grandTotalPallets,
grandTotalStores:typeof grandTotalStores==='undefined'?undefined:grandTotalStores,
grandTotalTruckSpots:typeof grandTotalTruckSpots==='undefined'?undefined:grandTotalTruckSpots,
grid:typeof grid==='undefined'?undefined:grid,
group:typeof group==='undefined'?undefined:group,
groupByRouteNum:typeof groupByRouteNum==='undefined'?undefined:groupByRouteNum,
groupRoutes:typeof groupRoutes==='undefined'?undefined:groupRoutes,
groupTotalByType:typeof groupTotalByType==='undefined'?undefined:groupTotalByType,
groupTotalCases:typeof groupTotalCases==='undefined'?undefined:groupTotalCases,
h1:typeof h1==='undefined'?undefined:h1,
h2:typeof h2==='undefined'?undefined:h2,
h3:typeof h3==='undefined'?undefined:h3,
hasPendingChanges:typeof hasPendingChanges==='undefined'?undefined:hasPendingChanges,
hasUnconfirmedSummary:typeof hasUnconfirmedSummary==='undefined'?undefined:hasUnconfirmedSummary,
head:typeof head==='undefined'?undefined:head,
header:typeof header==='undefined'?undefined:header,
headerCols:typeof headerCols==='undefined'?undefined:headerCols,
headers:typeof headers==='undefined'?undefined:headers,
hidden:typeof hidden==='undefined'?undefined:hidden,
hideEmptyCols:typeof hideEmptyCols==='undefined'?undefined:hideEmptyCols,
html:typeof html==='undefined'?undefined:html,
i:typeof i==='undefined'?undefined:i,
idx:typeof idx==='undefined'?undefined:idx,
importDriversFromFile:typeof importDriversFromFile==='undefined'?undefined:importDriversFromFile,
importStoresFromFile:typeof importStoresFromFile==='undefined'?undefined:importStoresFromFile,
important:typeof important==='undefined'?undefined:important,
index:typeof index==='undefined'?undefined:index,
info:typeof info==='undefined'?undefined:info,
inline:typeof inline==='undefined'?undefined:inline,
inlineWarningBadge:typeof inlineWarningBadge==='undefined'?undefined:inlineWarningBadge,
inv:typeof inv==='undefined'?undefined:inv,
invoiceData:typeof invoiceData==='undefined'?undefined:invoiceData,
invoiceDateRange:typeof invoiceDateRange==='undefined'?undefined:invoiceDateRange,
invoiceManualItems:typeof invoiceManualItems==='undefined'?undefined:invoiceManualItems,
invoiceNumber:typeof invoiceNumber==='undefined'?undefined:invoiceNumber,
invoiceRateOverrides:typeof invoiceRateOverrides==='undefined'?undefined:invoiceRateOverrides,
invoiceRoutes:typeof invoiceRoutes==='undefined'?undefined:invoiceRoutes,
invoiceRoutesLoading:typeof invoiceRoutesLoading==='undefined'?undefined:invoiceRoutesLoading,
invoiceViewMode:typeof invoiceViewMode==='undefined'?undefined:invoiceViewMode,
ipt:typeof ipt==='undefined'?undefined:ipt,
is:typeof is==='undefined'?undefined:is,
isActive:typeof isActive==='undefined'?undefined:isActive,
isAdmin:typeof isAdmin==='undefined'?undefined:isAdmin,
isCardRouteConfirmed:typeof isCardRouteConfirmed==='undefined'?undefined:isCardRouteConfirmed,
isFirst:typeof isFirst==='undefined'?undefined:isFirst,
isLabelRouteConfirmed:typeof isLabelRouteConfirmed==='undefined'?undefined:isLabelRouteConfirmed,
isLast:typeof isLast==='undefined'?undefined:isLast,
isLoadOrderConfirmed:typeof isLoadOrderConfirmed==='undefined'?undefined:isLoadOrderConfirmed,
isRouteConfirmedManifest:typeof isRouteConfirmedManifest==='undefined'?undefined:isRouteConfirmedManifest,
isRouteSummaryConfirmed:typeof isRouteSummaryConfirmed==='undefined'?undefined:isRouteSummaryConfirmed,
item:typeof item==='undefined'?undefined:item,
justify:typeof justify==='undefined'?undefined:justify,
k:typeof k==='undefined'?undefined:k,
l:typeof l==='undefined'?undefined:l,
label:typeof label==='undefined'?undefined:label,
last:typeof last==='undefined'?undefined:last,
lastStore:typeof lastStore==='undefined'?undefined:lastStore,
lastInteractionTime:typeof lastInteractionTime==='undefined'?undefined:lastInteractionTime,
lastUpdated:typeof lastUpdated==='undefined'?undefined:lastUpdated,
lastZone:typeof lastZone==='undefined'?undefined:lastZone,
left:typeof left==='undefined'?undefined:left,
licenseTypes:typeof licenseTypes==='undefined'?undefined:licenseTypes,
line:typeof line==='undefined'?undefined:line,
linear:typeof linear==='undefined'?undefined:linear,
loadActivityLog:typeof loadActivityLog==='undefined'?undefined:loadActivityLog,
log:typeof log==='undefined'?undefined:log,
logActivity:typeof logActivity==='undefined'?undefined:logActivity,
m:typeof m==='undefined'?undefined:m,
manifestFormat:typeof manifestFormat==='undefined'?undefined:manifestFormat,
manifestHTML:typeof manifestHTML==='undefined'?undefined:manifestHTML,
manualItemsTotal:typeof manualItemsTotal==='undefined'?undefined:manualItemsTotal,
margin:typeof margin==='undefined'?undefined:margin,
max:typeof max==='undefined'?undefined:max,
maxPalletsByType:typeof maxPalletsByType==='undefined'?undefined:maxPalletsByType,
maxRouteNum:typeof maxRouteNum==='undefined'?undefined:maxRouteNum,
may:typeof may==='undefined'?undefined:may,
media:typeof media==='undefined'?undefined:media,
message:typeof message==='undefined'?undefined:message,
meta:typeof meta==='undefined'?undefined:meta,
middle:typeof middle==='undefined'?undefined:middle,
min:typeof min==='undefined'?undefined:min,
monthAgo:typeof monthAgo==='undefined'?undefined:monthAgo,
monthNames:typeof monthNames==='undefined'?undefined:monthNames,
n:typeof n==='undefined'?undefined:n,
n$:typeof n$==='undefined'?undefined:n$,
name:typeof name==='undefined'?undefined:name,
nbsp:typeof nbsp==='undefined'?undefined:nbsp,
newDays:typeof newDays==='undefined'?undefined:newDays,
newId:typeof newId==='undefined'?undefined:newId,
newTypes:typeof newTypes==='undefined'?undefined:newTypes,
nextServiceDate:typeof nextServiceDate==='undefined'?undefined:nextServiceDate,
none:typeof none==='undefined'?undefined:none,
normalized:typeof normalized==='undefined'?undefined:normalized,
normalizedType:typeof normalizedType==='undefined'?undefined:normalizedType,
not:typeof not==='undefined'?undefined:not,
notFound:typeof notFound==='undefined'?undefined:notFound,
nowrap:typeof nowrap==='undefined'?undefined:nowrap,
nth:typeof nth==='undefined'?undefined:nth,
num:typeof num==='undefined'?undefined:num,
number:typeof number==='undefined'?undefined:number,
onclick:typeof onclick==='undefined'?undefined:onclick,
option:typeof option==='undefined'?undefined:option,
orientation:typeof orientation==='undefined'?undefined:orientation,
originalIdx:typeof originalIdx==='undefined'?undefined:originalIdx,
otherUsers:typeof otherUsers==='undefined'?undefined:otherUsers,
otherUsersOnSameDate:typeof otherUsersOnSameDate==='undefined'?undefined:otherUsersOnSameDate,
overwritten:typeof overwritten==='undefined'?undefined:overwritten,
p:typeof p==='undefined'?undefined:p,
pIdx:typeof pIdx==='undefined'?undefined:pIdx,
pType:typeof pType==='undefined'?undefined:pType,
padding:typeof padding==='undefined'?undefined:padding,
page:typeof page==='undefined'?undefined:page,
pallet:typeof pallet==='undefined'?undefined:pallet,
palletTypes:typeof palletTypes==='undefined'?undefined:palletTypes,
pallets:typeof pallets==='undefined'?undefined:pallets,
palletsByType:typeof palletsByType==='undefined'?undefined:palletsByType,
payment:typeof payment==='undefined'?undefined:payment,
pcMilerSettings:typeof pcMilerSettings==='undefined'?undefined:pcMilerSettings,
plt:typeof plt==='undefined'?undefined:plt,
pltDisplay:typeof pltDisplay==='undefined'?undefined:pltDisplay,
pointer:typeof pointer==='undefined'?undefined:pointer,
prefix:typeof prefix==='undefined'?undefined:prefix,
presenceConnected:typeof presenceConnected==='undefined'?undefined:presenceConnected,
prev:typeof prev==='undefined'?undefined:prev,
print:typeof print==='undefined'?undefined:print,
printContent:typeof printContent==='undefined'?undefined:printContent,
printTime:typeof printTime==='undefined'?undefined:printTime,
printWindow:typeof printWindow==='undefined'?undefined:printWindow,
provider:typeof provider==='undefined'?undefined:provider,
providers:typeof providers==='undefined'?undefined:providers,
pt:typeof pt==='undefined'?undefined:pt,
px:typeof px==='undefined'?undefined:px,
r:typeof r==='undefined'?undefined:r,
rIdx:typeof rIdx==='undefined'?undefined:rIdx,
rates:typeof rates==='undefined'?undefined:rates,
reader:typeof reader==='undefined'?undefined:reader,
reference:typeof reference==='undefined'?undefined:reference,
reject:typeof reject==='undefined'?undefined:reject,
removeDriverFromDirectory:typeof removeDriverFromDirectory==='undefined'?undefined:removeDriverFromDirectory,
removeStoreFromDirectory:typeof removeStoreFromDirectory==='undefined'?undefined:removeStoreFromDirectory,
removeTractorFromDirectory:typeof removeTractorFromDirectory==='undefined'?undefined:removeTractorFromDirectory,
removeTrailerFromDirectory:typeof removeTrailerFromDirectory==='undefined'?undefined:removeTrailerFromDirectory,
removeTruckFromDirectory:typeof removeTruckFromDirectory==='undefined'?undefined:removeTruckFromDirectory,
repeat:typeof repeat==='undefined'?undefined:repeat,
reportDateRange:typeof reportDateRange==='undefined'?undefined:reportDateRange,
reportsSubTab:typeof reportsSubTab==='undefined'?undefined:reportsSubTab,
resolve:typeof resolve==='undefined'?undefined:resolve,
response:typeof response==='undefined'?undefined:response,
restoreFromBackup:typeof restoreFromBackup==='undefined'?undefined:restoreFromBackup,
result:typeof result==='undefined'?undefined:result,
rgba:typeof rgba==='undefined'?undefined:rgba,
right:typeof right==='undefined'?undefined:right,
roleDefaults:typeof roleDefaults==='undefined'?undefined:roleDefaults,
rolePermissions:typeof rolePermissions==='undefined'?undefined:rolePermissions,
rotate:typeof rotate==='undefined'?undefined:rotate,
route:typeof route==='undefined'?undefined:route,
routeByType:typeof routeByType==='undefined'?undefined:routeByType,
routeCount:typeof routeCount==='undefined'?undefined:routeCount,
routeDate:typeof routeDate==='undefined'?undefined:routeDate,
routeDateFormatted:typeof routeDateFormatted==='undefined'?undefined:routeDateFormatted,
routeDateShort:typeof routeDateShort==='undefined'?undefined:routeDateShort,
routeGroups:typeof routeGroups==='undefined'?undefined:routeGroups,
routeName:typeof routeName==='undefined'?undefined:routeName,
routeNum:typeof routeNum==='undefined'?undefined:routeNum,
routePltDisplay:typeof routePltDisplay==='undefined'?undefined:routePltDisplay,
routeTotal:typeof routeTotal==='undefined'?undefined:routeTotal,
routeTotalByType:typeof routeTotalByType==='undefined'?undefined:routeTotalByType,
routeTotalCases:typeof routeTotalCases==='undefined'?undefined:routeTotalCases,
routeTruckSpots:typeof routeTruckSpots==='undefined'?undefined:routeTruckSpots,
routeWarningBanner:typeof routeWarningBanner==='undefined'?undefined:routeWarningBanner,
routeZone:typeof routeZone==='undefined'?undefined:routeZone,
routes:typeof routes==='undefined'?undefined:routes,
routesByDate:typeof routesByDate==='undefined'?undefined:routesByDate,
dateRouteCounts:typeof dateRouteCounts==='undefined'?undefined:dateRouteCounts,
setDateRouteCounts:typeof setDateRouteCounts==='undefined'?undefined:setDateRouteCounts,
routesHTML:typeof routesHTML==='undefined'?undefined:routesHTML,
routesInRange:typeof routesInRange==='undefined'?undefined:routesInRange,
row:typeof row==='undefined'?undefined:row,
rows:typeof rows==='undefined'?undefined:rows,
s:typeof s==='undefined'?undefined:s,
sIdx:typeof sIdx==='undefined'?undefined:sIdx,
sans:typeof sans==='undefined'?undefined:sans,
savedInvoices:typeof savedInvoices==='undefined'?undefined:savedInvoices,
scale:typeof scale==='undefined'?undefined:scale,
scaleDC:typeof scaleDC==='undefined'?undefined:scaleDC,
scaleLS:typeof scaleLS==='undefined'?undefined:scaleLS,
scalePL:typeof scalePL==='undefined'?undefined:scalePL,
scaleSC:typeof scaleSC==='undefined'?undefined:scaleSC,
scaleSL:typeof scaleSL==='undefined'?undefined:scaleSL,
scr:typeof scr==='undefined'?undefined:scr,
screenshot:typeof screenshot==='undefined'?undefined:screenshot,
search:typeof search==='undefined'?undefined:search,
searchLower:typeof searchLower==='undefined'?undefined:searchLower,
section:typeof section==='undefined'?undefined:section,
selectedDate:typeof selectedDate==='undefined'?undefined:selectedDate,
selectedFields:typeof selectedFields==='undefined'?undefined:selectedFields,
serif:typeof serif==='undefined'?undefined:serif,
serviceStatus:typeof serviceStatus==='undefined'?undefined:serviceStatus,
session:typeof session==='undefined'?undefined:session,
setAccountsSubTab:typeof setAccountsSubTab==='undefined'?undefined:setAccountsSubTab,
setActivityLogFilter:typeof setActivityLogFilter==='undefined'?undefined:setActivityLogFilter,
setAiLogisticsSubTab:typeof setAiLogisticsSubTab==='undefined'?undefined:setAiLogisticsSubTab,
setBolSettings:typeof setBolSettings==='undefined'?undefined:setBolSettings,
setCompactMode:typeof setCompactMode==='undefined'?undefined:setCompactMode,
setDeleteConfirmModal:typeof setDeleteConfirmModal==='undefined'?undefined:setDeleteConfirmModal,
setDriverPrintFields:typeof setDriverPrintFields==='undefined'?undefined:setDriverPrintFields,
setDriverPrintModal:typeof setDriverPrintModal==='undefined'?undefined:setDriverPrintModal,
setDriverPrintSortDirection:typeof setDriverPrintSortDirection==='undefined'?undefined:setDriverPrintSortDirection,
setDriverPrintSortField:typeof setDriverPrintSortField==='undefined'?undefined:setDriverPrintSortField,
setDriverPrintStatus:typeof setDriverPrintStatus==='undefined'?undefined:setDriverPrintStatus,
setDriverSortDirection:typeof setDriverSortDirection==='undefined'?undefined:setDriverSortDirection,
setDriverSortField:typeof setDriverSortField==='undefined'?undefined:setDriverSortField,
setDriverStatusFilter:typeof setDriverStatusFilter==='undefined'?undefined:setDriverStatusFilter,
setDriverViewModal:typeof setDriverViewModal==='undefined'?undefined:setDriverViewModal,
setDriversDirectory:typeof setDriversDirectory==='undefined'?undefined:setDriversDirectory,
setDriversSubTab:typeof setDriversSubTab==='undefined'?undefined:setDriversSubTab,
setEquipmentType:typeof setEquipmentType==='undefined'?undefined:setEquipmentType,
setExpirationAlertsModal:typeof setExpirationAlertsModal==='undefined'?undefined:setExpirationAlertsModal,
setInfoModal:typeof setInfoModal==='undefined'?undefined:setInfoModal,
setInvoiceDateRange:typeof setInvoiceDateRange==='undefined'?undefined:setInvoiceDateRange,
setInvoiceManualItems:typeof setInvoiceManualItems==='undefined'?undefined:setInvoiceManualItems,
setInvoiceNumber:typeof setInvoiceNumber==='undefined'?undefined:setInvoiceNumber,
setInvoiceRateOverrides:typeof setInvoiceRateOverrides==='undefined'?undefined:setInvoiceRateOverrides,
setInvoiceRoutes:typeof setInvoiceRoutes==='undefined'?undefined:setInvoiceRoutes,
setInvoiceRoutesLoading:typeof setInvoiceRoutesLoading==='undefined'?undefined:setInvoiceRoutesLoading,
setInvoiceViewMode:typeof setInvoiceViewMode==='undefined'?undefined:setInvoiceViewMode,
setManifestFormat:typeof setManifestFormat==='undefined'?undefined:setManifestFormat,
setPalletTypes:typeof setPalletTypes==='undefined'?undefined:setPalletTypes,
setPcMilerSettings:typeof setPcMilerSettings==='undefined'?undefined:setPcMilerSettings,
setPermissionsModal:typeof setPermissionsModal==='undefined'?undefined:setPermissionsModal,
setReportDateRange:typeof setReportDateRange==='undefined'?undefined:setReportDateRange,
setReportsSubTab:typeof setReportsSubTab==='undefined'?undefined:setReportsSubTab,
setRoutesByDate:typeof setRoutesByDate==='undefined'?undefined:setRoutesByDate,
setSavedInvoices:typeof setSavedInvoices==='undefined'?undefined:setSavedInvoices,
setSettingsSubTab:typeof setSettingsSubTab==='undefined'?undefined:setSettingsSubTab,
setStoreRatesSearch:typeof setStoreRatesSearch==='undefined'?undefined:setStoreRatesSearch,
setStoreSearch:typeof setStoreSearch==='undefined'?undefined:setStoreSearch,
setStoreSort:typeof setStoreSort==='undefined'?undefined:setStoreSort,
setStoresDirectory:typeof setStoresDirectory==='undefined'?undefined:setStoresDirectory,
setTimezone:typeof setTimezone==='undefined'?undefined:setTimezone,
setTractorsDirectory:typeof setTractorsDirectory==='undefined'?undefined:setTractorsDirectory,
setTrailersDirectory:typeof setTrailersDirectory==='undefined'?undefined:setTrailersDirectory,
setTruckSubTab:typeof setTruckSubTab==='undefined'?undefined:setTruckSubTab,
setTrucksDirectory:typeof setTrucksDirectory==='undefined'?undefined:setTrucksDirectory,
setUserDeleteModal:typeof setUserDeleteModal==='undefined'?undefined:setUserDeleteModal,
setUserSearch:typeof setUserSearch==='undefined'?undefined:setUserSearch,
setUserSort:typeof setUserSort==='undefined'?undefined:setUserSort,
setUsersDirectory:typeof setUsersDirectory==='undefined'?undefined:setUsersDirectory,
setWeekRange:typeof setWeekRange==='undefined'?undefined:setWeekRange,
settingsSubTab:typeof settingsSubTab==='undefined'?undefined:settingsSubTab,
share:typeof share==='undefined'?undefined:share,
showStore:typeof showStore==='undefined'?undefined:showStore,
showZone:typeof showZone==='undefined'?undefined:showZone,
solid:typeof solid==='undefined'?undefined:solid,
sortLabels:typeof sortLabels==='undefined'?undefined:sortLabels,
space:typeof space==='undefined'?undefined:space,
span:typeof span==='undefined'?undefined:span,
src:typeof src==='undefined'?undefined:src,
start:typeof start==='undefined'?undefined:start,
state:typeof state==='undefined'?undefined:state,
stateCounts:typeof stateCounts==='undefined'?undefined:stateCounts,
states:typeof states==='undefined'?undefined:states,
status:typeof status==='undefined'?undefined:status,
statusClass:typeof statusClass==='undefined'?undefined:statusClass,
statusElements:typeof statusElements==='undefined'?undefined:statusElements,
stop:typeof stop==='undefined'?undefined:stop,
stops:typeof stops==='undefined'?undefined:stops,
store:typeof store==='undefined'?undefined:store,
storeCount:typeof storeCount==='undefined'?undefined:storeCount,
storeFrequency:typeof storeFrequency==='undefined'?undefined:storeFrequency,
storePallets:typeof storePallets==='undefined'?undefined:storePallets,
storeRatesSearch:typeof storeRatesSearch==='undefined'?undefined:storeRatesSearch,
storeSearch:typeof storeSearch==='undefined'?undefined:storeSearch,
storeSort:typeof storeSort==='undefined'?undefined:storeSort,
storeTotal:typeof storeTotal==='undefined'?undefined:storeTotal,
storeTotalCases:typeof storeTotalCases==='undefined'?undefined:storeTotalCases,
stores:typeof stores==='undefined'?undefined:stores,
storesDirectory:typeof storesDirectory==='undefined'?undefined:storesDirectory,
strong:typeof strong==='undefined'?undefined:strong,
style:typeof style==='undefined'?undefined:style,
subTab:typeof subTab==='undefined'?undefined:subTab,
sum:typeof sum==='undefined'?undefined:sum,
summaryRouteWarning:typeof summaryRouteWarning==='undefined'?undefined:summaryRouteWarning,
syncStatus:typeof syncStatus==='undefined'?undefined:syncStatus,
syncDebugEnabled:typeof syncDebugEnabled==='undefined'?undefined:syncDebugEnabled,
setSyncDebugEnabled:typeof setSyncDebugEnabled==='undefined'?undefined:setSyncDebugEnabled,
syncHealth:typeof syncHealth==='undefined'?undefined:syncHealth,
syncEvents:typeof syncEvents==='undefined'?undefined:syncEvents,
copySyncLogs:typeof copySyncLogs==='undefined'?undefined:copySyncLogs,
system:typeof system==='undefined'?undefined:system,
t:typeof t==='undefined'?undefined:t,
tab:typeof tab==='undefined'?undefined:tab,
table:typeof table==='undefined'?undefined:table,
tag:typeof tag==='undefined'?undefined:tag,
tags:typeof tags==='undefined'?undefined:tags,
tbody:typeof tbody==='undefined'?undefined:tbody,
tc:typeof tc==='undefined'?undefined:tc,
td:typeof td==='undefined'?undefined:td,
tempPassword:typeof tempPassword==='undefined'?undefined:tempPassword,
template:typeof template==='undefined'?undefined:template,
text:typeof text==='undefined'?undefined:text,
th:typeof th==='undefined'?undefined:th,
thead:typeof thead==='undefined'?undefined:thead,
thisMonday:typeof thisMonday==='undefined'?undefined:thisMonday,
thisSunday:typeof thisSunday==='undefined'?undefined:thisSunday,
timeout:typeof timeout==='undefined'?undefined:timeout,
timestamp:typeof timestamp==='undefined'?undefined:timestamp,
timezone:typeof timezone==='undefined'?undefined:timezone,
title:typeof title==='undefined'?undefined:title,
to:typeof to==='undefined'?undefined:to,
today:typeof today==='undefined'?undefined:today,
todayStr:typeof todayStr==='undefined'?undefined:todayStr,
total:typeof total==='undefined'?undefined:total,
totalCases:typeof totalCases==='undefined'?undefined:totalCases,
totalPallets:typeof totalPallets==='undefined'?undefined:totalPallets,
totalPlt:typeof totalPlt==='undefined'?undefined:totalPlt,
totalRoutes:typeof totalRoutes==='undefined'?undefined:totalRoutes,
totalRow:typeof totalRow==='undefined'?undefined:totalRow,
totalStores:typeof totalStores==='undefined'?undefined:totalStores,
totalTypeCells:typeof totalTypeCells==='undefined'?undefined:totalTypeCells,
totals:typeof totals==='undefined'?undefined:totals,
driverStats:typeof driverStats==='undefined'?undefined:driverStats,
tr:typeof tr==='undefined'?undefined:tr,
tractor:typeof tractor==='undefined'?undefined:tractor,
tractorsDirectory:typeof tractorsDirectory==='undefined'?undefined:tractorsDirectory,
trailer:typeof trailer==='undefined'?undefined:trailer,
trailerConflicts:typeof trailerConflicts==='undefined'?undefined:trailerConflicts,
trailerMakes:typeof trailerMakes==='undefined'?undefined:trailerMakes,
trailerSizes:typeof trailerSizes==='undefined'?undefined:trailerSizes,
trailerTypes:typeof trailerTypes==='undefined'?undefined:trailerTypes,
trailersDirectory:typeof trailersDirectory==='undefined'?undefined:trailersDirectory,
translate:typeof translate==='undefined'?undefined:translate,
truck:typeof truck==='undefined'?undefined:truck,
truckConflicts:typeof truckConflicts==='undefined'?undefined:truckConflicts,
truckMakes:typeof truckMakes==='undefined'?undefined:truckMakes,
truckStatuses:typeof truckStatuses==='undefined'?undefined:truckStatuses,
truckSubTab:typeof truckSubTab==='undefined'?undefined:truckSubTab,
trucksDirectory:typeof trucksDirectory==='undefined'?undefined:trucksDirectory,
type:typeof type==='undefined'?undefined:type,
typeCells:typeof typeCells==='undefined'?undefined:typeCells,
types:typeof types==='undefined'?undefined:types,
u:typeof u==='undefined'?undefined:u,
unconfirmedRoutes:typeof unconfirmedRoutes==='undefined'?undefined:unconfirmedRoutes,
unconfirmedRoutesSummary:typeof unconfirmedRoutesSummary==='undefined'?undefined:unconfirmedRoutesSummary,
updateDriverDirectory:typeof updateDriverDirectory==='undefined'?undefined:updateDriverDirectory,
updateStoreDirectory:typeof updateStoreDirectory==='undefined'?undefined:updateStoreDirectory,
updateTractorDirectory:typeof updateTractorDirectory==='undefined'?undefined:updateTractorDirectory,
updateTrailerDirectory:typeof updateTrailerDirectory==='undefined'?undefined:updateTrailerDirectory,
updateTruckDirectory:typeof updateTruckDirectory==='undefined'?undefined:updateTruckDirectory,
updated:typeof updated==='undefined'?undefined:updated,
uppercase:typeof uppercase==='undefined'?undefined:uppercase,
url:typeof url==='undefined'?undefined:url,
userDeleteModal:typeof userDeleteModal==='undefined'?undefined:userDeleteModal,
userName:typeof userName==='undefined'?undefined:userName,
userSearch:typeof userSearch==='undefined'?undefined:userSearch,
userSort:typeof userSort==='undefined'?undefined:userSort,
usersDirectory:typeof usersDirectory==='undefined'?undefined:usersDirectory,
usersLoading:typeof usersLoading==='undefined'?undefined:usersLoading,
v:typeof v==='undefined'?undefined:v,
val:typeof val==='undefined'?undefined:val,
value:typeof value==='undefined'?undefined:value,
vertical:typeof vertical==='undefined'?undefined:vertical,
vh:typeof vh==='undefined'?undefined:vh,
via:typeof via==='undefined'?undefined:via,
viewGrandTotal:typeof viewGrandTotal==='undefined'?undefined:viewGrandTotal,
viewInvoiceData:typeof viewInvoiceData==='undefined'?undefined:viewInvoiceData,
viewManualItems:typeof viewManualItems==='undefined'?undefined:viewManualItems,
viewManualTotal:typeof viewManualTotal==='undefined'?undefined:viewManualTotal,
watermarkCSS:typeof watermarkCSS==='undefined'?undefined:watermarkCSS,
watermarkHTML:typeof watermarkHTML==='undefined'?undefined:watermarkHTML,
wb:typeof wb==='undefined'?undefined:wb,
webkit:typeof webkit==='undefined'?undefined:webkit,
weekAgo:typeof weekAgo==='undefined'?undefined:weekAgo,
weeksAgo:typeof weeksAgo==='undefined'?undefined:weeksAgo,
white:typeof white==='undefined'?undefined:white,
wrap:typeof wrap==='undefined'?undefined:wrap,
ws:typeof ws==='undefined'?undefined:ws,
you:typeof you==='undefined'?undefined:you,
your:typeof your==='undefined'?undefined:your,
z:typeof z==='undefined'?undefined:z,
zone:typeof zone==='undefined'?undefined:zone,
zoneStores:typeof zoneStores==='undefined'?undefined:zoneStores,
zones:typeof zones==='undefined'?undefined:zones,
}),[activeTab,selectedDate,routesByDate,dateRouteCounts,storesDirectory,driversDirectory,trucksDirectory,trailersDirectory,tractorsDirectory,palletTypes,expandedRoutes,accountsSubTab,reportsSubTab,settingsSubTab,driversSubTab,aiLogisticsSubTab,truckSubTab,equipmentType,reportDateRange,invoiceDateRange,invoiceManualItems,invoiceNumber,invoiceRateOverrides,invoiceRoutes,invoiceRoutesLoading,invoiceViewMode,savedInvoices,editingInvoiceId,editingInvoiceUpdatedAt,driverStatusFilter,driverSortField,driverSortDirection,driverPrintModal,driverPrintStatus,driverPrintSortField,driverPrintSortDirection,driverPrintFields,userName,user,currentUserRole,userPermissions,compactMode,manifestFormat,timezone,pcMilerSettings,bolSettings,syncStatus,syncDebugEnabled,syncHealth,syncEvents,presenceConnected,activeUsers,showOnlineUsers,isOnline,needsReload,versionMismatch,showDataProtectionPanel,lastSuccessfulSave,showNameModal,deleteConfirmModal,showLogoutModal,storeChangeConfirmModal,infoModal,routeMapModal,driverViewModal,expirationAlertsModal,permissionsModal,selectedAlertRecipients,storeSearchModal,copyRoutesModal,moveStoreModal,showDisplayModeMenu,showAccountsMenu,showUserMenu,usersDirectory,usersLoading,userSearch,userSort,userDeleteModal,activityLog,activityLogFilter,activityLogLoading,undoStack,undoToast,routes]);
return/*#__PURE__*/React.createElement("div",{style:{position:'relative',height:'100%',backgroundColor:'#f0f2f5',fontFamily:"'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",overflow:'hidden'}},showInactivityWarning&&/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9998}},/*#__PURE__*/React.createElement("div",{style:{background:'white',padding:'40px',borderRadius:'16px',boxShadow:'0 8px 40px rgba(0,0,0,0.3)',textAlign:'center',maxWidth:'450px'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:'60px',marginBottom:'16px'}},"\u23F0"),/*#__PURE__*/React.createElement("h2",{style:{margin:'0 0 12px',color:'#ff9800',fontSize:'24px'}},"Session Expiring"),/*#__PURE__*/React.createElement("p",{style:{color:'#333',fontSize:'16px',lineHeight:1.6,marginBottom:'24px'}},"You've been inactive for a while.",/*#__PURE__*/React.createElement("br",null),"Your session will expire in ",/*#__PURE__*/React.createElement("strong",null,"5 minutes"),"."),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:'12px',justifyContent:'center'}},/*#__PURE__*/React.createElement("button",{onClick:()=>{lastActivityRef.current=Date.now();setShowInactivityWarning(false);},style:{padding:'14px 32px',background:'#1a7f4b',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:600,cursor:'pointer'}},"Stay Logged In"),/*#__PURE__*/React.createElement("button",{onClick:handleLogout,style:{padding:'14px 32px',background:'#f5f5f5',color:'#666',border:'1px solid #ddd',borderRadius:'8px',fontSize:'16px',fontWeight:500,cursor:'pointer'}},"Logout Now")))),/*#__PURE__*/React.createElement(AppModalsTertiary,{copyRoutesModal:copyRoutesModal,setCopyRoutesModal:setCopyRoutesModal,selectedDate:selectedDate,dateRouteCounts:dateRouteCounts,routesByDate:routesByDate,routes:routes,setInfoModal:setInfoModal,supabase:supabase,setRoutesByDate:setRoutesByDate,copyRoutesFromDate:copyRoutesFromDate,moveStoreModal:moveStoreModal,setMoveStoreModal:setMoveStoreModal,driverColors:driverColors,setRoutes:setRoutes}),versionMismatch&&/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99999}},/*#__PURE__*/React.createElement("div",{style:{background:'white',borderRadius:'16px',padding:'32px',maxWidth:'450px',width:'90%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:'64px',marginBottom:'16px'}},"\uD83D\uDD04"),/*#__PURE__*/React.createElement("h2",{style:{margin:'0 0 12px',color:'#1a7f4b',fontSize:'24px'}},"Update Available!"),/*#__PURE__*/React.createElement("p",{style:{margin:'0 0 8px',color:'#666',fontSize:'16px'}},"A newer version of the dashboard is available."),/*#__PURE__*/React.createElement("p",{style:{margin:'0 0 24px',color:'#999',fontSize:'14px'}},"Your version: ",/*#__PURE__*/React.createElement("strong",{style:{color:'#d32f2f'}},"v",APP_VERSION),/*#__PURE__*/React.createElement("br",null),"Latest version: ",/*#__PURE__*/React.createElement("strong",{style:{color:'#1a7f4b'}},"v",versionMismatch.serverVersion)),/*#__PURE__*/React.createElement("p",{style:{margin:'0 0 24px',color:'#333',fontSize:'14px',background:'#fff3e0',padding:'12px',borderRadius:'8px',border:'1px solid #ffb74d'}},"\u26A0\uFE0F Please refresh to continue using the dashboard and ensure data syncs correctly with other users."),/*#__PURE__*/React.createElement("button",{onClick:()=>window.location.reload(true),style:{padding:'14px 32px',background:'linear-gradient(135deg, #1a7f4b 0%, #15633a 100%)',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:600,color:'white',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'8px'}},"\uD83D\uDD04 Refresh Now"))),undoToast&&/*#__PURE__*/React.createElement("div",{style:{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg, #424242 0%, #212121 100%)',color:'white',padding:'12px 24px',borderRadius:'8px',boxShadow:'0 4px 20px rgba(0,0,0,0.3)',zIndex:10000,display:'flex',alignItems:'center',gap:'12px',animation:'slideUp 0.3s ease-out'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'20px'}},"\u21A9\uFE0F"),/*#__PURE__*/React.createElement("div",null,/*#__PURE__*/React.createElement("div",{style:{fontWeight:600}},undoToast.message),/*#__PURE__*/React.createElement("div",{style:{fontSize:'12px',opacity:0.8}},undoToast.remaining>0?`${undoToast.remaining} more undo${undoToast.remaining>1?'s':''} available`:'No more undos')),/*#__PURE__*/React.createElement("span",{style:{fontSize:'11px',opacity:0.6,marginLeft:'8px'}},"Ctrl+Z")),showDataProtectionPanel&&/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9997}},/*#__PURE__*/React.createElement("div",{style:{background:'white',padding:'30px',borderRadius:'16px',boxShadow:'0 8px 40px rgba(0,0,0,0.3)',maxWidth:'500px',width:'90%'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}},/*#__PURE__*/React.createElement("h2",{style:{margin:0,color:'#1a7f4b',fontSize:'20px'}},"\uD83D\uDEE1\uFE0F Data Protection"),/*#__PURE__*/React.createElement("button",{onClick:()=>setShowDataProtectionPanel(false),style:{background:'none',border:'none',fontSize:'24px',cursor:'pointer',color:'#999'}},"\xD7")),/*#__PURE__*/React.createElement("div",{style:{background:'#f5f5f5',padding:'16px',borderRadius:'8px',marginBottom:'16px'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',justifyContent:'space-between',marginBottom:'8px'}},/*#__PURE__*/React.createElement("span",{style:{color:'#666'}},"Sync Status:"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:syncStatus==='synced'?'#4caf50':syncStatus==='error'?'#e53935':'#ff9800'}},syncStatus==='synced'?'✅ Synced':syncStatus==='error'?' Error':'🔄 Syncing...')),/*#__PURE__*/React.createElement("div",{style:{display:'flex',justifyContent:'space-between',marginBottom:'8px'}},/*#__PURE__*/React.createElement("span",{style:{color:'#666'}},"Last Successful Save:"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:'#333'}},lastSuccessfulSave?new Date(lastSuccessfulSave).toLocaleTimeString():'Not yet')),/*#__PURE__*/React.createElement("div",{style:{display:'flex',justifyContent:'space-between'}},/*#__PURE__*/React.createElement("span",{style:{color:'#666'}},"Local Backups:"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:600,color:'#333'}},(()=>{try{const history=JSON.parse(localStorage.getItem('logistics_backup_history')||'[]');return history.length+' saved';}catch{return'0 saved';}})()))),/*#__PURE__*/React.createElement("div",{style:{display:'flex',flexDirection:'column',gap:'10px'}},/*#__PURE__*/React.createElement("button",{onClick:()=>{exportData();},style:{padding:'12px 20px',background:'#1a7f4b',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}},"\uD83D\uDCBE Download Full Backup (JSON)"),/*#__PURE__*/React.createElement("button",{onClick:()=>{restoreFromBackup(0);setShowDataProtectionPanel(false);},style:{padding:'12px 20px',background:'#ff9800',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}},"\uD83D\uDD04 Restore Latest Local Backup"),/*#__PURE__*/React.createElement("button",{onClick:()=>{// Show backup history
try{const history=JSON.parse(localStorage.getItem('logistics_backup_history')||'[]');if(history.length===0){alert('No backups found.');return;}const options=history.map((b,i)=>`${i+1}. ${new Date(b.timestamp).toLocaleString('en-US')}`).join('\n');const choice=prompt(`Select backup to restore (1-${history.length}):\n\n${options}`);if(choice){const idx=parseInt(choice)-1;if(idx>=0&&idx<history.length){restoreFromBackup(idx);setShowDataProtectionPanel(false);}}}catch(e){alert('Error: '+e.message);}},style:{padding:'12px 20px',background:'#f5f5f5',color:'#333',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}},"\uD83D\uDCCB View Backup History")),/*#__PURE__*/React.createElement("p",{style:{marginTop:'16px',fontSize:'12px',color:'#888',textAlign:'center'}},"Backups are automatically saved before every cloud sync.",/*#__PURE__*/React.createElement("br",null),"Last 5 backups are kept in your browser."))),/*#__PURE__*/React.createElement(AppModals,{showNameModal:showNameModal,handleSetUserName:handleSetUserName,deleteConfirmModal:deleteConfirmModal,setDeleteConfirmModal:setDeleteConfirmModal,showLogoutModal:showLogoutModal,setShowLogoutModal:setShowLogoutModal,handleLogout:handleLogout,storeChangeConfirmModal:storeChangeConfirmModal,setStoreChangeConfirmModal:setStoreChangeConfirmModal,infoModal:infoModal,setInfoModal:setInfoModal}),/*#__PURE__*/React.createElement(AppModalsSecondary,{routeMapModal:routeMapModal,setRouteMapModal:setRouteMapModal,driverViewModal:driverViewModal,setDriverViewModal:setDriverViewModal,expirationAlertsModal:expirationAlertsModal,setExpirationAlertsModal:setExpirationAlertsModal,expirationAlertDays:expirationAlertDays,setExpirationAlertDays:setExpirationAlertDays,getExpiringDriverDocuments:getExpiringDriverDocuments,usersDirectory:usersDirectory,selectedAlertRecipients:selectedAlertRecipients,setSelectedAlertRecipients:setSelectedAlertRecipients,setInfoModal:setInfoModal,sendExpirationAlertEmail:sendExpirationAlertEmail,permissionsModal:permissionsModal,setPermissionsModal:setPermissionsModal,setUsersDirectory:setUsersDirectory}),storeSearchModal&&/*#__PURE__*/React.createElement(StoreSearchModal,{storeSearchModal:storeSearchModal,storesDirectory:storesDirectory,routes:routes,storeSearchQuery:storeSearchQuery,setStoreSearchQuery:setStoreSearchQuery,storeSearchIndex:storeSearchIndex,setStoreSearchIndex:setStoreSearchIndex,setStoreSearchModal:setStoreSearchModal,setStoreChangeConfirmModal:setStoreChangeConfirmModal,setRoutes:setRoutes,hasPendingChangesRef:hasPendingChanges}),/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:0,left:0,right:0,height:'44px',zIndex:102,background:'linear-gradient(135deg, #1a7f4b 0%, #15633b 100%)'}},!isOnline&&/*#__PURE__*/React.createElement("div",{style:{background:'#f44336',color:'white',padding:'10px 32px',textAlign:'center',fontWeight:600,fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'18px'}},"\u26A0\uFE0F"),"YOU ARE OFFLINE - Changes will NOT be saved until connection is restored",/*#__PURE__*/React.createElement("span",{style:{fontSize:'18px'}},"\u26A0\uFE0F")),/*#__PURE__*/React.createElement("header",{style:{background:'linear-gradient(135deg, #1a7f4b 0%, #15633b 100%)',color:'white',padding:'0 20px',height:'44px',display:'flex',alignItems:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',fontSize:'12px'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px',marginRight:'8px'}},"\uD83D\uDE9B"),/*#__PURE__*/React.createElement("span",{style:{fontWeight:700,fontSize:'13px'}},"Logistics Dashboard"),/*#__PURE__*/React.createElement("span",{style:{opacity:0.5,fontSize:'10px',marginLeft:'6px'}},"v",APP_VERSION),/*#__PURE__*/React.createElement("span",{style:{margin:'0 12px',opacity:0.3}},"|"),/*#__PURE__*/React.createElement("button",{onClick:undoLastChange,disabled:undoStack.length===0,title:undoStack.length>0?`Undo (${undoStack.length} available) - Ctrl+Z`:'Nothing to undo',style:{background:undoStack.length>0?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.1)',border:'none',borderRadius:'4px',padding:'3px 8px',cursor:undoStack.length>0?'pointer':'default',display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:undoStack.length>0?'white':'rgba(255,255,255,0.5)',marginRight:'8px'}},/*#__PURE__*/React.createElement("span",null,"\u21A9\uFE0F"),/*#__PURE__*/React.createElement("span",null,"Undo"),undoStack.length>0&&/*#__PURE__*/React.createElement("span",{style:{background:'rgba(255,255,255,0.3)',borderRadius:'10px',padding:'0 5px',fontSize:'10px'}},undoStack.length)),/*#__PURE__*/React.createElement("span",{style:{fontSize:'11px'}},new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})),/*#__PURE__*/React.createElement("span",{onClick:()=>setShowDataProtectionPanel(true),style:{margin:'0 8px',fontSize:'10px',background:'rgba(255,255,255,0.2)',padding:'2px 6px',borderRadius:'8px',display:'flex',alignItems:'center',gap:'4px',cursor:'pointer'},title:"Click for data protection options"},/*#__PURE__*/React.createElement("span",{style:{width:'6px',height:'6px',borderRadius:'50%',background:statusDisplay.color,display:'inline-block'}}),statusDisplay.text,lastSuccessfulSave&&/*#__PURE__*/React.createElement("span",{style:{opacity:0.7,marginLeft:'4px'}},"\u2022 ",new Date(lastSuccessfulSave).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})),/*#__PURE__*/React.createElement("span",{style:{fontSize:'10px',marginLeft:'2px'}},"\uD83D\uDEE1\uFE0F")),/*#__PURE__*/React.createElement("div",{className:"online-users-dropdown",style:{position:'relative'}},/*#__PURE__*/React.createElement("span",{onClick:()=>{const newState=!showOnlineUsers;setShowOnlineUsers(newState);// Refresh presence state when opening dropdown
if(newState&&presenceChannelRef.current){const state=presenceChannelRef.current.presenceState();setActiveUsers(buildActiveUsersFromState(state));// Re-track with current_date included
presenceChannelRef.current.track({user_id:user?.id||null,user_name:userName,online_at:new Date().toISOString(),current_date:selectedDate}).catch(e=>console.warn('Presence track failed (dropdown):',e));}},style:{fontSize:'10px',background:'rgba(255,255,255,0.15)',padding:'2px 6px',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}},/*#__PURE__*/React.createElement("span",{style:{width:'6px',height:'6px',borderRadius:'50%',background:presenceConnected?'#4caf50':'#ff9800',display:'inline-block'}}),"\uD83D\uDC65 Online: ",presenceConnected?activeUsers.length:'...',!presenceConnected&&/*#__PURE__*/React.createElement("span",{style:{fontSize:'9px',opacity:0.7}}," \u26A0\uFE0F"),/*#__PURE__*/React.createElement("span",{style:{fontSize:'8px'}},showOnlineUsers?'▲':'▼')),showOnlineUsers&&/*#__PURE__*/React.createElement("div",{style:{position:'absolute',top:'100%',left:0,marginTop:'4px',background:'white',borderRadius:'6px',boxShadow:'0 4px 12px rgba(0,0,0,0.2)',padding:'8px 0',minWidth:'180px',zIndex:1000}},/*#__PURE__*/React.createElement("div",{style:{padding:'4px 12px',fontSize:'10px',color:'#888',borderBottom:'1px solid #eee',marginBottom:'4px',display:'flex',justifyContent:'space-between',alignItems:'center'}},/*#__PURE__*/React.createElement("span",null,"Connected Users"),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:'4px'}},/*#__PURE__*/React.createElement("button",{onClick:async e=>{e.stopPropagation();// Reload ONLY current date from server
try{setSyncStatus('syncing');// Load routes for current date only
const{data:routesData,error:routesError}=await supabase.from('logistics_routes').select('*').eq('route_date',selectedDate).order('route_order',{ascending:true});if(routesError)throw routesError;enterServerUpdate();try{// Convert routes for this date
const newRoutes=[];if(routesData&&routesData.length>0){routesData.forEach(route=>{newRoutes.push({id:route.id,driver:route.driver,truck:route.truck,trailer:route.trailer,stores:route.stores||[],palletCount:route.pallet_count||8,confirmed:route.confirmed,confirmedBy:route.confirmed_by,pickupAtPB:route.pickup_at_pb||false,route_order:route.route_order});});}// Update only the selected date, keep other dates as-is
setRoutesByDate(prev=>({...prev,[selectedDate]:newRoutes}));console.log(`✅ Reloaded ${selectedDate}: ${newRoutes.length} routes`);}finally{setTimeout(()=>exitServerUpdate(),300);}setSyncStatus('synced');}catch(err){console.error('Reload failed:',err);setSyncStatus('error');alert('Failed to reload data: '+err.message);}},style:{padding:'2px 6px',fontSize:'9px',background:'#fff3e0',border:'none',borderRadius:'3px',cursor:'pointer',color:'#e65100'},title:`Reload ${selectedDate} from server`},"\uD83D\uDD04 Reload"))),activeUsers.length>0?activeUsers.map((user,idx)=>/*#__PURE__*/React.createElement("div",{key:user.session,style:{padding:'6px 12px',fontSize:'11px',color:'#333',display:'flex',alignItems:'center',gap:'6px',background:user.name===userName?'#e8f5e9':user.currentDate===selectedDate&&user.name!==userName?'#fff3e0':'transparent'}},/*#__PURE__*/React.createElement("span",{style:{width:'8px',height:'8px',borderRadius:'50%',background:user.currentDate===selectedDate&&user.name!==userName?'#ff9800':'#4caf50'}}),user.name,user.sessionCount>1&&/*#__PURE__*/React.createElement("span",{style:{color:'#666',fontSize:'10px'}},"(",user.sessionCount," tabs)"),user.name===userName&&/*#__PURE__*/React.createElement("span",{style:{color:'#888',fontSize:'10px'}},"(you)"),user.currentDate&&user.name!==userName&&/*#__PURE__*/React.createElement("span",{style:{color:user.currentDate===selectedDate?'#e65100':'#888',fontSize:'10px',fontWeight:user.currentDate===selectedDate?'600':'normal'}},user.currentDate===selectedDate?'⚠ same date':`📅 ${(()=>{const d=new Date(user.currentDate+'T12:00:00');return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});})()}`))):!presenceConnected?/*#__PURE__*/React.createElement("div",{style:{padding:'8px 12px',fontSize:'11px',color:'#666'}},"Connecting..."):/*#__PURE__*/React.createElement("div",{style:{padding:'8px 12px',fontSize:'11px',color:'#333',display:'flex',alignItems:'center',gap:'6px'}},/*#__PURE__*/React.createElement("span",{style:{width:'8px',height:'8px',borderRadius:'50%',background:'#4caf50'}}),userName||'You'," ",/*#__PURE__*/React.createElement("span",{style:{color:'#888',fontSize:'10px'}},"(you)")))),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:'4px',marginLeft:'20px'}},canAccessTab('Overview')&&/*#__PURE__*/React.createElement("div",{className:"display-mode-dropdown",style:{position:'relative'}},/*#__PURE__*/React.createElement("button",{onClick:()=>setActiveTab('Overview'),onContextMenu:e=>{e.preventDefault();setShowDisplayModeMenu(!showDisplayModeMenu);},style:{background:activeTab==='Overview'?'rgba(255,255,255,0.2)':'transparent',color:'white',opacity:activeTab==='Overview'?1:0.8,border:'none',borderRadius:'4px',padding:'5px 12px',cursor:'pointer',fontSize:'11px',fontWeight:activeTab==='Overview'?600:400,position:'relative',display:'flex',alignItems:'center',gap:'4px'}},"Overview",/*#__PURE__*/React.createElement("span",{onClick:e=>{e.stopPropagation();setShowDisplayModeMenu(!showDisplayModeMenu);},style:{fontSize:'8px',opacity:0.6,padding:'2px 4px',marginLeft:'2px',borderRadius:'2px',cursor:'pointer'},onMouseEnter:e=>e.target.style.opacity='1',onMouseLeave:e=>e.target.style.opacity='0.6'},"\u25BC"),userPermissions.tabs['Overview']==='view'&&/*#__PURE__*/React.createElement("span",{style:{position:'absolute',top:'1px',right:'1px',fontSize:'7px',opacity:0.7}},"\uD83D\uDC41")),showDisplayModeMenu&&/*#__PURE__*/React.createElement("div",{style:{position:'absolute',top:'100%',left:'0',marginTop:'4px',background:'white',borderRadius:'8px',boxShadow:'0 4px 20px rgba(0,0,0,0.2)',minWidth:'200px',zIndex:1000,overflow:'hidden'}},/*#__PURE__*/React.createElement("div",{style:{padding:'8px 12px',background:'#f5f5f5',fontSize:'10px',fontWeight:600,color:'#666',textTransform:'uppercase',letterSpacing:'0.5px'}},"Display Mode"),[{value:'normal',label:'Normal',desc:'Default spacing',icon:''},{value:'compact',label:'Compact',desc:'Reduced spacing',icon:''},{value:'very-compact',label:'Very Compact',desc:'Maximum density',icon:'🔬'},{value:'single-row',label:'Single Row',desc:'Inline header',icon:'➖'},{value:'excel',label:'Excel (Beta)',desc:'Spreadsheet style',icon:'📊'}].map(mode=>/*#__PURE__*/React.createElement("div",{key:mode.value,onClick:()=>{setCompactMode(mode.value);localStorage.setItem('pbnewmans_compactMode',mode.value);setShowDisplayModeMenu(false);setActiveTab('Overview');},style:{padding:'10px 14px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',background:compactMode===mode.value?'#e8f5e9':'white',borderBottom:'1px solid #f0f0f0'},onMouseEnter:e=>e.currentTarget.style.background=compactMode===mode.value?'#e8f5e9':'#f9f9f9',onMouseLeave:e=>e.currentTarget.style.background=compactMode===mode.value?'#e8f5e9':'white'},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},mode.icon),/*#__PURE__*/React.createElement("div",{style:{flex:1}},/*#__PURE__*/React.createElement("div",{style:{fontSize:'13px',color:'#333',fontWeight:500}},mode.label),/*#__PURE__*/React.createElement("div",{style:{fontSize:'11px',color:'#888'}},mode.desc)),compactMode===mode.value&&/*#__PURE__*/React.createElement("span",{style:{color:'#1a7f4b',fontWeight:'bold'}},"\u2713"))))),['Drivers','Stores','Trucks','AI Logistics','Reports'].filter(tab=>canAccessTab(tab)).map(tab=>/*#__PURE__*/React.createElement("button",{key:tab,onClick:()=>{setActiveTab(tab);setShowAccountsMenu(false);},style:{background:activeTab===tab?'rgba(255,255,255,0.2)':'transparent',color:'white',opacity:activeTab===tab?1:0.8,border:'none',borderRadius:'4px',padding:'5px 12px',cursor:'pointer',fontSize:'11px',fontWeight:activeTab===tab?600:400,position:'relative'}},tab==='AI Logistics'?'🤖':''," ",tab,userPermissions.tabs[tab]==='view'&&/*#__PURE__*/React.createElement("span",{style:{position:'absolute',top:'1px',right:'1px',fontSize:'7px',opacity:0.7}},"\uD83D\uDC41"))),canAccessTab('Accounts')&&/*#__PURE__*/React.createElement("div",{className:"accounts-nav-dropdown",style:{position:'relative'}},/*#__PURE__*/React.createElement("button",{onClick:e=>{e.stopPropagation();setActiveTab('Accounts');setShowAccountsMenu(!showAccountsMenu);},style:{background:activeTab==='Accounts'?'rgba(255,255,255,0.2)':'transparent',color:'white',opacity:activeTab==='Accounts'?1:0.8,border:'none',borderRadius:'4px',padding:'5px 12px',cursor:'pointer',fontSize:'11px',fontWeight:activeTab==='Accounts'?600:400,position:'relative',display:'flex',alignItems:'center',gap:'4px'}},"💰 Accounts",/*#__PURE__*/React.createElement("span",{style:{fontSize:'8px',opacity:0.7}},"▼"),userPermissions.tabs['Accounts']==='view'&&/*#__PURE__*/React.createElement("span",{style:{position:'absolute',top:'1px',right:'1px',fontSize:'7px',opacity:0.7}},"\uD83D\uDC41")),showAccountsMenu&&/*#__PURE__*/React.createElement("div",{style:{position:'absolute',top:'100%',left:0,marginTop:'4px',background:'white',borderRadius:'8px',boxShadow:'0 4px 20px rgba(0,0,0,0.2)',minWidth:'220px',zIndex:1000,overflow:'hidden'}},['Chart of Accounts','Income Transactions','Expenses','Receive Payments','Invoices','Driver Settlements','Store Rates'].map(sub=>/*#__PURE__*/React.createElement("button",{key:sub,onClick:()=>{setAccountsSubTab(sub);setActiveTab('Accounts');setShowAccountsMenu(false);},style:{width:'100%',padding:'10px 12px',background:accountsSubTab===sub?'#e8f5e9':'white',color:'#333',border:'none',textAlign:'left',cursor:'pointer',fontSize:'12px',fontWeight:accountsSubTab===sub?600:500}},sub)))),canAccessTab('Settings')&&/*#__PURE__*/React.createElement("button",{onClick:()=>setActiveTab('Settings'),style:{background:activeTab==='Settings'?'rgba(255,255,255,0.2)':'transparent',color:'white',opacity:activeTab==='Settings'?1:0.8,border:'none',borderRadius:'4px',padding:'5px 12px',cursor:'pointer',fontSize:'11px',fontWeight:activeTab==='Settings'?600:400}},"\u2699\uFE0F Settings")),/*#__PURE__*/React.createElement("div",{style:{marginLeft:'auto',display:'flex',alignItems:'center',gap:'10px',fontSize:'11px',position:'relative'}},/*#__PURE__*/React.createElement("div",{onClick:()=>setShowUserMenu(!showUserMenu),style:{cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',padding:'4px 10px',background:showUserMenu?'rgba(255,255,255,0.2)':'transparent',borderRadius:'6px',transition:'background 0.2s'}},/*#__PURE__*/React.createElement("div",{style:{width:'28px',height:'28px',borderRadius:'50%',background:'#ff9800',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'12px',color:'white'}},(userName||'U').charAt(0).toUpperCase()),/*#__PURE__*/React.createElement("span",{style:{fontWeight:500}},userName||'User'),currentUserRole&&/*#__PURE__*/React.createElement("span",{style:{background:isAdmin?'#ff9800':'rgba(255,255,255,0.3)',padding:'1px 5px',borderRadius:'3px',fontSize:'9px',fontWeight:600}},currentUserRole),/*#__PURE__*/React.createElement("span",{style:{fontSize:'10px',opacity:0.8}},showUserMenu?'▲':'▼')),showUserMenu&&/*#__PURE__*/React.createElement(React.Fragment,null,/*#__PURE__*/React.createElement("div",{onClick:()=>setShowUserMenu(false),style:{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:999}}),/*#__PURE__*/React.createElement("div",{style:{position:'absolute',top:'100%',right:0,marginTop:'6px',background:'white',borderRadius:'10px',boxShadow:'0 4px 20px rgba(0,0,0,0.15)',minWidth:'260px',zIndex:1000,overflow:'hidden',border:'1px solid #e0e0e0'}},/*#__PURE__*/React.createElement("div",{onClick:()=>{setShowUserMenu(false);setShowNameModal(true);},style:{padding:'16px',borderBottom:'1px solid #e0e0e0',display:'flex',alignItems:'center',gap:'12px',cursor:'pointer',transition:'background 0.15s'},onMouseEnter:e=>e.currentTarget.style.background='#f9f9f9',onMouseLeave:e=>e.currentTarget.style.background='transparent'},/*#__PURE__*/React.createElement("div",{style:{width:'42px',height:'42px',borderRadius:'50%',background:'#ff9800',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'18px',color:'white'}},(userName||'U').charAt(0).toUpperCase()),/*#__PURE__*/React.createElement("div",{style:{flex:1}},/*#__PURE__*/React.createElement("div",{style:{fontWeight:600,color:'#333',fontSize:'14px'}},userName||'User'),/*#__PURE__*/React.createElement("div",{style:{color:'#666',fontSize:'12px'}},user?.email||'')),/*#__PURE__*/React.createElement("span",{style:{color:'#999',fontSize:'14px'}},"\u270F\uFE0F")),/*#__PURE__*/React.createElement("div",{style:{padding:'8px 0'}},/*#__PURE__*/React.createElement("button",{onClick:()=>{setShowUserMenu(false);setActiveTab('Settings');setSettingsSubTab('Display');},style:{width:'100%',padding:'10px 16px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',fontSize:'13px',color:'#333',transition:'background 0.15s'},onMouseEnter:e=>e.target.style.background='#f5f5f5',onMouseLeave:e=>e.target.style.background='transparent'},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\u2699\uFE0F"),/*#__PURE__*/React.createElement("span",null,"Settings")),/*#__PURE__*/React.createElement("button",{onClick:()=>{setShowUserMenu(false);setActiveTab('Settings');setSettingsSubTab('Users Management');},style:{width:'100%',padding:'10px 16px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',fontSize:'13px',color:'#333',transition:'background 0.15s'},onMouseEnter:e=>e.target.style.background='#f5f5f5',onMouseLeave:e=>e.target.style.background='transparent'},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\uD83D\uDEE0\uFE0F"),/*#__PURE__*/React.createElement("span",null,"Setup")),/*#__PURE__*/React.createElement("button",{onClick:()=>{setShowUserMenu(false);window.open('https://docs.google.com/document/d/YOUR_HELP_DOC_ID','_blank');},style:{width:'100%',padding:'10px 16px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',fontSize:'13px',color:'#333',transition:'background 0.15s'},onMouseEnter:e=>e.target.style.background='#f5f5f5',onMouseLeave:e=>e.target.style.background='transparent'},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\u2753"),/*#__PURE__*/React.createElement("span",null,"Help Center"))),/*#__PURE__*/React.createElement("div",{style:{borderTop:'1px solid #e0e0e0',padding:'8px 0'}},/*#__PURE__*/React.createElement("button",{onClick:()=>{setShowUserMenu(false);setShowLogoutModal(true);},style:{width:'100%',padding:'10px 16px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',fontSize:'13px',color:'#333',transition:'background 0.15s'},onMouseEnter:e=>e.target.style.background='#f5f5f5',onMouseLeave:e=>e.target.style.background='transparent'},/*#__PURE__*/React.createElement("span",{style:{fontSize:'16px'}},"\uD83D\uDEAA"),/*#__PURE__*/React.createElement("span",null,"Log Off"))))))),/*#__PURE__*/React.createElement("div",{style:{position:'fixed',top:'44px',left:0,right:0,bottom:0,overflowY:'auto',overflowX:'hidden',background:'white'}},activeTab==='Overview'&&/*#__PURE__*/React.createElement(OverviewTab,{app}),activeTab==='Stores'&&/*#__PURE__*/React.createElement(StoresTab,createStoresTabProps(app)),activeTab==='Drivers'&&/*#__PURE__*/React.createElement(DriversTab,{app}),activeTab==='Trucks'&&/*#__PURE__*/React.createElement(TrucksTab,{app}),activeTab==='AI Logistics'&&/*#__PURE__*/React.createElement(AiLogisticsTab,{app}),activeTab==='Accounts'&&/*#__PURE__*/React.createElement(AccountsTab,{app}),activeTab==='Reports'&&/*#__PURE__*/React.createElement(ReportsTab,{app}),activeTab==='Settings'&&/*#__PURE__*/React.createElement(SettingsTab,{app}))));}// ╔╗
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
