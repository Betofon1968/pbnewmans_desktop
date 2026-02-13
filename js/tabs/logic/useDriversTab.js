export function useDriversTab({ React }) {
  const { useState } = React;

  const [driversSubTab, setDriversSubTab] = useState('Driver Directory');
  const [driverStatusFilter, setDriverStatusFilter] = useState('All');
  const [driverSortField, setDriverSortField] = useState(null);
  const [driverSortDirection, setDriverSortDirection] = useState('asc');
  const [driverPrintModal, setDriverPrintModal] = useState(false);
  const [driverPrintStatus, setDriverPrintStatus] = useState('All');
  const [driverPrintSortField, setDriverPrintSortField] = useState('lastName');
  const [driverPrintSortDirection, setDriverPrintSortDirection] = useState('asc');
  const [driverPrintFields, setDriverPrintFields] = useState({
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    license: true,
    dlNumber: true,
    dlState: true,
    dob: false,
    licenseExp: true,
    mcExp: true,
    truck: true,
    status: true,
    hireDate: false
  });

  return {
    driversSubTab,
    setDriversSubTab,
    driverStatusFilter,
    setDriverStatusFilter,
    driverSortField,
    setDriverSortField,
    driverSortDirection,
    setDriverSortDirection,
    driverPrintModal,
    setDriverPrintModal,
    driverPrintStatus,
    setDriverPrintStatus,
    driverPrintSortField,
    setDriverPrintSortField,
    driverPrintSortDirection,
    setDriverPrintSortDirection,
    driverPrintFields,
    setDriverPrintFields
  };
}
