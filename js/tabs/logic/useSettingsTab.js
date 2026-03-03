import { loadActivityLogEntries } from '../../modules/activity/activityLog.js?v=26.120';

export function useSettingsTab({ React, supabase }) {
  const { useState, useCallback } = React;

  const [settingsSubTab, setSettingsSubTab] = useState('Users Management');
  const [manifestFormat, setManifestFormat] = useState(() => {
    const saved = localStorage.getItem('pbnewmans_manifestFormat');
    return saved || 'simple-list';
  });
  const [pcMilerSettings, setPcMilerSettings] = useState(() => {
    const saved = localStorage.getItem('pcMilerSettings');
    return saved
      ? JSON.parse(saved)
      : {
          // API keys are now stored server-side in Supabase Secrets
          // These fields are kept for backward compatibility but ignored
          apiKey: '',
          googleMapsKey: '',
          geoapifyKey: '',
          // Routing options (still configurable client-side)
          geoapifyTruckMode: 'truck',
          geoapifyRouteType: 'balanced',
          geoapifyTraffic: 'free_flow',
          geoapifyAvoid: 'none',
          roundTrip: false,
          vehicleType: 'Truck',
          routeType: 'Practical',
          distanceUnits: 'Miles',
          originAddress: '110 Middlesex Ave, Carteret, NJ 07008',
          originName: 'Newmans Refrigerated Service'
        };
  });
  const [bolSettings, setBolSettings] = useState(() => {
    const saved = localStorage.getItem('bolSettings');
    const defaults = {
      companyName: 'Newmans Refrigerated Service, Inc.',
      companyAddress: '110 Middlesex Avenue, Carteret, NJ 07008',
      documentTitle: 'DELIVERY REPORT',
      instructions: 'Set reefer unit to 0°F for frozen pallets',
      contactName: 'Anand Allan',
      contactPhone: '(646) 549-1335',
      palletColumns: 9,
      emptyRows: 8,
      palletColumnWidth: 28,
      totalColumnWidth: 22,
      fontSizeTitle: 22,
      fontSizePalletValue: 12,
      fontSizePalletType: 8,
      fontSizeTotals: 10,
      fontSizeStoreInfo: 11,
      showMiles: true,
      showDriveTime: true,
      showTotalTime: true,
      showInspectionSection: true,
      showNotesSection: true,
      showSignatureSection: true,
      mergeIndicatorStyle: 'arrow-orange',
      // arrow-orange, arrow-black, bracket, line-thick, line-double, none
      printBackgroundGraphics: true,
      printHeadersFooters: false,
      printFitMode: 'smart',
      minPrintScale: 0.88,
      overflowBehavior: 'allow-two-pages'
    };
    if (!saved) return defaults;
    try {
      const parsed = JSON.parse(saved);
      return {
        ...defaults,
        ...parsed
      };
    } catch (_) {
      return defaults;
    }
  });
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState({ field: 'name', direction: 'asc' });
  const [userDeleteModal, setUserDeleteModal] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [activityLogFilter, setActivityLogFilter] = useState({
    dateRange: '7days',
    user: '',
    entityType: '',
    search: ''
  });
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  const loadActivityLog = useCallback(async () => {
    await loadActivityLogEntries({
      supabase,
      activityLogFilter,
      setActivityLog,
      setActivityLogLoading
    });
  }, [supabase, activityLogFilter]);

  return {
    settingsSubTab,
    setSettingsSubTab,
    manifestFormat,
    setManifestFormat,
    pcMilerSettings,
    setPcMilerSettings,
    bolSettings,
    setBolSettings,
    userSearch,
    setUserSearch,
    userSort,
    setUserSort,
    userDeleteModal,
    setUserDeleteModal,
    activityLog,
    setActivityLog,
    activityLogFilter,
    setActivityLogFilter,
    activityLogLoading,
    setActivityLogLoading,
    loadActivityLog
  };
}
