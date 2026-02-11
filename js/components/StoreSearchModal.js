export default function StoreSearchModal({
  storeSearchModal,
  storesDirectory,
  routes,
  storeSearchQuery,
  setStoreSearchQuery,
  storeSearchIndex,
  setStoreSearchIndex,
  setStoreSearchModal,
  setStoreChangeConfirmModal,
  setRoutes,
  hasPendingChangesRef,
}) {
  if (!storeSearchModal) return null;

  const sortedStores = React.useMemo(
    () => [...storesDirectory].sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''))),
    [storesDirectory]
  );

  const filteredStores = React.useMemo(() => {
    const searchLower = storeSearchQuery.toLowerCase();
    if (!storeSearchQuery) return sortedStores;
    return sortedStores.filter(
      (s) =>
        String(s.code || '').toLowerCase().includes(searchLower) ||
        String(s.name || '').toLowerCase().includes(searchLower) ||
        String(s.zone || '').toLowerCase().includes(searchLower) ||
        String(s.city || '').toLowerCase().includes(searchLower)
    );
  }, [sortedStores, storeSearchQuery]);

  const closeModal = () => {
    setStoreSearchModal(null);
    setStoreSearchQuery('');
    setStoreSearchIndex(0);
  };

  const highlightText = (text, search) => {
    if (!search || !text) return text || '';
    const textStr = String(text);
    const idx = textStr.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return textStr;
    return /*#__PURE__*/ React.createElement(
      React.Fragment,
      null,
      textStr.substring(0, idx),
      /*#__PURE__*/ React.createElement(
        'span',
        { style: { background: '#ffeb3b', padding: '0 1px', borderRadius: '2px' } },
        textStr.substring(idx, idx + search.length)
      ),
      textStr.substring(idx + search.length)
    );
  };

  const selectStore = (storeCode) => {
    const targetRoute = routes.find((r) => r.id === storeSearchModal.routeId);
    if (!targetRoute) {
      closeModal();
      return;
    }

    const currentStore = targetRoute.stores.find((s) => s.id === storeSearchModal.storeId);
    const hasPallets = currentStore && (currentStore.pallets || []).some((p) => p !== null && p !== undefined && p !== '' && p !== 0);

    if (hasPallets && currentStore.code && storeCode !== currentStore.code) {
      closeModal();
      const currentName =
        storesDirectory.find((s) => String(s.code || '').trim() === String(currentStore.code || '').trim())?.name ||
        currentStore.code;
      const newName =
        storesDirectory.find((s) => String(s.code || '').trim() === String(storeCode || '').trim())?.name || storeCode;

      setStoreChangeConfirmModal({
        fromCode: currentStore.code,
        fromName: currentName,
        toCode: storeCode,
        toName: newName,
        onConfirm: () => {
          const directoryStore = storesDirectory.find(
            (s) => String(s.code || '').trim() === String(storeCode || '').trim()
          );
          if (directoryStore) {
            hasPendingChangesRef.current = true;
            setRoutes((prev) =>
              prev.map((r) => {
                if (r.id === targetRoute.id) {
                  return {
                    ...r,
                    stores: r.stores.map((s) => {
                      if (s.id === currentStore.id) {
                        return { ...s, code: directoryStore.code, name: directoryStore.name };
                      }
                      return s;
                    }),
                  };
                }
                return r;
              })
            );
          }
        },
      });
      return;
    }

    const directoryStore = storesDirectory.find((s) => String(s.code || '').trim() === String(storeCode || '').trim());
    if (directoryStore) {
      hasPendingChangesRef.current = true;
      setRoutes((prev) =>
        prev.map((r) => {
          if (r.id === storeSearchModal.routeId) {
            return {
              ...r,
              stores: r.stores.map((s) => {
                if (s.id === storeSearchModal.storeId) {
                  return { ...s, code: directoryStore.code, name: directoryStore.name };
                }
                return s;
              }),
            };
          }
          return r;
        })
      );
    }

    closeModal();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setStoreSearchIndex((prev) => Math.min(prev + 1, filteredStores.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setStoreSearchIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredStores[storeSearchIndex]) {
        selectStore(filteredStores[storeSearchIndex].code);
      }
    } else if (e.key === 'Escape') {
      closeModal();
    }
  };

  return /*#__PURE__*/ React.createElement(
    'div',
    {
      onClick: closeModal,
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      },
    },
    /*#__PURE__*/ React.createElement(
      'div',
      {
        onClick: (e) => e.stopPropagation(),
        style: {
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          width: '420px',
          maxHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      },
      /*#__PURE__*/ React.createElement(
        'div',
        {
          style: {
            padding: '16px 20px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
        },
        /*#__PURE__*/ React.createElement('h4', { style: { margin: 0, fontSize: '16px', color: '#333' } }, '🔍 Search Store'),
        /*#__PURE__*/ React.createElement(
          'button',
          {
            onClick: closeModal,
            style: {
              width: '28px',
              height: '28px',
              border: 'none',
              background: '#f5f5f5',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#666',
            },
          },
          '×'
        )
      ),
      /*#__PURE__*/ React.createElement(
        'div',
        { style: { padding: '12px 20px', borderBottom: '1px solid #eee' } },
        /*#__PURE__*/ React.createElement('input', {
          type: 'text',
          value: storeSearchQuery,
          onChange: (e) => {
            setStoreSearchQuery(e.target.value);
            setStoreSearchIndex(0);
          },
          onKeyDown: handleKeyDown,
          placeholder: 'Type store code or name...',
          autoFocus: true,
          style: {
            width: '100%',
            padding: '10px 12px',
            border: '2px solid #1a7f4b',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
          },
        })
      ),
      /*#__PURE__*/ React.createElement(
        'div',
        { style: { flex: 1, overflowY: 'auto', maxHeight: '320px' } },
        filteredStores.length === 0
          ? /*#__PURE__*/ React.createElement('div', { style: { padding: '30px', textAlign: 'center', color: '#999' } }, 'No stores found')
          : filteredStores.map((s, idx) =>
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  key: s.id,
                  onClick: () => selectStore(s.code),
                  onMouseEnter: () => setStoreSearchIndex(idx),
                  style: {
                    padding: '10px 20px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    background: idx === storeSearchIndex ? '#e8f5e9' : 'white',
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderLeft: idx === storeSearchIndex ? '4px solid #1a7f4b' : '4px solid transparent',
                  },
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  { style: { fontWeight: 700, color: '#1a7f4b', minWidth: '45px' } },
                  highlightText(s.code, storeSearchQuery)
                ),
                /*#__PURE__*/ React.createElement(
                  'span',
                  { style: { flex: 1, color: '#333' } },
                  highlightText(s.name, storeSearchQuery)
                ),
                s.zone &&
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      style: {
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: '#f0f0f0',
                        borderRadius: '10px',
                        color: '#666',
                      },
                    },
                    s.zone
                  )
              )
            )
      ),
      /*#__PURE__*/ React.createElement(
        'div',
        { style: { padding: '8px 20px', background: '#f5f5f5', fontSize: '11px', color: '#666', borderTop: '1px solid #eee' } },
        /*#__PURE__*/ React.createElement('kbd', { style: { background: 'white', border: '1px solid #ddd', borderRadius: '3px', padding: '1px 5px', marginRight: '4px' } }, '↑'),
        /*#__PURE__*/ React.createElement('kbd', { style: { background: 'white', border: '1px solid #ddd', borderRadius: '3px', padding: '1px 5px', marginRight: '8px' } }, '↓'),
        'Navigate',
        /*#__PURE__*/ React.createElement('kbd', { style: { background: 'white', border: '1px solid #ddd', borderRadius: '3px', padding: '1px 5px', margin: '0 4px 0 16px' } }, 'Enter'),
        'Select',
        /*#__PURE__*/ React.createElement('kbd', { style: { background: 'white', border: '1px solid #ddd', borderRadius: '3px', padding: '1px 5px', margin: '0 4px 0 16px' } }, 'Esc'),
        'Close'
      )
    )
  );
}
