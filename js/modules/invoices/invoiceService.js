export const loadInvoiceRoutesForRange = async ({
  supabase,
  startDate,
  endDate,
  setInvoiceRoutes,
  setInvoiceRoutesLoading,
}) => {
  if (!startDate || !endDate) return;

  setInvoiceRoutesLoading(true);
  console.log(`📄 Loading invoice routes for ${startDate} to ${endDate}...`);

  try {
    const { data: routesData, error } = await supabase
      .from('logistics_routes')
      .select('id,route_date,route_order,driver,truck,trailer,stores,pallet_count,confirmed,confirmed_by,pickup_at_pb')
      .gte('route_date', startDate)
      .lte('route_date', endDate)
      .order('route_date', { ascending: true })
      .order('route_order', { ascending: true });

    if (error) throw error;

    const routesByDateObj = {};
    if (routesData && routesData.length > 0) {
      routesData.forEach((route) => {
        const date = route.route_date;
        if (!routesByDateObj[date]) routesByDateObj[date] = [];
        routesByDateObj[date].push({
          id: route.id,
          driver: route.driver,
          truck: route.truck,
          trailer: route.trailer,
          stores: route.stores || [],
          palletCount: route.pallet_count || 8,
          confirmed: route.confirmed,
          confirmedBy: route.confirmed_by,
          pickupAtPB: route.pickup_at_pb || false,
          route_order: route.route_order,
        });
      });
    }

    setInvoiceRoutes(routesByDateObj);
    console.log(`✅ Loaded ${routesData?.length || 0} routes for invoice`);
  } catch (err) {
    console.error('Error loading invoice routes:', err);
  } finally {
    setInvoiceRoutesLoading(false);
  }
};

export const calculateInvoiceDataFromRoutes = ({
  startDate,
  endDate,
  invoiceRoutes,
  storesDirectory,
  invoiceRateOverrides,
}) => {
  const deliveries = [];
  const detailedTotalOverrides = invoiceRateOverrides?.__detailedTotals || {};

  const storeByCode = new Map();
  storesDirectory.forEach((s) => {
    const code = String(s.code || '').trim();
    if (code) storeByCode.set(code, s);
    const name = String(s.name || '').trim();
    if (name) storeByCode.set('name:' + name, s);
    if (s.id) storeByCode.set('id:' + s.id, s);
  });

  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toLocaleDateString('en-CA');
    const dayRoutes = invoiceRoutes[dateStr] || [];

    dayRoutes.forEach((route) => {
      (route.stores || []).forEach((store, storeIdx) => {
        const storeCode = String(store.code || '').trim();
        const storeName = String(store.name || '').trim();
        const storeInfo =
          storeByCode.get(storeCode) ||
          storeByCode.get('id:' + store.id) ||
          storeByCode.get('name:' + storeName);
        if (!storeInfo) return;

        const asBool = (v) => v === true || v === 'true' || v === 1 || v === '1';
        const isActuallyNoCharge = asBool(storeInfo.noCharge) || asBool(store.noCharge);

        const storeCodeKey = String(store.code || storeInfo.code || '').trim();
        const rateOverride = invoiceRateOverrides[storeCodeKey];

        const baseRate = isActuallyNoCharge
          ? 0
          : rateOverride?.baseRate !== undefined
            ? parseFloat(rateOverride.baseRate)
            : parseFloat(storeInfo.rate) || 0;
        const palletRate = isActuallyNoCharge
          ? 0
          : rateOverride?.palletRate !== undefined
            ? parseFloat(rateOverride.palletRate)
            : parseFloat(storeInfo.palletRate) || 0;
        const includedPallets =
          rateOverride?.includedPallets !== undefined
            ? parseInt(rateOverride.includedPallets)
            : parseInt(storeInfo.includedPallets) || 0;
        const hasOverride = rateOverride !== undefined;

        const pallets = store.pallets || [];
        const links = store.palletLinks || [];
        let rawPalletCount = 0;
        let linkedCount = 0;
        for (let i = 0; i < pallets.length; i++) {
          if ((pallets[i] && typeof pallets[i] === 'number' && pallets[i] > 0) || pallets[i] === '?') {
            rawPalletCount++;
            if (links[i]) linkedCount++;
          }
        }

        const palletCount = Math.max(0, rawPalletCount - linkedCount);
        const extraPallets = Math.max(0, palletCount - includedPallets);
        const extraPalletCharge = extraPallets * palletRate;

        const deliveryStoreKey = String(store.id || storeInfo.id || store.code || storeInfo.code || store.name || `idx:${storeIdx}`);
        const deliveryKey = `${String(route.id || 'no-route')}|${dateStr}|${deliveryStoreKey}`;
        const detailedTotalOverrideRaw = detailedTotalOverrides[deliveryKey];
        const detailedTotalOverride =
          detailedTotalOverrideRaw !== undefined && detailedTotalOverrideRaw !== null && detailedTotalOverrideRaw !== ''
            ? parseFloat(detailedTotalOverrideRaw)
            : null;
        const hasTotalOverride = Number.isFinite(detailedTotalOverride) && detailedTotalOverride >= 0;

        deliveries.push({
          date: dateStr,
          deliveryKey,
          routeId: route.id,
          driver: route.driver || 'Unassigned',
          zone: String(storeInfo.zone && storeInfo.zone.trim() !== '' ? storeInfo.zone : storeInfo.state || 'No Zone'),
          storeCode: String(store.code || storeInfo.code || ''),
          storeName: String(storeInfo.name || store.name || ''),
          palletCount,
          includedPallets,
          extraPallets,
          baseRate,
          palletRate,
          extraPalletCharge,
          computedTotal: baseRate + extraPalletCharge,
          totalCharge: hasTotalOverride ? detailedTotalOverride : baseRate + extraPalletCharge,
          noCharge: isActuallyNoCharge,
          hasOverride,
          hasTotalOverride,
        });
      });
    });
  }

  deliveries.sort((a, b) => {
    const zoneCompare = String(a.zone || '').localeCompare(String(b.zone || ''));
    if (zoneCompare !== 0) return zoneCompare;
    const storeCompare = String(a.storeCode || '').localeCompare(String(b.storeCode || ''));
    if (storeCompare !== 0) return storeCompare;
    return String(a.date || '').localeCompare(String(b.date || ''));
  });

  const chargeableDeliveries = deliveries.filter((d) => !d.noCharge);

  const byStoreMap = {};
  chargeableDeliveries.forEach((d) => {
    const key = d.storeCode;
    if (!byStoreMap[key]) {
      byStoreMap[key] = {
        zone: d.zone,
        storeCode: d.storeCode,
        storeName: d.storeName,
        deliveryRate: d.baseRate,
        palletRate: d.palletRate,
        includedPallets: d.includedPallets,
        deliveryCount: 0,
        totalPallets: 0,
        totalIncluded: 0,
        totalExtra: 0,
        totalBaseCharges: 0,
        totalExtraCharges: 0,
        totalCharge: 0,
        hasOverride: d.hasOverride,
      };
    }

    byStoreMap[key].deliveryCount++;
    byStoreMap[key].totalPallets += d.palletCount;
    byStoreMap[key].totalIncluded += d.includedPallets;
    byStoreMap[key].totalExtra += d.extraPallets;
    byStoreMap[key].totalBaseCharges += d.baseRate;
    byStoreMap[key].totalExtraCharges += d.extraPalletCharge;
    byStoreMap[key].totalCharge += d.totalCharge;
  });

  const byStore = Object.values(byStoreMap).sort((a, b) => {
    const zoneCompare = String(a.zone || '').localeCompare(String(b.zone || ''));
    if (zoneCompare !== 0) return zoneCompare;
    return String(a.storeCode || '').localeCompare(String(b.storeCode || ''));
  });

  const byZoneMap = {};
  chargeableDeliveries.forEach((d) => {
    const key = d.zone;
    if (!byZoneMap[key]) {
      byZoneMap[key] = { zone: d.zone, storeCount: new Set(), deliveryCount: 0, totalPallets: 0, totalExtra: 0, totalCharge: 0 };
    }
    byZoneMap[key].storeCount.add(d.storeCode);
    byZoneMap[key].deliveryCount++;
    byZoneMap[key].totalPallets += d.palletCount;
    byZoneMap[key].totalExtra += d.extraPallets;
    byZoneMap[key].totalCharge += d.totalCharge;
  });

  const byZone = Object.values(byZoneMap)
    .map((z) => ({ ...z, storeCount: z.storeCount.size }))
    .sort((a, b) => String(a.zone || '').localeCompare(String(b.zone || '')));

  const totalPallets = chargeableDeliveries.reduce((sum, d) => sum + d.palletCount, 0);
  const totalBaseCharges = chargeableDeliveries.reduce((sum, d) => sum + d.baseRate, 0);
  const totalExtraPalletCharges = chargeableDeliveries.reduce((sum, d) => sum + d.extraPalletCharge, 0);
  const subtotal = chargeableDeliveries.reduce((sum, d) => sum + (Number.isFinite(d.totalCharge) ? d.totalCharge : 0), 0);

  return {
    deliveries: chargeableDeliveries,
    byStore,
    byZone,
    totalBaseCharges,
    totalExtraPalletCharges,
    subtotal,
    totalPallets,
  };
};
