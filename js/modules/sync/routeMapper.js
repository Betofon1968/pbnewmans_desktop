export const mapRouteRecordToClientRoute = (route) => {
  const numericOrder = Number(route.route_order);
  const routeOrder = Number.isFinite(numericOrder) ? numericOrder : 0;
  const routeLabel = route.driver ? `${route.driver} #${routeOrder + 1}` : `Route ${routeOrder + 1}`;

  return {
    id: route.id,
    name: routeLabel,
    driver: route.driver,
    truck: route.truck,
    trailer: route.trailer,
    stores: route.stores || [],
    palletCount: route.pallet_count || 8,
    confirmed: route.confirmed,
    confirmedBy: route.confirmed_by,
    confirmedAt: route.confirmed_at,
    pickupAtPB: route.pickup_at_pb || false,
    route_order: routeOrder,
    updated_at: route.updated_at,
  };
};
