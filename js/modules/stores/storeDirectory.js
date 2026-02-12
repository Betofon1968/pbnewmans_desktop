export function createStoreDirectoryHandlers({
  storesDirectory,
  hasPendingChanges,
  lastInteractionTime,
  setStoresDirectory,
  setDeleteConfirmModal,
  logActivity,
  parseCsvText
}) {
  const addStoreToDirectory = () => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();
    const newId = Math.max(...storesDirectory.map((s) => s.id), 0) + 1;
    setStoresDirectory((prev) => [
      ...prev,
      {
        id: newId,
        code: '',
        name: 'New Store',
        street: '',
        city: '',
        state: 'NY',
        zip: '',
        hours: '',
        maxTrailer: "53'",
        manager: '',
        phone: '',
        email: ''
      }
    ]);
  };

  const updateStoreDirectory = (storeId, field, value) => {
    hasPendingChanges.current = true;
    lastInteractionTime.current = Date.now();
    console.log('updateStoreDirectory called - hasPendingChanges set to true');
    setStoresDirectory((prev) =>
      prev.map((s) => {
        if (s.id !== storeId) return s;
        const safeValue = ['code', 'zip', 'phone'].includes(field) ? String(value) : value;
        return { ...s, [field]: safeValue };
      })
    );
  };

  const removeStoreFromDirectory = (storeId) => {
    const store = storesDirectory.find((s) => s.id === storeId);
    const storeName = store ? `${String(store.code || '')} - ${store.name || ''}` : 'Unknown Store';
    setDeleteConfirmModal({
      type: 'Store',
      id: storeId,
      name: storeName,
      onConfirm: () => {
        hasPendingChanges.current = true;
        lastInteractionTime.current = Date.now();
        setStoresDirectory((prev) => prev.filter((s) => s.id !== storeId));
        logActivity('delete', 'store_directory', String(storeId), storeName, null, storeName, null, null);
      }
    });
  };

  const importStoresFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const existingCodes = new Set(storesDirectory.map((s) => String(s.code).trim().toLowerCase()));

    if (file.name.endsWith('.csv')) {
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const rows = parseCsvText(text);
          if (rows.length === 0) {
            alert('No stores found in file. Please check the format.');
            return;
          }

          const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
          const newStores = [];
          const skippedCodes = [];
          const maxId = Math.max(...storesDirectory.map((s) => s.id), 0);
          let addedCount = 0;

          for (let i = 1; i < rows.length; i++) {
            const values = rows[i].map((v) => v.trim().replace(/['"]/g, ''));
            if (values.length < 2) continue;

            const storeCode = values[headers.indexOf('store code')] || values[headers.indexOf('code')] || values[0] || '';
            if (existingCodes.has(String(storeCode).trim().toLowerCase())) {
              skippedCodes.push(storeCode);
              continue;
            }

            addedCount++;
            const store = {
              id: maxId + addedCount,
              code: String(storeCode),
              name: values[headers.indexOf('store name')] || values[headers.indexOf('name')] || values[1] || '',
              street: values[headers.indexOf('street')] || values[headers.indexOf('address')] || values[2] || '',
              city: values[headers.indexOf('city')] || values[3] || '',
              state: values[headers.indexOf('state')] || values[4] || 'NY',
              zip: String(values[headers.indexOf('zip')] || values[headers.indexOf('zipcode')] || values[5] || ''),
              hours: values[headers.indexOf('hours')] || values[6] || '',
              maxTrailer: values[headers.indexOf('max trailer')] || values[headers.indexOf('maxtrailer')] || values[7] || "53'",
              manager: values[headers.indexOf('manager')] || values[8] || '',
              phone: String(values[headers.indexOf('phone')] || values[9] || ''),
              email: values[headers.indexOf('email')] || values[10] || ''
            };
            newStores.push(store);
          }

          if (newStores.length > 0) {
            setStoresDirectory((prev) => [...prev, ...newStores]);
          }

          let message = '';
          if (newStores.length > 0) {
            message += `✅ Imported ${newStores.length} new stores.\n`;
          }
          if (skippedCodes.length > 0) {
            message += `⚠ Skipped ${skippedCodes.length} duplicate codes: ${skippedCodes.slice(0, 10).join(', ')}${skippedCodes.length > 10 ? '...' : ''}`;
          }
          if (newStores.length === 0 && skippedCodes.length === 0) {
            message = 'No stores found in file. Please check the format.';
          }
          alert(message);
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
          const maxId = Math.max(...storesDirectory.map((s) => s.id), 0);
          const newStores = [];
          const skippedCodes = [];
          let addedCount = 0;

          jsonData.forEach((row) => {
            const storeCode = row['Store Code'] || row['STORE CODE'] || row['Code'] || row['code'] || '';
            if (existingCodes.has(String(storeCode).trim().toLowerCase())) {
              skippedCodes.push(storeCode);
              return;
            }

            addedCount++;
            newStores.push({
              id: maxId + addedCount,
              code: String(storeCode),
              name: row['Store Name'] || row['STORE NAME'] || row['Name'] || row['name'] || '',
              street: row['Street'] || row['STREET'] || row['Address'] || row['address'] || '',
              city: row['City'] || row['CITY'] || row['city'] || '',
              state: row['State'] || row['STATE'] || row['state'] || 'NY',
              zip: String(row['Zip'] || row['ZIP'] || row['ZipCode'] || row['zip'] || ''),
              hours: row['Hours'] || row['HOURS'] || row['hours'] || '',
              maxTrailer: row['Max Trailer'] || row['MAX TRAILER'] || row['MaxTrailer'] || row['maxTrailer'] || "53'",
              manager: row['Manager'] || row['MANAGER'] || row['manager'] || '',
              phone: String(row['Phone'] || row['PHONE'] || row['phone'] || ''),
              email: row['Email'] || row['EMAIL'] || row['email'] || ''
            });
          });

          if (newStores.length > 0) {
            setStoresDirectory((prev) => [...prev, ...newStores]);
          }

          let message = '';
          if (newStores.length > 0) {
            message += `✅ Imported ${newStores.length} new stores.\n`;
          }
          if (skippedCodes.length > 0) {
            message += `⚠ Skipped ${skippedCodes.length} duplicate codes: ${skippedCodes.slice(0, 10).join(', ')}${skippedCodes.length > 10 ? '...' : ''}`;
          }
          if (newStores.length === 0 && skippedCodes.length === 0) {
            message = 'No stores found in file. Please check the format.';
          }
          alert(message);
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
    addStoreToDirectory,
    updateStoreDirectory,
    removeStoreFromDirectory,
    importStoresFromFile
  };
}
