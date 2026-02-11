export default function AppModals({
  showNameModal,
  handleSetUserName,
  deleteConfirmModal,
  setDeleteConfirmModal,
  showLogoutModal,
  setShowLogoutModal,
  handleLogout,
  storeChangeConfirmModal,
  setStoreChangeConfirmModal,
  infoModal,
  setInfoModal,
}) {
  return /*#__PURE__*/ React.createElement(
    React.Fragment,
    null,
    showNameModal &&
      /*#__PURE__*/ React.createElement(
        'div',
        {
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
            zIndex: 1000,
          },
        },
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', textAlign: 'center' } },
          /*#__PURE__*/ React.createElement('h2', { style: { margin: '0 0 16px', color: '#1a7f4b' } }, 'Welcome to Logistics Dashboard'),
          /*#__PURE__*/ React.createElement('p', { style: { margin: '0 0 20px', color: '#666' } }, 'Enter your name to identify your changes:'),
          /*#__PURE__*/ React.createElement('input', {
            type: 'text',
            placeholder: 'Your name',
            autoFocus: true,
            onKeyDown: (e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                handleSetUserName(e.target.value.trim());
              }
            },
            style: {
              padding: '12px 10px',
              fontSize: '16px',
              border: '2px solid #1a7f4b',
              borderRadius: '8px',
              width: '250px',
              marginBottom: '16px',
            },
            id: 'nameInput',
          }),
          /*#__PURE__*/ React.createElement('br', null),
          /*#__PURE__*/ React.createElement(
            'button',
            {
              onClick: () => {
                const input = document.getElementById('nameInput');
                if (input && input.value.trim()) {
                  handleSetUserName(input.value.trim());
                }
              },
              style: {
                background: '#1a7f4b',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
              },
            },
            'Continue'
          )
        )
      ),
    deleteConfirmModal &&
      /*#__PURE__*/ React.createElement(
        'div',
        {
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          },
        },
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '420px', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' } },
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', padding: '24px', textAlign: 'center' } },
            /*#__PURE__*/ React.createElement('div', { style: { width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' } }, '🗑️'),
            /*#__PURE__*/ React.createElement('h3', { style: { margin: 0, color: 'white', fontSize: '20px', fontWeight: 600 } }, 'Delete ', deleteConfirmModal.type, '?')
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { padding: '24px', textAlign: 'center' } },
            /*#__PURE__*/ React.createElement('p', { style: { margin: '0 0 8px', color: '#333', fontSize: '16px' } }, 'You are about to delete:'),
            /*#__PURE__*/ React.createElement(
              'div',
              { style: { background: '#f5f5f5', padding: '12px 20px', borderRadius: '8px', margin: '16px 0', border: '1px solid #e0e0e0' } },
              /*#__PURE__*/ React.createElement('span', { style: { fontSize: '18px', fontWeight: 600, color: '#c62828' } }, deleteConfirmModal.name)
            ),
            /*#__PURE__*/ React.createElement('p', { style: { margin: 0, color: '#666', fontSize: '14px' } }, '⚠️ This action cannot be undone.')
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { display: 'flex', gap: '12px', padding: '16px 24px 24px', justifyContent: 'center' } },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                onClick: () => setDeleteConfirmModal(null),
                style: {
                  flex: 1,
                  padding: '14px 24px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#666',
                  transition: 'all 0.2s',
                },
                onMouseOver: (e) => (e.target.style.background = '#f5f5f5'),
                onMouseOut: (e) => (e.target.style.background = 'white'),
              },
              'Cancel'
            ),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                onClick: async () => {
                  await deleteConfirmModal.onConfirm();
                  setDeleteConfirmModal(null);
                },
                style: {
                  flex: 1,
                  padding: '14px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'white',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(229, 57, 53, 0.4)',
                },
                onMouseOver: (e) => (e.target.style.transform = 'translateY(-2px)'),
                onMouseOut: (e) => (e.target.style.transform = 'translateY(0)'),
              },
              'Yes, Delete'
            )
          )
        )
      ),
    showLogoutModal &&
      /*#__PURE__*/ React.createElement(
        'div',
        {
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
          },
        },
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '400px', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' } },
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { background: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)', padding: '24px', textAlign: 'center' } },
            /*#__PURE__*/ React.createElement('div', { style: { width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' } }, '👋'),
            /*#__PURE__*/ React.createElement('h3', { style: { margin: 0, color: 'white', fontSize: '20px', fontWeight: 600 } }, 'Log Out?')
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { padding: '24px', textAlign: 'center' } },
            /*#__PURE__*/ React.createElement('p', { style: { margin: '0 0 8px', color: '#333', fontSize: '16px' } }, 'Are you sure you want to log out?'),
            /*#__PURE__*/ React.createElement('p', { style: { margin: '16px 0 0', color: '#666', fontSize: '14px' } }, "You'll need to sign in again to continue working.")
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { display: 'flex', gap: '12px', padding: '16px 24px 24px', justifyContent: 'center' } },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                onClick: () => setShowLogoutModal(false),
                style: {
                  flex: 1,
                  padding: '14px 24px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#666',
                  transition: 'all 0.2s',
                },
                onMouseOver: (e) => (e.target.style.background = '#f5f5f5'),
                onMouseOut: (e) => (e.target.style.background = 'white'),
              },
              'Cancel'
            ),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                onClick: () => {
                  setShowLogoutModal(false);
                  handleLogout();
                },
                style: {
                  flex: 1,
                  padding: '14px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'white',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(96, 125, 139, 0.4)',
                },
                onMouseOver: (e) => (e.target.style.transform = 'translateY(-2px)'),
                onMouseOut: (e) => (e.target.style.transform = 'translateY(0)'),
              },
              '🚪 Log Out'
            )
          )
        )
      ),
    storeChangeConfirmModal &&
      /*#__PURE__*/ React.createElement(
        'div',
        {
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
          },
        },
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '420px', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' } },
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', padding: '24px', textAlign: 'center' } },
            /*#__PURE__*/ React.createElement('div', { style: { width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' } }, '⚠️'),
            /*#__PURE__*/ React.createElement('h3', { style: { margin: 0, color: 'white', fontSize: '20px', fontWeight: 600 } }, 'Store Has Pallet Data!')
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { padding: '24px', textAlign: 'center' } },
            /*#__PURE__*/ React.createElement('p', { style: { margin: '0 0 16px', color: '#333', fontSize: '15px' } }, 'Are you sure you want to change this store?'),
            /*#__PURE__*/ React.createElement(
              'div',
              { style: { background: '#ffebee', padding: '12px 16px', borderRadius: '8px', margin: '0 0 8px', border: '1px solid #ffcdd2', textAlign: 'left' } },
              /*#__PURE__*/ React.createElement('div', { style: { fontSize: '11px', color: '#c62828', fontWeight: 600, marginBottom: '4px' } }, 'FROM:'),
              /*#__PURE__*/ React.createElement('span', { style: { fontSize: '16px', fontWeight: 600, color: '#c62828' } }, storeChangeConfirmModal.fromCode, ' - ', storeChangeConfirmModal.fromName)
            ),
            /*#__PURE__*/ React.createElement('div', { style: { fontSize: '20px', color: '#999', margin: '8px 0' } }, '↓'),
            /*#__PURE__*/ React.createElement(
              'div',
              { style: { background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px', margin: '0 0 16px', border: '1px solid #c8e6c9', textAlign: 'left' } },
              /*#__PURE__*/ React.createElement('div', { style: { fontSize: '11px', color: '#2e7d32', fontWeight: 600, marginBottom: '4px' } }, 'TO:'),
              /*#__PURE__*/ React.createElement('span', { style: { fontSize: '16px', fontWeight: 600, color: '#2e7d32' } }, storeChangeConfirmModal.toCode, ' - ', storeChangeConfirmModal.toName)
            ),
            /*#__PURE__*/ React.createElement('p', { style: { margin: 0, color: '#666', fontSize: '13px' } }, '⚠️ The pallet data will remain but associated with the new store.')
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { display: 'flex', gap: '12px', padding: '16px 24px 24px', justifyContent: 'center' } },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                onClick: () => setStoreChangeConfirmModal(null),
                style: {
                  flex: 1,
                  padding: '14px 24px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#666',
                  transition: 'all 0.2s',
                },
                onMouseOver: (e) => (e.target.style.background = '#f5f5f5'),
                onMouseOut: (e) => (e.target.style.background = 'white'),
              },
              'Cancel'
            ),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                onClick: () => {
                  storeChangeConfirmModal.onConfirm();
                  setStoreChangeConfirmModal(null);
                },
                style: {
                  flex: 1,
                  padding: '14px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'white',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(255, 152, 0, 0.4)',
                },
                onMouseOver: (e) => (e.target.style.transform = 'translateY(-2px)'),
                onMouseOut: (e) => (e.target.style.transform = 'translateY(0)'),
              },
              'Yes, Change Store'
            )
          )
        )
      ),
    infoModal &&
      /*#__PURE__*/ React.createElement(
        'div',
        {
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          },
        },
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '450px', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' } },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              style: {
                background:
                  infoModal.type === 'success'
                    ? 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)'
                    : infoModal.type === 'warning'
                      ? 'linear-gradient(135deg, #fb8c00 0%, #ef6c00 100%)'
                      : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                padding: '24px',
                textAlign: 'center',
              },
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                style: {
                  width: '64px',
                  height: '64px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: '32px',
                },
              },
              infoModal.type === 'success' ? '✅' : infoModal.type === 'warning' ? '⚠' : 'ℹ'
            ),
            /*#__PURE__*/ React.createElement('h3', { style: { margin: 0, color: 'white', fontSize: '20px', fontWeight: 600 } }, infoModal.title)
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { padding: '24px', textAlign: 'center' } },
            /*#__PURE__*/ React.createElement('p', { style: { margin: '0 0 16px', color: '#333', fontSize: '15px', lineHeight: '1.5' } }, infoModal.message),
            infoModal.details &&
              /*#__PURE__*/ React.createElement(
                'div',
                { style: { background: '#f5f5f5', padding: '16px 20px', borderRadius: '8px', margin: '16px 0', border: '1px solid #e0e0e0', textAlign: 'left' } },
                infoModal.details.map((detail, idx) =>
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      key: idx,
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: idx < infoModal.details.length - 1 ? '1px solid #e0e0e0' : 'none',
                      },
                    },
                    /*#__PURE__*/ React.createElement('span', { style: { color: '#666', fontSize: '13px' } }, detail.label),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        style: {
                          fontWeight: 600,
                          color: detail.highlight ? '#1a7f4b' : '#333',
                          fontSize: '14px',
                          fontFamily: detail.mono ? 'monospace' : 'inherit',
                          background: detail.highlight ? '#e8f5e9' : 'transparent',
                          padding: detail.highlight ? '4px 8px' : '0',
                          borderRadius: '4px',
                        },
                      },
                      detail.value
                    )
                  )
                )
              ),
            infoModal.note && /*#__PURE__*/ React.createElement('p', { style: { margin: '16px 0 0', color: '#666', fontSize: '13px', fontStyle: 'italic' } }, infoModal.note)
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { display: 'flex', gap: '12px', padding: '16px 24px 24px', justifyContent: 'center' } },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                onClick: () => setInfoModal(null),
                style: {
                  padding: '14px 48px',
                  border: 'none',
                  borderRadius: '8px',
                  background:
                    infoModal.type === 'success'
                      ? 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)'
                      : infoModal.type === 'warning'
                        ? 'linear-gradient(135deg, #fb8c00 0%, #ef6c00 100%)'
                        : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'white',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                },
                onMouseOver: (e) => (e.target.style.transform = 'translateY(-2px)'),
                onMouseOut: (e) => (e.target.style.transform = 'translateY(0)'),
              },
              'OK'
            )
          )
        )
      )
  );
}
