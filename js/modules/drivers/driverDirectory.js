export function createDriverDirectoryHandlers({
  driversDirectory,
  hasPendingChanges,
  lastInteractionTime,
  setDriversDirectory,
  setDeleteConfirmModal,
  parseCsvText
}) {
  const addDriverToDirectory = () => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();
    const newId = Math.max(...driversDirectory.map((d) => d.id), 0) + 1;
    setDriversDirectory((prev) => [
      ...prev,
      {
        id: newId,
        name: '',
        firstName: '',
        lastName: '',
        dob: '',
        phone: '',
        email: '',
        license: 'CDL-A',
        dlNumber: '',
        dlState: '',
        licenseExp: '',
        mcExp: '',
        truck: '',
        status: 'Active',
        hireDate: ''
      }
    ]);
  };

  const updateDriverDirectory = (driverId, field, value) => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();
    setDriversDirectory((prev) =>
      prev.map((driver) => {
        if (driver.id !== driverId) return driver;
        const updated = { ...driver, [field]: value };
        if (field === 'firstName' || field === 'lastName') {
          updated.name =
            `${field === 'firstName' ? value : driver.firstName} ${field === 'lastName' ? value : driver.lastName}`.trim() ||
            updated.firstName ||
            updated.lastName;
        }
        return updated;
      })
    );
  };

  const removeDriverFromDirectory = (driverId) => {
    const driver = driversDirectory.find((d) => d.id === driverId);
    setDeleteConfirmModal({
      type: 'Driver',
      id: driverId,
      name: driver ? `${driver.firstName} ${driver.lastName}`.trim() || driver.name : 'Unknown Driver',
      onConfirm: () => {
        hasPendingChanges.current = true;
        lastInteractionTime.current = Date.now();
        setDriversDirectory((prev) => prev.filter((d) => d.id !== driverId));
      }
    });
  };

  const getExpiringDriverDocuments = (daysThreshold = 30) => {
    const today = new Date();
    const threshold = new Date(today.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
    const expiring = [];

    driversDirectory.forEach((driver) => {
      if (driver.status !== 'Active') return;

      if (driver.licenseExp) {
        const licenseDate = new Date(driver.licenseExp);
        if (licenseDate <= threshold) {
          const daysLeft = Math.ceil((licenseDate - today) / (1000 * 60 * 60 * 24));
          expiring.push({ driver, type: 'License', expDate: driver.licenseExp, daysLeft, expired: daysLeft < 0 });
        }
      }

      if (driver.mcExp) {
        const mcDate = new Date(driver.mcExp);
        if (mcDate <= threshold) {
          const daysLeft = Math.ceil((mcDate - today) / (1000 * 60 * 60 * 24));
          expiring.push({ driver, type: 'Medical Card', expDate: driver.mcExp, daysLeft, expired: daysLeft < 0 });
        }
      }
    });

    return expiring.sort((a, b) => a.daysLeft - b.daysLeft);
  };

  const importDriversFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const rows = parseCsvText(text);
          if (rows.length === 0) {
            alert('No drivers found in file. Please check the format.');
            return;
          }

          const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
          const newDrivers = [];
          const maxId = Math.max(...driversDirectory.map((d) => d.id), 0);

          for (let i = 1; i < rows.length; i++) {
            const values = rows[i].map((v) => v.trim().replace(/['"]/g, ''));
            if (values.length < 2) continue;

            const firstName = values[headers.indexOf('first name')] || values[headers.indexOf('firstname')] || values[0] || '';
            const lastName = values[headers.indexOf('last name')] || values[headers.indexOf('lastname')] || values[1] || '';
            const driver = {
              id: maxId + i,
              name: `${firstName} ${lastName}`.trim(),
              firstName,
              lastName,
              dob: values[headers.indexOf('dob')] || values[headers.indexOf('date of birth')] || '',
              phone: values[headers.indexOf('phone')] || values[2] || '',
              email: values[headers.indexOf('email')] || values[3] || '',
              license: values[headers.indexOf('license')] || values[headers.indexOf('license type')] || values[4] || 'CDL-A',
              dlNumber: values[headers.indexOf('dl #')] || values[headers.indexOf('dl number')] || '',
              dlState: values[headers.indexOf('state')] || values[headers.indexOf('dl state')] || '',
              licenseExp: values[headers.indexOf('license exp')] || values[headers.indexOf('licenseexp')] || values[5] || '',
              mcExp: values[headers.indexOf('mc exp')] || values[headers.indexOf('mc expiration')] || '',
              truck: values[headers.indexOf('truck')] || values[6] || '',
              status: values[headers.indexOf('status')] || values[7] || 'Active',
              hireDate: values[headers.indexOf('hire date')] || values[headers.indexOf('hiredate')] || values[8] || ''
            };
            newDrivers.push(driver);
          }

          if (newDrivers.length > 0) {
            setDriversDirectory((prev) => [...prev, ...newDrivers]);
            alert(`Successfully imported ${newDrivers.length} drivers!`);
          } else {
            alert('No drivers found in file. Please check the format.');
          }
        } catch (err) {
          console.error('Import error:', err);
          alert('Failed to import file. Please check the format.');
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = async (e) => {
        try {
          if (!window.XLSX) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
            document.head.appendChild(script);
            await new Promise((resolve) => (script.onload = resolve));
          }

          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet);
          const maxId = Math.max(...driversDirectory.map((d) => d.id), 0);

          const newDrivers = jsonData.map((row, idx) => {
            const firstName = row['First Name'] || row['FIRST NAME'] || row['FirstName'] || row['firstName'] || '';
            const lastName = row['Last Name'] || row['LAST NAME'] || row['LastName'] || row['lastName'] || '';
            return {
              id: maxId + idx + 1,
              name: row['Name'] || row['NAME'] || `${firstName} ${lastName}`.trim(),
              firstName,
              lastName,
              dob: row['DOB'] || row['Dob'] || row['Date of Birth'] || row['DATE OF BIRTH'] || '',
              phone: row['Phone'] || row['PHONE'] || row['phone'] || '',
              email: row['Email'] || row['EMAIL'] || row['email'] || '',
              license: row['License'] || row['LICENSE'] || row['License Type'] || 'CDL-A',
              dlNumber: row['DL #'] || row['DL Number'] || row['DL'] || row['Driver License'] || '',
              dlState: row['State'] || row['STATE'] || row['DL State'] || '',
              licenseExp: row['License Exp'] || row['LICENSE EXP'] || row['LicenseExp'] || '',
              mcExp: row['MC Exp'] || row['MC EXP'] || row['MC Expiration'] || '',
              truck: row['Truck'] || row['TRUCK'] || row['truck'] || '',
              status: row['Status'] || row['STATUS'] || row['status'] || 'Active',
              hireDate: row['Hire Date'] || row['HIRE DATE'] || row['HireDate'] || ''
            };
          });

          if (newDrivers.length > 0) {
            setDriversDirectory((prev) => [...prev, ...newDrivers]);
            alert(`Successfully imported ${newDrivers.length} drivers!`);
          } else {
            alert('No drivers found in file. Please check the format.');
          }
        } catch (err) {
          console.error('Import error:', err);
          alert('Failed to import Excel file. Please check the format.');
        }
      };
      reader.readAsArrayBuffer(file);
    }

    event.target.value = '';
  };

  return {
    addDriverToDirectory,
    updateDriverDirectory,
    removeDriverFromDirectory,
    getExpiringDriverDocuments,
    importDriversFromFile
  };
}
