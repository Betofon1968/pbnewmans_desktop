export function createPalletOpsHandlers({ setRoutes, MIN_PALLETS, MAX_PALLETS }) {
  const sortStorePalletsByType = (routeId, storeId, palletTypesConfig) => {
    if (!palletTypesConfig || palletTypesConfig.length === 0) return;

    setRoutes((prev) =>
      prev.map((route) => {
        if (route.id !== routeId) return route;

        const newStores = route.stores.map((store) => {
          if (store.id !== storeId) return store;

          const palletsList = store.pallets || [];
          const types = store.palletTypes || [];
          const links = store.palletLinks || [];

          const palletData = palletsList.map((value, idx) => {
            const rawType = types[idx] || palletTypesConfig[0]?.abbrev || 'FZ';
            const normalizedType =
              rawType === 'F' ? 'FZ' : rawType === 'D' ? 'DR' : rawType === 'S' ? 'SP' : rawType;

            return {
              value,
              type: normalizedType,
              link: links[idx] || false,
              hasValue: value !== null && value !== undefined && value !== ''
            };
          });

          const filled = palletData.filter((p) => p.hasValue);
          const empty = palletData.filter((p) => !p.hasValue);

          filled.sort((a, b) => {
            const aIndex = palletTypesConfig.findIndex((pt) => pt.abbrev === a.type);
            const bIndex = palletTypesConfig.findIndex((pt) => pt.abbrev === b.type);
            const aOrder = aIndex >= 0 ? aIndex : 999;
            const bOrder = bIndex >= 0 ? bIndex : 999;
            return aOrder - bOrder;
          });

          const sorted = [...filled, ...empty];

          return {
            ...store,
            pallets: sorted.map((p) => p.value),
            palletTypes: sorted.map((p) => p.type),
            palletLinks: sorted.map((p) => p.link)
          };
        });

        return { ...route, stores: newStores };
      })
    );
  };

  const addPalletColumn = (routeId) => {
    setRoutes((prev) =>
      prev.map((route) => {
        if (route.id !== routeId) return route;
        if (route.palletCount >= MAX_PALLETS) return route;

        const newCount = route.palletCount + 1;

        return {
          ...route,
          palletCount: newCount,
          stores: route.stores.map((store) => {
            const newPallets = [...(store.pallets || [])];
            const newPalletTypes = [...(store.palletTypes || Array(route.palletCount).fill('F'))];
            const newPalletLinks = [...(store.palletLinks || Array(route.palletCount).fill(false))];

            while (newPallets.length < newCount) {
              newPallets.push(null);
              newPalletTypes.push('F');
              newPalletLinks.push(false);
            }

            return {
              ...store,
              pallets: newPallets,
              palletTypes: newPalletTypes,
              palletLinks: newPalletLinks
            };
          })
        };
      })
    );
  };

  const removePalletColumn = (routeId) => {
    setRoutes((prev) =>
      prev.map((route) => {
        if (route.id !== routeId) return route;
        if (route.palletCount <= MIN_PALLETS) return route;

        const lastColumnIndex = route.palletCount - 1;
        const lastColumnHasData = route.stores.some((store) => {
          const pallets = store.pallets || [];
          const val = pallets[lastColumnIndex];
          return (val && typeof val === 'number' && val > 0) || val === '?';
        });

        if (lastColumnHasData) {
          alert('Cannot remove column - it contains data. Clear the values first.');
          return route;
        }

        const newCount = route.palletCount - 1;
        return {
          ...route,
          palletCount: newCount,
          stores: route.stores.map((store) => {
            const pallets = store.pallets || [];
            const newPallets = pallets.slice(0, newCount);
            const newPalletTypes = (store.palletTypes || Array(route.palletCount).fill('F')).slice(0, newCount);
            const newPalletLinks = (store.palletLinks || Array(route.palletCount).fill(false)).slice(0, newCount);
            const newTc = newPallets.reduce((sum, p) => sum + (typeof p === 'number' ? p : 0), 0);

            return {
              ...store,
              pallets: newPallets,
              palletTypes: newPalletTypes,
              palletLinks: newPalletLinks,
              tc: newTc
            };
          })
        };
      })
    );
  };

  return {
    sortStorePalletsByType,
    addPalletColumn,
    removePalletColumn
  };
}
