export function buildDriverColors(driversDirectory) {
  return driversDirectory.reduce(
    (acc, driver) => {
      const name = driver.name || driver.firstName || '';
      acc[name] = {
        bg: driver.bgColor || '#f5f5f5',
        border: driver.borderColor || '#9e9e9e',
        header: driver.borderColor || '#757575'
      };
      if (driver.firstName && driver.firstName !== name) {
        acc[driver.firstName] = acc[name];
      }
      return acc;
    },
    { '': { bg: '#f5f5f5', border: '#9e9e9e', header: '#757575' } }
  );
}

export function calculateTotalsFromRoutes({ routes, palletTypes }) {
  let totalPallets = 0;
  let truckSpots = 0;
  const byType = {};

  palletTypes.forEach((pType) => {
    byType[pType.abbrev] = 0;
  });

  routes.forEach((route) => {
    route.stores.forEach((store) => {
      const types =
        store.palletTypes && store.palletTypes.length > 0
          ? store.palletTypes
          : Array(12).fill(palletTypes[0]?.abbrev || 'FZ');
      const links = store.palletLinks || [];

      (store.pallets || []).forEach((p, idx) => {
        if (((p && typeof p === 'number' && p > 0) || p === '?')) {
          totalPallets++;
          if (!links[idx]) truckSpots++;
          const storedType = types[idx] || palletTypes[0]?.abbrev || 'FZ';
          const normalizedType = storedType === 'F' ? 'FZ' : storedType === 'D' ? 'DR' : storedType === 'S' ? 'SP' : storedType;
          byType[normalizedType] = (byType[normalizedType] || 0) + 1;
        }
      });
    });
  });

  return {
    routes: routes.length,
    totalPallets,
    truckSpots,
    byType
  };
}

export function getDriverStatsFromRoutes(routes) {
  const stats = {};
  routes.forEach((route) => {
    if (route.driver && route.driver !== '') {
      if (!stats[route.driver]) {
        stats[route.driver] = 0;
      }
      stats[route.driver]++;
    }
  });
  return stats;
}

export function calculateRouteTotalFromStores({ stores, palletCount = 8, palletTypesConfig = [] }) {
  const defaultType = palletTypesConfig[0]?.abbrev || 'FZ';
  return stores.reduce(
    (acc, store) => {
      const types =
        store.palletTypes && store.palletTypes.length > 0
          ? store.palletTypes
          : Array(palletCount).fill(defaultType);
      const links = store.palletLinks || [];
      const pallets = store.pallets || [];
      const byType = { ...acc.byType };

      palletTypesConfig.forEach((pType) => {
        const count = pallets.reduce((c, val, idx) => {
          const storedType = types[idx] || defaultType;
          const normalizedType = storedType === 'F' ? 'FZ' : storedType === 'D' ? 'DR' : storedType === 'S' ? 'SP' : storedType;
          const hasPallet = ((val && typeof val === 'number' && val > 0) || val === '?');
          return c + (hasPallet && normalizedType === pType.abbrev ? 1 : 0);
        }, 0);
        byType[pType.abbrev] = (byType[pType.abbrev] || 0) + count;
      });

      let tot = 0;
      let linkedCount = 0;
      for (let i = 0; i < pallets.length; i++) {
        if (((pallets[i] && typeof pallets[i] === 'number' && pallets[i] > 0) || pallets[i] === '?')) {
          tot++;
          if (links[i]) linkedCount++;
        }
      }

      return {
        tc: acc.tc + (store.tc || 0),
        byType,
        tot: acc.tot + tot,
        truckSpots: (acc.truckSpots || 0) + (tot - linkedCount),
        fresh: acc.fresh + (store.fresh || 0)
      };
    },
    { tc: 0, byType: {}, tot: 0, truckSpots: 0, fresh: 0 }
  );
}
