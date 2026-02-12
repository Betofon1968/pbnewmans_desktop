import { loadInvoiceRoutesForRange, calculateInvoiceDataFromRoutes } from '../../modules/invoices/invoiceService.js?v=26.110';
import { getInvoiceWeekRange } from './invoiceHelpers.js?v=26.110';

export function useAccountsInvoices({ React, cachedData, supabase, storesDirectory }) {
  const { useState, useEffect, useCallback } = React;

  const [accountsSubTab, setAccountsSubTab] = useState('Chart of Accounts');
  const [storeRatesSearch, setStoreRatesSearch] = useState('');

  const [invoiceDateRange, setInvoiceDateRange] = useState(() => getInvoiceWeekRange(1));
  const [invoiceManualItems, setInvoiceManualItems] = useState([]);
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const today = new Date();
    return `PB${String(today.getFullYear()).slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  });
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoiceViewMode, setInvoiceViewMode] = useState('detailed');
  const [savedInvoices, setSavedInvoices] = useState(cachedData?.savedInvoices || []);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingInvoiceUpdatedAt, setEditingInvoiceUpdatedAt] = useState(null);
  const [invoiceRateOverrides, setInvoiceRateOverrides] = useState({});
  const [invoiceRoutes, setInvoiceRoutes] = useState({});
  const [invoiceRoutesLoading, setInvoiceRoutesLoading] = useState(false);

  const loadInvoiceRoutes = useCallback(
    async (startDate, endDate) => {
      await loadInvoiceRoutesForRange({
        supabase,
        startDate,
        endDate,
        setInvoiceRoutes,
        setInvoiceRoutesLoading
      });
    },
    [supabase]
  );

  useEffect(() => {
    if (invoiceDateRange.start && invoiceDateRange.end) {
      loadInvoiceRoutes(invoiceDateRange.start, invoiceDateRange.end);
    }
  }, [invoiceDateRange.start, invoiceDateRange.end, loadInvoiceRoutes]);

  const calculateInvoiceData = useCallback(
    (startDate, endDate) =>
      calculateInvoiceDataFromRoutes({
        startDate,
        endDate,
        invoiceRoutes,
        storesDirectory,
        invoiceRateOverrides
      }),
    [invoiceRoutes, storesDirectory, invoiceRateOverrides]
  );

  return {
    accountsSubTab,
    setAccountsSubTab,
    storeRatesSearch,
    setStoreRatesSearch,
    invoiceDateRange,
    setInvoiceDateRange,
    invoiceManualItems,
    setInvoiceManualItems,
    invoiceNumber,
    setInvoiceNumber,
    showInvoicePreview,
    setShowInvoicePreview,
    invoiceViewMode,
    setInvoiceViewMode,
    savedInvoices,
    setSavedInvoices,
    editingInvoiceId,
    setEditingInvoiceId,
    editingInvoiceUpdatedAt,
    setEditingInvoiceUpdatedAt,
    invoiceRateOverrides,
    setInvoiceRateOverrides,
    invoiceRoutes,
    setInvoiceRoutes,
    invoiceRoutesLoading,
    setInvoiceRoutesLoading,
    calculateInvoiceData
  };
}
